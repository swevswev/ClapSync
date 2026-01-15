import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import crypto, { verify } from "crypto";
import { createUserSession, getUserSession } from "./userSessions.js";
import { deleteSession } from "./userSessions.js";
import bcrypt from "bcrypt";

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const USER_TABLE = process.env.USER_TABLE_NAME;
const saltRounds = 10;

export async function verifyEmail(email){
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

export async function findEmail(email){
    const params = {
    TableName: process.env.USER_TABLE_NAME,
    IndexName: "email-index", // your GSI name
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
    console.log(username);
    const params = {
        TableName: process.env.USER_TABLE_NAME,
        IndexName: "username-index", // your GSI name
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
        sessionId: sessionId
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
        const findUser = new QueryCommand({
            TableName: USER_TABLE,
            IndexName: "email-index",       
            KeyConditionExpression: "email = :e",
            ExpressionAttributeValues: { ":e": normalizedEmail },
            Limit: 1
        });

        const res = await ddb.send(findUser);

        const user = res.Items?.[0];

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

export function validateUserName(username) {
    return verifyUsername;
}