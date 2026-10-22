// Scoring engine (PDF Phase 9). The application owns the score; no model decides it.
//
//   score = 100 - 20 per critical - 5 per warning - 1 per info   (floored at 0)
//
// Low-confidence findings count proportionally (a 0.5-confidence warning costs 2.5).
// Category scores use the same formula on each category's findings.
// "passed" = checks that ran and produced no findings.

export const PENALTIES = { critical: 20, warning: 5, info: 1 };

function scoreOf(findings) {
  const penalty = findings.reduce((sum, f) => sum + (PENALTIES[f.severity] ?? 0) * (f.confidence ?? 1), 0);
  return Math.max(0, Math.round(100 - penalty));
}

export function score(findings, checksRun = []) {
  const byCategory = {};
  for (const f of findings) (byCategory[f.category] ||= []).push(f);

  const categoryScores = Object.fromEntries(Object.entries(byCategory).map(([c, list]) => [c, scoreOf(list)]));
  const failedChecks = new Set(findings.map((f) => f.check));
  const uniqueChecks = [...new Set(checksRun)];

  return {
    overallScore: scoreOf(findings),
    categoryScores,
    summary: {
      total: findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      info: findings.filter((f) => f.severity === 'info').length,
      checksRun: uniqueChecks.length,
      passed: uniqueChecks.filter((c) => !failedChecks.has(c)).length,
    },
  };
}
