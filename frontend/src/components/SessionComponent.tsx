import { Copy, Crown, LogOut, Play, Users, Pause, Square, Download, SignalHigh, SignalMedium, SignalLow, SignalZero, Mic, ArrowDownToLine, MicOff, Scissors, UserX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import waiting from "../assets/waiting.png";

interface SessionData {
    users: Record<string, string>; // localId -> username
    self: string;
    owner: string;
}

type RecordingState = "idle" | "countdown" | "recording" | "stopping" | "paused";

interface SessionComponentProps {
    sessionData: SessionData;
    audioSessionId: string;
    micLevels: Record<string, number>;
    muted: boolean;
    setMuted: (muted: boolean) => void;
    mutedUsers: Record<string, boolean>;
    pingDelays: Record<string, number>; 
    kickUser: (localId: string) => void;
    startRecording: () => void;
    stopRecording: () => void;
    pauseRecording: () => void;
    recordingState: RecordingState;
    countdownTime: number;
}

export default function SessionComponent({ sessionData, audioSessionId, micLevels, muted, setMuted, kickUser, pauseRecording, startRecording, stopRecording, mutedUsers, recordingState, countdownTime, pingDelays}: SessionComponentProps)
{
    const navigate = useNavigate();
    const [isOwner, setIsOwner] = useState(true);

    const [copied, setCopied] = useState(false);
    const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
    const [displayCountdown, setDisplayCountdown] = useState(0);
    const [displayRecordingTime, setDisplayRecordingTime] = useState("00:00:00");

    let startTimeRef = useRef(0);
    
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const copySessionId = async () => 
    {
        await navigator.clipboard.writeText(audioSessionId);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1000);
    }

    useEffect(() => {
       
    }, [pingDelays]);

    useEffect(() => {
        if (recordingState !== "countdown") {
            setDisplayCountdown(0);
            return;
        }

        const updateCountdown = () => {
            // countdownTime is in milliseconds, convert to seconds
            const secondsRemaining = Math.max(0, Math.ceil(countdownTime / 1000));
            setDisplayCountdown(secondsRemaining);
        };

        updateCountdown();

        const interval = setInterval(updateCountdown, 100);

        return () => clearInterval(interval);
    }, [recordingState, countdownTime]);

    // Update recording time when recording
    useEffect(() => {
        if (recordingState !== "recording") {
            setDisplayRecordingTime("00:00:00");
            startTimeRef.current = 0;
            return;
        }

        // Set start time when recording begins
        if (startTimeRef.current === 0) {
            startTimeRef.current = Date.now();
        }

        const updateRecordingTime = () => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            setDisplayRecordingTime(formatTime(elapsed));
        };

        updateRecordingTime();

        // Update every second
        const interval = setInterval(updateRecordingTime, 1000);

        return () => clearInterval(interval);
    }, [recordingState]);

    const getSignalIcon = (pingMs: number | undefined) => {
        const safePing = Number.isFinite(pingMs) ? (pingMs as number) : Number.POSITIVE_INFINITY;

        if (safePing < 50) return { Icon: SignalHigh, className: "text-green-400" };
        if (safePing < 150) return { Icon: SignalMedium, className: "text-yellow-400" };
        if (safePing < 300) return { Icon: SignalLow, className: "text-orange-400" };
        return { Icon: SignalZero, className: "text-red-500" };
    };

    return(
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-6 sm:px-8 lg:px-12 overflow-hidden"> 
            <button onClick={() => setDownloadsPanelOpen(!downloadsPanelOpen)} className="absolute top-4 md:right-6 right-4 p-2 rounded-full bg-gray-800/50 border-1 border-gray-700 hover:bg-gray-700 hover:scale-110 hover:top-6 transition-all duration-300 cursor-pointer">
                <Download className="w-5 h-5 text-gray-200" />
            </button>
            
            <div>
                {/* Downloads Panel */}
                <div className={`flex flex-col absolute top-16 right-4 rounded-lg z-10 transition-all duration-500 ease-in-out border-gray-700 bg-slate-900 overflow-hidden ${downloadsPanelOpen ? "w-[200px] h-[240px] border-1" : "w-0 h-0 bg-transparent border-0"}`}>
                    {downloadsPanelOpen && (
                        <>
                            <div className="flex flex-col items-center justify-start space-y-2 pt-2">
                                <span className="text-gray-200 text-md font-bold">Downloads</span>
                                <div className="w-full max-h-full flex flex-col items-center justify-start space-y-1">
                                    <div className="w-full h-8 flex flex-row items-center justify-between space-x-2 px-2 cursor-pointer border-t-1 border-t-blue-100 border-b-1 border-b-blue-100"> 
                                        <span className="text-gray-200 text-xs font-medium underline">Download_1.wav</span>
                                        <ArrowDownToLine className="w-4 h-4 text-gray-200" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
            </div>

            <div className= "w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center relative">
                {/* Participants Panel */}
                <div className="w-full max-w-2xl md:w-xs h-108 bg-gray-800/50 border-1 border-gray-700 rounded-lg flex flex-col">
                    <div className="flex flex-row items-center justify-center space-x-2 pt-2 px-2 pb-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-white text-lg font-bold">Participants ({Object.keys(sessionData.users).length}/5)</span>
                    </div>
                    {/* Participants list container */}
                    <div className="h-[calc(5*4rem+4*0.5rem)] flex flex-col gap-2 px-2 pb-2 overflow-y-auto">
                        {/* Participants list */}
                        {Object.entries(sessionData.users).map(([localId, username]) => (
                            <div key={localId} className={`h-16 bg-gray-700/50 border-1 ${localId === sessionData.self ? "border-blue-500/50" : "border-gray-600"} rounded flex flex-col justify-between`}>
                                <div className="flex flex-row items-center justify-between space-x-2 px-1 pt-1 pb-2">
                                    <div className="flex flex-row items-center justify-center space-x-2">
                                        {localId === sessionData.owner && <Crown className="w-4 h-4 text-blue-400" />}
                                        <span className="text-gray-200 text-sm font-semibold">{username}</span>
                                        {localId !== sessionData.owner && sessionData.self === sessionData.owner && <UserX onClick={() => kickUser(localId)} className="w-4 h-4 text-gray-300 hover:text-red-500 cursor-pointer" />}
                                    </div>
                                    <div className="flex flex-row items-center justify-center space-x-1">
                                        {(() => {
                                            const { Icon, className } = getSignalIcon(pingDelays?.[localId]);
                                            return <Icon className={`w-4 h-4 ${className}`} />;
                                        })()}
                                        {mutedUsers[localId] ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-gray-300" />}
                                    </div>
                                </div>
                                <div className="relative w-[calc(100%-0.5rem)] h-4.5 mx-1 mb-2">
                                    <div className="absolute top-0 left-0 w-full h-4 bg-gray-900 rounded-lg"></div>
                                    <div 
                                        className="absolute top-0 left-0 h-4 bg-slate-400 rounded-lg transition-all duration-100"
                                        style={{ width: `${mutedUsers[localId] ? 0 : ((micLevels[localId] || 0) / 255) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                <div className="w-full max-w-2xl h-full mx-auto flex flex-col space-y-4 items-center justify-center pt-8">

                    {/* Session ID Copy Button */}
                    <div className="w-full h-8 rounded-lg flex flex-row justify-end items-center">
                        <button onClick={copySessionId} className={`w-fit h-full rounded-lg flex flex-row justify-center items-center space-x-2 px-2 cursor-pointer transition-colors border-1 ease-out hover:bg-gray-700/50 ${copied ? "border-blue-500/50 duration-0" : "border-gray-400 duration-300"}`}>
                            <span className="text-gray-200 text-sm font-semibold">Session ID:</span>
                            <span className="text-gray-200 text-sm font-semibold underline">{audioSessionId}</span>
                            <Copy className="w-4 h-4 text-gray-200" />
                        </button>
                    </div>

                    {/* Session Display */}
                    <div className="w-full h-108 bg-gray-800/50 border-1 border-gray-700  rounded-lg flex justify-center items-center">
                        {recordingState === "countdown" ? (
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <span className="text-gray-200 text-4xl font-semibold">Starting in: {displayCountdown}s</span>
                            </div>
                        ) : recordingState === "recording" ? (
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <span className="text-gray-200 text-4xl font-semibold">Recording: {displayRecordingTime}</span>
                            </div>
                        ) : recordingState === "stopping" ? (
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <span className="text-gray-200 text-4xl font-semibold">Stopping...</span>
                            </div>

                        ) : recordingState === "paused" ? (
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <span className="text-gray-200 text-4xl font-semibold">Paused</span>
                            </div>
                        ) : (
                            <div className="flex flex-row justify-center items-center space-x-4">
                                <img src={waiting} alt="Waiting" className="w-40 h-40 rotate-5" />
                                <div className="flex flex-col justify-center items-center space-y-2">
                                    <span className="text-gray-200 text-3xl font-semibold">Waiting for others to join...</span>
                                    <span className="text-gray-200 text-md font-medium">Owner can start the session at any time.</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Options Panel */}
                    <div className="w-full h-16 rounded-lg flex flex-row justify-between items-center">
                        {isOwner ? (
                            <div className="flex flex-row justify-center items-center space-x-2 border-1 border-gray-700 bg-gray-800/50 rounded-lg">
                                { recordingState === "recording" || recordingState === "stopping" ? (
                                    <div className="flex flex-row justify-center items-center space-x-2">
                                        <button onClick={() => stopRecording()}className="w-12 h-12 rounded-lg justify-center items-center cursor-pointer">
                                            <Square className="w-10 h-10 text-gray-200" />
                                        </button>
                                        <button onClick={() => pauseRecording()} className="w-12 h-12 rounded-lg justify-center items-center cursor-pointer">
                                            <Pause className="w-10 h-10 text-gray-200" />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => startRecording() } className="w-12 h-12 rounded-lg flex flex-row justify-center items-center cursor-pointer">
                                        <Play className="w-10 h-10 text-gray-200" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                
                            </div>
                        )}

                        <div className="flex flex-row justify-center items-center space-x-4">
                            <button onClick={() => setMuted(!muted)}>
                                {muted ? <MicOff className="w-8 h-8 text-red-500" /> : <Mic className="w-8 h-8 text-gray-200" />}
                            </button>
                            
                            <button onClick={() => navigate("/")} className="w-fit px-2 h-12 rounded-lg flex flex-row justify-center items-center cursor-pointer hover:bg-red-700/50 transition-colors duration-300 border-1 space-x-2 border-red-500">
                                <LogOut className="w-5 h-5 text-gray-200" />
                                <span className="text-gray-200 text-md font-semibold">Exit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}