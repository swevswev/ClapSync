import {useEffect, useState, useRef} from "react";
import {useParams, useLocation} from "react-router-dom";
import SessionComponent from "../components/SessionComponent";
import loading from "../assets/loading.jpg";
import { useNavigate } from "react-router-dom";

const WS_SERVER = import.meta.env.VITE_WS_SERVER || 'ws://localhost:5000';

export default function SessionPage()
{
    const { id } = useParams();
    const location = useLocation();
    const [isLoaded, setIsLoaded] = useState(false);
    const isOwner = location.state?.isOwner ?? false; 
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [sessionData, setSessionData] = useState<{users: Record<string, string>, self: string, owner: string} | null>(null);
    const [microphoneAccess, setMicrophoneAccess] = useState(false);
    const [currentMicLevel, setCurrentMicLevel] = useState(0);
    const [micLevels, setMicLevels] = useState<Record<string, number>>({});
    const [pingDelays, setPingDelays] = useState<Record<string, number>>({});
    const sendMicLevelIntervalRef = useRef<number | null>(null);
    const pingIntervalRef = useRef<number | null>(null);
    const [muted, setMuted] = useState(false);
    const mutedRef = useRef(false);
    const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
    type RecordingState = "idle" | "countdown" | "recording" | "stopping" | "paused";
    const [recordingState, setRecordingState] = useState<RecordingState>("idle");
    const [countdownTime, setCountdownTime] = useState(0);


    const navigate = useNavigate();

    //Time syncing:
    const lastPingTimeRef = useRef(0);
    const serverTimeOffsetRef = useRef(0);
    const serverTimeOffsetList = useRef<Array<{delay: number, offset: number}>>([]);
    const countdownStartTimeRef = useRef(0);
    const recordingStartTimeRef = useRef(0);
    const recordingStartTimestampRef = useRef<number | null>(null);
    const MAX_OFFSET_SAMPLES = 10;

    // Audio analysis refs
    const contextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const bufferLengthRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    //Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startRecordingTimeoutRef = useRef<number | null>(null);
    const stopRecordingTimeoutRef = useRef<number | null>(null);

    const loadSessionData = (data: {users: Record<string, string>, self: string, owner: string, mutedUsers?: Record<string, boolean>, pingDelays?: Record<string, number>}) => {
        console.log("Session data received:", data);
        setSessionData(data);
        setIsLoaded(true);
        // Initialize mutedUsers from setup message if provided
        if (data.mutedUsers) {
            setMutedUsers(data.mutedUsers);
        }
        if (data.pingDelays) {
            setPingDelays(data.pingDelays);
        }
    };


    function clientNowMs()
    {
        // Ensure both values are numbers (timeOrigin can be BigInt in some environments)
        const timeOrigin = Number(performance.timeOrigin);
        const now = performance.now();
        return timeOrigin + now;
    }

    function kickUser(localId: string)
    {
        console.log("Kicking user:", localId);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner) {
            wsRef.current.send(JSON.stringify({type: "kickUser", localId: localId}));
        }
    }

    function startRecording()
    {
        if (recordingState === "idle")
        {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner)
                {
                    wsRef.current.send(JSON.stringify({type: "startRecording"}));
                }
        }
        else if (recordingState === "paused")
        {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner)
            {
                wsRef.current.send(JSON.stringify({type: "resumeRecording"}));
            }
        }
    }

    function stopRecording()
    {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner)
        {
            wsRef.current.send(JSON.stringify({type: "stopRecording"}));
        }
    }

    function pauseRecording()
    {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner)
        {
            wsRef.current.send(JSON.stringify({type: "pauseRecording"}));
        }
    }

    function attachStreamListeners() {
        const stream = streamRef.current;
        if (!stream) return;
        stream.getAudioTracks().forEach(track => {
            track.onended = () => {
                console.log("Mic disconnected");
                setMicrophoneAccess(false);
                setCurrentMicLevel(0);
            };
        });
    }

    async function getMicrophoneAccess() {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = newStream;

            attachStreamListeners();

            if (!contextRef.current) {
                contextRef.current = new AudioContext();
            }
            const context = contextRef.current;

            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }
            sourceRef.current = context.createMediaStreamSource(streamRef.current);


            if (!mediaRecorderRef.current) {
                mediaRecorderRef.current = new MediaRecorder(streamRef.current);
                chunksRef.current = [];
                mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                    if (event.data.size > 0) chunksRef.current.push(event.data);
                  };
            
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                    await requestUploadFile(audioBlob);
                };
            }

            if (!analyserRef.current) {
                analyserRef.current = context.createAnalyser();
                analyserRef.current.fftSize = 256;
            }
            sourceRef.current?.connect(analyserRef.current);

            bufferLengthRef.current = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLengthRef.current));

            setMicrophoneAccess(true);
            updateMicLevelLoop();
            
            if (sendMicLevelIntervalRef.current) {
                clearInterval(sendMicLevelIntervalRef.current);
            }
            sendMicLevelIntervalRef.current = window.setInterval(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !mutedRef.current) {
                    const level = getCurrentMicLevel();
                    wsRef.current.send(JSON.stringify({ 
                        type: "micLevel", 
                        level: level 
                    }));
                }
            }, 100); // Send every 100ms to server
            
            return true;
        } catch (error) {
            console.error("Error getting microphone access:", error);
            return false;
        }
    }

    function getCurrentMicLevel(): number {
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        const bufferLength = bufferLengthRef.current;

        if (!analyser || !dataArray || !bufferLength) {
            return 0;
        }

        const typedArray = dataArray as Uint8Array<ArrayBuffer>;
        analyser.getByteFrequencyData(typedArray);
        const average = typedArray.reduce((a, b) => a + b, 0) / typedArray.length;
        
        return average;
    }


    function broadcastPing()
    {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const currentTime = performance.now();
            wsRef.current.send(JSON.stringify({type: "ping", clientTime: currentTime.toString()}));
            lastPingTimeRef.current = currentTime;
        }
    }

    function updateServerTimeOffset(serverTime: number, delay: number)
    {
        const now = clientNowMs();
        const estimatedServerTime = serverTime + delay;
        const estimatedOffset = estimatedServerTime - now;

        // Add new sample to the list
        serverTimeOffsetList.current.push({ delay, offset: estimatedOffset });

        // Keep only MAX_OFFSET_SAMPLES samples by removing the one with largest delay
        if (serverTimeOffsetList.current.length > MAX_OFFSET_SAMPLES) {
            // Find the index of the sample with the largest delay
            let maxDelayIndex = 0;
            let maxDelay = serverTimeOffsetList.current[0].delay;
            for (let i = 1; i < serverTimeOffsetList.current.length; i++) {
                if (serverTimeOffsetList.current[i].delay > maxDelay) {
                    maxDelay = serverTimeOffsetList.current[i].delay;
                    maxDelayIndex = i;
                }
            }
            // Remove the sample with the largest delay
            serverTimeOffsetList.current.splice(maxDelayIndex, 1);
        }

        // Find the sample with the lowest delay
        if (serverTimeOffsetList.current.length > 0) {
            const lowestDelaySample = serverTimeOffsetList.current.reduce((min, sample) => 
                sample.delay < min.delay ? sample : min
            );
            
            // Set the offset ref to the offset of the lowest delay sample
            serverTimeOffsetRef.current = lowestDelaySample.offset;
            console.log("Server time offset:", serverTimeOffsetRef.current);
        }
    }

    function updatePingToServer(delay: number)
    {
        if(wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
        {
            wsRef.current.send(JSON.stringify({type: "pingUpdate", delay: delay}));
        }
    }


    function updateMicLevelLoop() {
        const analyser = analyserRef.current;
        if (!analyser) return;

        // Only update mic level if not muted (use ref to get current value)
        if (!mutedRef.current) {
            const level = getCurrentMicLevel();
            setCurrentMicLevel(level);
        }

        // Continue the loop
        animationFrameRef.current = requestAnimationFrame(updateMicLevelLoop);
    }

    function newJoin(data: {userName: string, localId: string})
    {
        setSessionData(prevData => {
            if (!prevData) return null;
            return {
                ...prevData,
                users: {
                    ...prevData.users,
                    [data.localId]: data.userName
                }
            };
        });
    }

    function removeUser(localId: string)
    {
        setSessionData(prevData => {
            if (!prevData) return null;
            const newUsers = { ...prevData.users };
            delete newUsers[localId];
            return { ...prevData, users: newUsers };
        });
        // Also remove from mutedUsers and micLevels
        setMutedUsers(prev => {
            const updated = { ...prev };
            delete updated[localId];
            return updated;
        });
        setMicLevels(prev => {
            const updated = { ...prev };
            delete updated[localId];
            return updated;
        });
        setPingDelays(prev => {
            const updated = { ...prev };
            delete updated[localId];
            return updated;
        });
    }

    function updateMicLevels(data: {levels: Record<string, number>})
    {
        setMicLevels(data.levels);
    }

    function updateMutedUsers(data: {users: Record<string, boolean>})
    {
        setMutedUsers(data.users);
    }

    function updatePingDelays(data: {delays: Record<string, number>})
    {
        setPingDelays(data.delays);
    }

    function requestStartRecording()
    {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner)
        {
            wsRef.current.send(JSON.stringify({type: "startRecording"}));
        }
    }

    // Get audio duration from blob
    async function getAudioDuration(blob: Blob): Promise<number> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            const url = URL.createObjectURL(blob);
            
            audio.addEventListener('loadedmetadata', () => {
                const duration = audio.duration; // Duration in seconds
                URL.revokeObjectURL(url);
                resolve(duration);
            });
            
            audio.addEventListener('error', (e) => {
                URL.revokeObjectURL(url);
                console.error("Error loading audio metadata:", e);
                // Fallback: calculate from recording timestamps if available
                if (recordingStartTimestampRef.current) {
                    const duration = (Date.now() - recordingStartTimestampRef.current) / 1000;
                    resolve(duration);
                } else {
                    reject(new Error("Could not determine audio duration"));
                }
            });
            
            audio.src = url;
        });
    }

    async function requestUploadFile(blob: Blob)
    {
        if (!blob || recordingState === "recording") return;
        try
        {
            // Check file size on client side (in bytes)
            const fileSizeBytes = blob.size;
            const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
            console.log(`File size: ${fileSizeBytes} bytes (${fileSizeMB} MB)`);
            
            // Optional: Check if file is too large before uploading
            const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
            if (fileSizeBytes > MAX_FILE_SIZE) {
                console.error("File too large!");
                alert(`File is too large (${fileSizeMB} MB). Maximum size is 100MB.`);
                return;
            }
            
            // Get audio duration
            let duration = 0;
            try {
                duration = await getAudioDuration(blob);
                console.log(`Audio duration: ${duration.toFixed(2)} seconds`);
            } catch (err) {
                console.warn("Could not get audio duration, using 0:", err);
            }
            
            const formData = new FormData();
            formData.append("file", blob, "recording.webm");
            formData.append("duration", duration.toString()); // Send duration as string
            
            const uploadResponse = await fetch("http://localhost:5000/upload", 
            {
            method: "POST",
            body: formData,
            credentials: "include",
            });
            
            if (!uploadResponse.ok) {
                throw new Error("Upload failed: " + uploadResponse.statusText);
            }
            const data = await uploadResponse.json();
            console.log("Upload successful:", data);
        }
        catch(err)
        {
            console.error("Error uploading file:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
            alert(`Error uploading file: ${errorMessage}`);
        }
    }


    useEffect(() => {
        // Store reference to old socket before creating new one
        const oldSocket = wsRef.current;
        
        // Close any existing connection before creating a new one
        if (oldSocket) {
            console.log("Closing existing WebSocket connection before creating new one");
            oldSocket.close();
        }
        
        // Construct WebSocket URL
        const wsUrl = `${WS_SERVER}/session/${id}/ws`;
        console.log("Connecting to WebSocket:", wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
            console.log("✅ WebSocket connected");
            setConnected(true);
            // Mark that a new connection is established - this prevents old socket's onclose from navigating
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch(data.type)
                {
                    case "setup":
                        loadSessionData(data);
                        break;

                    case "join":
                        newJoin(data);
                        break;
                    case "pong":
                        const currentTime = performance.now();
                        const clientTime = parseFloat(data.clientTime);
                        const roundTripTime = currentTime - clientTime;
                        const delay = roundTripTime / 2; // One-way delay
                        // Ensure serverTime is a number
                        const serverTime = Number(data.time);
                        updateServerTimeOffset(serverTime, delay);
                        updatePingToServer(delay);
                        break;
                    case "micLevels":
                        updateMicLevels(data);
                        break;
                    case "startRecording":
                        const targetServerTime = Number(data.time);
                        recordingStartTimeRef.current = targetServerTime;
                        const currentClientTime = clientNowMs();
                        const currentServerTime = currentClientTime + serverTimeOffsetRef.current;
                        const timeUntilStart = Math.max(0, targetServerTime - currentServerTime);
                        setCountdownTime(timeUntilStart);
                        console.log("Start recording - Target server time:", targetServerTime, "Current server time:", currentServerTime, "Time until start:", timeUntilStart);
                        
                        setRecordingState("countdown");
                        countdownStartTimeRef.current = targetServerTime;
                        
                        if (startRecordingTimeoutRef.current) {
                            clearTimeout(startRecordingTimeoutRef.current);
                            startRecordingTimeoutRef.current = null;
                        }

                        startRecordingTimeoutRef.current = window.setTimeout(async () => {
                            // Ensure we have mic access and a recorder
                            if (!mediaRecorderRef.current) {
                                await getMicrophoneAccess();
                            }
                            const mr = mediaRecorderRef.current;
                            if (!mr || mr.state === "recording") return;

                            // Reset chunks right before we start
                            chunksRef.current = [];
                            mr.start();
                            recordingStartTimestampRef.current = Date.now(); // Track when recording actually starts
                            setRecordingState("recording");
                            startRecordingTimeoutRef.current = null;
                        }, timeUntilStart);
                        break;
                    case "cutRecording":
                        recordingStartTimeRef.current = Number(data.time);
                        break;
                    case "stopRecording":
                        {
                            console.log("Stop recording - Target server time:", data.time);
                            const targetStopServerTime = Number(data.time);
                            const clientTime = clientNowMs();
                            const serverTime = clientTime + serverTimeOffsetRef.current;
                            const timeUntilStop = Math.max(0, targetStopServerTime - serverTime);

                            if (stopRecordingTimeoutRef.current) {
                                clearTimeout(stopRecordingTimeoutRef.current);
                                stopRecordingTimeoutRef.current = null;
                            }

                            // Set stopping state immediately
                            setRecordingState("stopping");
                            
                            stopRecordingTimeoutRef.current = window.setTimeout(() => {
                                const mr = mediaRecorderRef.current;
                                if (mr && mr.state === "recording") {
                                    mr.stop();
                                }
                                setRecordingState("idle");
                                stopRecordingTimeoutRef.current = null;
                            }, timeUntilStop);
                        }
                        break;
                    case "removed":
                        console.log("User removed:", data.reason, data.localId);
                        removeUser(data.localId);
                        break;
                    case "mutedUsers":
                        updateMutedUsers(data);
                        break;
                    case "pingDelays":
                        updatePingDelays(data);
                        break;
                }
            }
            catch(err)
            {
                console.error("Error parsing message:", err);
            }
        };
        ws.onclose = () => {
            console.log("WebSocket closed");
            setConnected(false);
            
            if (wsRef.current === ws) {
                console.log("This socket is still active, navigating to home");
                navigate("/");
            } else {
                console.log("New connection exists or socket was replaced, skipping navigation");
            }
        };

        return () => {
            if (wsRef.current) {
                console.log("Closing WebSocket connection");
                wsRef.current.close();
                wsRef.current = null;
            }
            if (startRecordingTimeoutRef.current) {
                clearTimeout(startRecordingTimeoutRef.current);
                startRecordingTimeoutRef.current = null;
            }
            if (stopRecordingTimeoutRef.current) {
                clearTimeout(stopRecordingTimeoutRef.current);
                stopRecordingTimeoutRef.current = null;
            }
            // Clean up mic level sending interval
            if (sendMicLevelIntervalRef.current) {
                clearInterval(sendMicLevelIntervalRef.current);
                sendMicLevelIntervalRef.current = null;
            }
            // Clean up ping interval
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
        };
    }, [id]);

    useEffect(() => {
        if (!microphoneAccess) {
            getMicrophoneAccess();
        }
    }, [microphoneAccess]);

    // Set up ping interval when WebSocket is connected
    useEffect(() => {
        if (connected && wsRef.current) {
            // Clear any existing ping interval
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
            
            // Set up new ping interval
            pingIntervalRef.current = window.setInterval(() => {
                broadcastPing();
            }, 1000); // Ping every second
            
            return () => {
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }
            };
        }
    }, [connected]);

    useEffect(() => {
        if (recordingState !== "countdown") {
            setCountdownTime(0);
            return;
        }

        const updateCountdown = () => {
            const currentClientTime = clientNowMs();
            const currentServerTime = currentClientTime + serverTimeOffsetRef.current;
            const timeUntilStart = countdownStartTimeRef.current - currentServerTime;
            setCountdownTime(Math.max(0, timeUntilStart));
        };

        // Update immediately
        updateCountdown();

        // Update every 100ms for smooth countdown
        const interval = setInterval(updateCountdown, 100);

        return () => clearInterval(interval);
    }, [recordingState]);


    useEffect(() => {
        // Update the ref whenever muted state changes
        mutedRef.current = muted;
        
        // When muting, set mic level to 0 immediately
        if (muted) {
            setCurrentMicLevel(0);
        }
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
        {
            wsRef.current.send(JSON.stringify({type: "mute", muted: muted}));
        }
    }, [muted]);

    // Clean up animation frame on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
            {isLoaded && sessionData ? <SessionComponent sessionData={sessionData} audioSessionId={id || ""} micLevels={micLevels} muted={muted} recordingState={recordingState} countdownTime={countdownTime} setMuted={setMuted} kickUser={kickUser} pauseRecording={pauseRecording} mutedUsers={mutedUsers} pingDelays={pingDelays} startRecording={startRecording} stopRecording={stopRecording} /> : <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <img src={loading} alt="Loading" className="w-40 h-40 animate-in slide-in-from-bottom duration-2000 delay-500" />
                <div className="flex flex-row items-center space-x-8">
                    <div className="w-5 h-5 bg-white rounded-full animate-dot-pulse duration-1500 animate-infinite"></div>
                    <div className="w-5 h-5 bg-white rounded-full animate-dot-pulse duration-1500 animate-infinite delay-200"></div>
                    <div className="w-5 h-5 bg-white rounded-full animate-dot-pulse duration-1500 animate-infinite delay-400"></div>
                </div>
            </div>}
        </div>
        
    );
}



