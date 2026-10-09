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
  to Google Analytics. Evidence: the script contains two `fetch` calls, for
  `library/catalog.json` and for the `.zip` files it lists, and one dynamically
  added analytics script. A review of the script on 2026-10-09 found no other
  request, and a served browser walkthrough the same day recorded only
  `library/catalog.json` and `library/caveman.zip` as library requests and no
  request to another host.
- Library entries are untrusted input like any dropped file. Each catalog line
  is type-checked and capped, its file name must be a plain name ending in
  `.zip` so it cannot point outside the folder, and each bundle goes through the
  same importer and `normalizeAgent` path as an upload. Evidence:
  `tests/library.test.mjs`.
- The page loads no web font. Its font stacks name IBM Plex first, so the face is
  used where it is installed, and fall back to the system interface font. A font
  request would contact a third party from every visitor's browser.
- Google Analytics loads only when the page hostname is
  `code.depressioncenter.org`. Local copies, forks, and GitHub Pages previews never
  contact Google. Evidence: the `loadAnalyticsIfProduction` function in
  `index.html` returns before adding the tag on any other host; the headless
  browser walkthrough on `localhost` on 2026-10-09 recorded no request to any host
  other than `localhost`.
- The draft is kept in the browser's `localStorage` only, under one key. "Start
  over" on the Workspace page removes it after asking. When storage is blocked,
  the app still works and the sidebar says the draft will not be kept.
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
  the form. Evidence: `tests/engine.test.mjs`, `tests/formats.test.mjs`, and
  `tests/library.test.mjs` (48 tests passing on 2026-10-09).
- The ZIP reader caps the entry count at 200, each entry at 10 MB, and the whole
  archive at 50 MB. It rejects names containing `..`, a leading slash, a
  backslash, or a drive letter; refuses encrypted and 64-bit archives; verifies
  every checksum; and stops inflating as soon as output passes the declared size.
  Evidence: the `zip` test suite, including a path-traversal name, an oversize
  declared length, a mislabeled inflated size, and a damaged checksum.
- JSON and YAML are parsed, never evaluated. The YAML reader handles only the
  subset the bundle uses and skips anything else with a warning.
- All text reaches the page through `textContent`. The script never assigns
  `innerHTML`. The Details code view, which highlights the person's own words
  inside the generated files, is built from text nodes and `mark` elements only.
  Evidence: a search of `index.html` for `innerHTML` on 2026-10-09 found no use,
  and the browser walkthrough confirms that a description containing a script tag
  appears as literal text in the code view.
- Icons are decoded through an `Image` element and redrawn on a canvas, which
  strips any embedded content. Only PNG and JPG uploads are accepted; SVG is not.
  Imported icons are checked against the PNG signature and header.
- Exported file names are reduced to letters, digits, spaces, dots, hyphens, and
  underscores.
- There are no dependencies at runtime. The test tooling uses only the Node
  built-in test runner.

### Accessibility

Target: WCAG 2.2 AA. The app is one page with four views (Workspace, Library,
Details, Help) reached from a sidebar of links.

#### Automated scan

axe-core 4.14.0 ran on 2026-10-09 through a headless Chromium walkthrough, with
the WCAG 2.0, 2.1, and 2.2 A and AA rule sets plus best practices, on the start
page, the editor, Details, Library, and Help in light mode, and on the start
page, the editor, Details, and Help in dark mode. A second run the same day
scanned the Library with the Caveman card in light and dark mode. Zero
violations.

#### Keyboard and reflow checks run in the walkthrough

- "Create new" opens the editor with focus on the name blank. Each blank sits
  under a visible question that is its label; the example question blanks are
  named "Example question 1", "Example question 2", and so on.
- "Add another question" adds a blank and moves focus to it.
- Confirmations in the status bar ("Copied.", "Started over.") clear themselves
  after eight seconds. They are announced when they appear, so nothing is lost.
  Errors, such as a file the app cannot open, stay until the person acts.
- Links that leave the app open in a new tab and carry hidden text that says so.
- The product tabs in Details move with Left, Right, Home, and End, with roving
  `tabindex`, and the file list is a set of buttons.
- Inline link errors appear on blur and clear when fixed.
- The template button asks before replacing text, in a native dialog that
  returns focus when closed.
- Opening a file while a draft exists asks first in the same dialog.
- The old hashes `#home`, `#build`, `#check`, and `#download` still open the
  matching view.
- No horizontal scrolling at 320 CSS pixels wide on any view; the sidebar becomes
  a strip above the content.
- The draft survives a reload and reopens the editor. "Start over" removes it
  and returns focus to "Create new".

#### Contrast

Every color pair the stylesheet uses, computed on 2026-10-09 with the WCAG
relative luminance formula. Normal text needs 4.5:1; interface components and
large text need 3:1.

| Light mode pair | Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Body text on a card | `#1B2430` | `#FFFFFF` | 15.65:1 | 4.5:1 | Pass |
| Body text on the shell | `#1B2430` | `#F4F5F7` | 14.35:1 | 4.5:1 | Pass |
| Body text on the active menu item | `#1B2430` | `#EEF1F5` | 13.82:1 | 4.5:1 | Pass |
| Muted text on a card | `#5B6572` | `#FFFFFF` | 5.92:1 | 4.5:1 | Pass |
| Muted text on the shell | `#5B6572` | `#F4F5F7` | 5.42:1 | 4.5:1 | Pass |
| Muted text on the active menu item | `#5B6572` | `#EEF1F5` | 5.22:1 | 4.5:1 | Pass |
| Link and blank text on a card | `#2B4C7E` | `#FFFFFF` | 8.61:1 | 4.5:1 | Pass |
| Link text on the shell | `#2B4C7E` | `#F4F5F7` | 7.90:1 | 4.5:1 | Pass |
| Primary button text | `#FFFFFF` | `#2B4C7E` | 8.61:1 | 4.5:1 | Pass |
| Primary button text on hover | `#FFFFFF` | `#1D3558` | 12.34:1 | 4.5:1 | Pass |
| Highlighted text in the code view | `#2B4C7E` | `#EEF1F5` | 7.60:1 | 4.5:1 | Pass |
| Heading period on the shell | `#B8470A` | `#F4F5F7` | 4.88:1 | 3:1 | Pass |
| Error text on a card | `#A4121C` | `#FFFFFF` | 7.83:1 | 4.5:1 | Pass |
| Success text on a card | `#1F6F3F` | `#FFFFFF` | 6.17:1 | 4.5:1 | Pass |
| Notice text on the notice | `#1B2430` | `#FFF4CC` | 14.21:1 | 4.5:1 | Pass |
| Input border on a card (component) | `#7F8A96` | `#FFFFFF` | 3.51:1 | 3:1 | Pass |
| Blank underline on a card (component) | `#2B4C7E` | `#FFFFFF` | 8.61:1 | 3:1 | Pass |
| Drop zone border on the shell (component) | `#2B4C7E` | `#F4F5F7` | 7.90:1 | 3:1 | Pass |
| Focus ring on a card (component) | `#2B4C7E` | `#FFFFFF` | 8.61:1 | 3:1 | Pass |
| Focus ring on the shell (component) | `#2B4C7E` | `#F4F5F7` | 7.90:1 | 3:1 | Pass |

| Dark mode pair | Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Body text on a card | `#ECEFF2` | `#1C2127` | 14.04:1 | 4.5:1 | Pass |
| Body text on the shell | `#ECEFF2` | `#161A1F` | 15.14:1 | 4.5:1 | Pass |
| Body text on the active menu item | `#ECEFF2` | `#2A313A` | 11.38:1 | 4.5:1 | Pass |
| Body text in the code view | `#ECEFF2` | `#14171B` | 15.58:1 | 4.5:1 | Pass |
| Muted text on a card | `#AAB4BE` | `#1C2127` | 7.70:1 | 4.5:1 | Pass |
| Muted text on the shell | `#AAB4BE` | `#161A1F` | 8.31:1 | 4.5:1 | Pass |
| Muted text on the active menu item | `#AAB4BE` | `#2A313A` | 6.24:1 | 4.5:1 | Pass |
| Link and blank text on a card | `#9DBDF0` | `#1C2127` | 8.46:1 | 4.5:1 | Pass |
| Link text on the shell | `#9DBDF0` | `#161A1F` | 9.13:1 | 4.5:1 | Pass |
| Primary button text | `#FFFFFF` | `#2B4C7E` | 8.61:1 | 4.5:1 | Pass |
| Primary button text on hover | `#FFFFFF` | `#3A62A0` | 6.11:1 | 4.5:1 | Pass |
| Highlighted text in the code view | `#9DBDF0` | `#2A313A` | 6.86:1 | 4.5:1 | Pass |
| Heading period on the shell | `#F08A4B` | `#161A1F` | 7.03:1 | 3:1 | Pass |
| Error text on a card | `#FF9AA2` | `#1C2127` | 8.02:1 | 4.5:1 | Pass |
| Success text on a card | `#8FD9A8` | `#1C2127` | 9.77:1 | 4.5:1 | Pass |
| Notice text on the notice | `#ECEFF2` | `#3A2E00` | 11.58:1 | 4.5:1 | Pass |
| Input border on a card (component) | `#7C8893` | `#1C2127` | 4.47:1 | 3:1 | Pass |
| Blank underline on a card (component) | `#9DBDF0` | `#1C2127` | 8.46:1 | 3:1 | Pass |
| Drop zone border on the shell (component) | `#9DBDF0` | `#161A1F` | 9.13:1 | 3:1 | Pass |
| Focus ring on a card (component) | `#9DBDF0` | `#1C2127` | 8.46:1 | 3:1 | Pass |

Card borders are lighter than 3:1 on purpose. They carry no meaning, because
every card has a heading and its controls are identified by their own text and
borders.

#### Other accessibility properties

- Structure comes from real elements: one `h1` per view, a `nav` of links with
  `aria-current` for the sidebar, a breadcrumb `nav`, a `tablist` with `tab` and
  `tabpanel` roles for the product files, `fieldset` and `legend` for grouped
  controls, a captioned table with header cells, and native `details`, `dialog`,
  and `button` elements.
- Every input has a visible label. In the Workspace editor the label is the
  question above the blank. Hints and errors are joined to their inputs with
  `aria-describedby`, and invalid inputs carry `aria-invalid`.
- Required fields that are still empty are listed as links beside the download
  buttons, and each link moves focus to the field. The download buttons are
  disabled until the list is empty.
- Status messages go to one polite live region. Nothing moves, flashes, or
  auto-advances. Smooth scrolling is applied only when the system does not ask
  for reduced motion.
- Pointer targets are at least 44 by 44 CSS pixels, except the file list buttons
  in Details, which are 36 pixels tall and well above the 24 pixel minimum. Focus
  is a 3 pixel ring. The scrollable code view is focusable and named.
- Text is 16 pixels at the base size with a 1.5 line height. Help text is capped
  at about 72 characters per line and left aligned.
- Dropping a file has a button alternative (Choose a file on the start page, Open
  a file in the editor). Reordering opening questions is done by editing the
  list, one question per line, in the Details form.
- Interface text aims at a grade 7 to 9 reading level and avoids exclamation
  marks in system messages.

### Known gaps and checks that still need a person

- A screen reader pass on the main flows (NVDA or JAWS on Windows, VoiceOver on
  macOS) has not been done. The question blanks, the live region, the dialog, and
  the product tabs are the parts most worth listening to.
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
