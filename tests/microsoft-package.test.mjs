// This file is part of Agentprise
// tests/microsoft-package.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-21
// Last Modified: 2026-10-21
// Summary: Opens Microsoft 365 app packages through the importer the app uses
//          for dropped files: this app's own package with three actions, and
//          synthetic packages with an assistant, skills only, connectors only,
//          a mix, two assistants, and hostile references. Checks what becomes
//          tools, skills, and servers, what stays in the backup only, and that
//          no key or token is kept or shown.
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

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./load-engine.mjs";
import { goldenRaw, teamsIcons } from "./tools-fixture.mjs";
import {
  APP_ID, SECRET, appManifest, declarativeAgent, skillMd, serverPlugin, agentOnlyEntries, skillOnlyEntries, connectorOnlyEntries, mixedEntries, multiAgentEntries, hostileEntries,
} from "./microsoft-package-fixture.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const KEPT_NOTE = "From a Microsoft 365 app package. Not interpreted by Agentprise.";

/** Opens a package from entries, failing on an error. */
async function openPackage(entries, name = "package.zip") {
  const result = await engine.imports.any(name, engine.zip.write(entries));
  assert.equal(result.error, undefined, String(result.error));
  return result;
}

/** Writes the backup and opens it again. */
async function backupRoundTrip(project) {
  const backup = await engine.exports.backup(project);
  const opened = await engine.imports.any(backup.fileName, backup.bytes);
  assert.equal(opened.error, undefined, String(opened.error));
  assert.equal(opened.format, "plugin");
  return { backup, project: opened.project };
}

/** Every text a project could show or store: its record, its file bytes, and its notices. */
function everythingShown(project, notices) {
  const bytes = [];
  project.items.forEach((item) => item.files.forEach((file) => bytes.push(decode(file.bytes))));
  project.unrecognized.forEach((entry) => bytes.push(decode(entry.bytes)));
  return JSON.stringify(engine.project.record(project)) + bytes.join("\n") + notices.join("\n");
}

const unrecognizedPaths = (project) => project.unrecognized.map((entry) => entry.path).sort();

describe("this app's own Copilot app package", () => {
  const golden = () => engine.project.normalize(goldenRaw()).project;

  test("its three actions come back as tools and download again with the same action files", async () => {
    const project = golden();
    const first = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const opened = await engine.imports.any("Golden Scout Copilot app.zip", first.bytes);
    assert.equal(opened.format, "teamsZip");
    assert.equal(opened.notices.some((n) => n.includes("action")), false, "no action is reported as left out");
    const back = opened.project;
    const agent = back.items[0];
    assert.deepEqual(agent.capabilities.map((c) => c.id), ["action.remote", "action.pinned", "action.records"]);
    assert.deepEqual(agent.capabilities.map((c) => c.providers["*"].map((p) => p.kind)), [["mcp"], ["mcp"], ["openapi"]]);
    assert.deepEqual(Object.keys(back.servers), ["remote", "pinned"]);
    assert.equal(back.servers.pinned.auth, "oauth");
    assert.deepEqual(back.servers.pinned.tools, ["search", "fetch"]);
    assert.ok(agent.files.some((f) => f.path === "apis/records/records.yaml"));
    // A second download writes the same plugin manifests, API description, action list, and Copilot sources.
    const second = await engine.exports.teamsPackage(back, agent, teamsIcons());
    const a = await engine.zip.read(first.bytes);
    const b = await engine.zip.read(second.bytes);
    const actionFiles = [...a.keys()].filter((name) => name.startsWith("plugin-") || name.startsWith("apis/"));
    assert.deepEqual(actionFiles, ["plugin-remote.json", "plugin-pinned.json", "apis/records/records.yaml", "plugin-records.json"]);
    for (const name of actionFiles) {
      assert.equal(decode(b.get(name)), decode(a.get(name)), name);
    }
    const da = JSON.parse(decode(a.get("declarativeAgent_0.json")));
    const db = JSON.parse(decode(b.get("declarativeAgent_0.json")));
    assert.deepEqual(db.actions, da.actions);
    assert.deepEqual(db.capabilities, da.capabilities);
    assert.equal(JSON.parse(decode(b.get("manifest.json"))).id, JSON.parse(decode(a.get("manifest.json"))).id);
  });

  test("the instructions keep their old tools list, and a notice says to delete it", async () => {
    const project = golden();
    const built = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const opened = await engine.imports.any("Golden Scout Copilot app.zip", built.bytes);
    assert.ok(opened.project.items[0].instructions.includes("## Tools available in this setup"));
    assert.ok(opened.notices.some((n) => n.includes("delete the old one")));
  });

  test("the tools survive a backup round trip", async () => {
    const project = golden();
    const built = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const opened = await engine.imports.any("Golden Scout Copilot app.zip", built.bytes);
    const { project: again } = await backupRoundTrip(opened.project);
    assert.deepEqual(engine.project.record(again).items, engine.project.record(opened.project).items);
    assert.deepEqual(again.servers, opened.project.servers);
  });
});

describe("Microsoft 365 app packages made elsewhere", () => {
  test("listed skills with conflicting server names keep their own endpoints and tool references", async () => {
    const entries = [];
    for (const [name, url] of [["first", "https://first.example.org/mcp"], ["second", "https://second.example.org/mcp"]]) {
      entries.push(
        { name: "skills/" + name + "/SKILL.md", bytes: skillMd(name, "Looks up records.") },
        { name: "skills/" + name + "/agentprise.json", bytes: encode(JSON.stringify({
          kind: "skill", servers: { remote: { transport: "http", url } },
          capabilities: [{ id: "lookup", providers: {
            "*": [{ kind: "mcp", server: "remote" }],
            claude: [{ kind: "mcp", server: "remote" }],
          } }],
        })) },
      );
    }
    const manifests = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: [{ folder: "skills/first" }, { folder: "skills/second" }] }))) },
      { name: "plugin.json", bytes: encode(JSON.stringify({ name: "example", license: "MIT" })) },
      null,
    ];
    for (const manifest of manifests) {
      const { project } = await openPackage(manifest ? [manifest, ...entries] : entries);
      assert.deepEqual(Object.keys(project.servers), ["remote", "remote-2"]);
      assert.equal(project.servers.remote.url, "https://first.example.org/mcp");
      assert.equal(project.servers["remote-2"].url, "https://second.example.org/mcp");
      for (const target of ["*", "claude"]) {
        assert.deepEqual(project.items.map((item) => item.capabilities[0].providers[target][0].server), ["remote", "remote-2"]);
      }
      const { project: again } = await backupRoundTrip(project);
      assert.deepEqual(again.servers, project.servers);
      assert.deepEqual(again.items.map((item) => item.capabilities), project.items.map((item) => item.capabilities));
    }
  });

  test("API descriptions at the item path limit import; deeper ones are rejected with instructions", async () => {
    for (const depth of [5, 6, 8]) {
      const entries = agentOnlyEntries();
      const path = Array.from({ length: depth - 1 }, (_, index) => "folder" + index).join("/") + "/records.yaml";
      const description = entries.find((entry) => entry.name === "agents/apis/records.yaml");
      description.name = path;
      const plugin = entries.find((entry) => entry.name === "agents/plugins/records.json");
      const json = JSON.parse(decode(plugin.bytes));
      json.runtimes[0].spec.url = path;
      plugin.bytes = encode(JSON.stringify(json));
      const { project, notices } = await openPackage(entries);
      const agent = project.items[0];
      const action = agent.capabilities.find((capability) => capability.id === "action.records");
      if (depth === 5) {
        assert.equal(action.providers["*"][0].spec, path);
        assert.ok(agent.files.some((file) => file.path === path));
        const output = await engine.exports.teamsPackage(project, agent, teamsIcons());
        assert.ok((await engine.zip.read(output.bytes)).has("plugin-records.json"));
      } else {
        assert.equal(action, undefined, "no tool with an empty provider list is retained");
        assert.equal(agent.files.some((file) => file.path === path), false);
        assert.ok(notices.some((notice) => notice.includes("nested too deeply") && notice.includes("at most 4 folders") && notice.includes("update its reference")));
        assert.ok(unrecognizedPaths(project).includes("microsoft-package/agents/plugins/records.json"));
      }
      assert.ok(agent.capabilities.some((capability) => capability.id === "action.lookup"), "other actions still import");
    }
  });

  test("an assistant's license stays unstated, including after a backup round trip", async () => {
    const golden = engine.project.normalize(goldenRaw()).project;
    const exported = await engine.exports.teamsPackage(golden, golden.items[0], teamsIcons());
    const ownEntries = [...await engine.zip.read(exported.bytes)].map(([name, bytes]) => ({ name, bytes }));
    for (const entries of [agentOnlyEntries(), mixedEntries(), ownEntries]) {
      const { project, notices } = await openPackage(entries);
      assert.equal(project.license, "Not stated");
      assert.ok(notices.includes("The file doesn't say which license it uses. Check with its author before you share it."));
      const { backup, project: again } = await backupRoundTrip(project);
      assert.equal(again.license, "Not stated");
      const license = backup.entries.find((entry) => entry.name.split("/").length === 2 && entry.name.endsWith("/LICENSE.txt"));
      assert.ok(decode(license.bytes).includes("not stated"));
      for (const skill of project.items.filter((item) => item.kind === "skill")) {
        assert.equal(skill.license, "MIT", "a skill keeps its declared license");
      }
    }
  });

  test("an assistant: actions become tools, a local plugin stays in the backup, a file is attached", async () => {
    const { project, notices } = await openPackage(agentOnlyEntries());
    assert.equal(project.items.length, 1);
    const agent = project.items[0];
    assert.equal(agent.name, "Record Helper");
    assert.equal(agent.copilot.appId, APP_ID);
    assert.deepEqual(agent.copilot.webSites, ["https://records.example.org"]);
    const api = agent.capabilities.find((c) => c.id === "action.records");
    assert.deepEqual(api.providers["*"], [{ kind: "openapi", instructions: "", spec: "agents/apis/records.yaml", operations: ["searchRecords", "getRecord"], auth: "none" }]);
    assert.deepEqual(project.servers.lookup, { label: "Lookup server", transport: "http", url: "https://mcp.example.org/mcp", userSupplied: false, auth: "oauth", tools: [] });
    assert.deepEqual(agent.files.map((f) => f.path).sort(), ["agents/apis/records.yaml", "references/guide.pdf"]);
    assert.ok(notices.some((n) => n.includes("\"desktop\"") && n.includes("LocalPlugin")));
    // The registration id belongs to another tenant: the notice says so without showing it.
    assert.ok(notices.some((n) => n.includes("\"lookup\"") && n.includes("registers it again")));
    assert.equal(everythingShown(project, notices).includes("tenant-registration-1"), false);
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/agents/plugins/desktop.json", "microsoft-package/en.json"]);
    assert.ok(project.unrecognized.every((entry) => entry.note === KEPT_NOTE));
    // The Copilot app package writes the OpenAPI action again from the item's file.
    const teams = await engine.exports.teamsPackage(project, agent, teamsIcons());
    const entries = await engine.zip.read(teams.bytes);
    assert.ok(entries.has("plugin-records.json") && entries.has("apis/records/records.yaml") && entries.has("plugin-lookup.json"));
    assert.equal(entries.has("en.json"), false, "a kept file is never written into a download");
  });

  test("skills only: listed folders become skills, an unlisted one stays in the backup", async () => {
    const entries = skillOnlyEntries();
    assert.equal(engine.detectFormat("skills.zip", engine.zip.write(entries)), "teamsZip");
    const { project, notices } = await openPackage(entries);
    assert.deepEqual(project.items.map((i) => [i.kind, i.skillName]), [["skill", "contract-analysis"], ["skill", "meeting-notes"]]);
    assert.deepEqual(project.items[0].files.map((f) => f.path), ["references/clauses.md"]);
    assert.equal(project.name, "Example Tools for Copilot");
    assert.equal(project.license, "MIT");
    assert.ok(notices.some((n) => n.includes("1 skill folder (skills/draft-only/)")));
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/skills/draft-only/SKILL.md"]);
  });

  test("connectors only: remote servers become tool connections; a local one is reported and the manifest kept", async () => {
    const { project, notices } = await openPackage(connectorOnlyEntries());
    assert.deepEqual(project.items, []);
    assert.deepEqual(Object.keys(project.servers), ["example-legal", "example-open"]);
    assert.equal(project.servers["example-legal"].auth, "oauth");
    // No sign-in entry means Microsoft registers an OAuth client for the server.
    assert.equal(project.servers["example-open"].auth, "oauth");
    assert.ok(notices.some((n) => n.includes("\"Example Desktop\"") && n.includes("left out")));
    assert.ok(notices.some((n) => n.startsWith("Added 2 connectors to Tool connections")));
    // The kept manifest has the registration id replaced, so no copy of it survives.
    assert.equal(everythingShown(project, notices).includes("tenant-registration-2"), false);
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/manifest.json", "microsoft-package/tools/legal-tools.json"]);
    const keptManifest = JSON.parse(decode(project.unrecognized.find((entry) => entry.path === "microsoft-package/manifest.json").bytes));
    assert.equal(keptManifest.agentConnectors[0].toolSource.remoteMcpServer.authorization.referenceId, "replace-with-your-auth-registration-id");
    assert.equal(keptManifest.agentConnectors[2].toolSource.localMcpServer.mcpServerIdentifier, "example.desktop", "the rest of the file is unchanged");
    assert.equal(project.license, "Not stated");
  });

  test("a mix: the assistant uses its skill, a folder listed twice is read once, and the connector is a server", async () => {
    const { project, notices } = await openPackage(mixedEntries());
    assert.deepEqual(project.items.map((i) => [i.kind, i.skillName]), [["agent", "legal-helper"], ["skill", "contract-analysis"], ["skill", "meeting-notes"]]);
    assert.deepEqual(project.items[0].uses, ["contract-analysis"]);
    assert.deepEqual(Object.keys(project.servers), ["example-legal"]);
    assert.equal(project.servers["example-legal"].auth, "none");
    assert.deepEqual(project.unrecognized, []);
    assert.equal(notices.some((n) => n.includes("left out")), false);
  });

  test("two skill folders with the same name: the assistant uses the one it listed, under its new name", async () => {
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "declarativeAgent_0.json" }] } }))) },
      { name: "declarativeAgent_0.json", bytes: encode(JSON.stringify({ version: "v1.9", name: "Legal Helper", description: "Helps.", instructions: "Help.", agent_skills: [{ folder: "skills/contract-analysis" }, { folder: "skills/second-copy" }] })) },
      { name: "skills/contract-analysis/SKILL.md", bytes: skillMd("contract-analysis", "The first skill.") },
      { name: "skills/second-copy/SKILL.md", bytes: skillMd("contract-analysis", "A second skill with the same name.") },
    ];
    const { project } = await openPackage(entries);
    const skills = project.items.filter((i) => i.kind === "skill");
    assert.deepEqual(skills.map((s) => [s.skillName, s.description]), [["contract-analysis", "The first skill."], ["contract-analysis-2", "A second skill with the same name."]]);
    assert.deepEqual(project.items[0].uses, ["contract-analysis", "contract-analysis-2"]);
  });

  test("two assistants: each is an assistant, they share one tool server, and only the first keeps the app id", async () => {
    const { project, notices } = await openPackage(multiAgentEntries());
    assert.deepEqual(project.items.map((i) => i.name), ["First Helper", "Second Helper"]);
    assert.equal(project.name, "Example Tools for Copilot");
    assert.deepEqual(Object.keys(project.servers), ["lookup"]);
    assert.deepEqual(project.items.map((i) => i.capabilities.map((c) => c.providers["*"][0].server)), [["lookup"], ["lookup"]]);
    assert.equal(project.items[0].copilot.appId, APP_ID);
    assert.equal(project.items[1].copilot.appId, "");
    assert.deepEqual(project.items.map((i) => i.files.map((f) => f.path)), [["references/notes.txt"], ["references/notes.txt"]]);
    assert.ok(notices.some((n) => n.startsWith("This package holds 2 assistants.")));
    assert.ok(notices.some((n) => n.includes("each assistant got a copy")));
  });

  test("a root plugin.json that a connector names as its tool list still opens as a package", async () => {
    const entries = connectorOnlyEntries();
    const manifest = JSON.parse(decode(entries[0].bytes));
    manifest.agentConnectors[0].toolSource.remoteMcpServer.mcpToolDescription.file = "plugin.json";
    entries[0] = { name: "manifest.json", bytes: encode(JSON.stringify(manifest)) };
    entries.push({ name: "plugin.json", bytes: encode(JSON.stringify({ tools: [{ name: "search_case_law" }] })) });
    // The file name alone looks like an Agent Plugin; the manifest decides.
    assert.equal(engine.detectFormat("connectors.zip", engine.zip.write(entries)), "plugin");
    const { project, format } = await openPackage(entries);
    assert.equal(format, "teamsZip");
    assert.deepEqual(Object.keys(project.servers), ["example-legal", "example-open"]);
  });

  test("a skill's own server and an action server with the same name both keep their addresses", async () => {
    const golden = engine.project.normalize(goldenRaw()).project;
    const skill = await engine.exports.skillZip(golden, golden.items[1], "claude");
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "a", file: "declarativeAgent_0.json" }] }, agentSkills: [{ folder: "skills/record-finder" }] }))) },
      { name: "declarativeAgent_0.json", bytes: encode(JSON.stringify(declarativeAgent("Server Helper", { actions: [{ id: "remote", file: "plugin-remote.json" }] }))) },
      { name: "plugin-remote.json", bytes: encode(JSON.stringify(serverPlugin("remote", "https://other.example.org/mcp"))) },
      ...skill.entries.map((entry) => ({ name: "skills/" + entry.name, bytes: entry.bytes })),
    ];
    const { project } = await openPackage(entries);
    const servers = (item) => item.capabilities.flatMap((c) => c.providers["*"]).filter((p) => p.kind === "mcp").map((p) => p.server);
    const [agent, finder] = project.items;
    assert.equal(finder.skillName, "record-finder");
    assert.ok(servers(finder).includes("remote"));
    assert.equal(project.servers.remote.url, "https://mcp.example.org/mcp", "the skill keeps its server");
    assert.deepEqual(servers(agent), ["remote-2"]);
    assert.equal(project.servers["remote-2"].url, "https://other.example.org/mcp", "the action uses its own server");
  });

  test("a backup keeps every preserved file and opens again the same", async () => {
    for (const entries of [agentOnlyEntries(), connectorOnlyEntries(), skillOnlyEntries()]) {
      const { project } = await openPackage(entries);
      const { backup, project: again } = await backupRoundTrip(project);
      const root = backup.entries[0].name.split("/")[0] + "/";
      for (const entry of project.unrecognized) {
        const written = backup.entries.find((e) => e.name === root + entry.path);
        assert.ok(written, entry.path + " is in the backup");
        assert.deepEqual(written.bytes, entry.bytes);
      }
      assert.deepEqual(unrecognizedPaths(again), unrecognizedPaths(project));
      assert.deepEqual(engine.project.record(again).items, engine.project.record(project).items);
      assert.deepEqual(again.servers, project.servers);
    }
  });
});

describe("unsafe and broken packages", () => {
  test("credentials in root manifest fields block the package without a skill fallback", async () => {
    const changes = [
      (manifest) => { manifest.developer.websiteUrl = "https://example.org/?token=" + SECRET; },
      (manifest) => { manifest.description.full = "Authorization: Bearer " + SECRET; },
      (manifest) => { manifest.agentConnectors = [{ id: "leaky", toolSource: { remoteMcpServer: { mcpServerUrl: "https://example.org/mcp?api_key=" + SECRET } } }]; },
    ];
    for (const change of changes) {
      for (const withPlugin of [false, true]) {
        const entries = multiAgentEntries();
        const manifest = JSON.parse(decode(entries[0].bytes));
        manifest.agentSkills = [{ folder: "skills/helper" }];
        change(manifest);
        entries[0].bytes = encode(JSON.stringify(manifest));
        entries.push({ name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") });
        if (withPlugin) {
          for (const [index, agent] of manifest.copilotAgents.declarativeAgents.entries()) {
            entries.find((entry) => entry.name === agent.file).name = "agents/assistant" + index + ".json";
            agent.file = "agents/assistant" + index + ".json";
          }
          entries[0].bytes = encode(JSON.stringify(manifest));
          entries.push({ name: "plugin.json", bytes: encode("{}") });
        }
        const bytes = engine.zip.write(entries);
        assert.equal(engine.detectFormat("unsafe.zip", bytes), withPlugin ? "plugin" : "teamsZip");
        const result = await engine.imports.any("unsafe.zip", bytes);
        assert.equal(result.project, undefined, "nothing can be stored or exported");
        assert.equal(result.blocked, true);
        assert.ok(result.error.includes("manifest.json") && result.error.includes("Remove the credentials"));
        assert.equal(JSON.stringify(result).includes(SECRET), false);
      }
    }
  });

  test("credentials in action descriptions exclude the action and its source file", async () => {
    for (const name of ["plugin-lookup.json", "plugin-lookup.pdf"]) {
      const entries = multiAgentEntries();
      const plugin = entries.find((entry) => entry.name === "plugin-lookup.json");
      const manifest = JSON.parse(decode(plugin.bytes));
      manifest.description_for_model = "Authorization: Bearer " + SECRET;
      plugin.bytes = encode(JSON.stringify(manifest));
      plugin.name = name;
      for (const entry of entries.filter((entry) => entry.name.startsWith("declarativeAgent_"))) {
        const agent = JSON.parse(decode(entry.bytes));
        agent.actions[0].file = name;
        entry.bytes = encode(JSON.stringify(agent));
      }
      const { project, notices } = await openPackage(entries);
      assert.ok(project.items.every((item) => item.capabilities.length === 0));
      assert.equal(everythingShown(project, notices).includes(SECRET), false);
      assert.ok(notices.some((notice) => notice.includes("description file") && notice.includes("Remove the credentials")));
      const { backup } = await backupRoundTrip(project);
      assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    }
  });

  test("a credential in an assistant file leaves the assistant out of the project and backup", async () => {
    for (const field of ["instructions", "description"]) {
      const entries = multiAgentEntries();
      const manifest = JSON.parse(decode(entries.find((entry) => entry.name === "manifest.json").bytes));
      let path = manifest.copilotAgents.declarativeAgents[0].file;
      const entry = entries.find((entry) => entry.name === path);
      if (field === "description") {
        path = "assistant.pdf";
        entry.name = path;
        manifest.copilotAgents.declarativeAgents[0].file = path;
        entries.find((entry) => entry.name === "manifest.json").bytes = encode(JSON.stringify(manifest));
      }
      const agent = JSON.parse(decode(entry.bytes));
      agent[field] = "Authorization: Bearer " + SECRET;
      entry.bytes = encode(JSON.stringify(agent));
      const { project, notices } = await openPackage(entries);
      assert.deepEqual(project.items.map((item) => item.name), ["Second Helper"]);
      assert.equal(everythingShown(project, notices).includes(SECRET), false);
      assert.ok(notices.some((notice) => notice.includes("The assistant file " + path) && notice.includes("Remove the key")));
      assert.ok(notices.some((notice) => notice.startsWith("Left out 1 file that looks like it holds")));
      assert.equal(unrecognizedPaths(project).includes("microsoft-package/" + path), false);
      const { backup } = await backupRoundTrip(project);
      assert.equal(backup.entries.some((file) => decode(file.bytes).includes(SECRET)), false);
    }
  });

  test("unknown text types and private keys are scanned while binary files are preserved", async () => {
    const entries = skillOnlyEntries();
    const binary = new Uint8Array([0, 1, 2, 3, 255]);
    entries.push(
      { name: "config/.env", bytes: encode("EXAMPLE_API_KEY=" + SECRET + "\n") },
      { name: "settings.toml", bytes: encode('password = "' + SECRET + '"\n') },
      { name: "keys/private.pem", bytes: encode("-----BEGIN PRIVATE KEY-----\n" + SECRET + "\n-----END PRIVATE KEY-----\n") },
      { name: "skills/meeting-notes/keys/rsa.pem", bytes: encode("-----BEGIN RSA PRIVATE KEY-----\n" + SECRET + "\n-----END RSA PRIVATE KEY-----\n") },
      { name: "data.unknown", bytes: binary },
      { name: "config/reference.toml", bytes: encode('api_key = "${EXAMPLE_API_KEY}"\n') },
    );
    const { project, notices } = await openPackage(entries);
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.ok(notices.some((notice) => notice.startsWith("Left out 4 files that look")));
    assert.deepEqual(project.unrecognized.find((entry) => entry.path === "microsoft-package/data.unknown").bytes, binary);
    assert.ok(unrecognizedPaths(project).includes("microsoft-package/config/reference.toml"));
    const { backup, project: again } = await backupRoundTrip(project);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    assert.deepEqual(again.unrecognized.find((entry) => entry.path === "microsoft-package/data.unknown").bytes, binary);
  });

  test("unsafe references, repeated paths, an unknown sign-in, and web-only descriptions are left out with a notice each", async () => {
    const { project, notices } = await openPackage(hostileEntries());
    assert.deepEqual(project.items.map((i) => i.name), ["Careful Helper"]);
    const has = (text) => assert.ok(notices.some((n) => n.includes(text)), text);
    has("An assistant in the manifest points at a file that isn't in the package, or at an unsafe path");
    has("Two assistants in the manifest use the same file declarativeAgent_0.json");
    has("The action \"climb\" points at a file that isn't in the package, or at an unsafe path");
    has("The action \"broken\" has a file this app can't read");
    has("The action \"token-again\" uses the same file as another action");
    has("The action \"vault\" uses a kind of sign-in this app can't write back");
    has("The action \"webspec\" reads its API description from the web");
    has("A skill in the manifest points at the folder skills/missing, which has no SKILL.md");
    assert.equal(notices.filter((n) => n.includes("an unsafe or empty folder")).length, 3);
    has("The connector \"Leaky again\" has the same id as another connector");
    has("A connector in the manifest has no id");
    has("Left out 1 program file.");
    // The unknown sign-in is refused rather than written back as no sign-in.
    assert.equal(project.items[0].capabilities.some((c) => c.id === "action.vault"), false);
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/manifest.json", "microsoft-package/plugin-broken.json", "microsoft-package/plugin-vault.json", "microsoft-package/plugin-webspec.json", "microsoft-package/skills/real/SKILL.md"]);
  });

  test("a key or token in an address or a kept file is never kept or shown", async () => {
    const { project, notices } = await openPackage(hostileEntries());
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    const { backup } = await backupRoundTrip(project);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    // An action description with a key is excluded; an unsafe URL without a key is cleared.
    assert.equal(project.servers.token, undefined);
    assert.deepEqual([project.servers.leaky.url, project.servers.leaky.userSupplied], ["", true]);
    assert.ok(notices.some((n) => n.startsWith("Left out 2 files that look like they hold a password, key, or token: plugin-token.json, config/settings.json.")));
    // A kept plugin file keeps its shape but not the tenant's registration id.
    assert.equal(everythingShown(project, notices).includes("vault-1"), false);
  });

  test("a key in a skill file, an API description, or an attached file leaves that file out", async () => {
    const leak = (label) => encode("# " + label + "\nUse Authorization: Bearer " + SECRET + "\n");
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "a", file: "declarativeAgent_0.json" }] }, agentSkills: [{ folder: "skills/clean" }, { folder: "skills/leaky" }] }))) },
      { name: "declarativeAgent_0.json", bytes: encode(JSON.stringify({ version: "v1.9", name: "Key Helper", description: "Helps.", instructions: "Help.", agent_skills: [{ folder: "skills/leaky" }], actions: [{ id: "api", file: "plugin-api.json" }] })) },
      { name: "plugin-api.json", bytes: encode(JSON.stringify({ schema_version: "v2.4", name_for_human: "API", namespace: "api", description_for_human: "API.", functions: [{ name: "go" }], runtimes: [{ type: "OpenApi", auth: { type: "None" }, spec: { url: "apis/api.yaml" }, run_for_functions: ["go"] }] })) },
      { name: "apis/api.yaml", bytes: encode("openapi: 3.0.3\nservers:\n  - url: https://api.example.org/v1?api_key=" + SECRET + "\n") },
      { name: "skills/clean/SKILL.md", bytes: skillMd("clean", "A clean skill.") },
      { name: "skills/clean/references/notes.md", bytes: leak("Notes") },
      { name: "skills/clean/references/fine.md", bytes: encode("# Fine\n") },
      { name: "skills/leaky/SKILL.md", bytes: leak("Leaky skill") },
      { name: "secret.txt", bytes: leak("Attachment") },
    ];
    const { project, notices } = await openPackage(entries);
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.deepEqual(project.items.map((i) => i.skillName), ["key-helper", "clean"]);
    assert.deepEqual(project.items[1].files.map((f) => f.path), ["references/fine.md"]);
    assert.deepEqual(project.items[0].capabilities, []);
    assert.deepEqual(project.items[0].files, []);
    assert.deepEqual(project.items[0].uses, []);
    assert.ok(notices.some((n) => n.includes("The skill in skills/leaky/ has a SKILL.md that looks like it holds")));
    assert.ok(notices.some((n) => n.includes("The action \"api\" has an API description that looks like it holds")));
    assert.ok(notices.some((n) => n.startsWith("Left out 4 files that look like they hold a password, key, or token:")));
    const { backup } = await backupRoundTrip(project);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
  });

  test("a key set on a YAML or settings line leaves the file out, and a reference to a key does not", async () => {
    const entries = skillOnlyEntries();
    entries.push(
      { name: "config/app.yaml", bytes: encode("name: example\nauth:\n  client_secret: " + SECRET + "\n") },
      { name: "config/settings", bytes: encode("export EXAMPLE_API_KEY=" + SECRET + "\n") },
      { name: "skills/meeting-notes/references/auth.yaml", bytes: encode("- token: '" + SECRET + "'\n") },
      { name: "config/reference.yaml", bytes: encode("client_secret: ${CLIENT_SECRET}\npassword:\n  type: string\ntoken: true\n") },
    );
    const { project, notices } = await openPackage(entries);
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.ok(notices.some((n) => n.startsWith("Left out 3 files that look like they hold a password, key, or token:")));
    assert.ok(unrecognizedPaths(project).includes("microsoft-package/config/reference.yaml"));
    assert.deepEqual(project.items[1].files, []);
  });

  test("a manifest.json that is not valid JSON is refused, and one that isn't Microsoft's opens as skills", async () => {
    const broken = await engine.imports.any("broken.zip", engine.zip.write([{ name: "manifest.json", bytes: encode("{ nope") }, { name: "color.png", bytes: encode("x") }]));
    assert.ok(broken.error.includes("manifest.json"));
    const empty = await engine.imports.any("empty.zip", engine.zip.write([{ name: "manifest.json", bytes: encode(JSON.stringify(appManifest())) }]));
    assert.ok(empty.error.includes("no assistant, skill, or connector"));
    // A web app's manifest beside ordinary skill folders is not a Microsoft package.
    const skills = await engine.imports.any("skills.zip", engine.zip.write([
      { name: "manifest.json", bytes: encode(JSON.stringify({ short_name: "Example", start_url: "/" })) },
      { name: "helper/SKILL.md", bytes: skillMd("helper", "Helps.") },
    ]));
    assert.equal(skills.error, undefined);
    assert.equal(skills.format, "skillZip");
    assert.deepEqual(skills.project.items.map((i) => i.skillName), ["helper"]);
  });

  test("a ZIP with two entries of the same name is refused before any part is read", async () => {
    const entries = mixedEntries();
    entries.push({ name: "skills/meeting-notes/SKILL.md", bytes: skillMd("meeting-notes", "A second copy.") });
    const result = await engine.imports.any("twice.zip", engine.zip.write(entries));
    assert.ok(result.error.includes("two files with the same name"));
  });
});
