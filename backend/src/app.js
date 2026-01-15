import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { getUserSession, useSession } from "./userSessions.js";
import { createAudioSession, joinAudioSession, getSessionIdFromUser } from "./audioSessionManager.js";
import { setupWebSocket } from "./websocket.js";
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
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded!" });
  }

  try {
    // Generate a unique filename
    const fileKey = `recordings/${Date.now()}-${file.originalname}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    // File URL
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Send response once
    res.json({ message: "File uploaded successfully", fileUrl });
  } catch (err) {
    console.error("S3 upload error:", err);
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

app.post("/session/:id", async (req, res) =>
{

});

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

app.get("/", (req, res) => {
  res.send("✅ Session middleware working!");
});


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
