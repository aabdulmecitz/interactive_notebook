@echo off
echo ==========================================
echo Setting up Hackerpad Desktop Environment
echo ==========================================

echo [1/4] Installing Root Dependencies...
call npm install

echo [2/4] Installing Server Dependencies...
cd server
call npm install
cd ..

echo [3/4] Installing Client Dependencies...
cd client
call npm install
cd ..

echo [4/4] Starting Application in Development Mode...
echo The application window should appear shortly.
echo Run this script again whenever you want to start the app for development.
echo ==========================================
npm start
pause
