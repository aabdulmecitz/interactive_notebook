import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import TabletContainer from './components/TabletContainer';

// Connect to backend
const socket = io('http://localhost:3000');

function App() {
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({ viewers: 0, subscribers: 0 });
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to backend');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('new_message', (msg) => {
            console.log("App received:", msg);
            setMessages((prev) => {
                if (prev.some(m => m.id === msg.id)) return prev;
                const newState = [...prev, msg];
                if (newState.length > 20) return newState.slice(newState.length - 20); // Keep last 20
                return newState;
            });
        });

        socket.on('stats_update', (newStats) => {
            setStats(newStats);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('new_message');
            socket.off('stats_update');
        };
    }, []);

    // Debug Button to inject fake message
    const triggerFakeMessage = () => {
        const fake = {
            id: "debug-" + Date.now(),
            author: "System",
            message: "Debug Message check " + Math.floor(Math.random() * 100),
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, fake]);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-screen bg-black overflow-hidden">
            <TabletContainer
                messages={messages}
                stats={stats}
            />

            {/* Connection Status Indicator (Outside Tablet) - Optional but good for now */}
            <div className="fixed top-4 right-4 z-50 bg-gray-800 p-2 text-white rounded shadow text-sm opacity-50 hover:opacity-100 transition-opacity">
                Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                <button
                    onClick={triggerFakeMessage}
                    className="ml-4 bg-blue-600 px-2 py-1 rounded hover:bg-blue-500 text-xs"
                >
                    Test Msg
                </button>
            </div>
        </div>
    );
}

export default App;
