/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                mono: ['"Share Tech Mono"', 'monospace'],
            },
            colors: {
                cyber: {
                    green: '#00ff41', // Matrix/Terminal Green
                    text: '#aaffaa',
                }
            }
        },
    },
    plugins: [],
}
