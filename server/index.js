const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { LiveChat } = require('youtube-chat');
const axios = require('axios');
const readline = require('readline');
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

// Socket Connection
io.on('connection', (socket) => {
    console.log('Frontend connected:', socket.id);
    // Send initial state if needed
});

// Helper: Extract Video ID
function extractVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Start CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function start() {
    rl.question('Enter YouTube Live Stream Link: ', async (link) => {
        const videoId = extractVideoId(link);

        if (!videoId) {
            console.log('Invalid Link! Try again.');
            start(); // Retry
            return;
        }

        console.log(`Video ID detected: ${videoId}. Starting listeners...`);

        // 1. Chat Listener
        const liveChat = new LiveChat({ channelId: config.channelId || "CHANNEL_ID_FALLBACK", liveId: videoId });

        liveChat.on('start', (liveId) => {
            console.log(`Chat connected to liveId: ${liveId}`);
        });

        liveChat.on('chat', (chatItem) => {
            // Emit strictly what frontend needs
            const messageData = {
                id: chatItem.id,
                author: chatItem.author.name,
                thumbnail: chatItem.author.thumbnail?.url,
                message: chatItem.message.map(m => m.text).join(''), // Simple text extraction
                timestamp: new Date().toISOString()
            };

            console.log(`[CHAT] ${messageData.author}: ${messageData.message}`);
            io.emit('new_message', messageData);
        });

        liveChat.on('error', (err) => {
            console.error("Chat Error:", err);
        });

        const ok = await liveChat.start();
        if (!ok) {
            console.log("Failed to start chat listener. Check Video ID/Channel ID.");
        }

        // 2. Stats Poller (Subs, Viewers)
        // Note: 'viewers' usually requires polling the video details or liveStreamDetails
        // 'subscribers' requires channel details.

        setInterval(async () => {
            if (!config.apiKey) return;

            try {
                // Fetch Concurrent Viewers (Video Endpoint)
                const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${config.apiKey}`;
                const vidRes = await axios.get(vidUrl);
                const viewers = vidRes.data.items?.[0]?.liveStreamingDetails?.concurrentViewers || 0;

                // Fetch Subscribers (Channel Endpoint)
                // If config.channelId isn't set, we might need to fetch it from the video first, but let's assume config has it or we skip.
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

                // console.log('[STATS]', statsData);
                io.emit('stats_update', statsData);

            } catch (err) {
                console.error("Stats Poll Error:", err.message);
            }
        }, 15000); // 15s

    });
}

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    start();
});
