import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove, inkSettings }) => {
    const [queue, setQueue] = useState([]);

    // Unified State: Array of { id, text, wetColor, dryColor }
    const [lines, setLines] = useState([]);

    // Active Typing State
    const [currentMessage, setCurrentMessage] = useState(null);

    // PAGE CLEAR STATE
    const [isClearing, setIsClearing] = useState(false);

    // TRAVEL STATE
    const [isTraveling, setIsTraveling] = useState(false);

    // Overflow Flag
    const overflowRef = useRef(false);

    const lastMsgIdRef = useRef(null);
    const cursorRef = useRef(null);
    const containerRef = useRef(null);

    // 0. INITIAL STARTUP
    useEffect(() => {
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

    // 2. DISPATCHER
    useEffect(() => {
        if (!currentMessage && queue.length > 0 && !isClearing) {

            // CHECK PAGE LIMIT (12 Lines)
            if (lines.length >= 12) {
                setIsClearing(true);
                setTimeout(() => {
                    setLines([]);
                    setIsClearing(false);
                }, 800);
                return;
            }

            const next = queue[0];
            setQueue(prev => prev.slice(1));
            setIsTraveling(true);
            setCurrentMessage(next);

            // Add a new empty line for this message
            setLines(prev => [
                ...prev,
                {
                    id: Date.now(),
                    text: "",
                    wetColor: inkSettings?.wet || '#ffffff',
                    dryColor: inkSettings?.dry || '#00f3ff'
                }
            ]);

            setTimeout(() => {
                setIsTraveling(false);
            }, 600);
        }
    }, [queue, currentMessage, isClearing, lines.length, inkSettings]);

    // 3. ANIMATOR
    useEffect(() => {
        if (!currentMessage || isTraveling) return;

        const textToType = currentMessage.message || "";
        overflowRef.current = false;
        let charIndex = 0;
        const speed = 30;

        const interval = setInterval(() => {
            // CHECK DYNAMIC OVERFLOW
            if (overflowRef.current) {
                clearInterval(interval);

                // Prepare next line
                setLines(prev => {
                    // Truncate current line
                    const newLines = [...prev];
                    const activeIdx = newLines.length - 1;
                    const truncated = newLines[activeIdx].text.slice(0, -2) + "...";
                    newLines[activeIdx] = { ...newLines[activeIdx], text: truncated };

                    // Add NEW line immediately for continuation (if we were supporting wrapping of same msg, but here we drop msg)
                    // Logic says: Truncate curr line, Drop Msg, Add NEW Line only when NEXT msg comes?
                    // Code below simply stops. Dispatcher will add new line for next msg.
                    return newLines;
                });

                setCurrentMessage(null);
                return;
            }

            // Typing Logic
            const currentText = textToType.slice(0, charIndex + 1);

            setLines(prev => {
                const newLines = [...prev];
                const activeIdx = newLines.length - 1;
                // Safety check
                if (activeIdx < 0) return prev;

                newLines[activeIdx] = { ...newLines[activeIdx], text: currentText };
                return newLines;
            });

            charIndex++;

            if (charIndex > textToType.length) {
                clearInterval(interval);
                setCurrentMessage(null);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [currentMessage, isTraveling]);

    // 4. PEN TRACKING
    useEffect(() => {
        const calX = 5;
        const calY = -155;

        // Determine active line text for jitter calc
        const activeLineText = lines.length > 0 ? lines[lines.length - 1].text : "";

        if (!currentMessage || isClearing) {
            // PARK
            if (containerRef.current && onPenMove) {
                const rect = containerRef.current.getBoundingClientRect();
                const tabletWidth = rect.width / 0.72;
                const tabletLeft = rect.left - (tabletWidth * 0.145);
                const tabletRight = tabletLeft + tabletWidth;

                onPenMove({
                    x: tabletRight + 200,
                    y: rect.bottom - 100 + calY,
                    isHidden: false,
                    duration: '150ms',
                    easing: 'ease-in',
                    blur: '20px'
                });
            }
            return;
        }

        if (!cursorRef.current || !onPenMove) return;
        const rect = cursorRef.current.getBoundingClientRect();

        // CHECK OVERFLOW
        if (containerRef.current) {
            const containerRight = containerRef.current.getBoundingClientRect().right;
            if (rect.right > containerRight - 20) {
                overflowRef.current = true;
                return;
            }
        }

        if (isTraveling) {
            onPenMove({
                x: rect.left + calX,
                y: rect.top + calY,
                isHidden: false,
                duration: '500ms',
                easing: 'ease-out',
                blur: '4px'
            });
            return;
        }

        // JITTER
        const strokeCycle = activeLineText.length % 4;
        let jitterY = 0;
        if (strokeCycle === 0) jitterY = -4;
        else if (strokeCycle === 1) jitterY = -2;
        else if (strokeCycle === 2) jitterY = 2;
        else jitterY = 4;
        jitterY += (Math.random() * 2 - 1);

        onPenMove({
            x: rect.left + calX,
            y: rect.top + calY + jitterY,
            isHidden: false,
            duration: '30ms',
            easing: 'linear',
            blur: '0px'
        });

    }, [lines, currentMessage, isClearing, isTraveling, onPenMove]);

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-start px-2 py-2 relative">
            <style>{`
            .font-caveat { font-family: 'Caveat', cursive; }
            
            @keyframes wetInkAnim {
                0% {
                    color: var(--wet-color);
                    text-shadow: 0 0 8px var(--wet-color), 0 0 15px var(--wet-color);
                }
                100% {
                    color: var(--dry-color);
                    text-shadow: 0 0 2px var(--dry-color), 0 0 8px var(--dry-color);
                }
            }

            .wet-char { animation: wetInkAnim 0.6s ease-out forwards; }

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

            <div className={`flex-1 overflow-hidden flex flex-col justify-start pt-1 font-caveat ${isClearing ? 'glitch-active' : ''}`}>
                {lines.map((line) => (
                    <div
                        key={line.id}
                        className="text-lg md:text-xl leading-6 mb-0.5 opacity-90 truncate font-bold min-h-[1.5rem]"
                        style={{
                            '--wet-color': line.wetColor,
                            '--dry-color': line.dryColor
                        }}
                    >
                        {line.text.split('').map((char, index) => (
                            <span key={index} className="wet-char">{char}</span>
                        ))}
                        {/* Show cursor only on the LAST line and if Active */}
                        {line.id === lines[lines.length - 1]?.id && currentMessage && (
                            <span ref={cursorRef} className="opacity-0">|</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TabletScreen;
