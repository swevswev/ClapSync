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

    const navigate = useNavigate();

    //Time syncing:
    const lastPingTimeRef = useRef(0);

    // Audio analysis refs
    const contextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const bufferLengthRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

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

    function kickUser(localId: string)
    {
        console.log("Kicking user:", localId);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionData?.self === sessionData?.owner) {
            wsRef.current.send(JSON.stringify({type: "kickUser", localId: localId}));
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
                        const delay = roundTripTime / 2 + 100; // One-way delay
                        updatePingToServer(delay);
                        break;
                    case "micLevels":
                        updateMicLevels(data);
                        break;
                    case "startRecording":
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
            {isLoaded && sessionData ? <SessionComponent sessionData={sessionData} audioSessionId={id || ""} micLevels={micLevels} muted={muted} setMuted={setMuted} kickUser={kickUser} mutedUsers={mutedUsers} pingDelays={pingDelays} /> : <div className="flex flex-col items-center justify-center h-screen space-y-4">
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



