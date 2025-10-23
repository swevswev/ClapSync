import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSession } from "./userSessions.js";
import crypto from "crypto";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import app from "./app.js";
import { activeSessions } from "./websocket.js";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config();


const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ddb = DynamoDBDocumentClient.from(ddbClient);
const AUDIO_SESSIONS_TABLE = process.env.AUDIO_SESSION_TABLE_NAME
/*
activeSessions = {
  "audio-session-id-123": {
    owner: "user-abc",
    sockets: new Map([["user-abc", ws], ["user-def", ws]]),
  }
}
*/

async function createSession(userId)
{
    //check if userId is a valid account userId function
    const time = new Date().toISOString();
    
    let audioSessionId = await getSessionIdFromUser(userId);
    
    if (audioSessionId) return null;

    audioSessionId = crypto.randomUUID();

    const item =
    {
        "audio-session-id": audioSessionId,
        "collaborators": {},
        "owner": userId,
        "videoIds": {},
        "creation-time": time,
        "status": "initialized"
    }

    try
        {
            await ddb.send(
                new PutCommand({
                    TableName: AUDIO_SESSIONS_TABLE,
                    Item: item,
                    ConditionExpression: "attribute_not_exists(sessionId)",
                })
            );
            setAudioSessionId(userId, audioSessionId);
        }
        catch (err)
        {
            if (err.name === "ConditionalCheckFailedException") 
            {
                const existing = await getSession(audioSessionId);
                if (existing) return existing;
            }
            throw err;
        }
    return audioSessionId;
}

async function joinSession(userId, audioSessionId)
{
    const session = await getSession(audioSessionId);
    if (!session?.Item) return null;

    const currentUserSession = await getSessionIdFromUser(userId)
    if (currentUserSession)
    {
        console.log("ALREADY IN A SESSION");

        //just link them back towards that session
        return null
    }

    //tryna access a finished session to download clips
    if (session.Item.status == "finished" && isOwner(userId, session))
    {
        //allow access
        return null
    }

    const collaboratorCount = Object.keys(session.collaborators || {}).length;
    const maxUsers = Number(process.env.AUDIO_SESSION_USER_SIZE);

    console.log(collaboratorCount, maxUsers);

    if (collaboratorCount >= (maxUsers - 1)) return null;
    if (session.collaborators?.[userId]) return null;

    try
    {
        await ddb.send(
            new UpdateCommand({
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": audioSessionId},
                UpdateExpression: "SET collaborators.#uid = :data",
                ExpressionAttributeNames: {
                    "#uid": userId, 
                },
                ExpressionAttributeValues: {
                ":data": { joinedAt: new Date().toISOString() }, // metadata for this user
                },
            })
        )

        setAudioSessionId(userId, audioSessionId);
        //signal join to the session
    }
    catch (err)
    {
        console.log("Failed to join session:", err);
    }

}

async function uploadFileToSession(name, sessionId, file, duration)
{
    if (!file || !name || !sessionId)
        return null;

    //get username and replace file userid with username
    const fileKey = `recordings/${sessionId}/${name}-${Date.now()}.webm`;
    try
    {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata:
            {
                uploaderName: name,
                duration: duration
            }
        });

        await s3.send(command);
        
    }
    catch(err)
    {
        console.error("Failed to upload file  to session", err)
        return { success: false, error: err.message}
    }

}

async function listObjectsFromS3(sessionId)
{
    const command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: "recordings/${sessionId}/"
    })

    try
    {
        const response = await s3.send(command);
        const objects = response.Contents || [];

        const result = [];

        for (const obj of objects)
        {

        }
    }
    catch (err)
    {
        console.error("Failed to retrieve from s3", err);
        return [];
    }
}

async function getSessionFiles(userId)
{
    const audioSessionId = getSessionIdFromUser(userId);
    const session = getSession(audioSessionId);
    if(!session || !session.Item) return null;
    if(session.Item.owner != userId) return null;

    const s3Objects = await listObjectsFromS3(sessionId);
}


//Get sessionId if user has one active
async function getSessionIdFromUser(userId)
{
    if (!userId) return null;

    const userSession = await getUserSession(userId);
    const audioSessionId = userSession?.Item?.data?.["audio-session-id"];

    if (!audioSessionId) return null;

    return audioSessionId;
}

async function getSession(sessionId)
{
    if (!sessionId) return null;
    try
    {
        const result = await ddb.send(
            new GetCommand({TableName: AUDIO_SESSIONS_TABLE, Key: {"audio-session-id": sessionId},})
        )
        return result
    }
    catch(err)
    {
        throw("failed to get session", err);
    }
}

async function isOwner(userId, session)
{
    if (!session?.Item) return false;
    return session.Item.owner === userId;
}


async function setAudioSessionId(userId, sessionId)
{
    if (!userId || !sessionId) return null;
    try
    {
        await ddb.send(
            new UpdateCommand({
                TableName: process.env.USER_SESSION_TABLE_NAME,
                Key: {"user-session-id": userId},
                UpdateExpression: "SET #data.#asid = :sid",
                ExpressionAttributeNames: {
                    "#data": "data",
                    "#asid": "audio-session-id",
                },
                ExpressionAttributeValues: {
                ":sid": sessionId,
                },
            })
        )
    }
    catch(err)
    {
        console.log("failed to set audio session id", err);
    }
}

/**
 * When user is kicked, disconnected, or leaves disconnect their websocket and remove them from the session table.
 * If owner then close the session to owner access file only and disconnect all websockets
*/
async function leaveAudioSession(userId, reason)
{
    if (!userId) return null;
    const sessionId = await getSessionIdFromUser(userId);

    if(!sessionId) return null;
    const session = await getSession(sessionId);

    if(!session || !session.Item) return null;

    //If owner then close the session and disconnect all collaborators
    if(session.Item.owner == userId)
    {
        await ddb.send(
            new UpdateCommand({
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": sessionId},
                UpdateExpression: "SET #status = :newStatus",
                ExpressionAttributeNames: {
                    "#status": "status", 
                },
                ExpressionAttributeValues: {
                ":newStatus": "finished",
                },
            })
        )

        const sessionData = activeSessions.get(sessionId);
        if (sessionData?.sockets)
        {
            for (const [uid, ws] of sessionData.sockets)
            {
                if (ws.readyState === ws.OPEN) ws.close(1000, "Owner ended session");
            }
        }

        activeSessions.delete(sessionId);
    }
    //disconnect user and notify session
    else
    {
        const sessionData = activeSessions.get(sessionId);
        const ws = sessionData.sockets.get(userId);
        if (ws)
        {
            ws.close(1000, "User left the session");
            sessionData.sockets.delete(userId);
        }

        await ddb.send(
            new UpdateCommand(
            {
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": sessionId},
                UpdateExpression: "REMOVE collaborators.#uid",
                ExpressionAttributeNames: {
                    "#uid": userId, 
                },
            })
        )
    }
}

//testing purposes
export function createAudioSession(userId)
{
    return createSession(userId);
}

export function getAudioSession(sessionId)
{
    return getSession(sessionId);
}

export function joinAudioSession(userId, sessionId)
{
    return joinSession(userId, "54205874-be5a-4ade-b66e-dc90ee532dcf")
}