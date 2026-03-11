import { Crown, Mic, MicOff, SignalHigh, SignalLow, SignalMedium, SignalZero, Users } from "lucide-react";
import { useEffect, useState } from "react";

type MockParticipant = {
    id: string;
    name: string;
    isOwner?: boolean;
    muted?: boolean;
    level: number; // 0–1
    pingMs?: number;
};

const participants: MockParticipant[] = [
    { id: "director", name: "Director", isOwner: true, muted: false, level: 0.8, pingMs: 24 },
    { id: "collab-1", name: "Collaborator", muted: false, level: 0.6, pingMs: 42 },
    { id: "collab-2", name: "Collaborator", muted: false, level: 0.4, pingMs: 85 },
    { id: "collab-3", name: "Collaborator", muted: true, level: 0.0, pingMs: 160 },
];

const delayClasses = ["delay-600", "delay-800", "delay-1000", "delay-1200"];

function getSignalIcon(pingMs: number | undefined) {
    const safePing = Number.isFinite(pingMs) ? (pingMs as number) : Number.POSITIVE_INFINITY;

    if (safePing < 50) return { Icon: SignalHigh, className: "text-green-400" };
    if (safePing < 150) return { Icon: SignalMedium, className: "text-yellow-400" };
    if (safePing < 300) return { Icon: SignalLow, className: "text-orange-400" };
    return { Icon: SignalZero, className: "text-red-500" };
}

function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function SessionMock({ embedded = false }: { embedded?: boolean }) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        setElapsedSeconds(0);
        const interval = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className={embedded ? "w-full -translate-y-10 md:translate-y-0 scale-[.8] md:scale-[1.2]" : "w-full flex justify-center scale-[1.2]"}>
            <div className={embedded ? "w-full mock-perspective" : "w-full max-w-6xl mock-perspective"}>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] gap-8 mock-tilt-left -rotate-1">
                    {/* Participants panel */}
                    <div className="bg-gray-800/60 border-1 border-gray-700 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-top-right duration-1000 delay-200">
                        <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-gray-700/70">
                            <div className="flex flex-row items-center space-x-2 animate-in slide-in-from-top-right duration-1000 delay-400">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-white text-sm font-semibold tracking-wide">
                                    Participants ({participants.length}/5)
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 px-3 py-3 flex flex-col gap-3">
                        {participants.map((p, index) => {
                            const delayClass = delayClasses[index] ?? "delay-600";
                            const { Icon, className } = getSignalIcon(p.pingMs);

                            return (
                                <div
                                    key={p.id}
                                    className={`h-16 bg-gray-700/60 border-1 border-gray-600 rounded-lg flex flex-col justify-between animate-in slide-in-from-top-right duration-700 ${delayClass}`}
                                >
                                    <div className="flex flex-row items-center justify-between px-2 pt-1.5 pb-1">
                                        <div className="flex flex-row items-center space-x-2">
                                            {p.isOwner && <Crown className="w-4 h-4 text-blue-400" />}
                                            <span className="text-gray-200 text-sm font-semibold">{p.name}</span>
                                        </div>
                                        <div className="flex flex-row items-center space-x-1.5">
                                            <Icon className={`w-4 h-4 ${className}`} />
                                            {p.muted ? (
                                                <MicOff className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <Mic className="w-4 h-4 text-gray-300" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative w-[calc(100%-0.5rem)] h-4 mx-1 mb-1.5">
                                        <div className="absolute inset-0 bg-gray-900 rounded-lg" />
                                        <div
                                            className="absolute inset-y-0 left-0 bg-slate-400 rounded-lg transition-all duration-150"
                                            style={{ width: `${p.muted ? 0 : p.level * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>

                    {/* Main session display (recording UI only, static time) */}
                    <div className="hidden sm:flex bg-gray-800/60 border-1 h-25 sm:h-full border-gray-700 rounded-xl shadow-xl items-center justify-center animate-in slide-in-from-top-right duration-1000 delay-400">
                        <div className="flex flex-row justify-center items-center space-x-2">
                            <span className="text-gray-200 text-6xl font-semibold tracking-[0.05em] tabular-nums animate-in slide-in-from-top-right duration-1000 delay-1400">
                                {formatElapsed(elapsedSeconds)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
