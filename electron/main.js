const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let tray;
let serverProcess;

const isDev = !app.isPackaged;
const SERVER_PORT = 3000;
const CLIENT_PORT = 5173;

// FORCE BACKGROUND RENDERING (Vital for OBS Game Capture/Window Capture when occluded)
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Logging for debug
function log(msg) {
    console.log(msg);
    // Optional: write to file in userData if needed for deep debugging
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false, // Keep audio/timers running in background
            webSecurity: false // Optional: helps with local file loading issues sometimes
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/favicon.ico')
    });

    try {
        if (isDev) {
            mainWindow.loadURL(`http://localhost:${CLIENT_PORT}`);
        } else {
            // Check if file exists
            const indexPath = path.join(__dirname, '../client/dist/index.html');
            if (!fs.existsSync(indexPath)) {
                dialog.showErrorBox('Initialization Error', `Client file not found at: ${indexPath}`);
            }
            mainWindow.loadFile(indexPath).catch(e => {
                dialog.showErrorBox('Navigation Error', `Failed to load: ${e.message}`);
            });
        }
    } catch (e) {
        dialog.showErrorBox('Startup Error', e.message);
    }

    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function startServer() {
    if (isDev) return;

    // Production Path Logic
    // We expect 'server' to be inside 'resources' folder via extraResources
    const serverScript = path.join(process.resourcesPath, 'server', 'index.js');
    const serverCwd = path.join(process.resourcesPath, 'server');

    // Fallback if not found (e.g. if packed in asar - though we prefer extraResources for node spawning)
    if (!fs.existsSync(serverScript)) {
        dialog.showErrorBox('Server Error', `Server script not found at: ${serverScript}`);
        return;
    }

    log(`Starting server from: ${serverScript} with cwd: ${serverCwd}`);

    // Spawn Node
    // Note: This relies on 'node' being in system PATH. 
    // For a fully robust standalone app, we would bundle a node executable or fork.
    serverProcess = spawn('node', ['index.js'], {
        cwd: serverCwd,
        stdio: 'ignore' // 'inherit' might cause issues if no console attached in production
    });

    serverProcess.on('error', (err) => {
        dialog.showErrorBox('Server Error', `Failed to start server process: ${err.message}\nMake sure Node.js is installed.`);
    });

    serverProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
            // Only show if it crashes, not on clean exit
            // dialog.showErrorBox('Server Error', `Server exited with code ${code}`); 
        }
    });
}

function getIconPath() {
    const iconCandidates = [
        path.join(__dirname, '../public/favicon.ico'),
        path.join(__dirname, '../client/public/assets/hand_overlay.png'),
        path.join(__dirname, '../client/dist/assets/hand_overlay.png'),
        path.join(process.resourcesPath, 'client/dist/assets/hand_overlay.png'),
        path.join(__dirname, 'icon.png') // Fallback
    ];

    for (const candidate of iconCandidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function createTray() {
    const iconPath = getIconPath();
    if (!iconPath) {
        // log("No icon found, skipping Tray");
        return;
    }

    try {
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show App', click: () => mainWindow.show() },
            { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
        ]);
        tray.setToolTip('Hackerpad');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        });
    } catch (e) {
        dialog.showErrorBox('Tray Error', `Failed to create tray: ${e.message}`);
    }
}

app.whenReady().then(() => {
    startServer();
    createTray();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('before-quit', () => {
    app.isQuiting = true; // Ensure flag is set
    if (serverProcess) {
        try {
            const { exec } = require('child_process');
            exec(`taskkill /pid ${serverProcess.pid} /f /t`);
        } catch (e) {
            console.error("Failed to kill server:", e);
        }
    }
});
