# Contributing to CareConnect

Team E-Echo — SWEN 661. This is the onboarding doc: read it once before your first
pull request.

---

## Get set up

Follow [docs/SETUP.md](docs/SETUP.md). Short version:

```bash
nvm use && npm install && npm run dev:web
```

Then skim [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md). The accessibility requirements are
graded and non-negotiable, so they are worth the ten minutes up front.

---

## Team norms

| Norm | Detail |
| --- | --- |
| **Response time** | Within **24 hours**. If you cannot get to something, say so — silence is the problem, not slippage. |
| **Weekly meeting** | Fridays, 7:00–8:00 PM EST |
| **Channel** | Microsoft Teams |
| **Roles** | Technical / QA-Testing / Documentation Lead rotated every 2 weeks in Weeks 1–5; from Week 6 work is assigned per issue at the weekly sync — see the [charter](docs/team-charter.md#3-roles-and-rotation) |

---

## Branch model

- **`main`** holds submitted milestones and is protected — you cannot push to it.
- **`dev`** is the integration branch. This is where your work goes.
- Your feature branch is cut from `dev` and merged back into `dev`.

`dev` merges into `main` at a milestone, not per feature. See
[ADR 0003](docs/decisions/0003-repository-home.md) for why, and
[docs/repo-governance.md §2](docs/repo-governance.md#2-branch-protection-on-main) for
what `main` enforces.

## Branch naming

```
<name>/<short-feature-description>
```

Branched off `dev`. Examples:

```
shayne/patient-medications
antonio/flutter-dose-semantics
quinton/dose-undo-tests
```

Your own first name, then what the branch does. Not `feature/` or `fix/`.

## Commits

Commit **at least once per work session**. No single giant end-of-week commit —
they are unreviewable, and they hide which change broke what.

Write the subject in the imperative: "Add undo to dose actions", not "Added" or
"Adding". Reference the issue when there is one: `Closes #14`.

## Pull requests

1. Push your branch and open a PR into `dev`
2. Fill in the template — **including the accessibility checklist**. An incomplete
   checklist is grounds for requesting changes.
3. **At least one other team member reviews** before merge
4. CI must be green
5. **Squash-merge** after approval

Never push directly to `main` or `dev` — both take changes by pull request only.

Releases go through a PR from `dev` into `main`, same process, plus whatever the
`main-protection` ruleset requires at the time.

### Reviewing

Reviewers check functionality **and WCAG 2.2 AA compliance**. Prefix non-blocking
comments with `nit:` so the author can tell suggestions from blockers. Approving
without reading is a charter violation — the point of review is that a second
person actually looked.

Turn reviews around within 24 hours. If you cannot, say so in the PR.

---

## Definition of Done

From the Team Charter. Work is complete only when **all five** are true:

1. **Merged** via a reviewed pull request
2. **Tested**
3. **Checked for accessibility** (WCAG 2.2 AA)
4. **Documented**
5. **Demoed** to the team

---

## Before you write UI

Three rules that come up in review constantly, so they are worth knowing first:

**Never hardcode a color.** Import from `@careconnect/design-tokens`. Every token
there has a verified contrast ratio; a hardcoded hex has nothing. Adding a color
means adding it to the tokens package and running
`npm run check:contrast -w @careconnect/design-tokens`.

**Never convey meaning with color alone.** Status needs an icon and a text label
too. A red dot means nothing to a screen reader or to someone who cannot
distinguish it.

**Never make the user remember something from a previous screen.** If a value
matters here, show it here. This is the single most common way this product's
requirements get violated by accident.

---

## Documentation

If your change makes a doc wrong, fix the doc in the same PR. A stale setup
instruction costs the next person more time than it cost you to update it.

Decisions that shape the codebase get an ADR in
[docs/decisions/](docs/decisions/). "We discussed it in Teams" is not a record.
