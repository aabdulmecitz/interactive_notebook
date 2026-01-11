@echo off
echo ==========================================
echo Building Hackerpad Desktop Executable
echo ==========================================

echo [0/3] Cleaning up previous instances...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM "Hackerpad.exe" /T 2>nul
taskkill /F /IM "electron-builder.exe" /T 2>nul
taskkill /F /IM "app-builder.exe" /T 2>nul
timeout /t 3 /nobreak >nul

if exist "dist" (
    echo Cleaning dist directory...
    rd /s /q "dist" 2>nul
)

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
