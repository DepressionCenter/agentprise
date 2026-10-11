// This file is part of Agentprise
// tests/fixtures/imports/make-fixtures.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-11
// Last Modified: 2026-10-11
// Summary: Writes the committed import fixture archives next to this script:
//          plugins and skill ZIPs made by other tools, plus two hostile archives.
//          tests/importers.test.mjs opens them. All names, addresses, keys, and
//          license texts are made up.
// Notes: See README file for documentation and full license information.
//        Run with: node tests/fixtures/imports/make-fixtures.mjs
//
// Copyright © 2026 The Regents of the University of Michigan
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License along
// with this program. If not, see <https://www.gnu.org/licenses/>.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDeflatedZip, BYTE_SHAPES } from "../../helpers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const encode = (text) => new TextEncoder().encode(text);
const json = (value) => encode(JSON.stringify(value, null, 2) + "\n");
const file = (name, text) => ({ name: name, bytes: typeof text === "string" ? encode(text) : text });

const AGENT_PLUGINS_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const EXAMPLE_LICENSE = "Example License 1.0\n\nCopyright (c) 2026 Example Author\n\nThis is a made-up license text used only by the Agentprise tests.\n";

function skillMd(name, description, body, extra = "") {
  return "---\nname: " + name + "\ndescription: " + description + "\n" + extra + "---\n\n" + body + "\n";
}

// ### Fixture definitions ###

/** An Agent Plugins folder from another tool: no Agentprise extension, a root LICENSE, behavior folders, and a vendor folder. */
const agentPluginsFolder = [
  file("field-kit/plugin.json", json({
    $schema: AGENT_PLUGINS_SCHEMA,
    name: "field-kit",
    version: "0.4.0",
    description: "Field notes and summaries.",
    author: { name: "Example Author", email: "author@example.org", url: "https://example.org" },
    keywords: ["notes", "field"],
    extensions: { "com.example.client": { theme: "dark", pinned: ["note-taker"] } },
  })),
  file("field-kit/mcp.json", json({
    $schema: MCP_SCHEMA,
    mcpServers: {
      "remote-search": { type: "streamable-http", url: "https://mcp.example.org/mcp" },
      "local-notes": { type: "stdio", command: "npx", args: ["-y", "example-notes-server"], env: { NOTES_API_KEY: "EXAMPLE_API_KEY" } },
    },
  })),
  file("field-kit/skills/note-taker/SKILL.md", skillMd("note-taker", "Takes tidy field notes.", "Write notes as short bullets.")),
  file("field-kit/skills/note-taker/references/template.md", "# Note template\n\n- Date\n- Place\n- Observation\n"),
  file("field-kit/skills/summarizer/SKILL.md", skillMd("summarizer", "Summarizes field notes.", "Summarize in three sentences.")),
  file("field-kit/skills/summarizer/LICENSE.txt", "Summarizer's own made-up license text.\n"),
  file("field-kit/LICENSE", EXAMPLE_LICENSE),
  file("field-kit/README.md", "# Field Kit\n\nThe author's own readme for this plugin.\n"),
  file("field-kit/hooks/hooks.json", json({ hooks: { PostToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "echo example" }] }] } })),
  file("field-kit/agents/x.md", "---\nname: x\ndescription: A sub-agent definition.\n---\n\nReview notes.\n"),
  file("field-kit/commands/y.md", "---\ndescription: A slash command.\n---\n\nSummarize today's notes.\n"),
  file("field-kit/com.example.client/settings.json", json({ layout: "compact" })),
];

/** A Claude plugin: manifest under .claude-plugin/, an http server that sends a header, a command, and a hook. */
const claudePlugin = [
  file("clinic-helper/.claude-plugin/plugin.json", json({
    name: "clinic-helper",
    version: "1.1.0",
    description: "Helps with made-up clinic paperwork.",
    author: { name: "Example Team", url: "https://example.org" },
    license: "MIT",
  })),
  file("clinic-helper/.mcp.json", json({
    mcpServers: {
      "Clinic Docs": { type: "http", url: "https://docs.example.org/mcp", headers: { "X-Api-Key": "EXAMPLE_API_KEY" } },
    },
  })),
  file("clinic-helper/skills/intake-checklist/SKILL.md", skillMd("intake-checklist", "Builds an intake checklist.", "List each form the visit needs.")),
  file("clinic-helper/skills/intake-checklist/references/forms.md", "# Forms\n\n- Example form A\n- Example form B\n"),
  file("clinic-helper/commands/triage.md", "---\ndescription: Sort today's made-up requests.\n---\n\nSort by urgency.\n"),
  file("clinic-helper/hooks/hooks.json", json({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo hello" }] }] } })),
];

/** A Codex layout at the archive root: the manifest names its skills folder, and .mcp.json servers carry no type. */
const codexLayout = [
  file(".codex-plugin/plugin.json", json({ name: "codex-helper", version: "0.2.0", description: "A Codex helper.", skills: "./skills/" })),
  file(".mcp.json", json({
    mcpServers: {
      search: { url: "https://search.example.org/mcp" },
      files: { command: "uvx", args: ["example-files-server"] },
    },
  })),
  file("skills/lookup/SKILL.md", skillMd("lookup", "Looks things up.", "Search first, then answer.")),
];

/** Three skill folders, one nested inside another, with loose files at the top. */
const multiSkill = [
  file("README.md", "# Three skills\n\nLoose readme at the top of the ZIP.\n"),
  file("notes.txt", "Loose notes at the top of the ZIP.\n"),
  file("alpha/SKILL.md", skillMd("alpha", "The outer skill.", "Alpha body.")),
  file("alpha/references/a.md", "# Alpha reference\n"),
  file("alpha/beta/SKILL.md", skillMd("beta", "A skill nested inside alpha.", "Beta body.")),
  file("alpha/beta/references/b.md", "# Beta reference\n"),
  file("gamma/SKILL.md", skillMd("gamma", "A sibling skill with its own license file.", "Gamma body.")),
  file("gamma/LICENSE.txt", "Gamma's made-up license text.\n"),
];

/** A lone SKILL.md at the root of the ZIP, with no license anywhere. */
const singleSkill = [
  file("SKILL.md", skillMd("solo-helper", "One skill at the root of a ZIP.", "Help with one thing at a time.")),
];

/** Every hostile entry at once. The unsafe names alone make the app refuse the whole archive. */
const hostileFiles = [
  file("hostile-kit/plugin.json", "{\n  \"name\": \"hostile-kit\",\n  \"version\": \"1.0.0\",\n  \"description\": \"Hostile on purpose.\",\n  \"__proto__\": { \"polluted\": true },\n  \"extensions\": { \"__proto__\": { \"polluted\": true }, \"com.example.safe\": { \"ok\": true } }\n}\n"),
  file("hostile-kit/mcp.json", "{\n  \"mcpServers\": {\n    \"__proto__\": { \"type\": \"streamable-http\", \"url\": \"https://proto.example.org/mcp\" },\n    \"constructor\": { \"type\": \"streamable-http\", \"url\": \"https://ctor.example.org/mcp\" }\n  }\n}\n"),
  file("hostile-kit/skills/safe/SKILL.md", skillMd("safe", "A harmless skill among hostile files.", "Stay safe.")),
  file("hostile-kit/skills/safe/references/readme.txt", BYTE_SHAPES.windows),
  file("hostile-kit/skills/safe/references/tool.exe", "plain text behind a program extension\n"),
  file("hostile-kit/skills/safe/references/empty.md", new Uint8Array(0)),
  file("hostile-kit/skills/safe/references/__proto__.md", "# A reference named __proto__\n"),
  file("hostile-kit/skills/__proto__/SKILL.md", skillMd("__proto__", "A skill named __proto__.", "Nothing to see.")),
  file("hostile-kit/notes.txt", BYTE_SHAPES.elf),
  file("hostile-kit/tools/run.exe", BYTE_SHAPES.windows),
  file("hostile-kit/empty.txt", new Uint8Array(0)),
  file("hostile-kit/__proto__.json", "{\"polluted\": true}\n"),
];
const hostilePaths = [
  ...hostileFiles,
  file("hostile-kit/../escape.txt", "climbs out of the folder\n"),
  file("/absolute.txt", "absolute path\n"),
];

// ### Write Archives ###

const fixtures = {
  "01-agent-plugins-folder.zip": agentPluginsFolder,
  "02-claude-plugin.zip": claudePlugin,
  "03-codex-layout.zip": codexLayout,
  "04-multi-skill.zip": multiSkill,
  "05-single-skill-md.zip": singleSkill,
  "06-hostile-paths.zip": hostilePaths,
  "07-hostile-files.zip": hostileFiles,
};
for (const [name, entries] of Object.entries(fixtures)) {
  writeFileSync(join(here, name), makeDeflatedZip(entries));
  console.log("wrote " + name + " (" + entries.length + " entries)");
}
