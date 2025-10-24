import cookieParser from "cookie-parser";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const SESSIONS_TABLE = process.env.USER_SESSION_TABLE_NAME
const COOKIE_NAME = "usid";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

const COOKIE_LIFESPAN = 30;

async function createSession(sessionId = crypto.randomUUID(), userId, initialData = {"audio-session-id": ""})
{
    const time = new Date().toISOString();
    const timeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * COOKIE_LIFESPAN;

    const item =
    {
        "user-session-id": sessionId,
        createdAt: time,
        lastSeen: time,
        data: initialData,
        timeToLive: timeToLive,
        userId: userId || null
    }

    try
    {
        await ddb.send(
            new PutCommand({
                TableName: SESSIONS_TABLE,
                Item: item,
                ConditionExpression: "attribute_not_exists(sessionId)",
            })
        );
    }
    catch (err)
    {
        if (err.name === "ConditionalCheckFailedException") 
        {
            const existing = await getSession(sessionId);
            if (existing) return existing;
        }
        throw err;
    }
    return sessionId;
}

async function getSession(sessionId)
{
    if (!sessionId) return null;
    try
    {
        const result = await ddb.send(
            new GetCommand({TableName: SESSIONS_TABLE, Key: {"user-session-id": sessionId},})
        )
        return result
    }
    catch (err)
    {
        console.log("Couldn't Get Session", err)
    }
}

async function updateSession(sessionId)
{
    console.log("UPDATING");
    if (!sessionId) return null;
    try
    {
        const time = new Date().toISOString();
        await ddb.send(
            new UpdateCommand({
                TableName: SESSIONS_TABLE,
                Key: {"user-session-id": sessionId},
                UpdateExpression: "SET lastSeen = :time",
                ExpressionAttributeValues: {":time": time},
            })
        )
        console.log("UPDATE SUCESXS!");
    }
    catch(err)
    {
        console.log("Error updating session", err)
    }
}

async function sessionHandler(req, res, next)
{
    let sessionId = req.cookies[COOKIE_NAME]

    if (sessionId)
    {
        const session = await getSession(sessionId)
        if (session?.Item)
        {
            await updateSession(sessionId);
        }
        else
        {
            await createSession(sessionId)
        }
    }
    else
    {
        sessionId = await createSession();
    }
    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);
    next();
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function getUserSession(userId)
{
    return getSession(userId);
}

export function createUserSession(undefined, userId)
{
    return createSession(undefined, userId)
}

export function useSession(app) {
  app.use(cookieParser());
  app.use(asyncHandler(sessionHandler));
}