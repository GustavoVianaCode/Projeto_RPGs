import { ChildProcess, spawn, exec } from 'child_process';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { ServiceState, ServiceStatus } from './types';

export class ServiceManager extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: ServiceStatus = 'stopped';
  private isExternal = false;
  private port = 4000;
  private websocketPort = 4001;
  private startedAt?: Date;
  private lastError?: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private logStream: fs.WriteStream | null = null;

  constructor(
    private readonly appDataDir: string,
    private readonly workspaceRoot: string,
  ) {
    super();
    this.ensureLogDir();
  }

  private ensureLogDir() {
    const logsDir = path.join(this.appDataDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'local-service.log');
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  private log(message: string) {
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    this.logStream?.write(entry);
    console.log(`[ServiceManager] ${message}`);
  }

  public getStatus(): ServiceState {
    const uptimeSeconds = this.startedAt
      ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
      : undefined;

    return {
      status: this.status,
      port: this.port,
      websocketPort: this.websocketPort,
      isExternal: this.isExternal,
      pid: this.child?.pid,
      error: this.lastError,
      uptimeSeconds,
      startedAt: this.startedAt?.toISOString(),
      diagnostics:
        this.status === 'error'
          ? 'Nesta etapa (Fase 2), o backend requer que PostgreSQL (porta 5432) e Redis (porta 6379) estejam ativos até a conclusão da Fase 3 (SQLite embutido).'
          : undefined,
    };
  }

  /**
   * Healthcheck seguro e sem efeitos colaterais.
   * Consulta /api/health ou /health (não cria registros no banco nem emite tokens).
   */
  public async isHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://localhost:${this.port}/api/health`,
        { timeout: 2000 },
        (res) => {
          resolve(res.statusCode === 200);
        },
      );

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Inicia ou anexa-se ao serviço local
   */
  public async start(): Promise<ServiceState> {
    this.log('Iniciando verificação de serviço local via /api/health...');

    // 1. Verificar se o serviço já está rodando externamente (ex: pnpm dev ou terminal)
    const alreadyRunning = await this.isHealthy();
    if (alreadyRunning) {
      this.status = 'running';
      this.isExternal = true;
      this.child = null;
      this.startedAt = new Date();
      this.lastError = undefined;
      this.log(`Serviço externo detectado e ativo na porta ${this.port}.`);
      this.emit('status-change', this.getStatus());
      this.startHealthMonitoring();
      return this.getStatus();
    }

    // 2. Tentar localizar o arquivo compilado da API no checkout ou pacote
    const apiDistPath = path.resolve(this.workspaceRoot, 'apps/api/dist/main.js');
    if (!fs.existsSync(apiDistPath)) {
      this.status = 'error';
      this.isExternal = false;
      this.lastError = `Arquivo da API não encontrado em: ${apiDistPath}. Verifique se 'pnpm build' foi executado.`;
      this.log(`ERRO: ${this.lastError}`);
      this.emit('status-change', this.getStatus());
      return this.getStatus();
    }

    this.status = 'starting';
    this.isExternal = false;
    this.emit('status-change', this.getStatus());
    this.log(`Iniciando processo da API: ${apiDistPath}`);

    try {
      this.child = spawn(process.execPath, [apiDistPath], {
        cwd: path.resolve(this.workspaceRoot, 'apps/api'),
        env: {
          ...process.env,
          PORT: String(this.port),
          NODE_ENV: 'production',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.child.stdout?.on('data', (chunk) => {
        const text = chunk.toString();
        this.logStream?.write(text);
      });

      this.child.stderr?.on('data', (chunk) => {
        const text = chunk.toString();
        this.logStream?.write(`[STDERR] ${text}`);
      });

      this.child.on('error', (err) => {
        this.status = 'error';
        this.lastError = err.message;
        this.log(`Erro no processo filho: ${err.message}`);
        this.emit('status-change', this.getStatus());
      });

      this.child.on('exit', (code, signal) => {
        this.log(`Processo filho encerrado (código: ${code}, sinal: ${signal})`);
        this.status = 'stopped';
        this.child = null;
        this.emit('status-change', this.getStatus());
      });

      // Aguarda até o endpoint de saúde responder
      const healthy = await this.waitForHealth(15000);
      if (healthy) {
        this.status = 'running';
        this.startedAt = new Date();
        this.lastError = undefined;
        this.log(`Serviço inicializado com sucesso na porta ${this.port}.`);
        this.startHealthMonitoring();
      } else {
        this.status = 'error';
        this.lastError =
          'A API não respondeu na porta 4000. Certifique-se de que o PostgreSQL (5432) e o Redis (6379) estão ativos (Fase 2).';
        this.log(`ERRO: ${this.lastError}`);
      }

      this.emit('status-change', this.getStatus());
      return this.getStatus();
    } catch (err: unknown) {
      this.status = 'error';
      this.lastError = err instanceof Error ? err.message : String(err);
      this.log(`Exceção ao iniciar processo: ${this.lastError}`);
      this.emit('status-change', this.getStatus());
      return this.getStatus();
    }
  }

  private async waitForHealth(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isHealthy()) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    return false;
  }

  private startHealthMonitoring() {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.isHealthy();
      if (!healthy && this.status === 'running') {
        this.status = 'error';
        this.lastError = 'A API deixou de responder na porta 4000.';
        this.log(`Alerta de Saúde: ${this.lastError}`);
        this.emit('status-change', this.getStatus());
      } else if (healthy && this.status === 'error') {
        this.status = 'running';
        this.lastError = undefined;
        this.log('Serviço reconectado com sucesso.');
        this.emit('status-change', this.getStatus());
      }
    }, 5000);
  }

  /**
   * Encerra o serviço:
   * Se for externo (já estava rodando antes do app), NÃO encerra o processo.
   * Se foi iniciado pelo app, encerra o processo filho de forma segura.
   */
  public async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.isExternal) {
      this.log('Serviço é externo. Desanexando monitoramento sem encerrar o processo.');
      this.status = 'stopped';
      this.emit('status-change', this.getStatus());
      return;
    }

    if (this.child && !this.child.killed && this.child.pid) {
      const pid = this.child.pid;
      this.log(`Encerrando processo filho (PID: ${pid})...`);

      if (process.platform === 'win32') {
        // No Windows, encerra a árvore de processos do filho
        await new Promise<void>((resolve) => {
          exec(`taskkill /pid ${pid} /T /F`, (err) => {
            if (err) {
              this.log(`taskkill aviso: ${err.message}`);
            }
            resolve();
          });
        });
      } else {
        this.child.kill('SIGTERM');
        await new Promise<void>((resolve) => {
          const t = setTimeout(() => {
            if (this.child && !this.child.killed) {
              this.child.kill('SIGKILL');
            }
            resolve();
          }, 2000);
          this.child?.once('exit', () => {
            clearTimeout(t);
            resolve();
          });
        });
      }
    }

    this.child = null;
    this.status = 'stopped';
    this.log('Processo filho finalizado com sucesso.');
    this.emit('status-change', this.getStatus());
  }

  public async restart(): Promise<ServiceState> {
    this.log('Reiniciando serviço...');
    await this.stop();
    await new Promise((r) => setTimeout(r, 1000));
    return this.start();
  }
}
