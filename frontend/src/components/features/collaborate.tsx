import { useMemo, useState, useRef, useCallback } from "react";

const BAR_COUNT = 30;

function getRandomHeights(): number[] {
    return Array.from({ length: BAR_COUNT }, () => Math.random() * 0.85 + 0.15);
}

export default function Collaborate() {
    const [barHeights1, barHeights3] = useMemo(
        () => [getRandomHeights(), getRandomHeights()],
        []
    );

    const [translateX, setTranslateX] = useState(0);
    const dragRef = useRef({ startClientX: 0, startTranslateX: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = { startClientX: e.clientX, startTranslateX: translateX };
    }, [translateX]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (e.buttons !== 1) return;
        const delta = e.clientX - dragRef.current.startClientX;
        setTranslateX(dragRef.current.startTranslateX + delta);
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    return (

        <div className="h-full w-full max-w-6xl flex flex-col space-y-4 items-center justify-start mt-20 cursor-grab -translate-y-4 fade-right-edge"
        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        role="slider"
                        aria-label="Move playhead"
                        tabIndex={0}
        >
            
            {/* notches: full width, independent */}
            <div className="h-4 translate-x-10 w-3xl flex flex-row items-center justify-evenly fade-right-edge">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div key={i} className="h-4 w-[2px] flex-none bg-gray-600" />
                ))}
            </div>

            {/* bars section: vertical line + User A / User B, line aligned with bar start */}
            <div className="relative w-full flex flex-col items-center">
                <div
                    className="relative w-fit flex flex-col space-y-4 items-start"
                    style={{ transform: `translateX(${translateX}px)` }}
                >
                    {/* vertical line: full height of bars block, at left edge of bars, above bars */}
                    <div className="absolute left-[2px] h-70 -top-10 bottom-0 w-[2px] bg-gray-500 z-20" />
                    {/* draggable handle: rectangle at top of line */}
                    <div
                        className="absolute -left-[8px] h-5 -top-14 bottom-0 w-5 bg-gray-500 cursor-grab active:cursor-grabbing select-none touch-none z-30 rounded-sm"
                        
                    />

                    <div className="flex flex-col items-start justify-center space-y-1 pl-1">
                        <div className="relative space-x-2 flex flex-row items-center justify-between">
                            <span className="text-sm font-bold text-gray-400 text-shadow-lg select-none">User A: </span>
                            <span className="text-sm text-green-400 text-shadow-lg select-none">60ms</span>
                        </div>
                        <div className="h-15 w-fit border rounded-md flex items-center justify-center gap-2 px-3 py-1.5 border-gray-700/80 bg-slate-900/70 shadow-lg backdrop-blur-sm">
                            {barHeights1.map((ratio, i) => (
                                <div
                                    key={i}
                                    className="w-1 flex-none rounded-sm bg-slate-700"
                                    style={{ height: `${ratio * 80}%`, minHeight: 2 }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col items-start justify-center space-y-1 pl-1">
                        <div className="relative space-x-2 flex flex-row items-center justify-between">
                            <span className="text-sm font-bold text-gray-400 text-shadow-lg select-none">User B: </span>
                            <span className="text-sm text-red-500 text-shadow-lg select-none">300ms</span>
                        </div>
                        <div className="h-15 w-fitrounded-md flex items-center justify-center gap-2 px-3 py-1.5 border border-gray-700/80 bg-slate-900/70 shadow-lg backdrop-blur-sm">
                            {barHeights3.map((ratio, i) => (
                                <div
                                    key={i}
                                    className="w-1 flex-none rounded-sm bg-slate-700"
                                    style={{ height: `${ratio * 80}%`, minHeight: 2 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}