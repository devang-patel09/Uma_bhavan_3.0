import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/health', () => {
  it('should return status 200 with service information and headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'uma-bhavan-api');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.headers).toHaveProperty('x-request-id');
  });

  it('should return 404 with standard envelope for invalid routes', async () => {
    const response = await request(app).get('/api/invalid-route-testing');

    expect(response.status).toBe(404);
  });
});
