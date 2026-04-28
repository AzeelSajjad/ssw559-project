/**
 * Comparison Report Generator
 * Compares Snyk vs OWASP scan results and merges with AI report
 * into a single markdown comparison document.
 *
 * Usage: node generate-comparison.js <snyk.json> <owasp.json> <ai-report.md>
 */

'use strict';

const fs   = require('fs');
const path = require('path');

function readJson(p) {
  if (!p || !fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function readFile(p) {
  if (!p || !fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

function countBySeverity(vulns) {
  return vulns.reduce((acc, v) => {
    const s = (v.severity || 'unknown').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
}

function snykStats(report) {
  if (!report || !report.vulnerabilities) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, scanTime: 'N/A' };
  const counts = countBySeverity(report.vulnerabilities);
  return {
    total:    report.vulnerabilities.length,
    critical: counts.critical || 0,
    high:     counts.high || 0,
    medium:   counts.medium || 0,
    low:      counts.low || 0,
    scanTime: report.summary?.totalTime || 'N/A',
  };
}

function owaspStats(report) {
  if (!report || !report.dependencies) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, scanTime: 'N/A' };
  const vulns = [];
  for (const dep of report.dependencies) {
    for (const v of dep.vulnerabilities || []) vulns.push(v);
  }
  const counts = countBySeverity(vulns);
  return {
    total:    vulns.length,
    critical: counts.critical || 0,
    high:     counts.high || 0,
    medium:   counts.medium || 0,
    low:      counts.low || 0,
    scanTime: 'See pipeline logs',
  };
}

function main() {
  const snykPath  = process.argv[2];
  const owaspPath = process.argv[3];
  const aiPath    = process.argv[4];

  const snyk  = snykStats(readJson(snykPath));
  const owasp = owaspStats(readJson(owaspPath));
  const aiReport = readFile(aiPath);

  const report = `# 📊 Security Tool Comparison Report

> **Generated:** ${new Date().toISOString()}  
> **Project:** SSW 559 — AI-Enhanced DevSecOps Pipeline  
> **Tools Compared:** Snyk (Tool 1) vs OWASP Dependency-Check (Tool 2)

---

## Vulnerability Count Comparison

| Severity | Snyk | OWASP Dependency-Check |
|----------|------|------------------------|
| 🔴 Critical | ${snyk.critical} | ${owasp.critical} |
| 🟠 High | ${snyk.high} | ${owasp.high} |
| 🟡 Medium | ${snyk.medium} | ${owasp.medium} |
| 🟢 Low | ${snyk.low} | ${owasp.low} |
| **Total** | **${snyk.total}** | **${owasp.total}** |

---

## Feature Comparison Matrix

| Feature | Snyk | OWASP Dependency-Check |
|---------|------|------------------------|
| Vulnerability Database | Snyk proprietary + CVE | NVD, OSS Index, RetireJS |
| CI/CD Integration | Native GitHub Action | Requires Java, more setup |
| Container Scanning | ✅ Yes | ❌ No |
| License Compliance | ✅ Yes (paid) | ❌ No |
| Output Formats | JSON, HTML, SARIF | JSON, XML, HTML, CSV |
| Real-time Monitoring | ✅ Yes | ❌ No |
| Fix Suggestions | ✅ Automated PRs | ❌ No |
| False Positive Rate | Low | Medium |
| Open Source | ❌ Commercial (freemium) | ✅ Yes |
| Scan Speed | Fast (~30s) | Slower (2–5 min) |
| CVSS Scoring | ✅ Yes | ✅ Yes |
| Historical Trending | ✅ Yes (dashboard) | ❌ Limited |

---

## Qualitative Analysis

### Snyk — Strengths & Weaknesses

**Strengths:**
- Very fast scanning — results in under 30 seconds
- Tightly integrated with GitHub (native Action, PR comments)
- Suggests exact fix commands and can auto-open PRs
- Covers both code dependencies and Docker containers
- Clean, developer-friendly output format

**Weaknesses:**
- Requires commercial account for full features
- Proprietary database — not all CVEs covered
- Usage limits on free tier
- Internet-dependent (no air-gap support)

### OWASP Dependency-Check — Strengths & Weaknesses

**Strengths:**
- Fully open source and free
- Queries NVD (National Vulnerability Database) — authoritative source
- Integrates with multiple ecosystems (Maven, Gradle, npm, etc.)
- Offline capable after initial database download
- Widely accepted in enterprise/compliance settings

**Weaknesses:**
- Slower scan time (needs database download)
- Higher false positive rate (name-based matching)
- No automatic fix suggestions
- More complex CI/CD setup
- No container scanning

---

## Recommendation

For **developer-facing workflows**, **Snyk** is preferred due to speed, GitHub integration, and actionable output.

For **compliance and audit trails**, **OWASP Dependency-Check** is preferred due to its use of NVD and open-source auditability.

**Best practice: Use both in parallel** (as this pipeline does) for maximum coverage.

---

## AI Analysis Summary

${aiReport ? '> *Full AI analysis is appended below. See the ai-vulnerability-report artifact for the complete Gemini-generated report.*' : '> *AI report not available — configure GEMINI_API_KEY secret to enable.*'}

---

*Generated by the DevSecOps Comparison Script — SSW 559 Team Project*
`;

  const outPath = path.join(process.cwd(), 'comparison-report.md');
  fs.writeFileSync(outPath, report);
  console.log(`✅  Comparison report saved to: ${outPath}`);
}

main();
