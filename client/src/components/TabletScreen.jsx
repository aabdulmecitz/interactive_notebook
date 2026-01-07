import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove }) => {
    const [queue, setQueue] = useState([]);
    const [completedLines, setCompletedLines] = useState([]);
    const [typingLine, setTypingLine] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const lastMsgIdRef = useRef(null);
    const cursorRef = useRef(null);
    const bottomRef = useRef(null);

    // 0. INITIAL STARTUP MESSAGE 
    useEffect(() => {
        setQueue([{
            id: 'init',
            message: 'SYSTEM ONLINE... WAITING FOR INPUT...'
        }]);
    }, []);

    // 1. Queue Management
    useEffect(() => {
        if (!messages || messages.length === 0) return;
        const latestMsg = messages[messages.length - 1];
        if (lastMsgIdRef.current === latestMsg.id) return;
        lastMsgIdRef.current = latestMsg.id;

        setQueue(prev => [...prev, latestMsg]);
    }, [messages]);

    // 2. Typewriter Logic
    useEffect(() => {
        if (isTyping || queue.length === 0) return;

        setIsTyping(true);
        const nextItem = queue[0];
        const textToType = nextItem.message || "";

        if (!textToType) {
            setQueue(prev => prev.slice(1));
            setIsTyping(false);
            return;
        }

        let charIndex = 0;
        const speed = 50;

        const interval = setInterval(() => {
            const currentText = textToType.slice(0, charIndex + 1);
            setTypingLine(currentText);
            charIndex++;

            if (charIndex > textToType.length) {
                clearInterval(interval);
                setCompletedLines(prev => {
                    const newHistory = [...prev, textToType];
                    if (newHistory.length > 12) return newHistory.slice(newHistory.length - 12);
                    return newHistory;
                });
                setTypingLine('');
                setQueue(prev => prev.slice(1));
                setIsTyping(false);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [queue, isTyping]);


    // 3. Pen Tracking
    useEffect(() => {
        if (!cursorRef.current || !onPenMove) return;

        const rect = cursorRef.current.getBoundingClientRect();

        // OFFSETS FOR LARGE HAND (w-[1500px])
        const offsetX = -150;
        const offsetY = -600;

        onPenMove({
            x: rect.left + offsetX,
            y: rect.top + offsetY,
            isHidden: false
        });

    }, [typingLine]);

    // DIRECT RENDER DEBUG MODE
    return (
        <div className="w-full h-full bg-red-500/10 p-10 font-mono text-green-400 font-bold text-4xl overflow-y-auto z-50 relative">
            <h2 className="border-b border-green-500 mb-4">DEBUG MODE: NO ANIMATION</h2>

            {/* STATIC CHECK */}
            <div className="bg-white text-black p-2 mb-4">
                IF YOU SEE THIS, RENDER IS OK.
            </div>

            {/* RAW MESSAGES */}
            <div className="space-y-4">
                {messages.length === 0 && <p>No messages received yet...</p>}

                {messages.map((m, i) => (
                    <div key={i} className="border-l-4 border-green-500 pl-4">
                        {m.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
/*
  // COMMENTED OUT LOGIC FOR DEBUGGING
  // ... (keep logic here but commented if needed, or just let it run in bg since return is replaced)
  // Logic still runs but doesn't render. 
*/
export default TabletScreen;
