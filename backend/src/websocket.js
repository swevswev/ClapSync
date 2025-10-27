import { WebSocketServer } from "ws";
import { parse } from "url";
import cookie from "cookie";
import { getUserNameFromSession, getUserSession } from "./userSessions.js";
import { getAudioSession, removeFromAudioSession } from "./audioSessionManager.js";
import {v4 as uuidv4} from "uuid";

export const activeSessions = new Map();

const recordingBuffer = 10000 //10 secs

export function setupWebSocket(server) 
{
  const wss = new WebSocketServer({ noServer: true });

  /**
   * When user joins or creates session, allows websocket connection if they are a verified user to the session's websocket
   */
  server.on("upgrade", async (req, socket, head) => {
    try 
    {
      const { pathname } = parse(req.url, true);
      //Verify proper url layout ./session/(sid)/ws
      const match = pathname.match(/^\/session\/([^/]+)\/ws$/);
      if (!match) 
      {
        socket.destroy();
        return;
      }

      //verify userSessionId cookie and valid user session
      const audioSessionId = match[1];
      const cookies = cookie.parse(req.headers.cookie || "");
      const userSessionId = cookies["usid"];
      if (!userSessionId || !audioSessionId)
      {
        console.warn("NO SESSION COOKIE/SESSION ID")
        socket.destroy();
        return;
      }
    
      const userSession = await(getUserSession(userSessionId));
      if (!userSession)
      {
        console.warn("INVALID SESSION COOKIE")
        socket.destroy();
        return;
      }

      const audioSession = await(getAudioSession(audioSessionId));
      if (!audioSession)
      {
        console.warn("INVALID AUDIO SESSION ID");
        socket.destroy();
        return;
      }

      //Allow connection to websocket
      wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, audioSessionId, userSessionId);
      });
    }
    catch(err)
    {
        console.error("Upgrade error:", err);
        socket.destroy();
    }
    
  });

  /**
   * Idk what to call it, function block for websocket
   */
  const handleMessage = 
  {
    startRecording: (data, ws, sessionData, userSessionId) =>
    {
      if (userSessionId != sessionData.owner)
        return;

      const time = performance.now() + recordingBuffer;

      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === ws.OPEN)
        {
          socket.send(JSON.stringify({type: "startRecording", time}));
        }
      }
    },

    pauseRecording: (data, ws, sessionData, userSessionId) =>
    {
      if (userSessionId != sessionData.owner)
        return;

      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === ws.OPEN)
        {
          socket.send(JSON.stringify({type: "pauseRecording", time}));
        }
      }
    },

    stopRecording: (data, ws, sessionData, userSessionId) =>
    {
      if (userSessionId != sessionData.owner)
        return;

      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === ws.OPEN)
        {
          socket.send(JSON.stringify({type: "stopRecording", time}));
        }
      }
    },

    kickUser: (data, ws, sessionData, userSessionId) =>
    {
      if (userSessionId != sessionData.owner)
        return null;

      const localId = data.localId
      let kickedUserSessionId;
      for (const [usid, lid] of sessionData.localIds.entries())
      {
        if (lid == localId)
          kickedUserId = usid;
      }

      if (!kickedUserSessionId || kickedUserSessionId == userSessionId)
        return null;

      removeFromAudioSession(kickedUserSessionId, "kicked");
    },

    ping: (data, ws) =>
    {
      ws.send(JSON.stringify({type: "pong", time: performance.now(), clientTime: data.clientTime}));
    },

    micLevel: (data, ws, sessionData, userSessionId) =>
    {
      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket !== ws && socket.readyState === ws.OPEN) {
          socket.send(JSON.stringify({ type: "updateMicLevel", localId: sessionData.localIds.get(userSessionId), db: data.db }));
        }
      }
    },

    changeIcon: (data, ws, sessionData, userSessionId) =>
    {
      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket !== ws && socket.readyState === ws.OPEN) {
          socket.send(JSON.stringify({ type: "changeIcon", localId: sessionData.localIds.get(userSessionId), icon: data.icon }));
        }
      }
    }
  }


  /**
   * Each session's socket logic
   */
  wss.on("connection", (ws, req, audioSessionId, userSessionId) => {
    console.log(`✅ WebSocket connected: user ${userSessionId} joined session ${audioSessionId}`);
    if (!activeSessions.has(audioSessionId))
    {
        const sessionData =
        {
            owner: userSessionId,
            sockets: new Map(),
            users: new Map(),
            localIds: new Map(),
        }
        activeSessions.set(audioSessionId, sessionData);
    }

    const sessionData = activeSessions.get(audioSessionId);
    sessionData.sockets.set(userSessionId, ws);

    const userName = getUserNameFromSession(userSessionId) || "unknown";
    sessionData.users.set(userSessionId, userName);
    
    const localId = uuidv4();
    sessionData.localIds.set(userSessionId, localId)

    for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket !== ws && socket.readyState === ws.OPEN) {
          socket.send(JSON.stringify({ type: "join", userName: userName, localId: localId}));
        }
      }

    ws.on("message", (message) => {
      const data = JSON.parse(message);
      const type = data.type
      
      handleMessage[type](data, ws, sessionData, userSessionId);
    });

    ws.on("close", () => {
      removeFromAudioSession(audioSessionId, "disconnect");
    })
  });

}