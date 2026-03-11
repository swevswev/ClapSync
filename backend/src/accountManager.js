import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import crypto, { verify } from "crypto";
import { createUserSession, getUserSession } from "./userSessions.js";
import { deleteSession } from "./userSessions.js";
import bcrypt from "bcrypt";

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const USER_TABLE = process.env.USER_TABLE_NAME;
const saltRounds = 10;

export async function verifyEmail(email){
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

export async function findEmail(email){
    const params = {
    TableName: process.env.USER_TABLE_NAME,
    IndexName: "email-index", 
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email.toLowerCase(),
    },
    };

    try {
        const result = await ddb.send(new QueryCommand(params));
        if(result.Count > 0){
            return result;
        }
        else{
            return false;
        }
    }
    catch(err){
        console.error("An error has occured:", err.message);
        return false;
    }
}

/**
 * Find user by email using email-index GSI
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User object if found, null otherwise
 */
export async function getUserByEmail(email) {
    if (!email) return null;
    
    const normalizedEmail = email.toLowerCase();
    
    try {
        const result = await ddb.send(new QueryCommand({
            TableName: USER_TABLE,
            IndexName: "email-index",
            KeyConditionExpression: "email = :e",
            ExpressionAttributeValues: { ":e": normalizedEmail },
            Limit: 1
        }));

        return result.Items?.[0] || null;
    }
    catch(err) {
        console.error("Error finding user by email:", err);
        return null;
    }
}


export async function verifyPassword(password){
    const minLength = 8;
    const maxLength = 64;

    if(password.length < minLength || password.length > maxLength){
        return false;
    }
    return true;
}

export async function verifyUsername(username){
    const minlength = 3;
    const maxlength = 32;
    const regex = /[/\:.]/

    if(username.length < minlength || username.length > maxlength){
        return false;
    }
    else if(regex.test(username) === true){
        return false;
    }

    return true;
}

export async function getUserName(userId)
{
    if (!userId) return null;
    try
    {
        const result = await ddb.send(new GetCommand({TableName: USER_TABLE, Key: {"user-id": userId}}));
        return result.Item?.username;
    }
    catch (err)
    {
        console.error("Error getting user name from user id:", err);
    }
}


export async function getUser(userSessionId)
{
    if (!userSessionId) return null;
    
    try 
    {
        const session = await getUserSession(userSessionId);
        if (!session || !session.Item) {
            return null;
        }
        return session.Item.userId;
    }
    catch (err) 
    {
        console.error("Error getting user from session:", err);
        return null;
    }
}

export async function checkUsername(username)
{
    const params = {
        TableName: process.env.USER_TABLE_NAME,
        IndexName: "username-index",
        KeyConditionExpression: "lowercaseUsername = :username",
        ExpressionAttributeValues: {
          ":username": username.toLowerCase(),
        },
    };

    try {
        const result = await ddb.send(new QueryCommand(params));
        if(result.Count > 0){
            return result;
        }
        else{
            return false;
        }
    }
    catch(err){
        console.error("An error has occured:", err.message);
        return false;
    }
}

export async function createAccount(username, email, password){

    /**
     *     if(!(await verifyUsername(username)) || !(await verifyPassword(password)) || !(await verifyEmail(email))){ return false; }
            if(await findEmail(email)){ return false; }
     */

    const userId = crypto.randomUUID();
    const sessionId = await createUserSession(undefined, userId, username);

    const hashPassword = await bcrypt.hash(password, saltRounds);

    const item =
    {
        "user-id": userId,
        email: email.toLowerCase(),
        username: username,
        lowercaseUsername: username.toLowerCase(),
        password: hashPassword,
        sessionId: sessionId,
        previousSessions: [],
    }

    try{
        await ddb.send(
            new PutCommand({
                TableName: USER_TABLE,
                Item: item,
                ConditionExpression: "attribute_not_exists(#uid)",
                ExpressionAttributeNames:
                {"#uid" : "user-id"}
            })
        );

        return sessionId;
    }
    catch(err){
        console.error('Error hashing password:', err);
        return false;
    }
}

export async function login(email, password){
    const normalizedEmail = email.toLowerCase()

    if(!(await verifyEmail(normalizedEmail))) { return false; }

    try{
        const user = await getUserByEmail(normalizedEmail);

        if (!user){
            return false;
        }

        const matchPassword = await bcrypt.compare(password, user.password);
        if (!matchPassword){
            return false;
        }
        
        const sessionId = await createUserSession(undefined, user["user-id"], user.username);

        await ddb.send(
            new UpdateCommand({
                TableName: USER_TABLE,
                Key: { "user-id": user["user-id"] },
                UpdateExpression: "SET sessionId = :s",
                ExpressionAttributeValues: { ":s": sessionId }
        }));

        return sessionId;
    }
    catch(err){
        console.error("login error: ", err);
        return false;
    }
}

export async function logout(sessionId, userId){
    try{
        await deleteSession(sessionId);

        await ddb.send(
            new UpdateCommand({
                TableName: USER_TABLE,
                Key: { "user-id": userId },
                UpdateExpression: "REMOVE sessionId",
            }));

        return true;
    }
    catch (err){
        console.error("logout error: ", err);
        return false;
    }
}

//creates reset token and stores in ddb
export async function forgotPassword(email)
{
    const normalizedEmail = email.toLowerCase();

    // Find user by email using GSI
    try {
        const user = await getUserByEmail(normalizedEmail);

        if (!user) {
            return false;
        }

        const userId = user["user-id"];

        // Generate reset token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 mins
        const resetToken = { token, expiresAt };

        // Update user with reset token using user-id as primary key
        await ddb.send(
            new UpdateCommand({
                TableName: USER_TABLE,
                Key: { "user-id": userId },
                UpdateExpression: "SET resetToken = :rt, resetTokenExpiresAt = :rat",
                ExpressionAttributeValues: { 
                    ":rt": resetToken.token, 
                    ":rat": expiresAt.toISOString() 
                },
            })
        );

        try {
            await ses.send(new SendEmailCommand({
                Source: "Clapsync <noreply@clapsync.live>",
                Destination: {
                    ToAddresses: [normalizedEmail],
                },
                Message: {
                    Subject: {
                        Data: "Reset your Clapsync password",
                    },
                    Body: {
                        Html: {
                            Data: `<p>Click the link below to reset your Clapsync password: ${process.env.FRONTEND_URL}/resetPassword/${token}?email=${encodeURIComponent(normalizedEmail)}</p>`,
                        },
                    },
                },
            }));  
        } catch (sesError) {
            // Log SES-specific errors with more detail
            if (sesError.name === 'AccessDenied' || sesError.Code === 'AccessDenied') {
                console.error("SES Access Denied - IAM user lacks ses:SendEmail permission:", sesError.message);
            } else {
                console.error("SES email send error:", sesError.message || sesError);
            }
            return false;
        }

        console.log("reset token created for user:", userId);
        return resetToken;
    }
    catch(err){
        console.error("forgot password error: ", err);
        return false;
    }
}

export async function checkResetToken(email, token)
{
    if (!email || !token) {
        return false;
    }

    const normalizedEmail = email.toLowerCase();

    try {
        // Find user by email using GSI
        const user = await getUserByEmail(normalizedEmail);

        if (!user) {
            return false; // User not found
        }

        const userId = user["user-id"];

        // Get user by primary key to check reset token
        const userData = await ddb.send(
            new GetCommand({
                TableName: USER_TABLE,
                Key: { "user-id": userId },
            })
        );

        if (!userData.Item) {
            return false;
        }

        // Check if reset token exists
        if (!userData.Item.resetToken || !userData.Item.resetTokenExpiresAt) {
            return false;
        }

        // Check if token is expired
        const expiresAt = new Date(userData.Item.resetTokenExpiresAt);
        if (expiresAt < new Date()) {
            return false; // Token expired
        }

        // Check if token matches
        // resetToken might be stored as object with token property, or as string
        const storedToken = typeof userData.Item.resetToken === 'object' 
            ? userData.Item.resetToken.token 
            : userData.Item.resetToken;

        return token === storedToken;
    }
    catch(err) {
        console.error("check reset token error: ", err);
        return false;
    }
}

export async function resetPassword(email, token, newPassword)
{
    if (!email || !token || !newPassword) {
        return false;
    }

    const normalizedEmail = email.toLowerCase();

    const isValidToken = await checkResetToken(normalizedEmail, token);
    if (!isValidToken) {
        return false; // Invalid or expired token
    }

    try {
        // Find user by email using GSI
        const user = await getUserByEmail(normalizedEmail);

        if (!user) {
            return false; // User not found
        }

        const userId = user["user-id"];

        // Hash the new password
        const hashPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear reset token fields
        await ddb.send(
            new UpdateCommand({
                TableName: USER_TABLE,
                Key: { "user-id": userId },
                UpdateExpression: "SET password = :p REMOVE resetToken, resetTokenExpiresAt",
                ExpressionAttributeValues: {
                    ":p": hashPassword
                }
            })
        );
        console.log("Password reset successful for user:", userId);
        return true;
    }
    catch(err) {
        console.error("reset password error: ", err);
        return false;
    }
}

export function validateUserName(username) {
    return verifyUsername;
}