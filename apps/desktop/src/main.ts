import { app, BrowserWindow, Menu, MenuItemConstructorOptions, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { ServiceManager } from './service-manager';

// Define o nome canônico do aplicativo para caminhos em %APPDATA%
app.setName('WorldArchitect');

// Impede múltiplas instâncias simultâneas do app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let serviceManager: ServiceManager | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const appDataDir = app.getPath('userData');
const workspaceRoot = isDev
  ? path.resolve(__dirname, '../../../')
  : path.resolve(process.resourcesPath);

function getAppPaths() {
  return {
    userData: appDataDir,
    appPath: app.getAppPath(),
    logs: path.join(appDataDir, 'logs'),
  };
}

async function checkUrlReachable(urlStr: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const req = http.get(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: u.pathname,
          timeout: 1000,
        },
        (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 304);
        },
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Abrir Pasta de Dados Locais',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: async () => {
            await shell.openPath(appDataDir);
          },
        },
        { type: 'separator' },
        {
          label: 'Sair do WorldArchitect',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Visualização',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Recarregamento Forçado' },
        { role: 'toggleDevTools', label: 'Ferramentas do Desenvolvedor' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamanho Real' },
        { role: 'zoomIn', label: 'Aumentar Zoom' },
        { role: 'zoomOut', label: 'Diminuir Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Alternar Tela Cheia' },
      ],
    },
    {
      label: 'Serviço Local',
      submenu: [
        {
          label: 'Verificar Status do Serviço',
          click: async () => {
            const status = serviceManager?.getStatus();
            const message = status
              ? `Status: ${status.status.toUpperCase()}\nTipo: ${status.isExternal ? 'Externo (preservado)' : 'Gerenciado pelo App'}\nPorta API: ${status.port}\nPorta WS: ${status.websocketPort}\nPID: ${status.pid ?? 'Nenhum'}\nUptime: ${status.uptimeSeconds ?? 0}s${status.error ? `\n\nErro: ${status.error}` : ''}${status.diagnostics ? `\n\nAviso: ${status.diagnostics}` : ''}`
              : 'Gerenciador de serviço não inicializado.';
            dialog.showMessageBox({
              type: status?.status === 'running' ? 'info' : 'warning',
              title: 'Status do Serviço Local',
              message,
            });
          },
        },
        {
          label: 'Reiniciar Serviço Local',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            if (serviceManager) {
              await serviceManager.restart();
              mainWindow?.reload();
            }
          },
        },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre o WorldArchitect',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'Sobre WorldArchitect',
              message: 'WorldArchitect — Plataforma de Worldbuilding Local-First',
              detail: `Versão: ${app.getVersion()}\nPlataforma: ${process.platform} (${process.arch})\nArmazenamento Local: ${appDataDir}\n\nNota: A Fase 2 estabelece o shell desktop. Dependências de PostgreSQL e Redis permanecem ativas até a conclusão da Fase 3 (SQLite).`,
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#09090b',
    title: 'WorldArchitect — Workspace',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(buildMenu());

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 1. Em desenvolvimento, se o dev server estiver ativo, usa-o
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  const hasDevServer = isDev ? await checkUrlReachable(devServerUrl) : false;

  if (hasDevServer) {
    console.log(`Carregando interface via Dev Server: ${devServerUrl}`);
    await mainWindow.loadURL(devServerUrl);
  } else {
    // 2. Carrega o frontend empacotado dentro do app.asar
    const bundledHtml = path.resolve(__dirname, '../renderer/index.html');
    if (fs.existsSync(bundledHtml)) {
      console.log(`Carregando interface embutida: ${bundledHtml}`);
      await mainWindow.loadFile(bundledHtml);
    } else {
      console.error(`ERRO: Interface compilada não encontrada em: ${bundledHtml}`);
      const fallbackHtml = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>WorldArchitect</title></head>
  <body style="background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;padding:48px;line-height:1.6;">
    <h1 style="color:#ef4444;font-size:18px;">Interface não encontrada</h1>
    <p style="color:#a1a1aa;font-size:13px;">O arquivo <code>renderer/index.html</code> não foi incluído no pacote.</p>
    <p style="color:#71717a;font-size:12px;">Caminho verificado: <code>${bundledHtml}</code></p>
  </body>
</html>`;
      await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
    }
  }
}

// IPC Handlers
ipcMain.handle('desktop:get-service-status', async () => {
  return serviceManager?.getStatus();
});

ipcMain.handle('desktop:restart-service', async () => {
  return serviceManager?.restart();
});

ipcMain.handle('desktop:open-data-folder', async () => {
  await shell.openPath(appDataDir);
  return appDataDir;
});

ipcMain.handle('desktop:get-app-paths', async () => {
  return getAppPaths();
});

// App Lifecycle
app.whenReady().then(async () => {
  console.log(`Inicializando WorldArchitect Desktop (userData: ${appDataDir})`);

  serviceManager = new ServiceManager(appDataDir, workspaceRoot);
  // Inicia ou conecta ao serviço local
  await serviceManager.start().catch((err) => {
    console.error('Falha ao inicializar ServiceManager:', err);
  });

  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('before-quit', async (event) => {
  if (serviceManager) {
    event.preventDefault();
    console.log('Finalizando serviços antes de fechar...');
    await serviceManager.stop();
    serviceManager = null;
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
