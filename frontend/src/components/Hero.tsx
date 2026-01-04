import { ChevronRight, CirclePlus } from "lucide-react";
import { useState, useEffect } from "react";

export default function Hero() {
    const [mousePosition, setMousePosition] = useState({x:0, y:0});

    useEffect(() => {
        function handleMouseMovement(e: MouseEvent)
        {
            setMousePosition({x : e.clientX, y : e.clientY});
        }

        window.addEventListener("mousemove", handleMouseMovement);

        return () => window.removeEventListener("mousemove", handleMouseMovement);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden"> 
            <div className="absolute inset-0 opacity-30 animate-pulse" 
            style={{
                background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59,130,246,0.15), transparent 40%)`,
            }} />

            <div className="max-w-7xl mx-auto text-center relative w-full mb-4 sm:mb-6 leading-tight">
                <div className= "max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-1 text-center gap-6 sm:gap-8 lg:gap-12 items-center relative">
                    {/*big top text*/}
                    <h1 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold flex flex-col">
                        <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent block mb-1 sm:mb-2 animate-in slide-in-from-bottom duration-1000">Synchronize Your</span>
                        <span className="pt-8 bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent block mb-1 sm:mb-2 animate-in slide-in-from-bottom duration-1000 delay-200">Audio</span>
                    </h1>
                    {/*description text*/}
                    <p className="text-md sm:text-base lg:text-lg text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8 animate-in slide-in-from-bottom duration-1000 delay-400 leading-relaxed text-center">
                        Record audio sessions from anywhere.
                    </p>
                    {/*buttons*/}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 animate-in slide-in-from-bottom duration-1000 delay-600 w-full max-w-2xl mx-auto">
                        <button className="group w-full sm:flex-1 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-b from-blue-600 to-blue-400 rounded-lg font-semibold text-sm sm:text-base transition-all duration-600 hover:scale-102 flex items-center justify-center space-x-2">   
                            <span> Create a Session </span>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300"/>
                        </button>

                        <button className="group w-full sm:flex-1 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-b from-blue-700 to-blue-500 rounded-lg font-semibold text-sm sm:text-base transition-all duration-600 hover:scale-102 flex items-center justify-center space-x-2">   
                            <span> Join a Session </span>
                            <CirclePlus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 duration-300"/>
                        </button>
                    </div>
                </div>
            </div>

        </section>
    );
}