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

    const handleTestMessage = async () => {
        try {
            await fetch('http://localhost:3000/api/test-message', { method: 'POST' });
        } catch (e) { console.error("Test failed", e); }
    };

    // MUSIC STATE
    const [playlist, setPlaylist] = useState([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5); // Default 50%
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
    const fetchMusic = () => {
        fetch('http://localhost:3000/api/music')
            .then(res => res.json())
            .then(files => {
                if (files && files.length > 0) {
                    setPlaylist(files);
                    // Just update list, don't reset song if playing unless empty
                    if (audioRef.current.paused && audioRef.current.src === "") {
                        audioRef.current.src = 'http://localhost:3000' + files[0];
                    }
                }
            })
            .catch(err => console.error("Music fetch failed", err));
    };

    useEffect(() => {
        fetchMusic();
        audioRef.current.volume = volume;
    }, []);

    const handleOpenMusicFolder = async () => {
        await fetch('http://localhost:3000/api/open-music', { method: 'POST' });
        // Refresh list after a short delay
        setTimeout(fetchMusic, 3000);
    };

    // 3. AUDIO HANDLERS
    useEffect(() => {
        audioRef.current.volume = volume;
    }, [volume]);

    const togglePlay = () => {
        if (playlist.length === 0) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.log("Play error:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const nextSong = () => {
        if (playlist.length === 0) return;
        const nextIdx = (currentSongIndex + 1) % playlist.length;
        playSongAtIndex(nextIdx);
    };

    const prevSong = () => {
        if (playlist.length === 0) return;
        const prevIdx = (currentSongIndex - 1 + playlist.length) % playlist.length;
        playSongAtIndex(prevIdx);
    };

    const playSongAtIndex = (index) => {
        setCurrentSongIndex(index);
        audioRef.current.src = 'http://localhost:3000' + playlist[index];
        if (isPlaying) audioRef.current.play();
    };

    useEffect(() => {
        // Auto-next when song ends (Queue loop)
        const audio = audioRef.current;
        const handleEnded = () => nextSong();
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [playlist, currentSongIndex, isPlaying]);


    return (
        <div className="flex w-full h-screen bg-black overflow-hidden relative font-mono text-cyan-400 select-none">

            {/* LEFT SIDEBAR: INK CONTROLS */}
            <div className="w-64 h-full border-r border-cyan-900/30 bg-black/90 p-4 flex flex-col gap-6 z-[100] backdrop-blur-sm">
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
                        <button
                            onClick={handleTestMessage}
                            className="border border-green-500/50 text-green-500 text-[10px] py-1 hover:bg-green-500/20 transition-colors font-bold"
                        >
                            TEST UPLINK (SEND MSG)
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
            <div className="w-80 h-full border-l border-cyan-900/30 bg-black/90 p-4 flex flex-col gap-6 z-[100] backdrop-blur-sm">

                {/* AUDIO MODULE (Expanded) */}
                <div className="flex flex-col gap-2 border-b border-cyan-900/50 pb-4">
                    <div className="flex justify-between items-center border-b border-cyan-500 pb-1 mb-2">
                        <span className="text-xl font-bold tracking-widest">AUDIO_CORE</span>
                        <button
                            onClick={handleOpenMusicFolder}
                            className="text-[9px] border border-cyan-700 hover:bg-cyan-700/50 px-2 py-0.5 transition"
                            title="Open local music folder"
                        >
                            + INSERT DISC
                        </button>
                    </div>

                    {/* Visualizer */}
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

                    {/* Track Info */}
                    <div className="text-sm truncate font-bold text-white shadow-cyan-500/50 drop-shadow-md">
                        {playlist[currentSongIndex] ? playlist[currentSongIndex].split('/').pop() : 'NO DISC INSERTED'}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                        <button onClick={prevSong} className="flex-1 border border-cyan-500 py-1 hover:bg-cyan-500/20 text-[10px]">
                            PREV
                        </button>
                        <button onClick={togglePlay} className="flex-1 border border-cyan-500 py-1 hover:bg-cyan-500/20 text-[10px] font-bold">
                            {isPlaying ? 'PAUSE' : 'PLAY'}
                        </button>
                        <button onClick={nextSong} className="flex-1 border border-cyan-500 py-1 hover:bg-cyan-500/20 text-[10px]">
                            NEXT
                        </button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-70 w-8">VOL</span>
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-full h-1 bg-cyan-900/50 accent-cyan-500 appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] w-6 text-right">{Math.round(volume * 100)}%</span>
                    </div>
                </div>

                {/* QUEUE LIST (Mini) */}
                <div className="flex flex-col max-h-32 overflow-y-auto mix-blend-screen text-[9px] opacity-70 border-b border-cyan-900/30 pb-2">
                    <span className="mb-1 font-bold opacity-100">QUEUE_SEQUENCE:</span>
                    {playlist.map((track, idx) => (
                        <div
                            key={idx}
                            onClick={() => playSongAtIndex(idx)}
                            className={`cursor-pointer truncate px-1 hover:bg-cyan-500/20 ${currentSongIndex === idx ? 'text-white bg-cyan-500/30' : ''}`}
                        >
                            {idx + 1}. {track.split('/').pop()}
                        </div>
                    ))}
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
