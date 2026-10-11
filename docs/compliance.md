<!--
This file is part of Agentprise
docs/compliance.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-11
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
  `library/catalog.json` and for the `.zip` files it lists, made once when the
  page opens so the start page can show a sample of the library, and one
  dynamically added analytics script. A review of the script on 2026-10-09 found no other
  request, and a served browser walkthrough the same day recorded only
  `library/catalog.json` and `library/caveman.zip` as library requests and no
  request to another host. A later walkthrough on 2026-10-09 with ten entries
  recorded `library/catalog.json` and the ten `.zip` files it lists, and nothing
  else.
- Library entries are untrusted input like any dropped file. Each catalog line
  is type-checked and capped, its file name must be a plain name ending in
  `.zip` so it cannot point outside the folder, and each backup goes through the
  same importer and `normalizeProject` path as an upload. Evidence:
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
- Projects are kept in the browser only, under names with the `agentprise-`
  prefix because other EFDC apps share the origin. The IndexedDB database
  `agentprise-projects` has two stores: `projects`, keyed by project id, holds
  each project record, and `files`, keyed by `<projectId>/<itemId>/<path>`,
  holds pictures and attached files. The `localStorage` key
  `agentprise-workspace-v2` holds only the last opened project id, the recent
  project ids, and preferences. A new project is not stored until something is
  typed in it. Delete on a project tile removes its record and files after
  asking. Evidence: the storage constants and `saveStoredProject` and
  `deleteStoredProject` in `index.html`, read on 2026-10-10.
- On every load the app deletes the version 1 draft, the `localStorage` key
  `agentprise-draft-v1` and the IndexedDB database `agentprise-draft-files`,
  without reading either. Evidence: `removeLegacyStorage` in `index.html`.
- Stored projects are treated as untrusted when they are read back: each record
  goes through `normalizeProject`, and only well-formed ids survive in the
  recent list. Evidence: `tests/project.test.mjs` ("a damaged record is
  normalized like any untrusted input").
- When storage is blocked or a save fails, editing and downloads keep working
  for the visit, and the sidebar says projects will not be kept after the page
  closes and asks the person to download a backup.
- No secrets, keys, tokens, or configuration files exist in this repository, so
  there is no `.env` file and no `.env.example`.
- Agent instructions are the creator's own text. The app never sends them
  anywhere or acts on them. Text inside an uploaded file that looks like
  instructions to the app or to an AI is treated as plain text.
- Before a download, the app matches the assistant's text fields and its
  plain-text attachments against two short lists of regular expressions: shapes
  that often mean personal identifiers (Social Security number, phone, email,
  date, labelled identifiers such as MRN, long digit runs, street address,
  ZIP+4, IPv4 address, age over 89, card number) and phrases common in prompt
  injection (orders to ignore or reveal instructions, jailbreak phrases, claims
  of override, orders to hide things from the person, invisible characters,
  image links with a query string, HTML comments). Findings are shown in the
  browser with a masked sample, never stored, never logged, and never sent.
  They warn and never block. Tool text (each tool's label, description,
  fallback, connector names, and route instructions) is checked as well,
  because it goes into the instructions of every export. Evidence: the
  "Tool text goes into every export's instructions" block in `scanProject` in
  `index.html`, read on 2026-10-10. The check is a hint for a person, not a privacy
  review: it does not detect names and it over-flags ordinary dates and
  numbers. The first five identifier patterns come from Field Station AI.
  Evidence: `tests/scan.test.mjs`, with one example and one near miss per
  pattern and a check that no sample holds two consecutive digits.
- Exported files carry the creator's own copyright and license first. The
  `.agent` file and the `agentprise.json` file in each skill `.zip` and backup
  carry a `_license` notice naming the creator and then the app, and
  `LICENSE.txt` holds the creator's license; the Teams package carries no
  notice because its schemas reject extra keys. The same holds for the Copilot
  plugin manifests and the plugin `plugin.json` and `mcp.json` files, whose
  schemas are closed, so both plugins carry the license in `LICENSE.txt`, the
  manifest's `license` field, and a hidden comment at the top of `README.md`
  and `SETUP.md`.
- Tool server addresses never keep credentials. `cleanServerUrl` keeps an
  address only when it is https and has no user name, password, or `#`
  fragment, and no query parameter named like a key, token, secret, password,
  auth value, or signature. The editor's **Address of the** box and every
  import use the same check, and an address that fails it is removed with a
  notice. Exported `mcp.json` and `.mcp.json` files hold only a server's type
  and address, or its command and arguments, never `headers` or `env`; a
  server without an address gets the reserved placeholder
  `https://example.com/replace-with-your-mcp-server-address`. Copilot actions
  that need a sign-in carry the placeholder id
  `replace-with-your-auth-registration-id`, so no credential is ever written
  into a package; an admin registers the sign-in in the tenant. Evidence:
  `cleanServerUrl`, `normalizeServers`, `mcpManifest`, and `copilotAuth` in
  `index.html`, and the golden files under `tests/fixtures/exports/`.
- A license is never relabeled. A skill or plugin from elsewhere that names no
  license opens with the license "Not stated" and a notice, its `LICENSE.txt`
  says the license was not stated, and a license file the author brought is
  kept. Evidence: `UNKNOWN_LICENSE` and `readItemFolders` in `index.html`.

### Security controls

- Uploaded files are untrusted input. Every value read from a file passes through
  `normalizeProject`, which type-checks and length-caps each project field and
  runs `normalizeItem` and `normalizeAgent` on each assistant and skill before
  anything reaches the form. Ids that are not UUIDs are replaced, and only
  known keys of the Agentprise extension in `plugin.json` are copied. Evidence:
  `tests/engine.test.mjs`, `tests/formats.test.mjs`, `tests/library.test.mjs`,
  `tests/project.test.mjs`, `tests/scan.test.mjs`, and `tests/tools.test.mjs`.
  `npm test` on 2026-10-10 ran 220 tests, and 219 passed. The one failure was
  a content check on the Library entry `pubmed-search.zip` (it must refuse
  legal and medical advice), not a control on this page.
- Importing executes nothing and contacts nothing. Plugin manifests, MCP
  server files, skill files, hooks, commands, and agents are read as data. A
  local tool server's command is stored as text and never run. Server
  `headers`, `env`, and `cwd` settings are dropped on import with a notice,
  because they can hold secrets. Hooks, commands, agents folders, and every
  other file the app does not understand are kept as unrecognized files, which
  are written back only into the backup and appear in no other download. Files
  outside the plugin folder are left out. Evidence: `readPluginArchive` and
  `serversFromMcp` in `index.html`, and `tests/project.test.mjs` (Claude,
  Codex, and Agent Plugins imports; "unrecognized files keep safe paths and
  never hold programs").
- Programs are refused everywhere a file can arrive: attached files, files in
  a skill folder, and unrecognized files. A file with a program signature, a
  program extension, or a program extension hidden before its last extension
  is left out with a notice. Paths with `..`, a leading slash, a backslash, or
  a hidden folder are refused. Evidence: `cleanSkillFiles` and
  `cleanArchivePath` in `index.html`, and `tests/project.test.mjs` ("unsafe,
  empty, and program files in a skill are refused").
- The ZIP reader caps the entry count at 1,200, each entry at 10 MB, and the whole
  archive at 50 MB. It rejects names containing `..`, a leading slash, a
  backslash, or a drive letter; refuses encrypted and 64-bit archives; refuses
  an archive that lists one name twice; verifies every checksum; and stops
  inflating as soon as output passes the declared size. Evidence: the `zip`
  test suite, including a path-traversal name, an oversize declared length, a
  mislabeled inflated size, a damaged checksum, and a repeated name.
- Nothing from a file runs, and exports run nothing either. Tool
  declarations are data: a script a skill carries is stored and exported as
  bytes, an OpenAPI description is copied into the Copilot package as bytes,
  and a local server's command is written as text for the product to run.
  The app never calls a tool server, an API, or a script. Tool declarations
  pass through `normalizeCapability` and `normalizeProvider`, which accept
  only the six provider kinds in `PROVIDER_KINDS`, cap every text field, and
  check every file path with `cleanArchivePath`. A `#` at the start of any
  line of tool text is escaped and labels are put on one line, so tool text
  cannot add headings to the composed instructions. Evidence: `planExport`,
  `quoteHeadings`, and `oneLine` in `index.html`, and `tests/tools.test.mjs`.
- Validation runs offline against pinned schemas. The tests check exports
  against exact copies of the Agent Plugins 1.0.0 `plugin.json` and `mcp.json`
  schemas, the declarative agent v1.8 schema, the Copilot plugin manifest v2.4
  schema, and the Teams manifest 1.28 schema, kept in `tests/schemas/` with
  each file's URL, download date (2026-10-10), and SHA-256 hash in
  `tests/schemas/SOURCES.md`. The validator is a small file in the repository
  (`tests/schema-validator.mjs`) with its own tests, so no dependency was
  added. The page never fetches a schema: the schema ids it writes, such as
  `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, are
  identifiers that readers must not fetch. Evidence: the script's only two
  `fetch` calls are for the Library (see Privacy above).
- A download whose conversion report has a blocked entry cannot be written.
  Blocked cases include a Copilot source list that the writer would drop,
  which would widen the assistant to the whole source, and more web search
  sites than Copilot allows. `assertNotBlocked` refuses the write and the
  download button is disabled. Evidence: `widenedSources`,
  `mergeWebSearchSites`, and `assertNotBlocked` in `index.html`.
- JSON and YAML are parsed, never evaluated. The YAML reader handles only the
  subset the app's files use and skips anything else with a warning.
- All text reaches the page through `textContent`. The script never assigns
  `innerHTML`. The Inspect code view, which highlights the person's own words
  inside the generated files, is built from text nodes and `mark` elements only.
  Evidence: searches of `index.html` for `innerHTML` on 2026-10-09 and 2026-10-10 found no use,
  and the browser walkthrough confirms that a description containing a script tag
  appears as literal text in the code view.
- Icons are decoded through an `Image` element and redrawn on a canvas, which
  strips any embedded content. Only PNG and JPG uploads are accepted; SVG is not.
  Icons that arrive inside a file are walked chunk by chunk: the signature, an
  IHDR first, a valid CRC on every chunk, and an IEND that ends the file, so
  nothing can ride behind a real-looking header into a download. Evidence:
  `tests/engine.test.mjs` feeds a padded, a truncated, and a corrupted PNG.
- Attached files are carried as bytes and never opened, decoded, or run. The
  name loses any folder part and any character outside letters, digits, spaces,
  dots, hyphens, underscores, and parentheses, and may not hide a program type
  before its last extension (`setup.exe.pdf`). The type must be a document
  type Microsoft lists for agent knowledge, a OneNote file (`.one` or
  `.onepart`), or a plain-text type such as a script. The contents must match
  the name: a PDF marker in the first kilobyte, the ZIP header plus the
  `[Content_Types].xml` part for Office Open XML, the OLE header for older
  Office files, the OneNote file type and file format GUIDs at bytes 0 and 48,
  and valid UTF-8 with no NUL byte for text. A file that begins with the
  signature of a Windows, Linux, FreeBSD, macOS, or Java program is refused
  whatever its name. Each file must fit one ZIP entry. SharePoint items keep
  only known keys, with ids checked against the GUID pattern. Every list that
  limits a Copilot source is checked against an allowlist of what it may hold:
  SharePoint links must be https on a `sharepoint.com`, `sharepoint.us`,
  `sharepoint-mil.us`, or `sharepoint.cn` tenant host, Teams links must be
  https on a Teams client host with an `/l/` path, mailboxes must look like
  `name@host.tld`, meeting ids must be short alphanumeric strings, and the
  response mode must be one of three fixed values. A file whose only SharePoint
  sources fail the host check opens with the SharePoint switch off, so a refused
  link never widens the agent to every file the person can see. Evidence:
  `tests/engine.test.mjs` and `tests/formats.test.mjs`, which feed each program
  signature, a plain ZIP named `.docx`, UTF-16 text, text with a NUL byte,
  double extensions, a OneNote header with the wrong format GUID, and links on
  the wrong hosts.
- Exported file names are reduced to letters, digits, spaces, dots, hyphens, and
  underscores.
- There are no dependencies at runtime. The test tooling uses only the Node
  built-in test runner.

### Accessibility

Target: WCAG 2.2 AA. The app is one page with five views (Workspace, the
project editor, Library, Inspect, and Help). The sidebar links to Workspace,
Library, Inspect, and Help, and lists up to five recent projects.

#### Automated scan

axe-core 4.14.0 ran on 2026-10-09 through a headless Chromium walkthrough, with
the WCAG 2.0, 2.1, and 2.2 A and AA rule sets plus best practices, on the start
page, the editor, Details, Library, and Help in light mode, and on the start
page, the editor, Details, and Help in dark mode. A second run the same day
scanned the Library with the Caveman card in light and dark mode. A third run
the same day scanned the Library with ten cards in light and dark mode; each
card name is a second-level heading under the page title, so the heading order
rule passes. Zero violations in every run. These runs came before the project
workspace was added, so the parts listed under known gaps below have not been
scanned yet.

#### Keyboard and reflow checks run in the walkthrough

These checks ran in the 2026-10-09 walkthrough, before the project workspace
was added. Each one still describes the current code.

- "Create new" opens the editor with focus on the name blank. Each blank sits
  under a visible question that is its label; the example question blanks are
  named "Example question 1", "Example question 2", and so on.
- "Add another question" adds a blank and moves focus to it.
- Confirmations in the status bar, such as "Copied.", clear themselves
  after eight seconds. They are announced when they appear, so nothing is lost.
  Errors, such as a file the app cannot open, stay until the person acts.
- Links that leave the app open in a new tab and carry hidden text that says so.
- The product tabs in Inspect move with Left, Right, Home, and End, with roving
  `tabindex`, and the file list is a set of buttons.
- Inline link errors appear on blur and clear when fixed.
- The template button asks before replacing text, in a native dialog that
  returns focus when closed.
- The old hashes `#home`, `#build`, `#check`, and `#download` still open the
  matching view.
- No horizontal scrolling at 320 CSS pixels wide on any view that existed at
  the time; the sidebar becomes a strip above the content.

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
- Every input has a visible label. In the project editor the label is the
  question above the blank. Hints and errors are joined to their inputs with
  `aria-describedby`, and invalid inputs carry `aria-invalid`.
- Required fields that are still empty are listed as links beside the download
  buttons, and each link moves focus to the field. The download buttons are
  disabled until the list is empty.
- Status messages go to one polite live region. Nothing moves, flashes, or
  auto-advances. Smooth scrolling is applied only when the system does not ask
  for reduced motion.
- In the tools parts of the editor, read from the code on 2026-10-10: the
  **Tools** list is a `fieldset` with a `legend` and a list of cards; each
  **Remove this tool** and **Remove this connection** button carries the tool
  or server name as hidden text and asks first in the same native `dialog`.
  Each server address box has a visible label, "Address of the" and the
  server name, with its hint and error joined through `aria-describedby`. On
  the Inspect page, each line of **What changes in this download** starts with
  its status as a word (kept, changed, needs setup, left out, or blocked), so
  the colored border on blocked lines never carries the meaning alone.
- In the project workspace, read from the code on 2026-10-10: each project tile
  opens from a button that is the project name, and its other actions sit in a
  native `details` menu named "More actions for" the project, with buttons whose
  hidden text names the project. The item bar is a `nav` whose current item
  carries `aria-current`. "Skills it can use" is a `fieldset` with a `legend`.
  The Library View, Try it, and Read more buttons carry the entry name as
  hidden text.
- On each Library card, read from the code on 2026-10-11: the picture is a
  second way to open the View dialog for pointer users. It is a button left
  out of the tab order and hidden from screen readers, because the View
  button beside it does the same thing from the keyboard. Each card shows at
  most three tag buttons; the filter row and the search box reach the other
  tags.
  Rename, Delete, Remove, and Keep both or Replace mine use the same native
  `dialog` elements as the rest of the app.
- Pointer targets are at least 44 by 44 CSS pixels, except the file list buttons
  in Inspect, which are 36 pixels tall and well above the 24 pixel minimum. This
  was measured before the project workspace was added. Focus is a 3 pixel ring.
  The scrollable code view is focusable and named.
- Text is 16 pixels at the base size with a 1.5 line height. Help text is capped
  at about 72 characters per line and left aligned.
- Dropping a file has a button alternative (Choose a file on the start page,
  Open a file and Add from a file in the editor). Reordering prompt suggestions
  is done by editing the list, one per line, on the Inspect page.
- Interface text aims at a grade 7 to 9 reading level and avoids exclamation
  marks in system messages.

### Known gaps and checks that still need a person

- The project workspace has not been scanned with axe-core or walked through
  with a keyboard, at 320 pixels, or for contrast. That covers Your projects
  and each tile's More menu, the Recent list in the sidebar, the
  "In this project" bar, Add a skill and Add from a file, "Skills it can use",
  the "Part of the project" picker in Inspect, the Library View dialog, the
  card layout with View and Try it beside the picture and Read more, the kind
  labels, and the Rename, Delete, Remove, and Keep both or Replace mine
  dialogs. Focus after Delete moves to Create new in the code, but no one has
  confirmed it by hand.
- The tools parts have not been scanned with axe-core or walked through with
  a keyboard, at 320 pixels, or for contrast: the **Tools** cards,
  **Tool connections** with its address boxes, the
  **What changes in this download** list and its status colors, the blocked
  notice, the **For the whole project** download rows, and the one-box
  ChatGPT tab.
- A screen reader pass on the main flows (NVDA or JAWS on Windows, VoiceOver on
  macOS) has not been done. The question blanks, the live region, the dialog, and
  the product tabs are the parts most worth listening to.
- 200 percent zoom was checked only through the 320 pixel reflow test, not by a
  person zooming a desktop browser.
- Uploads to real Gemini, Claude, ChatGPT, SharePoint, and Teams accounts are
  open, including both plugins and Copilot packages with actions; see the
  open tests V1 to V8 and the others on the [formats page](formats.md).
- Agentprise does not check what a script in a skill does. It checks that the
  file is plain text and not a program, then carries it. The setup steps ask
  the installer to allow its network access, and the
  [guide to connecting tools](how-to/connect-tools.md) asks people to read the
  script or have someone read it first.
- No statement on this page is a claim of HIPAA compliance. The app handles agent
  descriptions, not health data, and keeps nothing on a server. The sharing
  check is a short pattern list, not a review of the text, and a clean result
  does not mean the text holds no personal information.

### Conclusion

The controls above are in place and the checks listed were run on the dates
given. Rerun the test suite and the browser walkthrough after any change to
`index.html`, and update this page in the same change set.

### Additional resources

- [Formats and verified vendor facts](formats.md)
- [Connect the tools in a download](how-to/connect-tools.md)
- [Accessibility skill](../skills/accessibility/SKILL.md)
- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [axe-core](https://github.com/dequelabs/axe-core)

[Back to project README](../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
