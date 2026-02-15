import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import dotenv from "dotenv";
import { activeSessions } from "./websocket.js";
import { ListObjectsV2Command, HeadObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    const session = await getSession(audioSessionId);
    if (!session?.Item) return null;
    //make sure user can join session
    //const currentUserSession = await getSessionIdFromUser(userId);

    const isOwner = (session.Item.owner === userId);
    //tryna access a finished session to download clips
    if (session.Item.status == "finished" && isOwner)
    {
        return session.Item.status;
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
            // Failed to update session status
        }
        
        await setAudioSessionId(userId, audioSessionId);
        return true;
    }

    //make sure session is not closed

    const collaboratorCount = Object.keys(session.Item.collaborators || {}).length;
    const maxUsers = Number(process.env.AUDIO_SESSION_USER_SIZE);

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
        // Failed to join session
    }
    return null;

}

async function listObjectsFromS3(sessionId)
{
    const prefix = `recordings/${sessionId}/`;
    
    const command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: prefix
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

            const fileInfo = {
                filename: obj.Key,
                uploader: head.Metadata?.uploaderName,
                duration: head.Metadata?.duration,
                size: obj.Size
            };
            result.push(fileInfo);
        }

        return result;
    }
    catch (err)
    {
        console.error("[listObjectsFromS3] Failed to retrieve from s3:", err);
        console.error("[listObjectsFromS3] Error details:", err.message, err.stack);
        return [];
    }
}

export async function getSessionFiles(audioSessionId)
{
    const session = await getSession(audioSessionId);
    if(!session || !session.Item) {
        return null;
    }

    const s3Objects = await listObjectsFromS3(audioSessionId);

    if(s3Objects.length == 0) {
        return null;
    }

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
        // Failed to set audio session id
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
        // Failed to clear audio session id
    }
}

/**
 * When user is kicked, disconnected, or leaves disconnect their websocket and remove them from the session table.
 * If owner then close the session to owner access file only and disconnect all websockets
*/
async function leaveAudioSession(userId, reason)
{
    if (!userId) return null;
    
    let sessionId;
    let session;

    try {
        sessionId = await getSessionIdFromUser(userId);
        if(!sessionId) return null;
        session = await getSession(sessionId);
        if(!session || !session.Item) return null;
    } catch (err) {
        console.error("Error in leaveAudioSession:", err);
        return null;
    }

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
        
        const userData = sessionData.users.get(userId);
        const localId = userData?.localId;
        const ws = sessionData.sockets.get(userId);

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

        for (const [uid, socket] of sessionData.sockets.entries())
        {
            if (socket !== ws && socket.readyState === 1) // 1 = WebSocket.OPEN
            {
                socket.send(JSON.stringify({type: "removed", reason: reason, localId: localId}));
            }
        }
        
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

    // Check S3 for recordings instead of videoIds (which is never updated)
    let hasRecordings = false;
    try {
        const prefix = `recordings/${audioSessionId}/`;
        const command = new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME,
            Prefix: prefix,
            MaxKeys: 1 // We only need to know if at least one file exists
        });
        const response = await s3.send(command);
        hasRecordings = (response.Contents && response.Contents.length > 0);
    } catch (err) {
        console.error("Failed to check S3 for recordings:", err);
        // If we can't check S3, assume no recordings to be safe
        hasRecordings = false;
    }

    if (hasRecordings)
    {
        //set id in owner's user entry
        try {
            // Get the user record to check if previousSessions exists
            const userResult = await ddb.send(
                new GetCommand({
                    TableName: process.env.USER_TABLE_NAME,
                    Key: { "user-id": audioSession.Item.owner }
                })
            );
            
            const existingSessions = userResult.Item?.previousSessions || [];
            const updatedSessions = [...existingSessions, audioSessionId];
            
            await ddb.send(new UpdateCommand({
                TableName: process.env.USER_TABLE_NAME,
                Key: {"user-id": audioSession.Item.owner},
                UpdateExpression: "SET previousSessions = :previousSessions",
                ExpressionAttributeValues: {
                    ":previousSessions": updatedSessions,
                },
            }));
        }
        catch (err)
        {
            console.error("Failed to update previousSessions:", err);
        }
    }
    await ddb.send(new DeleteCommand({
        TableName: process.env.AUDIO_SESSION_TABLE_NAME,
        Key: { "audio-session-id": audioSessionId },
    }));
}



// Check if user has already uploaded
export async function hasUserUploaded(sessionId, userId) {
    if (!sessionId || !userId) return false;
    
    // Quick check in-memory first (fast)
    const sessionData = activeSessions.get(sessionId);
    if (sessionData && sessionData.uploadedRecordings && sessionData.uploadedRecordings.has(userId)) {
        return true;
    }
}

export async function markUserUploaded(sessionId, userId)
{
    if (!sessionId || !userId) return null;
    const sessionData = activeSessions.get(sessionId);
    if (sessionData && sessionData.uploadedRecordings)
        sessionData.uploadedRecordings.add(userId);
    return true;
}

export async function getPreviousSessionsFiles(userId)
{
    const user = await ddb.send(new GetCommand({TableName: USER_TABLE, Key: {"user-id": userId}}));
    if (!user.Item || !user.Item.previousSessions) return null;

    const result = {};
    const sessionsToKeep = [];
    
    for (const audioSessionId of user.Item.previousSessions)
    {
        const prefix = `recordings/${audioSessionId}/`;
        try {
            // Check if folder exists and get files with their creation times
            const command = new ListObjectsV2Command({
                Bucket: process.env.S3_BUCKET_NAME,
                Prefix: prefix
            });
            const response = await s3.send(command);
            const objects = response.Contents || [];
            
            if (objects.length > 0) {
                // Get file details with metadata and generate download URLs
                const filesWithTime = [];
                for (const obj of objects) {
                    try {
                        const head = await s3.send(new HeadObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: obj.Key
                        }));
                        
                        // Generate signed download URL (valid for 1 hour)
                        const getObjectCommand = new GetObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: obj.Key,
                        });
                        const downloadUrl = await getSignedUrl(s3, getObjectCommand, { expiresIn: 2 * 60 * 60 });
                        
                        // Extract just the filename from the key
                        const filename = obj.Key.split('/').pop() || obj.Key;
                        
                        filesWithTime.push({
                            filename: filename,
                            fileKey: obj.Key,
                            downloadUrl: downloadUrl,
                            uploader: head.Metadata?.uploaderName || "Unknown",
                            duration: head.Metadata?.duration || "0",
                            size: obj.Size,
                            sizeMB: (obj.Size / (1024 * 1024)).toFixed(2),
                            createdTime: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date(0).toISOString(),
                            audioSessionId: audioSessionId,
                        });
                    } catch (err) {
                        // Skip this file if we can't get metadata or generate URL
                        continue;
                    }
                }
                
                // Sort files by creation time (oldest first)
                filesWithTime.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
                
                if (filesWithTime.length > 0) {
                    result[audioSessionId] = filesWithTime;
                    sessionsToKeep.push(audioSessionId);
                }
            }
            // If no files, don't add to result or sessionsToKeep (will be removed from previousSessions)
        } catch (err) {
            // If S3 check fails, skip this session
            continue;
        }
    }
    
    // Update previousSessions in DynamoDB to remove sessions without files
    if (sessionsToKeep.length !== user.Item.previousSessions.length) {
        try {
            await ddb.send(new UpdateCommand({
                TableName: USER_TABLE,
                Key: {"user-id": userId},
                UpdateExpression: "SET previousSessions = :previousSessions",
                ExpressionAttributeValues: {
                    ":previousSessions": sessionsToKeep,
                },
            }));
        } catch (err) {
            console.error("Failed to update previousSessions:", err);
        }
    }
    
    if (Object.keys(result).length === 0) {
        return null;
    }
    
    return result;
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