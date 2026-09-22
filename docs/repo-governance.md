# Repository Governance

**Course:** SWEN 661 9040 — User Interface Implementation (2268)
**Assignment:** 1, Part 4 (Repository Setup)

This document covers the repository configuration that lives in **GitHub settings**
rather than in files. The Assignment 1 rubric's *Highly Proficient* band asks for
branch protection rules, issue templates, and a project board; issue and PR templates
are in `.github/`, and the settings-side work is recorded here.

> These steps require repository admin access and cannot be applied from a local clone.
> Each has a checkbox — check it off once applied on GitHub.

---

## 1. Collaborators

Assignment 1, Part 4 requires all team members to be collaborators.

- [x] Add **Abel Tabor** — [`@abelktabor`](https://github.com/abelktabor) — with **Write** access ✅ *invite sent 2026-08-18*
- [x] Add **Quinton Coleman** — [`@colemaninternational80-cmyk`](https://github.com/colemaninternational80-cmyk) — with **Write** access ✅ *added 2026-08-18*
- [ ] Add the instructor as a collaborator (or make the repository public) so it is
      accessible for grading — the rubric's *Beginning* band is "repository not
      accessible to team/instructor"

**Settings → Collaborators and teams → Add people**, or:

```bash
gh api -X PUT repos/shaynemcp/careconnect-swen661-reference/collaborators/abelktabor -f permission=push && gh api -X PUT repos/shaynemcp/careconnect-swen661-reference/collaborators/colemaninternational80-cmyk -f permission=push
```

---

## 2. Branch protection on `main`

The team charter states `main` is protected and every change arrives through a pull
request. This is **applied** as a repository **ruleset** (Settings → Rules → Rulesets),
not as a legacy branch-protection rule:

- [x] **`main-protection`** — ruleset
      [`23577034`](https://github.com/shaynemcp/careconnect-adhd/rules/23577034),
      enforcement `active`, targeting `refs/heads/main`, no bypass actors ✅ *applied 2026-09-16*
  - [x] Block force pushes (`non_fast_forward`) and deletion
  - [x] Require linear history
  - [x] Require a pull request: **1** approving review, dismiss stale approvals on push,
        require conversation resolution, squash-only merges
  - [x] Require status checks, branches up to date before merging:
        `Lint · Typecheck · Test · Build` and `Accessibility (axe + Lighthouse)`
        *(both from `.github/workflows/ci.yml`)*

Read the live configuration back with:

```bash
gh api repos/shaynemcp/careconnect-adhd/rulesets/23577034
```

Two things it deliberately does **not** do:

- **No `require_code_owner_review`.** `.github/CODEOWNERS` currently lists `@shaynemcp`
  as the owner of `*`, so requiring a code-owner review would mean no one but the
  Technical Lead can approve anything — and the Technical Lead's own PRs would be
  unmergeable, since GitHub does not count an author as their own reviewer. Turn this on
  only once CODEOWNERS spreads ownership across the team.
- **No path-filtered workflow in the required checks.** `react-mobile.yml` and
  `flutter.yml` run only when their app directory changes. A required check that never
  starts is reported as pending forever, so adding either one here would block every PR
  that does not touch that app. Required checks must come from workflows that run on
  every PR into `main`.

**Repository defaults** — **Settings → General → Pull Requests**:

- [ ] Allow **squash merging** only (disable merge commits and rebase merging) — the
      charter's merge policy is squash-and-merge, and the ruleset above already
      restricts merges on `main` to squash
- [ ] Automatically delete head branches after merge

---

## 3. Project board

- [ ] Create a **Projects (v2) board** named `CareConnect — Semester Plan`
- [ ] Columns: `Backlog` → `Ready` → `In Progress` → `In Review` → `Done`
- [ ] Add custom fields:
  - `Assignment` (single select: A1 … A10)
  - `Platform` (single select: Web, Flutter, React Native, Electron, Docs)
  - `Priority` (single select: Must-Have, Should-Have, Nice-to-Have)
- [ ] Enable the built-in workflows: auto-add new issues to `Backlog`, move to `Done`
      when closed, move to `In Review` when a linked PR opens
- [ ] Seed the board from `docs/project-proposal.md` §3 — one issue per feature F1–F13,
      created with the **Feature / requirement** template

```bash
gh project create --owner shaynemcp --title "CareConnect — Semester Plan"
```

---

## 4. Labels

Beyond GitHub's defaults, create:

| Label | Color | Use |
| --- | --- | --- |
| `accessibility` | `#0E8A16` | WCAG conformance work — triaged ahead of features |
| `must-have` | `#B60205` | Required for a passing product |
| `should-have` | `#FBCA04` | Planned; first to descope under schedule pressure |
| `nice-to-have` | `#C5DEF5` | Built only if ahead of schedule |
| `platform:web` | `#1D76DB` | React + Vite |
| `platform:flutter` | `#5319E7` | Flutter / Dart |
| `platform:react-native` | `#006B75` | React Native / Expo |
| `platform:electron` | `#D93F0B` | Electron (macOS) |
| `needs-triage` | `#EDEDED` | Awaiting QA Lead triage |
| `blocked` | `#000000` | Cannot proceed; note the blocker in the issue |

```bash
gh label create accessibility --color 0E8A16 --description "WCAG conformance work"
```

---

## 5. Security hygiene

- [ ] Confirm `.env` is ignored and has never been committed:
      `git log --all --full-history -- .env` should return nothing
- [ ] Enable **Dependabot alerts** and **secret scanning** under
      **Settings → Code security**
- [ ] Confirm no API key is committed: `ANTHROPIC_API_KEY` must remain server-side and
      must never carry a `VITE_` prefix, which would bundle it into the client

---

## 6. Verification checklist for Assignment 1 submission

| Requirement | Where | Done |
| --- | --- | --- |
| Repository exists on GitHub | `shaynemcp/careconnect-swen661-reference` | ✅ |
| All team members are collaborators | §1 above — Abel and Quinton added 2026-08-18 | ✅ |
| Instructor can access the repository | §1 above | ☐ |
| README with project name and description | `README.md` | ✅ |
| README lists team member names | `README.md` — Team E-Echo, all three members | ✅ |
| README links to the team charter | `README.md` → `docs/team-charter.md` | ✅ |
| README has setup instructions | `README.md` | ✅ |
| `.gitignore` for Flutter, React Native, Electron, React | `.gitignore` — four labeled sections | ✅ |
| Basic project structure initialized | `src/`, `docs/`, `.github/`, `public/`, `scripts/` | ✅ |
| Branch protection rules | §2 above — `main-protection` ruleset, active | ✅ |
| Issue templates | `.github/ISSUE_TEMPLATE/` | ✅ |
| Project board | §3 above | ☐ |
| CI configured | `.github/workflows/` — `ci.yml` (web + shared), `flutter.yml`, `react-mobile.yml`, `nightly-e2e.yml` | ✅ |
