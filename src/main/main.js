const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 1100,
    minHeight: 720,
    resizable: false,
    frame: false,
    movable: true,
    backgroundColor: '#10131c',

    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

// بررسی معتبر بودن درخواست IPC
function isTrustedSender(event) {
  return (
    event.senderFrame &&
    event.senderFrame === event.sender.mainFrame &&
    event.senderFrame.url.startsWith('file://')
  );
}

// دریافت اطلاعات کارت‌های شبکه
async function getNetworkAdapters() {
  const powershellScript = `
    $ErrorActionPreference = 'Stop'

    $adapters = Get-NetAdapter -ErrorAction Stop |
      Select-Object @{Name='interfaceIndex'; Expression={[int]$_.ifIndex}}, @{Name='name'; Expression={$_.Name}}, @{Name='description'; Expression={$_.InterfaceDescription}}, @{Name='status'; Expression={$_.Status}}

    ConvertTo-Json -InputObject @($adapters) -Depth 4 -Compress
  `;

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        powershellScript,
      ],
      {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
      },
    );

    const output = stdout.trim();
    const adapters = output ? JSON.parse(output) : [];

    return {
      success: true,
      adapters: Array.isArray(adapters) ? adapters : [adapters],
    };
  } catch (error) {
    return {
      success: false,
      message: error.stderr || error.message,
      adapters: [],
    };
  }
}

// دریافت کارت‌های شبکه از Renderer
ipcMain.handle('network:get-adapters', async (event) => {
  if (!isTrustedSender(event)) {
    throw new Error('Unauthorized IPC request');
  }

  return await getNetworkAdapters();
});

// کوچک کردن پنجره
ipcMain.on('window:minimize', (event) => {
  if (!isTrustedSender(event)) return;

  const win = BrowserWindow.fromWebContents(event.sender);

  if (win) {
    win.minimize();
  }
});

// بستن پنجره
ipcMain.on('window:close', (event) => {
  if (!isTrustedSender(event)) return;

  const win = BrowserWindow.fromWebContents(event.sender);

  if (win) {
    win.close();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
