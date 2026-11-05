import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

@Controller(['health', 'api/health'])
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

