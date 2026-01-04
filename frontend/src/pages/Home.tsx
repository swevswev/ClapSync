
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar"
import Hero from "../components/Hero"
import Pricing from "../components/Pricing"
import Features from "../components/Features"

export default function Home() {
  return (
      <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
          <Navbar />
          <Hero />
          <Features />
          <Pricing />
      </div>
  );
}
