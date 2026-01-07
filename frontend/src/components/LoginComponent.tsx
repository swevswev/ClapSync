import { redirect, useNavigate } from "react-router-dom";
import { useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";

export default function LoginComponent()
{
    const navigate = useNavigate(); 

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const login = async () =>
    {
        if(email === "" && password === "")
            return;
        setLoading(true);

        try
        {
            const res = await fetch("http://localhost:5000/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                  },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Login failed");
                setLoading(false);
                return;
            }

            console.log("SUCCESSFULLY LOGGED IN: ", data.sessionId);
            setLoading(false);
            localStorage.setItem("loggedIn", "true");
            navigate("/");
    
        }
        catch (err)
        {
            setLoading(false);
            setError(true);
        }
        
    }


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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setError(false)}
                        className={`w-full px-4 py-2 border ${error? ("border-red-500") : ("border-gray-300")} text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    />
                    {error && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                        <CircleAlert color="red" size="12"/>
                        <p className="text-red-500 text-xs -mt-0.5"> Login or password is invalid. </p>    
                    </div>}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setError(false)}
                        className={`w-full px-4 py-2 border ${error? ("border-red-500") : ("border-gray-300")} text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    />
                    {error && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                        <CircleAlert color="red" size="12"/>
                        <p className="text-red-500 text-xs -mt-0.5"> Login or password is invalid. </p>    
                    </div>}
                </div>

                {/* forgot password? */}
                <button className="text-blue-800 text-sm -mt-3 cursor-pointer hover:underline">
                    Forgot password?
                </button>

                {/* login button */}
                <button className={`text-white font-semibold h-12 w-full mt-4 mb-2 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-blue-800 ${loading? ("bg-blue-300") : ("bg-blue-700")}`} disabled={loading} onClick={login}>
                    {loading ? (<LoaderCircle className="w-9 h-9 animate-spin"/>) : ("Log in")}
                </button>

                {/* register instead */}
                <div>
                    <span className="text-gray-600 text-sm">
                        Need an account?
                    </span>

                    <button className="text-blue-800 pl-1 text-sm cursor-pointer hover:underline" 
                    onClick={() => navigate("/login?mode=signup")}>
                        Register
                    </button>
                </div>
            </div>
        </section>
    );
}