<!--
Golden Kit
Copyright (C) 2026 Example Creator. Licensed under GPL-3.0-or-later. Made with Agentprise, free software under the GNU GPL v3.0 or later: https://github.com/DepressionCenter/agentprise
-->

# Set up Golden Kit

This download uses tools. Follow the steps that apply to you.

## Turn on the Example Records connector

This works best with the Example Records connector turned on.

In Claude, open Customize, then Connectors, find Example Records, and connect it. On a Team or Enterprise plan, an Owner may need to add it first under Organization settings, then Connectors.

Without it, the assistant still does the work it can and says that no tool was used.

## Connect the Example search server

The instructions mention the Example search server. Connect it in the product's settings for tools or connectors, using the address https://mcp.example.org/mcp. Until you do, the assistant tells people it can't use this tool.

## Connect the Pinned tools server

The instructions mention the Pinned tools server. Connect it in the product's settings for tools or connectors, using the address https://tools.example.org/mcp. Until you do, the assistant tells people it can't use this tool.

## Connect the Local helper server

The instructions mention the Local helper server. Connect it in the product's settings for tools or connectors. Until you do, the assistant tells people it can't use this tool.

## Let the script reach the internet

The script scripts/lookup.py runs only where python3 can run with network access to api.example.org.

On claude.ai, code execution must be on. A workspace Owner can allow the address under Organization settings, then Capabilities, by choosing package managers and specific domains and adding api.example.org.

If the script can't connect, the assistant falls back and says why.
