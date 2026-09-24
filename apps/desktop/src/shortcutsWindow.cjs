/**
 * Accessible "Keyboard Shortcuts" help page (Help → Keyboard Shortcuts, Ctrl+/ or F1).
 * Generated from shortcuts.cjs so it always matches the real menu.
 */
const { COMMANDS, MENU_ORDER, displayAccelerator } = require('./shortcuts.cjs');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function shortcutsHtml(platform) {
  const sections = MENU_ORDER.map((menu) => {
    const rows = COMMANDS.filter((c) => c.menu === menu && c.accelerator)
      .map((c) => `<tr><th scope="row">${esc(c.label.replace('…', ''))}</th><td><kbd>${esc(displayAccelerator(c.accelerator, platform))}</kbd></td></tr>`)
      .join('');
    return `<section aria-labelledby="h-${menu}"><h2 id="h-${menu}">${menu}</h2><table><thead><tr><th scope="col">Action</th><th scope="col">Shortcut</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Keyboard Shortcuts — CareConnect</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
  body{font:16px/1.5 "Segoe UI",system-ui,sans-serif;margin:0;padding:24px 32px;color:#1b1f23;background:#fff}
  h1{font-size:24px;margin:0 0 4px} p{margin:0 0 16px;color:#44505a}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px 32px}
  h2{font-size:18px;margin:16px 0 8px;color:#1f5e72} table{border-collapse:collapse;width:100%}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #d8dee4} thead th{font-size:14px;color:#44505a}
  tbody th{font-weight:500} kbd{font:600 14px ui-monospace,Consolas,monospace;background:#f0f3f5;border:1px solid #c5ced6;border-radius:4px;padding:2px 6px}
  :focus-visible{outline:3px solid #1f5e72;outline-offset:2px}
  @media (prefers-color-scheme: dark){body{background:#12171b;color:#e8edf1}p,thead th{color:#b2bec8}h2{color:#7cc4d8}th,td{border-color:#2d3740}kbd{background:#1e262c;border-color:#3b4852}}
</style></head><body>
<main><h1>Keyboard shortcuts</h1><p>Every CareConnect action can be done from the keyboard. Press <kbd>Esc</kbd> to close this window. Menus: <kbd>Alt</kbd> then the underlined letter (Windows).</p>
<div class="grid">${sections}</div></main></body></html>`;
}

module.exports = { shortcutsHtml };
