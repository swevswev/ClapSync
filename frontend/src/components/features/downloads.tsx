import { ArrowDownToLine } from "lucide-react";
import { useEffect, useState } from "react";

type MockDownload = {
    name: string;
    duration: string;
    size: string;
};

const mockDownloads: MockDownload[] = [
    {
        name: "Session-2026-03-05_Vocals.webm",
        duration: "00:04:31",
        size: "42.1 MB",
    },
    {
        name: "Session-2026-03-03_Podcast-John.webm",
        duration: "00:45:12",
        size: "2.3 MB",
    },
    {
        name: "Session-2026-03-03_Podcast-Jane.webm",
        duration: "00:45:12",
        size: "2.4 GB",
    },
];

export default function Downloads() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            if (typeof window !== "undefined") {
                setIsMobile(window.innerWidth < 768);
            }
        };

        checkIsMobile();
        window.addEventListener("resize", checkIsMobile);

        return () => {
            window.removeEventListener("resize", checkIsMobile);
        };
    }, []);

    return (
        <div className="w-sm max-w-md h-full overflow-visible flex justify-center px-10 md:px-0">
            {/* Overlapping cards */}
            <div className="relative h-[250px] w-full flex justify-center mt-10 md:mt-4">
                {mockDownloads.map((file, index) => {
                    const topOffset = isMobile ? 30 + index * 50 : 30 + index * 48;
                    const baseLeftOffset = index * 30;
                    const leftOffset = isMobile ? baseLeftOffset - 30 : baseLeftOffset - 80;
                    const zIndex = 10 + index;
                    return (
                        <div
                            key={index}
                            className="absolute w-full max-w-sm h-20 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-700/80 bg-slate-900/70 shadow-lg backdrop-blur-sm opacity-60 hover:opacity-100 hover:border-blue-400/70 hover:shadow-[0_18px_40px_rgba(15,23,42,0.9)] hover:-translate-y-2 transition-all duration-200 group"
                            style={{ top: `${topOffset}px`, left: `${leftOffset}px`, zIndex }}
                        >
                            <div className="flex flex-col items-start justify-center gap-3 flex-1 min-w-0">
                                <span
                                    className="text-gray-100 text-sm font-medium truncate"
                                    title={file.name}
                                >
                                    {file.name}
                                </span>
                                <div className="flex flex-row items-center gap-3 text-[11px] text-gray-300/80">
                                    <span className="whitespace-nowrap">
                                        Duration:{" "}
                                        <span className="font-semibold text-gray-100">
                                            {file.duration}
                                        </span>
                                    </span>
                                    <span className="whitespace-nowrap">
                                        Size:{" "}
                                        <span className="font-semibold text-gray-100">
                                            {file.size}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <ArrowDownToLine className="w-6 h-6 text-gray-200 opacity-70 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 pointer-events-none" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

