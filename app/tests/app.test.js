/**
 * Unit Tests — DevSecOps Sample App
 * Tests all API routes using supertest + Jest
 */

const request = require('supertest');
const app = require('../src/app');

// ─── Root & Health ─────────────────────────────────────────────────────────────
describe('GET /', () => {
  it('should return app info with 200 status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'DevSecOps Sample App');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('status', 'running');
    expect(Array.isArray(res.body.team)).toBe(true);
    expect(res.body.team).toHaveLength(5);
  });
});

describe('GET /api/health', () => {
  it('should return healthy status with timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
  });
});

// ─── Users ─────────────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  it('should return a list of users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('count');
  });

  it('each user should have id, name, role, and email', async () => {
    const res = await request(app).get('/api/users');
    res.body.users.forEach(user => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('email');
    });
  });
});

// ─── Products ──────────────────────────────────────────────────────────────────
describe('GET /api/products', () => {
  it('should return a list of products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('each product should have id, name, price, and stock', async () => {
    const res = await request(app).get('/api/products');
    res.body.products.forEach(product => {
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('stock');
    });
  });
});

// ─── Merge (Vulnerable Endpoint) ───────────────────────────────────────────────
describe('POST /api/merge', () => {
  it('should merge objects and return result', async () => {
    const payload = { name: 'test', value: 42, nested: { key: 'val' } };
    const res = await request(app).post('/api/merge').send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('merged');
    expect(res.body.merged.name).toBe('test');
    expect(res.body.merged.value).toBe(42);
  });

  it('should handle empty body', async () => {
    const res = await request(app).post('/api/merge').send({});
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('merged');
  });
});

// ─── Clone ─────────────────────────────────────────────────────────────────────
describe('POST /api/clone', () => {
  it('should deep clone the request body', async () => {
    const payload = { a: 1, b: { c: 2 } };
    const res = await request(app).post('/api/clone').send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('clone');
    expect(res.body.clone).toEqual(payload);
  });
});

// ─── Metrics ───────────────────────────────────────────────────────────────────
describe('GET /metrics', () => {
  it('should return Prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
  });
});

// ─── 404 ───────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/this/does/not/exist');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
