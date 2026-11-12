const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

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

// بررسی معتبر بودن درخواست‌های IPC
function isTrustedSender(event) {
  return (
    event.senderFrame === event.sender.mainFrame &&
    event.senderFrame.url.startsWith('file://')
  );
}

// دریافت اطلاعات کارت‌های شبکه
async function getNetworkAdapters() {
  const powershellScript = `
    $adapters = @(
      Get-NetAdapter -ErrorAction Stop | ForEach-Object {
        $adapter = $_

        $dns = Get-DnsClientServerAddress 
          -InterfaceIndex $adapter.ifIndex 
          -AddressFamily IPv4 
          -ErrorAction SilentlyContinue

        [PSCustomObject]@{
          interfaceIndex = [int]$adapter.ifIndex
          name = [string]$adapter.Name
          description = [string]$adapter.InterfaceDescription
          status = [string]$adapter.Status
          dnsServers = @($dns.ServerAddresses)
        }
      }
    )

    ConvertTo-Json -InputObject $adapters -Depth 4 -Compress
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
      },
    );

    const adapters = JSON.parse(stdout.trim());

    return {
      success: true,
      adapters: Array.isArray(adapters) ? adapters : [adapters],
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
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
