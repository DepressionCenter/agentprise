// This file is part of Agentprise
// tests/microsoft-package-fixture.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-21
// Last Modified: 2026-10-21
// Summary: Builds synthetic Microsoft 365 app packages in memory for the
//          package importer tests: an assistant with actions, skills only,
//          connectors only, a mix of all three, and two assistants. The shapes
//          follow Microsoft's documentation; they were not checked by
//          Microsoft's package validator. All names, addresses, and ids are
//          made up.
// Notes: See README file for documentation and full license information.
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

import { makePng } from "./helpers.mjs";
import { OPENAPI_TEXT } from "./tools-fixture.mjs";

const encode = (text) => new TextEncoder().encode(text);
const json = (value) => encode(JSON.stringify(value, null, 2));

export const APP_ID = "50000000-0000-4000-8000-000000000005";
// A made-up value that must never appear in a project, a notice, or a backup.
export const SECRET = "SYNTHETIC-SECRET-0123456789abcdef";

/** The manifest.json fields every package shares; extra keys are merged in. */
export function appManifest(extra = {}) {
  return {
    $schema: "https://developer.microsoft.com/json-schemas/teams/v1.28/MicrosoftTeams.schema.json",
    manifestVersion: "1.28",
    version: "1.0.0",
    id: APP_ID,
    developer: { name: "Example Labs", websiteUrl: "https://example.org", privacyUrl: "https://example.org/privacy", termsOfUseUrl: "https://example.org/terms" },
    name: { short: "Example Tools", full: "Example Tools for Copilot" },
    description: { short: "Example skills and connectors.", full: "Example skills, connectors, and assistants for tests." },
    icons: { color: "color.png", outline: "outline.png" },
    accentColor: "#2B579A",
    ...extra,
  };
}

/** A declarative agent; extra keys are merged in. */
export function declarativeAgent(name, extra = {}) {
  return {
    version: "v1.9",
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    description: "The " + name + " assistant.",
    instructions: "Help people with " + name + " questions.",
    ...extra,
  };
}

/** A SKILL.md with the standard fields. */
export function skillMd(name, description, body = "# Steps\n1. Do the task.\n", license = "MIT") {
  return encode(["---", "name: " + name, "description: " + description, "license: " + license, "---", "", body].join("\n"));
}

/** An OpenAPI plugin manifest whose description sits in the package. */
export function openApiPlugin(namespace, specPath, functions = ["searchRecords"]) {
  return {
    $schema: "https://developer.microsoft.com/json-schemas/copilot/plugin/v2.4/schema.json",
    schema_version: "v2.4",
    name_for_human: "Records",
    namespace,
    description_for_human: "Search example records.",
    description_for_model: "Searches the example records API.",
    functions: functions.map((name) => ({ name, description: "Searches records." })),
    runtimes: [{ type: "OpenApi", auth: { type: "None" }, spec: { url: specPath }, run_for_functions: functions }],
  };
}

/** A tool server plugin manifest. */
export function serverPlugin(namespace, url, auth = { type: "None" }) {
  return {
    schema_version: "v2.4",
    name_for_human: "Lookup server",
    namespace,
    description_for_human: "Looks things up.",
    description_for_model: "Looks up example data on a tool server.",
    functions: [],
    runtimes: [{ type: "RemoteMCPServer", auth, spec: { url }, run_for_functions: ["*"] }],
  };
}

const icons = () => [
  { name: "color.png", bytes: makePng(192, 192) },
  { name: "outline.png", bytes: makePng(32, 32, [255, 255, 255, 255]) },
];

/** An assistant with an OpenAPI action, a tool server action, a local plugin, and a file. */
export function agentOnlyEntries() {
  return [
    { name: "manifest.json", bytes: json(appManifest({ copilotAgents: { declarativeAgents: [{ id: "records", file: "agents/records.json" }] } })) },
    ...icons(),
    { name: "agents/records.json", bytes: json(declarativeAgent("Record Helper", {
      capabilities: [{ name: "WebSearch", sites: [{ url: "https://records.example.org" }] }],
      actions: [
        { id: "records", file: "agents/plugins/records.json" },
        { id: "lookup", file: "agents/plugins/lookup.json" },
        { id: "desktop", file: "agents/plugins/desktop.json" },
      ],
    })) },
    { name: "agents/plugins/records.json", bytes: json(openApiPlugin("records", "agents/apis/records.yaml", ["searchRecords", "getRecord"])) },
    { name: "agents/apis/records.yaml", bytes: encode(OPENAPI_TEXT) },
    { name: "agents/plugins/lookup.json", bytes: json(serverPlugin("lookup", "https://mcp.example.org/mcp", { type: "OAuthPluginVault", reference_id: "tenant-registration-1" })) },
    { name: "agents/plugins/desktop.json", bytes: json({ schema_version: "v2.4", name_for_human: "Desktop", namespace: "desktop", description_for_human: "A local plugin.", runtimes: [{ type: "LocalPlugin", auth: { type: "None" }, spec: { local_endpoint: "Microsoft.Office.Addin" } }] }) },
    { name: "guide.pdf", bytes: encode("%PDF-1.4 guide") },
    { name: "en.json", bytes: json({ name: { short: "Example Tools" } }) },
  ];
}

/** Two skills the manifest lists, plus one folder it doesn't. */
export function skillOnlyEntries() {
  return [
    { name: "manifest.json", bytes: json(appManifest({ agentSkills: [{ folder: "./skills/contract-analysis" }, { folder: "skills/meeting-notes" }] })) },
    ...icons(),
    { name: "skills/contract-analysis/SKILL.md", bytes: skillMd("contract-analysis", "Analyzes contracts. Use when someone asks to review a contract.") },
    { name: "skills/contract-analysis/references/clauses.md", bytes: encode("# Clauses\n") },
    { name: "skills/meeting-notes/SKILL.md", bytes: skillMd("meeting-notes", "Writes meeting notes. Use after a meeting.") },
    { name: "skills/draft-only/SKILL.md", bytes: skillMd("draft-only", "Not listed in the manifest.") },
  ];
}

/** A remote connector with a tool description file, one without a sign-in entry, and a local one. */
export function connectorOnlyEntries() {
  return [
    { name: "manifest.json", bytes: json(appManifest({
      agentConnectors: [
        { id: "example-legal", displayName: "Example Legal Database", description: "Case law over MCP.", toolSource: { remoteMcpServer: { mcpServerUrl: "https://legal.example.org/mcp", mcpToolDescription: { file: "./tools/legal-tools.json" }, authorization: { type: "OAuthPluginVault", referenceId: "tenant-registration-2" } } } },
        { id: "example-open", displayName: "Example Open Data", toolSource: { remoteMcpServer: { mcpServerUrl: "https://open.example.org/mcp" } } },
        { id: "example-desktop", displayName: "Example Desktop", toolSource: { localMcpServer: { mcpServerIdentifier: "example.desktop" } } },
      ],
    })) },
    ...icons(),
    { name: "tools/legal-tools.json", bytes: json({ tools: [{ name: "search_case_law", description: "Searches case law." }] }) },
  ];
}

/** An assistant that uses one skill, both skills listed for the app, and a connector. */
export function mixedEntries() {
  return [
    { name: "manifest.json", bytes: json(appManifest({
      copilotAgents: { declarativeAgents: [{ id: "helper", file: "declarativeAgent_0.json" }] },
      agentSkills: [{ folder: "./skills/contract-analysis" }, { folder: "./skills/meeting-notes" }],
      agentConnectors: [{ id: "example-legal", displayName: "Example Legal Database", toolSource: { remoteMcpServer: { mcpServerUrl: "https://legal.example.org/mcp", authorization: { type: "None" } } } }],
    })) },
    ...icons(),
    { name: "declarativeAgent_0.json", bytes: json(declarativeAgent("Legal Helper", { agent_skills: [{ folder: "./skills/contract-analysis" }] })) },
    { name: "skills/contract-analysis/SKILL.md", bytes: skillMd("contract-analysis", "Analyzes contracts. Use when someone asks to review a contract.") },
    { name: "skills/meeting-notes/SKILL.md", bytes: skillMd("meeting-notes", "Writes meeting notes. Use after a meeting.") },
  ];
}

/** Two assistants that share one action file, plus a root file neither names. */
export function multiAgentEntries() {
  return [
    { name: "manifest.json", bytes: json(appManifest({ copilotAgents: { declarativeAgents: [{ id: "first", file: "declarativeAgent_0.json" }, { id: "second", file: "declarativeAgent_1.json" }] } })) },
    ...icons(),
    { name: "declarativeAgent_0.json", bytes: json(declarativeAgent("First Helper", { actions: [{ id: "lookup", file: "plugin-lookup.json" }] })) },
    { name: "declarativeAgent_1.json", bytes: json(declarativeAgent("Second Helper", { actions: [{ id: "lookup", file: "plugin-lookup.json" }] })) },
    { name: "plugin-lookup.json", bytes: json(serverPlugin("lookup", "https://mcp.example.org/mcp")) },
    { name: "notes.txt", bytes: encode("Shared notes.") },
  ];
}

/** References that climb out, a broken plugin file, a key in addresses and files, and an unknown sign-in. */
export function hostileEntries() {
  return [
    { name: "manifest.json", bytes: json(appManifest({
      copilotAgents: { declarativeAgents: [{ id: "a", file: "declarativeAgent_0.json" }, { id: "b", file: "../outside.json" }, { id: "c", file: "declarativeAgent_0.json" }] },
      agentSkills: [{ folder: "/etc/skills" }, { folder: "skills/../skills/real" }, { folder: "skills/missing" }, { nope: true }],
      agentConnectors: [
        { id: "leaky", displayName: "Leaky", toolSource: { remoteMcpServer: { mcpServerUrl: "http://leaky.example.org/mcp", authorization: { type: "None" } } } },
        { id: "leaky", displayName: "Leaky again", toolSource: { remoteMcpServer: { mcpServerUrl: "https://leaky.example.org/mcp" } } },
        "not an object",
      ],
    })) },
    ...icons(),
    { name: "declarativeAgent_0.json", bytes: json(declarativeAgent("Careful Helper", {
      actions: [
        { id: "climb", file: "../plugin.json" },
        { id: "broken", file: "plugin-broken.json" },
        { id: "token", file: "plugin-token.json" },
        { id: "token-again", file: "plugin-token.json" },
        { id: "vault", file: "plugin-vault.json" },
        { id: "webspec", file: "plugin-webspec.json" },
      ],
    })) },
    { name: "plugin-broken.json", bytes: encode("{ not json") },
    { name: "plugin-token.json", bytes: json(serverPlugin("token", "https://tools.example.org/mcp?token=" + SECRET)) },
    { name: "plugin-vault.json", bytes: json(serverPlugin("vault", "https://vault.example.org/mcp", { type: "AzureKeyVault", reference_id: "vault-1" })) },
    { name: "plugin-webspec.json", bytes: json(openApiPlugin("webspec", "https://api.example.org/openapi.yaml")) },
    { name: "skills/real/SKILL.md", bytes: skillMd("real", "A real skill.") },
    { name: "config/settings.json", bytes: encode("{\"client_secret\": \"" + SECRET + "\"}") },
    { name: "tool.exe", bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) },
  ];
}
