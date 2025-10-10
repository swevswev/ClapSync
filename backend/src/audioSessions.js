import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSession } from "./userSessions.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const AUDIO_SESSIONS_TABLE = process.env.AUDIO_SESSION_TABLE_NAME

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

export function createAudioSession(userId)
{
    console.log("CREATING");
    return createSession(userId);
}

export function joinAudioSession(userId, sessionId)
{
    console.log("JOINING");
    return joinSession(userId, "54205874-be5a-4ade-b66e-dc90ee532dcf")
}