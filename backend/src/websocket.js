import { WebSocketServer } from "ws";
import { parse } from "url";
import cookie from "cookie";
import { getUserNameFromSession, getUserSession } from "./userSessions.js";
import { getAudioSession, removeFromAudioSession, getOwner, joinAudioSession } from "./audioSessionManager.js";
import { getUser, getUserName } from "./accountManager.js";
import {v4 as uuidv4} from "uuid";

export const activeSessions = new Map();

const recordingBuffer = 5000 //5 secs
const MIC_LEVEL_BROADCAST_INTERVAL = 200; 

export function setupWebSocket(server) 
{
  const wss = new WebSocketServer({ noServer: true });

  function getUserIdFromSocket(sessionData, ws) {
    for (const [uid, socket] of sessionData.sockets.entries()) {
      if (socket === ws) return uid;
    }
    return null;
  }

  function serverNowMs()
  {
    // Use Date.now() directly for consistency with client-side time
    // High-resolution time can drift, so we use standard Date.now() for sync
    return Date.now();
  }
  /**
   * When user joins or creates session, allows websocket connection if they are a verified user to the session's websocket
   */
  server.on("upgrade", async (req, socket, head) => {
    try 
    {
      console.log("UPGRADE");
      console.log(req.url);

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
      
      console.log(`WebSocket upgrade attempt: audioSessionId=${audioSessionId}, userSessionId=${userSessionId}`);
      
      if (!userSessionId || !audioSessionId)
      {
        console.warn("NO SESSION COOKIE/SESSION ID", { userSessionId: !!userSessionId, audioSessionId: !!audioSessionId });
        socket.destroy();
        return;
      }
    
      const userSession = await(getUserSession(userSessionId));
      if (!userSession || !userSession.Item)
      {
        console.warn("INVALID SESSION COOKIE", { userSessionId, userSession: !!userSession });
        socket.destroy();
        return;
      }

      const userId = await(getUser(userSessionId));
      console.log(`getUser result for ${userSessionId}:`, userId);
      if (!userId)
      {
        console.warn("Error getting user from session - user may not be logged in", { 
          userSessionId, 
          userSessionItem: userSession.Item 
        });
        socket.destroy();
        return;
      }

      const audioSession = await(getAudioSession(audioSessionId));
      if (!audioSession || !audioSession.Item)
      {
        console.warn("INVALID AUDIO SESSION ID", { audioSessionId, audioSession: !!audioSession });
        socket.destroy();
        return;
      }
      
      console.log(`✅ WebSocket upgrade approved: userId=${userId}, audioSessionId=${audioSessionId}`);

      //Allow connection to websocket
      wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, audioSessionId, userId, userSessionId);
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
    startRecording: (data, ws, sessionData) =>
    {

      const userId = getUserIdFromSocket(sessionData, ws);
      
      if (!userId || userId !== sessionData.owner) return;

      sessionData.uploadedRecordings.clear();
      const time = Date.now() + recordingBuffer;

      for (const [uid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === 1)
        {
          socket.send(JSON.stringify({type: "startRecording", time:time}));
        }
      }
    },

    pauseRecording: (data, ws, sessionData) =>
    {
      const userId = getUserIdFromSocket(sessionData, ws);
      if (!userId || userId !== sessionData.owner) return;

      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === 1)
        {
          socket.send(JSON.stringify({type: "pauseRecording", time: Date.now()}));
        }
      }
    },

    resumeRecording: (data, ws, sessionData) =>
    {
      const userId = getUserIdFromSocket(sessionData, ws);
      if (!userId || userId !== sessionData.owner) return;

      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === 1)
        {
          socket.send(JSON.stringify({type: "resumeRecording", time: Date.now()}));
        }
      }
    },

    stopRecording: (data, ws, sessionData, userSessionId) =>
    {
      const userId = getUserIdFromSocket(sessionData, ws);
      if (!userId || userId !== sessionData.owner) return;

      const time = Date.now() + recordingBuffer;

      for (const [usid, socket] of sessionData.sockets.entries())
      {
        if (socket.readyState === 1)
        {
          socket.send(JSON.stringify({type: "stopRecording", time: time}));
        }
      }
    },

    kickUser: (data, ws, sessionData) =>
    {
      // Find the userId from the socket to verify ownership
      let userId = null;
      for (const [uid, socket] of sessionData.sockets.entries()) {
        if (socket === ws) {
          userId = uid;
          break;
        }
      }
      
      if (!userId || userId !== sessionData.owner) {
        return null;
      }

      const localId = data.localId;
      let kickedUserId = null;
      for (const [lid, uid] of sessionData.localIds.entries())
      {
        if (lid === localId)
        {
          kickedUserId = uid;
          break;
        }
      }

      if (!kickedUserId || kickedUserId === sessionData.owner)
        return null;

      removeFromAudioSession(kickedUserId, "kicked");
    },

    ping: (data, ws) =>
    {
      ws.send(JSON.stringify({type: "pong", time: serverNowMs(), clientTime: data.clientTime}));
    },

    micLevel: (data, ws, sessionData) =>
    {
      // Find the userId from the socket, then get localId
      let userId = null;
      for (const [uid, socket] of sessionData.sockets.entries()) {
        if (socket === ws) {
          userId = uid;
          break;
        }
      }
      
      if (!userId) return;
      
      // Get user data which contains localId
      const userData = sessionData.users.get(userId);
      if (userData && userData.localId) {
        sessionData.micLevels.set(userData.localId, data.level || 0);
        broadcastMicLevels(sessionData);
      }
    },

    pingUpdate: (data, ws, sessionData) =>
    {
      let userId = null;
      for (const [uid, socket] of sessionData.sockets.entries()) {
        if (socket === ws) {
          userId = uid;
          break;
        }
      }
      
      if (!userId) return;

      const userData = sessionData.users.get(userId);
      if (userData && userData.localId) 
      {
        const numericDelay = Number(data.delay);
        sessionData.pingDelays.set(userData.localId, Number.isFinite(numericDelay) ? numericDelay : 0);
        broadcastPingDelays(sessionData);
      }
    },

    mute: (data, ws, sessionData) =>
    {
      let userId = null;
      for (const [uid, socket] of sessionData.sockets.entries()) {
        if (socket === ws) {
          userId = uid;
          break;
        }
      }

      if (!userId) return;

      const muted = data.muted;
      const userData = sessionData.users.get(userId);
      if (userData && userData.localId)
      {
        sessionData.mutedUsers.set(userData.localId, muted);
        // Broadcast muted users update to all clients
        broadcastMutedUsers(sessionData);
      }
    },
  }


  /**
   * Broadcast all mic levels to all clients in a session
   */
  function broadcastMicLevels(sessionData) {
    if (sessionData.micLevels.size === 0) return;

    // Convert Map to object for JSON serialization
    const micLevelsObj = {};
    for (const [localId, level] of sessionData.micLevels.entries()) {
      micLevelsObj[localId] = level;
    }

    // Send to all connected clients in the session
    for (const [usid, socket] of sessionData.sockets.entries()) {
      if (socket.readyState === 1) { // 1 = WebSocket.OPEN
        socket.send(JSON.stringify({ 
          type: "micLevels", 
          levels: micLevelsObj 
        }));
      }
    }
  }

  function broadcastPingDelays(sessionData)
  {
    if (sessionData.pingDelays.size === 0) return;
    const pingDelaysObj = {};
    for (const [localId, delay] of sessionData.pingDelays.entries()) {
      pingDelaysObj[localId] = delay;
    }

    for (const [usid, socket] of sessionData.sockets.entries())
    {
      if (socket.readyState === 1) 
      {
        socket.send(JSON.stringify({
          type: "pingDelays",
          delays: pingDelaysObj
        }));
      }
    }
  }

  function broadcastMutedUsers(sessionData)
  {
    if (sessionData.mutedUsers.size === 0) return;
    const mutedUsersObj = {};
    for (const [localId, muted] of sessionData.mutedUsers.entries()) {
      mutedUsersObj[localId] = muted;
    }
    for (const [usid, socket] of sessionData.sockets.entries()) {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: "mutedUsers",
          users: mutedUsersObj
        }));
      }
    }
  }

  /**
   * Each session's socket logic
   */
  wss.on("connection", async (ws, req, audioSessionId, userId, userSessionId) => {
    console.log(`✅ WebSocket connected: user ${userId} joined session ${audioSessionId}`);
    if (!activeSessions.has(audioSessionId))
    {
        const sessionData =
        {
            owner: await getOwner(audioSessionId),
            sockets: new Map(),
            users: new Map(),
            localIds: new Map(),
            ownerLocalId: uuidv4(),
            micLevels: new Map(), // Store mic levels by localId
            pingDelays: new Map(), // Store ping delays by localId
            mutedUsers: new Map(),
            uploadedRecordings: new Set(), // Track userIds who have uploaded (fast in-memory check)
            broadcastInterval: null // Interval timer for broadcasting mic levels
        }
        activeSessions.set(audioSessionId, sessionData);
        
        // Start broadcasting mic levels periodically
        sessionData.broadcastInterval = setInterval(() => {
          broadcastMicLevels(sessionData);
        }, MIC_LEVEL_BROADCAST_INTERVAL);
    }

    
    const sessionData = activeSessions.get(audioSessionId);

    try {
        await joinAudioSession(userId, audioSessionId);
    } catch (err) {
        console.error("Failed to join session during WebSocket connection:", err);
        ws.close(1008, "Failed to join session");
        return;
    }
    
    console.log(sessionData.owner);
    console.log(userId, sessionData.users.has(userId));
    let localId;
    let userName;
    
    // Check if user already has an active connection
    const existingSocket = sessionData.sockets.get(userId);
    if (existingSocket && existingSocket !== ws) {
      console.log(`⚠️ User ${userId} already has an active connection. Closing old socket.`);
      // Remove event listeners from old socket to prevent disconnect handler from firing
      existingSocket.removeAllListeners();
      // Close the old socket (0 = CONNECTING, 1 = OPEN)
      if (existingSocket.readyState === 0 || existingSocket.readyState === 1) {
        existingSocket.close(1000, "Replaced by new connection");
      }
    }
    
    if(!sessionData.users.has(userId))
    {
      sessionData.sockets.set(userId, ws);

      userName = (await getUserName(userId)) || "unknown";

      if(userId !== sessionData.owner)
      {
        localId = uuidv4();
      }
      else
      {
        localId = sessionData.ownerLocalId;
      }

      sessionData.users.set(userId, {username: userName, localId: localId});
      sessionData.localIds.set(localId, userId);
    }
    else
    {
      sessionData.sockets.set(userId, ws);
      const userData = sessionData.users.get(userId);
      userName = userData.username;
      localId = userData.localId;
    }

    // Ensure we always have a ping value for every known localId
    // (prevents pingDelays[localId] being undefined on clients until first update)
    if (!sessionData.pingDelays.has(localId)) {
      sessionData.pingDelays.set(localId, 0);
    }

    const currentUserMap = {};
    const mutedUsersMap = {};
    const pingDelaysMap = {};
    
    for (const [localId, userId] of sessionData.localIds.entries()) {
        const username = sessionData.users.get(userId)?.username || "unknown";
        currentUserMap[localId] = username;
        // Initialize muted status for existing users
        if (sessionData.mutedUsers.has(localId)) {
            mutedUsersMap[localId] = sessionData.mutedUsers.get(localId);
        }
        // Initialize ping delays for existing users
        if (sessionData.pingDelays.has(localId)) {
            pingDelaysMap[localId] = sessionData.pingDelays.get(localId);
        }
    }

    ws.send(JSON.stringify({
        type: "setup", 
        users: currentUserMap, 
        self: localId, 
        owner: sessionData.ownerLocalId,
        mutedUsers: mutedUsersMap,
        pingDelays: pingDelaysMap
    }));

    for (const [uid, socket] of sessionData.sockets.entries())
      {
        if (socket !== ws && socket.readyState === 1) {
          socket.send(JSON.stringify({ type: "join", userName: userName, localId: localId}));
        }
      }

    ws.on("message", (message) => {
      const data = JSON.parse(message);
      const type = data.type
      
      if(handleMessage[type])
        handleMessage[type](data, ws, sessionData, userSessionId);
      else
        console.warn("Unknown message type: ", type);
    });

    ws.on("close", async () => {
      console.log(`WebSocket closed for user ${userId}`);
      // Only remove user if this socket is still the active one
      const currentSocket = sessionData.sockets.get(userId);
      if (currentSocket === ws) {
        console.log(`Removing user ${userId} from session (socket was active)`);
        await removeFromAudioSession(userId, "disconnected");
      } else {
        console.log(`Ignoring close event for user ${userId} (socket was replaced)`);
      }
    })
  });

}