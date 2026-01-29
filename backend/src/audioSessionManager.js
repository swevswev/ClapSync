import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSession } from "./userSessions.js";
import crypto from "crypto";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import app from "./app.js";
import { activeSessions } from "./websocket.js";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validateUserName } from "./accountManager.js";

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

const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
const AUDIO_SESSIONS_TABLE = process.env.AUDIO_SESSION_TABLE_NAME;
const USER_TABLE = process.env.USER_TABLE_NAME;
/*
activeSessions = {
  "audio-session-id-123": {
    owner: "user-abc",
    sockets: new Map([["user-abc", ws], ["user-def", ws]]),
  }
}
*/

async function createSession(userId, userSessionId)
{
    const time = new Date().toISOString();
    let audioSessionId = await getSessionIdFromUser(userSessionId);
    
    if (audioSessionId) return null;

    audioSessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

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
    console.log("Joining session");
    const session = await getSession(audioSessionId);
    if (!session?.Item) return null;


    console.log("Got session");
    //make sure user can join session
    //const currentUserSession = await getSessionIdFromUser(userId);

    const isOwner = (session.Item.owner === userId);
    //tryna access a finished session to download clips
    if (session.Item.status == "finished" && isOwner)
    {
        //allow access
        return null
    }

    if (session.Item.status == "initialized" && !isOwner)
    {
        //error, not owner of sessios, session is not initialized
        console.error("Not owner of session, session is not initialized");
        return null;
    }

    if(isOwner) {
        // Set audioSessionId for owners as well
        try
        {
            await ddb.send(new UpdateCommand({
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": audioSessionId},
                UpdateExpression: "SET #status = :newStatus",
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {":newStatus": "active"},
            }))
        }
        catch (err)
        {
            console.log("Failed to update session status:", err);
        }
        
        await setAudioSessionId(userId, audioSessionId);
        return true;
    }

    console.log("collaborators: ", session.Item.collaborators);

    //make sure session is not closed

    const collaboratorCount = Object.keys(session.Item.collaborators || {}).length;
    const maxUsers = Number(process.env.AUDIO_SESSION_USER_SIZE);

    console.log(collaboratorCount, maxUsers);

    if (collaboratorCount >= (maxUsers - 1)) return null;
    if (session.Item.collaborators?.[userId]) return null;

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

        await setAudioSessionId(userId, audioSessionId);
        return true;
    }
    catch (err)
    {
        console.log("Failed to join session:", err);
    }
    return null;

}

async function uploadFileToSession(name, sessionId,  duration)
{
    if (!name || !sessionId)
        return null;

    //get username and replace file userid with username
    const fileKey = `recordings/${sessionId}/${name}-${Date.now()}.webm`;
    try
    {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            ContentType: "video/webm",
            Metadata:
            {
                uploaderName: name,
                duration: duration || "unkown"
            }
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60 seconds
        return url;
    }
    catch(err)
    {
        console.error("Failed to upload file  to session", err)
        return null;
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
            const head = await s3.send(new HeadObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: obj.Key
            }));

            result.push
            ({
                filename: obj.Key,
                uploader: head.Metadata?.uploaderName,
                duration: head.Metadata?.duration,
                size: obj.Size
            })
        }

        return result;
    }
    catch (err)
    {
        console.error("Failed to retrieve from s3", err);
        return [];
    }
}

async function getSessionFiles(userSessionId)
{
    const audioSessionId = getSessionIdFromUser(userSessionId);
    const session = getSession(audioSessionId);
    if(!session || !session.Item) return null;
    if(session.Item.owner != userSessionId) return null;

    const s3Objects = await listObjectsFromS3(sessionId);

    return s3Objects;
}


//Get sessionId if user has one active
export async function getSessionIdFromUser(userId)
{
    if (!userId) return null;

    try {
        const userResult = await ddb.send(
            new GetCommand({
                TableName: USER_TABLE,
                Key: { "user-id": userId }
            })
        );

        if (!userResult.Item || !userResult.Item.audioSessionId) {
            return null;
        }

        return userResult.Item.audioSessionId;
    }
    catch (err) {
        console.error("Error getting session ID from user:", err);
        return null;
    }
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

export async function isOwner(userId, sessionId)
{
    const session = await getSession(sessionId);
    if (!session?.Item) return false;
    return session.Item.owner === userId;
}

export async function getOwner(sessionId)
{
    const session = await getSession(sessionId);
    if (!session?.Item) return null;
    return session.Item.owner;
}

async function setAudioSessionId(userId, audioSessionId)
{
    if (!userId || !audioSessionId) return null;
    try
    {
        await ddb.send(
            new UpdateCommand({
                TableName: USER_TABLE,
                Key: {"user-id": userId},
                UpdateExpression: "SET audioSessionId = :sid",
                ExpressionAttributeValues: {
                    ":sid": audioSessionId,
                },
            })
        )
    }
    catch(err)
    {
        console.log("failed to set audio session id", err);
    }
}

async function clearAudioSessionId(userId)
{
    if (!userId) return null;
    try
    {
        await ddb.send(
            new UpdateCommand({
                TableName: USER_TABLE,
                Key: {"user-id": userId},
                UpdateExpression: "REMOVE audioSessionId",
            })
        )
    }
    catch(err)
    {
        console.log("failed to clear audio session id", err);
    }
}

/**
 * When user is kicked, disconnected, or leaves disconnect their websocket and remove them from the session table.
 * If owner then close the session to owner access file only and disconnect all websockets
*/
async function leaveAudioSession(userId, reason)
{
    console.log("Leaving session for user: ", userId, "reason: ", reason);

    if (!userId) return null;
    
    let sessionId;
    let session;

    console.log("User valid: ", userId);
    try {
        sessionId = await getSessionIdFromUser(userId);
        if(!sessionId) return null;
        console.log("Session ID valid: ", sessionId);
        session = await getSession(sessionId);
        if(!session || !session.Item) return null;
        console.log("Session valid: ", session.Item);
    } catch (err) {
        console.error("Error in leaveAudioSession:", err);
        return null;
    }

    console.log("Session: ", session?.Item);

    //If owner then close the session and disconnect all collaborators
    if(session?.Item?.owner == userId)
    {
        await closeSession(sessionId);
        // Clear the owner's audioSessionId after closing the session
        await clearAudioSessionId(userId);
    }
    //disconnect user and notify session
    else
    {
        const sessionData = activeSessions.get(sessionId);
        if (!sessionData) return null;

        console.log("Session data: ", sessionData);
        
        const userData = sessionData.users.get(userId);
        const localId = userData?.localId;
        const ws = sessionData.sockets.get(userId);

        console.log("User data: ", userData);
        console.log("Local ID: ", localId);
        console.log("WebSocket: ", ws);

        if (ws)
        {
            ws.send(JSON.stringify({ type: "removed", reason: reason}));
            ws.close(1000, reason);
        }

        sessionData.sockets.delete(userId);
        sessionData.users.delete(userId);
        if (localId) {
            sessionData.localIds.delete(localId);
            sessionData.micLevels.delete(localId);
            sessionData.mutedUsers.delete(localId);
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

        console.log("Sending removed message to all other clients");

        for (const [uid, socket] of sessionData.sockets.entries())
        {
            if (socket !== ws && socket.readyState === 1) // 1 = WebSocket.OPEN
            {
                socket.send(JSON.stringify({type: "removed", reason: reason, localId: localId}));
                console.log("Sent removed message to client: ", uid);
            }
        }

        console.log("User removed for reason: ", reason);
        
        // Clear the user's audioSessionId from their user record
        await clearAudioSessionId(userId);
    }
}

//Closes session removing all references, deletes from ddb if no recordings
async function closeSession(audioSessionId)
{
    if (!audioSessionId)
        return null;
    const audioSession = await getSession(audioSessionId);

    if (!audioSession?.Item) return null;

    const sessionData = activeSessions.get(audioSessionId);
    if (!sessionData) return null;

    //Close session since it has recordings
    for (const [uid, socket] of sessionData.sockets.entries())
        {
            if (socket.readyState === socket.OPEN)
            {
                socket.close(1000, "Session Closed");
            }

            leaveAudioSession(uid, "Session Closed");
        }

    // Clear the mic level broadcast interval if it exists
    if (sessionData.broadcastInterval) {
      clearInterval(sessionData.broadcastInterval);
    }
    
    activeSessions.delete(audioSessionId);


    //Delete session since no recordings saved
    if (audioSession.Item.videoIds.length == 0)
    {
        await ddb.send(new DeleteCommand({
            TableName: process.env.AUDIO_SESSION_TABLE_NAME,
            Key: { "audio-session-id": audioSessionId },
        }));
    }
    else
    {
        await ddb.send(
            new UpdateCommand({
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": audioSessionId},
                UpdateExpression: "SET #status = :newStatus",
                ExpressionAttributeNames: {
                    "#status": "status", 
                },
                ExpressionAttributeValues: {
                ":newStatus": "finished",
                },
            })
        );
    }

}


//exported functions
export function createAudioSession(userId, userSessionId)
{
    return createSession(userId, userSessionId);
}

export function getAudioSession(sessionId)
{
    return getSession(sessionId);
}

export function joinAudioSession(userId, sessionId)
{
    return joinSession(userId, sessionId);
}

export async function removeFromAudioSession(userId, reason)
{
    return await leaveAudioSession(userId, reason);
}