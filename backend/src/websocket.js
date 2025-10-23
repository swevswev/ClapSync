import { WebSocketServer } from "ws";
import { parse } from "url";
import cookie from "cookie";
import { getUserSession } from "./userSessions.js";
import { getAudioSession } from "./audioSessionManager.js";

export const activeSessions = new Map();

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

      //verify userId cookie and valid user session
      const audioSessionId = match[1];
      const cookies = cookie.parse(req.headers.cookie || "");
      const userId = cookies["usid"];
      if (!userId || !audioSessionId)
      {
        console.warn("NO SESSION COOKIE/SESSION ID")
        socket.destroy();
        return;
      }
    
      const userSession = await(getUserSession(userId));
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
      wss.emit("connection", ws, req, audioSessionId, userId);
      });
    }
    catch(err)
    {
        console.error("Upgrade error:", err);
        socket.destroy();
    }
    
  });

  /**
   * Each session's socket logic
   */
  wss.on("connection", (ws, req, audioSessionId, userId) => {
    console.log(`✅ WebSocket connected: user ${userId} joined session ${audioSessionId}`);
    if (!activeSessions.has(audioSessionId))
    {
        const sessionData =
        {
            owner: userId,
            sockets: new Map(),
        }
        activeSessions.set(audioSessionId, sessionData);
    }

    const sessionData = activeSessions.get(audioSessionId);
    sessionData.sockets.set(userId, ws);

    
  });

}