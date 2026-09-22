# Team Charter — Team E-Echo

**Course:** SWEN 661 9040 — User Interface Implementation (2268)
**Assignment:** 1, Part 2
**Project:** CareConnect
**Effective:** Week 1, Fall 2026 semester

> **Canonical source:** the authoritative, team-completed version of this document is the
> Word file on UMGC SharePoint — **[Team Charter (SharePoint)](https://umuc365-my.sharepoint.com/:w:/g/personal/atabor7_student_umgc_edu/IQBqLgOJkCH2TI2Zoz7p973WASfeTrcvr2I8naF3z8AHxvs?e=Bd2ogj)**.
> Accessible to anyone signed in with a UMGC organization account.
> This Markdown copy is the in-repo mirror; when the two differ, the SharePoint
> document wins. Update this file whenever the Word document changes.

---

## 1. Team information

**Team name:** Team E-Echo

| Member | Email | GitHub | Computer OS |
| --- | --- | --- | --- |
| Shayne McPherson | shaynemcp@icloud.com | [@shaynemcp](https://github.com/shaynemcp) | macOS |
| Quinton Coleman | colemaninternational80@gmail.com | [@colemaninternational80-cmyk](https://github.com/colemaninternational80-cmyk) | Windows |
| Antonio Wilson | — | [@awilso112](https://github.com/awilso112) | Windows 11 |

**Membership change (Week 6).** Abel Tabor ([@abelktabor](https://github.com/abelktabor))
was a member in Weeks 1–5 and moved to another team in Week 6. Antonio Wilson joined in
Week 6. Abel's work remains in the repository history and the submission record.

**Desktop deployment target:** the team targets **both Windows and macOS** for the
Electron desktop application, which the team OS mix supports directly — two members
develop on Windows and one on macOS, so both targets can be built and accessibility-tested
natively without virtual machines. Linux is a possible future iteration.

**Repository:** https://github.com/shaynemcp/careconnect-swen661-reference

> **Note on contact details.** The Word charter also records each member's emergency
> contact phone number. Those are deliberately **not** mirrored here — the repository may
> be made public for grading, and phone numbers are not required by the repository setup
> deliverable. They remain in the SharePoint document, which is the graded artifact.

---

## 2. Communication plan

| Item | Agreement |
| --- | --- |
| **Primary channel** | Microsoft Teams |
| **Expected response time** | 24 hours |
| **Weekly meeting** | Fridays, 7:00–8:00 PM EST |
| **Emergency contact method** | Direct phone contact — numbers exchanged among members and recorded in the SharePoint charter |

---

## 3. Roles and rotation

Three roles rotate every two weeks so that every member performs every role twice across
the semester.

### Role responsibilities

**Technical Lead** — authors the architecture for that week's code, and outlines what each
group member should be adding to the GitHub repository.

**QA / Testing Lead** — takes submitted changes from the repository and develops tests and
unit cases to fulfill the weekly requirements.

**Documentation Lead** — gathers all deliverables and ensures the information filled in by
members matches what is actually done in the repository and deliverables.

### Rotation schedule

| Weeks | Technical Lead | QA / Testing Lead | Documentation Lead |
| --- | --- | --- | --- |
| 1–2 | Shayne | Quinton | Abel |
| 3–4 | Abel | Shayne | Quinton |
| 5–6 | Quinton | Abel | Shayne |

From Week 6, after the membership change, the rotation ends and work is assigned per issue
at the weekly sync.

---

## 4. Git workflow

> **Updated 2026-09-05 by [ADR 0003](decisions/0003-repository-home.md)**, accepted at
> the team meeting: `dev` is the integration branch. The sections below reflect that
> decision; ADR 0003 is the source of truth if they ever disagree again.

### Branch model

- **`main`** — holds submitted milestones. Protected by the `main-protection` ruleset
  (see [repo-governance.md §2](repo-governance.md#2-branch-protection-on-main)).
- **`dev`** — the integration branch. Day-to-day work lands here.
- **feature branches** — cut from `dev`, merged back into `dev`.

`dev` merges into `main` at a milestone or submission, not per feature.

### Branch naming

**Convention:** `<name>/<short-feature-description>`, branched off `dev`.

Examples: `shayne/patient-medications`, `antonio/flutter-dose-semantics`, `quinton/dose-undo-tests`

This mirrors the SWEN 670 Team Echo per-member branch pattern.

### Commit frequency

Commit **at least once per work session**. Avoid single giant end-of-week commits.

### Pull request process

1. Open a pull request into `dev` when a feature or fix is ready
2. **At least one other team member reviews before merge** — mirrors Team Echo's
   reviewed-PR requirement
3. Reviewers check functionality **and WCAG 2.2 AA accessibility compliance**
4. CI must be green. Every PR into `main` or `dev` runs `ci.yml`; the mobile apps
   additionally run `flutter.yml` and `react-mobile.yml` when their directories change

A release PR from `dev` into `main` follows the same process, and additionally has to
satisfy the `main-protection` ruleset: one approving review, resolved conversations, and
the two required checks green.

### Merge policy

**Squash-merge after approval.** The `main-protection` ruleset enforces this on `main`
(squash is the only permitted merge method), so `dev` does not fast-forward into `main` —
after a release, re-sync `dev` from `main`.

### Definition of Done

Mirroring the Team Echo / PM standard, work is complete only when it is:

1. **Merged** via a reviewed pull request
2. **Tested**
3. **Checked for accessibility** (WCAG 2.2 AA)
4. **Documented**
5. **Demoed** to the team

---

## 5. Work distribution

**Work distribution.** Work is assigned by the weekly leads. Each member is expected to
work with all aspects of the project. Leads confirm that each member has completed the
assigned materials for that week.

**Code reviews.** At least one teammate reviews each pull request before merge, checking
functionality and WCAG 2.2 AA accessibility compliance.

**Work contribution acceptance.** Work is accepted once it is merged via a reviewed pull
request and the weekly Documentation Lead confirms it matches what is expected in the
repository and deliverables for that week.

---

## 6. Decision making

- Major decisions are decided by **majority vote**.
- Disagreements are handled by the **Technical Lead on rotation** for that week.

---

## 7. Conflict resolution

### Steps to resolve issues

1. Discuss it directly with the teammate(s) involved — asynchronously in the team chat, or
   live at the Friday meeting.
2. If that does not resolve it, bring it to the full team for a majority vote per the
   decision-making policy above.

### When the instructor should be involved

1. A disagreement cannot be resolved by team discussion or vote **within one week**.
2. A team member is unresponsive for **more than 5 days** despite direct outreach, putting
   shared deliverables at risk.

---

## 8. Signatures

| Member | Signature | Date |
| --- | --- | --- |
| Abel K. Tabor | Abel K. Tabor | |
| Shayne McPherson | Shayne M | |
| Quinton Coleman |Quinton Coleman | August 18,2026|

> Signature status is mirrored from the SharePoint document. Quinton's signature line was
> still blank at the time of this sync — confirm all three are signed before submission.


