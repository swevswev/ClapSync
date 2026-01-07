import { CircleAlert, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export type SignupError = {
    errorType: "username" | "email" | "password";
    errorMessage: string;
};

export default function SignupComponent()
{
    const navigate = useNavigate(); 

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);

    const [usernameError, setUsernameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const signup = async () =>
    {
        if(email === "" || password === "" || username === "")
            return;
        setLoading(true);
        try
        {
            const res = await fetch("http://localhost:5000/auth/signup",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                  },
                credentials: "include",
                body: JSON.stringify({ username, email, password }),
            });
            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                if (data.errors && Array.isArray(data.errors))
                {
                    data.errors.forEach((err : SignupError) =>
                    {
                        switch (err.errorType)
                        {
                            case "username":
                                setUsernameError(err.errorMessage);
                                break;
                            case "email":
                                setEmailError(err.errorMessage);
                                break;
                            case "password":
                                setPasswordError(err.errorMessage);
                                break;
                            default:
                                setUsernameError(err.errorMessage);
                                setEmailError(err.errorMessage);
                                setPasswordError(err.errorMessage);
                            break;
                        }   
                    });
                }
                return;
            }
            
            console.log("success!!", data.sessionId);
            localStorage.setItem("loggedIn", "true");
            navigate("/");
        }
        catch (err)
        {
            setLoading(false);
            setUsernameError("Username must be between 2-32 characters in length")
            setEmailError("Please use a valid email address")
            setPasswordError("Password does not fit requirements")
        }
    }

    const checkUsername = async() =>
    {
        if(username === "")
            return;
        try
        {
            console.log(username);
            const res = await fetch("http://localhost:5000/auth/checkUsername",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    },
                body: JSON.stringify({ username }),
            });
            const data = await res.json();

            if(data.available)
                setUsernameError("");
            else
                setUsernameError("Username already taken");
        }
        catch (err)
        {
            setUsernameError("Error checking username");
            console.error("Error checking username:", err);
        }
    }

    return(
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden"> 
            <div className="w-full max-w-md mx-auto flex items-start flex-col bg-white p-8 sm:p-10 rounded-2xl animate-in slide-in-from-bottom duration-1500 shadow-lg">

                <h1 className="text-blue-500 font-bold self-center text-2xl">
                    Create An Account
                </h1>

                {/* username */}
                <div className="w-full mb-4">
                    <label htmlFor="username" className="block text-gray-700 mb-2 font-medium">
                        Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        placeholder="coolguy123"
                        value={username}
                        onChange={(e) => {setUsername(e.target.value);}}
                        onBlur={() => checkUsername()}
                        onFocus={() => setUsernameError("")}
                        className={`w-full px-4 py-2 border ${usernameError !== ""? ("border-red-500") : ("border-gray-300")} text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    />
                    {usernameError !== "" && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                        <CircleAlert color="red" size="12"/>
                        <p className="text-red-500 text-xs -mt-0.5">{usernameError}</p>    
                    </div>}
                </div>

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
                        onFocus={() => setEmailError("")}
                        className={`w-full px-4 py-2 border ${emailError !== ""? ("border-red-500") : ("border-gray-300")} text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    />
                    {emailError !== "" && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                        <CircleAlert color="red" size="12"/>
                        <p className="text-red-500 text-xs -mt-0.5">{emailError}</p>    
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
                        onFocus={() => setPasswordError("")}
                        className={`w-full px-4 py-2 border ${passwordError !== ""? ("border-red-500") : ("border-gray-300")} text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    />
                    {passwordError !== "" && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                        <CircleAlert color="red" size="12"/>
                        <p className="text-red-500 text-xs -mt-0.5">{passwordError}</p>    
                    </div>}
                </div>

                {/* terms notice */}
                <p className="text-gray-700 text-xs -mt-3">
                    By clicking "Sign Up", you agree to our{" "}
                    <a href="/terms" className="text-blue-500 hover:underline">
                        Terms of Service
                    </a>
                    {" "}and have read the{" "}
                    <a href="/terms" className="text-blue-500 hover:underline">
                        Privacy Policy
                    </a>
                </p>

                {/* Sign up button */}
                <button className={`text-white font-semibold h-12 w-full mt-4 mb-2 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-blue-800 ${loading? ("bg-blue-300") : ("bg-blue-700")}`} disabled={loading} onClick={signup}>
                    {loading ? (<LoaderCircle className="w-9 h-9 animate-spin"/>) : ("Sign up")}
                </button>

                {/* login instead */}
                <div>
                    <span className="text-gray-600 text-sm">
                        Already have an account? 
                    </span>

                    <button className="text-blue-800 pl-1 text-sm cursor-pointer hover:underline" 
                    onClick={() => navigate("/login")}>
                        Log in
                    </button>
                </div>


            </div>
        </section>
    );
}