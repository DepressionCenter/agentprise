---
name: project-preferences
description: Apply repository-specific preferences when planning, implementing, or reviewing changes in this project.
---

<!--
This file is part of Agentprise
skills/project-preferences/SKILL.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
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
  The page should stay under 250 KB.
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
- Ready-made agents live under `library/<skill-name>/` as unzipped Agent Skill
  bundles, listed in `library/catalog.json`.
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
  Agent Skill (one folder holding `SKILL.md`, `icon.png`, `LICENSE.txt`, and
  `README.md`). It uploads unchanged to Gemini and Claude. Fields the skill
  standard lacks live under frontmatter `metadata` as flat strings with
  `copilot-` or `creator-` prefixes. The key names are the `META` constant in
  `index.html` and the table in [docs/formats.md](../../docs/formats.md).
- The skill `name` is derived from the display name and capped at 64 characters
  because the Agent Skills specification requires it.
- The Microsoft `.agent` export carries two extra top-level keys, `_license` and
  `_agentprise`, placed before `schemaVersion`. Teams package files carry no extra
  keys because their schemas reject them.
- The Teams package loses the welcome message and the copyright line. Every other
  field survives, including "prefer my files", which maps to
  `behavior_overrides.special_instructions.discourage_model_knowledge`.
- The Download screen offers four cards: the bundle (which also serves Gemini and
  Claude), the `.agent` file, the Teams package, and the copy panel for ChatGPT
  and Gemini Notebook. Do not add a vendor until it has a real file to download.
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
- [Implementation plans](../../docs/implementation-plans/README.md)
- [Formats and verified vendor facts](../../docs/formats.md)
- [Agent Skills specification](https://agentskills.io/specification)
