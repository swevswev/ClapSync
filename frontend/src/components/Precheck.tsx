import { Link, Lock, Undo2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import errorIcon from "../assets/error.png";

interface PrecheckProps {
    onAverageChange?: (average: number) => void;
    audioSessionId?: string;
    mode?: "create" | "join";
}

export default function Precheck({ onAverageChange, audioSessionId, mode }: PrecheckProps)
{
    const navigate = useNavigate();
    const [microphoneAccess, setMicrophoneAccess] = useState(false);
    const [link, setLink] = useState(audioSessionId || "");
    const [echo, setEcho] = useState(false);
    const [inputDevice, setInputDevice] = useState("default");
    const [outputDevice, setOutputDevice] = useState("default");

    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const contextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const bufferLengthRef = useRef<number | null>(null);
    const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const delayNodeRef = useRef<DelayNode | null>(null);
    const echoSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const echoConnectedRef = useRef<boolean>(false);


    useEffect(() => {
        if (audioSessionId) {
            setLink(audioSessionId);
            console.log("audioSessionId: ", audioSessionId);
        }
    }, [audioSessionId]);

    async function getMicrophoneAccess()
    {
        try 
        {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = newStream;

            await getDevices();
            attachStreamListeners();

            if (!contextRef.current) {
                contextRef.current = new AudioContext();
            }
            const context = contextRef.current;

            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }
            sourceRef.current = context.createMediaStreamSource(streamRef.current);

            if (!analyserRef.current) {
                analyserRef.current = context.createAnalyser();
                analyserRef.current.fftSize = 256;
            }
            sourceRef.current?.connect(analyserRef.current);

            bufferLengthRef.current = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLengthRef.current));

            setMicrophoneAccess(true);
            updateVisualizer();
            return true;
        } 
        catch (error) 
        {
            console.error("Error getting microphone access:", error);
            return false;
        }
    }

    function draw() {
        const canvasCtx = canvasCtxRef.current;
        const bufferLength = bufferLengthRef.current;
        const dataArray = dataArrayRef.current;
        if (!canvasCtx || !bufferLength || !dataArray) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        
        canvasCtx.fillStyle = 'rgb(20, 20, 20)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        
        const barWidth = (WIDTH / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            
            canvasCtx.fillStyle = `rgb(50 50 ${barHeight + 100})`;
            canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    function attachStreamListeners()
    {
        const stream = streamRef.current;
        if(!stream) return;
        stream.getAudioTracks().forEach(track =>
        {
            track.onended = () =>
            {
                console.log("Mic disconnected");
                setMicrophoneAccess(false);
                onAverageChange?.(0);
            }
        });
    }

    function toggleEcho()
    {
        const stream = streamRef.current;
        const context = contextRef.current;
        if(!stream || !context) return;
        
        const newEchoState = !echo;
        setEcho(newEchoState);

        console.log("echo: ", newEchoState);

        if (newEchoState) {
            // Turn echo ON
            if (!delayNodeRef.current) {
                delayNodeRef.current = context.createDelay(5);
                delayNodeRef.current.delayTime.value = 0.5; // 300ms delay - adjust as needed
            }
            
            // Always recreate echo source against the latest stream
            if (echoSourceRef.current) {
                echoSourceRef.current.disconnect();
            }
            echoSourceRef.current = context.createMediaStreamSource(stream);
            
            if (!echoConnectedRef.current && delayNodeRef.current) {
                echoSourceRef.current?.connect(delayNodeRef.current);
                delayNodeRef.current.connect(context.destination);
                echoConnectedRef.current = true;
            }
        } else {
            if (delayNodeRef.current && echoSourceRef.current && echoConnectedRef.current) {
                echoSourceRef.current.disconnect();
                delayNodeRef.current.disconnect();
                echoConnectedRef.current = false;
            }
        }
    }

    async function updateVisualizer()
    {
        const stream = streamRef.current;
        const bufferLength = bufferLengthRef.current;
        const dataArray = dataArrayRef.current;
        const analyser = analyserRef.current;
        if (!stream) return;
        if (!bufferLength) return;
        if (!dataArray) return;
        if (!analyser) return;
        
        if (!canvasCtxRef.current && canvasRef.current) 
        {
            canvasCtxRef.current = canvasRef.current.getContext('2d');
        }
        
        const typedArray = dataArray as Uint8Array<ArrayBuffer>;
        analyser.getByteFrequencyData(typedArray);
        const average = typedArray.reduce((a, b) => a + b, 0) / typedArray.length;
        onAverageChange?.(average);
        draw();
        
        requestAnimationFrame(updateVisualizer);
    }


    async function getDevices()
    {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(device => device.kind === 'audioinput');
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        setInputDevices(inputs);
        setOutputDevices(outputs);
    }
    

    async function updateInputDevice(deviceId: string)
    {
        if(streamRef.current)
        {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints =
            deviceId && deviceId !== "default"
                ? { audio: { deviceId: { exact: deviceId } } }
                : { audio: true };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = newStream;
        attachStreamListeners();

        const context = contextRef.current;
        const analyser = analyserRef.current;
        if (context && analyser) 
        {
            if (sourceRef.current) 
            {
                sourceRef.current.disconnect();
            }
            sourceRef.current = context.createMediaStreamSource(newStream);
            sourceRef.current?.connect(analyser);

            if (echo && delayNodeRef.current && echoConnectedRef.current) {
                if (echoSourceRef.current) {
                    echoSourceRef.current.disconnect();
                }
                echoSourceRef.current = context.createMediaStreamSource(newStream);
                echoSourceRef.current?.connect(delayNodeRef.current);
            }
        }
    }

    function updateOutputDevice(deviceId: string)
    {
        console.log("updating output device: ", deviceId);

        const audioElement = document.querySelector('audio');
        if (!audioElement) return;
        try
        {  
            audioElement.setSinkId(deviceId);
            console.log("output device updated: ", deviceId);
        }
        catch (error)
        {
            console.error("Error updating output device: ", error);
        }
    }

    async function ready()
    {
        let sessionId: string;
        console.log("mode: ", mode);
        console.log("link: ", link);
        console.log("audioSessionId: ", audioSessionId);
        
        if (mode === "join") {
            sessionId = link;
        } else {
            sessionId = audioSessionId || link;
        }
        
        if (!sessionId) {
            console.error("No session ID provided");
            return;
        }
        const isOwner = mode === "create";
        navigate(`/session/${sessionId}`, { state: { isOwner } });
    }

    useEffect(() => {
        if (!microphoneAccess) {
            getMicrophoneAccess();
        }
    }, [microphoneAccess]);

    useEffect(() => {
        void updateInputDevice(inputDevice);
    }, [inputDevice]);

    useEffect(() => {
        updateOutputDevice(outputDevice);
    }, [outputDevice]);

    return(
        <section className="relative min-h-screen flex items-center justify-center pt-16 sm:pt-20 px-6 sm:px-8 lg:px-12 overflow-hidden"> 

            <div className= "w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center relative">
                {/*visualizer and buttons*/}
                <div className="w-full max-w-xl mx-auto flex flex-col space-y-3 items-center justify-center">
                    {/* visualizer */}
                    {microphoneAccess ? 
                    (
                        <div className="w-full h-48 bg-gray-800 rounded-lg flex items-center justify-center">
                            <canvas 
                                ref={canvasRef}
                                className="w-full h-full rounded-lg"
                                width={800}
                                height={192}
                            />
                        </div>
                    ) : 
                    (
                        <div onClick={getMicrophoneAccess} className="w-full h-48 bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer">
                        <img src={errorIcon} alt="errorIcon" className="w-25 h-25 object-cover pointer-events-none" />
                        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                            <span className="text-gray-200 font-bold text-center text-2xl pointer-events-none"> Access needed</span>
                            <span className="text-gray-200 text-center text-sm pointer-events-none"> Please grant access to your microphone to continue.</span>
                        </div>
                    </div>
                    )}

                    <div className="w-full h-6 rounded-lg flex flex-row items-center justify-start space-x-3">
                        {/* input device selector */}
                        <div className="w-1/3 h-full border-gray-100/50 border-2 rounded-lg">
                            <select onChange={(e) => setInputDevice(e.target.value)} className="w-full h-full bg-gray-800 text-gray-200 text-start text-xs md:text-sm rounded-lg appearance-auto cursor-pointer pl-1 flex items-center">
                                {inputDevices.map((device) => (
                                    <option className="bg-gray-800 text-gray-200" key={device.deviceId} value={device.deviceId}>{device.label || "Unknown Device"}</option>
                                ))}
                            </select>
                        </div>

                        {/* output device selector */}
                        <div className="w-1/3 h-full border-gray-100/50 border-2 rounded-lg">
                            <select onChange={(e) => setOutputDevice(e.target.value)} className="w-full h-full bg-gray-800 text-gray-200 text-start text-xs md:text-sm rounded-lg appearance-auto cursor-pointer pl-1 flex items-center"> t
                                {outputDevices.map((device) => (
                                    <option className="bg-gray-800 text-gray-200" key={device.deviceId} value={device.deviceId}>{device.label || "Unknown Device"}</option>
                                ))}
                            </select>
                        </div>

                        {/* echo microphone toggle */}
                        <div className="w-auto h-full flex flex-row items-start justify-start space-x-2">
                            <button onClick={toggleEcho} className="w-6 h-6 border-gray-200/50 bg-gray-800 border-2 rounded-lg items-center flex justify-center cursor-pointer"> 
                                {echo ? <div className="w-4.5 h-4.5 rounded-full bg-gray-300" /> : <div className="w-full h-full p-2 rounded-md" />}
                            </button>
                            <span className="text-gray-200 text-center text-xs md:text-sm"> Echo </span>
                        </div>

                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6 mt-12 md:-mt-9 w-auto mx-auto">
                    <span className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-200">  Ready to start? </span>
                    {/* join session link*/}
                    {mode === "join" ? (
                        <div className="rounded-full flex flex-row items-center justify-center w-full mx-5 space-x-3 px-2 py-1.5">
                            <input 
                                type="text" 
                                placeholder="Join Link" 
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 text-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-400" 
                            />
                            <Link className="w-6 h-6 text-gray-300"/>
                        </div>
                    ) : (
                        <div className=" rounded-full flex flex-row items-center justify-center w-full mx-5 space-x-2 px-2 py-1.5">
                            <input type="text" value={link} disabled={true} className="w-full px-3 py-2 border-2 border-gray-300 text-gray-300 rounded-full " />
                            <Lock className="w-6 h-6 text-gray-300"/>
                        </div>
                    )}

                    {/* ready button / go back button*/}
                    <div className="flex flex-row items-center justify-center space-x-3">
                        <button onClick={ready} className="group sm:flex-1 px-12 sm:px-8 py-2 text-white bg-gradient-to-b from-blue-700 to-blue-500 rounded-full font-semibold text-xs sm:text-base transition-all duration-600 hover:scale-102 items-center justify-center">   
                            <span> Ready </span>
                        </button>

                        <a className="flex cursor-pointer" onClick={() => window.location.href = "/"}>   
                            <Undo2 className="w-6 h-6 text-gray-300"/>
                        </a>
                    </div>
                </div>
            </div>
    </section>
    );
}