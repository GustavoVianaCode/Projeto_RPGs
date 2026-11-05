export type ServiceStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface ServiceState {
  status: ServiceStatus;
  port: number;
  websocketPort: number;
  isExternal: boolean;
  pid?: number;
  error?: string;
  uptimeSeconds?: number;
  startedAt?: string;
  diagnostics?: string;
}

export interface DesktopBridge {
  isDesktop: true;
  platform: NodeJS.Platform;
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
