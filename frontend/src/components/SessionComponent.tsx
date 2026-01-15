import { Copy, Crown, LogOut, Play, Users, Pause, Square } from "lucide-react";
import { useState } from "react";
import waiting from "../assets/waiting.png";

export default function SessionComponent()
{

    const [isOwner, setIsOwner] = useState(true);
    const [isRecording, setIsRecording] = useState(true);

    return(
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-6 sm:px-8 lg:px-12 overflow-hidden"> 
            <div className= "w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center relative">
                {/* Participants Panel */}
                <div className="w-xs h-108 bg-gray-800/50 border-1 border-gray-700 rounded-lg flex flex-col">
                    <div className="flex flex-row items-center justify-center space-x-2 pt-2 px-2 pb-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-white text-lg font-bold">Participants (0/5)</span>
                    </div>
                    {/* Participants list container */}
                    <div className="flex-1 flex flex-col gap-2 px-2 pb-2 overflow-y-auto">
                        {/* Participants dummy data - 5 items */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex-1 bg-gray-700/50 border-1 border-gray-600 rounded min-h-0 flex flex-col justify-center">
                                <div className="flex flex-row items-center justify-start space-x-2 px-1 pt-1 pb-2">
                                    <Crown className="w-3 h-3 text-blue-400" />
                                </div>
                                <div className="bg-red-500 w-[calc(100%-0.5rem)] h-2 rounded-full px-1 mx-1"/>
                            </div>
                        ))}
                    </div>
                </div>


                <div className="w-full max-w-2xl h-full mx-auto flex flex-col space-y-4 items-center justify-center pt-8">

                    {/* Session ID Copy Button */}
                    <div className="w-full h-8 rounded-lg flex flex-row justify-end items-center">
                        <button className="w-fit h-full rounded-lg flex flex-row justify-center items-center space-x-2 px-2 bg-gray-500/50 border-1 border-gray-400">
                            <span className="text-gray-200 text-sm font-medium">Session ID:</span>
                            <span className="text-gray-200 text-sm font-medium underline">asdadiu1</span>
                            <Copy className="w-4 h-4 text-gray-200" />
                        </button>
                    </div>

                    {/* Session Display */}
                    <div className="w-full h-108 bg-gray-800/50 border-1 border-gray-700  rounded-lg flex justify-center items-center">
                        {isRecording ? (
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <span className="text-gray-200 text-4xl font-semibold">Recording: 00:00</span>
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
                            <div className="flex flex-row justify-center items-center space-x-2">
                                <button className="w-12 h-12 rounded-lg flex flex-row justify-center items-center cursor-pointer">
                                    <Play className="w-10 h-10 text-gray-200" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                
                            </div>
                        )}

                        <button className="w-fit px-2 h-12 rounded-lg flex flex-row justify-center items-center bg-red-700/50 border-1 space-x-2 border-red-500">
                            <LogOut className="w-5 h-5 text-gray-200" />
                            <span className="text-gray-200 text-md font-semibold">Exit</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}