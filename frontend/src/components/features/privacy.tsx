import { Lock, MousePointer2 } from "lucide-react";
import { useMemo } from "react";

function generateSessionId(length: number = 10): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

export default function Privacy() {
    const sessionId = useMemo(() => generateSessionId(), []);
    const sessionLink = `https://clapsync.live/session/${sessionId}`;

    return (
        <div className="w-sm max-w-md min-h-[220px] overflow-visible flex justify-center pt-14 pb-6">
            <div className="relative w-full max-w-sm mock-perspective">
                <div className="mock-tilt-left -rotate-1 rounded-2xl border border-gray-700/80 bg-slate-900/80 shadow-xl px-5 py-6">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <span className="text-2xl sm:text-2xl md:text-3xl font-semibold text-gray-100">
                            Ready to start?
                        </span>

                        {/* Mock private session link */}
                        <div className="relative rounded-full flex flex-row items-center justify-center w-full space-x-2 px-3 py-1.5 border border-gray-600/80 bg-slate-950/70">
                            <input
                                type="text"
                                value={sessionLink}
                                disabled
                                className="w-full px-2 py-1 bg-transparent border-none text-xs sm:text-sm text-gray-300 truncate focus:outline-none cursor-default"
                            />
                            <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        </div>

                        {/* Mock ready button */}
                        <button
                            className="relative group px-10 sm:px-8 py-2 text-white bg-gradient-to-b from-blue-900 to-indigo-800 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-blue-900/40"
                        >
                            <span>Ready</span>
                        </button>
                    </div>

                    {/* Animated mouse cursor sweeping over the Ready button */}
                    <div className="pointer-events-none absolute left-6 top-3 animate-mouse-move">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center rotate-6">
                            <MousePointer2 className="w-6 h-6 text-white-900 fill-white shadow-lg shadow-slate-900/70" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

