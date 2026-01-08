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

    // 4. PEN TRACKING (FINAL CALIBRATION)
    useEffect(() => {
        if (!cursorRef.current || !onPenMove) return;
        const rect = cursorRef.current.getBoundingClientRect();

        // USER PROVIDED CALIBRATION (X: 5, Y: -160)
        const offsetX = 5;
        const offsetY = -160;

        onPenMove({
            x: rect.left + offsetX,
            y: rect.top + offsetY,
            isHidden: false
        });
    }, [typingLine]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [completedLines, typingLine]);

    return (
        <div className="w-full h-full flex flex-col justify-start px-2 py-2 font-mono relative">
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
