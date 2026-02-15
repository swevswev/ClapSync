import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";    
import { getUserSession } from "./userSessions.js";
import { createAudioSession, joinAudioSession, getSessionIdFromUser, hasUserUploaded, markUserUploaded, getSessionFiles, getOwner, getPreviousSessionsFiles } from "./audioSessionManager.js";
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
  try {
    const file = req.file;
    const userSessionId = req.cookies["usid"];

    if (!userSessionId) {
      return res.status(401).json({ error: "No user session cookie found" });
    }

    const userId = await getUser(userSessionId);
    
    if (!userId) {
      return res.status(401).json({ error: "User not found" });
    }

    const username = await getUserName(userId);
    const sessionId = await getSessionIdFromUser(userId);
    
    if (!sessionId) {
      return res.status(401).json({ error: "Session not found" });
    }

    const alreadyUploaded = await hasUserUploaded(sessionId, userId);
    
    if (alreadyUploaded) {
      return res.status(400).json({ 
        message: "You have already uploaded a recording for this session." 
      });
    }

    if (!file) {
      return res.status(400).json({ message: "No file uploaded!" });
    }
    
    // Accept any audio type (audio/webm, audio/ogg, audio/mp4, etc.)
    // Also accept application/octet-stream if filename suggests it's an audio file
    const isAudioType = file.mimetype && file.mimetype.startsWith("audio/");
    const hasAudioExtension = file.originalname && /\.(webm|ogg|mp3|wav|m4a|aac|flac|opus)$/i.test(file.originalname);
    const isValidMimeType = isAudioType || 
                            (file.mimetype === "application/octet-stream" && hasAudioExtension);
    
    if (!isValidMimeType) {
      return res.status(400).json({ 
        message: `File must be an audio file. Received: ${file.mimetype || "unknown"}` 
      });
    }

    // Check file size on server side
    const fileSizeBytes = file.size || file.buffer.length;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (fileSizeBytes > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        message: `File too large! File is ${fileSizeMB} MB. Maximum size is 100MB.` 
      });
    }

    const duration = parseFloat(req.body.duration) || 0;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileKey = `recordings/${sessionId}/${username}-${timestamp}.webm`;
    // Extract just the filename for download (without the path)
    const downloadFilename = `${username}-${timestamp}.webm`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: "video/webm",
      ContentDisposition: `attachment; filename="${downloadFilename}"`,
      Metadata:
      {
        uploaderName: username,
        duration: duration.toString(),
        fileSizeMB: parseFloat(fileSizeMB).toString(),
      }
    });

    await s3.send(command);
    await markUserUploaded(sessionId, userId, fileKey);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    res.json({ 
      message: "File uploaded successfully", 
      fileUrl,
      fileSize: fileSizeBytes,
      fileSizeMB: parseFloat(fileSizeMB),
      duration: duration
    });
  } catch (err) {
    console.error("========== /upload ERROR ==========");
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    res.status(500).json({ message: "Failed to upload file", error: err.message });
  }
});

//acquire the epstein files for a session
app.post("/getFiles", async (req, res) => {
  const userSessionId = req.cookies["usid"];
  if (!userSessionId) {
    return res.status(401).json({ error: "No user session cookie found" });
  }
  const userId = await getUser(userSessionId);
  if (!userId) {
    return res.status(401).json({ error: "User not found" });
  }

  const sessionId = await getSessionIdFromUser(userId);
  if (!sessionId) {
    return res.status(401).json({ error: "Session not found" });
  }

  const ownerId = await getOwner(sessionId);
  if(!ownerId || userId !== ownerId) {
    return res.status(401).json({ error: "User is not the owner of the session" });
  }

  const files = await getSessionFiles(sessionId);
  if (!files) {
    return res.status(401).json({ error: "No files found" });
  }
  return res.status(200).json({ files });
});

app.post("/getPreviousSessionFiles", async (req, res) =>
{
  const userSessionId = req.cookies["usid"];
  if (!userSessionId) {
    return res.status(401).json({ error: "No user session cookie found" });
  }
  const userId = await getUser(userSessionId);
  if (!userId) {
    return res.status(401).json({ error: "User not found" });
  }
  const previousSessionsFiles = await getPreviousSessionsFiles(userId);
  if (!previousSessionsFiles) {
    return res.status(401).json({ error: "No previous sessions files found" });
  }
  return res.status(200).json({ previousSessionsFiles });
});


app.post("/download", async (req, res) => {
  try {
    const fileKey = req.body.fileKey;
    
    if (!fileKey) {
      return res.status(400).json({ error: "Missing fileKey in request body" });
    }

    // Verify user has access (must be session owner)
    const userSessionId = req.cookies["usid"];
    
    if (!userSessionId) {
      return res.status(401).json({ error: "No user session cookie found" });
    }

    const userId = await getUser(userSessionId);
    
    if (!userId) {
      return res.status(401).json({ error: "User not found" });
    }

    // Extract sessionId from fileKey (format: recordings/{sessionId}/...)
    const sessionIdMatch = fileKey.match(/^recordings\/([^/]+)\//);
    
    if (!sessionIdMatch) {
      return res.status(400).json({ error: "Invalid file key format" });
    }

    const sessionId = sessionIdMatch[1];
    const ownerId = await getOwner(sessionId);
    
    if (!ownerId || userId !== ownerId) {
      return res.status(403).json({ error: "Access denied. Only session owner can download files." });
    }

    // Generate fresh signed URL (valid for 1 hour)
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    });
    
    const downloadUrl = await getSignedUrl(s3, getObjectCommand, { expiresIn: 3600 });
    
    // Extract filename from fileKey for Content-Disposition
    const filename = fileKey.split('/').pop() || 'download.webm';
    
    const response = { 
      downloadUrl: downloadUrl,
      filename: filename
    };
    return res.status(200).json(response);
  } catch (err) {
    console.error("Failed to generate download URL:", err);
    res.status(500).json({ error: "Failed to generate download URL" });
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
    const userSessionId = req.cookies["usid"];
    if (!userSessionId) {
        return res.status(401).json({ error: "No user session cookie found" });
    }
    const userId = await getUser(userSessionId);
    if (!userId) {
      return res.status(401).json({ error: "User not found" });
    }
    
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
  // Server started
});
