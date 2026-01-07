import React from 'react';

// Using public folder path.
const penImgPath = "/assets/hand_overlay.png";

const Pen = ({ position }) => {
    return (
        <div
            className="fixed pointer-events-none z-50 transition-all duration-75 ease-linear will-change-transform"
            style={{
                left: position.x,
                top: position.y,
                // No translation needed if we calculate the tip offset in the parent/screen
            }}
        >
            {/* Width set to 1500px to simulate a close-up hand view */}
            <img
                src={penImgPath}
                alt="Pen"
                className="w-[1500px] h-auto opacity-100 drop-shadow-2xl"
                onError={(e) => {
                    // e.target.style.display = 'none';
                }}
            />
        </div>
    );
};

export default Pen;
