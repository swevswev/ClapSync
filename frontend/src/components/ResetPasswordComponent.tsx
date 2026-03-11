import { useState } from "react";
import { API_URL } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { CircleAlert, LoaderCircle } from "lucide-react";

interface ResetPasswordComponentProps {
    token?: string;
    email?: string;
}

export default function ResetPasswordComponent({ token, email: initialEmail }: ResetPasswordComponentProps)
{
    const navigate = useNavigate();
    // Store email in state (from URL or user input)
    const [email, setEmail] = useState(initialEmail || "");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async () => {
        if (!token) {
            setError("Invalid reset link");
            return;
        }

        if (!newPassword || !confirmPassword) {
            setError("Please enter and confirm your new password");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/auth/resetPassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, token, newPassword }),
            });

            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || "Failed to reset password. Please try again.");
                return;
            }
            
            setSuccess(true);
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            setError("Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return(
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden"> 
            <div className="w-full max-w-md mx-auto flex items-start flex-col bg-gray-800/50 border-1 border-gray-700  p-8 sm:p-10 rounded-2xl animate-in slide-in-from-bottom duration-1500 shadow-lg">
                <h1 className="text-blue-100 font-bold self-center text-2xl mb-6">
                    Reset Password
                </h1>
                
                {success ? (
                    <div className="w-full text-center">
                        <p className="text-gray-300 text-semibold mb-4">Password reset successful! Navigating to login...</p>
                        <button 
                            onClick={() => navigate("/login")}
                            className="text-blue-400/90 hover:underline"
                        >
                            Return to login
                        </button>
                    </div>
                ) : (
                    <>
                        {/* email */}
                        <div className="w-full mb-4">
                            <label htmlFor="email" className="block text-gray-300 mb-2 font-medium">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => {setEmail(e.target.value); setError("");}}
                                onFocus={() => setError("")}
                                disabled={!!initialEmail}
                                className={`w-full px-4 py-2 border border-gray-300 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50`}
                            />

                        </div>

                        {/* new password */}
                        <div className="w-full mb-4">
                            <label htmlFor="newPassword" className="block text-gray-300 mb-2 font-medium">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                placeholder="********"
                                value={newPassword}
                                onChange={(e) => {setNewPassword(e.target.value); setError("");}}
                                onFocus={() => setError("")}
                                className={`w-full px-4 py-2 border ${error !== "" ? ("border-red-500") : ("border-gray-300")} text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                            />
                            {error !== "" && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                                <CircleAlert color="red" size="12"/>
                                <p className="text-red-500 text-xs -mt-0.5">{error}</p>    
                            </div>}
                        </div>

                        {/* confirm password */}
                        <div className="w-full mb-4">
                            <label htmlFor="confirmPassword" className="block text-gray-300 mb-2 font-medium">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="********"
                                value={confirmPassword}
                                onChange={(e) => {setConfirmPassword(e.target.value); setError("");}}
                                onFocus={() => setError("")}
                                className={`w-full px-4 py-2 border ${error !== "" ? ("border-red-500") : ("border-gray-300")} text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400`}
                            />
                            {error !== "" && <div className="flex flex-row items-center mt-0.5 space-x-0.5">
                                <CircleAlert color="red" size="12"/>
                                <p className="text-red-500 text-xs -mt-0.5">{error}</p>    
                            </div>}
                        </div>

                        {/* back to login */}
                        <button className="text-blue-400/90 text-sm -mt-2.5 cursor-pointer hover:underline" onClick={() => navigate("/login")}>
                            Return to login
                        </button>


                        {/* reset password button */}
                        <button 
                            className={`text-gray-100 font-semibold h-12 w-full mt-4 mb-2 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-blue-800 ${loading? ("bg-blue-300") : ("bg-blue-600")}`} 
                            disabled={loading} 
                            onClick={handleResetPassword}
                        >
                            {loading ? (<LoaderCircle className="w-9 h-9 animate-spin"/>) : ("Reset Password")}
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}