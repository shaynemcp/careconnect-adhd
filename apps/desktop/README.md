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
| `src/main.cjs` | Window (1440×900, minimum 1024×700 or the display's work area if smaller), menu, zoom, high contrast, print, help window, navigation guard. |
| `src/windowState.cjs` | Saves the window's size, position and maximized state on close and restores them on launch. A position on a monitor that is no longer connected opens centered instead. |
| `src/links.cjs` | Link safety: only `https:`, `http:`, `mailto:` and `tel:` links are handed to the OS, and the dev-server check compares origins. |
| `src/preload.cjs` | The only bridge to the web app (`contextIsolation`, `sandbox`, no Node in the renderer). Turns menu actions into a route change, a `careconnect:command` DOM event, or the `cc-high-contrast` class on `<html>`. |
| `src/shortcutsWindow.cjs` | Accessible Keyboard Shortcuts page (Help → Keyboard Shortcuts, `Ctrl+/` or `F1`, `Esc` closes). |
| `test/menu.test.cjs` | 16 tests: unique shortcuts per platform, menu order and access keys, routing, dose command, native Edit roles, platform labels, help page, macOS Redo and Full Screen keys, context-menu parity, selection-scoped items, window management, link safety, window-state restore. |

## Keyboard shortcuts

Generated from `src/shortcuts.cjs`. Menus open with `Alt` + the underlined letter on
Windows (`Alt+F` File, `Alt+E` Edit, `Alt+V` View, `Alt+D` Dose, `Alt+H` Help). On
macOS the menus are in the global menu bar (`⌃F2` moves focus there), the app menu
comes first (About, Services, Hide `⌘H`, Quit `⌘Q`) and a Window menu adds
Minimize `⌘M`.

| Menu | Command | Windows | macOS |
| --- | --- | --- | --- |
| File | New Medication… | `Ctrl+N` | `⌘N` |
| File | New Appointment… | `Ctrl+Shift+N` | `⇧⌘N` |
| File | Print… | `Ctrl+P` | `⌘P` |
| File | Close Window | n/a | `⌘W` |
| File | Exit | menu only | n/a |
| Edit | Undo | `Ctrl+Z` | `⌘Z` |
| Edit | Redo | `Ctrl+Y` | `⇧⌘Z` |
| Edit | Cut | `Ctrl+X` | `⌘X` |
| Edit | Copy | `Ctrl+C` | `⌘C` |
| Edit | Paste | `Ctrl+V` | `⌘V` |
| Edit | Select All | `Ctrl+A` | `⌘A` |
| Edit | Find… | `Ctrl+F` | `⌘F` |
| Edit | Open Medication | menu only | menu only |
| Edit | Edit Medication… | menu only | menu only |
| Edit | Duplicate Medication | menu only | menu only |
| Edit | Pause Reminders | menu only | menu only |
| Edit | Share with Caregiver | menu only | menu only |
| Edit | Delete Medication… | `Del` | `⌘⌫` |
| View | Today | `Ctrl+1` | `⌘1` |
| View | Medications | `Ctrl+2` | `⌘2` |
| View | Appointments | `Ctrl+3` | `⌘3` |
| View | Schedule | `Ctrl+4` | `⌘4` |
| View | Caregiver Dashboard | `Ctrl+5` | `⌘5` |
| View | Activity Log | `Ctrl+6` | `⌘6` |
| View | Zoom In | `Ctrl+=` | `⌘=` |
| View | Zoom Out | `Ctrl+-` | `⌘-` |
| View | Actual Size | `Ctrl+0` | `⌘0` |
| View | High Contrast | `Ctrl+Shift+H` | `⇧⌘H` |
| View | Toggle Full Screen | `F11` | `⌃⌘F` |
| Dose | Mark Next Dose Taken | `Ctrl+Enter` | `⌘↩` |
| Dose | Skip Next Dose… | `Ctrl+Shift+S` | `⇧⌘S` |
| Dose | Remind Me in 10 Minutes | menu only | menu only |
| Dose | Edit Schedule… | menu only | menu only |
| Dose | Undo Last Dose Change | `Ctrl+Shift+U` | `⇧⌘U` |
| Dose | Call My Caregiver | `Ctrl+Shift+C` | `⇧⌘C` |
| Help | Keyboard Shortcuts | `Ctrl+/` | `⌘/` |
| Help | Keyboard Shortcuts Help | `F1` | `F1` |
| Help | About CareConnect | menu only | n/a |

Rules the list follows: no shortcut is a single printable key (WCAG 2.1.4), no
two commands share a key on any platform (tested), and standard OS shortcuts keep
their usual meaning. Where Windows and macOS differ (Redo, Full Screen, Delete,
Exit/Quit) each platform gets its own convention. The medication items in the Edit
menu stay disabled until the web app reports a selected medication
(`careconnectDesktop.setMedicationSelected`), and `Del` is shown but not registered
as a global key on Windows, so it never deletes a medication while someone is typing.

## Still to do (Week 8+)

- Web app listens for `careconnect:command` (`mark-next-dose-taken`, `skip-next-dose`,
  `remind-in-10-minutes`, `edit-schedule`, `undo-dose-change`, `call-caregiver`,
  `focus-search` and the medication commands), calls `setMedicationSelected`, and
  styles `html.cc-high-contrast`.
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
