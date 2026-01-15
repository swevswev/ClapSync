import { Crown, Users } from "lucide-react";
import {useEffect, useState, useRef} from "react";
import {useParams, useLocation} from "react-router-dom";
import SessionComponent from "../components/SessionComponent";

const server = 'replace with name'

export default function SessionPage()
{
    const { id } = useParams();
    const location = useLocation();
    const isOwner = location.state?.isOwner ?? false; 
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);


    //Time syncing:
    let delay = 0;
    let serverTime = 0;
    let clientTime = 0;

    const initializeSessionPage = async () =>
    {
        try
        {

        }
        catch(err)
        {
            
        }
    }

    {/*
    
    useEffect(() =>
        {
            const ws = new WebSocket(`${server}/session/${id}/ws`);
            wsRef.current = ws;
            
            ws.onopen = () =>
            {
                setConnected(true);
            };
    
            ws.onmessage = (event) => 
            {
                const data = JSON.parse(event.data);
                switch(data.type)
                {
                    case "setup":
                        loadSessionData(data);
                        break;
                    case "pong":
                        const currentTime = Date.now();
                        delay = (currentTime - data.clientTime)/2;
                        serverTime = data.time;
                        clientTime = Date.now();
                        break;
                    case "micLevel":
                        updateMicLevel(data.localId, data.level);
                        break;
                    case "startRecording":
                        break;
                }
            };
    
            ws.onclose = () => 
            {
    
            };
    
            //cleanup when new session
            return () =>
            {
                if (ws.readyState === WebSocket.OPEN) 
                {
                    ws.close(1000, "Leaving session");
                }
            };
        }, [id]);
    */}

    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
            <SessionComponent/>
        </div>
        
    );
}


function updateMicLevel(localId, level)
{

}

function loadSessionData(data)
{

}