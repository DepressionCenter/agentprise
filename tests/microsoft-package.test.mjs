// This file is part of Agentprise
// tests/microsoft-package.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-21
// Last Modified: 2026-10-23
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
  APP_ID, SECRET, appManifest, declarativeAgent, skillMd, serverPlugin, openApiPlugin, agentOnlyEntries, skillOnlyEntries, connectorOnlyEntries, mixedEntries, multiAgentEntries, hostileEntries,
} from "./microsoft-package-fixture.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
// Synthetic credentials exercise rejection without storing an encoded header.
const SYNTHETIC_BASIC_TOKEN = Buffer.from("test:fake", "utf8").toString("base64");
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
  test("rejected MCP function names never become unrestricted discovery", async () => {
    for (const names of [["a".repeat(101)], ["invalid name"], [123], [""]]) {
      for (const scope of ["runtime", "manifest"]) {
        const plugin = serverPlugin("records", "https://example.org/mcp");
        if (scope === "runtime") {
          plugin.runtimes[0].run_for_functions = names;
          plugin.functions = [{ name: "differentTool" }];
        } else plugin.functions = names.map((name) => ({ name }));
        const entries = [
          { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
          { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
          { name: "plugins/records.json", bytes: encode(JSON.stringify(plugin)) },
        ];
        const { project, notices } = await openPackage(entries);
        assert.deepEqual(project.items[0].capabilities, []);
        assert.deepEqual(project.servers, {});
        assert.ok(notices.some((notice) => notice.includes("names specific tools")));
        const { project: again } = await backupRoundTrip(project);
        for (const source of entries) {
          for (const result of [project, again]) {
            assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
          }
        }
      }
    }
    for (const names of [["records.search"], ["records.search", "records_search"]]) {
      const project = engine.project.normalize({ name: "Restricted tools", servers: { records: { transport: "http", url: "https://example.org/mcp", tools: names } }, items: [{ kind: "agent", name: "Helper", capabilities: [{ id: "records", providers: { "*": [{ kind: "mcp", server: "records", tools: names }] } }] }] }).project;
      const output = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
      const entries = await engine.zip.read(output.bytes);
      const actions = [...entries].filter(([name]) => name.startsWith("plugin-")).map(([, bytes]) => JSON.parse(decode(bytes)));
      assert.equal(actions.length, names.length === 1 ? 0 : 1);
      for (const action of actions) assert.deepEqual(action.runtimes[0].run_for_functions, ["records_search"]);
    }
  });

  test("a function name listed twice imports the action without a limits notice", async () => {
    const baseline = await openPackage(agentOnlyEntries());
    const entries = agentOnlyEntries();
    const records = entries.find((entry) => entry.name === "agents/plugins/records.json");
    records.bytes = encode(JSON.stringify(openApiPlugin("records", "../apis/records.yaml", ["searchRecords", "searchRecords", "getRecord"])));
    const { project, notices } = await openPackage(entries);
    assert.ok(!notices.some((notice) => notice.includes("exceed this app's limits")), JSON.stringify(notices));
    const providers = project.items[0].capabilities.flatMap((capability) => Object.values(capability.providers).flat());
    assert.ok(providers.some((provider) => provider.kind === "openapi" && JSON.stringify(provider.operations) === JSON.stringify(["searchRecords", "getRecord"])), JSON.stringify(providers));
    assert.deepEqual(unrecognizedPaths(project), unrecognizedPaths(baseline.project));
  });

  test("duplicate connector IDs retain all definitions in the source manifest", async () => {
    const connectors = ["first", "second"].map((name) => ({ id: "records", toolSource: { remoteMcpServer: { mcpServerUrl: "https://" + name + ".example.org/mcp" } } }));
    const source = { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentConnectors: connectors }))) };
    const { project, notices } = await openPackage([source]);
    assert.equal(project.servers.records.url, "https://first.example.org/mcp");
    assert.equal(Object.keys(project.servers).length, 1);
    assert.ok(notices.some((notice) => notice.includes("same \"id\" value as another connector")));
    const { project: again } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/manifest.json").bytes, source.bytes);
    }
  });

  test("inline API descriptions become distinct files and take precedence over URLs", async () => {
    const descriptions = ["openapi: 3.0.0\npaths:\n  /records:\n    get:\n      operationId: searchRecords\n", JSON.stringify({ openapi: "3.0.0", paths: { "/records": { get: { responses: { "200": { description: "OK" } }, operationId: "searchRecords" } } } })];
    for (const api of descriptions) {
      for (const url of [undefined, "https://example.org/ignored.yaml", "ignored.yaml"]) {
        const plugin = openApiPlugin("records", "unused.yaml");
        plugin.runtimes[0].spec = { api_description: api };
        if (url !== undefined) plugin.runtimes[0].spec.url = url;
        plugin.runtimes.push({ ...plugin.runtimes[0], spec: { api_description: api.replace("/records", "/other") } });
        const entries = [
          { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "first", file: "agents/first.json" }, { id: "second", file: "agents/second.json" }] } }))) },
          ...["first", "second"].map((name) => ({ name: "agents/" + name + ".json", bytes: encode(JSON.stringify(declarativeAgent(name, { actions: [{ id: "records", file: "plugins/records.json" }] }))) })),
          { name: "plugins/records.json", bytes: encode(JSON.stringify(plugin)) },
          { name: "plugins/INLINE-DESCRIPTION-1.yaml", bytes: encode("Unrelated file.") },
        ];
        const { project } = await openPackage(entries);
        const { project: again } = await backupRoundTrip(project);
        for (const result of [project, again]) {
          for (const item of result.items) {
            assert.deepEqual(item.capabilities[0].providers["*"].map((provider) => provider.spec), ["plugins/inline-description-2.yaml", "plugins/inline-description-3.yaml"]);
            assert.equal(decode(item.files[0].bytes), api);
            assert.equal(decode(item.files[1].bytes), api.replace("/records", "/other"));
          }
        }
        const exported = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
        const reopened = await engine.imports.any(exported.fileName, exported.bytes);
        assert.equal(reopened.project.items[0].capabilities.flatMap((capability) => capability.providers["*"]).length, 2);
      }
    }
    const entries = agentOnlyEntries();
    const action = entries.find((entry) => entry.name.endsWith(".json") && decode(entry.bytes).includes('"OpenApi"'));
    const plugin = JSON.parse(decode(action.bytes));
    plugin.runtimes[0].spec = { api_description: "client_secret: " + SECRET };
    action.bytes = encode(JSON.stringify(plugin));
    const { project, notices } = await openPackage(entries);
    const { backup } = await backupRoundTrip(project);
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
  });

  test("static MCP action descriptions retain linked sources without switching discovery", async () => {
    for (const description of [{ tools: [{ name: "searchRecords", inputSchema: { type: "object" } }] }, { file: "tools.json" }]) {
      const plugin = serverPlugin("records", "https://example.org/mcp");
      plugin.runtimes[0].spec.mcp_tool_description = description;
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
        { name: "plugins/records.json", bytes: encode(JSON.stringify(plugin)) },
      ];
      if (description.file) entries.push({ name: "plugins/tools.json", bytes: encode('{"tools":[{"name":"searchRecords"}]}') });
      const { project, notices } = await openPackage(entries);
      assert.deepEqual(project.items[0].capabilities, []);
      assert.deepEqual(project.servers, {});
      assert.ok(notices.some((notice) => notice.includes("fixed tool list")));
      const { project: again } = await backupRoundTrip(project);
      for (const source of entries) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
        }
      }
    }
  });

  test("valid connector tool lists retain the manifest relationship", async () => {
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentConnectors: [{ id: "records", toolSource: { remoteMcpServer: { mcpServerUrl: "https://example.org/mcp", mcpToolDescription: { file: "tools/records.json" } } } }] }))) },
      { name: "tools/records.json", bytes: encode('{"tools":[{"name":"searchRecords"}]}') },
    ];
    const { project } = await openPackage(entries);
    const { project: again } = await backupRoundTrip(project);
    for (const source of entries) {
      for (const result of [project, again]) {
        assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
      }
    }
  });

  test("UTF-16 registration IDs are scrubbed without changing the text encoding", async () => {
    for (const littleEndian of [true, false]) {
      for (const bom of [true, false]) {
        for (const suffix of ["json", "yaml"]) {
          const text = suffix === "json" ? '{"referenceId":"example-tenant-registration","title":"Caf\u00e9"}' : 'reference_id: "example-tenant-registration"\ntitle: "Caf\u00e9"\n';
          const bytes = new Uint8Array(text.length * 2 + (bom ? 2 : 0));
          const view = new DataView(bytes.buffer);
          if (bom) view.setUint16(0, 0xfeff, littleEndian);
          for (let index = 0; index < text.length; index++) view.setUint16((bom ? 2 : 0) + index * 2, text.charCodeAt(index), littleEndian);
          const entries = skillOnlyEntries();
          entries.push({ name: "config/settings." + suffix, bytes });
          const { project } = await openPackage(entries);
          const { project: again } = await backupRoundTrip(project);
          for (const result of [project, again]) {
            const kept = result.unrecognized.find((entry) => entry.path === "microsoft-package/config/settings." + suffix).bytes;
            const restored = new TextDecoder(littleEndian ? "utf-16le" : "utf-16be").decode(kept);
            assert.equal(restored, text.replace("example-tenant-registration", "replace-with-your-auth-registration-id"));
            assert.deepEqual(kept.slice(0, 2), bytes.slice(0, 2));
          }
        }
      }
    }
  });

  test("rejected API files retain action, assistant, and package sources", async () => {
    const variants = [
      { name: "api.yaml", bytes: encode("") },
      { name: "api.yaml", bytes: new Uint8Array([0, 1, 2, 3]) },
      { name: "api.dat", bytes: encode("openapi: 3.0.0\npaths: {}\n") },
      { name: "api.exe", bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0]) },
    ];
    for (const variant of variants) {
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
        { name: "plugins/records.json", bytes: encode(JSON.stringify(openApiPlugin("records", variant.name))) },
        { name: "plugins/" + variant.name, bytes: variant.bytes },
      ];
      const { project, notices } = await openPackage(entries);
      assert.deepEqual(project.items[0].capabilities, []);
      assert.deepEqual(project.items[0].files, []);
      assert.ok(notices.some((notice) => notice.includes(variant.name.endsWith(".exe") ? "program file" : "Some API description files")));
      const { project: again, backup } = await backupRoundTrip(project);
      for (const source of entries.filter((entry) => !entry.name.endsWith(".exe"))) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
        }
      }
      assert.equal(backup.entries.some((entry) => entry.name.endsWith(".exe")), false);
    }
  });

  test("API files in the attachment folder retain sources when attachments are full", async () => {
    for (const count of [19, 20]) {
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
        { name: "plugins/records.json", bytes: encode(JSON.stringify(openApiPlugin("records", "../references/api.yaml"))) },
        { name: "references/api.yaml", bytes: encode("openapi: 3.0.0\npaths: {}\n") },
        ...Array.from({ length: count }, (_, index) => ({ name: "notes" + index + ".txt", bytes: encode("Notes " + index) })),
      ];
      const { project } = await openPackage(entries);
      assert.equal(project.items[0].capabilities.length, count === 19 ? 1 : 0);
      assert.equal(project.items[0].files.length, 20);
      const { project: again } = await backupRoundTrip(project);
      for (const source of count === 20 ? entries.slice(0, 4) : []) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
        }
      }
    }
  });

  test("case-conflicting API source paths reject the package instead of losing backup bytes", async () => {
    const plugin = openApiPlugin("records", "Api.yaml");
    plugin.runtimes.push({ ...plugin.runtimes[0], spec: { url: "api.yaml" } });
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
      { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
      { name: "plugins/records.json", bytes: encode(JSON.stringify(plugin)) },
      { name: "plugins/Api.yaml", bytes: encode("openapi: 3.0.0\ninfo: First\n") },
      { name: "plugins/api.yaml", bytes: encode("openapi: 3.0.0\ninfo: Second\n") },
    ];
    const result = await engine.imports.any("package.zip", engine.zip.write(entries));
    assert.equal(result.project, undefined);
    assert.equal(result.blocked, true);
    assert.ok(result.error.includes("same backup name") && result.error.includes("update their references"));
  });

  test("root attachments cannot replace API descriptions with the same stored path", async () => {
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
      { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
      { name: "plugins/records.json", bytes: encode(JSON.stringify(openApiPlugin("records", "../references/api.txt"))) },
      { name: "references/api.txt", bytes: encode("openapi: 3.0.0\npaths: {}\n") },
      { name: "api.txt", bytes: encode("Unrelated root attachment.") },
    ];
    const { project } = await openPackage(entries);
    const { project: again } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.deepEqual(result.items[0].files.find((file) => file.path === "references/api.txt").bytes, entries[3].bytes);
      assert.deepEqual(result.unrecognized.find((file) => file.path === "microsoft-package/api.txt").bytes, entries[4].bytes);
    }
  });

  test("malformed assistant files retain the package manifest for repair", async () => {
    for (const text of ["{ broken", "[]", "null", ""]) {
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(text) },
      ];
      const { project } = await openPackage(entries);
      assert.deepEqual(project.items, []);
      const { project: again } = await backupRoundTrip(project);
      for (const source of entries) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
        }
      }
    }
  });

  test("OpenAPI runtimes without explicit operations retain repairable sources", async () => {
    for (const runFor of [undefined, [], ["*"]]) {
      const plugin = openApiPlugin("records", "records.yaml");
      delete plugin.functions;
      if (runFor === undefined) delete plugin.runtimes[0].run_for_functions;
      else plugin.runtimes[0].run_for_functions = runFor;
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "records", file: "plugins/records.json" }] }))) },
        { name: "plugins/records.json", bytes: encode(JSON.stringify(plugin)) },
        { name: "plugins/records.yaml", bytes: encode("openapi: 3.0.0\npaths:\n  /records:\n    get:\n      operationId: searchRecords\n") },
      ];
      const { project, notices } = await openPackage(entries);
      assert.deepEqual(project.items[0].capabilities, []);
      assert.ok(notices.some((notice) => notice.includes("doesn't list API operations")));
      const { project: again } = await backupRoundTrip(project);
      for (const source of entries) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
        }
      }
    }
  });

  test("function lists beyond the provider limit retain complete action sources", async () => {
    for (const count of [49, 50, 51]) {
      for (const kind of ["openapi", "mcp"]) {
        const functions = Array.from({ length: count }, (_, index) => "operation" + index);
        const plugin = kind === "openapi" ? openApiPlugin("records", "records.yaml", functions) : serverPlugin("records", "https://example.org/mcp");
        plugin.functions = functions.map((name) => ({ name }));
        plugin.runtimes[0].run_for_functions = ["*"];
        const entries = [
          { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "first", file: "agents/first.json" }, { id: "second", file: "agents/second.json" }] } }))) },
          ...["first", "second"].map((name) => ({ name: "agents/" + name + ".json", bytes: encode(JSON.stringify(declarativeAgent(name, { actions: [{ id: "records", file: "plugins/records.json" }] }))) })),
          { name: "plugins/records.json", bytes: encode(JSON.stringify(plugin)) },
        ];
        if (kind === "openapi") entries.push({ name: "plugins/records.yaml", bytes: encode("openapi: 3.0.0\npaths:\n" + functions.map((name) => "  /" + name + ":\n    get:\n      operationId: " + name).join("\n") + "\n") });
        const { project, notices } = await openPackage(entries);
        assert.equal(notices.some((notice) => notice.includes("function names that exceed")), count > 50);
        for (const item of project.items) {
          const provider = item.capabilities[0].providers["*"][0];
          assert.deepEqual(provider.operations || provider.tools, functions.slice(0, 50));
        }
        const { project: again } = await backupRoundTrip(project);
        for (const source of count > 50 ? entries : []) {
          for (const result of [project, again]) {
            assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
          }
        }
      }
    }
  });

  test("skills beyond the server limit retain sources without reusing lost server names", async () => {
    for (const count of [10, 11, 12]) {
      const folders = Array.from({ length: count }, (_, index) => "skills/skill" + index);
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: folders.map((folder) => ({ folder })) }))) },
        ...folders.flatMap((folder, index) => [
          { name: folder + "/SKILL.md", bytes: skillMd("skill" + index, "Looks up records.") },
          { name: folder + "/agentprise.json", bytes: encode(JSON.stringify({ kind: "skill", servers: { shared: { transport: "http", url: "https://example.org/server" + index } }, capabilities: [{ id: "lookup", providers: { "*": [{ kind: "mcp", server: "shared" }] } }] })) },
          { name: folder + "/references/guide.txt", bytes: encode("Guide " + index) },
        ]),
      ];
      const { project, notices } = await openPackage(entries);
      assert.equal(Object.keys(project.servers).length, 10);
      for (const [index, item] of project.items.entries()) {
        const providers = item.capabilities[0].providers["*"];
        assert.equal(providers.length, index < 10 ? 1 : 0);
        if (providers.length) assert.equal(project.servers[providers[0].server].url, "https://example.org/server" + index);
      }
      assert.equal(notices.some((notice) => notice.includes("Some skills need tool servers")), count > 10);
      const { project: again } = await backupRoundTrip(project);
      assert.deepEqual(again.servers, project.servers);
      for (const source of entries.filter((entry) => count > 10 && (entry.name === "manifest.json" || folders.slice(10).some((folder) => entry.name.startsWith(folder + "/"))))) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
        }
      }
    }
  });

  test("backup capacity rejects packages instead of dropping retained or unsupported skill files", async () => {
    for (const count of [49, 50, 51]) {
      for (const inSkill of [false, true]) {
        const folder = "skills/helper/";
        const entries = [
          { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: [{ folder }] }))) },
          { name: folder + "SKILL.md", bytes: skillMd("helper", "Helps.") },
          ...Array.from({ length: count }, (_, index) => ({ name: (inSkill ? folder : "extra/") + "file" + index + ".dat", bytes: encode("Safe contents " + index) })),
        ];
        const opened = await engine.imports.any("package.zip", engine.zip.write(entries));
        if (count > 50) {
          assert.equal(opened.project, undefined);
          assert.equal(opened.blocked, true);
          assert.ok(opened.error.includes("50") && opened.error.includes("Split the package"));
        } else {
          assert.equal(opened.error, undefined);
          assert.equal(opened.project.unrecognized.length, count);
          const { project: again } = await backupRoundTrip(opened.project);
          assert.deepEqual(again.unrecognized, opened.project.unrecognized);
        }
      }
    }
  });

  test("aggregate API file limits preserve sources and do not truncate shared action definitions", async () => {
    for (const count of [8, 9, 10]) {
      const actions = Array.from({ length: count }, (_, index) => ({ id: "api" + index, file: "plugins/api" + index + ".json" }));
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "first", file: "agents/first.json" }, { id: "second", file: "agents/second.json" }] } }))) },
        { name: "agents/first.json", bytes: encode(JSON.stringify(declarativeAgent("First", { actions }))) },
        { name: "agents/second.json", bytes: encode(JSON.stringify(declarativeAgent("Second", { actions: [actions.at(-1)] }))) },
      ];
      for (const [index, action] of actions.entries()) {
        const plugin = openApiPlugin(action.id, "unused.yaml");
        plugin.runtimes = Array.from({ length: 6 }, (_, number) => ({ ...plugin.runtimes[0], spec: { url: "spec" + index + "-" + number + ".yaml" } }));
        entries.push({ name: action.file, bytes: encode(JSON.stringify(plugin)) });
        plugin.runtimes.forEach((runtime) => entries.push({ name: "plugins/" + runtime.spec.url, bytes: encode("openapi: 3.0.0\npaths: {}\n") }));
      }
      const { project, notices } = await openPackage(entries);
      assert.equal(project.items[0].files.length, Math.min(count * 6, 50));
      assert.equal(project.items[0].capabilities.flatMap((capability) => capability.providers["*"]).length, Math.min(count * 6, 50));
      assert.equal(project.items[1].capabilities[0].providers["*"].length, 6);
      assert.equal(notices.some((notice) => notice.includes("at most 50 API description files")), count > 8);
      const { project: again } = await backupRoundTrip(project);
      const preserved = count > 8 ? ["manifest.json", "agents/first.json", ...actions.slice(8).map((action) => action.file), ...entries.filter((entry) => /^plugins\/spec[89]-/.test(entry.name)).map((entry) => entry.name)] : [];
      for (const path of preserved) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + path).bytes, entries.find((entry) => entry.name === path).bytes);
        }
      }
    }
  });

  test("identical renamed servers are reused across many skills", async () => {
    const folders = Array.from({ length: 11 }, (_, index) => "skills/skill" + index);
    const files = folders.flatMap((folder, index) => [
      { name: folder + "/SKILL.md", bytes: skillMd("skill" + index, "Looks up records.") },
      { name: folder + "/agentprise.json", bytes: encode(JSON.stringify({ kind: "skill", servers: { shared: { transport: "http", url: index === 0 ? "https://first.example.org/mcp" : "https://second.example.org/mcp", auth: "oauth" } }, capabilities: [{ id: "lookup", providers: { "*": [{ kind: "mcp", server: "shared" }] } }] })) },
    ]);
    const manifests = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: folders.map((folder) => ({ folder })) }))) },
      { name: "plugin.json", bytes: encode(JSON.stringify({ name: "Example", license: "MIT" })) },
      null,
    ];
    for (const manifest of manifests) {
      const { project } = await openPackage(manifest ? [manifest, ...files] : files);
      const { project: again } = await backupRoundTrip(project);
      for (const result of [project, again]) {
        assert.equal(Object.keys(result.servers).length, 2);
        assert.equal(result.items.length, 11);
        for (const [index, item] of result.items.entries()) {
          const provider = item.capabilities[0].providers["*"][0];
          assert.equal(provider.server, index === 0 ? "shared" : "shared-2");
          assert.equal(result.servers[provider.server].url, index === 0 ? "https://first.example.org/mcp" : "https://second.example.org/mcp");
        }
      }
    }
  });

  test("rejected skill references retain the sources that name them", async () => {
    for (const scope of ["assistant", "package"]) {
      for (const folder of ["missing", "../outside", "/absolute", "https://example.org/skill", "", null, 42]) {
        const manifest = appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } });
        const assistant = declarativeAgent("Helper");
        if (scope === "assistant") assistant.agent_skills = [{ folder }];
        else manifest.agentSkills = [{ folder }];
        const entries = [{ name: "manifest.json", bytes: encode(JSON.stringify(manifest)) }, { name: "agents/helper.json", bytes: encode(JSON.stringify(assistant)) }];
        const { project } = await openPackage(entries);
        assert.equal(project.items.length, 1);
        const { project: again } = await backupRoundTrip(project);
        for (const original of scope === "assistant" ? entries : entries.slice(0, 1)) {
          for (const result of [project, again]) {
            assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + original.name).bytes, original.bytes);
          }
        }
      }
    }
  });

  test("API descriptions resolve relative to the action manifest and cannot escape the package", async () => {
    const cases = [
      ["api.yaml", "agents/tools/api.yaml"], ["./api.yaml", "agents/tools/api.yaml"],
      ["../api.yaml", "agents/api.yaml"], ["../../api.yaml", "api.yaml"],
      ["api%20description.yaml", "agents/tools/api description.yaml"],
      ...["../../../api.yaml", "%2e%2e/%2e%2e/%2e%2e/api.yaml", "/api.yaml", "//example.org/api.yaml", "https://example.org/api.yaml", "..\\api.yaml", "api.yaml#part", "api.yaml?version=1", "%ZZ"].map((path) => [path, null]),
    ];
    for (const [reference, resolved] of cases) {
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "api", file: "agents/tools/plugin.json" }] }))) },
        { name: "agents/tools/plugin.json", bytes: encode(JSON.stringify(openApiPlugin("api", reference))) },
        { name: "api.yaml", bytes: encode("openapi: 3.0.0\ninfo: {title: Root}\npaths: {}\n") },
      ];
      if (resolved && resolved !== "api.yaml") entries.push({ name: resolved, bytes: encode("openapi: 3.0.0\ninfo: {title: Nested}\npaths: {}\n") });
      const { project } = await openPackage(entries);
      const { project: again } = await backupRoundTrip(project);
      for (const result of [project, again]) {
        if (resolved) {
          assert.equal(result.items[0].capabilities[0].providers["*"][0].spec, resolved);
          assert.deepEqual(result.items[0].files.find((file) => file.path === resolved).bytes, entries.find((entry) => entry.name === resolved).bytes);
        } else {
          assert.deepEqual(result.items[0].capabilities, []);
          assert.ok(result.unrecognized.some((entry) => entry.path === "microsoft-package/agents/tools/plugin.json"));
        }
      }
    }
  });

  test("runtimes beyond the provider limit keep their definitions and local descriptions", async () => {
    for (const count of [6, 7, 8]) {
      const plugin = openApiPlugin("api", "api0.yaml");
      plugin.runtimes = Array.from({ length: count }, (_, index) => ({ ...plugin.runtimes[0], spec: { url: "api" + index + ".yaml" } }));
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "first", file: "agents/first.json" }, { id: "second", file: "agents/second.json" }] } }))) },
        ...["first", "second"].map((name) => ({ name: "agents/" + name + ".json", bytes: encode(JSON.stringify(declarativeAgent(name, { actions: [{ id: "api", file: "plugins/plugin.json" }] }))) })),
        { name: "plugins/plugin.json", bytes: encode(JSON.stringify(plugin)) },
        ...Array.from({ length: count }, (_, index) => ({ name: "plugins/api" + index + ".yaml", bytes: encode(index === 7 ? "password: " + SECRET : "openapi: 3.0.0\npaths: {}\n") })),
      ];
      const { project, notices } = await openPackage(entries);
      assert.ok(project.items.every((item) => item.capabilities[0].providers["*"].length === 6 && item.files.length === 6));
      assert.equal(notices.some((notice) => notice.includes("more than 6 ways to connect")), count > 6);
      const { project: again, backup } = await backupRoundTrip(project);
      const paths = ["manifest.json", "agents/first.json", "agents/second.json", "plugins/plugin.json", "plugins/api6.yaml"];
      for (const path of count > 6 ? paths : []) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + path).bytes, entries.find((entry) => entry.name === path).bytes);
        }
      }
      assert.equal(everythingShown(project, notices).includes(SECRET), false);
      assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    }
  });

  test("a rejected assistant reference retains the manifest while valid components open", async () => {
    for (const file of ["missing.json", "../outside.json", "/absolute.json", "https://example.org/agent.json", "", null, 42]) {
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({
          copilotAgents: { declarativeAgents: [{ id: "missing", file }] }, agentSkills: [{ folder: "skills/helper" }],
        }))) },
        { name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") },
      ];
      const { project, notices } = await openPackage(entries);
      assert.deepEqual(project.items.map((item) => item.skillName), ["helper"]);
      assert.ok(notices.some((notice) => notice.startsWith("An assistant in the manifest points at a file")));
      const { project: again } = await backupRoundTrip(project);
      for (const result of [project, again]) {
        assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/manifest.json").bytes, entries[0].bytes);
      }
    }
  });

  test("actions dropped by server limits keep their sources without empty providers", async () => {
    for (const [skillCount, actionCount, hybrid] of [[10, 1, false], [9, 2, false], [0, 11, false], [10, 1, true]]) {
      const actions = Array.from({ length: actionCount }, (_, index) => ({ id: "action" + index, file: "actions/action" + index + ".json" }));
      const servers = Object.fromEntries(Array.from({ length: skillCount }, (_, index) => ["skill" + index, { transport: "http", url: "https://skill.example.org/" + index }]));
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({
          copilotAgents: { declarativeAgents: [{ id: "first", file: "agents/first.json" }, { id: "second", file: "agents/second.json" }] },
          agentSkills: [{ folder: "skills/helper" }],
        }))) },
        ...["first", "second"].map((name) => ({ name: "agents/" + name + ".json", bytes: encode(JSON.stringify(declarativeAgent(name, { actions }))) })),
        { name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") },
        { name: "skills/helper/agentprise.json", bytes: encode(JSON.stringify({ kind: "skill", servers })) },
        ...actions.map((action, index) => ({ name: action.file, bytes: encode(JSON.stringify(serverPlugin("skill" + index, "https://action.example.org/" + index))) })),
      ];
      if (hybrid) {
        const source = entries.find((entry) => entry.name === actions[0].file);
        const action = JSON.parse(decode(source.bytes));
        action.runtimes.push(openApiPlugin("skill0", "../apis/records.yaml").runtimes[0]);
        source.bytes = encode(JSON.stringify(action));
        entries.push({ name: "apis/records.yaml", bytes: encode("openapi: 3.0.0\npaths: {}\n") });
      }
      const { project, notices } = await openPackage(entries);
      assert.equal(Object.keys(project.servers).length, 10);
      for (const agent of project.items.slice(0, 2)) {
        assert.equal(agent.capabilities.length, 10 - skillCount + (hybrid ? 1 : 0));
        assert.ok(agent.capabilities.every((capability) => capability.providers["*"].length > 0));
        assert.ok(agent.capabilities.flatMap((capability) => capability.providers["*"]).filter((provider) => provider.kind === "mcp").every((provider) => project.servers[provider.server].url.startsWith("https://action.example.org/")));
      }
      assert.ok(notices.some((notice) => notice.includes("Some actions need tool servers beyond")));
      const { project: again } = await backupRoundTrip(project);
      const paths = ["manifest.json", "agents/first.json", "agents/second.json", actions.at(-1).file];
      if (hybrid) paths.push("apis/records.yaml");
      for (const path of paths) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + path).bytes, entries.find((entry) => entry.name === path).bytes);
        }
      }
    }
  });

  test("rejected action paths retain the assistant and manifest for repair", async () => {
    for (const file of ["missing.json", "../outside.json", "/absolute.json", "https://example.org/action.json", "", null, 42]) {
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] } }))) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions: [{ id: "missing", file }] }))) },
      ];
      const { project, notices } = await openPackage(entries);
      assert.deepEqual(project.items[0].capabilities, []);
      assert.ok(notices.some((notice) => notice.includes("points at a file that isn't in the package")));
      const { project: again } = await backupRoundTrip(project);
      for (const original of entries) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + original.name).bytes, original.bytes);
        }
      }
    }
  });

  test("connectors beyond the combined server limit retain the source manifest", async () => {
    for (const [skillCount, actionCount, connectorTotal] of [[0, 0, 11], [0, 10, 1], [10, 0, 1], [5, 4, 2], [9, 0, 1]]) {
      const actions = Array.from({ length: actionCount }, (_, index) => ({ id: "action" + index, file: "actions/action" + index + ".json" }));
      const connectors = Array.from({ length: connectorTotal }, (_, index) => ({ id: "connector" + index, toolSource: { remoteMcpServer: { mcpServerUrl: "https://connector.example.org/" + index } } }));
      const servers = Object.fromEntries(Array.from({ length: skillCount }, (_, index) => ["skill" + index, { transport: "http", url: "https://skill.example.org/" + index }]));
      const manifest = appManifest({
        copilotAgents: { declarativeAgents: [{ id: "helper", file: "agents/helper.json" }] },
        agentSkills: [{ folder: "skills/helper" }], agentConnectors: connectors,
      });
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(manifest)) },
        { name: "agents/helper.json", bytes: encode(JSON.stringify(declarativeAgent("Helper", { actions }))) },
        { name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") },
        { name: "skills/helper/agentprise.json", bytes: encode(JSON.stringify({ kind: "skill", servers })) },
        ...actions.map((action) => ({ name: action.file, bytes: encode(JSON.stringify(serverPlugin(action.id, "https://action.example.org/" + action.id))) })),
      ];
      const { project, notices } = await openPackage(entries);
      const retained = Math.min(connectorTotal, 10 - skillCount - actionCount);
      assert.equal(Object.keys(project.servers).length, 10);
      assert.equal(Object.keys(project.servers).filter((name) => name.startsWith("connector")).length, retained);
      assert.equal(notices.some((notice) => notice.startsWith("Added " + retained + " connector")), retained > 0);
      const { project: again } = await backupRoundTrip(project);
      assert.deepEqual(again.servers, project.servers);
      if (retained < connectorTotal) {
        assert.ok(notices.some((notice) => notice.includes("kept some connectors in the backup only")));
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/manifest.json").bytes, entries[0].bytes);
        }
      } else {
        assert.equal(project.unrecognized.some((entry) => entry.path === "microsoft-package/manifest.json"), false);
      }
    }
  });

  test("listed skill files beyond the file limit survive under their original package paths", async () => {
    for (const count of [49, 50, 51]) {
      const folder = "tools/original-folder/";
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: [{ folder }] }))) },
        { name: folder + "SKILL.md", bytes: skillMd("different-name", "Uses reference files.") },
        ...Array.from({ length: count }, (_, index) => ({ name: folder + "references/file" + index + ".txt", bytes: encode("Reference " + index) })),
        { name: folder + "extra notes.txt", bytes: encode("Extra reference notes.") },
        { name: folder + "secret.txt", bytes: encode("password=" + SECRET) },
        { name: folder + "program.exe", bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) },
      ];
      const { project, notices } = await openPackage(entries);
      assert.equal(project.items[0].files.length, 50);
      const overflow = entries.slice(2, 2 + count + 1).slice(50);
      assert.equal(notices.some((notice) => notice.includes("keeps the extra files in the backup only")), overflow.length > 0);
      const { project: again, backup } = await backupRoundTrip(project);
      assert.deepEqual(again.items[0].files, project.items[0].files);
      for (const original of overflow) {
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + original.name).bytes, original.bytes);
        }
      }
      assert.equal(everythingShown(project, notices).includes(SECRET), false);
      assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET) || entry.name.endsWith("program.exe")), false);
    }
  });

  test("actions beyond the tool limit retain their source files without retaining credentials", async () => {
    for (const kind of ["remote", "openapi", "shared", "credential"]) {
      const actions = Array.from({ length: 21 }, (_, index) => ({ id: "action" + index, file: "actions/action" + index + ".json" }));
      const extra = actions.at(-1);
      const agents = [{ id: "helper", file: "agents/helper.json" }];
      if (kind === "shared") agents.unshift({ id: "first", file: "agents/first.json" });
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: agents } }))) },
        ...agents.map((agent) => ({ name: agent.file, bytes: encode(JSON.stringify(declarativeAgent(agent.id, { actions: agent.id === "first" ? [extra] : actions }))) })),
        ...actions.map((action) => ({ name: action.file, bytes: encode(JSON.stringify(action === extra ? serverPlugin(action.id, "https://example.org/mcp") : openApiPlugin(action.id, "../apis/shared.yaml"))) })),
        { name: "apis/shared.yaml", bytes: encode("openapi: 3.0.0\npaths: {}\n") },
      ];
      const retained = ["manifest.json", "agents/helper.json", extra.file];
      if (kind === "openapi") {
        entries.find((entry) => entry.name === extra.file).bytes = encode(JSON.stringify(openApiPlugin(extra.id, "../apis/extra.yaml")));
        entries.push({ name: "apis/extra.yaml", bytes: encode("openapi: 3.0.0\npaths: {}\n") });
        retained.push("apis/extra.yaml");
      } else if (kind === "credential") {
        entries.find((entry) => entry.name === extra.file).bytes = encode(JSON.stringify({ ...serverPlugin(extra.id, "https://example.org/mcp"), description_for_model: "Authorization: Bearer " + SECRET }));
        retained.pop();
      }
      const { project, notices } = await openPackage(entries);
      assert.equal(project.items.at(-1).capabilities.length, 20);
      assert.ok(notices.some((notice) => notice.includes("Only the first 20 actions of an assistant were opened")));
      const { project: again, backup } = await backupRoundTrip(project);
      for (const path of retained) {
        const original = entries.find((entry) => entry.name === path).bytes;
        for (const result of [project, again]) {
          assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + path).bytes, original);
        }
      }
      assert.equal(everythingShown(project, notices).includes(SECRET), false);
      assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    }
  });

  test("icons not consumed by an assistant survive backups", async () => {
    for (const entries of [skillOnlyEntries(), connectorOnlyEntries(), agentOnlyEntries()]) {
      const { project } = await openPackage(entries);
      const { project: again } = await backupRoundTrip(project);
      const hasAgent = project.items.some((item) => item.kind === "agent");
      for (const name of hasAgent ? ["outline.png"] : ["color.png", "outline.png"]) {
        const original = entries.find((entry) => entry.name === name).bytes;
        assert.deepEqual(project.unrecognized.find((entry) => entry.path === "microsoft-package/" + name).bytes, original);
        assert.deepEqual(again.unrecognized.find((entry) => entry.path === "microsoft-package/" + name).bytes, original);
      }
      if (hasAgent) {
        assert.ok(project.items[0].icon);
        assert.equal(project.unrecognized.some((entry) => entry.path === "microsoft-package/color.png"), false);
      }
    }
  });

  test("invalid connector description paths get a notice and retain the manifest", async () => {
    for (const file of ["../outside.json", "/absolute.json", "tools/../description.json", "https://example.org/tools.json", "missing.json", "", null, 42]) {
      const manifest = appManifest({ agentConnectors: [{ id: "example", toolSource: { remoteMcpServer: {
        mcpServerUrl: "https://example.org/mcp", mcpToolDescription: { file },
      } } }] });
      const entries = [{ name: "manifest.json", bytes: encode(JSON.stringify(manifest)) }];
      const { project, notices } = await openPackage(entries);
      assert.equal(project.servers.example.url, "https://example.org/mcp");
      assert.ok(notices.some((notice) => notice.includes("names a tool list file that isn't in the package or has an unsafe path")));
      const { project: again } = await backupRoundTrip(project);
      for (const result of [project, again]) {
        assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/manifest.json").bytes, entries[0].bytes);
      }
    }
  });

  test("safe root files refused as attachments remain in the backup", async () => {
    const entries = agentOnlyEntries();
    const rejected = [
      { name: "truncated.pdf", bytes: encode("Truncated document content.") },
      { name: "empty.txt", bytes: new Uint8Array() },
      { name: "NOTES.txt", bytes: encode("Second spelling of notes.") },
      { name: "overflow.txt", bytes: encode("Beyond the attachment count.") },
    ];
    entries.push({ name: "notes.txt", bytes: encode("First spelling of notes.") });
    entries.push(...rejected.slice(0, 3));
    entries.push(...Array.from({ length: 18 }, (_, index) => ({ name: "attachment" + index + ".txt", bytes: encode("Attachment.") })));
    entries.push(rejected[3]);
    const { project, notices } = await openPackage(entries);
    assert.equal(project.items[0].files.filter((file) => file.path.startsWith("references/")).length, 20);
    for (const entry of rejected) {
      assert.ok(notices.some((notice) => notice.includes(entry.name) && notice.includes("Agentprise couldn't attach")));
      assert.deepEqual(project.unrecognized.find((file) => file.path === "microsoft-package/" + entry.name).bytes, entry.bytes);
    }
    const { project: again } = await backupRoundTrip(project);
    for (const entry of rejected) {
      assert.deepEqual(again.unrecognized.find((file) => file.path === "microsoft-package/" + entry.name).bytes, entry.bytes);
    }
  });

  test("items beyond the project limit keep their source files through backups", async () => {
    for (const agentCount of [0, 1, 21]) {
      const skillCount = agentCount > 20 ? 0 : 21 - agentCount;
      const agents = Array.from({ length: agentCount }, (_, index) => ({ id: "assistant" + index, file: "agents/assistant" + index + ".json" }));
      const skills = Array.from({ length: skillCount }, (_, index) => ({ folder: "skills/skill" + index }));
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: agents }, agentSkills: skills }))) },
        ...agents.map((agent, index) => ({ name: agent.file, bytes: encode(JSON.stringify(declarativeAgent("Assistant " + index))) })),
        ...skills.flatMap((skill, index) => [
          { name: skill.folder + "/SKILL.md", bytes: skillMd("skill" + index, "A listed skill.") },
          { name: skill.folder + "/notes.md", bytes: encode("Source notes.") },
        ]),
      ];
      const { project, notices } = await openPackage(entries);
      assert.equal(project.items.length, 20);
      assert.ok(notices.some((notice) => notice.includes("Only the first 20 assistants and skills were opened")));
      const omittedPaths = agentCount > 20 ? [agents[20].file] : [skills.at(-1).folder + "/SKILL.md", skills.at(-1).folder + "/notes.md"];
      omittedPaths.push("manifest.json");
      const { project: again } = await backupRoundTrip(project);
      for (const path of omittedPaths) {
        const original = entries.find((entry) => entry.name === path).bytes;
        assert.deepEqual(project.unrecognized.find((entry) => entry.path === "microsoft-package/" + path).bytes, original);
        assert.deepEqual(again.unrecognized.find((entry) => entry.path === "microsoft-package/" + path).bytes, original);
      }
      assert.equal(again.items.length, 20, "kept sources are not imported as extra items");
    }
  });

  test("a root skill cannot override a Microsoft manifest or become an assistant attachment", async () => {
    for (const entries of [agentOnlyEntries(), connectorOnlyEntries()]) {
      const baseline = await openPackage(entries);
      entries.push({ name: "SKILL.md", bytes: skillMd("unlisted", "Not listed by the package.") });
      assert.equal(engine.detectFormat("package.zip", engine.zip.write(entries)), "skillZip");
      const { project, format, notices } = await openPackage(entries);
      assert.equal(format, "teamsZip");
      assert.deepEqual(project.items.map((item) => [item.kind, item.skillName]), baseline.project.items.map((item) => [item.kind, item.skillName]));
      assert.deepEqual(project.servers, baseline.project.servers);
      assert.ok(project.items.every((item) => item.files.every((file) => !file.path.endsWith("SKILL.md"))));
      assert.ok(unrecognizedPaths(project).includes("microsoft-package/SKILL.md"));
      assert.ok(notices.some((notice) => notice.includes("manifest doesn't list") && notice.includes("the package root")));
      const { project: again } = await backupRoundTrip(project);
      assert.deepEqual(again.items.map((item) => item.skillName), project.items.map((item) => item.skillName));
      assert.ok(unrecognizedPaths(again).includes("microsoft-package/SKILL.md"));
    }
  });

  test("kept package files retain the full original path depth and length allowance", async () => {
    const paths = ["a/b/c/d/e/f/g/unsupported.json", "a".repeat(95) + "/" + "b".repeat(94) + "/file.json"];
    for (const path of paths) {
      const entries = agentOnlyEntries();
      const agentEntry = entries.find((entry) => entry.name === "agents/records.json");
      const agent = JSON.parse(decode(agentEntry.bytes));
      agent.actions.find((action) => action.id === "desktop").file = path;
      agentEntry.bytes = encode(JSON.stringify(agent));
      const source = entries.find((entry) => entry.name === "agents/plugins/desktop.json");
      source.name = path;
      const { project, notices } = await openPackage(entries);
      const kept = project.unrecognized.find((entry) => entry.path === "microsoft-package/" + path);
      assert.ok(kept, "the prefix must not consume the source path's allowance");
      assert.deepEqual(kept.bytes, source.bytes);
      assert.equal(notices.some((notice) => notice.includes("unusable")), false);
      const { project: again } = await backupRoundTrip(project);
      assert.deepEqual(again.unrecognized.find((entry) => entry.path === kept.path).bytes, source.bytes);
    }
    const refused = engine.project.normalize({ unrecognized: [
      { path: "microsoft-package/a/b/c/d/e/f/g/h/file.json", bytes: encode("{}") },
      { path: "microsoft-package/../outside.json", bytes: encode("{}") },
      { path: "microsoft-package/" + "a".repeat(96) + "/" + "b".repeat(94) + "/file.json", bytes: encode("{}") },
    ] });
    assert.deepEqual(refused.project.unrecognized, [], "source path limits and traversal protection still apply");
  });

  test("action namespace separators and normalized collisions never drop a distinct action", async () => {
    const namespaces = ["foo-bar", "foobar", "foo_bar", "foo-bar", "foo!bar", "x".repeat(61), "x".repeat(62)];
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ copilotAgents: { declarativeAgents: [{ id: "a", file: "declarativeAgent_0.json" }] } }))) },
      { name: "declarativeAgent_0.json", bytes: encode(JSON.stringify(declarativeAgent("Actions", { actions: namespaces.map((_, index) => ({ id: "action" + index, file: "plugin" + index + ".json" })) }))) },
      ...namespaces.map((namespace, index) => ({ name: "plugin" + index + ".json", bytes: encode(JSON.stringify(serverPlugin(namespace, "https://example.org/mcp/" + index))) })),
    ];
    const { project } = await openPackage(entries);
    const capabilities = project.items[0].capabilities;
    assert.equal(capabilities.length, namespaces.length);
    assert.equal(new Set(capabilities.map((capability) => capability.id)).size, namespaces.length);
    assert.deepEqual(capabilities.slice(0, 3).map((capability) => capability.id), ["action.foo-bar", "action.foobar", "action.foo_bar"]);
    assert.deepEqual(capabilities.map((capability) => project.servers[capability.providers["*"][0].server].url), namespaces.map((_, index) => "https://example.org/mcp/" + index));
    const output = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const files = await engine.zip.read(output.bytes);
    assert.equal(JSON.parse(decode(files.get("declarativeAgent_0.json"))).actions.length, namespaces.length);
    const { project: again } = await backupRoundTrip(project);
    assert.deepEqual(again.items[0].capabilities, capabilities);
  });

  test("unlisted nested skills stay backup-only while explicitly listed descendants import separately", async () => {
    for (const listed of [[], ["skills/parent/private"], ["skills/parent/private/deeper"]]) {
      const folders = ["skills/parent", ...listed];
      const entries = [
        { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: folders.map((folder) => ({ folder })) }))) },
        { name: "skills/parent/SKILL.md", bytes: skillMd("parent", "Parent skill.") },
        { name: "skills/parent/references/guide.md", bytes: encode("Parent reference.") },
        { name: "skills/parent/private/SKILL.md", bytes: skillMd("private", "Nested skill.") },
        { name: "skills/parent/private/notes.md", bytes: encode("Nested reference.") },
        { name: "skills/parent/private/deeper/SKILL.md", bytes: skillMd("deeper", "Deeper skill.") },
      ];
      const { project, notices } = await openPackage(entries);
      assert.equal(project.items.length, folders.length);
      assert.deepEqual(project.items[0].files.map((file) => file.path), ["references/guide.md"]);
      const omitted = ["skills/parent/private", "skills/parent/private/deeper"].filter((folder) => !listed.includes(folder));
      for (const folder of omitted) {
        assert.ok(unrecognizedPaths(project).includes("microsoft-package/" + folder + "/SKILL.md"));
        assert.ok(notices.some((notice) => notice.includes("manifest doesn't list") && notice.includes(folder)));
      }
      const skill = await engine.exports.skillZip(project, project.items[0], "claude");
      assert.equal(skill.entries.some((entry) => entry.name.includes("/private/")), false);
      const { project: again } = await backupRoundTrip(project);
      assert.deepEqual(unrecognizedPaths(again), unrecognizedPaths(project));
      assert.deepEqual(again.items.map((item) => item.skillName), project.items.map((item) => item.skillName));
    }
  });

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
      json.runtimes[0].spec.url = "../../" + path;
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
        assert.ok(notices.some((notice) => notice.includes("more than 4 folders deep") && notice.includes("at most 4 folders deep") && notice.includes("update its path")));
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
    assert.ok(notices.some((n) => n.includes("\"lookup\"") && n.includes("register the connection")));
    assert.equal(everythingShown(project, notices).includes("tenant-registration-1"), false);
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/agents/plugins/desktop.json", "microsoft-package/agents/records.json", "microsoft-package/en.json", "microsoft-package/manifest.json", "microsoft-package/outline.png"]);
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
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/color.png", "microsoft-package/outline.png", "microsoft-package/skills/draft-only/SKILL.md"]);
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
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/color.png", "microsoft-package/manifest.json", "microsoft-package/outline.png", "microsoft-package/tools/legal-tools.json"]);
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
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/outline.png"]);
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
  test("YAML flow mappings cannot hide credential assignments", async () => {
    const unsafe = ["database: {password: " + SECRET + "}", "services: [{name: db, database_password: '" + SECRET + "'}]", 'headers: {"X-API-Key": "' + SECRET + '"}', "config: {other: x, password:\n  " + SECRET + "}", "config: {password: $PASSWORD\n  " + SECRET + "}", "config: {password: 0}"];
    const safe = ["database: {password: '${PASSWORD}'}", 'headers: {"X-API-Key": "${API_KEY}"}', "database: {password: $PASSWORD}", "database: {password: ''}"];
    const entries = skillOnlyEntries();
    unsafe.forEach((text, index) => entries.push({ name: "config/unsafe" + index + ".yaml", bytes: encode(text) }));
    safe.forEach((text, index) => entries.push({ name: "config/safe" + index + ".yaml", bytes: encode(text) }));
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/unsafe")), false);
      assert.equal(result.unrecognized.filter((entry) => entry.path.includes("/safe")).length, safe.length);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => entry.name.includes("/unsafe")), false);
  });

  test("YAML block values and JSON lists or repeated keys cannot hide credentials, while schemas and references stay", async () => {
    const unsafe = [
      { name: "config/unsafe0.yaml", text: "auth:\n  client_secret:\n    " + SECRET + "\n" },
      { name: "config/unsafe1.yaml", text: "api_key:\n  - " + SECRET + "\n" },
      { name: "config/unsafe2.yaml", text: "api_key:\n- " + SECRET + "\n" },
      { name: "config/unsafe3.yaml", text: "password: # set below\r\n\r\n  # comment line\r\n  " + SECRET + "\r\n" },
      { name: "config/unsafe4.yaml", text: "password: [" + SECRET + "]\n" },
      { name: "config/unsafe5.json", text: '{"api_key": ["' + SECRET + '"]}' },
      { name: "config/unsafe6.json", text: '{"password": "' + SECRET + '", "password": null}' },
      { name: "config/unsafe7.json", text: '{"settings": {"pass\\u0077ord": "' + SECRET + '", "password": "${PASSWORD}"}}' },
      { name: "config/unsafe8.json", text: '{"api_key":["' + SECRET + '"],"api_key":null}' },
      { name: "config/unsafe9.json", text: '{"url": "https://user:' + SECRET + '@example.org/", "url": null}' },
      { name: "config/unsafe10.json", text: '{"api_key": [["' + SECRET + '"]], "api_key": []}' },
      { name: "config/unsafe11.json", text: '{"parameters": {"admin_password": {"value": "' + SECRET + '"}}}' },
      { name: "config/unsafe12.json", text: '{"api_key": {"value": "' + SECRET + '"}, "api_key": null}' },
      { name: "config/unsafe13.yaml", text: "admin_password: {value: " + SECRET + "}\n" },
      { name: "config/unsafe14.yaml", text: "parameters: {admin_password: {value: '" + SECRET + "'}}\n" },
      { name: "config/unsafe15.yaml", text: "admin_password:\n  value: " + SECRET + "\n" },
      { name: "config/unsafe16.yaml", text: "admin_password:\n  type: secureString\n  # set by the installer\n  value: \"" + SECRET + "\"\n" },
    ];
    const safe = [
      { name: "config/safe0.yaml", text: "password:\n  type: string\n  format: password\n" },
      { name: "config/safe1.yaml", text: "properties: {password: {type: string, format: password}}\n" },
      { name: "config/safe2.yaml", text: "properties:\n  password: {type: string}\n" },
      { name: "config/safe3.yaml", text: "schema: {properties: {token: {type: string}}}\n" },
      { name: "config/safe4.yaml", text: "password:\n  - type: string\n" },
      { name: "config/safe5.yaml", text: "password:\n  '${PASSWORD}'\n" },
      { name: "config/safe6.yaml", text: "- password:\n- other item\n" },
      { name: "config/safe7.yaml", text: "securitySchemes:\n  api_key:\n    type: apiKey\n    in: header\n    name: X-API-Key\n" },
      { name: "config/safe8.json", text: '{"api_key": "${API_KEY}", "token": "{{ secrets.token }}", "password": {"type": "string"}}' },
      { name: "config/safe9.json", text: '{"api_key": ["${API_KEY}"], "password": "${PASSWORD}", "password": null}' },
      { name: "config/safe11.yaml", text: "admin_password: {value: '${ADMIN_PASSWORD}'}\nclient_secret:\n  value: ${CLIENT_SECRET}\n" },
      { name: "config/safe12.yaml", text: "password:\n  type: object\n  description: Holds the value\n  properties:\n    value:\n      type: string\n" },
      { name: "config/safe10.json", text: '{"properties": {"password": {"type": "string", "format": "password", "description": "The account password"}}, "admin_password": {"value": "${ADMIN_PASSWORD}"}}' },
    ].map((file) => ({ name: file.name, bytes: encode(file.text) }));
    const entries = skillOnlyEntries();
    unsafe.forEach((file) => entries.push({ name: file.name, bytes: encode(file.text) }));
    entries.push(...safe);
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.deepEqual(result.unrecognized.filter((entry) => entry.path.includes("/unsafe")).map((entry) => entry.path), []);
      for (const source of safe) {
        assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name)?.bytes, source.bytes, source.name);
      }
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
  });

  test("a large binary file is kept when only unrelated bytes would spell a credential", async () => {
    // Fixed-seed filler so the file is the same on every run.
    let seed = 12345;
    const filler = new Uint8Array(2 * 1024 * 1024);
    for (let index = 0; index < filler.length; index++) {
      seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
      filler[index] = seed & 0xff;
    }
    // "?", "key=", and "xy" are separated by bytes that are not text, as in compressed data.
    const bytes = new Uint8Array([...encode("%PDF-1.7\n"), 0xff, 0x3f, 0xff, ...encode("key="), 0xff, ...encode("xy"), 0xff, ...filler]);
    const entries = skillOnlyEntries();
    entries.push({ name: "config/large.pdf", bytes });
    const { project } = await openPackage(entries);
    assert.deepEqual(project.unrecognized.find((entry) => entry.path === "microsoft-package/config/large.pdf")?.bytes, bytes);
  });

  test("long runs of tag or name characters are checked quickly", async () => {
    const texts = ["<a ".repeat(400000), "a-".repeat(400000), "x" + "<password>".repeat(150000), "<password>".repeat(150000) + "</password>", "x--https".repeat(150000)];
    const entries = skillOnlyEntries();
    texts.forEach((text, index) => entries.push({ name: "config/long" + index + ".txt", bytes: encode(text) }));
    const started = Date.now();
    const { project } = await openPackage(entries);
    // Generous limit. A scan that rereads the rest of the text for each "<" or word takes minutes on these inputs.
    assert.ok(Date.now() - started < 5000, "Opening took " + (Date.now() - started) + " ms");
    assert.ok(project.unrecognized.some((entry) => entry.path === "microsoft-package/config/long0.txt"));
    assert.ok(project.unrecognized.some((entry) => entry.path === "microsoft-package/config/long1.txt"));
  });

  test("binary signatures cannot bypass credential checks", async () => {
    const entries = mixedEntries();
    const payloads = [encode("%PDF-1.7\npassword: " + SECRET), new Uint8Array([...encode("%PDF-1.7\npassword:"), 0xff, ...encode(" " + SECRET)]), encode("%PDF-1.7\n" + ("password: " + SECRET).split("").join("\u0000"))];
    payloads.forEach((bytes, index) => {
      for (const folder of ["", "config/", "skills/meeting-notes/"]) {
        entries.push({ name: folder + "fake" + index + ".pdf", bytes });
      }
    });
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(everythingShown(result, []).includes(SECRET), false);
      assert.equal(result.items.some((item) => item.files.some((file) => file.path.includes("fake"))), false);
      assert.equal(result.unrecognized.some((file) => file.path.includes("fake")), false);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => entry.name.includes("fake")), false);
  });

  test("XML credential elements and attributes are excluded before attachment or backup", async () => {
    const entries = mixedEntries();
    const unsafe = ["<password>" + SECRET + "</password>", "<config><s:database_password>" + SECRET + "</s:database_password></config>", "<password><![CDATA[" + SECRET + "]]></password>", '<connection password="' + SECRET + '"/>', '<add key="database_password" value="' + SECRET + '"/>', '<field name="pass&#119;ord" value="' + SECRET + '"/>', "<Authorization>Basic " + SYNTHETIC_BASIC_TOKEN + "</Authorization>"];
    unsafe.forEach((text, index) => {
      for (const folder of ["", "config/", "skills/meeting-notes/"]) entries.push({ name: folder + "unsafe" + index + ".xml", bytes: encode(text) });
    });
    const safe = ['<password>${PASSWORD}</password>', '<password/>', '<password></password>', '<add key="password" value="${PASSWORD}"/>', '<title>Public notes</title>'];
    safe.forEach((text, index) => entries.push({ name: "config/safe" + index + ".xml", bytes: encode(text) }));
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(everythingShown(result, []).includes(SECRET), false);
      assert.equal(everythingShown(result, []).includes(SYNTHETIC_BASIC_TOKEN), false);
      assert.equal(result.items.some((item) => item.files.some((file) => file.path.includes("unsafe"))), false);
      assert.equal(result.unrecognized.some((file) => file.path.includes("unsafe")), false);
      assert.equal(result.unrecognized.filter((file) => file.path.includes("/safe")).length, safe.length);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(everythingShown(project, notices).includes(SYNTHETIC_BASIC_TOKEN), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SYNTHETIC_BASIC_TOKEN)), false);
    assert.equal(backup.entries.some((entry) => entry.name.includes("unsafe")), false);
  });

  test("malformed encodings and control bytes cannot hide credential assignments", async () => {
    const entries = skillOnlyEntries();
    const variants = [
      new Uint8Array([...encode("password:"), 0xff, ...encode(" " + SECRET)]),
      encode("password:\ufffd " + SECRET),
      encode("password:\u0001 " + SECRET),
      encode("prefix\u001epassword=" + SECRET),
      new Uint8Array([0xff, 0xfe, 0x70]),
    ];
    variants.forEach((bytes, index) => entries.push({ name: "config/unsafe" + index + ".yaml", bytes }));
    const { project, notices } = await openPackage(entries);
    assert.ok(notices.some((notice) => notice.includes("couldn't check the text")));
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/unsafe")), false);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => entry.name.includes("/unsafe")), false);
  });

  test("short credential values are excluded from JSON, YAML, settings, and backups", async () => {
    const entries = skillOnlyEntries();
    const values = ["a", "ab", "abc", "0", 0, 7, 12, 123, " "];
    for (const [index, value] of values.entries()) {
      entries.push({ name: "config/unsafe" + index + ".json", bytes: encode(JSON.stringify({ password: value })) });
      entries.push({ name: "config/unsafe" + index + ".yaml", bytes: encode("password: '" + value + "'\n") });
      entries.push({ name: "config/unsafe" + index + ".env", bytes: encode('PASSWORD="' + value + '"\n') });
    }
    const safe = [
      { name: "config/empty.json", bytes: encode('{"password":""}') },
      { name: "config/reference.yaml", bytes: encode("password: '${PASSWORD}'\n") },
      { name: "config/reference.env", bytes: encode("PASSWORD=$PASSWORD\n") },
    ];
    entries.push(...safe);
    const { project } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/unsafe")), false);
      for (const source of safe) {
        assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + source.name).bytes, source.bytes);
      }
    }
    assert.equal(backup.entries.some((entry) => entry.name.includes("/unsafe")), false);
  });

  test("JSON credential scans preserve key context across namespaces, arrays, and escapes", async () => {
    const keys = ["X-API-Key", "database_password", "SERVICE_CLIENT_SECRET", "cloud-access-token", "api_key", "password"];
    const secrets = [SECRET, 123456, "${MISSING:-" + SECRET + "}", "${TOKEN}" + SECRET];
    const references = ["${API_KEY}", "$API_KEY", "{{ secrets.token }}", "<EXAMPLE_API_KEY>", false, null, "false"];
    const entries = skillOnlyEntries();
    let index = 0;
    for (const key of keys) {
      for (const value of secrets) {
        for (const wrap of [(pair) => ({ headers: pair }), (pair) => [{ settings: pair }]]) {
          const text = JSON.stringify(wrap({ [key]: value })).replace(/password/g, "pass\\u0077ord");
          entries.push({ name: "config/unsafe" + index++ + ".json", bytes: encode(text) });
        }
      }
    }
    const safeFiles = keys.map((key, number) => ({ name: "config/safe" + number + ".json", bytes: encode(JSON.stringify(references.map((value) => ({ [key]: value })))) }));
    entries.push(...safeFiles);
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/unsafe")), false);
      for (const safe of safeFiles) {
        assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + safe.name).bytes, safe.bytes);
      }
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => entry.name.includes("/unsafe")), false);
  });

  test("authorization headers never reach attachments, skill files, or backups", async () => {
    const token = SYNTHETIC_BASIC_TOKEN;
    const values = ["Authorization: Basic " + token, '"Authorization": "Basic ' + token + '"', "proxy-authorization: basic " + token, "AUTHORIZATION=Basic " + token, "Authorization: Bearer short"];
    const entries = mixedEntries();
    values.forEach((text, index) => {
      for (const folder of ["", "notes/", "skills/meeting-notes/"]) {
        entries.push({ name: folder + "header" + index + ".txt", bytes: encode(text) });
      }
    });
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(everythingShown(result, []).includes(token), false);
      assert.equal(result.items.some((item) => item.files.some((file) => file.path.includes("header"))), false);
      assert.equal(result.unrecognized.some((file) => file.path.includes("header")), false);
    }
    assert.equal(everythingShown(project, notices).includes(token), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(token)), false);
  });

  test("NUL bytes and UTF-16 do not exempt unknown files from credential checks", async () => {
    const text = "EXAMPLE_API_KEY=" + SECRET + "\n";
    const variants = [new Uint8Array([0, ...encode(text)]), encode(text.split("").join("\u0000")), new Uint8Array([0xff, 0, ...encode(text)])];
    for (const littleEndian of [true, false]) {
      for (const bom of [true, false]) {
        const bytes = new Uint8Array(text.length * 2 + (bom ? 2 : 0));
        const view = new DataView(bytes.buffer);
        if (bom) view.setUint16(0, 0xfeff, littleEndian);
        for (let index = 0; index < text.length; index++) view.setUint16((bom ? 2 : 0) + index * 2, text.charCodeAt(index), littleEndian);
        variants.push(bytes);
      }
    }
    const entries = skillOnlyEntries();
    variants.forEach((bytes, index) => entries.push({ name: "config/settings" + index + ".env", bytes }));
    const safe = { name: "config/data.dat", bytes: new Uint8Array([0, 1, 2]) };
    entries.push(safe);
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/settings")), false);
      assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + safe.name).bytes, safe.bytes);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => entry.name.includes("/settings")), false);
  });

  test("safe companion files from a credential-rejected skill stay in the backup", async () => {
    const entries = skillOnlyEntries();
    entries.find((entry) => entry.name === "skills/meeting-notes/SKILL.md").bytes = skillMd("meeting-notes", "Helps.", "Authorization: Bearer " + SECRET);
    const safe = { name: "skills/meeting-notes/references/safe.md", bytes: encode("Safe reference notes.") };
    entries.push(safe, { name: "skills/meeting-notes/secret.env", bytes: encode("password=" + SECRET) });
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.items.some((item) => item.skillName === "meeting-notes"), false);
      assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + safe.name).bytes, safe.bytes);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
  });

  test("only complete credential references are exempt from the settings scan", async () => {
    const unsafe = ["${MISSING:-" + SECRET + "}", "${MISSING-" + SECRET + "}", "${MISSING:=" + SECRET + "}", "${MISSING/old/" + SECRET + "}", "${MISSING}" + SECRET, "${MISSING} " + SECRET, "$MISSING:" + SECRET, "%MISSING%" + SECRET, "{{ secrets.token }}" + SECRET, "<MISSING>" + SECRET, "*alias " + SECRET];
    const safe = ["${API_KEY}", "$API_KEY", "%API_KEY%", "{{ secrets.token }}", "<EXAMPLE_API_KEY>", "*key_alias", "true", "false", "null"];
    const entries = skillOnlyEntries();
    unsafe.forEach((value, index) => entries.push({ name: "config/unsafe" + index + ".env", bytes: encode("API_KEY=" + value + "\n") }));
    safe.forEach((value, index) => entries.push({ name: "config/safe" + index + ".yaml", bytes: encode("api_key: '" + value + "' # external reference\n") }));
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/unsafe")), false);
      assert.equal(result.unrecognized.filter((entry) => entry.path.includes("/safe")).length, safe.length);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
  });

  test("credential-bearing filenames and folders block packages without exposing the path", async () => {
    const paths = ["Bearer " + SECRET + ".txt", "skills/helper/Bearer " + SECRET + ".md", "config/Bearer " + SECRET + "/data.bin", "config/password=" + SECRET + ".txt", "Bearer " + SECRET + ".png"];
    for (const path of paths) {
      for (const route of ["teamsZip", "plugin", "skillZip"]) {
        const entries = [
          { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: [{ folder: "skills/helper" }] }))) },
          { name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") },
          { name: path, bytes: path.endsWith(".png") ? teamsIcons().color : encode("Harmless contents.") },
        ];
        if (route === "plugin") entries.push({ name: "plugin.json", bytes: encode("{}") });
        if (route === "skillZip") entries.push({ name: "SKILL.md", bytes: skillMd("root", "Unlisted root.") });
        const bytes = engine.zip.write(entries);
        assert.equal(engine.detectFormat("package.zip", bytes), route);
        const result = await engine.imports.any("package.zip", bytes);
        assert.equal(result.blocked, true);
        assert.equal(result.project, undefined);
        assert.ok(result.error.includes("file or folder name") && result.error.includes("Remove the key"));
        assert.equal(JSON.stringify(result).includes(SECRET), false);
      }
    }
    const entries = skillOnlyEntries();
    entries.push({ name: "skills/meeting-notes/Bearer guide.txt", bytes: encode("Public documentation.") });
    const { project } = await openPackage(entries);
    assert.ok(project.items.some((item) => item.files.some((file) => file.path === "Bearer guide.txt")));
  });

  test("a rejected nested skill cannot add its remaining files to a listed parent", async () => {
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify(appManifest({ agentSkills: [{ folder: "skills/parent" }, { folder: "skills/parent/child" }] }))) },
      { name: "skills/parent/SKILL.md", bytes: skillMd("parent", "Parent skill.") },
      { name: "skills/parent/child/SKILL.md", bytes: encode("Authorization: Bearer " + SECRET) },
      { name: "skills/parent/child/notes.md", bytes: encode("Only for the excluded skill.") },
    ];
    const { project, notices } = await openPackage(entries);
    assert.deepEqual(project.items.map((item) => item.skillName), ["parent"]);
    assert.deepEqual(project.items[0].files, []);
    const { project: again } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.deepEqual(unrecognizedPaths(result), ["microsoft-package/manifest.json", "microsoft-package/skills/parent/child/notes.md"]);
      assert.deepEqual(result.unrecognized.find((entry) => entry.path.endsWith("/notes.md")).bytes, entries[3].bytes);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
  });

  test("plaintext with a binary suffix is checked before attachments or backup-only files are retained", async () => {
    const entries = agentOnlyEntries();
    const manifestEntry = entries.find((entry) => entry.name === "manifest.json");
    const manifest = JSON.parse(decode(manifestEntry.bytes));
    manifest.agentSkills = [{ folder: "skills/helper" }];
    manifestEntry.bytes = encode(JSON.stringify(manifest));
    entries.push({ name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") });
    for (const name of ["leak.pdf", "config/leak.doc", "skills/helper/leak.docx", "skills/helper/leak.pdf", "skills/helper/leak.one"]) {
      entries.push({ name, bytes: encode("password=" + SECRET + "\n") });
    }
    const { project, notices } = await openPackage(entries);
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.ok(notices.some((notice) => notice.startsWith("Left out 5 files that look")));
    assert.ok(project.items[0].files.some((file) => file.path === "references/guide.pdf"), "a genuine PDF is retained");
    const { backup } = await backupRoundTrip(project);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
  });

  test("credentials in root manifest fields block the package without a skill fallback", async () => {
    const changes = [
      (manifest) => { manifest.developer.websiteUrl = "https://example.org/?token=" + SECRET; },
      (manifest) => { manifest.developer.websiteUrl = "https://user:" + SECRET + "@example.org/"; },
      (manifest) => { manifest.developer.privacyUrl = "https://example.org/?auth=" + SECRET; },
      (manifest) => { manifest.developer.termsOfUseUrl = "https://example.org/?%61uth=" + SECRET; },
      (manifest) => { manifest.description.full = "Authorization: Bearer " + SECRET; },
      (manifest) => { manifest.agentConnectors = [{ id: "leaky", toolSource: { remoteMcpServer: { mcpServerUrl: "https://example.org/mcp?api_key=" + SECRET } } }]; },
    ];
    for (const change of changes) {
      for (const detected of ["teamsZip", "plugin", "skillZip"]) {
        const entries = multiAgentEntries();
        const manifest = JSON.parse(decode(entries[0].bytes));
        manifest.agentSkills = [{ folder: "skills/helper" }];
        change(manifest);
        entries[0].bytes = encode(JSON.stringify(manifest));
        entries.push({ name: "skills/helper/SKILL.md", bytes: skillMd("helper", "Helps.") });
        if (detected !== "teamsZip") {
          for (const [index, agent] of manifest.copilotAgents.declarativeAgents.entries()) {
            entries.find((entry) => entry.name === agent.file).name = "agents/assistant" + index + ".json";
            agent.file = "agents/assistant" + index + ".json";
          }
          entries[0].bytes = encode(JSON.stringify(manifest));
          entries.push(detected === "plugin" ? { name: "plugin.json", bytes: encode("{}") } : { name: "SKILL.md", bytes: skillMd("unlisted", "Unlisted root skill.") });
        }
        const bytes = engine.zip.write(entries);
        assert.equal(engine.detectFormat("unsafe.zip", bytes), detected);
        const result = await engine.imports.any("unsafe.zip", bytes);
        assert.equal(result.project, undefined, "nothing can be stored or exported");
        assert.equal(result.blocked, true);
        assert.ok(result.error.includes("manifest.json") && result.error.includes("Remove the key from manifest.json"));
        assert.equal(JSON.stringify(result).includes(SECRET), false);
      }
    }
  });

  test("URL credentials are rejected from kept text while ordinary URL text survives", async () => {
    const entries = skillOnlyEntries();
    const unsafe = ["https://user:" + SECRET + "@example.org/", "https://example.org/?auth=" + SECRET, "https://example.org/?%61uth=" + SECRET];
    unsafe.forEach((value, index) => entries.push({ name: "notes/unsafe" + index + ".txt", bytes: encode(value) }));
    const safe = { name: "notes/safe.txt", bytes: encode("https://example.org/?author=Example\nhttps://example.org/path/user@example.org\n") };
    entries.push(safe);
    const { project, notices } = await openPackage(entries);
    const { project: again, backup } = await backupRoundTrip(project);
    for (const result of [project, again]) {
      assert.equal(result.unrecognized.some((entry) => entry.path.includes("/unsafe")), false);
      assert.deepEqual(result.unrecognized.find((entry) => entry.path === "microsoft-package/" + safe.name).bytes, safe.bytes);
    }
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    for (const url of unsafe) {
      const encodedEntries = skillOnlyEntries();
      const manifest = JSON.parse(decode(encodedEntries[0].bytes));
      manifest.developer.websiteUrl = url;
      encodedEntries[0].bytes = encode(JSON.stringify(manifest).replace(/\//g, "\\/").replace(/auth/g, "\\u0061uth"));
      const rejected = await engine.imports.any("encoded.zip", engine.zip.write(encodedEntries));
      assert.equal(rejected.blocked, true);
      assert.equal(rejected.project, undefined);
      assert.equal(JSON.stringify(rejected).includes(SECRET), false);
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
      assert.ok(notices.some((notice) => notice.includes("description file") && notice.includes("Remove the key from")));
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

  test("unknown types require readable text while verified binary formats are preserved", async () => {
    const entries = skillOnlyEntries();
    const binary = new Uint8Array([0, 1, 2, 3, 255]);
    entries.push(
      { name: "config/.env", bytes: encode("EXAMPLE_API_KEY=" + SECRET + "\n") },
      { name: "settings.toml", bytes: encode('password = "' + SECRET + '"\n') },
      { name: "keys/private.pem", bytes: encode("-----BEGIN PRIVATE KEY-----\n" + SECRET + "\n-----END PRIVATE KEY-----\n") },
      { name: "skills/meeting-notes/keys/rsa.pem", bytes: encode("-----BEGIN RSA PRIVATE KEY-----\n" + SECRET + "\n-----END RSA PRIVATE KEY-----\n") },
      { name: "data.unknown", bytes: binary },
      { name: "data.png", bytes: teamsIcons().color },
      { name: "config/reference.toml", bytes: encode('api_key = "${EXAMPLE_API_KEY}"\n') },
    );
    const { project, notices } = await openPackage(entries);
    assert.equal(everythingShown(project, notices).includes(SECRET), false);
    assert.ok(notices.some((notice) => notice.startsWith("Left out 4 files that look")));
    assert.equal(project.unrecognized.some((entry) => entry.path === "microsoft-package/data.unknown"), false);
    assert.deepEqual(project.unrecognized.find((entry) => entry.path === "microsoft-package/data.png").bytes, teamsIcons().color);
    assert.ok(notices.some((notice) => notice.includes("couldn't check the text in data.unknown")));
    assert.ok(unrecognizedPaths(project).includes("microsoft-package/config/reference.toml"));
    const { backup, project: again } = await backupRoundTrip(project);
    assert.equal(backup.entries.some((entry) => decode(entry.bytes).includes(SECRET)), false);
    assert.equal(again.unrecognized.some((entry) => entry.path === "microsoft-package/data.unknown"), false);
    assert.deepEqual(again.unrecognized.find((entry) => entry.path === "microsoft-package/data.png").bytes, teamsIcons().color);
  });

  test("unsafe references, repeated paths, an unknown sign-in, and web-only descriptions are left out with a notice each", async () => {
    const { project, notices } = await openPackage(hostileEntries());
    assert.deepEqual(project.items.map((i) => i.name), ["Careful Helper"]);
    const has = (text) => assert.ok(notices.some((n) => n.includes(text)), text);
    has("An assistant in the manifest points at a file that isn't in the package, or at an unsafe path");
    has("Two assistants in the manifest use the same file declarativeAgent_0.json");
    has("The action \"climb\" points at a file that isn't in the package, or at an unsafe path");
    has("The action \"broken\" has a file Agentprise cannot read");
    has("The action \"token-again\" uses the same file as another action");
    has("The action \"vault\" uses a sign-in method Agentprise does not support");
    has("The action \"webspec\" needs an API description from the web");
    has("A skill in the manifest points at the folder skills/missing, which has no SKILL.md");
    assert.equal(notices.filter((n) => n.includes("an unsafe or empty folder")).length, 3);
    has("The connector \"Leaky again\" has the same \"id\" value as another connector");
    has("A connector in manifest.json has no \"id\" value");
    has("Left out 1 program file.");
    // The unknown sign-in is refused rather than written back as no sign-in.
    assert.equal(project.items[0].capabilities.some((c) => c.id === "action.vault"), false);
    assert.deepEqual(unrecognizedPaths(project), ["microsoft-package/declarativeAgent_0.json", "microsoft-package/manifest.json", "microsoft-package/outline.png", "microsoft-package/plugin-broken.json", "microsoft-package/plugin-vault.json", "microsoft-package/plugin-webspec.json", "microsoft-package/skills/real/SKILL.md"]);
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

  test("credential-like fields in unrelated web manifests do not block skill archives", async () => {
    const entries = [
      { name: "manifest.json", bytes: encode(JSON.stringify({ short_name: "Example", start_url: "/?token=EXAMPLE_WEB_TOKEN" })) },
      { name: "helper/SKILL.md", bytes: skillMd("helper", "Helps.") },
    ];
    const { project, format } = await openPackage(entries);
    assert.equal(format, "skillZip");
    assert.deepEqual(project.items.map((item) => item.skillName), ["helper"]);
    const { project: again } = await backupRoundTrip(project);
    assert.deepEqual(again.items.map((item) => item.skillName), ["helper"]);
  });

  test("a ZIP with two entries of the same name is refused before any part is read", async () => {
    const entries = mixedEntries();
    entries.push({ name: "skills/meeting-notes/SKILL.md", bytes: skillMd("meeting-notes", "A second copy.") });
    const result = await engine.imports.any("twice.zip", engine.zip.write(entries));
    assert.ok(result.error.includes("two files with the same name"));
  });
});
