import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database/init';
import { registerDatabaseHandlers } from './ipc/databaseHandlers';
import { registerStockApiHandlers } from './ipc/stockApiHandlers';
import { registerAnalysisHandlers } from './ipc/analysisHandlers';
import { registerImportHandlers } from './ipc/importHandlers';
import { pathToFileURL } from 'url';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    backgroundColor: '#0f172a',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  try {
    if (isDev) {
      // Development: load from Vite dev server
      await mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      // Production: serve files via custom protocol
      await mainWindow.loadURL('app://localhost/index.html');
    }
  } catch (error) {
    console.error('Failed to load app:', error);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerProtocol() {
  const appPath = app.getAppPath();
  const rendererPath = path.join(appPath, 'dist', 'renderer');
  console.log('Registering protocol, renderer path:', rendererPath);

  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = path.join(rendererPath, url.pathname);

    // Default to index.html for root
    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(rendererPath, 'index.html');
    }

    console.log('Protocol handling:', request.url, '->', filePath);

    // Return the file
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

async function initialize() {
  // Initialize SQLite database
  await initializeDatabase();

  // Register IPC handlers
  registerDatabaseHandlers();
  registerStockApiHandlers();
  registerAnalysisHandlers();
  registerImportHandlers();
}

app.whenReady().then(async () => {
  // Register custom protocol for serving files
  registerProtocol();

  await initialize();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
