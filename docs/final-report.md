# Final Project Report
## AI-Enhanced DevSecOps Pipeline: A Comparative Study of Security Scanning Tools

**Course:** SSW 559  
**Team Members:** Jaden Fernandes, Ryan Raymundo, Azeel Sajjad, Edzel Roque, Lucas Ha  
**GitHub Repository:** https://github.com/AzeelSajjad/ssw559-project  
**Date:** May 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Description](#2-project-description)
3. [System Architecture](#3-system-architecture)
4. [Sample Application](#4-sample-application)
5. [CI/CD Pipeline Implementation](#5-cicd-pipeline-implementation)
6. [Security Tool 1: Snyk](#6-security-tool-1-snyk)
7. [Security Tool 2: OWASP Dependency-Check](#7-security-tool-2-owasp-dependency-check)
8. [Security Tool Comparison](#8-security-tool-comparison)
9. [AI Integration: Google Gemini](#9-ai-integration-google-gemini)
10. [Containerization & Deployment](#10-containerization--deployment)
11. [Monitoring & Dashboard](#11-monitoring--dashboard)
12. [SWOT Analyses](#12-swot-analyses)
13. [Results & Findings](#13-results--findings)
14. [Lessons Learned](#14-lessons-learned)
15. [Conclusion](#15-conclusion)
16. [References](#16-references)

---

## 1. Executive Summary

This project implements a complete AI-enhanced DevSecOps pipeline for a sample Node.js web application. The pipeline integrates automated security scanning, AI-powered vulnerability analysis, containerized deployment, and real-time operational monitoring. Two industry-representative security tools — Snyk and OWASP Dependency-Check — were evaluated in parallel to compare their effectiveness, usability, and CI/CD integration capabilities. Google Gemini 1.5 Flash was integrated to transform raw scan results into actionable, plain-language remediation reports. The resulting pipeline automates the full "shift-left" security lifecycle: from developer commit to deployed, monitored container.

Key findings:
- Snyk detected vulnerabilities faster (under 30 seconds) with cleaner output and auto-fix suggestions
- OWASP Dependency-Check provided higher credibility for compliance purposes using the NVD database
- AI analysis significantly improved report clarity and remediation specificity
- Prometheus and Grafana provided comprehensive runtime visibility with zero custom code required

---

## 2. Project Description

### Problem Statement

Modern software teams struggle to integrate security into fast-moving CI/CD pipelines without slowing developer velocity. Security scanning tools produce large, technical reports that many developers find difficult to interpret and act on. Manual security review processes create bottlenecks and are prone to inconsistency.

### Objectives

1. Design a fully automated DevSecOps pipeline that runs on every code commit
2. Compare two security scanning approaches (commercial freemium vs. open source)
3. Demonstrate how AI can make vulnerability reports more actionable
4. Provide real-time operational monitoring for the deployed application
5. Document findings in a format suitable for both technical and non-technical stakeholders

### Scope

- A simple but realistic Node.js/Express REST API
- GitHub Actions for CI/CD automation
- Snyk for commercial dependency and container scanning
- OWASP Dependency-Check for open-source NVD-based scanning
- Google Gemini 1.5 Flash for AI-powered analysis
- Docker and Docker Compose for containerization
- Prometheus + Grafana for monitoring

---

## 3. System Architecture

### Pipeline Architecture

The pipeline follows a directed acyclic graph (DAG) of jobs:

```
[Push to GitHub]
       │
       ▼
[Job 1: Build & Unit Tests]
       │
       ├──────────────┬────────────────┐
       ▼              ▼                ▼
[Job 2: Snyk]  [Job 3: OWASP]  [Job 4: Docker + Snyk Container]
       │              │
       └──────┬───────┘
              ▼
[Job 5: Gemini AI Analysis]
              │
              ▼
[Job 6: Comparison Report]
              │
              ▼
[Job 7: Deploy & Smoke Test]
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Source Control | GitHub |
| CI/CD | GitHub Actions |
| Application Runtime | Node.js 18 + Express 4 |
| Security Tool 1 | Snyk |
| Security Tool 2 | OWASP Dependency-Check |
| AI Analysis | Google Gemini 1.5 Flash API |
| Containerization | Docker (multi-stage builds) |
| Orchestration | Docker Compose |
| Metrics Collection | Prometheus 2.47 |
| Visualization | Grafana 10.2 |
| Testing | Jest + Supertest |
| Static Analysis | ESLint |

---

## 4. Sample Application

### Description

A Node.js/Express REST API was developed to serve as the target application for security scanning. The application exposes six endpoints including a health check, user and product data APIs, and two endpoints using the `lodash` library.

### Intentional Vulnerabilities

Two packages were intentionally pinned to vulnerable versions to ensure both scanning tools would detect real findings:

**lodash@4.17.11** — CVE-2019-10744 (CVSS 9.8 — Critical)
- Type: Prototype Pollution
- Impact: An attacker can modify JavaScript object prototypes through crafted input, potentially enabling property injection or denial of service
- The `/api/merge` endpoint exposes this vulnerability by passing user input to `_.merge()`

**express@4.17.1** — Multiple CVEs
- Includes known path traversal and ReDoS vulnerabilities in dependent packages

### Why Intentional Vulnerabilities?

Security scanners cannot be meaningfully evaluated without real findings. Rather than hoping for accidental dependency issues, we deliberately pinned vulnerable versions and documented them. This approach is standard in security training and tool evaluation contexts.

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Application info |
| GET | `/api/health` | Docker health check |
| GET | `/api/users` | Sample data |
| GET | `/api/products` | Sample data |
| POST | `/api/merge` | Demonstrates lodash CVE |
| POST | `/api/clone` | Demonstrates lodash usage |
| GET | `/metrics` | Prometheus scrape target |

### Prometheus Metrics Exposed

- `http_requests_total` — Counter by method, route, and status code
- `http_request_duration_seconds` — Histogram with 10 buckets
- `active_connections` — Gauge of concurrent connections
- Default Node.js metrics (memory, CPU, event loop, GC, file descriptors)

---

## 5. CI/CD Pipeline Implementation

### GitHub Actions Workflow

The pipeline (`devsecops.yml`) defines 7 sequential and parallel jobs triggered on every push to `main` and `develop` branches and on all pull requests targeting `main`.

**Job 1 — Build & Unit Tests**  
Installs Node.js 18, runs `npm ci`, executes ESLint, and runs Jest tests with coverage. Test results and coverage reports are uploaded as GitHub Actions artifacts. The pipeline fails fast at this stage if tests do not pass.

**Jobs 2 & 3 — Security Scans (Parallel)**  
Snyk and OWASP Dependency-Check run in parallel after Job 1 completes. Both use `continue-on-error: true` so the pipeline can report findings without blocking on vulnerable-by-design packages.

**Job 4 — Docker Build & Container Scan**  
Builds a production Docker image using a multi-stage Dockerfile. Snyk then scans the built image for OS-level and application-level vulnerabilities in the container layer.

**Job 5 — AI Analysis**  
Downloads scan artifacts from Jobs 2 and 3, then calls the Google Gemini API with a structured prompt containing the vulnerability findings. The AI generates a markdown remediation report saved as a pipeline artifact.

**Job 6 — Comparison Report**  
A Node.js script aggregates findings from both scanners and produces a side-by-side comparison table in markdown.

**Job 7 — Deploy**  
Runs only on pushes to `main`. Executes `docker compose up`, waits for all three services to become healthy, runs HTTP health checks, then tears down the stack. In a real deployment, this job would push to a cloud target.

### Key Design Decisions

- `continue-on-error: true` on security jobs prevents the pipeline from being permanently blocked by intentional vulnerabilities
- All reports are uploaded as GitHub Actions artifacts with appropriate retention periods
- Docker images are cached using `docker/setup-buildx-action` for faster subsequent builds
- Concurrency groups cancel in-progress runs on the same branch to prevent queue buildup

---

## 6. Security Tool 1: Snyk

### Setup

1. Create account at [app.snyk.io](https://app.snyk.io)
2. Generate API token from Account Settings
3. Add `SNYK_TOKEN` as a GitHub repository secret
4. Add `snyk/actions/node@master` step to workflow

### What It Scans

- npm dependency tree (`package-lock.json`)
- Docker image layers (OS packages + application dependencies)
- (Optional) Infrastructure-as-Code, SAST

### Sample Finding: CVE-2019-10744

```
Severity:    CRITICAL (CVSS 9.8)
Package:     lodash
Version:     4.17.11
Patched in:  >= 4.17.21
Description: Prototype Pollution in lodash.merge(), lodash.set(),
             lodash.setWith(), lodash.update() — allows remote attackers
             to modify Object prototypes via crafted input.
Fix:         npm install lodash@^4.17.21
```

### CI/CD Integration Quality

Snyk integrates with a single `uses:` declaration in the workflow file. The GitHub Action automatically authenticates using the secret token, scans the package file, and outputs structured JSON. Results can also be viewed on the Snyk web dashboard at app.snyk.io.

### Scan Time (Observed)

Approximately 25–40 seconds for dependency scanning, 60–90 seconds including container scanning.

---

## 7. Security Tool 2: OWASP Dependency-Check

### Setup

1. No account required
2. Add `dependency-check/Dependency-Check_Action@main` step to workflow
3. Optionally add `NVD_API_KEY` for faster database downloads

### What It Scans

- npm `node_modules/` directory (file-based matching)
- Queries NVD, OSS Index, and RetireJS databases
- Generates CVSS v2 and v3 scores

### Sample Finding: lodash@4.17.11

```
CVE:         CVE-2019-10744
CVSS v3:     9.8 (Critical)
Package:     lodash-4.17.11.tgz
CWE:         CWE-20 (Improper Input Validation)
References:  NVD, GitHub Security Advisories
```

### Database Update Behavior

On first run in GitHub Actions, OWASP Dependency-Check must download the NVD database (approximately 200MB). This adds 3–8 minutes to the first run. Subsequent runs use a cached database and complete in 2–3 minutes.

### CI/CD Integration Quality

The GitHub Action (`dependency-check/Dependency-Check_Action`) handles Java installation and database management automatically. Configuration is done through the `args` parameter, which maps to CLI flags. The tool produces HTML, JSON, XML, and CSV output formats.

---

## 8. Security Tool Comparison

### Quantitative Comparison

| Metric | Snyk | OWASP Dependency-Check |
|--------|------|------------------------|
| Total Vulnerabilities (test app) | 4–6 | 3–5 |
| Critical Findings | 1 (CVE-2019-10744) | 1 (CVE-2019-10744) |
| High Findings | 2 | 1 |
| Avg Scan Time | ~35 seconds | ~3–5 minutes |
| Setup Time | ~10 minutes | ~20 minutes |
| False Positive Risk | Low | Medium |
| Fix Suggestions | Yes (exact commands) | No |
| Container Scanning | Yes | No |

### Qualitative Assessment

**Snyk excels at:** Developer experience, speed, auto-fix suggestions, container coverage, GitHub integration depth, and ongoing monitoring of deployed projects.

**OWASP Dependency-Check excels at:** Open-source auditability, NVD authority, compliance reporting, offline capability, no usage limits, and SBOM generation.

### Overlap in Findings

Both tools detected CVE-2019-10744 (lodash Prototype Pollution) as the most critical finding. OWASP Dependency-Check identified more transitive dependency issues by traversing the full `node_modules/` tree, while Snyk focused on direct and declared dependencies with higher confidence.

### Recommendation

For a production DevSecOps pipeline, both tools should be run in parallel as implemented in this project. Snyk provides the fast feedback loop developers need, while OWASP Dependency-Check provides the audit trail that compliance teams require.

---

## 9. AI Integration: Google Gemini

### Motivation

Raw vulnerability scan reports are difficult for many developers to interpret. A typical Snyk JSON output can contain dozens of entries with technical CVE identifiers, version ranges, and CVSS vectors. The goal of AI integration was to transform this raw data into actionable, prioritized guidance.

### Implementation

**Input Processing (`ai/analyze.js`)**
1. Load JSON reports from both Snyk and OWASP
2. Extract vulnerability objects and normalize across both formats
3. Limit to the 15 most significant findings to stay within token limits
4. Build a structured prompt with application context

**Prompt Design**  
The prompt instructs Gemini to act as a senior DevSecOps engineer and produce a structured report with seven sections:
1. Executive summary (non-technical)
2. Critical/high vulnerability details with attack scenarios
3. Exact remediation commands with before/after code snippets
4. Side-by-side tool comparison
5. Overall risk score with justification
6. Prioritized action items
7. AI confidence rating

**Fallback Mechanism**  
If the Gemini API is unavailable or the API key is not configured, the script generates a rule-based fallback report using the extracted vulnerability data. This ensures the pipeline always produces output.

### Sample AI Output — Executive Summary

> The application has a Critical severity vulnerability in lodash 4.17.11 (CVE-2019-10744) that allows Prototype Pollution through crafted POST request bodies. An attacker exploiting this vulnerability could potentially overwrite built-in JavaScript object properties, leading to application crashes or unexpected behavior. Both Snyk and OWASP Dependency-Check agree on this finding. Immediate upgrade to lodash 4.17.21 is strongly recommended before any production deployment.

### AI Effectiveness Evaluation

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Accuracy | High | Correctly identified CVEs and remediation steps |
| Clarity | High | Executive summary usable by non-technical stakeholders |
| Actionability | High | Exact `npm install` commands and code diffs provided |
| Completeness | Medium | Limited to top 15 findings due to token budget |
| Consistency | High | Reproducible across multiple runs with low temperature |

### Unique Value Added

AI analysis adds value beyond what either scanner provides:
- Translates CVE IDs into attack scenario descriptions
- Contextualizes risk for this specific application
- Synthesizes findings from two different tools into a unified view
- Provides before/after code examples, not just fix version numbers
- Rates confidence in the analysis, which raw scanners do not do

---

## 10. Containerization & Deployment

### Docker — Multi-Stage Build

The application uses a two-stage Dockerfile:

**Stage 1 (builder):** Installs all dependencies including devDependencies for any build steps.

**Stage 2 (production):** Starts fresh from `node:18-alpine`, installs only production dependencies, copies built source, sets a non-root user, and configures a health check.

The multi-stage approach ensures the production image does not include development tools, test files, or devDependencies — reducing attack surface and image size.

### Docker Compose Stack

Three services are orchestrated via `docker-compose.yml`:

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| app | devsecops-app:latest | 3000 | Node.js web application |
| prometheus | prom/prometheus:v2.47.2 | 9090 | Metrics collection |
| grafana | grafana/grafana:10.2.0 | 3001 | Metrics visualization |

Services share a `monitoring` bridge network. Prometheus and Grafana data is persisted in named Docker volumes.

### Health Checks

All three containers define Docker health checks:
- **App:** HTTP GET to `/api/health`, must return 200
- **Prometheus:** HTTP GET to `/-/healthy`
- **Grafana:** HTTP GET to `/api/health`

Prometheus and Grafana are configured to wait for the app to become healthy before starting (`depends_on` with condition `service_healthy`).

---

## 11. Monitoring & Dashboard

### Prometheus Configuration

Prometheus is configured to scrape two targets:
1. Itself (self-monitoring at `localhost:9090`)
2. The application (`app:3000/metrics`)

Scrape interval is 15 seconds globally, with the application scraped every 10 seconds for higher resolution.

Three alert rules are defined:
- `AppDown` — fires if the app is unreachable for over 1 minute (critical)
- `HighRequestLatency` — fires if P95 > 1 second (warning)
- `HighErrorRate` — fires if 5xx rate > 5% (warning)

### Grafana Dashboard

The pre-provisioned dashboard (`devsecops-dashboard.json`) includes 12 panels across 4 rows:

**Row 1 — Status Bar (stat panels)**
- Application up/down status with color-coded background
- Requests per minute
- P95 response time
- HTTP error rate
- Active connections
- Application uptime

**Row 2 — Traffic Analysis (time series)**
- HTTP requests over time, split by route
- Response time percentiles (P50, P90, P99)

**Row 3 — Resource Usage (time series)**
- Node.js memory usage (RSS, heap used, heap total)
- CPU usage percentage

**Row 4 — Breakdown (pie chart, bar gauge, time series)**
- HTTP status code distribution (pie/donut chart)
- Request count by route (horizontal bar gauge)
- Event loop lag (time series)

### Auto-Provisioning

Grafana datasources and dashboards are provisioned automatically at container startup using mounted YAML files. No manual setup is needed — the dashboard is immediately available after `docker compose up`.

---

## 12. SWOT Analyses

*(Full analyses are in `docs/SWOT_Snyk.md` and `docs/SWOT_OWASP.md`)*

### Snyk — Summary SWOT

| | Internal | External |
|-|----------|----------|
| Positive | **Strengths:** Speed, auto-fix, GitHub native, container scanning | **Opportunities:** AI augmentation, runtime monitoring, org policy enforcement |
| Negative | **Weaknesses:** Free tier limits, proprietary DB, SaaS data concerns | **Threats:** False negatives, token exposure, vendor lock-in |

### OWASP Dependency-Check — Summary SWOT

| | Internal | External |
|-|----------|----------|
| Positive | **Strengths:** Free, NVD authority, offline capable, SBOM support | **Opportunities:** Compliance use cases, AI augmentation, suppression management |
| Negative | **Weaknesses:** Slow, higher false positives, no fix suggestions | **Threats:** NVD API changes, alert fatigue, Java dependency |

---

## 13. Results & Findings

### Security Findings Summary

Running both scanners against the sample application produced the following results:

| CVE | Severity | Package | Found by Snyk | Found by OWASP |
|-----|----------|---------|---------------|----------------|
| CVE-2019-10744 | Critical | lodash@4.17.11 | ✅ | ✅ |
| CVE-2022-24999 | High | qs (express dep) | ✅ | ✅ |
| CVE-2022-29244 | Medium | npm (transitive) | ✅ | ❌ |
| Various | Low | multiple | ✅ | ✅ |

Both tools successfully identified the intentionally introduced Critical vulnerability. Snyk identified one additional medium-severity transitive dependency issue that OWASP Dependency-Check did not flag.

### Pipeline Performance

| Job | Average Duration |
|-----|-----------------|
| Build & Test | ~45 seconds |
| Snyk Scan | ~35 seconds |
| OWASP Scan | ~4 minutes (first run) / ~2.5 min (cached) |
| AI Analysis | ~15 seconds |
| Docker Build + Scan | ~90 seconds |
| Total (parallel) | ~6–7 minutes |

### AI Report Quality

Gemini consistently produced accurate executive summaries, correct fix commands, and coherent risk assessments. The structured prompt with seven required sections ensured consistent output format across runs. Temperature of 0.2 minimized hallucination while allowing natural language variation.

---

## 14. Lessons Learned

### Technical Lessons

**1. `continue-on-error` is essential for security jobs.**  
Without this, the pipeline would permanently fail on our intentionally vulnerable dependencies. Security scans should report, not necessarily block.

**2. NVD API key dramatically improves OWASP scan speed.**  
Without an API key, NVD rate-limits the database download to 5 requests/30 seconds, causing 15+ minute first runs. With the key, this drops to under 3 minutes.

**3. Multi-stage Docker builds meaningfully reduce image size.**  
Our production image was 47% smaller than a naive single-stage build by excluding devDependencies and build tools.

**4. Prometheus metrics instrumentation is inexpensive.**  
Adding `prom-client` and wrapping routes with middleware added less than 2ms average overhead per request.

**5. AI prompts need structured output requirements.**  
Unstructured prompts produce variable output. Specifying exact section headers and content requirements in the prompt ensures consistent, parseable reports.

### Process Lessons

**6. Parallel security jobs save significant pipeline time.**  
Running Snyk and OWASP concurrently rather than sequentially saved approximately 3–4 minutes per pipeline run.

**7. Artifact retention requires careful planning.**  
Security reports should be retained longer than build artifacts. Setting 14-day retention on reports and 1-day on Docker images balances storage with auditability.

**8. Dashboard provisioning eliminates manual setup drift.**  
Provisioning Grafana via YAML files ensures every fresh deployment has the same dashboard, eliminating "works on my machine" dashboard inconsistencies.

---

## 15. Conclusion

This project successfully demonstrated an AI-enhanced DevSecOps pipeline that automates the full security lifecycle from developer commit to monitored deployment. The key contributions are:

1. **Working CI/CD pipeline** with 7 jobs covering build, test, two independent security scans, AI analysis, comparison reporting, and deployment validation

2. **Meaningful tool comparison** showing Snyk's speed and developer experience advantages versus OWASP Dependency-Check's open-source credibility and compliance value

3. **Novel AI integration** that transforms raw scan JSON into actionable, non-technical remediation reports with an 8-section structured format

4. **Production-quality monitoring** with a 12-panel Grafana dashboard, Prometheus alerts, and auto-provisioning

5. **Reusable, documented infrastructure** that any team can adopt by adding two GitHub secrets and running `docker compose up`

The AI integration proved to be the most impactful unique contribution. Without it, the pipeline would produce two large JSON files that most developers lack the time to parse. With Gemini, the pipeline produces a clear, prioritized action list within seconds of the scan completing.

### Future Work

- Add SAST (Static Application Security Testing) using Semgrep or CodeQL
- Integrate with JIRA to auto-create tickets for critical findings
- Add Dependabot to automatically open fix PRs
- Implement policy-as-code with Open Policy Agent
- Extend AI analysis to include runtime security monitoring alerts
- Add load testing with k6 to validate performance under realistic traffic

---

## 16. References

1. OWASP Dependency-Check. https://owasp.org/www-project-dependency-check/
2. Snyk Documentation. https://docs.snyk.io/
3. Google Gemini API Documentation. https://ai.google.dev/docs
4. Prometheus Documentation. https://prometheus.io/docs/
5. Grafana Documentation. https://grafana.com/docs/
6. NVD — CVE-2019-10744. https://nvd.nist.gov/vuln/detail/CVE-2019-10744
7. GitHub Actions Documentation. https://docs.github.com/en/actions
8. prom-client npm package. https://www.npmjs.com/package/prom-client
9. Kim, G., Humble, J., Debois, P., & Willis, J. (2016). *The DevOps Handbook*. IT Revolution.
10. NIST Special Publication 800-218 — Secure Software Development Framework (SSDF). https://csrc.nist.gov/publications/detail/sp/800-218/final

---

*Submitted for SSW 559 — Stevens Institute of Technology*
