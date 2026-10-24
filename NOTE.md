# Note: Applitools Eyes in CI with PR results

## What was tricky

**1. Baseline ordering.** My first PR runs happened before `main` had a Linux baseline. Eyes saved each branch's first screenshots as that *branch's* baseline, so a later run with a real visual change compared against itself and reported "5 passed". Nothing was wrong in the scripts; it looked like a green PR hiding a real difference. The fix was to seed `main` first and use fresh branch names. Separately, my local baselines were macOS and CI is Linux, so CI had nothing to match until `main` ran there.

**2. A diff arrives as an exception.** Even with `failTestsOnDiff: false`, the SDK attaches a "detected differences" exception to each result. My first `summarize` treated any exception as a failure, so real diffs were counted as *failed*, not *unresolved*. The result's own status is the source of truth; the exception only matters when there is no result.

**3. Manual workflows only exist on the default branch.** `workflow_dispatch` and `issue_comment` triggers cannot be tried from a feature branch, so the recheck could only be exercised after merging it.

**4. The batch ID has to be stable and re-runs must not duplicate.** The batch ID is the head SHA, so a re-run joins the existing batch; the PR comment carries a hidden marker so a re-run edits it; and the batch is closed under `always()` so cancelled runs do not leave one open.

## Branches and commit SHAs

On `pull_request` events `GITHUB_SHA` is a synthetic merge commit that the author never pushed. `scripts/ci-context.ts` reads the PR head SHA, head branch and base branch from the event payload (`GITHUB_EVENT_PATH`) and falls back to `GITHUB_SHA` and `GITHUB_REF_NAME` on pushes. The checkout step uses the same head SHA. The Eyes batch ID, the commit status and the comment footer all use it. The parent branch is the PR's base branch, so Eyes can fall back to its baseline. Forks are detected and skipped, since the token is read-only there.

## What happens when someone accepts differences after the run

The commit status stays red, and so does the original job. GitHub is never told. I measured it: PR #5 stayed at "5 unresolved" after the baseline was accepted in the dashboard. I added a recheck (manual run or a `/recheck` comment) that reads the batch from the Eyes REST API, using the commit SHA as the pointer ID, and updates the same comment and status. It works, but someone has to remember to run it, and only the status flips: the failed `eyes` job remains, so branch protection should require the status, not the job.

## What Applitools should handle so teams do not script it

- **Status follows the batch.** When a batch is accepted, rejected or re-resolved, update the PR status and comment. Eyes' docs describe a GitHub integration that updates the PR panel when steps are accepted; I did not try it, since this exercise uses plain `GITHUB_TOKEN` and no app. Teams that cannot install it have no equivalent and fall back to polling or manual reruns. An outbound webhook on batch resolution would let any CI react without a server.
- **Branch and head SHA from the CI environment.** The merge-commit pitfall is the same for every GitHub team. The SDK could detect a PR run and use the head SHA, head branch and base branch by default.
- **Safer baseline defaults for new branches.** A branch whose parent has no baseline should not silently baseline itself and report a pass; a warning, or a flag on the batch ("no parent baseline"), would have saved me an afternoon.
- **A built-in results summary.** Counts, review link and per-test status should come from one call instead of a custom `afterAll`, including a status for a diff that does not rely on catching an exception.
- **Batch closing on cancel.** Closing in an `always()` step works, but the batch should time out and close itself.
