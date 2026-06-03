const { app, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_PORT = process.env.PORT || '39271';
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const DATA_DIR = process.env.SCREENPLAY_DATA_DIR || 'E:\\app开发\\Screenplay Studio Data';

function resolveEnvFile() {
  const userEnv = path.join(app.getPath('userData'), '.env.local');
  if (fs.existsSync(userEnv)) return userEnv;

  const bundledEnv = path.join(process.resourcesPath || '', '.env.local');
  if (fs.existsSync(bundledEnv)) return bundledEnv;

  const projectEnv = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(projectEnv)) return projectEnv;

  return userEnv;
}

function startBundledServer() {
  process.env.NODE_ENV = 'production';
  process.env.PORT = APP_PORT;
  process.env.ENV_FILE = resolveEnvFile();
  process.env.APP_DIST_DIR = path.join(__dirname, '..', 'dist');
  process.env.SCREENPLAY_DATA_DIR = DATA_DIR;
  process.env.SCREENPLAY_DB_PATH = path.join(DATA_DIR, 'screenplay-studio.sqlite');
  process.env.MARKDOWN_BACKUP_DIR = path.join(DATA_DIR, 'markdown-backups');
  process.env.LEGACY_DRAFTS_DIR = path.join(app.getPath('documents'), 'Screenplay Studio', 'drafts');
  process.env.SQLJS_WASM_PATH = path.join(process.resourcesPath || '', 'sql-wasm.wasm');

  require(path.join(__dirname, '..', 'dist', 'server.cjs'));
}

async function waitForServer(retries = 80) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(`${APP_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // Keep waiting while the local server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('The local app server did not start in time.');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#e6e2d8',
    title: 'Screenplay Studio',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadURL(APP_URL);
}

app.whenReady().then(async () => {
  startBundledServer();
  await waitForServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
