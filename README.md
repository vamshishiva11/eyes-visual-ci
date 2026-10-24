# eyes-visual-ci: Applitools Eyes in CI, with results on the pull request

Visual tests for a small static app ("Brewline"), run with the Eyes Playwright SDK. A GitHub Actions workflow runs them on every pull request and push to `main`, then reports back on the PR with a comment and a commit status.

See [NOTE.md](NOTE.md) for what was tricky and what Applitools could handle automatically.

## What is in here

| Path | Purpose |
|---|---|
| `app/` | The static app under test |
| `tests/visual.spec.ts` | Five Eyes checks |
| `playwright.config.ts` | Eyes config: batch, branch and parent branch come from the CI context |
| `scripts/ci-context.ts` | Resolves the head SHA, branch, parent branch and batch ID (one place, unit tested) |
| `scripts/results.ts` | Writes and reads `eyes-results.json` (passed / new / unresolved / failed / review link) |
| `scripts/post-pr-comment.ts` | Creates or updates the single PR comment |
| `scripts/set-status.ts` | Sets the `Applitools Eyes` commit status on the PR head |
| `scripts/close-batch.ts` | Closes the Eyes batch, even when the run was cancelled |
| `scripts/gate.ts` | Fails the job when differences are unresolved |
| `scripts/recheck.ts` | Refreshes comment and status from Eyes without running tests |
| `.github/workflows/visual.yml` | The main workflow |
| `.github/workflows/recheck.yml` | Manual or `/recheck` refresh after reviewing in Eyes |

## Setup from scratch

You need Node 22 and a GitHub account.

1. **Eyes account.** Create a free account at [applitools.com](https://applitools.com) and copy your API key (Account details, API key).
2. **Repository.** Fork or create a repo with these files. Open pull requests from branches in the same repo: the token is read-only on pull requests from forks, so comments and statuses are skipped there.
3. **Secret.** Store the key as a repository secret named `APPLITOOLS_API_KEY`:
   ```
   gh secret set APPLITOOLS_API_KEY
   ```
   Or use Settings, Secrets and variables, Actions. Never commit the key.
4. **Actions.** Make sure Actions is enabled for the repo (Settings, Actions, General).
5. **Seed the baseline on `main`** (see below). This step is easy to miss and causes confusing results if skipped.

## Run locally

```
npm ci
npx playwright install chromium
cp .env.example .env        # put your key in .env (it is gitignored)
set -a; . ./.env; set +a
npm run test:visual
```

The run prints a link to the batch in Eyes. Nothing loads `.env` automatically, so export it as above.

First run: every test is **New**. Open the batch, select all, click thumbs-up, then the **save** icon (the batch shows "Unsaved" until you do).

To try a difference: change something in `app/styles.css`, **commit it** (the batch ID is the commit SHA, so an uncommitted run reuses the previous batch), and run again. The changed tests show **Unresolved**; open one to see the diff.

Unit tests for the scripts: `npm run test:scripts`.

## Seed the baseline on `main` first

Eyes matches a branch against its own baseline, then falls back to the parent branch (`main`). Baselines are also per environment, and CI runs on Linux while a laptop may be macOS.

So, before opening PRs:

1. Push `main` so the workflow runs on it. (If Actions was off when you pushed, push any commit again.)
2. Open that batch in Eyes. All tests are **New**. Accept them and save.
3. Only then open PRs.

If a PR branch runs before `main` has a baseline, Eyes saves that branch's first screenshots as the branch's own baseline, and later runs compare against that. Differences then appear to pass. If this happens, use a new branch name.

## What the workflow does

On `pull_request` and pushes to `main` ([visual.yml](.github/workflows/visual.yml)):

1. Checks out the **PR head SHA**, not GitHub's merge commit. The head SHA comes from the event payload.
2. Runs the script unit tests and the visual tests. The batch name, batch ID (the head SHA), branch and parent branch are set in [playwright.config.ts](playwright.config.ts). A re-run of the same commit joins the same batch.
3. Writes `eyes-results.json`.
4. Updates the PR comment (found by a hidden marker, so re-runs edit it) and sets the `Applitools Eyes` commit status on the head commit.
5. Closes the batch under `always()`.
6. Fails the job if anything is unresolved or failed.

Permissions are explicit: `contents: read`, `pull-requests: write`, `statuses: write`, using the built-in `GITHUB_TOKEN`.

## After someone accepts differences in Eyes

GitHub is not told when a batch is accepted, so the status and comment stay red. Refresh them with either:

- **Actions tab**, Recheck Eyes status, Run workflow, enter the PR number.
- Comment `/recheck` on the pull request (owners, members and collaborators only).

[recheck.yml](.github/workflows/recheck.yml) reads the batch from the Eyes REST API (the commit SHA is accepted as the batch's pointer ID) and updates the same comment and status. Both triggers only work once the workflow is on the default branch.

The original `eyes` job stays red because that run did fail; only the status changes. **Require the `Applitools Eyes` status, not the job, in branch protection**, or re-run the job after accepting.

## Troubleshooting

- **Everything is "new" on a PR.** `main` has no saved baseline for this environment. Seed it (above).
- **A PR with a real change shows all passed.** The branch saved its own baseline before `main` had one. Use a new branch name.
- **No workflow runs after pushing.** Actions was probably disabled when the commit was pushed. Push a new commit.
- **No comment on a PR.** Check it is not from a fork, and that the workflow has `pull-requests: write`.

## Jenkins (optional)

Not included. I started a Jenkins version but could not get it running end to end because of technical issues, so no Jenkins files are in this repo.

## Contributing

Open pull requests from branches in this repo (not forks) so the workflow can comment and set the status.
