/**
 * AI Vulnerability Analyzer
 * Uses Google Gemini API to analyze vulnerability scan results from Snyk and OWASP
 * and generate a human-readable remediation report.
 *
 * Usage:
 *   GEMINI_API_KEY=<key> node analyze.js <snyk-report.json> <owasp-report.json>
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const OUTPUT_FILE    = path.join(__dirname, 'ai-report.md');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found or not provided: ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`⚠️  Could not parse JSON from ${filePath}: ${err.message}`);
    return null;
  }
}

function extractSnykVulns(report) {
  if (!report) return { count: 0, vulns: [] };
  const vulns = (report.vulnerabilities || []).map(v => ({
    id:          v.id || 'N/A',
    title:       v.title || 'Unknown',
    severity:    (v.severity || 'unknown').toUpperCase(),
    package:     v.packageName || 'N/A',
    version:     v.version || 'N/A',
    fixedIn:     Array.isArray(v.fixedIn) ? v.fixedIn.join(', ') : 'N/A',
    cvssScore:   v.cvssScore || 'N/A',
    description: (v.description || '').substring(0, 300),
  }));
  return { count: vulns.length, vulns };
}

function extractOwaspVulns(report) {
  if (!report || !report.dependencies) return { count: 0, vulns: [] };
  const vulns = [];
  for (const dep of report.dependencies) {
    if (!dep.vulnerabilities || dep.vulnerabilities.length === 0) continue;
    for (const v of dep.vulnerabilities) {
      vulns.push({
        id:          v.name || 'N/A',
        description: (v.description || '').substring(0, 300),
        severity:    (v.severity || 'UNKNOWN').toUpperCase(),
        cvssScore:   v.cvssv3?.baseScore || v.cvssv2?.score || 'N/A',
        package:     dep.fileName || dep.filePath || 'N/A',
        cwe:         Array.isArray(v.cwes) ? v.cwes.join(', ') : 'N/A',
      });
    }
  }
  return { count: vulns.length, vulns };
}

function callGeminiApi(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     0.2,
        maxOutputTokens: 4096,
        topK:            40,
        topP:            0.95,
      },
    });

    const url = new URL(GEMINI_URL);
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Gemini API error: ${parsed.error.message}`));
            return;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) reject(new Error('No text content in Gemini response'));
          else resolve(text);
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Gemini API request timed out'));
    });
    req.write(body);
    req.end();
  });
}

function buildPrompt(snyk, owasp) {
  const snykSummary = snyk.vulns
    .slice(0, 15) // limit tokens
    .map(v => `- [${v.severity}] ${v.title} | Package: ${v.package}@${v.version} | Fixed in: ${v.fixedIn} | CVSS: ${v.cvssScore}`)
    .join('\n') || 'No vulnerabilities found.';

  const owaspSummary = owasp.vulns
    .slice(0, 15)
    .map(v => `- [${v.severity}] ${v.id} | Package: ${v.package} | CVSS: ${v.cvssScore} | CWE: ${v.cwe}`)
    .join('\n') || 'No vulnerabilities found.';

  return `You are a senior DevSecOps security engineer reviewing automated vulnerability scan results for a Node.js Express web application as part of an academic DevSecOps pipeline project.

## SNYK SCAN RESULTS — ${snyk.count} vulnerabilities found
${snykSummary}

## OWASP DEPENDENCY-CHECK RESULTS — ${owasp.count} vulnerabilities found
${owaspSummary}

## Application Context
- Runtime: Node.js 18, Express framework
- Known vulnerable packages (intentional for demo): lodash@4.17.11 (CVE-2019-10744), express@4.17.1
- Purpose: Academic DevSecOps pipeline demonstration

Please produce a comprehensive Markdown security report with these exact sections:

## 1. Executive Summary
A 3-4 sentence overview for a non-technical stakeholder.

## 2. Critical & High Severity Vulnerabilities
For each critical/high vulnerability: name, package affected, what an attacker can do, and the urgency of fixing it.

## 3. Remediation Steps
For each identified vulnerability, provide the exact npm command to fix it (e.g., \`npm install lodash@4.17.21\`), and if a code change is needed, show a before/after snippet.

## 4. Tool Comparison: Snyk vs OWASP Dependency-Check
Compare the two tools across: number of findings, types of findings, ease of CI/CD integration, reporting quality, and false positive likelihood.

## 5. Overall Risk Score
Rate the application: Critical / High / Medium / Low. Justify the rating in 2–3 sentences.

## 6. Prioritized Action Items
A numbered list of the 5 most important next steps for the development team, ordered by priority.

## 7. AI Analysis Confidence
Rate your confidence in this analysis (High/Medium/Low) and explain any limitations.
`;
}

function fallbackReport(snyk, owasp) {
  const criticalAndHigh = [...snyk.vulns, ...owasp.vulns].filter(
    v => ['CRITICAL', 'HIGH'].includes(v.severity)
  );

  return `## 1. Executive Summary
Automated scanning identified **${snyk.count}** vulnerabilities via Snyk and **${owasp.count}** via OWASP Dependency-Check. The application uses intentionally vulnerable dependencies (lodash@4.17.11, express@4.17.1) to demonstrate security scanning capabilities. Immediate package updates are recommended before any production deployment.

## 2. Critical & High Severity Vulnerabilities
${criticalAndHigh.length > 0
  ? criticalAndHigh.map(v => `### ${v.id || v.title}\n- **Package:** ${v.package}\n- **Severity:** ${v.severity}\n- **CVSS:** ${v.cvssScore}\n`).join('\n')
  : 'No critical/high vulnerabilities detected in this scan.'}

## 3. Remediation Steps
\`\`\`bash
# Fix lodash Prototype Pollution (CVE-2019-10744)
npm install lodash@^4.17.21

# Update Express to latest stable
npm install express@^4.18.2

# Run audit fix for remaining issues
npm audit fix
\`\`\`

**Before (vulnerable):**
\`\`\`json
"lodash": "4.17.11",
"express": "4.17.1"
\`\`\`

**After (patched):**
\`\`\`json
"lodash": "^4.17.21",
"express": "^4.18.2"
\`\`\`

## 4. Tool Comparison: Snyk vs OWASP Dependency-Check
| Criterion | Snyk | OWASP Dependency-Check |
|-----------|------|------------------------|
| Findings | ${snyk.count} vulnerabilities | ${owasp.count} vulnerabilities |
| CI/CD Integration | Native GitHub Action, easy | Java-based, more setup |
| Reporting | Clean JSON + HTML | Detailed XML/JSON/HTML |
| Database | Snyk proprietary DB | NVD + multiple sources |
| False Positives | Low | Medium |
| Speed | Fast (~30s) | Slower (~2–5min) |
| License | Freemium | Free / Open Source |
| Container Scanning | Yes | No |

## 5. Overall Risk Score
**Risk Level: HIGH**

The application contains known exploitable vulnerabilities (Prototype Pollution in lodash, known CVEs in express) that could allow attackers to manipulate JavaScript prototypes, potentially leading to denial of service or property injection. While this is an intentional demo setup, these issues must be resolved before any real deployment.

## 6. Prioritized Action Items
1. **[Immediate]** Update \`lodash\` to \`^4.17.21\` — patches CVE-2019-10744 (Prototype Pollution)
2. **[Immediate]** Update \`express\` to \`^4.18.2\` — patches multiple known CVEs
3. **[Short-term]** Enable \`npm audit\` as a required CI gate — block merges on HIGH/CRITICAL
4. **[Short-term]** Set up Dependabot in GitHub for automated dependency update PRs
5. **[Medium-term]** Add pre-commit hook to run \`npm audit\` locally before push

## 7. AI Analysis Confidence
**Confidence: Medium** — This is a fallback report generated without the Gemini API (API key not configured). Set the \`GEMINI_API_KEY\` secret in your GitHub repository for full AI-powered analysis.
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🤖  AI Vulnerability Analyzer — DevSecOps Pipeline');
  console.log('='.repeat(52));

  const snykPath  = process.argv[2];
  const owaspPath = process.argv[3];

  console.log(`📂  Snyk report:  ${snykPath  || 'not provided'}`);
  console.log(`📂  OWASP report: ${owaspPath || 'not provided'}`);

  const snykRaw  = readJson(snykPath);
  const owaspRaw = readJson(owaspPath);

  const snyk  = extractSnykVulns(snykRaw);
  const owasp = extractOwaspVulns(owaspRaw);

  console.log(`🔍  Snyk:  ${snyk.count} vulnerabilities extracted`);
  console.log(`🔍  OWASP: ${owasp.count} vulnerabilities extracted`);

  let analysisBody;

  if (GEMINI_API_KEY) {
    console.log('📡  Calling Gemini API...');
    try {
      const prompt = buildPrompt(snyk, owasp);
      analysisBody = await callGeminiApi(prompt);
      console.log('✅  Gemini analysis complete');
    } catch (err) {
      console.error(`❌  Gemini API failed: ${err.message}`);
      console.log('⚙️  Falling back to rule-based report...');
      analysisBody = fallbackReport(snyk, owasp);
    }
  } else {
    console.warn('⚠️  GEMINI_API_KEY not set — generating rule-based fallback report');
    analysisBody = fallbackReport(snyk, owasp);
  }

  const timestamp = new Date().toISOString();
  const fullReport = `# 🔐 AI-Generated Vulnerability Analysis Report

> **Generated:** ${timestamp}  
> **AI Model:** Google Gemini 1.5 Flash  
> **Pipeline:** GitHub Actions — DevSecOps CI/CD  
> **Project:** SSW 559 — AI-Enhanced DevSecOps Pipeline  
> **Team:** Jaden Fernandes · Ryan Raymundo · Azeel Sajjad · Edzel Roque · Lucas Ha  

---

## Scan Metadata

| Tool | Vulnerabilities Found | Source |
|------|-----------------------|--------|
| Snyk | ${snyk.count} | ${snykPath || 'N/A'} |
| OWASP Dependency-Check | ${owasp.count} | ${owaspPath || 'N/A'} |

---

${analysisBody}

---

*This report was automatically generated by the DevSecOps AI Analysis Pipeline.*  
*Review findings with your security team before taking action in production.*
`;

  fs.writeFileSync(OUTPUT_FILE, fullReport);
  console.log(`📄  Report saved to: ${OUTPUT_FILE}`);
  console.log('='.repeat(52));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
