<!--
Golden Kit
Copyright (C) 2026 Example Creator. Licensed under GPL-3.0-or-later. Made with Agentprise, free software under the GNU GPL v3.0 or later: https://github.com/DepressionCenter/agentprise
-->

# Golden Kit

A fixed project for export tests.

## What is inside

- Golden Scout (assistant, written as a skill): Finds records and explains them.
- Record Finder (skill): Find and read records. Use when someone asks for a record.

## How to install

- Claude (claude.ai and the desktop app): open Customize, then Plugins, choose Add, then Upload plugin, and pick this ZIP file. Then open the plugin's Connectors tab to connect any tool servers.
- Claude Code: unzip this file and add the folder as a plugin, or upload it in claude.ai so it syncs.
- Plugins need Skills turned on for your organization.

To change it or download it for another product, open the backup of this project at https://code.depressioncenter.org/agentprise/

## What changed in this export

- Golden Scout: changed. The assistant is written as a skill whose description starts with "Persona:", because the Claude plugin has no separate place for assistants.
- Record Finder: Record connector: needs setup. Works once the Example Records connector is turned on where you use it. The setup steps say how.
- Record Finder: Record server: kept. Connected through the Example search server.
- Record Finder: Record server: kept. Connected through the Pinned tools server.
- Record Finder: Record server: left out. Left out the Local helper server, because it runs on the computer, and claude.ai can reach only tool servers on the web.
- Record Finder: Record API: left out. Left out the records API action, because the Claude plugin cannot use it.
- Record Finder: Record script: needs setup. The script travels with the skill. It runs only where python3 can run with network access. On claude.ai, a workspace Owner must allow the address it calls.
- Record Finder: Record web search: needs setup. Works where the product can search the web.
