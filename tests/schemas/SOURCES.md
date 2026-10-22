<!--
This file is part of Agentprise
tests/schemas/SOURCES.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-22
Summary: Where each pinned JSON Schema in this folder came from, when it was
         downloaded, and its SHA-256 hash.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise: pinned schemas

[← Back to README](../../README.md)

## Summary

The tests check exported files against the JSON Schema files in this folder.
Each file is an exact copy of the vendor's published schema, downloaded once
and never edited, so the tests run offline and give the same answer every time.
The app page never loads these files. The schemas belong to their publishers
and are kept here only so the tests can read them.

## Files

Files are stored byte for byte. The original files used `curl -sL`; the
2026-10-22 additions used PowerShell `Invoke-WebRequest`.

| File | Source URL | Downloaded | SHA-256 |
|---|---|---|---|
| `agent-plugins/plugin.schema.json` | <https://agent-plugins.org/schemas/1.0.0/plugin.schema.json> | 2026-10-10 | `0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883` |
| `agent-plugins/mcp.schema.json` | <https://agent-plugins.org/schemas/1.0.0/mcp.schema.json> | 2026-10-10 | `6539175bfcdf43085855183e86da40ea94b166547a72b47ae9a0a390516d3acb` |
| `copilot/declarative-agent-v1.8.schema.json` | <https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.8/schema.json> | 2026-10-10 | `57b0f6784fbff614f249597ed7720775adff88a75f60989f93539d3221a97035` |
| `copilot/plugin-v2.4.schema.json` | <https://developer.microsoft.com/json-schemas/copilot/plugin/v2.4/schema.json> | 2026-10-10 | `ea3016aa4917e1b714454a6a7be9444f8aa7a1923cba0a42343a6fd234a0eb00` |
| `teams/manifest-v1.28.schema.json` | <https://developer.microsoft.com/json-schemas/teams/v1.28/MicrosoftTeams.schema.json> | 2026-10-10 | `cce967bb1c77641634ce30353f2a699c44cf245e695d2c7a34bb8be771877c3d` |
| `copilot/declarative-agent-v1.9.schema.json` | <https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.9/schema.json> | 2026-10-22 | `102abde77894ed0d30c5e097a1b17181a16527865fdcd2f824e2578799abd3a5` |
| `teams/manifest-v1.29.schema.json` | <https://developer.microsoft.com/json-schemas/teams/v1.29/MicrosoftTeams.schema.json> | 2026-10-22 | `53e860fd650fd03fe587379d92af6c91374e791f041ce3f26c92d5e74aeafa0b` |

## Updating a schema

1. Download the new version to this folder under a new name that includes the
   version, for example `copilot/plugin-v2.5.schema.json`.
2. Do not edit the downloaded bytes.
3. Add a row to the table above with the URL, the download date, and the
   SHA-256 hash (`sha256sum <file>`).
4. Point the tests at the new file and run `npm test`.

[← Back to README](../../README.md)
