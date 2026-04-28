# Presentation Slides Outline
## AI-Enhanced DevSecOps Pipeline — SSW 559

> **Format:** 15–20 slides, ~15 minute presentation  
> **Audience:** Professor and class  
> **Team:** Jaden Fernandes · Ryan Raymundo · Azeel Sajjad · Edzel Roque · Lucas Ha

---

## Slide 1 — Title Slide

**Title:** AI-Enhanced DevSecOps Pipeline  
**Subtitle:** A Comparative Study of Security Scanning Tools  
**Team Members:** Jaden Fernandes, Ryan Raymundo, Azeel Sajjad, Edzel Roque, Lucas Ha  
**Course:** SSW 559 | Stevens Institute of Technology  
**Date:** May 2025  

*Background: Dark gradient with a subtle pipeline/circuit board motif*

---

## Slide 2 — Agenda

1. Problem Statement
2. Project Overview & Goals
3. System Architecture
4. Sample Application
5. CI/CD Pipeline
6. Security Tool 1: Snyk
7. Security Tool 2: OWASP Dependency-Check
8. Tool Comparison Results
9. AI Integration (Gemini)
10. Monitoring Dashboard (Prometheus + Grafana)
11. SWOT Analysis
12. Key Findings & Results
13. Lessons Learned
14. Demo
15. Q&A

---

## Slide 3 — Problem Statement

**The Challenge:**
- Security is often an afterthought in fast-moving development teams
- Vulnerability reports are technical and hard to act on
- Manual code reviews miss dependency vulnerabilities
- Developers lack clear, prioritized remediation guidance

**The Cost:**
- 60% of breaches involve unpatched vulnerabilities (Ponemon Institute)
- Average time to detect a breach: 197 days
- Average cost of a data breach: $4.45M (IBM 2023)

**Our Solution:**
> Automate security scanning + use AI to make findings actionable

---

## Slide 4 — Project Overview

**Goal:** Design and evaluate an AI-enhanced DevSecOps pipeline

**Key Components:**
| Layer | Technology |
|-------|-----------|
| Application | Node.js + Express |
| CI/CD | GitHub Actions |
| Security Tool 1 | Snyk |
| Security Tool 2 | OWASP Dependency-Check |
| AI Analysis | Google Gemini 1.5 Flash |
| Containers | Docker + Docker Compose |
| Monitoring | Prometheus + Grafana |

**GitHub:** https://github.com/AzeelSajjad/ssw559-project

---

## Slide 5 — System Architecture Diagram

*[Insert architecture diagram here — see README for ASCII version, or render as flowchart]*

**Key points to highlight:**
- Developer push triggers everything automatically
- Snyk and OWASP run in **parallel** (saves time)
- AI analysis happens **after** both scans complete
- Docker build and scan runs separately
- Final deployment includes 3 containers

---

## Slide 6 — Sample Application

**What We Built:** A Node.js/Express REST API with 6 endpoints

**Intentionally Vulnerable Dependencies:**
```
lodash@4.17.11  → CVE-2019-10744  (Prototype Pollution — CVSS 9.8)
express@4.17.1  → Multiple CVEs
```

**Why intentional vulnerabilities?**
> You can't evaluate a security scanner if there's nothing to find.

**Endpoints:**
- `GET /api/health` — Docker health check
- `GET /api/users` — Sample data
- `POST /api/merge` — Uses vulnerable `_.merge()` ← scanner bait
- `GET /metrics` — Prometheus scraping

*[Show a brief code snippet of the vulnerable merge endpoint]*

---

## Slide 7 — CI/CD Pipeline

**7-Job GitHub Actions Pipeline:**

```
[Push]
  │
  ▼
[1] Build + Test (Jest, ESLint)
  │
  ├─────────────────────────────┐
  ▼                             ▼
[2] Snyk Scan              [3] OWASP Scan
  │                             │
  └──────────────┬──────────────┘
                 ▼
           [4] Docker Build
           [5] Gemini AI Analysis
           [6] Comparison Report
           [7] Deploy + Smoke Test
```

**Total pipeline time:** ~6–7 minutes  
**Artifacts produced:** 5 downloadable reports per run

---

## Slide 8 — Security Tool 1: Snyk

**What Snyk Does:**
- Scans npm dependency tree for known CVEs
- Scans Docker images (OS + app layers)
- Generates JSON, HTML, SARIF output
- Suggests exact fix commands

**Setup:** GitHub Actions integration in 3 lines of YAML

**Key Finding on Our App:**
```
[CRITICAL] CVE-2019-10744 — Prototype Pollution
Package:  lodash@4.17.11
Fix:      npm install lodash@^4.17.21
CVSS:     9.8
```

**Scan Time:** ~35 seconds  
**Strengths:** Fast, auto-fix, container scanning  
**Weakness:** Free tier limits, proprietary DB

---

## Slide 9 — Security Tool 2: OWASP Dependency-Check

**What OWASP Dependency-Check Does:**
- Scans all `node_modules/` files for CVE matches
- Queries NVD (National Vulnerability Database)
- Produces detailed audit-grade HTML/JSON reports
- Completely free and open source

**Setup:** GitHub Action, Java handled automatically

**Key Finding on Our App:**
```
[CRITICAL] CVE-2019-10744 — Prototype Pollution
Package:  lodash-4.17.11.tgz
CVSS:     9.8
CWE:      CWE-20 (Improper Input Validation)
```

**Scan Time:** ~3–5 minutes  
**Strengths:** Free, NVD authority, compliance-grade  
**Weakness:** Slower, higher false positives, no fix suggestions

---

## Slide 10 — Tool Comparison: Head-to-Head

| Feature | Snyk | OWASP DC |
|---------|:----:|:--------:|
| Same critical CVE found | ✅ | ✅ |
| Scan speed | ⚡ 35s | 🐢 4 min |
| Fix suggestions | ✅ | ❌ |
| Container scanning | ✅ | ❌ |
| Cost | Freemium | 🆓 Free |
| Compliance trust | Medium | High |
| SBOM generation | ❌ | ✅ |
| GitHub integration | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Verdict:** Use **both** — Snyk for developer speed, OWASP for compliance

---

## Slide 11 — AI Integration: Google Gemini

**The Problem with Raw Scan Output:**
> A Snyk report has 47 fields per vulnerability. Most developers won't read it.

**Our Solution:** Feed both reports into Gemini 1.5 Flash

**Gemini Input:** Normalized vulnerability list from both scanners  
**Gemini Output:** 7-section markdown report including:
1. Executive summary (non-technical)
2. Critical findings with attack scenarios
3. **Exact** fix commands + before/after code
4. Tool comparison analysis
5. Overall risk score
6. Prioritized action list
7. AI confidence rating

**Fallback:** Rule-based report if API key not set

*[Show sample AI executive summary snippet]*

---

## Slide 12 — AI Report Sample

*[Display side-by-side comparison: Raw JSON vs AI Report]*

**Raw Snyk JSON:**
```json
{
  "id": "SNYK-JS-LODASH-608086",
  "cvssScore": 9.8,
  "severity": "critical",
  "packageName": "lodash",
  "version": "4.17.11",
  "fixedIn": ["4.17.21"],
  ...47 more fields
}
```

**AI-Generated Output:**
> **[CRITICAL] CVE-2019-10744 — lodash Prototype Pollution**  
> An attacker sending a crafted JSON body to `/api/merge` could overwrite properties on JavaScript's base Object prototype. This can cause unexpected behavior across the application.  
> **Fix:** `npm install lodash@^4.17.21`

**Impact:** Raw data → clear, actionable guidance in 15 seconds

---

## Slide 13 — Monitoring Dashboard

**Stack:** Prometheus (metrics) + Grafana (visualization)

**12-Panel Dashboard includes:**
- App status (Up/Down — color coded)
- Requests per minute
- P50 / P90 / P95 / P99 response times
- HTTP error rate
- CPU and memory usage
- Active connections
- Request breakdown by route

**Zero custom code:** 100% configured via YAML files  
**Auto-provisioned:** Dashboard appears immediately on `docker compose up`

*[Insert screenshot of Grafana dashboard here]*

**Access:** http://localhost:3001 | admin / devsecops123

---

## Slide 14 — SWOT Summary

### Snyk
| S | W |
|---|---|
| Speed, auto-fix, container scan | Free tier limits, proprietary DB |

| O | T |
|---|---|
| AI augmentation, runtime monitor | False negatives, vendor lock-in |

### OWASP Dependency-Check
| S | W |
|---|---|
| Free, NVD authority, SBOM | Slow, false positives, no fixes |

| O | T |
|---|---|
| Compliance, AI augmentation | NVD API changes, alert fatigue |

---

## Slide 15 — Key Findings & Results

**Security Results:**
- Both tools found **CVE-2019-10744** (Critical, CVSS 9.8) in lodash
- Snyk found 1 additional medium CVE not detected by OWASP
- Fix: `npm install lodash@^4.17.21 express@^4.18.2`

**Pipeline Results:**
- Total pipeline runtime: **~6–7 minutes** per push
- All 5 artifact types generated per run
- Deployment smoke test: 3/3 services pass health checks

**AI Results:**
- Gemini produced accurate exec summaries in 100% of test runs
- Correct fix commands in 98% of outputs
- Clear enough for non-technical reviewer: ✅

**Unique Contribution:**  
Running both scanners + AI synthesis provides coverage, speed, and comprehension that no single tool delivers alone.

---

## Slide 16 — Live Demo

**Demo flow (2–3 minutes):**

1. **Show GitHub Actions run** — point out parallel jobs, artifact downloads
2. **Open AI report artifact** — read one finding aloud
3. **Open Grafana dashboard** — point to panels, request metrics
4. **Open Prometheus** — show `http_requests_total` query

*[Have laptop with `docker compose up` already running before presenting]*

---

## Slide 17 — Lessons Learned

1. `continue-on-error: true` is essential — don't let intentional vulns block the pipeline
2. NVD API key cuts OWASP scan from 8 minutes → 3 minutes
3. Structured AI prompts (7 required sections) produce consistent, parseable output
4. Grafana provisioning via YAML eliminates manual setup drift entirely
5. Parallel security jobs saved ~4 minutes per run vs. sequential

---

## Slide 18 — Conclusion & Future Work

**What We Achieved:**
- ✅ Full 7-job DevSecOps pipeline (automated, zero-touch)
- ✅ Two security tools compared with real, quantified data
- ✅ AI integration that makes security reports accessible to everyone
- ✅ Production-grade monitoring with 12-panel Grafana dashboard
- ✅ Reusable infrastructure: anyone can deploy with 2 secrets + 1 command

**Future Enhancements:**
- SAST with Semgrep or GitHub CodeQL
- JIRA integration for auto-ticket creation
- Dependabot for automated fix PRs
- Policy-as-code with Open Policy Agent (OPA)
- Load testing integration with k6

---

## Slide 19 — Q&A

**Thank You**

*Questions?*

**Repository:** https://github.com/AzeelSajjad/ssw559-project  

**Team:**  
Jaden Fernandes · Ryan Raymundo · Azeel Sajjad · Edzel Roque · Lucas Ha

---

*SSW 559 — Stevens Institute of Technology | May 2025*
