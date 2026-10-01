import { CheckResult, Commitment, Evidence } from "./types";

/**
 * Deterministic verification engine.
 *
 * All evidence is treated as untrusted data, never as instructions. We only
 * ever read URLs/identifiers out of evidence records and perform mechanical
 * checks against them (HTTP reachability, GitHub repo existence, deadline
 * comparisons). Nothing here interprets evidence content as commands, and
 * this module has no access to settlement functions - it only produces a
 * PASS/FAIL verdict that the caller records. The smart contract remains the
 * sole authority over fund movement.
 */

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function checkUrlReachable(evidence: Evidence): Promise<CheckResult> {
  if (!isHttpUrl(evidence.value)) {
    return { name: `url_reachable:${evidence.value}`, passed: false, detail: "Not a valid http(s) URL" };
  }
  try {
    const res = await fetchWithTimeout(evidence.value, { method: "GET" });
    return {
      name: `url_reachable:${evidence.value}`,
      passed: res.ok,
      detail: `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      name: `url_reachable:${evidence.value}`,
      passed: false,
      detail: `Request failed: ${(err as Error).message}`,
    };
  }
}

const GITHUB_REPO_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?\/?$/i;

async function checkGithubRepoExists(evidence: Evidence): Promise<CheckResult> {
  const match = evidence.value.match(GITHUB_REPO_PATTERN);
  if (!match) {
    return {
      name: `github_repo_exists:${evidence.value}`,
      passed: false,
      detail: "Not a recognizable GitHub repository URL",
    };
  }
  const [, owner, repo] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const res = await fetchWithTimeout(apiUrl, {
      headers: { "User-Agent": "arclock-flow-verifier", Accept: "application/vnd.github+json" },
    });
    return {
      name: `github_repo_exists:${owner}/${repo}`,
      passed: res.ok,
      detail: res.ok ? "Repository found" : `GitHub API returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      name: `github_repo_exists:${owner}/${repo}`,
      passed: false,
      detail: `Request failed: ${(err as Error).message}`,
    };
  }
}

function checkDeadlineNotPassed(commitment: Commitment): CheckResult {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const passed = nowSeconds <= commitment.deadline;
  return {
    name: "deadline_not_passed",
    passed,
    detail: passed
      ? `Verified at ${nowSeconds}, deadline ${commitment.deadline}`
      : `Deadline ${commitment.deadline} has passed (now ${nowSeconds})`,
  };
}

function checkTxHashFormat(evidence: Evidence): CheckResult {
  const passed = /^0x[0-9a-fA-F]{64}$/.test(evidence.value);
  return {
    name: `tx_hash_format:${evidence.value}`,
    passed,
    detail: passed ? "Well-formed transaction hash" : "Not a well-formed 32-byte transaction hash",
  };
}

/**
 * Runs every applicable deterministic check against the submitted evidence
 * for a commitment and returns the aggregate result. Evidence content is
 * only ever used as a mechanical input (a URL to fetch, a hash to pattern
 * match) - never evaluated as instructions.
 */
export async function runDeterministicVerification(
  commitment: Commitment,
  evidenceList: Evidence[]
): Promise<{ result: "PASS" | "FAIL"; checks: CheckResult[] }> {
  const checks: CheckResult[] = [checkDeadlineNotPassed(commitment)];

  for (const evidence of evidenceList) {
    switch (evidence.type) {
      case "url":
        checks.push(await checkUrlReachable(evidence));
        break;
      case "github":
        checks.push(await checkGithubRepoExists(evidence));
        break;
      case "tx_hash":
        checks.push(checkTxHashFormat(evidence));
        break;
      case "file":
      case "text":
        // No deterministic check defined; recorded as informational evidence only.
        checks.push({ name: `evidence_recorded:${evidence.type}`, passed: true, detail: "Recorded, not deterministically checked" });
        break;
    }
  }

  const result = checks.every((c) => c.passed) ? "PASS" : "FAIL";
  return { result, checks };
}
