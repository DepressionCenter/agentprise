<!--
This file is part of Agentprise
tests/fixtures/exports/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-10
Summary: Explains the golden export files the tools tests compare against and
         how to regenerate them.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise: golden export files

[← Back to README](../../../README.md)

## Summary

Each folder here holds the files one download writes for a fixed, made-up
project (`tests/tools-fixture.mjs`). The project has an assistant that uses one
skill, and the skill has one tool for each provider kind. `tests/tools.test.mjs`
exports the project again and compares the result with these files, so any
change to what a download contains shows up as a test failure with the exact
file that moved.

## Folders

| Folder | Download |
|---|---|
| `copilot-app-package` | Microsoft 365 Copilot app package: instructions, manifests, action files, setup steps |
| `teams-chat-agent` | Teams Chat `.agent` file: instructions and Copilot sources |
| `claude-skill`, `gemini-skill`, `plain-skill` | Skill ZIP files for Claude, Gemini, and other skill tools |
| `claude-plugin` | Claude plugin |
| `portable-plugin` | Plugin for ChatGPT, Codex, GitHub Copilot, Cursor, and others |
| `chatgpt-text` | ChatGPT project instructions |
| `notebook-markdown` | Gemini Notebook file |

Every folder also has `report.json`, the conversion report for that download.
License texts, pictures, and the fixture's own input files are left out. The
Teams manifest version stamp changes on every export, so the tests replace it
with `1.YYYYMMDD.HHMMSS` before comparing.

## Regenerating the files

When you change an exporter on purpose, regenerate the files, then read the
diff before you commit it.

- Bash: `UPDATE_GOLDEN=1 node --test tests/tools.test.mjs`
- PowerShell: `$env:UPDATE_GOLDEN=1; node --test tests/tools.test.mjs; Remove-Item Env:UPDATE_GOLDEN`

Git leaves these files byte for byte as written (see `.gitattributes`).

[← Back to README](../../../README.md)
