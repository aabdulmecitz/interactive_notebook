import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove }) => {
    const [queue, setQueue] = useState([]);
    const [completedLines, setCompletedLines] = useState([]);

    // Active Typing State
    const [currentMessage, setCurrentMessage] = useState(null);
    const [typingLine, setTypingLine] = useState('');

    const lastMsgIdRef = useRef(null);
    const cursorRef = useRef(null);
    const bottomRef = useRef(null);
    const containerRef = useRef(null);

    // 0. INITIAL STARTUP MESSAGE 
    useEffect(() => {
        setQueue([{
            id: 'init',
            message: 'SYSTEM ONLINE... CONNECTED.'
        }]);
    }, []);

    // 1. INGESTION
    useEffect(() => {
        if (!messages || messages.length === 0) return;
        const latestMsg = messages[messages.length - 1];
        if (lastMsgIdRef.current === latestMsg.id) return;
        lastMsgIdRef.current = latestMsg.id;
        setQueue(prev => [...prev, latestMsg]);
    }, [messages]);

    // 2. DISPATCHER
    useEffect(() => {
        if (!currentMessage && queue.length > 0) {
            const next = queue[0];
            setQueue(prev => prev.slice(1));
            setCurrentMessage(next);
        }
    }, [queue, currentMessage]);

    // 3. ANIMATOR
    useEffect(() => {
        if (!currentMessage) return;

        const textToType = currentMessage.message || "";
        let charIndex = 0;
        const speed = 75;

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
                setCurrentMessage(null);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [currentMessage]);

    // 4. PEN TRACKING (FINAL CALIBRATION + PARKING)
    useEffect(() => {
        // USER PROVIDED CALIBRATION (X: 5, Y: -160)
        const calX = 5;
        const calY = -160;

        if (!currentMessage) {
            // IDLE / PARKING STATE
            if (containerRef.current && onPenMove) {
                // Move completely off-screen to the right
                onPenMove({
                    x: window.innerWidth + 200,
                    y: window.innerHeight / 2,
                    isHidden: false
                });
            }
            return;
        }

        // TYPING STATE
        if (!cursorRef.current || !onPenMove) return;
        const rect = cursorRef.current.getBoundingClientRect();

        onPenMove({
            x: rect.left + calX,
            y: rect.top + calY,
            isHidden: false
        });
    }, [typingLine, currentMessage, onPenMove]); // Depend on currentMessage too

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [completedLines, typingLine]);

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-start px-2 py-2 font-mono relative">
            <style>{`
            .text-neon-green {
                color: #00ff41;
                text-shadow: 0 0 10px rgba(0, 255, 65, 0.6);
            }
        `}</style>

            <div className="flex-1 overflow-hidden flex flex-col justify-start pt-1 text-green-400 text-neon-green">
                {completedLines.map((line, idx) => (
                    <div key={idx} className="text-lg md:text-xl leading-tight mb-2 opacity-75 break-words">
                        {line}
                    </div>
                ))}

                <div className="text-lg md:text-xl leading-tight font-bold break-words min-h-[3rem]">
                    {typingLine}
                    <span ref={cursorRef} className="opacity-0">|</span>
                </div>

                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default TabletScreen;
