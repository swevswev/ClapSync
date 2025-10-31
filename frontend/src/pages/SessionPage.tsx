import {useEffect, useState, useRef} from "react";
import {useParams} from "react-router-dom";

const server = 'replace with name'

export default function SessionPage()
{
    const { id } = useParams();
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);


    //Time syncing:
    let delay = 0;
    let serverTime = 0;
    let clientTime = 0;

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
}


function updateMicLevel(localId, level)
{

}

function loadSessionData(data)
{

}