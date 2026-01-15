import Precheck from "../components/Precheck"
import Particles from "../components/Particles"
import { useState } from "react";
import { useLocation } from "react-router-dom";


export default function AudioTest() {
  const [average, setAverage] = useState(0);
  const location = useLocation();
  const audioSessionId = location.state?.audioSessionId;
  const mode = location.state?.mode;

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
        <Particles average={average} />
        <Precheck onAverageChange={setAverage} audioSessionId={audioSessionId} mode={mode} />
    </div>
  );
}