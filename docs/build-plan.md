# CareConnect — Repository Build Plan

**Course:** SWEN 661 9040 — User Interface Implementation (2268)
**Repository:** `careconnect-adhd`
**Team:** Team E-Echo — Shayne McPherson, Quinton Coleman, Antonio Wilson (Abel Tabor, Weeks 1–5)
**Plan owner:** Technical Lead on rotation (Weeks 1–2: Shayne McPherson)
**Status:** Phase 0 (Assignment 1) in progress — charter and proposal synced from SharePoint

---

## 1. Purpose

This document is the single source of truth for how this repository grows across the
semester. It maps every course assignment to concrete repository changes, so that any
team member (or the instructor) can see what exists today, what is coming next, and
why the structure looks the way it does.

Assignment 1 grades the repository on four things (Part 4, 10% + the Repository Setup
and Documentation Quality rubric rows):

| Requirement | Where it lives |
| --- | --- |
| GitHub repository, team members as collaborators | GitHub settings — see [repo-governance.md](repo-governance.md) |
| README with project name, description, team, charter link, setup instructions | [`README.md`](../README.md) |
| `.gitignore` appropriate for Flutter, React Native, Electron, React | [`.gitignore`](../.gitignore) — one file, four labeled sections |
| Basic project structure initialized | This plan + the current `src/` web app |

The rubric's *Highly Proficient* band additionally asks for branch protection rules,
issue templates, and a project board. Those are covered in
[repo-governance.md](repo-governance.md) and `.github/`.

---

## 2. Product summary

CareConnect is a companion application for **adults with ADHD** and the people who
support them. It reduces the executive-function cost of getting through a day:
remembering medication, keeping appointments, starting tasks, and staying oriented —
without nagging, shame, or time pressure.

The full narrative, constraints, and feature list are in
[project-proposal.md](project-proposal.md).

---

## 3. Current state (as of Assignment 1)

The repository currently holds a **single React + Vite web application** at the root.
It originated as an accessibility reference implementation (see Attribution in the
README) and is the foundation the team builds on.

```
careconnect-adhd/
├── .github/              # CI, issue templates, PR template, CODEOWNERS
├── docs/                 # Course deliverables + engineering docs
│   ├── build-plan.md            # ← this file
│   ├── project-proposal.md      # Assignment 1, Part 3
│   ├── team-charter.md          # Assignment 1, Part 2
│   ├── environment-setup.md     # Assignment 1, Part 1
│   ├── repo-governance.md       # Branch protection, board, collaborators
│   └── screenshots/             # Evidence images
├── public/               # PWA manifest, icons, service worker
├── scripts/              # Icon generation, screenshots, PWA/responsive checks
├── src/                  # React web application source
├── supabase/             # Edge function for the assistant (optional backend)
├── ACCESSIBILITY.md      # WCAG 2.2 AA conformance mapping
└── README.md
```

**Structural decision for Assignment 1:** the web app stays at the repository root
(flat layout). We are *not* splitting into `apps/` yet — see §5.

---

## 4. Assignment-to-repository map

Each phase lists the course deliverable and the repository changes it requires.

### Phase 0 — Assignment 1: Environment Setup, Team Charter & Proposal *(Week 1)*

| Deliverable | Repository change |
| --- | --- |
| Environment screenshots | `docs/environment-setup.md` + `docs/screenshots/env-*` |
| Team charter | `docs/team-charter.md` |
| Project proposal | `docs/project-proposal.md` |
| Repository setup | Root `README.md`, multi-platform `.gitignore`, `.github/` templates, CI, governance doc |

**Exit criteria:** all four Assignment 1 documents complete, CI green on `main`,
branch protection enabled, all three members are collaborators.

### Phase 1 — Assignment 2: Requirements & Mock Users *(Week 2)*

| Deliverable | Repository change |
| --- | --- |
| Requirements, personas, mock-user findings | `docs/requirements.md`, `docs/personas.md`, `docs/research/` |
| Refined feature list | Update `project-proposal.md` feature table with acceptance criteria |

No source changes expected. Requirements become GitHub issues using the feature
template, so Assignment 2 output feeds the project board directly.

### Phase 2 — Assignment 3: Mobile Design & Early Implementation *(Week 3)*

| Deliverable | Repository change |
| --- | --- |
| Mobile design (Figma) | `docs/design/mobile/` — exported frames + link |
| Early Flutter implementation | **Trigger point for the `apps/` migration — see §5** |

### Phase 3 — Assignment 4: Flutter Implementation & Testing *(Week 4)*

- `apps/mobile-flutter/` — full Flutter app
- `flutter test` with coverage via `lcov`/`genhtml`
- CI job added for Flutter analyze + test

### Phase 4 — Assignment 5: React Native Implementation & Testing *(Week 5)*

- `apps/mobile-react-native/` — Expo-managed React Native app
- Jest + React Native Testing Library
- CI job added for RN lint + test

### Phase 5 — Assignment 6: Mobile Accessibility & UI Testing *(Week 6)*

- `docs/accessibility/mobile-audit.md` — VoiceOver (iOS) and TalkBack (Android) findings
- E2E mobile tests (Maestro or Detox) under `apps/mobile-*/e2e/`

### Phase 6 — Assignment 7: Desktop Design & Early Implementation *(Week 7)*

- `docs/design/desktop/`
- `apps/desktop-electron/` scaffolded

### Phase 7 — Assignment 8: Electron Implementation & Testing *(Week 8)*

- Full Electron app targeting **Windows and macOS** (see §6)
- Packaging config, signed-or-unsigned build notes, Jest tests

### Phase 8 — Assignment 9: Desktop Accessibility & Refinement *(Week 9)*

- `docs/accessibility/desktop-audit.md` — VoiceOver findings and remediations

### Phase 9 — Assignment 10: Web Design & Early Implementation *(Week 10)*

- Web app hardening: WCAG 2.2 AA conformance re-verified against `ACCESSIBILITY.md`
- Playwright E2E suite, Lighthouse/axe results in `docs/accessibility/web-audit.md`

---

## 5. Deferred: the `apps/` monorepo migration

**Decision:** keep the flat layout through Assignment 2. Revisit at Assignment 3, when
the first non-web platform lands.

**Rationale:** a flat repo is the lowest-friction structure while only one application
exists. Restructuring early costs churn (import paths, CI, tooling config) with no
benefit until a second platform needs a home.

**Target layout when we migrate:**

```
careconnect-adhd/
├── apps/
│   ├── web/                    # ← current root contents move here
│   ├── mobile-flutter/
│   ├── mobile-react-native/
│   └── desktop-electron/
├── packages/
│   └── shared/                 # Types, domain logic, design tokens
├── docs/
└── .github/
```

**Migration checklist (execute at Assignment 3):**

1. `git mv` web sources into `apps/web/` — use `git mv` so history follows the files.
2. Split the root `.gitignore` into per-app `.gitignore` files (the four sections in
   today's root file map 1:1 onto the four app directories).
3. Add an npm workspace root `package.json` (`"workspaces": ["apps/*", "packages/*"]`).
4. Update CI paths and add per-platform jobs with path filters.
5. Extract shared TypeScript types from `src/types/` into `packages/shared/`.
6. Update every path reference in `README.md` and `docs/`.

---

## 6. Platform deployment plan

| Platform | Technology | Target | Phase |
| --- | --- | --- | --- |
| Web | React 18 + Vite + TypeScript | Responsive, installable PWA | Now (Phases 0–1, 9) |
| Mobile — Android & iOS | Flutter | Android emulator + iOS simulator | Phases 2–3 |
| Mobile — Android & iOS | React Native + Expo | Android emulator + iOS simulator | Phase 4 |
| Desktop | Electron | **Windows and macOS** | Phases 6–8 |

**Desktop OS choice:** the team's assigned platform-coverage constraint specifies
**both Windows and macOS**, so the Electron app targets both. The team OS mix supports
this directly — Quinton and Antonio develop on Windows, Shayne on macOS — so each target is
built and accessibility-tested natively (NVDA on Windows, VoiceOver on macOS) without
virtual machines.

Assignment 1's instructions ask teams to choose exactly **one** desktop OS, so this is a
deliberate deviation driven by the assigned constraint. It is flagged for instructor
confirmation at proposal approval; if a single OS is required, the team drops to one and
moves the other to a future iteration.

The dual target roughly doubles desktop build and QA surface (risk R1 in the proposal).
To contain it, platform-specific code is isolated behind a thin adapter rather than
scattered through the UI layer, and `electron-builder` handles both packaging targets
from one configuration.

**Linux is not in scope** and remains a possible future iteration.

---

## 7. Engineering conventions

These are enforced by CI and reviewed in pull requests. Full process detail lives in
[team-charter.md](team-charter.md).

- **Branches:** `<name>/<short-feature-description>` off `dev` — e.g.
  `shayne/patient-medications`, `antonio/flutter-dose-semantics`, `quinton/dose-undo-tests`
- **Commits:** at least once per work session; no single giant end-of-week commits
- **Pull requests:** into `dev` (`dev` into `main` at a milestone), at least one other
  member reviews before merge, CI must be green, no direct pushes to either branch
- **Merge:** squash-merge after approval
- **Accessibility:** reviewers check functionality **and WCAG 2.2 AA compliance**. Every
  UI pull request states how it was keyboard- and screen-reader-tested.
- **Testing:** new logic ships with tests; test additions are part of the same PR
- **Definition of Done:** merged via reviewed PR → tested → accessibility-checked
  (WCAG 2.2 AA) → documented → demoed to the team

---

## 8. Open items

| Item | Owner | Needed by |
| --- | --- | --- |
| **Add the missing Key Features section (8–12 prioritized features) to the SharePoint proposal** — draft ready in `project-proposal.md` §3 | Team | **Assignment 1 submission** |
| Confirm the dual desktop OS target (Windows + macOS) with the instructor | Team | Proposal approval |
| Collect Quinton's signature on the SharePoint charter | Abel Tabor (Doc Lead, W1–2) | Assignment 1 submission |

| Update `ACCESSIBILITY.md` from WCAG 2.1 to 2.2 — adds SC 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8 | QA Lead | Assignment 6 |
| Install Xcode, Android Studio, lcov, Expo CLI — see `environment-setup.md` §Gaps | Each member | Assignment 3 |
| Windows members: install NVDA for desktop accessibility testing | Quinton, Antonio | Assignment 9 |
| Instructor approval of the proposal | Team | Before Week 2 |
| Re-sync `docs/team-charter.md` and `docs/project-proposal.md` whenever the SharePoint documents change | Documentation Lead | Ongoing |
