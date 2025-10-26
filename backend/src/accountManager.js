import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { createUserSession } from "./userSessions.js";
import { create } from "domain";
import bcrypt from "bcrypt";

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);


async function verifyEmail(email){
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

async function findEmail(email){
    const params = {
    TableName: process.env.USER_TABLE_NAME,
    IndexName: "email-index", // your GSI name
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
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

    return false;
}

async function verifyPassword(password){
    const minlength = 8;
    const maxlength = 64;

    if(password.length < 8 || password.length > 64){
        return false;
    }
    return true;
}

async function verifyUsername(username){
    const minlength = 3;
    const maxlength = 64;
    const regex = /[/\:.]/

    if(username.length < minlength || username.length > maxlength){
        return false;
    }
    else if(regex.test(username) === true){
        return false;
    }

    return true;
}

async function createAccount(username, email, password){
    if(await verifyEmail(email) === false){
        return false;
    }
    else if(await verifyPassword(password) === false){
        return false;
    }
    else if(await verifyUsername(username) === false){
        return false;
    }

    if(await findEmail(email)){
        return false;
    }

    const userId = crypto.randomUUID();
    const sessionId = await createUserSession(undefined, userId, username);

    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(password, saltRounds);

    const item =
    {
        "user-id": userId,
        email: email,
        username: username,
        password: hashPassword,
        sessionId: sessionId
    }

    const USER_TABLE = process.env.USER_TABLE_NAME

    try{
        await ddb.send(
            new PutCommand({
                TableName: USER_TABLE,
                Item: item,
                ConditionExpression: "attribute_not_exists(sessionId)",
            })
        );
    }
    catch(err){
        console.error('Error hashing password:', err);
    }
}

export function validateUserName(username)
{
    return verifyUsername;
}