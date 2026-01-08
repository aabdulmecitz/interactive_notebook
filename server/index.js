const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { LiveChat } = require('youtube-chat');
const axios = require('axios');

const fs = require('fs');
const path = require('path');

// Load config
let config = {};
try {
    config = require('./config.json');
} catch (e) {
    console.log("No config.json found or invalid.");
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for local overlay
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;

// Middleware
app.use(express.json());

// Enable CORS for HTTP
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Serve Static Files (Public)
app.use('/public', express.static(path.join(__dirname, '../public')));

// API: List Music
app.get('/api/music', (req, res) => {
    const musicDir = path.join(__dirname, '../public/music');
    fs.readdir(musicDir, (err, files) => {
        if (err) {
            console.error("Music read error:", err);
            return res.json([]);
        }
        // Filter mp3/wav and map to web paths
        const musicFiles = files
            .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
            .map(f => `/public/music/${f}`);

        res.json(musicFiles);
    });
});

// Socket Connection
io.on('connection', (socket) => {
    console.log('Frontend connected:', socket.id);
    // Send initial state if needed
});

// Global State
let activeLiveChat = null;
let activeStatsInterval = null;

// Helper: Extract Video ID
function extractVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// API: Connect to Stream
app.post('/api/connect', async (req, res) => {
    const { url } = req.body;
    const videoId = extractVideoId(url);

    if (!videoId) {
        return res.status(400).json({ success: false, message: "Invalid YouTube URL" });
    }

    console.log(`Received Connect Request for Video ID: ${videoId}`);

    // Cleanup previous session
    if (activeLiveChat) {
        activeLiveChat.stop();
        activeLiveChat = null;
    }
    if (activeStatsInterval) {
        clearInterval(activeStatsInterval);
        activeStatsInterval = null;
    }

    try {
        // 1. Initialize Chat Listener
        const liveChat = new LiveChat({ channelId: config.channelId || "CHANNEL_ID_FALLBACK", liveId: videoId });

        liveChat.on('start', (liveId) => {
            console.log(`Chat connected to liveId: ${liveId}`);
            io.emit('status', { connected: true, videoId });
        });

        liveChat.on('chat', (chatItem) => {
            const messageData = {
                id: chatItem.id,
                author: chatItem.author.name,
                thumbnail: chatItem.author.thumbnail?.url,
                message: chatItem.message.map(m => m.text).join(''),
                timestamp: new Date().toISOString()
            };
            // console.log(`[CHAT] ${messageData.author}: ${messageData.message}`);
            io.emit('new_message', messageData);
        });

        liveChat.on('error', (err) => {
            console.error("Chat Error:", err);
            io.emit('error', err.message);
        });

        const ok = await liveChat.start();
        if (!ok) {
            return res.status(500).json({ success: false, message: "Failed to connect to chat. Check Video ID." });
        }

        activeLiveChat = liveChat;

        // 2. Start Stats Poller
        activeStatsInterval = setInterval(async () => {
            if (!config.apiKey) return;
            try {
                // Fetch Concurrent Viewers
                const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${config.apiKey}`;
                const vidRes = await axios.get(vidUrl);
                const viewers = vidRes.data.items?.[0]?.liveStreamingDetails?.concurrentViewers || 0;

                // Fetch Subscribers
                let subscribers = 0;
                if (config.channelId) {
                    const chanUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${config.channelId}&key=${config.apiKey}`;
                    const chanRes = await axios.get(chanUrl);
                    subscribers = chanRes.data.items?.[0]?.statistics?.subscriberCount || 0;
                }

                const statsData = {
                    viewers: parseInt(viewers),
                    subscribers: parseInt(subscribers)
                };
                io.emit('stats_update', statsData);

            } catch (err) {
                console.error("Stats Poll Error:", err.message);
            }
        }, 15000);

        res.json({ success: true, message: "Connected successfully", videoId });

    } catch (e) {
        console.error("Connection Exception:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
