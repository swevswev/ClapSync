import { ArrowDownToLine, ChevronDown, ChevronRight, CirclePlus, Download, Undo2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Waves from "./Waves";

export default function Hero() {
    const [typewriterText, setTypewriterText] = useState("");
    const [currentStringIndex, setCurrentStringIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [scrollY, setScrollY] = useState(0);
    const [previousSessionsFiles, setPreviousSessionsFiles] = useState<Record<string, any[]> | null>(null);
    const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const typewriterTimeoutRef = useRef<number | null>(null);
    const downloadsPanelRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    function formatTime(seconds: number): string {
        if (!seconds || isNaN(seconds)) return "0:00";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    const typewriterStrings = [
        "Audio.",
        "Podcast.",
        "Youtube Video.",
        "Meeting.",
        "Film.",
        "Presentation.",
        "Interview.",
        "Lecture.",
        "Conference.",
        "Webinar.",
    ];

    async function getPreviousSessionsFiles()
    {
        const res = await fetch("http://localhost:5000/getPreviousSessionFiles",
        {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            console.error("Get previous sessions files error:", res.statusText);
            return null;
        }
        const data = await res.json();
        console.log("Get previous sessions files successful:", data);
        setPreviousSessionsFiles(data.previousSessionsFiles);
    }

    useEffect(() => {
        getPreviousSessionsFiles();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (downloadsPanelOpen && downloadsPanelRef.current && !downloadsPanelRef.current.contains(event.target as Node)) {
                setDownloadsPanelOpen(false);
                setSelectedSessionId(null);
            }
        }

        if (downloadsPanelOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [downloadsPanelOpen]);

    const createSession = async () => 
    {
        try
        {
            const res = await fetch("http://localhost:5000/create",
            {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                navigate("/login");
                return;
            }

            const data = await res.json();
            console.log("Create session successful:", data);
            navigate("/create", { state: { audioSessionId: data.sessionId, mode: "create" } });
        }
        catch(err)
        {
            console.error("Create session error:", err);
        }
    }
    

    const joinSession = async () =>
    {
        try
        {
            const res  = await fetch("http://localhost:5000/preJoin",
            {
                method: "POST",
                credentials: "include",
            });
            
            if (!res.ok)
            {
                const data = await res.json();
                if (res.status === 400) {
                    navigate("/join", { state: { audioSessionId: data.audioSessionId, mode: "join" } });
                    return;
                }
                if (res.status === 401) {
                    navigate("/login");
                    return;
                }
            }

            navigate("/join", { state: { mode: "join" } });
        }
        catch(err)
        {
            console.error("Join session error:", err);
        }
    }

    useEffect(() => {
        function handleScroll()
        {
            setScrollY(window.scrollY);
        }

        window.addEventListener("scroll", handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const currentString = typewriterStrings[currentStringIndex];
        const typeSpeed = isDeleting ? 50 : 50; // Faster when deleting

        if (!isDeleting && typewriterText === currentString) {
            // Finished typing, wait then start deleting
            typewriterTimeoutRef.current = window.setTimeout(() => {
                setIsDeleting(true);
            }, 4000);
        } else if (isDeleting && typewriterText === "") {
            // Finished deleting, move to next string
            setIsDeleting(false);
            setCurrentStringIndex((prev) => (prev + 1) % typewriterStrings.length);
        } else {
            // Continue typing or deleting
            typewriterTimeoutRef.current = window.setTimeout(() => {
                if (isDeleting) {
                    setTypewriterText(currentString.substring(0, typewriterText.length - 1));
                } else {
                    setTypewriterText(currentString.substring(0, typewriterText.length + 1));
                }
            }, typeSpeed);
        }

        return () => {
            if (typewriterTimeoutRef.current) {
                clearTimeout(typewriterTimeoutRef.current);
            }
        };
    }, [typewriterText, currentStringIndex, isDeleting]);

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden"> 
            <div className="absolute inset-0 z-0 w-full h-full">
                <Waves />
            </div>

            <div className="max-w-8xl mx-auto text-left relative w-full mb-4 sm:mb-6 leading-tight z-20">
                <div className= "max-w-8xl mx-auto flex flex-col lg:grid lg:grid-cols-1 text-left gap-2 sm:gap-3 lg:gap-4 items-left relative">
                    {/*big top text*/}
                    <h1 className="text-6xl sm:text-4xl md:text-5xl lg:text-[8rem] font-semibold flex flex-col text-left">
                        <span className="bg-gradient-to-r select-none from-indigo-200 via-blue-100 to-cyan-100 bg-clip-text text-transparent block mb-1 sm:mb-2 animate-in slide-in-from-bottom duration-1000 md:leading-tight leading-normal">Synchronize Your</span>
                        <span className="pt-1 sm:pt-8 pb-2 bg-gradient-to-r select-none from-blue-300 via-blue-200 to-cyan-500 bg-clip-text text-transparent inline-block mb-1 sm:mb-2 animate-in slide-in-from-bottom duration-1000 delay-200 space-x-1 leading-relaxed min-h-[1.5em]">
                            {typewriterText}
                            <span className="animate-pulse duration-50">|</span>
                        </span>
                    </h1>
                    {/*description text*/}
                    <p className="text-md font-semibold sm:text-semibold lg:text-lg text-gray-200 max-w-2xl mb-6 pl-2.5 sm:mb-8 animate-in slide-in-from-bottom duration-1000 delay-400 leading-relaxed text-left -mt-2 sm:-mt-3 lg:-mt-4">
                        Start collaborating on your audio projects with ClapSync. Record and sync your audio sessions anywhere, anytime.
                    </p>
                    {/*buttons*/}
                    <div className="flex flex-col sm:flex-row items-center justify-start gap-3 sm:gap-4 mb-8 sm:mb-12 animate-in slide-in-from-bottom duration-1000 delay-600 w-md max-w-lg">
                        <button onClick={createSession} className="group w-full sm:flex-1 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-b from-slate-800/50 to-blue-700 rounded-lg font-semibold text-sm sm:text-base transition-all duration-600 hover:scale-102 flex items-center justify-center space-x-2">   
                            <span> Create a Session </span>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300"/>
                        </button>

                        <button onClick={joinSession} className="group w-full sm:flex-1 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-b from-slate-800/50 to-blue-700 rounded-lg font-bold text-sm sm:text-base transition-all duration-600 hover:scale-102 flex items-center justify-center space-x-2">   
                            <span> Join a Session </span>
                            <CirclePlus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 duration-300"/>
                        </button>
                    </div>
                </div>

                {/* bottom chev*/}
                <div 
                    className="absolute -bottom-30 left-1/2 -translate-x-1/2 transition-opacity duration-300 pointer-events-none"
                    style={{ opacity: Math.max(0, 1 - scrollY / 200) }}
                >
                    <ChevronDown className="w-10 h-10 text-gray-200" />
                </div>

                {previousSessionsFiles && Object.keys(previousSessionsFiles).length > 0 && (
                    <div ref={downloadsPanelRef} className={`fixed bottom-4 right-4 w-14 h-14 bg-blue-950 border-1 border-blue-400/50 rounded-lg flex items-center justify-center z-50 shadow-lg ${downloadsPanelOpen ? "w-80 h-60 transition-transform duration-100" : "hover:scale-105 transition-all duration-300"}`}>
                        {downloadsPanelOpen ? (
                            <div className="w-full h-full flex flex-col items-center justify-start">
                                {selectedSessionId ? (
                                    <div className="w-full h-full flex flex-col items-center justify-start relative">
                                        <span className="text-gray-200 text-lg font-bold">{selectedSessionId}</span>
                                        <Undo2 onClick={() => setSelectedSessionId(null)} className="absolute top-1 right-1 w-5 h-5 text-gray-200 cursor-pointer" />
                                        <div className="w-full flex flex-col">
                                            {previousSessionsFiles[selectedSessionId].map((file, index) => (
                                                <a href={file.downloadUrl} download key={index} className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-700/50 cursor-pointer">
                                                    <div className="space-x-2 w-full h-7 flex flex-row items-center justify-start">
                                                        <span className="text-gray-200 text-sm font-medium underline truncate" title={file.filename}>{file.filename}</span>
                                                        <span className="text-gray-200/70 text-xs font-medium">{file.duration ? formatTime(parseFloat(file.duration)) : "N/A"}</span>
                                                        <span className="text-gray-200/70 text-xs font-medium">{file.size ? (file.size / 1024 / 1024).toFixed(2) : "N/A"} MB</span>
                                                    </div>
                                                    <ArrowDownToLine className="w-4 h-4 text-gray-200" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    Object.keys(previousSessionsFiles).reverse().map((sessionId, index, array) => (
                                        <button onClick={() => setSelectedSessionId(sessionId)} key={sessionId} className={`w-full h-7 cursor-pointer flex items-center justify-between px-2 ${index < array.length - 1 ? 'border-b-1 border-gray-400' : ''}`}>
                                            <span className="text-gray-200 text-sm font-medium">{sessionId}</span>
                                            <span className="text-gray-200/70 text-xs font-medium">{previousSessionsFiles[sessionId].length} files</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center cursor-pointer" onClick={() => setDownloadsPanelOpen(!downloadsPanelOpen)}>
                                <Download className="w-6 h-6 text-gray-200" />
                                <div className="flex flex-col items-center justify-center bg-transparent w-8 h-8 absolute top-0 right-0">   
                                    <span className="text-grau-200 font-bold text-lg">{Object.keys(previousSessionsFiles).length}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </section>
    );
}