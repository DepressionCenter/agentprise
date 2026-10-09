<!--
This file is part of Agentprise
docs/compliance.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Security, privacy, and accessibility posture of the Agentprise web app:
         the controls in place, the evidence behind them, and the known gaps.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Compliance

[Back to project README](../README.md)

This page records what Agentprise does to protect people and their data, and how
each claim was checked. It is written for an auditor, a privacy reviewer, or a
maintainer who needs evidence rather than promises. Every statement names the
check that supports it and the date it was run. Anything not yet checked is
listed under known gaps.

### Privacy and data handling

- Nothing a person types or uploads leaves the browser. The app makes no network
  request except to its own `library/` folder and, on the production host only,
  to Google Analytics. Evidence: the script contains one `fetch` call for
  `library/catalog.json` and the library files, and one dynamically added
  analytics script. A review of the script on 2026-10-09 found no other request.
- Google Analytics loads only when the page hostname is
  `code.depressioncenter.org`. Local copies, forks, and GitHub Pages previews never
  contact Google. Evidence: the `loadAnalyticsIfProduction` function in
  `index.html` returns before adding the tag on any other host; the headless
  browser walkthrough on `localhost` on 2026-10-09 recorded no request to
  `googletagmanager.com`.
- The draft is kept in the browser's `localStorage` only, under one key, and the
  footer offers "Clear my draft". When storage is blocked, the app still works and
  says the draft will not be kept.
- No secrets, keys, tokens, or configuration files exist in this repository, so
  there is no `.env` file and no `.env.example`.
- Agent instructions are the creator's own text. The app does not inspect them,
  send them anywhere, or act on them. Text inside an uploaded file that looks like
  instructions to the app or to an AI is treated as plain text.
- Exported files carry the creator's own copyright and license first. The
  `.agent` file and the bundle carry a notice naming the creator and then the
  app; the Teams package carries no notice because its schemas reject extra keys.

### Security controls

- Uploaded files are untrusted input. Every value read from a file passes through
  `normalizeAgent`, which type-checks and length-caps each field before it reaches
  the form. Evidence: `tests/engine.test.mjs` and `tests/formats.test.mjs`
  (44 tests passing on 2026-10-09).
- The ZIP reader caps the entry count at 200, each entry at 10 MB, and the whole
  archive at 50 MB. It rejects names containing `..`, a leading slash, a
  backslash, or a drive letter; refuses encrypted and 64-bit archives; verifies
  every checksum; and stops inflating as soon as output passes the declared size.
  Evidence: the `zip` test suite, including a path-traversal name, an oversize
  declared length, a mislabeled inflated size, and a damaged checksum.
- JSON and YAML are parsed, never evaluated. The YAML reader handles only the
  subset the bundle uses and skips anything else with a warning.
- All text reaches the page through `textContent`. The script never assigns
  `innerHTML`. Evidence: a search of `index.html` for `innerHTML` on 2026-10-09
  found no use. A description containing a script tag round-trips as literal text
  (test "keeps script tags as literal text").
- Icons are decoded through an `Image` element and redrawn on a canvas, which
  strips any embedded content. Only PNG and JPG uploads are accepted; SVG is not.
  Imported icons are checked against the PNG signature and header.
- Exported file names are reduced to letters, digits, spaces, dots, hyphens, and
  underscores.
- There are no dependencies at runtime. The test tooling uses only the Node
  built-in test runner.

### Accessibility

Target: WCAG 2.2 AA. The app is one page with six tab panels.

#### Automated scan

axe-core 4.14.0 ran on every tab in light mode and on the Home, Build, and
Download tabs in dark mode, through a headless Chromium walkthrough on
2026-10-09, with the WCAG 2.0, 2.1, and 2.2 A and AA rule sets plus best
practices. Zero violations after two fixes: the hidden file input gained a
label, and the starter reorder buttons' accessible names now include their
visible text.

#### Keyboard and reflow checks run in the walkthrough

- The tab strip moves with Left, Right, Home, and End, with roving `tabindex`.
- Starting a new agent moves focus to the Name field.
- Moving a conversation starter up keeps focus on the moved row's button.
- Inline link errors appear on blur and clear when fixed.
- Opening a file while a draft exists asks first in a native dialog, which
  returns focus when closed.
- No horizontal scrolling at 320 CSS pixels wide on any tab.
- The draft survives a reload and the "Clear my draft" control removes it.

#### Contrast

Every color pair the stylesheet uses, computed on 2026-10-09 with the WCAG
relative luminance formula. Normal text needs 4.5:1; interface components and
large text need 3:1.

| Light mode pair | Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Body text on page | `#1B1B1B` | `#FFFFFF` | 17.22:1 | 4.5:1 | Pass |
| Body text on surface | `#1B1B1B` | `#F3F5F8` | 15.77:1 | 4.5:1 | Pass |
| Muted text on page | `#4A5560` | `#FFFFFF` | 7.61:1 | 4.5:1 | Pass |
| Muted text on surface | `#4A5560` | `#F3F5F8` | 6.97:1 | 4.5:1 | Pass |
| Link on page | `#2F65A7` | `#FFFFFF` | 5.93:1 | 4.5:1 | Pass |
| Link on surface | `#2F65A7` | `#F3F5F8` | 5.43:1 | 4.5:1 | Pass |
| Header text on U-M Blue | `#FFFFFF` | `#00274C` | 15.06:1 | 4.5:1 | Pass |
| Primary button text | `#FFFFFF` | `#00274C` | 15.06:1 | 4.5:1 | Pass |
| Secondary button text | `#00274C` | `#FFFFFF` | 15.06:1 | 4.5:1 | Pass |
| Error text on page | `#A4121C` | `#FFFFFF` | 7.83:1 | 4.5:1 | Pass |
| Success text on page | `#1F6F3F` | `#FFFFFF` | 6.17:1 | 4.5:1 | Pass |
| Notice text on notice | `#1B1B1B` | `#FFF4CC` | 15.64:1 | 4.5:1 | Pass |
| Input border on page (component) | `#8A96A3` | `#FFFFFF` | 3.01:1 | 3:1 | Pass |
| Focus ring on page (component) | `#2F65A7` | `#FFFFFF` | 5.93:1 | 3:1 | Pass |
| Focus ring on U-M Blue (Maize) | `#FFCB05` | `#00274C` | 9.89:1 | 3:1 | Pass |
| Selected tab text on page | `#1B1B1B` | `#FFFFFF` | 17.22:1 | 4.5:1 | Pass |
| Skip link text on Maize | `#00274C` | `#FFCB05` | 9.89:1 | 4.5:1 | Pass |

| Dark mode pair | Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Body text on page | `#F2F4F6` | `#14171B` | 16.31:1 | 4.5:1 | Pass |
| Body text on surface | `#F2F4F6` | `#1E2329` | 14.35:1 | 4.5:1 | Pass |
| Muted text on page | `#B8C2CC` | `#14171B` | 9.95:1 | 4.5:1 | Pass |
| Muted text on surface | `#B8C2CC` | `#1E2329` | 8.76:1 | 4.5:1 | Pass |
| Link on page | `#9EC5F2` | `#14171B` | 10.04:1 | 4.5:1 | Pass |
| Link on surface | `#9EC5F2` | `#1E2329` | 8.83:1 | 4.5:1 | Pass |
| Header text on U-M Blue | `#FFFFFF` | `#00274C` | 15.06:1 | 4.5:1 | Pass |
| Primary button text on Maize | `#00274C` | `#FFCB05` | 9.89:1 | 4.5:1 | Pass |
| Secondary button text on surface | `#F2F4F6` | `#1E2329` | 14.35:1 | 4.5:1 | Pass |
| Error text on page | `#FF9AA2` | `#14171B` | 8.90:1 | 4.5:1 | Pass |
| Success text on page | `#8FD9A8` | `#14171B` | 10.84:1 | 4.5:1 | Pass |
| Notice text on notice | `#F2F4F6` | `#3A2E00` | 12.13:1 | 4.5:1 | Pass |
| Input border on page (component) | `#7C8893` | `#14171B` | 4.97:1 | 3:1 | Pass |
| Focus ring on page (Maize, component) | `#FFCB05` | `#14171B` | 11.81:1 | 3:1 | Pass |
| Secondary button border (component) | `#B8C2CC` | `#1E2329` | 8.76:1 | 3:1 | Pass |

Maize is never used as text on a white background.

#### Other accessibility properties

- Structure comes from real elements: one `h1`, a `tablist` with `tab` and
  `tabpanel` roles, `fieldset` and `legend` for grouped controls, a captioned
  table with header cells, and native `details`, `dialog`, and `button` elements.
- Every input has a visible label. Hints and errors are joined to their inputs
  with `aria-describedby`, and invalid inputs carry `aria-invalid`.
- Status messages go to one polite live region. Nothing moves, flashes, or
  auto-advances. Smooth scrolling is applied only when the system does not ask
  for reduced motion.
- Pointer targets are at least 44 by 44 CSS pixels. Focus is a 3 pixel ring.
- Text is 16 pixels at the base size with a system font and a 1.5 line height.
  Body text is capped at about 72 characters per line and left aligned.
- Every drag action (dropping a file) has a button alternative (Browse for a
  file). Reordering starters uses Move up and Move down buttons.
- Interface text aims at a grade 7 to 9 reading level and avoids exclamation
  marks in system messages.

### Known gaps and checks that still need a person

- A screen reader pass on the main flows (NVDA or JAWS on Windows, VoiceOver on
  macOS) has not been done. The live region, the dialog, and the starters list
  are the parts most worth listening to.
- 200 percent zoom was checked only through the 320 pixel reflow test, not by a
  person zooming a desktop browser.
- Uploads to real Gemini, Claude, SharePoint, and Teams accounts are open; see
  the [formats page](formats.md).
- No statement on this page is a claim of HIPAA compliance. The app handles agent
  descriptions, not health data, and keeps nothing on a server.

### Conclusion

The controls above are in place and the checks listed were run on the dates
given. Rerun the test suite and the browser walkthrough after any change to
`index.html`, and update this page in the same change set.

### Additional resources

- [Formats and verified vendor facts](formats.md)
- [Accessibility skill](../skills/accessibility/SKILL.md)
- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [axe-core](https://github.com/dequelabs/axe-core)

[Back to project README](../README.md)
