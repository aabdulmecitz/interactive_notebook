const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let tray;
let serverProcess;

const isDev = !app.isPackaged;
const SERVER_PORT = 3000;
const CLIENT_PORT = 5173;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/favicon.ico') // Assuming favicon exists, otherwise generic
    });

    const startUrl = isDev
        ? `http://localhost:${CLIENT_PORT}`
        : `file://${path.join(__dirname, '../client/dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function startServer() {
    if (isDev) {
        console.log('Dev mode: Server should be running separately or concurrently.');
        return;
    }

    const serverPath = path.join(__dirname, '../server/index.js'); // Adjust for built structure
    // In production, we might need to bundle the server or reference it differently
    // For now, assuming it's copied to resources

    const serverExec = process.resourcesPath ? path.join(process.resourcesPath, 'server', 'index.js') : serverPath;

    console.log('Starting server from:', serverExec);

    // We need node to run this. In a real bundled app, we might bundle node or use pkg.
    // For this simple "apply", assuming user has node or we bundle the script.
    // Actually, simpler: Just spawn 'node' if it's available in env, or rely on internal logic.
    // Best practice for packaged apps is usually to include a binary or use a relative path if 'node' is guaranteed.
    // Let's try spawning 'node' for now.

    serverProcess = spawn('node', [serverPath], {
        cwd: path.join(__dirname, '../server'),
        stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });
}

function createTray() {
    const iconPath = path.join(__dirname, '../public/favicon.ico'); // Placeholder
    // Note: Creating a simple tray icon. If favicon doesn't exist/invalid format, this might fail silently or show empty.
    // For safety, let's try to use a system icon or just generic if file missing? 
    // Electron usually handles missing icons gracefully (shows empty space).

    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => mainWindow.show()
        },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('Hackerpad');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

app.whenReady().then(() => {
    // startServer(); // Only needed if we want to manage server in prod. For dev, we use concurrently.
    createTray();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('before-quit', () => {
    if (serverProcess) serverProcess.kill();
});
