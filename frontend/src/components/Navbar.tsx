import { Menu, X } from "lucide-react";
import logo from "../assets/cat.jpg";
import { useState } from "react";


export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-slate-900/20 backdrop-blur-sm">
      <div className="flex justify-between items-center h-14 sm:h-16 md:h-20 pl-4 sm:pl-6 lg:pl-8 pr-4 sm:pr-6 lg:pr-8">

        {/** logo side */}
        <div className="flex items-center space-x-4 group cursor-pointer">
          <img src={logo} alt="ClapSync" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
          <span className="text-lg sm:text-xl md:text-2xl font-semibold">
            <span className="text-white">Clap</span>
            <span className="text-blue-400">Sync</span>
          </span>
        </div>

        {/** links side */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          <a href="#features" className="text-gray-300 hover:text-white text-sm lg:text-base"
            >Features
          </a>
          <a href="#about" className="text-gray-300 hover:text-white text-sm lg:text-base"
            >About Us
          </a>
          <a href="#pricing" className="text-gray-300 hover:text-white text-sm lg:text-base"
            >Pricing
          </a>
        </div>

        <button className="md:hidden p-2 text-gray-300 hover:text-white"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? (<X className="w-5 h-5 sm:w-6 sm:h-6" />) : (<Menu className="w-5 h-5 sm:w-6 sm:h-6" />)}
        </button>

      </div>

      {/* mobile menu */}
      {mobileMenuOpen && 
      <div className = "md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-white animate-in slide-in-from-top duration-300"> 
        <div className= "px-4 py-4 sm:py-6 space-y-3 sm:space-y-4"> 
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className=" block text-gray-300 hover:text-white text-sm lg:text-base"
            >Features
          </a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-white text-sm lg:text-base"
            >About Us
          </a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-gray-300 hover:text-white text-sm lg:text-base"
            >Pricing
          </a>
        </div>
      </div>}
      

    </nav>
  );
};
