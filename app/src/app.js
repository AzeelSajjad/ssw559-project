/**
 * DevSecOps Sample Web Application
 * SSW 559 - Team Project
 * Members: Jaden Fernandes, Ryan Raymundo, Azeel Sajjad, Edzel Roque, Lucas Ha
 *
 * NOTE: This app intentionally uses vulnerable dependency versions
 * (lodash 4.17.11, express 4.17.1) to demonstrate security scanning tools.
 */

const express = require('express');
const _ = require('lodash'); // CVE-2019-10744 (Prototype Pollution) — intentional
const promClient = require('prom-client');

const app = express();
app.use(express.json());

// ─── Prometheus Metrics Setup ─────────────────────────────────────────────────
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Middleware — track metrics on every request
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer({ method: req.method, route: req.path });
  activeConnections.inc();
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    activeConnections.dec();
    end();
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'DevSecOps Sample App',
    version: '1.0.0',
    status: 'running',
    team: ['Jaden Fernandes', 'Ryan Raymundo', 'Azeel Sajjad', 'Edzel Roque', 'Lucas Ha'],
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Users list
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice Johnson', role: 'admin', email: 'alice@example.com' },
    { id: 2, name: 'Bob Smith',    role: 'user',  email: 'bob@example.com' },
    { id: 3, name: 'Carol Davis',  role: 'user',  email: 'carol@example.com' },
  ];
  res.json({ users, count: users.length });
});

// Products list
app.get('/api/products', (req, res) => {
  const products = [
    { id: 1, name: 'Widget A', price: 9.99,  stock: 100 },
    { id: 2, name: 'Widget B', price: 19.99, stock: 50  },
    { id: 3, name: 'Gadget X', price: 49.99, stock: 25  },
  ];
  res.json({ products, count: products.length });
});

// Merge endpoint — uses vulnerable lodash.merge (CVE-2019-10744, Prototype Pollution)
app.post('/api/merge', (req, res) => {
  const result = _.merge({}, req.body); // VULNERABLE: intentional for scanning demo
  res.json({ merged: result, warning: 'This endpoint uses a vulnerable lodash version for demonstration.' });
});

// Deep clone — another lodash usage
app.post('/api/clone', (req, res) => {
  const clone = _.cloneDeep(req.body);
  res.json({ clone });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅  DevSecOps Sample App running on http://localhost:${PORT}`);
    console.log(`📊  Metrics available at http://localhost:${PORT}/metrics`);
  });
}

module.exports = app;
