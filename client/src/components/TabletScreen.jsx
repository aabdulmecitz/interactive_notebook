import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove, inkSettings }) => {
    const [queue, setQueue] = useState([]);
    const [completedLines, setCompletedLines] = useState([]);

    // Active Typing State
    const [currentMessage, setCurrentMessage] = useState(null);
    const [typingLine, setTypingLine] = useState('');

    // PAGE CLEAR STATE
    const [isClearing, setIsClearing] = useState(false);

    // TRAVEL STATE (Sync Fix)
    const [isTraveling, setIsTraveling] = useState(false);

    // Overflow Flag
    const overflowRef = useRef(false);

    // RE-ENABLE CALIBRATION (New defaults for smaller pen) -- Removed in final, ensuring clean slate if needed
    // ...

    const lastMsgIdRef = useRef(null);
    const cursorRef = useRef(null);
    const bottomRef = useRef(null);
    const containerRef = useRef(null);

    // 0. INITIAL STARTUP MESSAGE REMOVED
    useEffect(() => {
        // Empty on start
        setQueue([]);
    }, []);

    // 1. INGESTION
    useEffect(() => {
        if (!messages || messages.length === 0) return;
        const latestMsg = messages[messages.length - 1];
        if (lastMsgIdRef.current === latestMsg.id) return;
        lastMsgIdRef.current = latestMsg.id;
        setQueue(prev => [...prev, latestMsg]);
    }, [messages]);

    // 2. DISPATCHER (With Page Clear Logic)
    useEffect(() => {
        // Only dispatch if not typing, not clearing, and have messages
        if (!currentMessage && queue.length > 0 && !isClearing) {

            // CHECK PAGE LIMIT (12 Lines)
            if (completedLines.length >= 12) {
                setIsClearing(true);

                // Wait for Glitch Animation (500ms) + Pen Parking (150ms)
                setTimeout(() => {
                    setCompletedLines([]); // Wipe Screen
                    setIsClearing(false);  // Resume
                }, 800); // Slightly longer than anim to ensure clean state
                return;
            }

            const next = queue[0];
            setQueue(prev => prev.slice(1));

            // START TRAVEL: Move pen first, then type
            setIsTraveling(true);
            setCurrentMessage(next);

            // Delay typing for 600ms to allow pen to arrive
            setTimeout(() => {
                setIsTraveling(false);
            }, 600);
        }
    }, [queue, currentMessage, isClearing, completedLines]);

    // 3. ANIMATOR
    useEffect(() => {
        if (!currentMessage || isTraveling) return; // Wait for travel to finish

        const textToType = currentMessage.message || "";
        // No hard limit. We rely on overflowRef now.

        // Reset overflow flag for new message
        overflowRef.current = false;

        let charIndex = 0;
        const speed = 30;

        const interval = setInterval(() => {
            // CHECK DYNAMIC OVERFLOW
            if (overflowRef.current) {
                clearInterval(interval);

                // Truncate the current visible line
                // Remove last few chars to fit ellipsis
                setTypingLine(prev => {
                    const truncated = prev.slice(0, -2) + "...";
                    // Commit the truncated line
                    setCompletedLines(c => [...c, {
                        text: truncated,
                        color: inkSettings?.dry || '#00f3ff'
                    }]);
                    return ''; // Clear typing line for next step (which is ending)
                });

                setCurrentMessage(null);
                setTypingLine('');
                return;
            }

            const currentText = textToType.slice(0, charIndex + 1);
            setTypingLine(currentText);
            charIndex++;

            if (charIndex > textToType.length) {
                clearInterval(interval);

                setCompletedLines(prev => {
                    // Simply append, do not slice. The Dispatcher handles the clearing now.
                    return [...prev, {
                        text: textToType,
                        color: inkSettings?.dry || '#00f3ff'
                    }];
                });

                setTypingLine('');
                setCurrentMessage(null);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [currentMessage, isTraveling]); // Add isTraveling dependency

    // 4. PEN TRACKING (FINAL CALIBRATION + PARKING)
    useEffect(() => {
        // USER PROVIDED CALIBRATION (X: 5, Y: -160 -> -155)
        const calX = 5;
        const calY = -155;

        // Park if no message OR if clearing
        if (!currentMessage || isClearing) {
            // IDLE / PARKING STATE
            if (containerRef.current && onPenMove) {
                const rect = containerRef.current.getBoundingClientRect();

                // Calculate Tablet Dimensions based on known percentages
                // Screen Width is 72% of Tablet Width
                const tabletWidth = rect.width / 0.72;

                // Screen Left is 14.5% of Tablet Width
                // Tablet Left = Screen Left - (Tablet Width * 0.145)
                const tabletLeft = rect.left - (tabletWidth * 0.145);

                // Tablet Right Edge
                const tabletRight = tabletLeft + tabletWidth;

                // Park just outside the tablet right edge
                onPenMove({
                    x: tabletRight + 200,
                    y: rect.bottom - 100 + calY, // Rest lower down
                    isHidden: false,
                    duration: '150ms',     // HYPER FAST exit
                    easing: 'ease-in',     // Accelerate out
                    blur: '20px'           // HEAVY motion blur
                });
            }
            return;
        }

        if (!cursorRef.current || !onPenMove) return;
        const rect = cursorRef.current.getBoundingClientRect();

        // CHECK FOR VISUAL OVERFLOW
        if (containerRef.current) {
            const containerRight = containerRef.current.getBoundingClientRect().right;
            // Buffer of 20px
            if (rect.right > containerRight - 20) {
                overflowRef.current = true;
                // Do not update pen position if overflowing to avoid going off-screen
                // The Animator will catch this in next tick
                return;
            }
        }

        // TRAVELING STATE (New) - Smooth move to start position
        if (isTraveling) {
            onPenMove({
                x: rect.left + calX,
                y: rect.top + calY, // No jitter
                isHidden: false,
                duration: '500ms',  // Travel time
                easing: 'ease-out', // Smooth arrival
                blur: '4px'         // Slight motion blur
            });
            return;
        }

        // TYPING STATE (Jittery)
        // Simulate Handwriting Vertical Movement (Jitter)
        // Alternate up/down + random noise
        const strokeCycle = typingLine.length % 4; // 0, 1, 2, 3
        let jitterY = 0;
        if (strokeCycle === 0) jitterY = -4; // Up
        else if (strokeCycle === 1) jitterY = -2;
        else if (strokeCycle === 2) jitterY = 2; // Down
        else jitterY = 4;

        // Add a bit of random chaos
        jitterY += (Math.random() * 2 - 1);

        onPenMove({
            x: rect.left + calX,
            y: rect.top + calY + jitterY,
            isHidden: false,
            duration: '30ms',       // Ultra fast matching typing speed
            easing: 'linear',       // Precise
            blur: '0px'             // Sharp
        });
    }, [typingLine, currentMessage, isClearing, isTraveling, onPenMove]);

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-start px-2 py-2 relative">
            <style>{`
            .font-caveat {
                font-family: 'Caveat', cursive;
            }
            .text-neon-cyan {
                /* Default fallback */
                color: #00f3ff;
                text-shadow: 0 0 2px rgba(0, 243, 255, 0.4), 0 0 8px rgba(0, 243, 255, 0.2); 
            }
            
            @keyframes wetInkAnim {
                0% {
                    color: var(--wet-color, #ffffff);
                    text-shadow: 0 0 8px var(--wet-color, #ffffff), 0 0 15px var(--wet-color, #ffffff);
                }
                100% {
                    color: var(--dry-color, #00f3ff);
                    text-shadow: 0 0 2px var(--dry-color, #00f3ff), 0 0 8px var(--dry-color, #00f3ff);
                }
            }

            .wet-char {
                animation: wetInkAnim 0.6s ease-out forwards;
            }

            /* CHAOTIC GLITCH EFFECTS */
            @keyframes glitch-line-chaos {
                0% { transform: translate(0,0); opacity: 1; }
                20% { transform: translate(-10px, 2px) skew(10deg); color: red; text-shadow: 2px 0 blue; }
                40% { transform: translate(15px, -5px) skew(-20deg); color: blue; text-shadow: -2px 0 red; opacity: 0.5; }
                60% { transform: translate(-5px, 0); filter: blur(2px); }
                80% { transform: translate(5px, 5px) scale(1.1); color: white; opacity: 0.8; }
                100% { transform: translate(0,0); opacity: 1; }
            }

            @keyframes glitch-container-wipe {
                0% { opacity: 1; transform: scale(1); filter: hue-rotate(0deg); }
                30% { opacity: 1; transform: scale(1.02) skew(5deg); filter: hue-rotate(90deg) contrast(2); }
                70% { opacity: 0.5; transform: scale(0.95) skew(-5deg) translate(-20px, 0); filter: invert(1); }
                90% { opacity: 0; transform: scale(0.1) skew(50deg); }
                100% { opacity: 0; transform: scale(0); }
            }

            .glitch-active {
                animation: glitch-container-wipe 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
            }
            
            /* Apply Chaos to individual lines when parent is glitching */
            .glitch-active > div {
                animation: glitch-line-chaos 0.2s steps(2) infinite;
            }
            /* Randomize delays slightly for organic chaos */
            .glitch-active > div:nth-child(even) { animation-duration: 0.25s; animation-direction: reverse; }
            .glitch-active > div:nth-child(3n) { animation-delay: 0.1s; }
        `}</style>
            {/* CONDITIONAL CLASS: glitch-active when clearing */}
            <div className={`flex-1 overflow-hidden flex flex-col justify-start pt-1 font-caveat ${isClearing ? 'glitch-active' : ''}`}>
                {completedLines.map((lineData, idx) => (
                    <div
                        key={idx}
                        className="text-lg md:text-xl leading-6 mb-0.5 opacity-90 truncate font-bold"
                        style={{
                            color: lineData.color, // Dry color
                            textShadow: `0 0 2px ${lineData.color}66, 0 0 8px ${lineData.color}33`
                        }}
                    >
                        {lineData.text}
                    </div>
                ))}

                {/* Only show typing line if we have space (less than 12 lines) */}
                {completedLines.length < 12 && (
                    <div
                        className="text-lg md:text-xl leading-6 font-bold truncate min-h-[1.5rem]"
                        style={{
                            '--wet-color': inkSettings?.wet || '#ffffff',
                            '--dry-color': inkSettings?.dry || '#00f3ff'
                        }}
                    >
                        {typingLine.split('').map((char, index) => (
                            <span key={index} className="wet-char">{char}</span>
                        ))}
                        {/* Cursor */}
                        <span ref={cursorRef} className="opacity-0">|</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabletScreen;
