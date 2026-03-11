
import { useRef } from "react";
import Navbar from "../components/Navbar"
import Hero from "../components/Hero"
import Features from "../components/Features"
import Footer from "../components/Footer";

export default function Home() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  return (
      <div
          ref={scrollContainerRef}
          className="h-screen overflow-y-auto overflow-x-hidden scrollbar-hide bg-gradient-to-br from-slate-900 to-slate-800 text-white"
      >
          <Navbar />
          <Hero scrollContainerRef={scrollContainerRef} />
          <Features />
          <Footer />
      </div>
  );
}
