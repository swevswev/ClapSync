import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { useSession } from "./userSessions.js";
import { createAudioSession } from "./audioSessions.js";

dotenv.config(); // load .env variables

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
})); // CHANGE ORIGIN WHEN PRODUCTION FOR SECURITY

useSession(app);

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

app.post("/createSession", async (req, res) => {
  const userSessionId = req.cookies["usid"];

  if (!userSessionId) {
      return res.status(401).json({ error: "No user session cookie found" });
  }

  createAudioSession(userSessionId);
})

app.get("/", (req, res) => {
  res.send("✅ Session middleware working!");
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
