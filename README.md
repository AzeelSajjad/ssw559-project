# AI-Enhanced DevSecOps Pipeline

> **SSW 559 — Team Project**  
> **Team:** Jaden Fernandes · Ryan Raymundo · Azeel Sajjad · Edzel Roque · Lucas Ha  
> **GitHub:** [AzeelSajjad/ssw559-project](https://github.com/AzeelSajjad/ssw559-project)

---

## Overview

This project designs and evaluates an AI-enhanced DevSecOps pipeline using a sample Node.js web application. It compares two security scanning tools (Snyk and OWASP Dependency-Check), integrates Google Gemini AI for vulnerability analysis and remediation suggestions, and provides real-time monitoring via Prometheus and Grafana.

---

## Architecture

```
Developer Push
      │
      ▼
┌─────────────────────────────────────────────────────┐
│              GitHub Actions Pipeline                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Build &  │  │  Snyk    │  │  OWASP Dependency │  │
│  │  Tests   │─>│  Scan    │  │      Check        │  │
│  └──────────┘  └────┬─────┘  └────────┬──────────┘  │
│                     │                 │             │
│                     └────────┬────────┘             │
│                              ▼                      │
│                    ┌──────────────────┐             │
│                    │  Gemini AI       │             │
│                    │  Analysis        │             │
│                    └────────┬─────────┘             │
│                             ▼                       │
│                    ┌──────────────────┐             │
│                    │  Docker Build    │             │
│                    │  + Container     │             │
│                    │  Scan (Snyk)     │             │
│                    └────────┬─────────┘             │
└─────────────────────────────┼───────────────────────┘
                              ▼
              ┌───────────────────────────┐
              │      Docker Compose       │
              │                           │
              │  ┌──────┐ ┌────────────┐  │
              │  │ App  │ │ Prometheus │  │
              │  │:3000 │ │   :9090    │  │
              │  └──────┘ └────────────┘  │
              │  ┌──────────────────────┐ │
              │  │       Grafana        │ │
              │  │        :3001         │ │
              │  └──────────────────────┘ │
              └───────────────────────────┘
```

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 18+](https://nodejs.org/)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/AzeelSajjad/ssw559-project.git
cd ssw559-project
```

### 2. Start the full stack
```bash
docker compose up -d --build
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Web App | http://localhost:3000 | — |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3001 | admin / devsecops123 |

### 3. Run tests locally
```bash
cd app
npm install
npm test
```

### 4. Stop the stack
```bash
docker compose down -v
```

---

## Project Structure

```
ssw559-project/
├── .github/
│   └── workflows/
│       └── devsecops.yml          # Full CI/CD pipeline
├── app/
│   ├── src/
│   │   └── app.js                 # Node.js Express application
│   ├── tests/
│   │   └── app.test.js            # Jest unit tests
│   ├── Dockerfile                 # Multi-stage Docker build
│   ├── package.json               # Dependencies (incl. vulnerable versions)
│   └── .eslintrc.json             # ESLint config
├── monitoring/
│   ├── prometheus.yml             # Prometheus scrape config
│   ├── alerts.yml                 # Alert rules
│   └── grafana/
│       ├── provisioning/          # Auto-provisioned datasource + dashboards
│       └── dashboards/
│           └── devsecops-dashboard.json   # Grafana dashboard
├── ai/
│   ├── analyze.js                 # Gemini API vulnerability analyzer
│   └── package.json
├── scripts/
│   └── generate-comparison.js     # Snyk vs OWASP comparison report
├── docs/
│   ├── SWOT_Snyk.md               # Snyk SWOT analysis
│   ├── SWOT_OWASP.md              # OWASP Dependency-Check SWOT analysis
│   └── final-report.md            # Project final report
├── docker-compose.yml             # Full stack orchestration
└── README.md
```

---

## CI/CD Pipeline Jobs

| Job | Description | Depends On |
|-----|-------------|------------|
| `build-and-test` | Install, lint, run Jest tests | — |
| `snyk-dependency-scan` | Snyk npm dependency scan | build-and-test |
| `owasp-dependency-check` | OWASP NVD-based scan | build-and-test |
| `docker-build-and-scan` | Build image + Snyk container scan | build-and-test |
| `ai-vulnerability-analysis` | Gemini AI analysis of scan results | snyk + owasp |
| `generate-comparison-report` | Snyk vs OWASP comparison doc | snyk + owasp + AI |
| `deploy` | Validate + smoke-test full stack | AI + docker |

---

## Security Tools

### Tool 1: Snyk
- **Type:** Dependency + Container scanning (commercial freemium)
- **Trigger:** Every push/PR via `snyk/actions/node@master`
- **Output:** `snyk-dep-report.json`, `snyk-container-report.json`
- **Setup:** Add `SNYK_TOKEN` to GitHub Secrets (see below)

### Tool 2: OWASP Dependency-Check
- **Type:** Dependency scanning using NVD (open source)
- **Trigger:** Every push/PR via `dependency-check/Dependency-Check_Action`
- **Output:** `owasp-reports/dependency-check-report.json`
- **Setup:** Optionally add `NVD_API_KEY` to GitHub Secrets for faster DB downloads

---

## GitHub Secrets Required

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `SNYK_TOKEN` | Snyk API authentication token | [app.snyk.io](https://app.snyk.io) → Account Settings → API Token |
| `GEMINI_API_KEY` | Google Gemini API key | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `NVD_API_KEY` | (Optional) NVD API key for faster OWASP scans | [nvd.nist.gov/developers/request-an-api-key](https://nvd.nist.gov/developers/request-an-api-key) |

---

## Application API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | App info + team members |
| GET | `/api/health` | Health check (used by Docker) |
| GET | `/api/users` | Sample users list |
| GET | `/api/products` | Sample products list |
| POST | `/api/merge` | lodash.merge demo (vulnerable — CVE-2019-10744) |
| POST | `/api/clone` | lodash.cloneDeep demo |
| GET | `/metrics` | Prometheus metrics scrape endpoint |

---

## Intentionally Vulnerable Dependencies

The application uses **intentionally outdated packages** to demonstrate security scanner detection:

| Package | Version Used | Safe Version | CVE |
|---------|-------------|--------------|-----|
| `lodash` | `4.17.11` | `4.17.21` | CVE-2019-10744 (Prototype Pollution) |
| `express` | `4.17.1` | `4.18.2+` | Multiple known CVEs |


---

## Monitoring & Dashboard

After running `docker compose up -d`, navigate to **http://localhost:3001** (Grafana).

**Login:** `admin` / `devsecops123`

The pre-provisioned dashboard includes:
- Application status (up/down)
- Requests per minute
- P50 / P90 / P95 / P99 response times
- HTTP error rate
- CPU and memory usage
- Active connections
- Event loop lag
- Request breakdown by route and status code

---

## AI Integration

The pipeline uses **Google Gemini 1.5 Flash** to:

1. Parse JSON reports from both Snyk and OWASP
2. Identify critical and high-severity vulnerabilities
3. Generate plain-English explanations for each finding
4. Suggest exact npm commands to fix vulnerabilities
5. Produce a side-by-side tool comparison
6. Assign an overall risk score
7. Prioritize remediation actions for the development team

The AI report is saved as a GitHub Actions artifact (`ai-vulnerability-report`) after every pipeline run.

---

## License

MIT — for academic use only.