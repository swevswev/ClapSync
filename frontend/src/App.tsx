import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import CookieSettings from "./pages/CookieSettings";
import Login from "./pages/Login";
import AudioTest from "./pages/AudioTest";
import SessionPage from "./pages/SessionPage";
import TestCollaborate from "./pages/TestCollaborate";
import { AuthProvider } from "./contexts/AuthContext";

function ResetPasswordRedirect() {
  const { token } = useParams();
  const location = useLocation();
  
  // Extract token from pathname if params didn't work
  const tokenFromPath = token || location.pathname.replace('/resetPassword/', '').split('?')[0];
  const encodedToken = tokenFromPath ? encodeURIComponent(tokenFromPath) : '';
  
  // Extract email from query params if present
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email');
  const encodedEmail = email ? encodeURIComponent(email) : '';
  
  // Build redirect URL with token and email
  const redirectUrl = email 
    ? `/login?mode=resetPassword&token=${encodedToken}&email=${encodedEmail}`
    : `/login?mode=resetPassword&token=${encodedToken}`;
  
  return <Navigate to={redirectUrl} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookie-settings" element={<CookieSettings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create" element={<AudioTest />} />
        <Route path="/join" element={<AudioTest />} />
        <Route path="/session/:id" element={<SessionPage />} />
        <Route path="/test/collaborate" element={<TestCollaborate />} />
        <Route path="/resetPassword/*" element={<ResetPasswordRedirect />} />
      </Routes>
    </AuthProvider>
  );
}