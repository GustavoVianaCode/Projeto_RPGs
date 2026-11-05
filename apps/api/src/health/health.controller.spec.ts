import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('should return ok status without side effects', () => {
    const res1 = controller.check();
    expect(res1.status).toBe('ok');
    expect(typeof res1.timestamp).toBe('string');
    expect(typeof res1.uptime).toBe('number');

    const res2 = controller.check();
    expect(res2.status).toBe('ok');
    expect(res2.uptime).toBeGreaterThanOrEqual(res1.uptime);
  });
});

