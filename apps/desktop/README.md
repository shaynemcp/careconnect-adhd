# @careconnect/desktop

Electron shell for CareConnect. Loads the Vite dev server in development and the
built `apps/web/dist` bundle in production, and adds what a desktop user expects
on top of the shared web app: a full menu bar, keyboard shortcuts for every
action, a Keyboard Shortcuts help window, zoom to 200%, and a high-contrast
toggle.

```bash
npm run dev:web          # terminal 1 — Vite on http://localhost:5173
npm run dev:desktop      # terminal 2 — from the repo root
npm test --workspace @careconnect/desktop       # menu + shortcut unit tests (node:test, no Electron needed)
npm run typecheck --workspace @careconnect/desktop
```

## How it fits together

| File | Role |
| --- | --- |
| `src/shortcuts.cjs` | **Single source of truth** for every command and shortcut. The menu, the help window and the table below all come from it. |
| `src/menu.cjs` | Builds the menu template from `shortcuts.cjs`. No Electron import, so it is unit-tested. Windows gets Alt access keys (`&File`); macOS gets the app menu first. |
| `src/main.cjs` | Window (1440×900, minimum 1024×700), menu, zoom, high contrast, print, help window, navigation guard. |
| `src/preload.cjs` | The only bridge to the web app (`contextIsolation`, `sandbox`, no Node in the renderer). Turns menu actions into a route change, a `careconnect:command` DOM event, or the `cc-high-contrast` class on `<html>`. |
| `src/shortcutsWindow.cjs` | Accessible Keyboard Shortcuts page (Help → Keyboard Shortcuts, `Ctrl+/` or `F1`, `Esc` closes). |
| `test/menu.test.cjs` | 10 tests: unique shortcuts, menu order and access keys, routing, dose command, native Edit roles, platform labels, help page completeness. |

## Keyboard shortcuts

`Ctrl` on Windows, `⌘` on macOS. Menus open with `Alt` + the underlined letter on
Windows (`Alt+F` File, `Alt+E` Edit, `Alt+V` View, `Alt+D` Dose, `Alt+H` Help).

| Menu | Action | Shortcut |
| --- | --- | --- |
| File | New Medication… | `Ctrl+N` |
| File | New Appointment… | `Ctrl+Shift+N` |
| File | Print… | `Ctrl+P` |
| File | Quit CareConnect | `Ctrl+Q` |
| Edit | Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |
| Edit | Cut / Copy / Paste | `Ctrl+X` / `Ctrl+C` / `Ctrl+V` |
| Edit | Find… | `Ctrl+F` |
| View | Today / Medications / Appointments | `Ctrl+1` / `Ctrl+2` / `Ctrl+3` |
| View | Schedule / Caregiver Dashboard / Activity Log | `Ctrl+4` / `Ctrl+5` / `Ctrl+6` |
| View | Zoom In / Zoom Out / Actual Size | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| View | High Contrast | `Ctrl+Shift+H` |
| View | Toggle Full Screen | `F11` |
| Dose | Mark Next Dose Taken | `Ctrl+Enter` |
| Dose | Skip Next Dose… | `Ctrl+Shift+S` |
| Dose | Undo Last Dose Change | `Ctrl+Shift+U` |
| Dose | Call My Caregiver | `Ctrl+Shift+C` |
| Help | Keyboard Shortcuts | `Ctrl+/` |
| Help | CareConnect Help | `F1` |

Rules the list follows: no shortcut is a single printable key (WCAG 2.1.4), no
two commands share a key (tested), and standard OS shortcuts keep their usual
meaning.

## Still to do (Week 8+)

- Web app listens for `careconnect:command` (`mark-next-dose-taken`, `skip-next-dose`,
  `undo-dose-change`, `call-caregiver`, `focus-search`) and styles `html.cc-high-contrast`.
- Production build: `BrowserRouter` does not resolve under `loadFile()`; switch the
  desktop build to `HashRouter` or serve `dist` over a custom protocol.
- `electron-builder` targets once ADR 0002 is decided; NVDA / VoiceOver pass.

## Open decision

The desktop OS target is **unresolved** — Assignment 1 asks for one OS, the Team
Charter lists both Windows and macOS. Electron builds both from this one
codebase, so the shell is written to be OS-neutral and nothing here blocks on the
decision. See [ADR 0002](../../docs/decisions/0002-desktop-os-target.md). The only
platform difference so far (macOS app menu, `⌘` labels) is isolated in
`menu.cjs` / `shortcuts.cjs` and driven by a `platform` argument.

Do not add macOS-only or Windows-only APIs without isolating them behind an
adapter and noting it in the ADR.
