import Navbar from "../components/Navbar"
import { useLocation } from "react-router-dom";
import LoginComponent from "../components/LoginComponent"
import SignupComponent from "../components/SignupComponent"
import Footer from "../components/Footer";
import ResetPasswordComponent from "../components/ResetPasswordComponent";

export default function Login() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get("mode"); // "signup", "resetPassword", or null
    const token = searchParams.get("token"); // reset password token
    const email = searchParams.get("email"); // user email from reset link
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <Navbar />
        {mode === "signup" ? <SignupComponent /> : mode === "resetPassword" ? <ResetPasswordComponent token={token || undefined} email={email || undefined} /> : <LoginComponent />}
        <Footer />
      </div>
    );
  }