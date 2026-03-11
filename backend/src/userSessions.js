import cookieParser from "cookie-parser";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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

/**
 * Create a session record in DynamoDB.
 * @param {string} [sessionId]
 * @param {string|null} userId
 * @param {string|null} userName
 * @returns {Promise<string>}
 */
async function createSession(sessionId = crypto.randomUUID(), userId, userName)
{
    const time = new Date().toISOString();
    const timeToLive = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * COOKIE_LIFESPAN;

    const item =
    {
        "user-session-id": sessionId,
        createdAt: time,
        lastSeen: time,
        audioSessionId: "",
        timeToLive: timeToLive,
        userId: userId || null,
        userName: userName || null,
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

/**
 * Get a session record by id.
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
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
        // Failed to get session
    }
}

/**
 * Get the stored username for a session.
 * @param {string} sessionId
 * @returns {Promise<string|null>}
 */
async function getUserName(sessionId)
{
        if (!sessionId) return null;
    try
    {
        const result = await ddb.send(
            new GetCommand({TableName: SESSIONS_TABLE, Key: {"user-session-id": sessionId},})
        )
        return result.Item?.userName;
    }
    catch (err)
    {
        // Failed to get name
    }
}

/**
 * Update a session's lastSeen timestamp.
 * @param {string} sessionId
 * @returns {Promise<void|null>}
 */
async function updateSession(sessionId)
{
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
    }
    catch(err)
    {
        // Error updating session
    }
}

/**
 * Delete a session record.
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
export async function deleteSession(sessionId){
    await ddb.send(
        new DeleteCommand({
            TableName: SESSIONS_TABLE,
            Key: {"user-session-id": sessionId },
    }));

    return true;
}

/**
 * Ensure requests have a session cookie and backing DynamoDB record.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
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

/**
 * Wrap an async middleware/handler and forward errors to Express.
 * @param {(req: any, res: any, next: any) => Promise<any>} fn
 * @returns {(req: any, res: any, next: any) => void}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Get a user session record.
 * @param {string} userSessionId
 * @returns {Promise<object|null>}
 */
export function getUserSession(userSessionId)
{
    return getSession(userSessionId);
}

/**
 * Create a new user session for a user.
 * @param {string|undefined} sessionId
 * @param {string|null} userId
 * @param {string|null} userName
 * @returns {Promise<string>}
 */
export function createUserSession(sessionId, userId, userName) {
  return createSession(sessionId, userId, userName);
}

/**
 * Get the user's name from a session record.
 * @param {string} userSessionId
 * @returns {Promise<string|null>}
 */
export function getUserNameFromSession(userSessionId)
{
    return getUserName(userSessionId)
}

/**
 * Install the session middleware on an Express app instance.
 * @param {import("express").Express} app
 */
export function useSession(app) {
  app.use(cookieParser());
  app.use(asyncHandler(sessionHandler));
}