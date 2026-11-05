export interface ServiceState {
  status: 'stopped' | 'starting' | 'running' | 'error';
  port: number;
  websocketPort: number;
  pid?: number;
  error?: string;
  uptimeSeconds?: number;
  startedAt?: string;
}

export interface DesktopBridge {
  isDesktop: true;
  platform: string;
  version: string;
  getServiceStatus: () => Promise<ServiceState>;
  restartService: () => Promise<ServiceState>;
  openDataFolder: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  getAppPaths: () => Promise<{
    userData: string;
    appPath: string;
    logs: string;
  }>;
}

declare global {
  interface Window {
    desktopBridge?: DesktopBridge;
  }
}

