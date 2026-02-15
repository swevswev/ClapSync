import Navbar from "../components/Navbar"
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginComponent from "../components/LoginComponent"
import SignupComponent from "../components/SignupComponent"
import Footer from "../components/Footer";

export default function Login() {
    const [searchParams] = useSearchParams();
    const mode = searchParams.get("mode"); // "signup" or null
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <Navbar />
        {mode === "signup" ? <SignupComponent /> : <LoginComponent />}
      </div>
    );
  }