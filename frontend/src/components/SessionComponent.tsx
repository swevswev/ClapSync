import { Copy, Crown, LogOut, Play, Users, Square, Download, SignalHigh, SignalMedium, SignalLow, SignalZero, Mic, ArrowDownToLine, MicOff, UserX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import waiting from "../assets/waiting.png";
import { API_URL } from "../utils/api";

interface SessionData {
    users: Record<string, string>; // localId -> username
    self: string;
    owner: string;
}

export type RecordingState = "idle" | "countdown" | "recording" | "stopping" | "locked";

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
    recordingState: RecordingState;
    countdownTime: number;
    inputVolume: number;
    setInputVolume: (volume: number) => void;
    inputDevices: MediaDeviceInfo[];
    selectedInputDevice: string;
    setSelectedInputDevice: (deviceId: string) => void;
    downloadFile: (filename: string) => void;
}

export default function SessionComponent({ sessionData, audioSessionId, micLevels, muted, setMuted, kickUser, startRecording, stopRecording, mutedUsers, recordingState, countdownTime, pingDelays, inputVolume, setInputVolume, inputDevices, selectedInputDevice, setSelectedInputDevice, downloadFile }: SessionComponentProps)
{
    const navigate = useNavigate();
    const isOwner = sessionData.self === sessionData.owner;

    const [copied, setCopied] = useState(false);
    const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
    const [downloadFiles, setDownloadFiles] = useState<Array<{filename: string, uploader: string, duration: string, size: number}>>([]);
    const [displayCountdown, setDisplayCountdown] = useState(0);
    const [leavingCountdown, setLeavingCountdown] = useState<number | null>(null);
    const lastCountdownRef = useRef<number | null>(null);
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

    // When displayCountdown changes, run leave animation for previous value
    useEffect(() => {
        if (recordingState !== "countdown") {
            lastCountdownRef.current = null;
            setLeavingCountdown(null);
            return;
        }
        const prev = lastCountdownRef.current;
        lastCountdownRef.current = displayCountdown;
        if (prev !== null && prev !== displayCountdown) {
            setLeavingCountdown(prev);
            const t = setTimeout(() => setLeavingCountdown(null), 400);
            return () => clearTimeout(t);
        }
    }, [recordingState, displayCountdown]);

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

    async function getSessionFiles()
    {
        console.log("[Frontend] getSessionFiles called");
        console.log("[Frontend] sessionData.self:", sessionData.self);
        console.log("[Frontend] sessionData.owner:", sessionData.owner);
        console.log("[Frontend] Is owner?", sessionData.self === sessionData.owner);
        
        // Only fetch files if user is the owner
        if (sessionData.self !== sessionData.owner) {
            console.log("[Frontend] User is not owner, skipping file fetch");
            setDownloadFiles([]);
            return;
        }
        
        console.log("[Frontend] Making request to /getFiles");
        try {
            const response = await fetch(`${API_URL}/getFiles`, {
                method: "POST",
                credentials: "include",
            });
            
            console.log("[Frontend] Response status:", response.status);
            console.log("[Frontend] Response ok:", response.ok);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("[Frontend] Error fetching files:", errorData.error || "Failed to fetch files");
                console.error("[Frontend] Full error data:", errorData);
                // If no files found, show empty list (backend returns 401 for no files)
                if (errorData.error === "No files found") {
                    setDownloadFiles([]);
                } else {
                    setDownloadFiles([]);
                }
                return;
            }
            
            const data = await response.json();
            console.log("[Frontend] Response data:", data);
            if (data.files && Array.isArray(data.files)) {
                console.log("[Frontend] Files array length:", data.files.length);
                setDownloadFiles(data.files);
            } else {
                console.log("[Frontend] No files in response or invalid format");
                setDownloadFiles([]);
            }
        } catch (error) {
            console.error("[Frontend] Exception fetching files:", error);
            setDownloadFiles([]);
        }
    }
    
    function toggleDownloadsPanel()
    {
        if(!downloadsPanelOpen)
        {
            getSessionFiles();
        }
        setDownloadsPanelOpen(!downloadsPanelOpen);
    }

    
    return(
        <>
            <style>{`
                /* Custom slider thumb styling - vertical bar */
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 6px;
                    height: 20px;
                    border-radius: 2px;
                    background: #d1d5db;
                    border: none;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }
                
                input[type="range"]::-webkit-slider-thumb:hover {
                    background: #9ca3af;
                }
                
                input[type="range"]::-moz-range-thumb {
                    width: 6px;
                    height: 20px;
                    border-radius: 2px;
                    background: #d1d5db;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }
                
                input[type="range"]::-moz-range-thumb:hover {
                    background: #9ca3af;
                }
                
                /* Custom scrollbar styling */
                .downloads-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                
                .downloads-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .downloads-scroll::-webkit-scrollbar-thumb {
                    background: #4b5563;
                    border-radius: 3px;
                }
                
                .downloads-scroll::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
                
                /* Firefox scrollbar */
                .downloads-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #4b5563 transparent;
                }
            `}</style>
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-6 sm:px-8 lg:px-12 overflow-hidden"> 
            {isOwner && (
                <button onClick={() => toggleDownloadsPanel()} className="absolute top-4 md:right-6 right-4 p-2 rounded-full bg-gray-800/50 border-1 border-gray-700 hover:bg-gray-700 hover:scale-110 hover:top-6 transition-all duration-300 cursor-pointer">
                    <Download className="w-5 h-5 text-gray-200" />
                </button>
            )}
            
            <div>
                {/* Downloads Panel */}
                <div className={`flex flex-col absolute top-16 right-4 rounded-lg z-10 transition-all duration-500 ease-in-out border-gray-700 bg-slate-900 overflow-hidden ${downloadsPanelOpen ? "w-sm h-[240px] border-1" : "w-0 h-0 bg-transparent border-0"} ${isOwner ? "" : "hidden"}`}>
                    {downloadsPanelOpen && (
                        <>
                            <div className="flex flex-col h-full">
                                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-700/80 flex items-center justify-between">
                                    <span className="text-gray-100 text-sm font-semibold tracking-wide">Downloads</span>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-900/70 text-gray-300 border border-gray-600">
                                        {downloadFiles.length} file{downloadFiles.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto w-full downloads-scroll">
                                    <div className="flex flex-col items-center justify-start space-y-1 px-2 pb-2">
                                        {downloadFiles.length > 0 ? (
                                            downloadFiles.map((file, index) => {
                                                const filenameOnly = file.filename.split('/').pop() || `File ${index + 1}`;
                                                const durationLabel = file.duration ? formatTime(parseFloat(file.duration)) : "N/A";
                                                const sizeLabel = file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "N/A";

                                                return (
                                                    <div
                                                        key={index}
                                                        onClick={() => {
                                                            console.log("[SessionComponent] File clicked:", file.filename);
                                                            console.log("[SessionComponent] downloadFile prop:", typeof downloadFile);
                                                            if (downloadFile) {
                                                                downloadFile(file.filename);
                                                            } else {
                                                                console.error("[SessionComponent] downloadFile prop is not defined!");
                                                            }
                                                        }}
                                                        className="w-full min-h-[64px] flex flex-row items-center justify-between gap-3 px-3 py-2 cursor-pointer rounded-md border border-transparent hover:border-blue-400/60 hover:bg-gray-800/70 group transition-colors duration-150"
                                                    >
                                                        <div className="flex flex-col items-start justify-center gap-1 flex-1 min-w-0">
                                                            <span
                                                                className="text-gray-100 text-sm font-medium truncate"
                                                                title={filenameOnly}
                                                            >
                                                                {filenameOnly}
                                                            </span>
                                                            <div className="flex flex-row items-center gap-3 text-xs text-gray-300/80">
                                                                <span className="whitespace-nowrap">
                                                                    Duration: <span className="font-semibold text-gray-100">{durationLabel}</span>
                                                                </span>
                                                                <span className="whitespace-nowrap">
                                                                    Size: <span className="font-semibold text-gray-100">{sizeLabel}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ArrowDownToLine className="w-5 h-5 text-gray-200 opacity-60 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 pointer-events-none" />
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <span className="text-gray-400 text-xs px-2 py-4">No files available</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
            </div>

            <div className= "w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center relative">
                {/* Participants Panel */}
                <div className="w-full max-w-2xl md:w-xs h-108 bg-gray-800/50 border-1 border-gray-700 rounded-lg flex flex-col shadow-xl">
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
                    <div className="w-full h-8 rounded-lg flex flex-row justify-between items-center">
                        <button onClick={copySessionId} className={`w-fit h-full rounded-lg flex flex-row justify-center items-center space-x-2 px-2 cursor-pointer transition-colors border-1 ease-out hover:bg-gray-700/50 ${copied ? "border-blue-500/50 duration-0" : "border-gray-400 duration-300"}`}>
                            <span className="text-gray-200 text-sm font-semibold">Session ID:</span>
                            <span className="text-gray-200 text-sm font-semibold underline">{audioSessionId}</span>
                            <Copy className="w-4 h-4 text-gray-200" />
                        </button>

                        <button onClick={() => navigate("/")} className="w-fit px-2 h-8 rounded-lg flex flex-row justify-center items-center cursor-pointer hover:bg-red-700/50 transition-colors duration-300 border-1 space-x-2 border-red-500">
                                <LogOut className="w-4 h-4 text-gray-200" />
                                <span className="text-gray-200 text-md font-semibold">Exit</span>
                        </button>
                    </div>

                    {/* Session Display */}
                    <div className={`w-full h-108 bg-gray-800/50 border-1 border-gray-700  rounded-lg flex justify-center items-center shadow-xl `}>
                        {recordingState === "countdown" ? (
                            <div className="flex flex-col space-y-4 justify-center items-center text-center">
                                <span className="text-gray-200 text-2xl sm:text-3xl font-semibold shadow-xl">Going live in:</span>
                                <div className="relative h-14 flex justify-center items-center overflow-hidden">
                                    {leavingCountdown !== null && (
                                        <span key={`out-${leavingCountdown}`} className="absolute text-gray-200 text-5xl sm:text-6xl font-semibold tabular-nums animate-countdown-out">
                                            {leavingCountdown}
                                        </span>
                                    )}
                                    <span key={displayCountdown} className="text-gray-200 text-5xl sm:text-6xl font-semibold tabular-nums text-shadow-xl animate-countdown-in">
                                        {displayCountdown}
                                    </span>
                                </div>
                            </div>
                        ) : recordingState === "recording" ? (
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <span className="text-gray-200 text-6xl font-semibold tracking-[0.05em] text-shadow-xl tabular-nums animate-recording-time-in">{displayRecordingTime}</span>
                            </div>
                        ) : recordingState === "stopping" ? (
                            <div className="flex flex-col justify-center items-center space-y-4">
                                <span className="text-gray-200 text-4xl font-semibold">Stopping recording</span>
                                <div className="flex flex-row justify-center items-center space-x-3 pt-2">
                                    <div className="w-3 h-3 bg-white/80 rounded-full animate-dot-pulse duration-1000 animate-infinite" />
                                    <div className="w-3 h-3 bg-white/80 rounded-full animate-dot-pulse duration-1000 animate-infinite delay-200" />
                                    <div className="w-3 h-3 bg-white/80 rounded-full animate-dot-pulse duration-1000 animate-infinite delay-400" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-row justify-center items-center space-x-4 animate-in slide-in-from-bottom duration-1000 delay-500">
                                <img src={waiting} alt="Waiting" className="w-40 h-40 animate-rocking duration-2000 animate-infinite" />
                                <div className="flex flex-col justify-center items-center space-y-2">
                                    <span className="text-gray-200 text-xl sm:text-3xl font-semibold">Waiting for others to join</span>
                                    <span className="text-gray-200 text-xs sm:text-md font-medium">Owner can start the session at any time.</span>
                                    <div className="flex flex-row justify-center items-center space-x-3 pt-2">
                                        <div className="w-3 h-3 bg-white/80 rounded-full animate-dot-pulse duration-1000 animate-infinite" />
                                        <div className="w-3 h-3 bg-white/80 rounded-full animate-dot-pulse duration-1000 animate-infinite delay-200" />
                                        <div className="w-3 h-3 bg-white/80 rounded-full animate-dot-pulse duration-1000 animate-infinite delay-400" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Options Panel */}
                    <div className="w-full h-16 rounded-lg flex flex-row justify-between items-center">
                        {isOwner ? (
                            <div className="flex flex-row justify-center items-center space-x-2 border-1 border-gray-700 bg-gray-800/50 rounded-lg">
                                { recordingState === "recording" ? (
                                    <button onClick={() => stopRecording()}className="w-10 h-10 flex flex-row rounded-lg justify-center items-center cursor-pointer">
                                        <Square className="w-8 h-8 text-gray-200" />
                                    </button>
                                ) : recordingState === "stopping" ? (
                                    <button className="w-10 h-10 flex flex-row rounded-lg justify-center items-center cursor-not-allowed">
                                        <Square className="w-8 h-8 text-gray-200/50" />
                                    </button>
                                ) : (
                                    <button onClick={() => startRecording() } className="w-10 h-10 rounded-lg flex flex-row justify-center items-center cursor-pointer">
                                        <Play className="w-8 h-8 text-gray-200" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                
                            </div>
                        )}

                        <div className="flex flex-row justify-center items-center space-x-4">

                        <button className="flex flex-row justify-center items-center cursor-pointer" onClick={() => setMuted(!muted)}>
                                {muted ? <MicOff className="w-7 h-7 text-red-500" /> : <Mic className="w-7 h-7 text-gray-200" />}
                            </button>

                            {/* Input Volume Slider */}
                            <div className="flex flex-row items-center space-x-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={inputVolume}
                                    onChange={(e) => setInputVolume(Number(e.target.value))}
                                    className="w-20 h-2 bg-gray-700 rounded-md appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                    
                
                            {/* Input Device Dropdown */}
                            {(() => {
                                const isRecording = recordingState === "recording" || recordingState === "countdown";
                                return (
                                    <select
                                        value={selectedInputDevice}
                                        onChange={(e) => setSelectedInputDevice(e.target.value)}
                                        disabled={isRecording}
                                        className={`px-2 py-1 text-sm max-w-50 border-1 border-gray-600 rounded-lg w-full h-full bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500 ${
                                            isRecording 
                                                ? "bg-gray-800/50 cursor-not-allowed opacity-50" 
                                                : "bg-gray-700/50 cursor-pointer"
                                        }`}
                                        title={isRecording ? "Cannot change input device while recording" : ""}
                                    >
                                        {inputDevices.map((device) => (
                                            <option className="bg-gray-800 text-gray-200" key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                            </option>
                                        ))}
                                    </select>
                                );
                            })()}
                
                        </div>
                    </div>
                </div>
            </div>
        </section>
        </>
    );
}