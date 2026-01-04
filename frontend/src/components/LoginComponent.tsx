import { useNavigate } from "react-router-dom";

export default function LoginComponent()
{
    const navigate = useNavigate(); 

    return(
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden"> 
            <div className="w-full max-w-md mx-auto flex items-start flex-col bg-white p-8 sm:p-10 rounded-2xl animate-in slide-in-from-bottom duration-1500 shadow-lg">
                <h1 className="text-blue-500 font-bold self-center text-2xl">
                    Welcome Back!
                </h1>

                {/* email */}
                <div className="w-full mb-4">
                    <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* password */}
                <div className="w-full mb-4">
                    <label htmlFor="password" className="block text-gray-700 mb-2 font-medium">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        placeholder="********"
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* forgot password? */}
                <button className="text-blue-800 text-sm -mt-3">
                    Forgot password?
                </button>

                {/* login button */}
                <button className="bg-blue-900 text-white font-semibold h-12 w-full mt-4 mb-2 rounded-xl">
                    Log In
                </button>

                {/* register instead */}
                <div>
                    <span className="text-gray-600 text-sm">
                        Need an account?
                    </span>

                    <button className="text-blue-800 pl-1 text-sm" 
                    onClick={() => navigate("/login?mode=signup")}>
                        Register
                    </button>
                </div>
            </div>
        </section>
    );
}