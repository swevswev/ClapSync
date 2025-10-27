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

async function createSession(userSessionId)
{
    //check if userId is a valid account userId function
    const time = new Date().toISOString();
    
    let audioSessionId = await getSessionIdFromUser(userSessionId);
    
    if (audioSessionId) return null;

    audioSessionId = crypto.randomUUID();

    const item =
    {
        "audio-session-id": audioSessionId,
        "collaborators": {},
        "owner": userSessionId,
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
            setAudioSessionId(userSessionId, audioSessionId);
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

async function joinSession(userSessionId, audioSessionId, userName)
{
    const session = await getSession(audioSessionId);
    if (!session?.Item) return null;

    const currentUserSession = await getSessionIdFromUser(userSessionId)
    if (currentUserSession?.Item?.audioSessionId)
    {
        console.log("ALREADY IN A SESSION");

        //just link them back towards that session
        return null
    }

    //tryna access a finished session to download clips
    if (session.Item.status == "finished" && isOwner(userSessionId, session))
    {
        //allow access
        return null
    }

    if (!userName || !validateUserName(userName))
        return null;

    const collaboratorCount = Object.keys(session.collaborators || {}).length;
    const maxUsers = Number(process.env.AUDIO_SESSION_USER_SIZE);

    console.log(collaboratorCount, maxUsers);

    if (collaboratorCount >= (maxUsers - 1)) return null;
    if (session.collaborators?.[userSessionId]) return null;

    try
    {
        await ddb.send(
            new UpdateCommand({
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": audioSessionId},
                UpdateExpression: "SET collaborators.#usid = :data",
                ExpressionAttributeNames: {
                    "#usid": userSessionId, 
                },
                ExpressionAttributeValues: {
                ":data": { joinedAt: new Date().toISOString() }, // metadata for this user
                },
            })
        )

        setAudioSessionId(userSessionId, audioSessionId);
        //signal join to the session
    }
    catch (err)
    {
        console.log("Failed to join session:", err);
    }

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
async function getSessionIdFromUser(userSessionId)
{
    if (!userSessionId) return null;

    const userSession = await getUserSession(userSessionId);
    const audioSessionId = userSession?.Item?.["audioSessionId"];

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

async function isOwner(userSessionId, session)
{
    if (!session?.Item) return false;
    return session.Item.owner === userSessionId;
}


async function setAudioSessionId(userSessionId, audioSessionId)
{
    if (!userSessionId || !audioSessionId) return null;
    try
    {
        await ddb.send(
            new UpdateCommand({
                TableName: process.env.USER_SESSION_TABLE_NAME,
                Key: {"user-session-id": userSessionId},
                UpdateExpression: "SET #data.#asid = :sid",
                ExpressionAttributeNames: {
                    "#data": "data",
                    "#asid": "audio-session-id",
                },
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

/**
 * When user is kicked, disconnected, or leaves disconnect their websocket and remove them from the session table.
 * If owner then close the session to owner access file only and disconnect all websockets
*/
async function leaveAudioSession(userSessionId, reason)
{
    if (!userSessionId) return null;
    const sessionId = await getSessionIdFromUser(userSessionId);

    if(!sessionId) return null;
    const session = await getSession(sessionId);

    if(!session || !session.Item) return null;

    //If owner then close the session and disconnect all collaborators
    if(session.Item.owner == userSessionId)
    {
        closeSession(sessionId);
    }
    //disconnect user and notify session
    else
    {
        const sessionData = activeSessions.get(sessionId);
        const ws = sessionData.sockets.get(userSessionId);
        if (ws)
        {
            ws.send(JSON.stringify({ type: "kicked" }));
            ws.close(1000, reason);
            sessionData.sockets.delete(userSessionId);
            sessionData.users.delete(userSessionId);
            sessionData.localIds.delete(userSessionId);
        }

        await ddb.send(
            new UpdateCommand(
            {
                TableName: process.env.AUDIO_SESSION_TABLE_NAME,
                Key: {"audio-session-id": sessionId},
                UpdateExpression: "REMOVE collaborators.#usid",
                ExpressionAttributeNames: {
                    "#usid": userSessionId, 
                },
            })
        )

        for (const [usid, socket] of sessionData.sockets.entries())
        {
            if (socket.readyState === ws.OPEN)
            {
            socket.send(JSON.stringify({type: "userKicked", localId: localId}));
            }
        }

        console.log("User removed for reason: ", reason);
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
    for (const [usid, socket] of sessionData.sockets.entries())
        {
            if (socket.readyState === socket.OPEN)
            {
                socket.close(1000, "Session Closed");
            }

            await ddb.send(new UpdateCommand(
            {
                TableName: process.env.USER_SESSION_TABLE_NAME,
                Key: {"user-session-id": usid},
                UpdateExpression: "SET audioSessionId = :empty",
                ExpressionAttributeValues: {":empty": ""},
            })
        )
        }

    activeSessions.delete(audioSessionId);


    //Delete session since no recordings saved
    if (sessionData.Item.videoIds.length == 0)
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
export function createAudioSession(userSessionId)
{
    return createSession(userSessionId);
}

export function getAudioSession(sessionId)
{
    return getSession(sessionId);
}

export function joinAudioSession(userSessionId, sessionId)
{
    return joinSession(userSessionId, "54205874-be5a-4ade-b66e-dc90ee532dcf")
}

export function removeFromAudioSession(sessionId, reason)
{
    return leaveAudioSession();
}