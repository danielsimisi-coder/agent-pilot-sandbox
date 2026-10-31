# Synthetic slug pilot — plan v1
Scope: danielsimisi-coder/agent-pilot-sandbox only. New branches and Draft PRs; no merge, ruleset, permission, auto-merge or production changes.
Task: add src/normalize-slug.mjs exporting normalizeSlug(value).
Acceptance:
A1. Non-string input throws TypeError, without coercion.
A2. Apply JavaScript String.trim(), then ASCII A-Z to a-z only.
A3. Result must contain 1..32 ASCII characters, matching [a-z0-9]+(?:-[a-z0-9]+)*. Return it; otherwise throw RangeError.
A4. Reject empty/whitespace, Unicode letters, underscores, internal whitespace, leading/trailing/repeated hyphens, and overlength values. No implicit repair beyond A2.
A5. Existing segment tests still pass; no dependencies, network or side effects.
Plan: independent plan review; freeze this plan and separately authored acceptance tests in a Git commit before implementation; invoke Claude with no tools/MCP in a fresh session, accepting output for the one source file only; independently review exact committed diff with Codex; run real tests and Coverloop; attach transcripts bound to subject SHA; open Draft PR and run CI.
Trust boundary: the builder receives task text and returns source as data, has no filesystem or shell tools. Controller admits only the expected source field/path; frozen criteria digest checked before and after. This is tool restriction, not a prompt-only restriction. Controller remains trusted. Untrusted code runs in the existing Docker runtime with a pinned Node image, read-only source/test mounts, read-only root filesystem, no network, no credentials or Docker socket, all capabilities dropped and no-new-privileges. Checkout uses persist-credentials:false. The controller compares criteria and gate hashes after execution before publishing. A malicious-source control attempts to overwrite criteria and must be denied; this is separate from PR workflow replacement.
CI: preserve required job name test; checkout exact PR head; fetch acceptance from immutable criteria SHA; use pinned upstream Coverloop. Run all existing tests plus frozen criteria, then evidence gate. L3 due to CI changes; independent diff review and GLM red-team; existing irreversible-only human-gate scope for reversible pilot (no authority to merge).
Negative experiments on isolated branches: incorrect result, altered transcript, stale evidence after code edit, changed criteria/gate. Distinguish malformed/tampered evidence from a fully self-consistent fabricated report. Coverloop v1 explicitly does not authenticate reviewer origin. Do not claim resistance beyond measured behavior.
Known boundary: a PR-controlled workflow can replace the required test job; a status context pinned to GitHub Actions does not pin a workflow. Test this and report FAIL/BLOCKED, never label a bypass a success. No ruleset changes.
Exit: working feature Draft PR with actual CI, exact hashes, review logs and PASS/FAIL/BLOCKED/NOT_RUN matrix. No merges.
