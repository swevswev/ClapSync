import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";    
import { getUserSession, useSession } from "./userSessions.js";
import { createAudioSession, joinAudioSession, getSessionIdFromUser, hasUserUploaded, markUserUploaded } from "./audioSessionManager.js";
import { setupWebSocket } from "./websocket.js";
import { getUserName } from "./accountManager.js";
import http from "http";
import { checkUsername, login, verifyEmail, verifyUsername, verifyPassword, findEmail, createAccount, logout, getUser } from "./accountManager.js";
import cookieParser from "cookie-parser";

dotenv.config(); // load .env variables

const app = express();
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
})); // CHANGE ORIGIN WHEN PRODUCTION FOR SECURITY
app.use(cookieParser());

export default app;

const server = http.createServer(app);
setupWebSocket(server);

// Multer setup to store file in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

console.log("AWS_REGION:", process.env.AWS_REGION);

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const COOKIE_NAME = "usid";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

const COOKIE_LIFESPAN = 30;


// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("========== /upload ENDPOINT CALLED ==========");
  console.log("1. Request received");
  
  try {
    const file = req.file;
    console.log("2. File from multer:", file ? `Present (${file.size} bytes, ${file.mimetype})` : "MISSING");
    
    const userSessionId = req.cookies["usid"];
    console.log("3. User session ID from cookie:", userSessionId || "MISSING");

    if (!userSessionId) {
      console.log("❌ ERROR: No user session cookie found");
      return res.status(401).json({ error: "No user session cookie found" });
    }

    console.log("4. Getting user from session...");
    const userId = await getUser(userSessionId);
    console.log("5. User ID:", userId || "NOT FOUND");
    
    if (!userId) {
      console.log("❌ ERROR: User not found");
      return res.status(401).json({ error: "User not found" });
    }

    console.log("6. Getting username...");
    const username = await getUserName(userId);
    console.log("7. Username:", username || "NOT FOUND");

    console.log("8. Getting session ID from user...");
    const sessionId = await getSessionIdFromUser(userId);
    console.log("9. Session ID:", sessionId || "NOT FOUND");
    
    if (!sessionId) {
      console.log("❌ ERROR: Session not found");
      return res.status(401).json({ error: "Session not found" });
    }

    console.log("10. Checking if user already uploaded...");
    const alreadyUploaded = await hasUserUploaded(sessionId, userId);
    console.log("11. Already uploaded:", alreadyUploaded);
    
    if (alreadyUploaded) {
      console.log("❌ ERROR: User has already uploaded");
      return res.status(400).json({ 
        message: "You have already uploaded a recording for this session." 
      });
    }

    if (!file) {
      console.log("❌ ERROR: No file uploaded!");
      return res.status(400).json({ message: "No file uploaded!" });
    }

    console.log("12. Validating MIME type...");
    console.log("    - File MIME type:", file.mimetype);
    console.log("    - File originalname:", file.originalname);
    console.log("    - Accepting any audio/* type");
    
    // Accept any audio type (audio/webm, audio/ogg, audio/mp4, etc.)
    // Also accept application/octet-stream if filename suggests it's an audio file
    const isAudioType = file.mimetype && file.mimetype.startsWith("audio/");
    const hasAudioExtension = file.originalname && /\.(webm|ogg|mp3|wav|m4a|aac|flac|opus)$/i.test(file.originalname);
    const isValidMimeType = isAudioType || 
                            (file.mimetype === "application/octet-stream" && hasAudioExtension);
    
    if (!isValidMimeType) {
      console.log("❌ ERROR: File must be an audio file");
      console.log("    - Received MIME type:", file.mimetype);
      console.log("    - Filename:", file.originalname);
      return res.status(400).json({ 
        message: `File must be an audio file. Received: ${file.mimetype || "unknown"}` 
      });
    }
    
    console.log("    - MIME type validation passed (audio file accepted)");

    // Check file size on server side
    const fileSizeBytes = file.size || file.buffer.length;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    console.log("14. File size:", `${fileSizeBytes} bytes (${fileSizeMB} MB)`);
    console.log("    - MIME type:", file.mimetype);
    console.log("    - Buffer length:", file.buffer?.length || "N/A");

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (fileSizeBytes > MAX_FILE_SIZE) {
      console.log("❌ ERROR: File too large!");
      return res.status(400).json({ 
        message: `File too large! File is ${fileSizeMB} MB. Maximum size is 100MB.` 
      });
    }

    console.log("15. Getting duration from request body...");
    console.log("    - req.body:", JSON.stringify(req.body));
    const duration = parseFloat(req.body.duration) || 0;
    console.log("16. Duration:", `${duration.toFixed(2)} seconds`);

    console.log("17. Generating file key...");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}}`;
    const fileKey = `recordings/${sessionId}/${username}-${timestamp}.webm`;
    console.log("    - File key:", fileKey);
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: "video/webm",
      Metadata:
      {
        uploaderName: username,
        duration: duration.toString(),
        fileSizeMB: parseFloat(fileSizeMB).toString(),
      }
    });

    console.log("19. Uploading to S3...");
    await s3.send(command);
    console.log("✅ S3 upload successful!");

    console.log("20. Marking user as uploaded...");
    await markUserUploaded(sessionId, userId, fileKey);
    console.log("✅ User marked as uploaded");

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    console.log("21. File URL:", fileUrl);

    console.log("22. Sending success response...");
    res.json({ 
      message: "File uploaded successfully", 
      fileUrl,
      fileSize: fileSizeBytes,
      fileSizeMB: parseFloat(fileSizeMB),
      duration: duration
    });
    console.log("========== /upload SUCCESS ==========");
  } catch (err) {
    console.error("========== /upload ERROR ==========");
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    res.status(500).json({ message: "Failed to upload file", error: err.message });
  }
});

app.post("/create", async (req, res) => {
  const userSessionId = req.cookies["usid"];

  if (!userSessionId) {
      return res.status(401).json({ error: "No user session cookie found" });
  }

  const userId = await getUser(userSessionId);
  if (!userId) {
    return res.status(401).json({ error: "User not found" });
  }

  const sessionId = await createAudioSession(userId, userSessionId);
  if (sessionId)
  {
    res.json({message: "Session created", sessionId});
  }
  else
  {
    res.status(400).json({error: "Failed to create session or user already in a session"});
  }
})

app.post("/preJoin", async (req, res) => 
{
  const userSessionId = req.cookies["usid"];
  if (!userSessionId) {
      return res.status(401).json({ error: "No user session cookie found" });
  }

  const userId = await getUser(userSessionId);
  if (!userId) {
    return res.status(401).json({ error: "User not found" });
  }

  const audioSessionId = await getSessionIdFromUser(userId); 
  if (audioSessionId)
  {
    return res.status(400).json({ error: "User already in a session", audioSessionId });
  }

  res.json({ message: "Can join a session" });
})


app.post("/join", async (req, res) => 
  {
    console.log("Joining session");
    const userSessionId = req.cookies["usid"];
    if (!userSessionId) {
        return res.status(401).json({ error: "No user session cookie found" });
    }
    console.log("userSessionId: ", userSessionId);
    const userId = await getUser(userSessionId);
    if (!userId) {
      return res.status(401).json({ error: "User not found" });
    }
    console.log("userId: ", userId);
    
    if (!req.body || !req.body.sessionId) {
      return res.status(400).json({ error: "Missing sessionId in request body" });
    }
    
    const result = await joinAudioSession(userId, req.body.sessionId);
    if (result) {
      return res.status(200).json({ message: "Joined session" });
    } else {
      return res.status(400).json({ error: "Failed to join session" });
    }
  })


app.post("/auth/login", async (req,res) => 
{
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const sessionId = await login(email, password);
  if (!sessionId) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);
  return res.status(200).json({ sessionId });

});

app.post("/auth/checkUsername", async (req,res) => 
{
  console.log("Checking username");
  const { username } = req.body;
  if(!username)
    return res.status(400).json({ error: "Missing username" });
  try 
  {
    const result = await checkUsername(username);
    if (!result)
      return res.status(200).json({ available: true });
    else
      return res.status(200).json({ available: false });
  } 
  catch (err) 
  {
    console.error("Error checking username:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/auth/signup", async (req, res) =>
{
  console.log("Signing up");
  const {username, email, password} = req.body;
  const errors = [];

  if(!(await verifyUsername(username)))
      errors.push({errorType: "username", errorMessage: "Username must be between 3-32 characters in length and have no special characters"});
  if(!(await verifyPassword(password)))
      errors.push({errorType: "password", errorMessage: "Password must be between 8-64 characters in length"});
  if(!(await verifyEmail(email)))
      errors.push({errorType: "email", errorMessage: "Email must be a valid email"});
  if(await findEmail(email))
      errors.push({errorType: "email", errorMessage: "Email is already in use"});
  if(await checkUsername(username))
      errors.push({errorType: "username", errorMessage: "Username already exists"})
  
  if(errors.length > 0)
    return res.status(400).json({
      success: false,
      errors,
    });
  
  const result = await createAccount(username, email, password);
  if (!result)
  {
    errors.push({errorType: "all", errorMessage: "Error creating account"})
    return res.status(400).json({
      success: false,
      errors,
    });
  }
    res.cookie(COOKIE_NAME, result, COOKIE_OPTIONS);
    return res.status(200).json({ success: true, sessionId: result});
});

app.post("/logout", async (req, res) => 
{
  const userSessionId = req.cookies.usid;

  if(!userSessionId)
    return res.status(400).json({success: false, errorMessage: "Missing sessionId"});

  const userSession = await getUserSession(userSessionId);
  if(!userSession)
    return res.status(400).json({success: false, errorMessage: "Session does not exist!"});

  const result = await logout(userSessionId, userSession?.Item.userId);

  if(result)
    return res.status(200).json({success: true, errorMessage: "Successfully logged out"});
  else
    return res.status(400).json({success: false, errorMessage: "Log out failed"});

});

app.get("/auth/checkLogin", async (req, res) => {
  const userSessionId = req.cookies["usid"];

  if (!userSessionId) {
      return res.status(200).json({ success: false, errorMessage: "No user session cookie found" });
  }

  const userId = await getUser(userSessionId);
  if (userId) {
    return res.status(200).json({success: true, errorMessage: "Logged In"});
  }

  return res.status(200).json({success: false, errorMessage: "Logged Out"});

});


function validateWebMFile(file)
{
  
  return true;
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
