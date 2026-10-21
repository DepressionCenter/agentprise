// This file is part of Agentprise
// tests/project.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-10-21
// Summary: Tests for the version 2 project model inside index.html: the backup
//          round trip, normalization of hostile input, the Agent Plugins
//          manifests, duplicate and merge, the stored record and payloads, and
//          imports of plugins and skill folders made elsewhere.
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
import { makePng, makeDeflatedZip, sampleAgent, agentFields, BYTE_SHAPES } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
// The name rule and top-level keys of the Agent Plugins 1.0.0 plugin schema, which is closed.
const PLUGIN_NAME = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const PLUGIN_KEYS = ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"];
const AUTHOR_KEYS = ["name", "email", "url"];
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Opens a written export through the importer the app uses for dropped files. */
async function reopen(written) {
  const result = await engine.imports.any(written.fileName, written.bytes);
  assert.equal(result.error, undefined, String(result.error));
  return result;
}

/** Every byte payload of a project as plain arrays, keyed by skill folder rather than item id, for comparing two projects. */
function payloadBytes(project) {
  const byId = new Map(project.items.map((item) => [item.id, item.skillName]));
  return engine.project.payloads(project).map((entry) => {
    const [head, ...rest] = entry.key.split("/");
    return [(byId.get(head) || head) + "/" + rest.join("/"), Array.from(entry.bytes)];
  });
}

/**
 * A project that uses every part of the model: an agent that uses a skill,
 * a skill with scripts and an OpenAPI file, a tool with a provider of every
 * kind, a remote and a local server, and files the app does not interpret.
 * All values are synthetic.
 */
function richRaw() {
  const agent = sampleAgent(engine);
  agent.copilot.appId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  return {
    name: "Lab Kit",
    description: "A kit for the lab.",
    version: "2.1.0",
    creator: { name: "Example Creator", organization: "Example Org", url: "https://example.org", privacy: "https://example.org/privacy", terms: "https://example.org/terms" },
    copyright: "Copyright (C) 2026 Example Creator",
    license: "GPL-3.0-or-later",
    servers: {
      remote: { label: "Remote search", transport: "http", url: "", userSupplied: true, auth: "oauth", tools: ["search", "fetch"] },
      local: { label: "Local helper", transport: "stdio", command: "npx", args: ["-y", "example-mcp-server"], auth: "none", tools: [] },
    },
    items: [
      {
        ...agent,
        kind: "agent",
        files: agent.files.map((file) => ({ path: "references/" + file.name, bytes: file.bytes })),
        uses: ["data-tools"],
        capabilities: [{ id: "web", label: "Web search", description: "Looks things up online.", required: false, fallback: "", providers: { copilot: [{ kind: "websearch", instructions: "", sites: ["https://example.org"] }], "*": [{ kind: "none" }] } }],
      },
      {
        kind: "skill",
        name: "Data Tools",
        description: "Works with data files.",
        body: "# Steps\nRun the script, then call the API.",
        compatibility: "Needs Python 3",
        license: "MIT",
        allowedTools: "Bash(python:*)",
        metadata: { team: "lab" },
        appId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        files: [
          { path: "scripts/run.py", bytes: encode("print('hello')\n") },
          { path: "openapi/api.yaml", bytes: encode("openapi: 3.0.0\ninfo:\n  title: Example\n") },
          { path: "references/guide.md", bytes: encode("# Guide\n") },
          { path: "photo.png", bytes: makePng(4, 4) },
        ],
        capabilities: [{
          id: "lookup", label: "Record lookup", description: "Finds a record.", required: true, fallback: "Ask the person for the record.",
          providers: {
            copilot: [{ kind: "connector", name: "Example connector", instructions: "Use the connector." }],
            claude: [{ kind: "mcp", server: "remote", tools: ["search", "fetch"], instructions: "Search first." }],
            cli: [{ kind: "mcp", server: "local", tools: [], instructions: "" }],
            chatgpt: [{ kind: "openapi", spec: "openapi/api.yaml", operations: ["getRecord"], auth: "apikey", instructions: "" }],
            gemini: [{ kind: "script", path: "scripts/run.py", runtime: "python3", instructions: "Run with Python." }],
            "*": [{ kind: "none" }],
          },
        }],
      },
    ],
    unrecognized: [{ path: "hooks/hooks.json", note: "Not interpreted by Agentprise.", bytes: encode("{\"hooks\":{}}") }],
  };
}

function richProject() {
  const result = engine.project.normalize(richRaw());
  assert.deepEqual(result.notices, []);
  return result.project;
}

describe("backup round trip", () => {
  test("a project exported to the backup and re-imported normalizes to an identical record", async () => {
    const project = richProject();
    const record = engine.project.record(project);
    // The setup covers every provider kind, both server transports, and kept files.
    const kinds = new Set(project.items.flatMap((item) => item.capabilities.flatMap((c) => Object.values(c.providers).flat().map((p) => p.kind))));
    assert.deepEqual([...kinds].sort(), [...engine.PROVIDER_KINDS].sort());
    assert.deepEqual(project.unrecognized.map((u) => u.path), ["hooks/hooks.json", "skills/data-tools/photo.png"]);
    const backup = await engine.exports.backup(project);
    assert.equal(backup.fileName, "lab-kit.agentprise.zip");
    assert.deepEqual(backup.report, []);
    assert.equal(engine.detectFormat(backup.fileName, backup.bytes), "plugin");
    const back = await reopen(backup);
    assert.equal(back.format, "plugin");
    assert.deepEqual(back.notices, ["The plugin has 1 hook, command, or agent file. Agentprise keeps it in the backup but never reads or runs it."]);
    assert.deepEqual(engine.project.record(back.project), record);
    assert.deepEqual(payloadBytes(back.project), payloadBytes(project));
    // A second trip changes nothing either.
    const twice = await reopen(await engine.exports.backup(back.project));
    assert.deepEqual(engine.project.record(twice.project), record);
  });

  test("the backup lays out one skill folder per item under a folder named after the project", async () => {
    const project = richProject();
    const { entries } = await engine.exports.backup(project);
    assert.deepEqual(entries.map((e) => e.name), [
      "lab-kit/plugin.json",
      "lab-kit/mcp.json",
      "lab-kit/LICENSE.txt",
      "lab-kit/README.md",
      "lab-kit/skills/caveman/SKILL.md",
      "lab-kit/skills/caveman/agentprise.json",
      "lab-kit/skills/caveman/icon.png",
      "lab-kit/skills/caveman/LICENSE.txt",
      "lab-kit/skills/caveman/references/notes.txt",
      "lab-kit/skills/data-tools/SKILL.md",
      "lab-kit/skills/data-tools/agentprise.json",
      "lab-kit/skills/data-tools/LICENSE.txt",
      "lab-kit/skills/data-tools/scripts/run.py",
      "lab-kit/skills/data-tools/openapi/api.yaml",
      "lab-kit/skills/data-tools/references/guide.md",
      "lab-kit/hooks/hooks.json",
      "lab-kit/skills/data-tools/photo.png",
    ]);
    const byName = new Map(entries.map((e) => [e.name, e.bytes]));
    // The project record in plugin.json carries no item bodies; those live in the folders.
    const extension = JSON.parse(decode(byName.get("lab-kit/plugin.json"))).extensions[engine.AGENTPRISE_EXTENSION_KEY];
    assert.deepEqual(extension.items, project.items.map((item) => ({ kind: item.kind, id: item.id, skillName: item.skillName })));
    assert.equal(extension.schemaVersion, engine.PROJECT_SCHEMA_VERSION);
    assert.deepEqual(extension.servers, engine.project.record(project).servers);
    assert.deepEqual(extension.unrecognized, [{ path: "hooks/hooks.json", note: "Not interpreted by Agentprise." }, { path: "skills/data-tools/photo.png", note: "Not interpreted by Agentprise." }]);
    // Agent metadata keeps only the kind; the rest is in agentprise.json.
    const { data } = engine.yaml.parseFrontmatter(decode(byName.get("lab-kit/skills/caveman/SKILL.md")));
    assert.deepEqual(data.metadata, { "agentprise-kind": "agent" });
    const sidecar = JSON.parse(decode(byName.get("lab-kit/skills/caveman/agentprise.json")));
    assert.deepEqual(sidecar.uses, ["data-tools"]);
    assert.equal(sidecar.capabilities[0].id, "web");
    const skillSidecar = JSON.parse(decode(byName.get("lab-kit/skills/data-tools/agentprise.json")));
    assert.deepEqual(skillSidecar.files, [{ path: "scripts/run.py", type: "py" }, { path: "openapi/api.yaml", type: "yaml" }, { path: "references/guide.md", type: "md" }]);
    assert.equal(skillSidecar.appId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    assert.equal(skillSidecar.license, "MIT");
    const readme = decode(byName.get("lab-kit/README.md"));
    assert.ok(readme.includes("skills/caveman/") && readme.includes("skills/data-tools/"));
  });

  test("an empty project and a project of one plain skill also round trip", async () => {
    for (const raw of [{ name: "Empty" }, { name: "Solo", items: [{ kind: "skill", name: "Solo", description: "d", body: "b" }] }]) {
      const { project } = engine.project.normalize(raw);
      const back = await reopen(await engine.exports.backup(project));
      assert.deepEqual(engine.project.record(back.project), engine.project.record(project));
    }
  });

  test("normalizing a normalized project changes nothing", () => {
    const project = richProject();
    const again = engine.project.normalize(project);
    assert.deepEqual(again.notices, []);
    assert.deepEqual(engine.project.record(again.project), engine.project.record(project));
  });
});

describe("normalizeProject with hostile input", () => {
  const ID = "11111111-1111-4111-8111-111111111111";

  function hostile() {
    return engine.project.normalize({
      id: "not-a-uuid",
      version: "v2",
      name: "Hostile",
      creator: { url: "http://example.org", privacy: "javascript:alert(1)" },
      servers: {
        plain: { transport: "http", url: "http://example.org/mcp" },
        secret: { transport: "http", url: "https://user:pass@example.org/mcp" },
        fragment: { transport: "http", url: "https://example.org/mcp#token" },
        bundled: { transport: "stdio", command: "./bin/server", args: [] },
        climbing: { transport: "stdio", command: "./bin/../../server" },
        cmd: { transport: "stdio", command: "rm -rf /", args: ["a", 5, { x: 1 }] },
        "Bad Name": { transport: "http", url: "https://example.org/mcp" },
      },
      items: [
        {
          kind: "skill", id: ID.toUpperCase(), name: "Same", description: "d", body: "b",
          files: [
            { path: "../escape.txt", bytes: encode("x") },
            { path: "..\\escape2.txt", bytes: encode("x") },
            { path: "ok/../../escape3.txt", bytes: encode("x") },
            { path: "/abs/file.txt", bytes: encode("x") },
            { path: "win\\dir.txt", bytes: encode("x") },
            { path: "ok/keep.txt", bytes: encode("x") },
            { path: "tool.exe", bytes: encode("hi") },
            { path: "fake.txt", bytes: BYTE_SHAPES.windows },
            { path: "a/b/c/d/e/f.txt", bytes: encode("too deep") },
            { path: "empty.txt", bytes: new Uint8Array(0) },
            { path: 42, bytes: encode("x") },
          ],
          capabilities: [
            {
              id: "c1",
              providers: {
                claude: [{ kind: "mcp", server: "missing" }, { kind: "mcp", server: "plain" }],
                chatgpt: [{ kind: "openapi", spec: "openapi/nope.yaml" }],
                gemini: [{ kind: "script", path: "scripts/nope.py" }],
                copilot: [{ kind: "connector", name: "" }],
                elsewhere: [{ kind: "none" }],
                "*": [{ kind: "teleport" }],
              },
            },
            { id: "bad id!" },
            { id: "c1" },
          ],
        },
        { kind: "skill", id: ID, name: "Same", description: "d", body: "b" },
        { kind: "agent", id: "x", name: "Agent", instructions: "i", uses: ["same", "same-2", "ghost", "BAD NAME"] },
      ],
      unrecognized: [
        { path: "bin/tool.exe", bytes: encode("x") },
        { path: "hooks/run.sh", bytes: BYTE_SHAPES.elf },
        { path: "../up.json", bytes: encode("{}") },
        { path: ".claude/settings.json", bytes: encode("{}") },
        { path: "no-bytes.json", bytes: "text" },
      ],
    });
  }

  test("ids that are not UUIDs are replaced and repeated item ids are made unique", () => {
    const { project } = hostile();
    assert.match(project.id, UUID);
    assert.notEqual(project.id, "not-a-uuid");
    const ids = project.items.map((item) => item.id);
    assert.equal(ids[0], ID, "a valid id is kept, in lower case");
    assert.notEqual(ids[1], ID, "a repeated id is replaced");
    assert.ok(ids.every((id) => UUID.test(id)));
    assert.equal(new Set(ids).size, ids.length);
  });

  test("items with the same name get numbered skill names", () => {
    const { project } = hostile();
    assert.deepEqual(project.items.map((item) => item.skillName), ["same", "same-2", "agent"]);
  });

  test("skills an agent uses must exist in the project", () => {
    const { project, notices } = hostile();
    assert.deepEqual(project.items[2].uses, ["same", "same-2"]);
    assert.ok(notices.includes("Agent used 1 skill that isn't in this project, so it was taken off its list."));
  });

  test("tool providers that name a missing server or file are dropped with a notice", () => {
    const { project, notices } = hostile();
    const capabilities = project.items[0].capabilities;
    assert.equal(capabilities.length, 1, "a capability without a usable id and a repeated id are dropped");
    assert.deepEqual(capabilities[0].providers, {
      claude: [{ kind: "mcp", instructions: "", server: "plain", tools: [] }],
      chatgpt: [],
      gemini: [],
      copilot: [],
      "*": [],
    });
    assert.ok(notices.some((n) => n.includes("names a server \"missing\"")));
    assert.ok(notices.some((n) => n.includes("needs the file openapi/nope.yaml")));
    assert.ok(notices.some((n) => n.includes("needs the file scripts/nope.py")));
    assert.ok(notices.some((n) => n.includes("\"teleport\"")));
    assert.ok(notices.includes("A tool declaration without a usable id was left out."));
  });

  test("unsafe, empty, and program files in a skill are refused", () => {
    const { project, notices } = hostile();
    const paths = project.items[0].files.map((file) => file.path);
    // A leading slash or a backslash is read as a separator, and the result stays inside the skill folder.
    assert.deepEqual(paths, ["abs/file.txt", "win/dir.txt", "ok/keep.txt"]);
    for (const path of paths) {
      assert.ok(!path.startsWith("/") && !path.includes("\\") && !path.split("/").includes(".."), path);
    }
    const refused = notices.find((n) => n.includes("files from a skill"));
    assert.ok(refused, "one notice lists the refused files");
    // The notice names the first five and counts the rest.
    assert.ok(refused.startsWith("Left out 8 files"), refused);
    for (const reason of ["../escape.txt (it has no usable name)", "ok/../../escape3.txt (it has no usable name)", "tool.exe (it is a program)", "fake.txt (it is a Windows program)", "and 3 more"]) {
      assert.ok(refused.includes(reason), reason);
    }
    const rest = engine.project.normalize({ items: [{ kind: "skill", name: "S", files: [{ path: "a/b/c/d/e/f.txt", bytes: encode("too deep") }, { path: "empty.txt", bytes: new Uint8Array(0) }, { path: 42, bytes: encode("x") }, { path: "x.txt", bytes: "not bytes" }] }] });
    assert.deepEqual(rest.project.items[0].files, []);
    assert.deepEqual(rest.notices, ["Left out 4 files from a skill: a/b/c/d/e/f.txt (it has no usable name), empty.txt (it is empty), a file (it has no usable name), x.txt (it has no usable name)."]);
  });

  test("unrecognized files keep safe paths and never hold programs", () => {
    const { project, notices } = hostile();
    assert.deepEqual(project.unrecognized.map((u) => u.path), [".claude/settings.json"]);
    assert.ok(notices.includes("Left out 2 program files. Agentprise never keeps or runs programs."));
  });

  test("server settings are checked: names, https addresses, and one-program commands", () => {
    const { project, notices } = hostile();
    assert.deepEqual(Object.keys(project.servers), ["plain", "secret", "fragment", "bundled", "climbing", "cmd"]);
    // An address must be https and may not carry a user name, password, or # part, since everyone who installs the export receives it.
    for (const name of ["plain", "secret", "fragment"]) {
      assert.equal(project.servers[name].url, "", name);
      assert.ok(notices.includes("The address of the tool server \"" + name + "\" was removed. It must start with https:// and hold no user name, password, or # part."), name);
    }
    // A command is one program name or a path inside the plugin, never one that climbs out of it.
    assert.equal(project.servers.bundled.command, "./bin/server");
    assert.equal(project.servers.climbing.command, "");
    assert.equal(project.servers.cmd.command, "");
    assert.deepEqual(project.servers.cmd.args, ["a"]);
    assert.ok(notices.includes("The command of the tool server \"cmd\" was removed because it was not one program name."));
    assert.ok(notices.includes("The command of the tool server \"climbing\" was removed because it was not one program name."));
    assert.ok(notices.some((n) => n.includes("\"Bad Name\" was left out")));
  });

  test("a version that is not semantic falls back to 1.0.0 with a notice, and bad creator links are removed", () => {
    const { project, notices } = hostile();
    assert.equal(project.version, "1.0.0");
    assert.ok(notices.includes("The version \"v2\" is not a version number like 1.0.0, so 1.0.0 was used."));
    assert.equal(project.creator.url, "");
    assert.equal(project.creator.privacy, "");
    assert.ok(notices.some((n) => n.includes("creator website link was removed")));
    assert.equal(engine.project.normalize({ version: "1.2.3-beta.1" }).project.version, "1.2.3-beta.1");
    assert.equal(engine.project.normalize({}).project.version, "1.0.0");
  });

  test("more items than the limit are capped with a notice", () => {
    const raw = { items: Array.from({ length: engine.LIMITS.items + 5 }, (_, n) => ({ kind: "skill", name: "Skill " + n, description: "d", body: "b" })) };
    const { project, notices } = engine.project.normalize(raw);
    assert.equal(project.items.length, engine.LIMITS.items);
    assert.ok(notices.includes("Only the first " + engine.LIMITS.items + " agents and skills were kept."));
  });

  test("input that is not a project at all becomes an empty project", () => {
    for (const value of [null, undefined, "text", 42, [], { items: "x", servers: [], unrecognized: {} }]) {
      const { project } = engine.project.normalize(value);
      assert.match(project.id, UUID);
      assert.deepEqual(project.items, []);
      assert.deepEqual(project.servers, {});
      assert.deepEqual(project.unrecognized, []);
      assert.equal(project.schemaVersion, engine.PROJECT_SCHEMA_VERSION);
    }
  });

  test("an archive with an unsafe entry name is refused before anything is read", async () => {
    for (const name of ["../evil/SKILL.md", "/abs/SKILL.md", "dir\\SKILL.md", "C:/x/SKILL.md"]) {
      const bytes = makeDeflatedZip([{ name: name, bytes: encode("---\nname: x\ndescription: d\n---\nbody") }]);
      const result = await engine.imports.any("evil.zip", bytes);
      assert.ok(result.error, name + " must be refused");
      assert.equal(result.project, undefined);
    }
  });
});

describe("Agent Plugins manifests in the backup", () => {
  test("plugin.json keeps to the closed Agent Plugins 1.0.0 schema", async () => {
    const names = ["Lab Kit", "Caf\u00e9 -- Lab..Kit", "", "123", "---", "A".repeat(200)];
    for (const name of names) {
      const project = richProject();
      project.name = name;
      const { entries } = await engine.exports.backup(project);
      const manifest = JSON.parse(decode(entries.find((e) => e.name.endsWith("/plugin.json")).bytes));
      assert.equal(manifest.$schema, PLUGIN_SCHEMA);
      assert.equal(typeof manifest.name, "string");
      assert.match(manifest.name, PLUGIN_NAME, JSON.stringify(name));
      assert.ok(entries[0].name.startsWith(manifest.name + "/"), "the backup folder is named after the plugin");
      assert.deepEqual(Object.keys(manifest).filter((key) => !PLUGIN_KEYS.includes(key)), []);
      assert.deepEqual(Object.keys(manifest.author).filter((key) => !AUTHOR_KEYS.includes(key)), []);
      assert.ok(Object.values(manifest.author).every((value) => typeof value === "string"));
      assert.ok(isPlainObject(manifest.extensions));
      assert.ok(Object.values(manifest.extensions).every(isPlainObject));
      assert.ok(isPlainObject(manifest.extensions[engine.AGENTPRISE_EXTENSION_KEY]));
      assert.equal(manifest.version, "2.1.0");
      assert.equal(manifest.license, "GPL-3.0-or-later");
    }
  });

  test("a project without a creator name writes no author", async () => {
    const { project } = engine.project.normalize({ name: "Anon", items: [{ kind: "skill", name: "S", description: "d", body: "b" }] });
    const { entries } = await engine.exports.backup(project);
    const manifest = JSON.parse(decode(entries[0].bytes));
    assert.equal("author" in manifest, false);
    assert.equal(entries.some((e) => e.name.endsWith("/mcp.json")), false, "no servers means no mcp.json");
  });

  test("mcp.json names its schema and gives every server a transport type", async () => {
    const project = richProject();
    project.servers.blank = { label: "No command", transport: "stdio", url: "", userSupplied: false, auth: "none", tools: [], command: "", args: [] };
    project.servers.fixed = { label: "Fixed", transport: "http", url: "https://mcp.example.org/v1", userSupplied: false, auth: "none", tools: [] };
    const { entries } = await engine.exports.backup(project);
    const mcp = JSON.parse(decode(entries.find((e) => e.name.endsWith("/mcp.json")).bytes));
    assert.equal(mcp.$schema, MCP_SCHEMA);
    assert.ok(isPlainObject(mcp.mcpServers));
    for (const [name, server] of Object.entries(mcp.mcpServers)) {
      assert.ok(["stdio", "streamable-http"].includes(server.type), name);
      if (server.type === "stdio") {
        assert.ok(typeof server.command === "string" && server.command.length > 0, name);
        assert.ok(Array.isArray(server.args), name);
      } else {
        assert.match(server.url, /^https:\/\//, name);
      }
    }
    // A local server with no command cannot start, so it is left out; an address the installer supplies is a placeholder.
    assert.deepEqual(Object.keys(mcp.mcpServers), ["remote", "local", "fixed"]);
    assert.equal(mcp.mcpServers.remote.url, "https://example.com/replace-with-your-mcp-server-address");
    assert.equal(mcp.mcpServers.fixed.url, "https://mcp.example.org/v1");
    assert.deepEqual(mcp.mcpServers.local, { type: "stdio", command: "npx", args: ["-y", "example-mcp-server"] });
  });
});

describe("duplicate and merge", () => {
  test("duplicateProject gives a new id and name, clears Copilot app ids, and keeps the content", () => {
    const project = richProject();
    const copy = engine.project.duplicate(project, "Lab Kit copy");
    assert.notEqual(copy.id, project.id);
    assert.match(copy.id, UUID);
    assert.equal(copy.name, "Lab Kit copy");
    assert.equal(copy.items[0].copilot.appId, "");
    assert.equal(copy.items[1].appId, "");
    // The original keeps its app ids.
    assert.equal(project.items[0].copilot.appId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    assert.equal(project.items[1].appId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    const strip = (record) => {
      const copyRecord = JSON.parse(JSON.stringify(record));
      delete copyRecord.id;
      delete copyRecord.name;
      delete copyRecord.created;
      delete copyRecord.modified;
      copyRecord.items[0].copilot.appId = "";
      copyRecord.items[1].appId = "";
      return copyRecord;
    };
    assert.deepEqual(strip(engine.project.record(copy)), strip(engine.project.record(project)));
    assert.deepEqual(payloadBytes(copy), payloadBytes(project));
    // Changing the copy leaves the original alone.
    copy.items[0].starters.push("A new starter");
    assert.equal(project.items[0].starters.length, 3);
  });

  test("mergeProjects renames clashing skills and servers and the links that name them", () => {
    const target = engine.project.normalize({
      name: "Target",
      servers: { docs: { transport: "http", url: "https://a.example.org/mcp" }, same: { transport: "http", url: "https://same.example.org/mcp" } },
      items: [{ kind: "skill", name: "Lookup", description: "d", body: "b" }, { kind: "agent", name: "Helper", instructions: "i" }],
    }).project;
    const source = engine.project.normalize({
      name: "Source",
      servers: { docs: { transport: "http", url: "https://b.example.org/mcp" }, same: { transport: "http", url: "https://same.example.org/mcp" }, extra: { transport: "http", url: "https://c.example.org/mcp" } },
      items: [
        { kind: "skill", name: "Lookup", description: "d2", body: "b2", capabilities: [{ id: "c", providers: { claude: [{ kind: "mcp", server: "docs" }, { kind: "mcp", server: "same" }, { kind: "mcp", server: "extra" }] } }] },
        { kind: "agent", name: "Helper", instructions: "i2", uses: ["lookup"] },
      ],
      unrecognized: [{ path: "hooks/hooks.json", bytes: encode("{}") }],
    }).project;
    const { project, notices, added } = engine.project.merge(target, source);
    assert.deepEqual(notices, []);
    assert.equal(project.id, target.id);
    assert.equal(project.name, "Target");
    assert.deepEqual(project.items.map((item) => item.skillName), ["lookup", "helper", "lookup-2", "helper-2"]);
    // The added items get new ids, which merge returns.
    assert.equal(added.length, 2);
    assert.deepEqual(added, [project.items[2].id, project.items[3].id]);
    assert.ok(added.every((id) => UUID.test(id) && !source.items.some((item) => item.id === id)));
    // The added agent follows its skill's new name.
    assert.deepEqual(project.items[3].uses, ["lookup-2"]);
    assert.deepEqual(project.items[1].uses, []);
    // A clashing server gets a number; an identical one is shared; tools follow the rename.
    assert.deepEqual(Object.keys(project.servers), ["docs", "same", "docs-2", "extra"]);
    assert.equal(project.servers.docs.url, "https://a.example.org/mcp");
    assert.equal(project.servers["docs-2"].url, "https://b.example.org/mcp");
    assert.deepEqual(project.items[2].capabilities[0].providers.claude.map((p) => p.server), ["docs-2", "same", "extra"]);
    assert.deepEqual(project.unrecognized.map((u) => u.path), ["hooks/hooks.json"]);
    // Neither input changes.
    assert.equal(target.items.length, 2);
    assert.deepEqual(source.items[0].capabilities[0].providers.claude.map((p) => p.server), ["docs", "same", "extra"]);
    assert.deepEqual(source.items[1].uses, ["lookup"]);
  });

  test("merging past the item limit reports only the items that were kept", () => {
    const many = (prefix, count) => engine.project.normalize({ items: Array.from({ length: count }, (_, n) => ({ kind: "skill", name: prefix + n, description: "d", body: "b" })) }).project;
    const { project, added, notices } = engine.project.merge(many("a", engine.LIMITS.items - 1), many("b", 3));
    assert.equal(project.items.length, engine.LIMITS.items);
    assert.equal(added.length, 1);
    assert.ok(notices.some((n) => n.includes("Only the first")));
  });
});

describe("stored record and payloads", () => {
  test("projectFromRecord rebuilds the project from its record and payloads", () => {
    const project = richProject();
    const record = engine.project.record(project);
    // The record is plain JSON, as IndexedDB and change detection need.
    assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
    const store = new Map(engine.project.payloads(project).map((entry) => [entry.key, entry.bytes]));
    const agentId = project.items[0].id;
    const skillId = project.items[1].id;
    assert.deepEqual([...store.keys()], [
      agentId + "/icon.png",
      agentId + "/references/notes.txt",
      skillId + "/scripts/run.py",
      skillId + "/openapi/api.yaml",
      skillId + "/references/guide.md",
      "_/hooks/hooks.json",
      "_/skills/data-tools/photo.png",
    ]);
    const back = engine.project.fromRecord(JSON.parse(JSON.stringify(record)), store);
    assert.deepEqual(back.notices, []);
    assert.deepEqual(engine.project.record(back.project), record);
    assert.deepEqual(payloadBytes(back.project), payloadBytes(project));
  });

  test("a missing payload produces a notice and leaves that file out", () => {
    const project = richProject();
    const record = engine.project.record(project);
    const store = new Map(engine.project.payloads(project).map((entry) => [entry.key, entry.bytes]));
    store.delete(project.items[1].id + "/references/guide.md");
    store.delete(project.items[0].id + "/icon.png");
    const back = engine.project.fromRecord(record, store);
    assert.deepEqual(back.notices, ["Couldn't find 2 saved files in this browser: icon.png, references/guide.md."]);
    assert.equal(back.project.items[0].icon, null);
    assert.deepEqual(back.project.items[1].files.map((f) => f.path), ["scripts/run.py", "openapi/api.yaml"]);
  });

  test("a damaged record is normalized like any untrusted input", () => {
    const back = engine.project.fromRecord({ items: [{ kind: "skill", id: "x", name: "S", files: [{ path: "../x.txt" }] }], unrecognized: "nope" }, new Map());
    assert.equal(back.project.items.length, 1);
    assert.match(back.project.items[0].id, UUID);
    assert.deepEqual(back.project.items[0].files, []);
    assert.equal(engine.project.fromRecord(null, new Map()).project.items.length, 0);
  });
});

describe("imports of plugins and skills made elsewhere", () => {
  for (const flavor of ["agent-plugins", "claude", "codex"]) {
    test(flavor + " plugin preserves skill servers and renames conflicting plugin servers", async () => {
      const own = { transport: "http", url: "https://skill.example.org/mcp" };
      const source = engine.project.normalize({
        name: "Example", servers: { remote: own, shared: own },
        items: [{ kind: "skill", name: "Lookup", description: "Looks up records.", body: "Look up records.",
          capabilities: [{ id: "lookup", providers: { "*": [{ kind: "mcp", server: "remote" }, { kind: "mcp", server: "shared" }] } }] }],
      }).project;
      const skill = await engine.exports.skillZip(source, source.items[0], "claude");
      const manifestPath = flavor === "agent-plugins" ? "plugin.json" : "." + flavor + "-plugin/plugin.json";
      const mcpPath = flavor === "agent-plugins" ? "mcp.json" : ".mcp.json";
      const bytes = engine.zip.write([
        { name: manifestPath, bytes: encode(JSON.stringify({ name: "example", license: "MIT", ...(flavor === "agent-plugins" ? { $schema: PLUGIN_SCHEMA } : {}) })) },
        { name: mcpPath, bytes: encode(JSON.stringify({ mcpServers: {
          remote: { type: "http", url: "https://plugin.example.org/mcp" },
          "remote-2": { type: "http", url: "https://second.example.org/mcp" },
          shared: { type: "http", url: own.url },
        } })) },
        ...skill.entries.map((entry) => ({ name: "skills/" + entry.name, bytes: entry.bytes })),
      ]);
      const { project, error } = await engine.imports.any("example.zip", bytes);
      assert.equal(error, undefined);
      assert.equal(project.servers.remote.url, own.url);
      assert.equal(project.servers["remote-2"].url, "https://second.example.org/mcp");
      assert.equal(project.servers["remote-3"].url, "https://plugin.example.org/mcp");
      assert.equal(Object.keys(project.servers).length, 4, "identical server definitions are shared");
      assert.deepEqual(project.items[0].capabilities[0].providers["*"].map((provider) => provider.server), ["remote", "shared"]);
      const again = await reopen(await engine.exports.backup(project));
      assert.deepEqual(again.project.servers, project.servers);
      assert.deepEqual(again.project.items[0].capabilities, project.items[0].capabilities);
    });
  }

  const skillMd = "---\nname: lookup\ndescription: Looks things up.\n---\n\nSearch first.\n";

  test("a Claude plugin: servers from .mcp.json, skills as items, hooks kept with a notice", async () => {
    const bytes = makeDeflatedZip([
      { name: "my-plugin/.claude-plugin/plugin.json", bytes: encode(JSON.stringify({ name: "my-plugin", version: "0.3.0", description: "A Claude plugin", author: { name: "Someone", url: "https://example.org" }, license: "MIT" })) },
      { name: "my-plugin/.mcp.json", bytes: encode(JSON.stringify({ mcpServers: { "Docs Server": { type: "http", url: "https://example.org/mcp" }, local: { command: "uvx", args: ["example-tool"] } } })) },
      { name: "my-plugin/skills/lookup/SKILL.md", bytes: encode(skillMd) },
      { name: "my-plugin/hooks/hooks.json", bytes: encode("{\"hooks\":{}}") },
    ]);
    assert.equal(engine.detectFormat("my-plugin.zip", bytes), "plugin");
    const { project, notices, format } = await engine.imports.any("my-plugin.zip", bytes);
    assert.equal(format, "plugin");
    assert.equal(project.name, "My Plugin");
    assert.equal(project.description, "A Claude plugin");
    assert.equal(project.version, "0.3.0");
    assert.equal(project.license, "MIT");
    assert.deepEqual([project.creator.name, project.creator.url], ["Someone", "https://example.org"]);
    assert.deepEqual(project.servers, {
      "docs-server": { label: "Docs Server", transport: "http", url: "https://example.org/mcp", userSupplied: false, auth: "none", tools: [] },
      local: { label: "local", transport: "stdio", url: "", userSupplied: false, auth: "none", tools: [], command: "uvx", args: ["example-tool"] },
    });
    assert.deepEqual(project.items.map((i) => [i.kind, i.skillName, i.body]), [["skill", "lookup", "Search first."]]);
    assert.deepEqual(project.unrecognized.map((u) => [u.path, u.note]), [["hooks/hooks.json", "Not interpreted by Agentprise."]]);
    assert.ok(notices.some((n) => n.includes("hook, command, or agent file")));
    assert.ok(notices.some((n) => n.includes("never runs it")));
    // The kept hook goes back into the backup under its own path.
    const backup = await engine.exports.backup(project);
    assert.ok(backup.entries.some((e) => e.name === "my-plugin/hooks/hooks.json"));
  });

  test("a Codex plugin finds its skills through the skills path in its manifest", async () => {
    const bytes = makeDeflatedZip([
      { name: ".codex-plugin/plugin.json", bytes: encode(JSON.stringify({ name: "codex-kit", version: "1.2.3", description: "Codex", skills: "./skills/" })) },
      { name: "skills/lookup/SKILL.md", bytes: encode(skillMd) },
    ]);
    const { project, notices, format } = await engine.imports.any("codex-kit.zip", bytes);
    assert.equal(format, "plugin");
    // The manifest names no license, so the project says so instead of assuming one.
    assert.deepEqual(notices, ["The plugin doesn't say which license it uses. Check with its author before you share it."]);
    assert.equal(project.license, "Not stated");
    assert.equal(project.name, "Codex Kit");
    assert.equal(project.version, "1.2.3");
    assert.deepEqual(project.items.map((i) => [i.kind, i.skillName]), [["skill", "lookup"]]);
  });

  test("a Codex plugin whose skills path is not the default still finds its skills", async () => {
    const bytes = makeDeflatedZip([
      { name: ".codex-plugin/plugin.json", bytes: encode(JSON.stringify({ name: "codex-kit", version: "1.2.3", description: "Codex", license: "MIT", skills: "./tools/" })) },
      { name: "tools/lookup/SKILL.md", bytes: encode(skillMd) },
    ]);
    const { project, notices } = await engine.imports.any("codex-kit.zip", bytes);
    assert.deepEqual(project.items.map((i) => [i.kind, i.skillName]), [["skill", "lookup"]]);
    assert.deepEqual(notices, []);
  });

  test("a generic Agent Plugins plugin without the Agentprise extension", async () => {
    const bytes = makeDeflatedZip([
      { name: "plugin.json", bytes: encode(JSON.stringify({ $schema: PLUGIN_SCHEMA, name: "generic-kit", version: "1.0.0", description: "Generic", author: { name: "Example Author" }, license: "Apache-2.0" })) },
      { name: "mcp.json", bytes: encode(JSON.stringify({ $schema: MCP_SCHEMA, mcpServers: { search: { type: "streamable-http", url: "https://example.com/replace-with-your-mcp-server-address" } } })) },
      { name: "skills/lookup/SKILL.md", bytes: encode(skillMd) },
      { name: "README.md", bytes: encode("# The author's own readme\n") },
    ]);
    const { project, notices, format } = await engine.imports.any("generic-kit.zip", bytes);
    assert.equal(format, "plugin");
    assert.deepEqual(notices, []);
    assert.equal(project.name, "Generic Kit");
    assert.equal(project.license, "Apache-2.0");
    assert.equal(project.creator.name, "Example Author");
    // The placeholder address means the installer supplies it.
    assert.deepEqual(project.servers, { search: { label: "search", transport: "http", url: "", userSupplied: true, auth: "none", tools: [] } });
    assert.deepEqual(project.items.map((i) => i.skillName), ["lookup"]);
    // In a plugin made elsewhere, root files are the author's own and are kept.
    assert.deepEqual(project.unrecognized.map((u) => u.path), ["README.md"]);
  });

  test("a plugin with no skills opens as an empty project with a notice, and a bad manifest is refused", async () => {
    const empty = makeDeflatedZip([{ name: "plugin.json", bytes: encode(JSON.stringify({ name: "empty", version: "1.0.0" })) }]);
    const opened = await engine.imports.any("empty.zip", empty);
    assert.deepEqual(opened.project.items, []);
    assert.ok(opened.notices.some((n) => n.includes("no skills")));
    // A manifest that is not JSON does not stop the skills from opening; the file is kept as it was.
    const broken = makeDeflatedZip([{ name: "plugin.json", bytes: encode("{not json") }, { name: "skills/x/SKILL.md", bytes: encode(skillMd) }]);
    const fallback = await engine.imports.any("broken.zip", broken);
    assert.equal(fallback.error, undefined);
    assert.deepEqual(fallback.project.items.map((i) => i.skillName), ["lookup"]);
    assert.deepEqual(fallback.project.unrecognized.map((u) => u.path), ["plugin.json"]);
    const nothing = makeDeflatedZip([{ name: "plugin.json", bytes: encode("{not json") }]);
    assert.ok((await engine.imports.any("nothing.zip", nothing)).error);
  });

  test("a version 1 bundle imports as a skill, since the app reads no version 1 fields", async () => {
    const v1 = "---\nname: caveman\ndescription: Me agent.\nlicense: GPL-3.0-or-later. See LICENSE.txt.\nmetadata:\n  agentprise-version: \"1\"\n  display-name: Caveman\n  welcome: Hi\n  starters: |-\n    One\n    Two\n  copilot-web-search: \"true\"\n  creator-name: Example Creator\n---\n\nTalk like a caveman.\n";
    const bytes = makeDeflatedZip([
      { name: "caveman/SKILL.md", bytes: encode(v1) },
      { name: "caveman/icon.png", bytes: makePng(192, 192) },
      { name: "caveman/references/notes.txt", bytes: encode("notes") },
    ]);
    assert.equal(engine.detectFormat("caveman.zip", bytes), "skillZip");
    const { project, notices } = await engine.imports.any("caveman.zip", bytes);
    assert.deepEqual(notices, []);
    assert.equal(project.items.length, 1);
    const item = project.items[0];
    assert.equal(item.kind, "skill");
    assert.equal(item.name, "Caveman");
    assert.equal(item.body, "Talk like a caveman.");
    assert.equal("starters" in item, false);
    assert.equal("welcome" in item, false);
    assert.equal(project.creator.name, "Example Creator");
    // Keys this app writes itself are never kept as skill metadata.
    assert.ok(Object.keys(item.metadata).every((key) => !/^(agentprise|copilot|sharepoint|creator)-/.test(key)));
    assert.deepEqual(item.files.map((f) => f.path), ["references/notes.txt"]);
    assert.deepEqual(project.unrecognized.map((u) => u.path), ["skills/caveman/assets/icon.png"]);
  });
});

describe("skill ZIP of an agent", () => {
  test("re-importing restores the agent kind, starters, welcome, icon, and Copilot settings", async () => {
    const agent = sampleAgent(engine);
    agent.copilot.appId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const project = engine.project.fromAgent(agent).project;
    const back = await reopen(await engine.exports.skillZip(project, project.items[0], "claude"));
    assert.equal(back.format, "skillZip");
    assert.deepEqual(back.notices, []);
    const item = back.project.items[0];
    assert.equal(item.kind, "agent");
    assert.equal(item.id, project.items[0].id);
    assert.deepEqual(item.starters, agent.starters);
    assert.equal(item.welcome, agent.welcome);
    assert.deepEqual(Array.from(item.icon.bytes), Array.from(agent.icon.bytes));
    assert.deepEqual(item.copilot, agent.copilot);
    assert.deepEqual(engine.project.record(back.project).items, engine.project.record(project).items);
    assert.deepEqual(agentFields(engine.project.agentView(back.project, item)), agentFields(agent));
  });

  test("an agent that uses skills keeps its list, and its tools come back", async () => {
    const project = richProject();
    const back = await reopen(await engine.exports.skillZip(project, project.items[0], "claude"));
    // The skill ZIP holds only the agent, so the skills it named are not in the opened project.
    assert.deepEqual(back.project.items[0].uses, []);
    assert.ok(back.notices.some((n) => n.includes("in this project, so")));
    assert.deepEqual(back.project.items[0].capabilities, project.items[0].capabilities);
  });

  test("the conversion report is not repeated in the README across round trips", async () => {
    const countReports = (text) => text.split("## What changed in this export").length - 1;
    const readmeOf = (written) => decode(written.entries.find((e) => e.name.endsWith("/README.md")).bytes);
    const agentProject = engine.project.fromAgent(sampleAgent(engine)).project;
    const { project: skillProject } = engine.project.normalize({ items: [{ kind: "skill", name: "Notes", description: "d", body: "b", files: [{ path: "README.md", bytes: encode("# Notes\n\nMy own readme.\n") }] }] });
    for (const start of [agentProject, skillProject]) {
      let written = await engine.exports.skillZip(start, start.items[0], "claude");
      for (let round = 0; round < 3; round++) {
        assert.equal(countReports(readmeOf(written)), 1);
        const back = await reopen(written);
        written = await engine.exports.skillZip(back.project, back.project.items[0], "claude");
      }
      assert.equal(countReports(readmeOf(written)), 1);
    }
    // A skill's own README keeps its text, with the report after it.
    const own = readmeOf(await engine.exports.skillZip(skillProject, skillProject.items[0], "claude"));
    assert.ok(own.startsWith("# Notes\n\nMy own readme.\n\n## What changed in this export\n"));
  });
});

describe("format detection reads entry names, not contents", () => {
  test("a skill ZIP whose SKILL.md mentions plugin.json is still a skill ZIP", async () => {
    const text = "---\nname: x\ndescription: Mentions plugin.json.\n---\n\nRead plugin.json and .claude-plugin/plugin.json for details.\n";
    for (const bytes of [engine.zip.write([{ name: "x/SKILL.md", bytes: encode(text) }]), makeDeflatedZip([{ name: "x/SKILL.md", bytes: encode(text) }])]) {
      assert.equal(engine.detectFormat("x.zip", bytes), "skillZip");
      const opened = await engine.imports.any("x.zip", bytes);
      assert.equal(opened.format, "skillZip");
      assert.equal(opened.project.items[0].skillName, "x");
    }
    const fileNamed = engine.zip.write([{ name: "x/SKILL.md", bytes: encode(text) }, { name: "x/references/my-plugin.json.txt", bytes: encode("plugin.json") }]);
    assert.equal(engine.detectFormat("x.zip", fileNamed), "skillZip");
  });

  test("a skill ZIP that carries a reference file named plugin.json still opens as a skill", async () => {
    const bytes = engine.zip.write([
      { name: "x/SKILL.md", bytes: encode("---\nname: x\ndescription: d\n---\nbody") },
      { name: "x/references/plugin.json", bytes: encode("{}") },
    ]);
    const opened = await engine.imports.any("x.zip", bytes);
    assert.equal(opened.error, undefined);
    assert.equal(opened.project.items[0].skillName, "x");
    assert.deepEqual(opened.project.items[0].files.map((f) => f.path), ["references/plugin.json"]);
  });
});

describe("products an item is not for", () => {
  test("only known product keys are kept, once each, in a fixed order, and the reason is capped", () => {
    const { project, notices } = engine.project.normalize({
      items: [{ kind: "skill", name: "Marked", notFor: ["gemini", "copilot", "gemini", "kimi", 7, "*", "__proto__"], notForReason: "x".repeat(300) }],
    });
    const item = project.items[0];
    assert.deepEqual(item.notFor, ["copilot", "gemini"]);
    assert.equal(item.notForReason.length, 200);
    assert.ok(notices.some((notice) => notice.includes("longer than 200 characters")));
  });

  test("a value that is not a list, or no value, means every product", () => {
    for (const notFor of [undefined, "copilot", { copilot: true }, null]) {
      const { project, notices } = engine.project.normalize({ items: [{ kind: "agent", name: "A", description: "d", instructions: "i", notFor }] });
      assert.deepEqual(project.items[0].notFor, []);
      assert.equal(project.items[0].notForReason, "");
      assert.deepEqual(notices, []);
    }
  });

  test("the backup keeps the setting for every item", async () => {
    const project = richProject();
    project.items[0].notFor = ["chatgpt"];
    project.items[0].notForReason = "Needs Copilot sources";
    project.items[1].notFor = ["copilot", "cli"];
    const record = engine.project.record(project);
    const back = await reopen(await engine.exports.backup(project));
    assert.deepEqual(engine.project.record(back.project).items, record.items);
    assert.deepEqual(back.project.items[1].notFor, ["copilot", "cli"]);
  });
});

describe("project helpers", () => {
  test("agentView, usedSkills, findItem, validateItem, slug, and uniqueSkillName", () => {
    const project = richProject();
    const [agent, skill] = project.items;
    assert.deepEqual(engine.project.usedSkills(project, agent), [skill]);
    assert.deepEqual(engine.project.usedSkills(project, skill), []);
    assert.equal(engine.project.findItem(project, skill.id), skill);
    assert.equal(engine.project.findItem(project, "missing"), null);
    // A skill seen as an agent: its body is the instructions, its own license applies, and only references/ files attach.
    const view = engine.project.agentView(project, skill);
    assert.equal(view.instructions, skill.body);
    assert.equal(view.license, "MIT");
    assert.deepEqual(view.files.map((f) => f.name), ["guide.md"]);
    assert.equal(view.copilot.appId, skill.appId);
    assert.equal(view.creator.website, "https://example.org");
    view.starters.push("x");
    view.copilot.webSearch = false;
    assert.equal(engine.project.agentView(project, agent).copilot.webSearch, true, "the view is a copy");
    assert.deepEqual(engine.project.validateItem(project, skill), { problems: [], warnings: [] });
    assert.deepEqual(engine.project.validateItem(project, engine.project.createItem("skill")).problems.map((p) => p.field), ["name", "description", "instructions"]);
    assert.equal(engine.project.slug(project), "lab-kit");
    assert.equal(engine.project.slug(engine.project.create()), "project");
    assert.equal(engine.project.uniqueSkillName("a", { a: true, "a-2": true }), "a-3");
    const long = "x".repeat(engine.LIMITS.skillName);
    const numbered = engine.project.uniqueSkillName(long, { [long]: true });
    assert.equal(numbered.length, engine.LIMITS.skillName);
    assert.ok(numbered.endsWith("-2"));
  });

  test("the item writers for Microsoft and copy text read a skill as an agent", () => {
    const project = richProject();
    const skill = project.items[1];
    const ms = engine.exports.msAgent(project, skill);
    assert.equal(ms.fileName, "Data Tools.agent");
    // The skill's steps come first, then the tools section composed for Copilot.
    const instructions = JSON.parse(ms.text).customCopilotConfig.gptDefinition.instructions;
    assert.equal(instructions, engine.tools.composeInstructions(project, skill, "msAgent"));
    assert.ok(instructions.startsWith(skill.body + "\n\n## " + engine.tools.TOOLS_HEADING + "\n"));
    assert.ok(instructions.endsWith(engine.tools.COMPLETION_RULE));
    assert.deepEqual(ms.report.map((e) => [e.component, e.status]), [["Data Tools", "transformed"], ["Record lookup", "requires-setup"], ["Attached files", "unsupported"]]);
    const copy = engine.exports.copyText(project, skill, "chatgpt");
    assert.ok(copy.markdown.startsWith("# Data Tools\n"));
    assert.equal(copy.instructions, engine.tools.composeInstructions(project, skill, "chatgpt"));
    assert.ok(Array.isArray(copy.report));
  });

  test("a new project and new items start from documented defaults", () => {
    const project = engine.project.create();
    assert.equal(project.schemaVersion, engine.PROJECT_SCHEMA_VERSION);
    assert.equal(project.version, "1.0.0");
    assert.equal(project.license, engine.DEFAULT_LICENSE);
    assert.equal(project.created, project.modified);
    const agent = engine.project.createItem("agent");
    const skill = engine.project.createItem("skill");
    assert.equal(agent.kind, "agent");
    assert.equal(skill.kind, "skill");
    assert.notEqual(agent.id, skill.id);
    assert.deepEqual(agent.copilot, engine.createAgent().copilot);
    assert.deepEqual([agent.uses, agent.capabilities, agent.files, skill.capabilities, skill.files], [[], [], [], [], []]);
  });
});
