import logo from "../assets/cat.jpg";

const footerLinks = 
{

}

export default function Footer()
{
    return(
        <footer className="border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
                <div className="pt-6 sm:pt-8 border-t-0 sm:border-t border-slate-800">
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                        <div className="flex gap-6 items-center justify-center ">
                            <div className="flex items-center space-x-4 relative -top-1 group cursor-pointer">
                                <img src={logo} alt="ClapSync" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
                                <span className="text-lg sm:text-xl md:text-2xl font-semibold">
                                    <span className="text-white">Clap</span>
                                    <span className="text-blue-400">Sync</span>
                                </span>
                            </div>

                            <p className="text-gray-400 text-xs sm:text-sm"> © 2025 ClapSync. All rights reserved. </p>
                        </div>
                        <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm leading-none">
                        <a
                            href="#"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="#"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="#"
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                        >
                            Cookie Settings
                        </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}