import React, { useState, useRef } from "react";

const VoiceRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadRecording =  async () =>
  {
    if (isRecording || !audioURL) return;
    try
    {
      const response = await fetch(audioURL);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const uploadResponse = await fetch("http://localhost:5000/upload", 
      {
      method: "POST",
      body: formData,
      });

      if (!uploadResponse.ok) {
      throw new Error("Upload failed");
    }

      const data = await uploadResponse.json();
      console.log("Upload successful:", data);
    }
    catch(err)
    {
      console.error("File upload error:", err);
      alert("Error when uploading audio file");
    }
  }

  const startSession = async() => 
  {

    const uploadResponse = await fetch("http://localhost:5000/createSession", 
    {
      method: "POST",
      credentials: "include",
      headers: 
        {
      "Content-Type": "application/json",
        },
    })

    if (!uploadResponse.ok) {
      throw new Error("Create session failed");
    }

      const data = await uploadResponse.json();
      console.log("create session successful:", data);

      const sessionId = data.sessionId;
    if (!sessionId) {
      throw new Error("No sessionId returned from server");
    }

    // Now connect to the WebSocket for this session
    const socket = new WebSocket(`ws://localhost:5000/session/${sessionId}/ws`);

    socket.onopen = () => {
      console.log("🔌 Connected to session WebSocket!");

      socket.send(JSON.stringify({type: "ping", clientTime: Date.now()}))
    };

    socket.onmessage = (event) => 
    {
       const data = JSON.parse(event.data);

      if (data.type === "pong") {
        console.log("📡 Received ping from server:", data);
      }
    }
  }

const joinSession = async() => 
  {

    const uploadResponse = await fetch("http://localhost:5000/joinSession", 
    {
      method: "POST",
      credentials: "include",
      headers: 
        {
      "Content-Type": "application/json",
        },
    })

    if (!uploadResponse.ok) {
      throw new Error("Join session failed");
    }

      const data = await uploadResponse.json();
      console.log("Join session successful:", data);
  }


  return (
    <div className="flex flex-col items-center bg-gray-900 text-white min-h-screen justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-md flex flex-col items-center space-y-6">
        <h2 className="text-2xl font-bold">🎙 Voice Recorder</h2>

        <div className="flex gap-4">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              isRecording
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            Start
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              !isRecording
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            Stop
          </button>
        </div>

        {audioURL && (
          <div className="w-full text-center">
            <p className="text-sm text-gray-300 mb-2">Your Recording:</p>
            <audio controls src={audioURL} className="w-full rounded-lg" />
            <button
              onClick={uploadRecording}
              className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              Upload
            </button>
          </div>
        )}

        <button onClick = {startSession} className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"> create session </button>
        <button onClick = {joinSession} className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"> join session </button>
      </div>
    </div>
  );
};

export default VoiceRecorder;

