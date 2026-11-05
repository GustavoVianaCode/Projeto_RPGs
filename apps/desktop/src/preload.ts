import { contextBridge, ipcRenderer, shell } from 'electron';
import { DesktopBridge, ServiceState } from './types';

const bridge: DesktopBridge = {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '0.1.0',

  getServiceStatus: (): Promise<ServiceState> => {
    return ipcRenderer.invoke('desktop:get-service-status');
  },

  restartService: (): Promise<ServiceState> => {
    return ipcRenderer.invoke('desktop:restart-service');
  },

  openDataFolder: (): Promise<string> => {
    return ipcRenderer.invoke('desktop:open-data-folder');
  },

  openExternal: async (url: string): Promise<void> => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  },

  getAppPaths: (): Promise<{ userData: string; appPath: string; logs: string }> => {
    return ipcRenderer.invoke('desktop:get-app-paths');
  },
};

contextBridge.exposeInMainWorld('desktopBridge', bridge);

