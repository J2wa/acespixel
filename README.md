# Pixel Office

A runnable first release of the multi-account agent company in your brief. Desktop and mobile browser UI, persistent Node host, isolated Codex CLI account sessions, a pixel office, Obsidian task memory, GitHub worktrees and review gates, and owner-approved Vercel promotion.

## Start with the demo

Install Node.js 24 or newer. Unzip this folder, open Terminal in it, and run:

```sh
npm run demo
```

Open http://localhost:4317. No npm dependencies need installing. Demo mode uses a separate database, sample accounts, simulated task outputs, and no external writes. Click an employee, send a command, check the task board, give Sam an energy drink, or prepare and approve a demo release.

To start the real office:

```sh
npm start
```

The terminal prints an owner token. Enter it in the browser. Live mode starts empty; it does not pretend the sample accounts are connected.

## Connect the five employee accounts

1. Install the official Codex CLI on the host and verify `codex --version` works. Use a version that supports `codex app-server` and the documented account RPCs.
2. Open **Accounts**, enter an employee account label, and click **Add account**.
3. Run the exact `CODEX_HOME=... codex login` command the app shows on the host. The employee signs in to their own authorized ChatGPT Plus account.
4. Click **Check usage**. Open an employee card and assign that account. Repeat for CEO, Developer, QA, Designer, and Deployment Manager.
5. A spare account can replace an exhausted employee account through the employee panel. Active tasks must finish or stop first. The previous worktree and handoff stay intact. Each account can be assigned to only one active role.
6. Optional analyst/database hires require a connected unassigned account. Hire them from Accounts when needed; the CEO may then include them in plans.

Account credentials are managed by Codex in its isolated home or the OS credential store. Set `cli_auth_credentials_store = "keyring"` in each generated account home's `config.toml` if your operating system provides a supported keyring. Runtime folders are private to the host user. Never commit `.runtime`, the account homes, or `.env`.

## Configure the project

Copy `.env.example` to `.env` and set your actual values locally. Node loads it automatically.

| Variable | Purpose |
| --- | --- |
| `PIXEL_REPO` | Absolute path to a local clone of the project the employees will work on |
| `GITHUB_REPOSITORY` | `owner/repository` for that same clone |
| `GITHUB_TOKEN` | Host-side fine-grained token or GitHub App installation token for PRs, checks and merges |
| `PIXEL_MAIN_BRANCH` | Main branch, defaults to `main` |
| `VERCEL_PROJECT_ID` | The linked project's exact Vercel ID |
| `VERCEL_TOKEN` | Host-side Vercel access token |
| `VERCEL_TEAM_ID` | Optional team scope |
| `PIXEL_VAULT` | Optional absolute path to an Obsidian vault; default `.runtime/live/vault` |
| `PIXEL_DATA_DIR` | Optional persistent data directory; keep demo/live directories separate |
| `PIXEL_OWNER_TOKEN` | Optional stable owner access token; otherwise randomly generated on startup |
| `PIXEL_CODEX_BIN` | Optional Codex executable path |
| `HOST`, `PORT` | Bind address and port; defaults `127.0.0.1`, `4317` |
| `PIXEL_SECURE_COOKIE` | Set to `1` when serving through HTTPS |

The local checkout needs an `origin` remote, a configured Git author, and a host Git credential helper authorized to push feature branches. `GITHUB_TOKEN` is used for the REST gateway; it is not written into remote URLs. Use short-lived App credentials where possible and refresh them outside this first-release app. Install the current Vercel CLI for the promotion gateway.

Do not run the host as an administrator. It is an owner-operated trusted workstation application, not a hardened multi-tenant execution service. Separate CODEX_HOME folders isolate sessions; they are not OS security boundaries. Use separate containers or OS users before offering this runtime to mutually untrusted users. Child Codex processes receive a minimal environment without the gateway tokens and use workspace-write/read-only sandboxes with escalations denied. This does not replace host isolation or repository protection.

## Workflow

1. Send a goal in the CEO or employee command box. Every command becomes a CEO planning job; employee selection is a routing preference.
2. The CEO returns a validated task plan. Tasks are sequential and dependency-aware. No silent parallel changes to overlapping areas occur.
3. Each execution gets its own Git worktree and role-prefixed branch. New implementation branches start from freshly fetched main. Task notes and latest employee handoffs are saved in the vault.
4. Review a completed task in Tasks. **Publish branch & open PR** commits remaining changes, pushes the role branch, and creates a PR.
5. For non-QA implementations, a QA verification job checks the exact proposed SHA in its own worktree. It records its verdict and executed tests. GitHub CI must also pass.
6. **Request merge approval** verifies the QA SHA and CI. The owner reviews the PR and approves the exact SHA. GitHub branch protection remains authoritative; require design review on UI changes through CODEOWNERS/required reviews.
7. After merge, obtain a READY preview of the merged main commit from the connected Vercel Git workflow. Enter its `dpl_...` ID under Approvals. The app checks project ownership and exact main SHA.
8. **Approve production** is the only production action in the app. The gateway revalidates the release and promotes that existing preview. Approval expires after 15 minutes and cannot be replayed. Rejections never execute a remote action.

Configure Vercel to disable automatic production domain promotion; otherwise repository integration settings outside this app can publish independently. Ensure preview environments have the settings intended for promotion. No production deployment was made while creating this package.

## Usage and energy drinks

The app reads `account/rateLimits/read` and listens for `account/rateLimits/updated`. It uses reported window durations and reset timestamps rather than assuming unlimited capacity. Both short and weekly windows can stop work. Unknown or stale usage blocks new runs.

- **Energy drink**: recheck usage and wake the employee only after a fresh positive snapshot.
- **Use reset credit**: consume an earned provider-reported reset if available, then read usage again. Retry attempts reuse the stored idempotency key after uncertain results. Credits are never invented.
- **Auto-wake**: recheck once per minute and resume only when the provider confirms capacity.
- **Switch account**: explicitly assign an available spare employee-authorized seat. There is no hidden account rotation.
- `/status`, `/wake developer`, and `/pause qa` work in the command box.

A running turn that fails is marked blocked and preserves its worktree and output. Review it and retry after recovery. The Pause control pauses future work; it does not interrupt a running turn.

## Obsidian memory

Open `.runtime/live/vault` or your configured vault path in Obsidian. Tasks are authoritative Markdown files with JSON-valued YAML-compatible frontmatter, read by the board directly. Preserve the generated frontmatter value format when editing. Runtime account/usage/approval data and events live in SQLite, outside the vault. Employee files record the latest handoff; Daily records the recent office log. Back up the entire runtime directory while the service is stopped, and keep a separate private history repository for the vault if desired.

## Use on your phone

The responsive UI is served by the same host. For a trusted private network, set `HOST=0.0.0.0` and visit `http://HOST-LAN-IP:4317` on your phone. Prefer a private VPN or HTTPS reverse proxy for access outside that network. Keep the owner sign-in enabled, set a stable owner token, and use `PIXEL_SECURE_COOKIE=1` under HTTPS. The computer/server must stay running. Do not put the live runtime on a static hosting service: Codex requires a persistent process and filesystem. Vercel is the deployment destination for the projects built by the employees.

## Current scope and known limits

This is a functional v0.1, with live adapters implemented but not validated against your five accounts, repository or Vercel project. Those credentials and project IDs were not available during development.

- Original Canvas artwork and lightweight native JS UI; this is inspired by the linked pixel-agents concept, not a fork containing its renderer. Node HTTP + SSE replaces Fastify/WebSocket for a dependency-free package; SQLite and Markdown are implemented.
- One project/owner and sequential execution per host. Switching to another project requires another instance/configuration. Optional hiring and account swaps are explicit owner actions.
- PR publishing and merge approval are visible owner actions. Designer approval is enforced by repository required reviews, not a separate automated designer-verdict workflow.
- Vercel Git integration creates previews; this app validates and promotes them. Environment-variable editing, production health checks, and automatic rollback are not implemented. Use Vercel's dashboard for those operations.
- No browser login automation, quota scraping, manual fabrication of live quotas, credential sharing between people, or background account rotation.
- Tasks requiring network/tool escalation remain blocked; revise their scope or provision dependencies on the host. Malformed CEO/QA JSON fails visibly and can be retried.
- Mobile CSS is provided; a real-device run and live integration acceptance test remain necessary before daily use.

## Validate

```sh
npm test
```

Tests cover auth, cross-origin mutations, both usage windows, stale snapshots, manual wake, exact-commit gates, one-use approvals, Markdown persistence, real local Git worktree isolation, and mocked external service responses. Browser QA covered the desktop office and command workflow. Test results do not certify live provider compatibility.

## Source map

- `core/model.mjs`: usage/state rules and plan validation
- `server/index.mjs`: authenticated API, queue, runtime scheduling, approvals and SSE
- `server/providers/codex.mjs`: JSON-line app-server adapter and turn lifecycle
- `server/store.mjs`: SQLite records/events and authoritative Markdown task files
- `server/integrations.mjs`: Git worktrees, GitHub PR/CI/merge and Vercel promotion
- `public/`: responsive office, employee controls, architecture, tasks, approvals and accounts
- `tests/`: executable verification suite

Official implementation references, checked November 5, 2026:

- https://learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/config-file/config-advanced
- https://vercel.com/docs/cli/promote
- https://vercel.com/docs/cli/global-options
- Inspiration: https://github.com/pixel-agents-hq/pixel-agents

## Hosted web office on Vercel (v0.2)

The GitHub repository contains both the hosted web interface and the persistent Codex host. Vercel builds `public/` into `dist/` and runs a stateless API gateway; it does not run the SQLite/Codex worker host.

Until `PIXEL_RUNTIME_URL` is configured, the website clearly shows **Live runtime not connected** and offers a browser-only interactive demo. Demo commands and approvals do not reach any external service, and the demo resets when reopened. No real accounts or secrets are included in the deployment.

To activate the hosted office:

1. Clone this repository on the always-on computer/server, configure `.env`, and run `npm start` using Node.js 24+.
2. Put that host behind an HTTPS reverse proxy or secure tunnel. Keep owner authentication enabled and set `PIXEL_SECURE_COOKIE=1` on the host.
3. Add `PIXEL_RUNTIME_URL=https://your-runtime-host.example` as a Vercel server-side environment variable and redeploy the web project. The gateway only forwards the app's fixed API routes to this configured origin; users cannot select arbitrary destinations.
4. Sign in at the hosted website with the host's owner token. Employee login remains through Codex CLI on the host.

Do not set `PIXEL_RUNTIME_URL` to the Vercel website itself. It must point to the separate persistent runtime. Optional `PIXEL_GATEWAY_SECRET` is reserved for an upstream reverse proxy that validates the corresponding `X-Pixel-Gateway` header. Owner authentication remains required even without that additional proxy control.

For local changes run `npm test` and `npm run build`. Production website deployment is distinct from the app's owner approval gate for employee-managed releases.
