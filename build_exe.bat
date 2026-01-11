@echo off
echo ==========================================
echo Building Hackerpad Desktop Executable
echo ==========================================

echo [1/3] Installing Dependencies...
call npm install
cd client
call npm install
cd ..

echo [2/3] Building React Frontend...
cd client
call npm run build
cd ..

echo [3/3] Packaging Electron App...
call npm run dist

echo ==========================================
echo BUILD COMPLETE!
echo You can find your .exe file in the 'dist' folder.
echo ==========================================
pause
