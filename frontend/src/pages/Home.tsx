import React from "react";
import VoiceRecorder from "../components/VoiceRecorder";

const Home: React.FC = () => {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <VoiceRecorder />
    </main>
  );
};

export default Home;


/*
import { Link } from "react-router-dom";
import Header from "../components/Header"

export default function Home() {
  return (
  <div className="h-screen overflow-y-scroll no-scrollbar">
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#305865] to-[#12171A]">
      <div className="h-1/2 flex items-end justify-center">
        <h1 className="text-6xl font-extralight text-yellow-400 animate-fadeIn">
          Hi john website
        </h1>

        <Link className="bg-amber-700" to="/About">
            
        </Link>
      </div>
    </div>
</div>
    
  );
}
*/