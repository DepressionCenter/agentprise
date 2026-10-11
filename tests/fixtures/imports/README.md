<!--
This file is part of Agentprise
tests/fixtures/imports/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-11
Last Modified: 2026-10-11
Summary: Explains the import fixture archives the importer tests open and how
         to make them again.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise: import fixtures

[← Back to README](../../../README.md)

## Summary

Each ZIP file here stands in for a file that someone might open in Agentprise
after making it with another tool. `tests/importers.test.mjs` opens every one
and checks what the app keeps, what it leaves out, and what it tells the
person. Everything inside is made up: names, web addresses, keys, and license
texts.

## Files

| File | What it is | What the tests expect |
|---|---|---|
| `01-agent-plugins-folder.zip` | An Agent Plugins folder made by another tool, inside a `field-kit/` folder. It has a root `plugin.json` with another tool's extension but not the Agentprise one, an `mcp.json` with one `streamable-http` server and one `stdio` server that has `env` settings, two skills (one with its own `LICENSE.txt`), a root `LICENSE` and `README.md`, `hooks/hooks.json`, `agents/x.md`, `commands/y.md`, and a `com.example.client/` folder. | Two skills and two servers. The `env` settings are dropped with a notice. The license reads "See LICENSE.txt", and the root license is copied into the skill that had none. Hooks, agents, commands, the vendor folder, `LICENSE`, and `README.md` are kept as unrecognized files and never read as instructions. |
| `02-claude-plugin.zip` | A Claude plugin inside a `clinic-helper/` folder: `.claude-plugin/plugin.json` with an MIT license, a `.mcp.json` server of type `http` that sends a header, one skill, `commands/`, and `hooks/`. | One skill and one server. The header is dropped with a notice. Commands and hooks are kept as unrecognized files. |
| `03-codex-layout.zip` | A Codex layout at the root of the ZIP: `.codex-plugin/plugin.json` with `"skills": "./skills/"`, and a `.mcp.json` whose servers have no `type`. | One skill, a remote server and a local one, and "Not stated" as the license with a notice. |
| `04-multi-skill.zip` | Three skill folders, with `beta/` nested inside `alpha/`, plus a loose `README.md` and `notes.txt` at the top. | Three skills, each with only its own files. The loose files are kept as unrecognized files. |
| `05-single-skill-md.zip` | One `SKILL.md` at the root of the ZIP and nothing else. | One skill, and "Not stated" as the license with a notice. |
| `06-hostile-paths.zip` | Everything in `07-hostile-files.zip`, plus one entry whose path climbs out of its folder (`../`) and one that starts at the root (`/`). | The whole file is refused and nothing is opened. |
| `07-hostile-files.zip` | A plugin with a Windows program renamed to `.txt`, a text file with an `.exe` name, a Linux program renamed to `.txt`, empty files, and names that use `__proto__` and `constructor` in the manifest, the server list, a skill folder, and file names. | Programs and the empty skill file are left out with notices, the `constructor` server is left out, and nothing changes the behavior of JavaScript objects. |

The round trip tests use fixtures 1 and 2. They save each one as a backup, open
the backup again, and check that the unrecognized files come back with the same
paths and bytes. They also check that none of those files shows up in any other
download.

## Making the files again

The archives are made by `make-fixtures.mjs` in this folder, which uses
`makeDeflatedZip` from `tests/helpers.mjs`. The ZIP files are committed, so the
tests do not depend on the script. Run it again only when you change a fixture
on purpose, then check the test results and the diff before you commit.

```
node tests/fixtures/imports/make-fixtures.mjs
```

Git leaves these files byte for byte as written (see `.gitattributes`).

[← Back to README](../../../README.md)
