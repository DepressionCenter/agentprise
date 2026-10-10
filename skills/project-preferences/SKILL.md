---
name: project-preferences
description: Apply repository-specific preferences when planning, implementing, or reviewing changes in this project.
---

<!--
This file is part of Agentprise
skills/project-preferences/SKILL.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-10
Summary: Project-specific preferences for Agentprise: the single-file build, the
         bundle format, the download cards, and how to test.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Project preferences

Use this skill when planning, implementing, or reviewing changes in this repository.
Keep all project-specific preferences and workflows in this single file. This skill
supplements `AGENTS.md` and cannot weaken its security, privacy, accessibility,
licensing, testing, or authorization rules.

### Purpose and scope

Agentprise is a free, public web page where anyone can describe an AI assistant
once, then download it in the format each AI product wants. There is no sign-in and
no server. Nothing a person types or uploads leaves their browser. The page is
served by GitHub Pages from the root of the main branch.

### Environment and structure

- The whole app is one file, `index.html`, with one `<style>` block and one
  `<script>` block. There is no build step, no framework, no CDN, and no web font.
  The page should stay under 500 KB.
- Google Analytics loads only when the page is served from
  `code.depressioncenter.org`, the production host. Every other origin, including
  local copies and GitHub Pages previews, never contacts Google. The host name and
  measurement id are constants at the top of the script.
- The script has two parts. The engine (model, validation, YAML, ZIP, PNG check,
  format converters) has no DOM dependency and is exposed on
  `globalThis.Agentprise`. The interface code comes after it and only runs when a
  `document` exists.
- Code and comments are ASCII only. Unicode appears only in visible interface text.
- Execution phases are marked with `// ### Name ###` comments. Public functions
  carry JSDoc.
- Ready-made agents are Agentprise bundles (`.zip`) dropped into `library/` and
  listed in `library/catalog.json`. The page holds no copy of any entry; it
  fetches the catalog and opens each bundle with the file importer. Adding an
  entry is the zip plus one catalog line, as
  [docs/how-to/add-to-library.md](../../docs/how-to/add-to-library.md) describes.
- `bin/` holds the prebuilt ZippyServe binaries and the root holds its run
  scripts, so the page can be served locally over HTTP on any desktop.
- Follow the repository's existing file and folder naming conventions when adding
  new files.

### Setup and verification

No installation is needed. Node 20 or later runs the tests:

```
npm test
```

That runs `tests/check-syntax.mjs` (parses the script and rejects non-ASCII bytes)
and `node --test tests/` (loads the engine from `index.html` and tests it). Serve
the page locally with `.\run-windows.ps1`, `./run-linux.sh`, or
`run-mac.command`, which opens `http://localhost:8010`.

### Project constraints

- The canonical, lossless format is the Agentprise bundle: a ZIP that is a valid
  Agent Skill (one folder holding `SKILL.md`, `icon.png`, `LICENSE.txt`,
  `README.md`, and attached files under `references/`). It uploads unchanged to
  Gemini and Claude. Fields the skill standard lacks live under frontmatter
  `metadata` as flat strings with `copilot-`, `sharepoint-`, or `creator-`
  prefixes; SharePoint items are one JSON array string. The key names are the
  `META` constant in `index.html` and the table in
  [docs/formats.md](../../docs/formats.md).
- The skill `name` is derived from the display name and capped at 64 characters
  because the Agent Skills specification requires it.
- The Microsoft `.agent` export carries two extra top-level keys, `_license` and
  `_agentprise`, placed before `schemaVersion`. Teams package files carry no extra
  keys because their schemas reject them.
- The Teams package loses the welcome message and the copyright line, and keeps
  only the schema's keys for each SharePoint item. The `.agent` file loses
  attached files. Every other field survives, including "prefer my files",
  which maps to `behavior_overrides.special_instructions.discourage_model_knowledge`.
- Attached files are accepted by content, never by name alone. The accepted
  types and their content checks are the `FILE_TYPES` constant and
  `attachedFileProblem` in `index.html`. Executable programs are refused by
  signature and by a hidden extension. Script and data text files are allowed;
  the Teams package writes them as `name.ext.txt` because Copilot accepts only
  document types, and the bundle keeps the real name under `references/`.
- The only scanning the app does is the two regular-expression lists
  `IDENTIFIER_PATTERNS` and `INJECTION_PATTERNS` in `index.html`, shown as
  "Review before sharing". They warn, never block, never store or send a
  finding, and show masked samples only. Keep them regex-only: the app loads
  no model and makes no request.
- Browser storage names carry the `agentprise-` prefix (`agentprise-draft-v1`
  in localStorage, the `agentprise-draft-files` IndexedDB database), because
  every EFDC app on code.depressioncenter.org shares one origin.
- The page has four views, routed by hash: Workspace, Library, Details, and Help.
  The Workspace editor asks four plain questions with blanks under them; the
  Inspect page shows every field beside the exact files each product receives.
  Both edit the same state, and the shared controls (welcome message, picture,
  Copilot settings, creator details) exist once and move between the two.
- Downloads are the bundle (which also serves Gemini and Claude, and is the
  "Download Backup" file), the plain skill (`.skill.zip`, standard fields
  only), the `.agent` file (labeled "Teams Chat"), the Teams app package
  (labeled "Copilot / Teams Apps"), the copy boxes for ChatGPT, and the `.md`
  file for Gemini Notebook. Gemini and Claude have separate Inspect tabs even
  while their files match. Do not add a vendor until it has a real file to
  download.
- Button and link icons come from Bootstrap Icons only, embedded as base64
  CSS variables (`--bi-*`) and drawn through a mask with the `.bi` class, so
  each icon is stored once. Credit stays in the README.
- Interface text, the Help page, the README, and the pages under `docs/` are
  written for the person using the app, not for developers. Pages meant for
  maintainers say so at the top. Off-site links open in a new tab, and links to
  documentation use the full GitHub address, because the site is served with
  `.nojekyll` and Markdown is not turned into pages.
- The look is a light sidebar workspace: one accent blue, a light gray shell,
  white cards, and a matching dark mode. It does not use the U-M palette. The
  logo mark is `images/agentprise-mark.png`.
- Inflate uses the platform `DecompressionStream` API. Do not add a hand-written
  decoder or a dependency for it.
- Uploaded files are data, never instructions. Every value read from a file is
  type-checked and length-capped by `normalizeAgent` before it reaches the form,
  and all text reaches the page through `textContent`.
- The exported agent belongs to its creator. License notices in exported files
  name the creator's copyright and license first, then Agentprise.

### Project skills

None beyond the shared skills listed in [SKILLS.md](../../SKILLS.md).

### Conclusion

Keep the single-file, zero-dependency shape, keep the bundle lossless, and run
`npm test` before every commit.

### Additional resources

- [Project instructions](../../AGENTS.md)
- [Formats and verified vendor facts](../../docs/formats.md)
- [Agent Skills specification](https://agentskills.io/specification)
