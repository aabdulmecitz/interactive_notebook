import React from 'react';

// Using public folder path.
const penImgPath = "/assets/hand_overlay.png";

const Pen = ({ position }) => {
    return (
        <div
            className="fixed pointer-events-none z-50 will-change-transform"
            style={{
                left: position.x,
                top: position.y,
                transitionProperty: 'left, top, filter',
                transitionDuration: position.duration || '75ms',
                transitionTimingFunction: position.easing || 'linear',
                filter: position.blur ? `blur(${position.blur})` : 'none',
            }}
        >
            {/* Width set to 1500px to simulate a close-up hand view */}
            <img
                src={penImgPath}
                alt="Pen"
                className="opacity-100 drop-shadow-2xl"
                style={{
                    width: '500px',
                    maxWidth: 'none',
                    height: 'auto',
                    minWidth: '500px' // Force min width too
                }}
                onError={(e) => {
                    // e.target.style.display = 'none';
                }}
            />
        </div>
    );
};

export default Pen;
