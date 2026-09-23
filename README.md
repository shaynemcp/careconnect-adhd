# CareConnect

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-stable-02569B?logo=flutter&logoColor=white)
![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-success)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)

**A cross-platform companion app for adults with ADHD — and the people who support them.**

CareConnect targets the gap between *knowing* what you need to do and *actually starting
it*. Instead of another backlog that assumes intact executive function, it surfaces one
next action at a time, keeps medication and appointment status permanently visible rather
than requiring recall, makes every action reversible so a mis-tap carries no anxiety, and
gives an optional support person visibility without turning them into a supervisor. Every
screen is engineered to **WCAG 2.2 Level AA**, with cognitive accessibility treated as a
first-class requirement alongside the sensory and motor criteria.

> Built for **SWEN 661 — User Interface Implementation (2268)** at UMGC, across four
> platforms: web (React + Vite), mobile (Flutter *and* React Native), and desktop
> (Electron, Windows and macOS).

---

## Team

**Team 5**

| Member | GitHub | OS | Week 6 focus |
| --- | --- | --- | --- |
| Shayne McPherson | [@shaynemcp](https://github.com/shaynemcp) | macOS | Team Lead · CI · iOS and VoiceOver on both mobile apps |
| Quinton Coleman | [@colemaninternational80-cmyk](https://github.com/colemaninternational80-cmyk) | Windows | Testing and coverage · TalkBack (React Native) |
| Antonio Wilson | [@awilso112](https://github.com/awilso112) | Windows 11 | Bug fixes · Flutter accessibility · TalkBack (Flutter) |

**Former member:** Abel Tabor ([@abelktabor](https://github.com/abelktabor)), Weeks 1–5,
moved to another team in Week 6. His work — including the Week 3 Figma submission, the
Assignment 4 submission and the React Native port (PR #7) — remains in this repository's
history and in the submission record.

Antonio Wilson joined in Week 6. Weeks 1–5 used a two-week role rotation, recorded in the
team charter; from Week 6 work is assigned per issue at the weekly sync.

📄 **[Team Charter](docs/team-charter.md)** — roles, communication plan, git workflow,
decision making, and conflict resolution.

---

## Documentation

| Document | What it covers |
| --- | --- |
| **[Build Plan](docs/build-plan.md)** | How this repository grows across Assignments 1–10, the deferred `apps/` monorepo migration, and engineering conventions |
| **[Project Proposal](docs/project-proposal.md)** | Product overview, constraints, 13 prioritized features with acceptance criteria, platform plan, success criteria, risks |
| **[Team Charter](docs/team-charter.md)** | Team information, communication, role rotation, git workflow, work distribution, conflict resolution |
| **[Environment Setup](docs/environment-setup.md)** | Verified toolchain status on the development machine, gaps, and remediation commands |
| **[Repository Governance](docs/repo-governance.md)** | Collaborators, branch protection, project board, labels, security hygiene |
| **[Accessibility](docs/ACCESSIBILITY.md)** | Conformance mapping across 21 success criteria — inherited from the reference app at **WCAG 2.1**; migration to the team's 2.2 standard is tracked in the build plan |
| **[Architecture](docs/ARCHITECTURE.md)** | Monorepo shape, dependency direction, accessibility as architecture |
| **[Setup](docs/SETUP.md)** | Install, run, scripts, Windows notes |
| **[Testing](docs/TESTING.md)** | Test layers, gates, and the manual accessibility pass |
| **[Data Model](docs/DATA-MODEL.md)** | Mock schema for patients, caregivers, medications, appointments, tasks |
| **[Flutter mobile app](apps/mobile-flutter/README.md)** | Assignment 4 — architecture, how to run, how to test, coverage report, known issues, contributions, AI usage |
| **[Flutter test plan](apps/mobile-flutter/docs/TEST-PLAN.md)** | Strategy, full test-case catalogue, manual accessibility pass, coverage floor |
| **[Decisions (ADRs)](docs/decisions/)** | 0001 mobile framework (accepted: Flutter for A3–4) · 0002 desktop OS (open) · 0003 repository home and `dev` branch (accepted) |
| **[Contributing](CONTRIBUTING.md)** | Branch naming, PR flow, team norms |
| **[Reference App README](docs/reference-app-readme.md)** | Archived upstream README with the screen-by-screen walkthrough |

### Canonical source documents

The team-completed Word originals of the two graded Assignment 1 documents live on UMGC
SharePoint. **Anyone signed in with a UMGC organization account can open them.**

| Document | Source of truth |
| --- | --- |
| Team Charter | [Open in SharePoint](https://umuc365-my.sharepoint.com/:w:/g/personal/atabor7_student_umgc_edu/IQBqLgOJkCH2TI2Zoz7p973WASfeTrcvr2I8naF3z8AHxvs?e=Bd2ogj) |
| Project Proposal | [Open in SharePoint](https://umuc365-my.sharepoint.com/:w:/g/personal/atabor7_student_umgc_edu/IQA0e50yYJ06RYo_y6m78DNxAWzCyQRVhGF4g59x_GOybRk?e=99dHSb) |

The Markdown files under `docs/` mirror these for in-repo review and diffing. **When the
two disagree, the SharePoint document is authoritative** — it is what gets submitted.
Anyone editing the Word document should update the matching Markdown file in the same
pull request so the repository does not drift from the submission.

---

## Current state

The repository holds **three applications**:

- the responsive React + Vite web app at `apps/web`, adapted from the
  accessibility reference implementation (see [Attribution](#attribution));
- the **Flutter mobile app at `apps/mobile-flutter`** (Assignment 4), which
  implements the Week 3 Figma design — eleven screens for care recipients and
  caregivers, phone / landscape / tablet layouts, Riverpod state, go_router
  navigation, local persistence, and a full test suite with an HTML coverage
  report. See its [README](apps/mobile-flutter/README.md); and
- the **React Native (Expo) mobile app at `apps/react-mobile`** (Assignment 5),
  a port of the same design and behaviour, with a Jest + React Native Testing
  Library suite and a committed coverage report at
  [apps/react-mobile/coverage/](apps/react-mobile/coverage/).

All three target the ADHD user group described above. Assignment 6 hardens both
mobile apps for WCAG 2.2 AA with screen-reader testing (VoiceOver and TalkBack).
The Electron application arrives in Assignments 7–8.

### Platform plan

| Platform | Technology | Target | Assignments |
| --- | --- | --- | --- |
| Web | React 18 + Vite + TypeScript | Responsive, installable PWA | 1, 10 |
| Mobile | Flutter (`apps/mobile-flutter`) ✅ | Android + iOS | 3, 4 |
| Mobile | React Native + Expo (`apps/react-mobile`) ✅ | Android + iOS | 5, 6 |
| Desktop | Electron | **Windows and macOS** | 7, 8, 9 |

**The desktop target is both Windows and macOS**, per the team's assigned
platform-coverage constraint. The team OS mix supports this directly — two members develop
on Windows and one on macOS — so both targets can be built and accessibility-tested
natively (NVDA on Windows, VoiceOver on macOS) without virtual machines. Assignment 1's
instructions ask for a single desktop OS, so this deviation is flagged for instructor
confirmation in the [proposal](docs/project-proposal.md#4-platform-deployment-plan).

**Linux is not in scope** and remains a possible future iteration.

---

## Getting started

### Prerequisites

- **Node.js 18+** and npm — verified working: Node `v22.14.0`, npm `11.19.0`
- A modern browser
- *(Optional)* An Anthropic API key for the landing-page assistant

The full toolchain audit, including what is **not** yet installed, is in
[docs/environment-setup.md](docs/environment-setup.md).

### Clone and run

```bash
git clone https://github.com/shaynemcp/careconnect-adhd.git
```

```bash
cd careconnect-adhd && nvm use && npm install && cp .env.example .env && npm run dev:web
```

The dev server starts at **http://localhost:5173**. One install at the repo root
covers every workspace. Full detail in [docs/SETUP.md](docs/SETUP.md).

### Run the Flutter mobile app

The Flutter app is a standalone Dart project (not an npm workspace):

```bash
cd apps/mobile-flutter && flutter pub get && flutter run
```

```bash
cd apps/mobile-flutter && flutter test --coverage && genhtml coverage/lcov.info -o coverage/html
```

Prerequisites, emulator setup, deep links and the release build are in
[apps/mobile-flutter/README.md](apps/mobile-flutter/README.md).

> The app runs entirely on mock `localStorage` data — **no backend keys are required**.
> If `ANTHROPIC_API_KEY` is absent, the landing-page assistant falls back to a scripted
> guided helper.

### Run the React Native mobile app

The React Native app is a standalone Expo project (not an npm workspace), with its own
lockfile:

```bash
cd apps/react-mobile && npm install && npm start
```

```bash
cd apps/react-mobile && npm run lint && npm run typecheck && npm run test:coverage
```

`npm run ios` needs macOS with Xcode; `npm run android` needs an Android emulator or device.

### Environment variables

Copy `.env.example` to `.env` and fill in only what you need:

| Variable | Required? | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | No | Only for the assistant edge function |
| `VITE_SUPABASE_ANON_KEY` | No | Public anon key, protected by Row-Level Security |
| `ANTHROPIC_API_KEY` | No | **Server-side only.** Never prefix with `VITE_` — that would bundle it into the client and leak the key to the browser. |

`.env` is gitignored. Never commit real secrets.

### Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev:web` | Vite dev server on port 5173 |
| `npm run dev:desktop` | Electron shell (build the web app first) |
| `npm run build` | Build every workspace |
| `npm run lint` | ESLint across workspaces |
| `npm run typecheck` | `tsc --noEmit` (strict) across workspaces |
| `npm test` | Tests across workspaces |
| `npm run check:contrast -w @careconnect/design-tokens` | Verify every color pair against WCAG 2.2 AA |
| `cd apps/mobile-flutter && flutter analyze` | Static analysis for the Flutter app (zero issues required) |
| `cd apps/mobile-flutter && flutter test --coverage` | Flutter unit + widget tests with coverage |
| `cd apps/mobile-flutter && flutter build apk --release` | Android release APK |
| `cd apps/react-mobile && npm test` | React Native Jest tests |
| `cd apps/react-mobile && npm run test:coverage` | React Native tests with coverage (`apps/react-mobile/coverage/`) |

> **Note:** the root `npm test` only runs the npm workspaces (web, desktop, packages), and
> none of them define tests yet, so it is currently a no-op. The mobile apps have their own
> suites: Flutter (`flutter test`, run in CI by `flutter.yml` with a 60% coverage floor) and
> React Native (Jest, `cd apps/react-mobile && npm test`). CI for React Native is tracked in
> #6. Playwright end-to-end tests are not set up yet. See [docs/TESTING.md](docs/TESTING.md).

---

## Project structure

npm workspaces monorepo. Full rationale in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
careconnect/
├── .github/
│   ├── workflows/               # CI (web), Flutter analyze/test/APK, nightly E2E
│   ├── ISSUE_TEMPLATE/          # Bug, feature/task, accessibility issue
│   ├── PULL_REQUEST_TEMPLATE.md # Includes the mandatory accessibility checklist
│   ├── CODEOWNERS
│   └── dependabot.yml
├── apps/
│   ├── web/                     # React 18 + Vite + TS (strict) + Tailwind, PWA
│   ├── mobile-flutter/          # Flutter — Riverpod + go_router (Assignment 4)
│   ├── react-mobile/            # React Native + Expo — React Navigation + Zustand (Assignment 5)
│   └── desktop/                 # Electron shell over the web build (ADR 0002)
├── packages/
│   ├── ui/                      # Shared accessible components
│   ├── design-tokens/           # Colors/spacing/type — contrast-verified
│   └── mock-data/               # Domain types + fictional fixtures
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ACCESSIBILITY.md         # Instructor's requirements table, tracked per row
│   ├── SETUP.md
│   ├── TESTING.md
│   ├── DATA-MODEL.md
│   ├── decisions/               # ADRs — 0001 mobile framework, 0002 desktop OS, 0003 repo home
│   └── demos/                   # Dated log of weekly walkthrough videos
├── .nvmrc                       # Node 22.14.0
├── .editorconfig                # LF endings across macOS + Windows machines
├── .env.example
├── package.json                 # Workspace root
└── CONTRIBUTING.md
```

## Contributing

**Repository home.** Since Week 6 (2026-09-17) the team works in
[`shaynemcp/careconnect-adhd`](https://github.com/shaynemcp/careconnect-adhd). The full
history moved over intact (same commits, all branches). The earlier team repository,
[`abelktabor/CareConnect-ADHD-`](https://github.com/abelktabor/CareConnect-ADHD-), is kept as
read-only history — don't push there. If you have an old clone, repoint it:

```bash
git remote set-url origin https://github.com/shaynemcp/careconnect-adhd.git
```

All work arrives through pull requests into the **`dev`** integration branch;
`main` holds submitted milestones (see [ADR 0003](docs/decisions/0003-repository-home.md)).
`main` is protected: squash-only, linear history, one approving review, resolved review
threads, and required CI checks on an up-to-date branch.

1. Branch from `dev` using the charter convention:
   **`<name>/<short-feature-description>`** — e.g. `shayne/patient-medications`
2. Commit **at least once per work session** — no single giant end-of-week commits
3. Open a PR into `dev` and complete the template, **including the accessibility checklist**
4. Get at least one review from another team member; CI must be green
5. **Squash-merge** after approval

### Definition of Done

Work is complete only when it is **merged** via a reviewed PR, **tested**, **checked for
accessibility** (WCAG 2.2 AA), **documented**, and **demoed** to the team.

Full process detail is in the [team charter](docs/team-charter.md#4-git-workflow).

---

## Assignment 4 — Flutter mobile implementation

**Project description.** `apps/mobile-flutter` turns the Week 3 Figma design
into a working Flutter app: sign-in with role choice, Today with one dominant
next action and a 10-second undo, medications and appointments with
icon-plus-text status, three-step and two-step management forms with autosave,
notifications and caregiver-access settings, and the caregiver dashboard,
manage tab and activity timeline — with phone, landscape and tablet layouts.

| Requirement | Where |
| --- | --- |
| How to run the app | [apps/mobile-flutter/README.md → How to run](apps/mobile-flutter/README.md#how-to-run-the-app) |
| How to run tests | [apps/mobile-flutter/README.md → How to run the tests](apps/mobile-flutter/README.md#how-to-run-the-tests) · [Test plan](apps/mobile-flutter/docs/TEST-PLAN.md) |
| Test coverage report | [apps/mobile-flutter/coverage/html/index.html](apps/mobile-flutter/coverage/html/index.html) · [summary](apps/mobile-flutter/coverage/summary.txt) · [screenshot](docs/screenshots/mobile-flutter/coverage.png) |
| Known issues / limitations | [apps/mobile-flutter/README.md → Known issues](apps/mobile-flutter/README.md#known-issues-and-limitations) |
| Team member contributions this week | [apps/mobile-flutter/README.md → Team contributions](apps/mobile-flutter/README.md#team-contributions-this-week) |
| AI usage summary | [apps/mobile-flutter/README.md → AI usage](apps/mobile-flutter/README.md#ai-usage-summary) |
| Screenshots | [docs/screenshots/mobile-flutter/](docs/screenshots/mobile-flutter/) |
| Build artifact | `flutter build apk --release` → `build/app/outputs/flutter-apk/app-release.apk` (also attached to the GitHub release for the submission) |
| Demo video script | [docs/demos/week4-video-script.md](docs/demos/week4-video-script.md) |

---

## Attribution

This project builds on the **CareConnect accessibility reference implementation** by
**[Alireza Minagar](https://github.com/aliminagar)** — AI/ML Software Engineer, Founder
& CTO of Perfect Strokes LLC, and Adjunct Professor at UMGC — used under the MIT License
with the original copyright notice retained in [`License`](License).

The original README, including the full screen-by-screen walkthrough, is preserved at
[docs/reference-app-readme.md](docs/reference-app-readme.md).

SWEN 661 team contributions are listed under [Team](#team) above.

---

## License

Distributed under the MIT License. See [`License`](License) for the full text.

```
Copyright (c) 2026 Alireza Minagar / Perfect Strokes LLC
```

---

## Acknowledgments

- University of Maryland Global Campus — SWEN 661 (User Interface Implementation)
- The WCAG 2.2 guidelines and the WAI-ARIA Authoring Practices
- Original scaffolding accelerated with Bolt.new; completed and hardened locally

---

## Disclaimer

CareConnect is an **educational prototype** built as a course artifact. It is not a
medical device, provides no medical, dosage, or clinical advice, and must not be used
for real patient care or to manage actual medications. It uses mock data only and is not
intended to store real protected health information (PHI). For any real health decision,
consult a licensed clinician.
