import Navbar from "../components/Navbar"
import AboutComponent from "../components/AboutComponent"

export default function About() {
  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
          <Navbar />
          <AboutComponent />
    </div>
  );
}