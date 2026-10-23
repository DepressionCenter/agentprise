// This file is part of Agentprise
// tests/microsoft-exports.test.mjs
// Author(s): First Last.
// Created: 2026-10-22
// Last Modified: 2026-10-22
// Summary: Checks native Microsoft skill packages, connectors, restrictions,
//          resource bytes, schema versions, and preservation of the source.
// Notes: See README file for documentation and full license information.
//
// Copyright © 2026 The Regents of the University of Michigan
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program. If not, see <https://www.gnu.org/licenses/>.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./load-engine.mjs";
import { goldenRaw, teamsIcons } from "./tools-fixture.mjs";
import { loadSchema, validate, describeErrors } from "./schema-validator.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const text = (entry) => new TextDecoder().decode(entry);
const json = (entries, name) => JSON.parse(text(entries.get(name)));
const build = (raw = goldenRaw()) => engine.project.normalize(raw).project;
const write = (project, profile, item = project.items[0]) => engine.exports.microsoftPackage(project, item, teamsIcons(), profile);
const report = (project, profile = "copilotSkills") => engine.tools.conversionReport(project, project.items[0], profile);
const blocks = (project, pattern, profile = "copilotSkills") => assert.ok(report(project, profile).some((entry) => entry.status === "blocked" && pattern.test(entry.note)), JSON.stringify(report(project, profile)));
const schema = (document, file) => assert.deepEqual(validate(loadSchema(file), document), [], describeErrors(validate(loadSchema(file), document)));

/** A resource-only synthetic skill for package and boundary tests. */
function simpleRaw() {
  const raw = goldenRaw();
  raw.servers = {};
  raw.items[1].capabilities = [];
  raw.items[1].files = [{ path: "references/check.txt", bytes: encode("The fictional sample's marker is COPPER-FINCH.\n") }];
  raw.items[1].body = "When asked for the sample marker, read references/check.txt and quote its marker. Do not invent a marker.";
  return raw;
}

describe("Microsoft native exports", () => {
  test("native assistants reference skills and keep actions, resources, and source restrictions", async () => {
    const project = build();
    const before = structuredClone(project);
    const result = await write(project, "copilotSkills");
    const entries = await engine.zip.read(result.bytes);
    const manifest = json(entries, "manifest.json");
    const agent = json(entries, "declarativeAgent_0.json");
    schema(manifest, "teams/manifest-v1.28.schema.json");
    schema(agent, "copilot/declarative-agent-v1.9.schema.json");
    assert.equal(agent.version, "v1.9");
    assert.equal(agent.$schema, "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.9/schema.json");
    assert.equal(manifest.manifestVersion, "1.28");
    assert.deepEqual(agent.agent_skills, [{ folder: "skills/record-finder" }]);
    assert.equal(agent.actions.length, 3);
    assert.ok(!agent.instructions.includes("## Skill: Record Finder"));
    const skill = text(entries.get("skills/record-finder/SKILL.md"));
    assert.match(skill, /Find and read records/);
    assert.ok(!skill.includes("script scripts/lookup.py"));
    assert.ok(!entries.has("skills/record-finder/scripts/lookup.py"));
    assert.deepEqual(entries.get("skills/record-finder/references/guide.md"), before.items[1].files.find((file) => file.path === "references/guide.md").bytes);
    assert.deepEqual(agent.capabilities.find((entry) => entry.name === "WebSearch").sites, [{ url: "https://records.example.org" }]);
    for (const action of agent.actions) schema(json(entries, action.file), "copilot/plugin-v2.4.schema.json");
    assert.deepEqual(project, before);
    assert.ok(result.report.some((entry) => entry.status === "requires-setup" && /Frontier/.test(entry.note)));
    assert.ok(!entries.has("SETUP.md"));
    assert.match(result.setup, /Install in Microsoft 365/);
    const imported = await engine.imports.any(result.fileName, result.bytes);
    assert.equal(imported.project.items.filter((entry) => entry.kind === "skill").length, 1);
    assert.deepEqual(imported.project.items[0].uses, ["record-finder"]);
  });

  test("baseline still writes v1.8 and inlines skills", async () => {
    const project = build();
    const result = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const agent = json(await engine.zip.read(result.bytes), "declarativeAgent_0.json");
    assert.equal(agent.version, "v1.8");
    assert.equal(agent.agent_skills, undefined);
    assert.match(agent.instructions, /## Skill: Record Finder/);
  });

  test("imported extensionless license terms survive both Microsoft downloads", async () => {
    for (const path of ["LICENSE", "LICENCE", "COPYING", "NOTICE", "LICENSE.md", "license", "license.txt"]) {
      const terms = encode("Synthetic terms for " + path + ": retain this notice.\n");
      const source = engine.zip.write([
        { name: "sample/SKILL.md", bytes: encode("---\nname: sample\ndescription: Reads a fictional marker.\n---\nRead the sample marker.\n") },
        { name: "sample/" + path, bytes: terms },
      ]);
      const imported = await engine.imports.any("sample.zip", source);
      assert.ok(!imported.error, imported.error);
      const project = imported.project;
      const before = structuredClone(project);
      for (const profile of ["copilotSkills", "microsoftPlugin"]) {
        const result = await write(project, profile);
        const entries = await engine.zip.read(result.bytes);
        assert.deepEqual(entries.get("skills/sample/LICENSE.txt"), terms);
        const renamed = path.includes(".") ? path : path + ".txt";
        const preservedPath = renamed.toLowerCase() === "license.txt" ? "LICENSE.txt" : renamed;
        assert.deepEqual(entries.get("skills/sample/" + preservedPath), terms);
        assert.ok(!result.report.some((entry) => entry.status === "unsupported" && entry.component === project.items[0].name + ": " + path));
      }
      assert.deepEqual(project.items[0].files, before.items[0].files);
      assert.equal(project.items[0].license, before.items[0].license);
    }
  });

  test("license name collisions block export without overwriting either notice", async () => {
    const project = build(simpleRaw());
    project.items[1].files.push({ path: "LICENSE", bytes: encode("First terms.\n") }, { path: "LICENSE.txt", bytes: encode("Other terms.\n") });
    const before = structuredClone(project);
    for (const profile of ["copilotSkills", "microsoftPlugin"]) {
      blocks(project, /repeated/, profile);
      await assert.rejects(write(project, profile));
    }
    assert.deepEqual(project, before);
  });

  test("a skill-only plugin has root skill references and no assistant definition", async () => {
    const raw = simpleRaw();
    raw.items.shift();
    const project = build(raw);
    const before = structuredClone(project);
    const result = await write(project, "microsoftPlugin");
    const entries = await engine.zip.read(result.bytes);
    const manifest = json(entries, "manifest.json");
    schema(manifest, "teams/manifest-v1.29.schema.json");
    assert.equal(manifest.id, project.id);
    assert.equal(manifest.manifestVersion, "1.29");
    assert.deepEqual(manifest.agentSkills, [{ folder: "skills/record-finder" }]);
    assert.equal(manifest.copilotAgents, undefined);
    assert.equal(manifest.agentConnectors, undefined);
    assert.ok(!entries.has("declarativeAgent_0.json"));
    assert.deepEqual(project, before);
    const again = json(await engine.zip.read((await write(project, "microsoftPlugin")).bytes), "manifest.json");
    assert.equal(again.id, manifest.id);
  });

  test("plugins use native remote connectors and never widen a named tool list", async () => {
    const project = build();
    project.servers.remote.auth = "oauth";
    const result = await write(project, "microsoftPlugin");
    const manifest = json(await engine.zip.read(result.bytes), "manifest.json");
    schema(manifest, "teams/manifest-v1.29.schema.json");
    assert.equal(manifest.agentConnectors.length, 1);
    const connector = manifest.agentConnectors[0];
    assert.equal(connector.id, "remote");
    assert.deepEqual(connector.toolSource.remoteMcpServer, {
      mcpServerUrl: "https://mcp.example.org/mcp",
      authorization: { type: "OAuthPluginVault", referenceId: "replace-with-your-auth-registration-id" },
    });
    assert.ok(result.report.some((entry) => /cannot enforce this tool list/.test(entry.note)));
    assert.match(result.setup, /Register the sign-in/);
    assert.ok(!JSON.stringify(manifest).includes("reference_id"));
  });

  test("unsupported transports, API keys, and placeholder addresses get specific reports", async () => {
    for (const field of ["transport", "auth"]) {
      const project = build();
      project.servers.remote[field] = field === "transport" ? "sse" : "apikey";
      const result = await write(project, "microsoftPlugin");
      assert.equal(json(await engine.zip.read(result.bytes), "manifest.json").agentConnectors, undefined);
      assert.ok(result.report.some((entry) => /Streamable HTTP/.test(entry.note)));
    }
    const project = build();
    project.servers.remote.url = "";
    assert.ok(report(project, "microsoftPlugin").some((entry) => entry.status === "requires-setup" && /placeholder address/.test(entry.note)));
  });

  test("a selected skill becomes a referenced skill with a short wrapper assistant", async () => {
    const project = build(simpleRaw());
    project.items[1].body = "Read the sample. ".repeat(700);
    const result = await write(project, "copilotSkills", project.items[1]);
    const entries = await engine.zip.read(result.bytes);
    const agent = json(entries, "declarativeAgent_0.json");
    assert.ok(agent.instructions.length < 8000);
    assert.match(text(entries.get("skills/record-finder/SKILL.md")), /Read the sample/);
    assert.deepEqual(agent.agent_skills, [{ folder: "skills/record-finder" }]);
  });

  test("knowledge and native skills cannot be combined; blocked exports preserve the source", async () => {
    const project = build(simpleRaw());
    project.items[0].files.push({ path: "references/assistant.txt", bytes: encode("Synthetic knowledge.") });
    const before = structuredClone(project);
    blocks(project, /cannot combine/);
    await assert.rejects(write(project, "copilotSkills"), /cannot combine/);
    assert.deepEqual(project, before);
  });

  test("product exclusions remove skills and tools, and all-excluded plugins are blocked", async () => {
    const project = build();
    project.items[1].notFor = ["copilot"];
    blocks(project, /No eligible skills/);
    const result = await write(project, "microsoftPlugin");
    const manifest = json(await engine.zip.read(result.bytes), "manifest.json");
    assert.equal(manifest.agentSkills.length, 1);
    assert.equal(manifest.agentConnectors, undefined);
    project.items[0].notFor = ["copilot"];
    blocks(project, /No eligible skills/, "microsoftPlugin");
  });

  test("plugins cannot discard an assistant's active source limits", () => {
    const project = build(simpleRaw());
    project.items[0].copilot.webSearch = true;
    project.items[0].copilot.webSites = ["https://example.org"];
    blocks(project, /source restrictions/, "microsoftPlugin");
  });

  test("native skill count accepts eight and blocks nine", async () => {
    const raw = simpleRaw();
    const skill = raw.items[1];
    raw.items = [raw.items[0], ...Array.from({ length: 8 }, (_, i) => ({ ...skill, id: undefined, name: "Skill " + i }))];
    raw.items[0].uses = raw.items.slice(1).map((item, i) => "skill-" + i);
    const project = build(raw);
    await write(project, "copilotSkills");
    const more = build({ ...raw, items: [...raw.items, { ...skill, id: undefined, name: "Skill 8" }] });
    more.items[0].uses.push("skill-8");
    blocks(more, /at most 8/);
  });

  test("plugin skill count accepts twenty and blocks twenty-one", async () => {
    const raw = simpleRaw();
    const skill = raw.items[1];
    raw.items = Array.from({ length: 20 }, (_, i) => ({ ...skill, id: undefined, name: "Skill " + i }));
    const project = build(raw);
    await write(project, "microsoftPlugin");
    // Normal imports cap projects at twenty; exercise the writer's own guard.
    project.items.push(build({ ...raw, items: [{ ...skill, id: undefined, name: "Skill 20" }] }).items[0]);
    blocks(project, /at most 20 skills/, "microsoftPlugin");
  });

  test("native file count includes generated files and accepts exactly 350", async () => {
    const project = build(simpleRaw());
    project.items[1].files = Array.from({ length: 348 }, (_, i) => ({ path: "references/file-" + i + ".txt", bytes: encode("Example.") }));
    await write(project, "copilotSkills");
    project.items[1].files.push({ path: "references/extra.txt", bytes: encode("Example.") });
    blocks(project, /at most 350 files/);
  });

  test("unsafe paths, case collisions, and excessive native depth are blocked", async () => {
    for (const path of ["../escape.txt", "references/CON.txt", "references/.hidden.txt", "a/b/c/deep.txt", "references/trailing .txt "]) {
      const project = build(simpleRaw());
      project.items[1].files.push({ path, bytes: encode("Example.") });
      // Unknown extensions are omitted; accepted extensions with unsafe names block.
      if (path.endsWith(" ")) {
        assert.ok(report(project).some((entry) => entry.status === "unsupported"));
      } else {
        blocks(project, /unsafe, long, or deeply/);
        await assert.rejects(write(project, "copilotSkills"));
      }
    }
    const project = build(simpleRaw());
    project.items[1].files.push({ path: "license.TXT", bytes: encode("Duplicate license.") }, { path: "LICENSE.txt", bytes: encode("License.") });
    blocks(project, /repeated/);
  });

  test("native body length is checked after tool composition", async () => {
    const raw = simpleRaw();
    raw.items[1].body = "x".repeat(19999);
    await write(build(raw), "copilotSkills");
    raw.items[1].body += "x";
    blocks(build(raw), /19,999/);
  });

  test("Cowork companion count includes the generated license", async () => {
    const project = build(simpleRaw());
    project.items[1].files = Array.from({ length: 19 }, (_, i) => ({ path: "references/file-" + i + ".txt", bytes: encode("Example.") }));
    await write(project, "microsoftPlugin");
    project.items[1].files.push({ path: "references/extra.txt", bytes: encode("Example.") });
    blocks(project, /at most 20 resource files/, "microsoftPlugin");
    await write(project, "copilotSkills");
  });

  test("resource size and total package limits fail visibly", () => {
    const project = build(simpleRaw());
    project.items[1].files[0].bytes = new Uint8Array(5 * 1024 * 1024 + 1).fill(65);
    blocks(project, /5 MB/, "microsoftPlugin");
    project.items[1].files.push({ path: "references/more.txt", bytes: new Uint8Array(5 * 1024 * 1024).fill(65) });
    blocks(project, /10 MB/);
  });

  test("unknown profiles and missing required text fail before download", async () => {
    const project = build(simpleRaw());
    await assert.rejects(write(project, "unexpected"), /supported Microsoft/);
    project.items[1].body = "";
    blocks(project, /steps/);
    assert.ok(report(project).every((entry) => typeof entry.note === "string"));
  });

  test("plugins disclose publisher placeholders even when the selected item is excluded", async () => {
    const project = build(simpleRaw());
    project.creator = { name: "", organization: "", url: "", privacy: "", terms: "" };
    project.items[0].notFor = ["copilot"];
    const result = await write(project, "microsoftPlugin");
    assert.ok(result.report.some((entry) => entry.component === "Publisher details" && /Placeholder/.test(entry.note)));
    schema(json(await engine.zip.read(result.bytes), "manifest.json"), "teams/manifest-v1.29.schema.json");
  });
});


describe("Copilot Agent Builder skill uploads", () => {
  const upload = (project) => engine.exports.copilotSkill(project, project.items[1]);
  const notices = (project) => engine.tools.conversionReport(project, project.items[1], "copilotSkill");
  test("writes the tenant-tested root layout without app metadata or source changes", async () => {
    const project = build(simpleRaw());
    const before = structuredClone(project);
    const result = await upload(project);
    const entries = await engine.zip.read(result.bytes);
    assert.deepEqual([...entries.keys()].sort(), ["LICENSE.txt", "SKILL.md", "references/check.txt"]);
    assert.equal(result.fileName, "record-finder.copilot-skill.zip");
    const app = await write(project, "copilotSkills");
    const appEntries = await engine.zip.read(app.bytes);
    for (const [name, bytes] of entries) assert.deepEqual(bytes, appEntries.get("skills/record-finder/" + name));
    assert.match(text(entries.get("references/check.txt")), /COPPER-FINCH/);
    assert.match(result.setup, /Configure, then Skills, then Add/);
    assert.match(result.setup, /Try it/);
    assert.deepEqual(project, before);
  });

  test("requires a selected skill and respects Copilot exclusions", async () => {
    const project = build(simpleRaw());
    await assert.rejects(engine.exports.copilotSkill(project, project.items[0]), /Choose a skill/);
    project.items[1].notFor = ["copilot"];
    await assert.rejects(upload(project), /author marked/);
  });

  test("preserves imported license terms in a root upload", async () => {
    const terms = encode("Synthetic license terms: retain this notice.\n");
    const source = engine.zip.write([
      { name: "SKILL.md", bytes: encode("---\nname: sample\ndescription: Reads a fictional marker.\n---\nRead the marker.\n") },
      { name: "COPYING", bytes: terms }
    ]);
    const imported = await engine.imports.any("sample.zip", source);
    const result = await engine.exports.copilotSkill(imported.project, imported.project.items[0]);
    const entries = await engine.zip.read(result.bytes);
    assert.deepEqual(entries.get("COPYING.txt"), terms);
    assert.deepEqual(entries.get("LICENSE.txt"), terms);
  });

  test("reports tool setup and excluded scripts without installing actions", async () => {
    const project = build();
    const result = await upload(project);
    const entries = await engine.zip.read(result.bytes);
    assert.ok(![...entries.keys()].some((name) => /manifest|declarativeAgent|plugin-|scripts\//.test(name)));
    assert.ok(result.report.some((entry) => entry.status === "requires-setup"));
    assert.ok(result.report.some((entry) => entry.status === "unsupported"));
    assert.match(result.setup, /does not create an assistant or install tool connections/);
    assert.match(text(entries.get("SKILL.md")), /If none of them is available/);
  });

  test("blocks empty instructions and bodies of 20,000 characters", async () => {
    const project = build(simpleRaw());
    project.items[1].body = "";
    await assert.rejects(upload(project));
    project.items[1].body = "a".repeat(19999);
    assert.ok(!notices(project).some((entry) => entry.status === "blocked"));
    project.items[1].body += "a";
    await assert.rejects(upload(project), /19,999/);
  });

  test("blocks unsafe, deep, and case-colliding resource paths", async () => {
    for (const paths of [["../escape.txt"], ["CON.txt"], ["a/b/c/d.txt"], ["references/A.txt", "references/a.txt"], ["skill.md"]]) {
      const project = build(simpleRaw());
      project.items[1].files = paths.map((path) => ({ path, bytes: encode("synthetic") }));
      await assert.rejects(upload(project), /unsafe|repeated|nested/);
    }
  });

  test("allows up to 350 files including generated skill and license", async () => {
    const project = build(simpleRaw());
    project.items[1].files = Array.from({ length: 348 }, (_, n) => ({ path: "references/file-" + n + ".txt", bytes: encode("sample") }));
    assert.ok(!notices(project).some((entry) => entry.status === "blocked"));
    project.items[1].files.push({ path: "references/extra.txt", bytes: encode("sample") });
    await assert.rejects(upload(project), /350 files/);
  });

  test("uses Agent Builder's 25 MB file limit rather than the app's 10 MB limit", async () => {
    const project = build(simpleRaw());
    project.items[1].files = [{ path: "references/large.txt", bytes: new Uint8Array(25 * 1024 * 1024) }];
    assert.ok(!notices(project).some((entry) => entry.status === "blocked"));
    project.items[1].files[0].bytes = new Uint8Array(25 * 1024 * 1024 + 1);
    await assert.rejects(upload(project), /25 MB/);
  });

  test("counts generated files and ZIP overhead against the 50 MB limit", async () => {
    const project = build(simpleRaw());
    project.items[1].files = ["a.txt", "b.txt"].map((path) => ({ path, bytes: new Uint8Array(25 * 1024 * 1024) }));
    await assert.rejects(upload(project), /50 MB/);
    const small = build(simpleRaw());
    small.items[1].files = [];
    const base = await upload(small);
    const generatedSize = base.entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
    project.items[1].files[1].bytes = new Uint8Array(25 * 1024 * 1024 - generatedSize);
    assert.ok(!notices(project).some((entry) => entry.status === "blocked"));
    await assert.rejects(upload(project), /complete Copilot skill ZIP exceeds 50 MB/);
  });
});
