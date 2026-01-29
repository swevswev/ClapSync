import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import AudioTest from "./pages/AudioTest";
import SessionPage from "./pages/SessionPage";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create" element={<AudioTest />} />
        <Route path="/join" element={<AudioTest />} />
        <Route path="/session/:id" element={<SessionPage />} />
      </Routes>
    </AuthProvider>
  );
}