import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import TabletContainer from './components/TabletContainer';

// Connect to backend
const socket = io('http://localhost:3000');

function App() {
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({ viewers: 0, subscribers: 0 });
    const [isConnected, setIsConnected] = useState(false);

    // CONNECTION STATE
    const [youtubeLink, setYoutubeLink] = useState('');
    const [connectStatus, setConnectStatus] = useState('idle'); // idle, connecting, connected, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleConnect = async () => {
        if (!youtubeLink) return;
        setConnectStatus('connecting');
        setErrorMessage('');
        try {
            const res = await fetch('http://localhost:3000/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: youtubeLink })
            });
            const data = await res.json();
            if (data.success) {
                setConnectStatus('connected');
            } else {
                setConnectStatus('error');
                setErrorMessage(data.message || "Connection Refused");
                console.error(data.message);
            }
        } catch (e) {
            setConnectStatus('error');
            setErrorMessage(e.message || "Network Error");
            console.error(e);
        }
    };

    // MUSIC STATE
    const [playlist, setPlaylist] = useState([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(new Audio());

    // INK STATE
    const [inkSettings, setInkSettings] = useState({
        wet: '#ffffff',
        dry: '#00f3ff'
    });

    // 1. SOCKET INIT
    useEffect(() => {
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('new_message', (msg) => {
            setMessages((prev) => {
                if (prev.some(m => m.id === msg.id)) return prev;
                const newState = [...prev, msg];
                if (newState.length > 20) return newState.slice(newState.length - 20);
                return newState;
            });
        });
        socket.on('stats_update', (newStats) => setStats(newStats));

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('new_message');
            socket.off('stats_update');
        };
    }, []);

    // 2. FETCH MUSIC
    useEffect(() => {
        fetch('http://localhost:3000/api/music')
            .then(res => res.json())
            .then(files => {
                if (files && files.length > 0) {
                    setPlaylist(files);
                    // Prepare first song but don't auto-play to avoid browser policy
                    audioRef.current.src = 'http://localhost:3000' + files[0];
                }
            })
            .catch(err => console.error("Music fetch failed", err));
    }, []);

    // 3. AUDIO HANDLERS
    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.log("Play error:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const nextSong = () => {
        const nextIdx = (currentSongIndex + 1) % playlist.length;
        setCurrentSongIndex(nextIdx);
        audioRef.current.src = 'http://localhost:3000' + playlist[nextIdx];
        if (isPlaying) audioRef.current.play();
    };

    useEffect(() => {
        // Auto-next when song ends
        const audio = audioRef.current;
        const handleEnded = () => nextSong();
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [playlist, currentSongIndex, isPlaying]);


    return (
        <div className="flex w-full h-screen bg-black overflow-hidden relative font-mono text-cyan-400">

            {/* LEFT SIDEBAR: INK CONTROLS */}
            <div className="w-64 h-full border-r border-cyan-900/30 bg-black/90 p-4 flex flex-col gap-8 z-10 backdrop-blur-sm">
                <div className="text-xl font-bold tracking-widest border-b border-cyan-500 pb-2">SYS_CONFIG</div>

                {/* CONNECTION MODULE */}
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] opacity-70">UPLINK_TARGET (YouTube URL)</span>
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            value={youtubeLink}
                            onChange={(e) => setYoutubeLink(e.target.value)}
                            placeholder="https://youtube.com/live/..."
                            className="bg-cyan-900/10 border border-cyan-500/50 text-xs p-1 text-cyan-300 outline-none focus:border-cyan-400"
                        />
                        <button
                            onClick={handleConnect}
                            disabled={connectStatus === 'connecting'}
                            className={`border border-cyan-500 text-xs py-1 hover:bg-cyan-500/20 transition-colors font-bold ${connectStatus === 'connected' ? 'bg-cyan-500/20 text-white' : ''}`}
                        >
                            {connectStatus === 'connecting' ? 'ESTABLISHING...' : connectStatus === 'connected' ? 'LINK ACTIVE' : 'INITIALIZE LINK'}
                        </button>
                        {connectStatus === 'error' && <span className="text-[9px] text-red-500 leading-tight uppercase font-bold text-center mt-1 border border-red-900/50 bg-red-900/10 p-1">{errorMessage}</span>}
                    </div>
                </div>

                <div className="h-px w-full bg-cyan-900/30"></div>

                <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs opacity-70">WET INK COLOR</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={inkSettings.wet}
                                onChange={(e) => setInkSettings({ ...inkSettings, wet: e.target.value })}
                                className="w-8 h-8 bg-transparent border border-cyan-500/50 cursor-pointer"
                            />
                            <span className="text-xs">{inkSettings.wet}</span>
                        </div>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs opacity-70">DRY INK COLOR</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={inkSettings.dry}
                                onChange={(e) => setInkSettings({ ...inkSettings, dry: e.target.value })}
                                className="w-8 h-8 bg-transparent border border-cyan-500/50 cursor-pointer"
                            />
                            <span className="text-xs">{inkSettings.dry}</span>
                        </div>
                    </label>
                </div>

                <div className="h-px w-full bg-cyan-900/30"></div>

                {/* NETWORK METRICS */}
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] opacity-70">NETWORK_METRICS</span>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-cyan-900/10 border border-cyan-500/30 p-2 flex flex-col items-center">
                            <span className="text-[8px] tracking-widest opacity-60">VIEWERS</span>
                            <span className="text-xl font-bold text-white">{stats.viewers}</span>
                        </div>
                        <div className="bg-cyan-900/10 border border-cyan-500/30 p-2 flex flex-col items-center">
                            <span className="text-[8px] tracking-widest opacity-60">SUBS</span>
                            <span className="text-xl font-bold text-white">{stats.subscribers}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto text-[10px] opacity-40">
                    STATUS: {isConnected ? "ONLINE" : "OFFLINE"} <br />
                    SYSTEM ID: HK-42
                </div>
            </div>

            {/* CENTER: TABLET */}
            <div className="flex-1 flex items-center justify-center relative bg-gradient-to-b from-gray-900 to-black">
                {/* Optional decorative grid or particles could go here */}
                <TabletContainer
                    messages={messages}
                    stats={stats}
                    inkSettings={inkSettings}
                />
            </div>

            {/* RIGHT SIDEBAR: MUSIC PLAYER & CHAT LOG */}
            <div className="w-80 h-full border-l border-cyan-900/30 bg-black/90 p-4 flex flex-col gap-4 z-10 backdrop-blur-sm">

                {/* AUDIO MODULE (Compact) */}
                <div className="flex flex-col gap-2 border-b border-cyan-900/50 pb-4">
                    <div className="text-xl font-bold tracking-widest border-b border-cyan-500 pb-1 mb-2">AUDIO_CORE</div>

                    <div className="h-12 w-full bg-cyan-900/10 flex items-end justify-between px-1 gap-1">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-cyan-500/80 w-full"
                                style={{
                                    height: isPlaying ? `${Math.random() * 100}%` : '5%',
                                    transition: 'height 0.1s ease'
                                }}
                            ></div>
                        ))}
                    </div>

                    <div className="text-sm truncate font-bold text-white shadow-cyan-500/50 drop-shadow-md">
                        {playlist[currentSongIndex] ? playlist[currentSongIndex].split('/').pop() : 'NO DISC INSERTED'}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={togglePlay} className="flex-1 border border-cyan-500 py-1 hover:bg-cyan-500/20 text-[10px]">
                            {isPlaying ? 'PAUSE' : 'PLAY'}
                        </button>
                        <button onClick={nextSong} className="flex-1 border border-cyan-500 py-1 hover:bg-cyan-500/20 text-[10px]">
                            SKIP_TRACK
                        </button>
                    </div>
                </div>

                {/* LIVE DATA STREAM (Raw Chat) */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="text-sm font-bold tracking-widest border-b border-cyan-500 pb-1 mb-2 text-cyan-200">DATA_STREAM ({messages.length})</div>
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-black scrollbar-thumb-cyan-900 font-mono text-[10px] space-y-1">
                        {messages.length === 0 && <div className="opacity-30 italic">WAITING FOR PACKETS...</div>}
                        {messages.slice().reverse().map((msg) => (
                            <div key={msg.id} className="border-l-2 border-cyan-800 pl-2 py-1 bg-cyan-900/5 hover:bg-cyan-500/10">
                                <div className="flex justify-between opacity-50 text-[9px]">
                                    <span>{msg.author}</span>
                                    <span>{msg.timestamp.split('T')[1].split('.')[0]}</span>
                                </div>
                                <div className="text-cyan-100 opacity-80 break-words leading-tight">{msg.message}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}

export default App;
