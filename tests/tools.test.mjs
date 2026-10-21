// This file is part of Agentprise
// tests/tools.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-10-21
// Summary: Tests for the tools stage: exports checked against the pinned vendor
//          schemas, golden export files for every provider kind on every
//          target, composed instructions, the conversion report, the setup
//          guide, round trips of tool-enabled exports, and the page size limit.
// Notes: See README file for documentation and full license information.
//
//        Golden files live under tests/fixtures/exports/<target>/. When an
//        exporter change is intended, regenerate them and review the diff:
//          UPDATE_GOLDEN=1 node --test tests/tools.test.mjs      (bash)
//          $env:UPDATE_GOLDEN=1; node --test tests/tools.test.mjs (PowerShell)
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
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { loadEngine, repoRoot } from "./load-engine.mjs";
import { makeOfficeZip, sampleAgent } from "./helpers.mjs";
import { validate, loadSchema, describeErrors } from "./schema-validator.mjs";
import { goldenRaw, goldenCapabilities, teamsIcons, IDS } from "./tools-fixture.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const { composeInstructions, conversionReport, planExport, writeSetupGuide, COMPLETION_RULE, TOOLS_HEADING, COPILOT_INSTRUCTION_LIMIT, COPILOT_WEBSEARCH_SITE_LIMIT } = engine.tools;

// The address the exporters write for a server whose address the installer supplies.
const MCP_URL_PLACEHOLDER = "https://example.com/replace-with-your-mcp-server-address";
const GOLDEN_DIR = join(repoRoot, "tests", "fixtures", "exports");
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";
const TOOLS_SECTION = "## " + TOOLS_HEADING;

/** Normalizes a raw project and fails on any notice, so fixtures stay clean. */
function build(raw) {
  const result = engine.project.normalize(raw);
  assert.deepEqual(result.notices, []);
  return result.project;
}

const golden = () => build(goldenRaw());

/** A one-skill project; capabilities and servers are the caller's. */
function skillProject({ capabilities = [], servers = {}, name = "Tool Kit", body = "# Steps\nDo the work.", files = [] } = {}) {
  return build({ name, servers, items: [{ kind: "skill", name: "Helper Skill", description: "Helps with work.", body, capabilities, files }] });
}

/** An agent project from the sample agent with extra capabilities and an optional used skill. */
function agentProject({ capabilities = [], copilot = {}, instructions, skill } = {}) {
  const agent = sampleAgent(engine);
  const items = [{
    ...agent,
    kind: "agent",
    instructions: instructions === undefined ? agent.instructions : instructions,
    copilot: { ...agent.copilot, ...copilot },
    files: agent.files.map((file) => ({ path: "references/" + file.name, bytes: file.bytes })),
    uses: skill ? ["helper-skill"] : [],
    capabilities,
  }];
  if (skill) {
    items.push({ kind: "skill", name: "Helper Skill", description: "Helps with work.", body: skill.body, capabilities: skill.capabilities || [], files: skill.files || [] });
  }
  return build({ name: "Agent Kit", creator: { name: "Example Creator", url: "https://example.org", privacy: "https://example.org/privacy", terms: "https://example.org/terms" }, items });
}

const webCapability = (sites, extra = {}) => ({ id: "web", label: "Site search", description: "Searches the listed sites.", required: false, fallback: "Say that web search is off.", providers: { "*": [{ kind: "websearch", sites, instructions: "" }] }, ...extra });
const statusesOf = (report) => report.map((entry) => [entry.component, entry.status]);
const zipEntries = async (written) => new Map([...(await engine.zip.read(written.bytes))].map(([name, bytes]) => [name, bytes]));
const entryText = (written, suffix) => decode(written.entries.find((entry) => entry.name.endsWith(suffix)).bytes);

/** The text under "## What changed in this export" in a README. */
function reportSectionOf(readme) {
  const marker = "## What changed in this export\n";
  const at = readme.indexOf(marker);
  assert.ok(at >= 0, "README has the report section");
  return readme.slice(at + marker.length);
}

// ### Golden export files ###

/** Replaces values that change on every export, such as the Teams manifest version stamp. */
function normalizeVolatile(name, text) {
  let out = text.replace(/\r\n/g, "\n");
  if (name.endsWith("manifest.json")) {
    out = out.replace(/"version": "1\.\d{8}\.\d{6}"/, "\"version\": \"1.YYYYMMDD.HHMMSS\"");
  }
  // A generated app id would differ per run; the fixture fixes the agent's, so any other is replaced.
  return out.replace(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g, (id) => (Object.values(IDS).includes(id) ? id : "GENERATED-ID"));
}

const reportJson = (report) => JSON.stringify(report, null, 2) + "\n";

/** Text files of a written ZIP export, minus license texts, pictures, and the fixture's own input files. */
function pluginTextFiles(entries, root) {
  const files = {};
  for (const entry of entries) {
    const path = entry.name.slice(root.length);
    if (/(^|\/)LICENSE\.txt$/.test(path) || /\.png$/.test(path)) continue;
    if (/^skills\/[^/]+\/(openapi|scripts|references)\//.test(path)) continue;
    files[path] = decode(entry.bytes);
  }
  return files;
}

/**
 * Every golden target and its files, built from the fixed project.
 * @returns {Promise<Object<string, Object<string, string>>>} target -> relative path -> text
 */
async function goldenOutputs() {
  const project = golden();
  const [agent, skill] = project.items;
  const out = {};

  const teams = await engine.exports.teamsPackage(project, agent, teamsIcons());
  const teamsZip = await zipEntries(teams);
  const declarative = JSON.parse(decode(teamsZip.get("declarativeAgent_0.json")));
  out["copilot-app-package"] = { "instructions.md": declarative.instructions + "\n", "declarativeAgent_0.json": decode(teamsZip.get("declarativeAgent_0.json")), "manifest.json": decode(teamsZip.get("manifest.json")), "SETUP.md": teams.setup, "report.json": reportJson(teams.report) };
  for (const [name, bytes] of teamsZip) {
    if (name.startsWith("plugin-")) out["copilot-app-package"][name] = decode(bytes);
  }

  const ms = engine.exports.msAgent(project, agent);
  const definition = JSON.parse(ms.text).customCopilotConfig.gptDefinition;
  out["teams-chat-agent"] = { "instructions.md": definition.instructions + "\n", "capabilities.json": JSON.stringify(definition.capabilities, null, 2) + "\n", "report.json": reportJson(ms.report) };

  for (const [target, exportId] of [["claude-skill", "claude"], ["gemini-skill", "gemini"], ["plain-skill", "skill"]]) {
    const written = await engine.exports.skillZip(project, skill, exportId);
    const files = { "report.json": reportJson(written.report) };
    for (const entry of written.entries) {
      const path = entry.name.slice(skill.skillName.length + 1);
      if (["SKILL.md", "agentprise.json", "README.md", "SETUP.md"].includes(path)) files[path] = decode(entry.bytes);
    }
    out[target] = files;
  }

  const claudePlugin = await engine.exports.claudePlugin(project);
  out["claude-plugin"] = { ...pluginTextFiles(claudePlugin.entries, "golden-kit/"), "report.json": reportJson(claudePlugin.report) };
  const portable = await engine.exports.portablePlugin(project);
  out["portable-plugin"] = { ...pluginTextFiles(portable.entries, "golden-kit/"), "report.json": reportJson(portable.report) };

  const chatgpt = engine.exports.copyText(project, agent, "chatgpt");
  out["chatgpt-text"] = { "instructions.txt": chatgpt.instructions + "\n", "report.json": reportJson(chatgpt.report) };
  const notebook = engine.exports.copyText(project, agent, "notebook");
  out["notebook-markdown"] = { [notebook.fileName]: notebook.markdown, "report.json": reportJson(notebook.report) };

  for (const target of Object.keys(out)) {
    for (const path of Object.keys(out[target])) {
      out[target][path] = normalizeVolatile(path, out[target][path]);
    }
  }
  return out;
}

/** Relative paths of every file under a folder. */
function listFiles(folder) {
  if (!existsSync(folder)) return [];
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else found.push(relative(folder, full).replace(/\\/g, "/"));
    }
  };
  walk(folder);
  return found.sort();
}

const goldenTargets = await goldenOutputs();
if (UPDATE_GOLDEN) {
  for (const [target, files] of Object.entries(goldenTargets)) {
    rmSync(join(GOLDEN_DIR, target), { recursive: true, force: true });
    for (const [path, text] of Object.entries(files)) {
      const full = join(GOLDEN_DIR, target, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, text);
    }
  }
}

describe("golden export files", () => {
  test("the fixture covers every provider kind and every golden target", () => {
    const kinds = new Set(goldenCapabilities().flatMap((capability) => Object.values(capability.providers).flat().map((provider) => provider.kind)));
    assert.deepEqual([...kinds].sort(), [...engine.PROVIDER_KINDS].sort());
    assert.deepEqual(Object.keys(goldenTargets).sort(), ["chatgpt-text", "claude-plugin", "claude-skill", "copilot-app-package", "gemini-skill", "notebook-markdown", "plain-skill", "portable-plugin", "teams-chat-agent"]);
  });

  for (const [target, files] of Object.entries(goldenTargets)) {
    test(target + " matches its golden files (UPDATE_GOLDEN=1 regenerates them)", () => {
      const folder = join(GOLDEN_DIR, target);
      assert.deepEqual(listFiles(folder), Object.keys(files).sort(), "golden file list for " + target);
      for (const [path, text] of Object.entries(files)) {
        const expected = readFileSync(join(folder, path), "utf8").replace(/\r\n/g, "\n");
        assert.equal(text, expected, target + "/" + path + " changed; rerun with UPDATE_GOLDEN=1 if the change is intended");
      }
    });
  }

  test("exports of the fixed project are identical on a second run", async () => {
    assert.deepEqual(await goldenOutputs(), goldenTargets);
  });
});

// ### Pinned schema validation ###

describe("exports validate against the pinned schemas", () => {
  const schemas = {
    plugin: loadSchema("agent-plugins/plugin.schema.json"),
    mcp: loadSchema("agent-plugins/mcp.schema.json"),
    declarative: loadSchema("copilot/declarative-agent-v1.8.schema.json"),
    copilotPlugin: loadSchema("copilot/plugin-v2.4.schema.json"),
    teams: loadSchema("teams/manifest-v1.28.schema.json"),
  };
  const valid = (schema, text, label) => {
    const errors = validate(schema, JSON.parse(text));
    assert.deepEqual(errors, [], label + "\n" + describeErrors(errors));
  };

  test("the backup's plugin.json and mcp.json", async () => {
    const backup = await engine.exports.backup(golden());
    valid(schemas.plugin, entryText(backup, "golden-kit/plugin.json"), "backup plugin.json");
    valid(schemas.mcp, entryText(backup, "golden-kit/mcp.json"), "backup mcp.json");
  });

  test("the portable plugin's plugin.json and mcp.json, including a local server and a placeholder address", async () => {
    const project = golden();
    project.servers.byo = { label: "Your own server", transport: "http", url: "", userSupplied: true, auth: "none", tools: [] };
    project.items[1].capabilities[1].providers["*"].push({ kind: "mcp", server: "byo", tools: [], instructions: "" });
    const portable = await engine.exports.portablePlugin(project);
    valid(schemas.plugin, entryText(portable, "golden-kit/plugin.json"), "portable plugin.json");
    const mcpText = entryText(portable, "golden-kit/mcp.json");
    valid(schemas.mcp, mcpText, "portable mcp.json");
    assert.deepEqual(Object.keys(JSON.parse(mcpText).mcpServers), ["remote", "pinned", "local", "byo"]);
  });

  test("the Teams package: manifest.json, declarativeAgent_0.json, and every plugin file", async () => {
    const teams = await engine.exports.teamsPackage(golden(), golden().items[0], teamsIcons());
    const entries = await zipEntries(teams);
    valid(schemas.teams, decode(entries.get("manifest.json")), "manifest.json");
    valid(schemas.declarative, decode(entries.get("declarativeAgent_0.json")), "declarativeAgent_0.json");
    const plugins = [...entries.keys()].filter((name) => /^plugin-.*\.json$/.test(name));
    // One dynamic MCP server, one with pinned tools, and one OpenAPI description.
    assert.deepEqual(plugins, ["plugin-remote.json", "plugin-pinned.json", "plugin-records.json"]);
    for (const name of plugins) {
      valid(schemas.copilotPlugin, decode(entries.get(name)), name);
    }
    const runtimeOf = (name) => JSON.parse(decode(entries.get(name))).runtimes[0];
    assert.deepEqual(runtimeOf("plugin-remote.json").run_for_functions, ["*"]);
    assert.deepEqual(runtimeOf("plugin-pinned.json").run_for_functions, ["search", "fetch"]);
    assert.equal(runtimeOf("plugin-records.json").type, "OpenApi");
    assert.equal(decode(entries.get("apis/records/records.yaml")).includes("operationId: searchRecords"), true);
    const declarative = JSON.parse(decode(entries.get("declarativeAgent_0.json")));
    assert.deepEqual(declarative.actions, [{ id: "remote", file: "plugin-remote.json" }, { id: "pinned", file: "plugin-pinned.json" }, { id: "records", file: "plugin-records.json" }]);
    assert.deepEqual(declarative.capabilities.find((c) => c.name === "WebSearch"), { name: "WebSearch", sites: [{ url: "https://records.example.org" }] });
  });

  test("Copilot plugin files with a placeholder address and API key authentication still validate", async () => {
    const project = skillProject({
      servers: { byo: { label: "Your own server", transport: "http", url: "", userSupplied: true } },
      files: [{ path: "openapi/keyed.yaml", bytes: encode("openapi: 3.0.3\npaths:\n  /x:\n    get:\n      operationId: getThing\n") }],
      capabilities: [{ id: "a", label: "Lookup", providers: { copilot: [{ kind: "mcp", server: "byo" }, { kind: "openapi", spec: "openapi/keyed.yaml", operations: ["getThing"], auth: "apikey" }] } }],
    });
    const teams = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const entries = await zipEntries(teams);
    for (const name of ["plugin-byo.json", "plugin-keyed.json"]) {
      valid(schemas.copilotPlugin, decode(entries.get(name)), name);
    }
    assert.equal(JSON.parse(decode(entries.get("plugin-byo.json"))).runtimes[0].spec.url, MCP_URL_PLACEHOLDER);
    assert.deepEqual(JSON.parse(decode(entries.get("plugin-keyed.json"))).runtimes[0].auth, { type: "ApiKeyPluginVault", reference_id: "replace-with-your-auth-registration-id" });
    valid(schemas.declarative, decode(entries.get("declarativeAgent_0.json")), "declarativeAgent_0.json");
    valid(schemas.teams, decode(entries.get("manifest.json")), "manifest.json");
  });
});

// ### Composed instructions ###

describe("composeInstructions", () => {
  test("the tools section follows the item text, lists capabilities in order, and ends with the completion rule", () => {
    const project = golden();
    const skill = project.items[1];
    const text = composeInstructions(project, skill, "claude");
    assert.ok(text.startsWith(skill.body + "\n\n" + TOOLS_SECTION + "\n\n"));
    assert.ok(text.endsWith("\n\n" + COMPLETION_RULE));
    assert.equal(COMPLETION_RULE, "Only report a search, lookup, or retrieval as completed when a tool returned results in this conversation.");
    assert.equal(text.split(TOOLS_SECTION).length, 2, "one tools section");
    const headings = text.split("\n").filter((line) => line.startsWith("### "));
    assert.deepEqual(headings, skill.capabilities.map((capability) => "### " + capability.label));
  });

  test("providers appear in the order the target lists them", () => {
    const project = skillProject({
      files: [{ path: "scripts/run.py", bytes: encode("print(1)\n") }],
      capabilities: [{ id: "a", label: "Lookup", fallback: "No lookup.", providers: { claude: [{ kind: "script", path: "scripts/run.py", runtime: "python3", instructions: "Script second? No, first." }, { kind: "connector", name: "Example", instructions: "Connector second." }] } }],
    });
    const text = composeInstructions(project, project.items[0], "claude");
    assert.ok(text.includes("Use the first of these that is available in this conversation:\n1. The script scripts/run.py. Script second? No, first.\n2. The Example connector. Connector second.\nIf none of them is available: No lookup."));
  });

  test("a capability with no provider, or only \"none\", gets its fallback text alone", () => {
    const project = skillProject({
      capabilities: [
        { id: "a", label: "Empty", description: "Nothing here.", fallback: "Ask for the record.", providers: {} },
        { id: "b", label: "None kind", fallback: "Paste it instead.", providers: { "*": [{ kind: "none" }] } },
        { id: "c", label: "No fallback", providers: {} },
      ],
    });
    const text = composeInstructions(project, project.items[0], "chatgpt");
    assert.ok(text.includes("### Empty\nNothing here.\nAsk for the record.\n\n"));
    assert.ok(text.includes("### None kind\nPaste it instead.\n\n"));
    // Without its own fallback, the app's plain default is used.
    assert.ok(text.includes("### No fallback\nNo tool for this is connected in this setup. Say so plainly and offer what you can do without it.\n\n" + COMPLETION_RULE));
    assert.equal(text.includes("Use the first of these"), false);
  });

  test("an item with no capabilities gets no tools section", () => {
    const project = skillProject();
    for (const exportId of Object.keys(engine.tools.EXPORTS).filter((id) => id !== "backup")) {
      assert.equal(composeInstructions(project, project.items[0], exportId), "# Steps\nDo the work.", exportId);
    }
  });

  test("used skills are inlined under \"## Skill: <name>\" for products without skills", () => {
    const project = golden();
    const [agent, skill] = project.items;
    for (const exportId of ["teamsZip", "msAgent", "chatgpt", "notebook"]) {
      const text = composeInstructions(project, agent, exportId);
      const at = text.indexOf("## Skill: Record Finder\n\nUse this when: " + skill.description + "\n\n" + skill.body);
      assert.ok(at > agent.instructions.length, exportId);
      assert.ok(text.startsWith(agent.instructions + "\n\n"), exportId);
      // The skill's tools travel with it, after the skill text.
      assert.ok(text.indexOf(TOOLS_SECTION) > at, exportId);
      assert.ok(conversionReport(project, agent, exportId).some((entry) => entry.component === "Skill Record Finder" && entry.status === "transformed"), exportId);
    }
  });

  test("used skills are never inlined for skill and plugin products", () => {
    const project = golden();
    const agent = project.items[0];
    for (const exportId of ["claude", "gemini", "skill", "claudePlugin", "portablePlugin"]) {
      const text = composeInstructions(project, agent, exportId);
      assert.equal(text.includes("## Skill:"), false, exportId);
      // The agent has no tools of its own, and its skill's tools stay in the skill.
      assert.equal(text, agent.instructions, exportId);
    }
  });

  test("a used skill too long for Copilot's limit moves to references/<skill>.md in the app package", async () => {
    const longBody = "# Steps\n" + "Check each record carefully. ".repeat(300);
    const project = agentProject({ skill: { body: longBody } });
    const agent = project.items[0];
    assert.equal(COPILOT_INSTRUCTION_LIMIT, 8000);
    const plan = planExport(project, agent, "teamsZip");
    assert.equal(plan.text.includes("## Skill:"), false);
    assert.ok(plan.text.includes("When a question needs the skill Helper Skill, follow the steps in the attached file helper-skill.md."));
    assert.ok(plan.text.length <= COPILOT_INSTRUCTION_LIMIT);
    assert.deepEqual(plan.files.map((file) => file.path), ["references/helper-skill.md"]);
    assert.ok(decode(plan.files[0].bytes).startsWith("## Skill: Helper Skill\n"));
    assert.ok(plan.report.some((entry) => entry.component === "Skill Helper Skill" && entry.status === "transformed" && entry.note.includes("helper-skill.md")));
    // The package carries it as an attached file, renamed to a type Copilot accepts.
    const teams = await engine.exports.teamsPackage(project, agent, teamsIcons());
    assert.ok((await zipEntries(teams)).has("helper-skill.md.txt"));
    // Products with no instruction limit inline it.
    assert.ok(composeInstructions(project, agent, "chatgpt").includes("## Skill: Helper Skill"));
  });

  test("a used skill that does not fit is left out of the Teams Chat file, which carries no files", () => {
    const project = agentProject({ skill: { body: "# Steps\n" + "Check each record carefully. ".repeat(300) } });
    const agent = project.items[0];
    const plan = planExport(project, agent, "msAgent");
    assert.deepEqual(plan.files, []);
    assert.equal(plan.text, agent.instructions);
    const entry = plan.report.find((item) => item.component === "Skill Helper Skill");
    assert.equal(entry.status, "unsupported");
    assert.ok(entry.note.includes("cannot include files"));
  });

  test("a skill written for a product without skills becomes an assistant, and an assistant for a skill product gets a Persona description", () => {
    const project = golden();
    const [agent, skill] = project.items;
    assert.equal(planExport(project, agent, "claude").description, "Persona: " + agent.description);
    assert.equal(planExport(project, agent, "teamsZip").description, agent.description);
    assert.equal(planExport(project, skill, "claude").description, skill.description);
    assert.ok(conversionReport(project, skill, "msAgent").some((entry) => entry.component === "Record Finder" && entry.status === "transformed" && entry.note.includes("always-on assistant")));
  });
});

// ### Conversion report ###

describe("conversionReport", () => {
  const requiredSkill = () => skillProject({
    capabilities: [{ id: "main", label: "Main lookup", description: "The job itself.", required: true, fallback: "Explain that the lookup is missing.", providers: { copilot: [{ kind: "connector", name: "Example", instructions: "" }], "*": [{ kind: "none" }] } }],
  });

  test("a required capability with no provider on a target is unsupported, and the export README says so", async () => {
    const project = requiredSkill();
    const item = project.items[0];
    const entry = conversionReport(project, item, "claude").find((report) => report.component === "Main lookup");
    assert.equal(entry.status, "unsupported");
    assert.ok(entry.note.includes("main job"));
    assert.ok(entry.note.includes("won't work as intended"));
    // Where a provider exists, there is no such entry.
    assert.equal(conversionReport(project, item, "teamsZip").some((report) => report.component === "Main lookup" && report.status === "unsupported"), false);
    const written = await engine.exports.skillZip(project, item, "claude");
    const section = reportSectionOf(entryText(written, "/README.md"));
    assert.ok(section.includes("- Main lookup: left out. " + entry.note));
    // Plugin READMEs name the item before each entry, since a plugin holds the whole project.
    const plugin = await engine.exports.portablePlugin(project);
    const pluginEntry = conversionReport(project, item, "portablePlugin").find((report) => report.component === "Main lookup");
    assert.ok(pluginEntry.note.includes("main job"));
    assert.ok(reportSectionOf(entryText(plugin, "tool-kit/README.md")).includes("- Helper Skill: Main lookup: left out. " + pluginEntry.note));
  });

  test("an optional capability with no provider is not reported as unsupported", () => {
    const project = skillProject({ capabilities: [{ id: "x", label: "Extra", required: false, providers: {} }] });
    assert.deepEqual(conversionReport(project, project.items[0], "claude"), []);
  });

  test("web search with more than four sites is blocked on Copilot, and the downloads refuse", async () => {
    const sites = ["https://a.example.org", "https://b.example.org", "https://c.example.org", "https://d.example.org", "https://e.example.org"];
    const project = agentProject({ capabilities: [webCapability(sites)], copilot: { webSearch: false, webSites: [] } });
    const agent = project.items[0];
    assert.equal(COPILOT_WEBSEARCH_SITE_LIMIT, 4);
    for (const exportId of ["teamsZip", "msAgent"]) {
      const entry = conversionReport(project, agent, exportId).find((report) => report.status === "blocked");
      assert.ok(entry, exportId);
      assert.equal(entry.component, "Site search");
      assert.ok(entry.note.includes("Remove sites"));
      assert.equal(planExport(project, agent, exportId).blocked, true);
    }
    await assert.rejects(engine.exports.teamsPackage(project, agent, teamsIcons()), /can't be made yet/);
    assert.throws(() => engine.exports.msAgent(project, agent), /can't be made yet/);
    // Other products just mention the sites in the instructions.
    assert.equal(conversionReport(project, agent, "chatgpt").some((report) => report.status === "blocked"), false);
  });

  test("instructions over the Copilot limit are blocked with the number of characters to cut", async () => {
    const project = agentProject({ instructions: "x".repeat(7990), capabilities: [webCapability(["https://a.example.org"])] });
    const agent = project.items[0];
    const entry = conversionReport(project, agent, "teamsZip").find((report) => report.component === "Instructions");
    assert.equal(entry.status, "blocked");
    assert.ok(/Shorten the instructions by [\d,]+ characters/.test(entry.note));
    await assert.rejects(engine.exports.teamsPackage(project, agent, teamsIcons()), /Instructions/);
    assert.throws(() => engine.exports.msAgent(project, agent), /Instructions/);
    assert.equal(conversionReport(project, agent, "chatgpt").some((report) => report.status === "blocked"), false);
  });

  test("merging tool sites into Copilot web search never widens it", () => {
    const sitesOf = (ms) => JSON.parse(ms.text).customCopilotConfig.gptDefinition.capabilities.find((c) => c.name === "WebSearch");
    const tool = [webCapability(["https://tool.example.org"])];
    // Whole-web search stays whole-web.
    const wholeProject = agentProject({ capabilities: tool, copilot: { webSearch: true, webSites: [] } });
    const whole = engine.exports.msAgent(wholeProject, wholeProject.items[0]);
    assert.deepEqual(sitesOf(whole), { name: "WebSearch" });
    assert.ok(whole.report.some((entry) => entry.component === "Web search" && entry.status === "preserved"));
    // Off turns on for the tool's sites only.
    const offProject = agentProject({ capabilities: tool, copilot: { webSearch: false, webSites: [] } });
    const off = engine.exports.msAgent(offProject, offProject.items[0]);
    assert.deepEqual(sitesOf(off), { name: "WebSearch", sites: [{ url: "https://tool.example.org" }] });
    assert.ok(off.report.some((entry) => entry.component === "Web search" && entry.status === "transformed"));
    // A set list grows by the tool's sites.
    const listProject = agentProject({ capabilities: tool, copilot: { webSearch: true, webSites: ["https://a.example.org", "https://b.example.org"] } });
    const list = engine.exports.msAgent(listProject, listProject.items[0]);
    assert.deepEqual(sitesOf(list).sites.map((site) => site.url), ["https://a.example.org", "https://b.example.org", "https://tool.example.org"]);
    // A list that would pass four is blocked rather than dropped to whole-web.
    const fullProject = agentProject({ capabilities: [webCapability(["https://tool.example.org", "https://two.example.org"])], copilot: { webSearch: true, webSites: ["https://a.example.org", "https://b.example.org", "https://c.example.org"] } });
    assert.throws(() => engine.exports.msAgent(fullProject, fullProject.items[0]), /Web search/);
    // The stored item never changes.
    assert.deepEqual(offProject.items[0].copilot.webSites, []);
    assert.equal(offProject.items[0].copilot.webSearch, false);
  });

  test("the Teams package merges tool sites the same way", async () => {
    const project = agentProject({ capabilities: [webCapability(["https://tool.example.org"])], copilot: { webSearch: true, webSites: ["https://a.example.org"] } });
    const teams = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const declarative = JSON.parse(decode((await zipEntries(teams)).get("declarativeAgent_0.json")));
    assert.deepEqual(declarative.capabilities.find((c) => c.name === "WebSearch").sites, [{ url: "https://a.example.org" }, { url: "https://tool.example.org" }]);
  });

  test("normal agents have no blocked sources", () => {
    const project = engine.project.fromAgent(sampleAgent(engine)).project;
    for (const exportId of ["teamsZip", "msAgent"]) {
      assert.deepEqual(conversionReport(project, project.items[0], exportId).filter((entry) => entry.status === "blocked"), [], exportId);
    }
    const quiet = engine.project.fromAgent(engine.createAgent()).project;
    assert.deepEqual(conversionReport(quiet, quiet.items[0], "teamsZip").filter((entry) => entry.status === "blocked"), []);
  });

  test("the Gemini skill ZIP leaves out Office files with an entry each; Claude keeps them", async () => {
    const project = skillProject({ files: [{ path: "references/brief.docx", bytes: makeOfficeZip() }, { path: "references/table.xlsx", bytes: makeOfficeZip() }, { path: "references/notes.md", bytes: encode("# Notes") }] });
    const item = project.items[0];
    assert.deepEqual(item.files.map((file) => file.path), ["references/brief.docx", "references/table.xlsx", "references/notes.md"]);
    const gemini = await engine.exports.skillZip(project, item, "gemini");
    assert.deepEqual(gemini.entries.map((entry) => entry.name).filter((name) => name.includes("/references/")), ["helper-skill/references/notes.md"]);
    assert.deepEqual(statusesOf(gemini.report), [["references/brief.docx", "unsupported"], ["references/table.xlsx", "unsupported"]]);
    assert.ok(reportSectionOf(entryText(gemini, "/README.md")).includes("references/brief.docx: left out."));
    const claude = await engine.exports.skillZip(project, item, "claude");
    assert.equal(claude.entries.filter((entry) => entry.name.includes("/references/")).length, 3);
    assert.deepEqual(claude.report, []);
  });

  test("a local server is dropped from the Claude plugin with an entry and kept in the portable plugin", async () => {
    const project = golden();
    const claude = await engine.exports.claudePlugin(project);
    assert.deepEqual(Object.keys(JSON.parse(entryText(claude, ".mcp.json")).mcpServers), ["remote", "pinned"]);
    assert.deepEqual(JSON.parse(entryText(claude, ".mcp.json")).mcpServers.remote, { type: "http", url: "https://mcp.example.org/mcp" });
    const dropped = claude.report.find((entry) => entry.status === "unsupported" && entry.note.includes("Local helper server"));
    assert.ok(dropped);
    assert.ok(dropped.note.includes("claude.ai can connect only to tool servers on the web"));
    assert.ok(reportSectionOf(entryText(claude, "golden-kit/README.md")).includes(dropped.note));
    const portable = await engine.exports.portablePlugin(project);
    assert.deepEqual(JSON.parse(entryText(portable, "golden-kit/mcp.json")).mcpServers.local, { type: "stdio", command: "npx", args: ["-y", "example-mcp-server"] });
    assert.equal(portable.report.some((entry) => entry.note.includes("Local helper server") && entry.status === "unsupported"), false);
  });

  test("a server whose address the installer supplies gets the placeholder, setup steps, and a report note", async () => {
    const project = skillProject({
      servers: { byo: { label: "Search server", transport: "http", url: "", userSupplied: true } },
      capabilities: [{ id: "a", label: "Lookup", providers: { "*": [{ kind: "mcp", server: "byo", instructions: "" }] } }],
    });
    const item = project.items[0];
    for (const [exportId, file] of [["portablePlugin", "mcp.json"], ["claudePlugin", ".mcp.json"]]) {
      const written = await engine.exports[exportId](project);
      assert.equal(JSON.parse(entryText(written, "tool-kit/" + file)).mcpServers.byo.url, MCP_URL_PLACEHOLDER, exportId);
      const setup = entryText(written, "tool-kit/SETUP.md");
      assert.ok(setup.includes("## Add the address of your Search server"), exportId);
      assert.ok(setup.includes("1. Open " + file + " in a text editor."), exportId);
      assert.ok(setup.includes("2. Replace " + MCP_URL_PLACEHOLDER + " with the https address of your server."), exportId);
      assert.ok(written.report.some((entry) => entry.note.includes("placeholder address")), exportId);
    }
    const teamsSetup = writeSetupGuide(project, [item], "teamsZip");
    assert.ok(teamsSetup.includes("1. Open plugin-byo.json inside the app package in a text editor."));
  });

  test("a Copilot tool server that needs an API key is left out", async () => {
    const project = skillProject({
      servers: { keyed: { label: "Keyed server", transport: "http", url: "https://keyed.example.org/mcp", auth: "apikey" } },
      capabilities: [{ id: "a", label: "Lookup", providers: { "*": [{ kind: "mcp", server: "keyed" }] } }],
    });
    const entry = conversionReport(project, project.items[0], "teamsZip").find((report) => report.component === "Lookup");
    assert.equal(entry.status, "unsupported");
    assert.ok(entry.note.includes("API key"));
    const teams = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    const entries = await zipEntries(teams);
    assert.equal([...entries.keys()].some((name) => name.startsWith("plugin-")), false);
    assert.equal("actions" in JSON.parse(decode(entries.get("declarativeAgent_0.json"))), false);
    // Plugins keep it; the installer adds the key where the plugin runs.
    assert.equal(conversionReport(project, project.items[0], "portablePlugin").find((report) => report.component === "Lookup").status, "preserved");
  });

  test("the Claude plugin name avoids the words Claude reserves", async () => {
    const project = skillProject({ name: "Claude Helper" });
    const claude = await engine.exports.claudePlugin(project);
    assert.equal(claude.fileName, "my-claude-helper.claude-plugin.zip");
    const manifest = JSON.parse(entryText(claude, ".claude-plugin/plugin.json"));
    assert.equal(manifest.name, "my-claude-helper");
    assert.equal(manifest.displayName, "Claude Helper");
    assert.ok(claude.entries.every((entry) => entry.name.startsWith("my-claude-helper/")));
    for (const name of ["Anthropic Tools", "Claude"]) {
      const other = await engine.exports.claudePlugin(skillProject({ name }));
      assert.ok(other.fileName.startsWith("my-"), name);
    }
    // A name that only contains the word is fine, and the portable plugin is not restricted.
    assert.equal((await engine.exports.claudePlugin(skillProject({ name: "Helper for Claude" }))).fileName, "helper-for-claude.claude-plugin.zip");
    assert.equal((await engine.exports.portablePlugin(project)).fileName, "claude-helper.plugin.zip");
  });

  test("Copilot package losses (welcome message, copyright, placeholder publisher details) are report entries", async () => {
    const agent = sampleAgent(engine);
    agent.creator = { name: "", website: "", privacy: "", terms: "" };
    const project = engine.project.fromAgent(agent).project;
    const report = conversionReport(project, project.items[0], "teamsZip");
    assert.deepEqual(statusesOf(report), [["Welcome message", "unsupported"], ["Copyright and license", "unsupported"], ["Publisher details", "transformed"]]);
    assert.ok(report[2].note.includes("name, website, privacy, terms"));
    const teams = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    assert.deepEqual(teams.report, report);
    // The Teams Chat file keeps the welcome message and copyright, so neither is reported there.
    assert.deepEqual(statusesOf(engine.exports.msAgent(project, project.items[0]).report), [["Attached files", "unsupported"]]);
  });

  test("every report entry uses one of the documented statuses", async () => {
    const project = golden();
    for (const item of project.items) {
      for (const exportId of Object.keys(engine.tools.EXPORTS)) {
        for (const entry of conversionReport(project, item, exportId)) {
          assert.ok(engine.REPORT_STATUSES.includes(entry.status), exportId + ": " + entry.status);
          assert.equal(typeof entry.component, "string");
          assert.ok(entry.note.length > 0);
        }
      }
    }
  });
});

// ### Setup guide ###

describe("writeSetupGuide", () => {
  test("a connector gets steps to turn it on", () => {
    const project = golden();
    const guide = writeSetupGuide(project, [project.items[1]], "claude");
    assert.ok(guide.startsWith("<!--\nGolden Kit\n"));
    assert.ok(guide.includes("# Set up Golden Kit"));
    assert.ok(guide.includes("## Turn on the Example Records connector\n\nThis works best with the Example Records connector turned on."));
  });

  test("a script step lists the hosts the script names", () => {
    const script = "BASE = 'https://eutils.example.org/entrez'\nOTHER = 'https://api.example.net/v2'\nAGAIN = 'https://eutils.example.org/other'\n";
    const project = skillProject({
      files: [{ path: "scripts/fetch.py", bytes: encode(script) }],
      capabilities: [{ id: "a", label: "Fetch", providers: { "*": [{ kind: "script", path: "scripts/fetch.py", runtime: "python3" }] } }],
    });
    const guide = writeSetupGuide(project, project.items, "claude");
    assert.ok(guide.includes("## Let the script connect to the internet"));
    assert.ok(guide.includes("The script scripts/fetch.py runs only where python3 can run with network access to eutils.example.org, api.example.net."));
    assert.ok(guide.includes("and adding eutils.example.org, api.example.net."));
  });

  test("a Teams package with actions gets the custom apps step; one without does not", () => {
    const project = golden();
    const agent = project.items[0];
    const withActions = writeSetupGuide(project, [agent], "teamsZip");
    assert.ok(withActions.includes("## Allow custom apps in Microsoft 365"));
    assert.ok(withActions.includes("Upload custom apps"));
    // The same tools in a plugin need no tenant setting.
    assert.equal(writeSetupGuide(project, project.items, "portablePlugin").includes("custom apps"), false);
    const connectorOnly = skillProject({ capabilities: [{ id: "a", label: "Lookup", providers: { "*": [{ kind: "connector", name: "Example" }] } }] });
    const guide = writeSetupGuide(connectorOnly, connectorOnly.items, "teamsZip");
    assert.ok(guide.includes("## Turn on the Example connector"));
    assert.equal(guide.includes("custom apps"), false);
  });

  test("a server with an address gets a connect step naming it", () => {
    const project = golden();
    const guide = writeSetupGuide(project, [project.items[1]], "chatgpt");
    assert.ok(guide.includes("## Connect the Example search server"));
    assert.ok(guide.includes("using the address https://mcp.example.org/mcp"));
  });

  test("nothing to set up gives an empty guide and no SETUP.md", async () => {
    const project = skillProject({ capabilities: [{ id: "a", label: "Manual", providers: { "*": [{ kind: "none" }] } }] });
    for (const exportId of ["claude", "teamsZip", "portablePlugin", "claudePlugin"]) {
      assert.equal(writeSetupGuide(project, project.items, exportId), "", exportId);
    }
    const written = await engine.exports.skillZip(project, project.items[0], "claude");
    assert.equal(written.entries.some((entry) => entry.name.endsWith("SETUP.md")), false);
    const plugin = await engine.exports.portablePlugin(project);
    assert.equal(plugin.entries.some((entry) => entry.name.endsWith("SETUP.md")), false);
  });
});

// ### Round trips ###

describe("tool-enabled exports round trip", () => {
  test("the portable plugin re-imports to the same item records", async () => {
    const project = golden();
    const written = await engine.exports.portablePlugin(project);
    const back = await engine.imports.any(written.fileName, written.bytes);
    assert.equal(back.error, undefined);
    assert.equal(back.format, "plugin");
    assert.deepEqual(back.notices, []);
    assert.deepEqual(engine.project.record(back.project).items, engine.project.record(project).items);
    assert.deepEqual(back.project.servers, project.servers);
    // The Persona prefix and the tools section are export additions, so neither comes back.
    assert.equal(back.project.items[0].description, project.items[0].description);
    assert.equal(back.project.items[1].body.includes(TOOLS_SECTION), false);
  });

  test("the Claude plugin re-imports its skills", async () => {
    const project = golden();
    const written = await engine.exports.claudePlugin(project);
    const back = await engine.imports.any(written.fileName, written.bytes);
    assert.equal(back.error, undefined);
    assert.equal(back.format, "plugin");
    // Skill folders carry the servers their tools name, so even the local server comes back.
    assert.deepEqual(back.notices, []);
    const [agent, skill] = back.project.items;
    assert.deepEqual([agent.kind, agent.id, agent.name, agent.description, agent.instructions, agent.uses], ["agent", IDS.agent, "Golden Scout", project.items[0].description, project.items[0].instructions, ["record-finder"]]);
    assert.deepEqual([skill.kind, skill.id, skill.body, skill.description], ["skill", IDS.skill, project.items[1].body, project.items[1].description]);
    assert.deepEqual(skill.capabilities, JSON.parse(JSON.stringify(project.items[1].capabilities)));
    // MCP files omit the skill's labels, sign-in kinds, and tool lists, so
    // their different definitions remain separate from the skill's own servers.
    assert.deepEqual(Object.keys(back.project.servers).sort(), ["local", "pinned", "pinned-2", "remote", "remote-2"]);
    for (const [name, server] of Object.entries(project.servers)) {
      assert.deepEqual(back.project.servers[name], server, "skill server settings survive unchanged");
    }
    assert.equal(back.project.servers["pinned-2"].url, project.servers.pinned.url);
    assert.equal(back.project.servers["remote-2"].url, project.servers.remote.url);
  });

  test("a skill ZIP export re-imports without repeating the tools section", async () => {
    const project = skillProject({
      files: [{ path: "scripts/run.py", bytes: encode("print(1)\n") }],
      capabilities: [
        { id: "a", label: "Run", providers: { "*": [{ kind: "script", path: "scripts/run.py", runtime: "python3" }] } },
        { id: "b", label: "Web", providers: { "*": [{ kind: "websearch", sites: ["https://a.example.org"] }] } },
      ],
    });
    let current = project;
    for (let round = 0; round < 3; round++) {
      const written = await engine.exports.skillZip(current, current.items[0], "claude");
      const skillMd = entryText(written, "/SKILL.md");
      assert.equal(skillMd.split(TOOLS_SECTION).length, 2, "round " + round);
      assert.equal(skillMd.split(COMPLETION_RULE).length, 2, "round " + round);
      const back = await engine.imports.any(written.fileName, written.bytes);
      assert.deepEqual(back.notices, []);
      assert.deepEqual(engine.project.record(back.project).items, engine.project.record(project).items);
      current = back.project;
    }
  });
});

describe("composed exports are marked; the backup is not", () => {
  test("skill ZIPs and plugins carry the tools section and composed: true; the backup keeps the plain text", async () => {
    const project = golden();
    const skill = project.items[1];
    const backup = await engine.exports.backup(project);
    const backupSkill = entryText(backup, "golden-kit/skills/record-finder/SKILL.md");
    assert.equal(backupSkill.includes(TOOLS_SECTION), false);
    assert.equal("composed" in JSON.parse(entryText(backup, "golden-kit/skills/record-finder/agentprise.json")), false);
    for (const exportId of ["claude", "gemini"]) {
      const written = await engine.exports.skillZip(project, skill, exportId);
      assert.ok(entryText(written, "/SKILL.md").includes("\n" + TOOLS_SECTION + "\n"), exportId);
      assert.equal(JSON.parse(entryText(written, "/agentprise.json")).composed, true, exportId);
    }
    // The plain skill has no sidecar but still tells the model about its tools.
    const plain = await engine.exports.plainSkill(project, skill);
    assert.ok(entryText(plain, "/SKILL.md").includes(TOOLS_SECTION));
    assert.equal(plain.entries.some((entry) => entry.name.endsWith("agentprise.json")), false);
    for (const exportId of ["claudePlugin", "portablePlugin"]) {
      const written = await engine.exports[exportId](project);
      assert.equal(JSON.parse(entryText(written, "skills/record-finder/agentprise.json")).composed, true, exportId);
      assert.ok(entryText(written, "skills/record-finder/SKILL.md").includes(TOOLS_SECTION), exportId);
    }
  });
});

// ### Known engine gaps ###
// Each todo states the expected behavior. They run but do not fail the suite;
// remove "todo" once the engine is fixed.

describe("fixed engine gaps", () => {
  test("conversionReport: a user-supplied server written with a placeholder address is requires-setup, not preserved (design D8)", () => {
    const project = skillProject({
      servers: { byo: { label: "Search server", transport: "http", url: "", userSupplied: true } },
      capabilities: [{ id: "a", label: "Lookup", providers: { "*": [{ kind: "mcp", server: "byo" }] } }],
    });
    for (const exportId of ["teamsZip", "portablePlugin", "claudePlugin"]) {
      const entry = conversionReport(project, project.items[0], exportId).find((report) => report.component === "Lookup");
      assert.equal(entry.status, "requires-setup", exportId);
    }
  });

  test("conversionReport: a script in the Claude plugin is requires-setup on claude.ai (design table, script row)", () => {
    const entry = conversionReport(golden(), golden().items[1], "claudePlugin").find((report) => report.component === "Record script");
    assert.equal(entry.status, "requires-setup");
  });

  test("setupNote: exports without a SETUP.md (Teams Chat file, ChatGPT text, Notebook) must not say \"SETUP.md says how\"", () => {
    const project = golden();
    for (const exportId of ["msAgent", "chatgpt", "notebook"]) {
      const entry = conversionReport(project, project.items[0], exportId).find((report) => report.component === "Record connector");
      assert.equal(entry.note.includes("SETUP.md"), false, exportId);
    }
  });

  test("readPluginArchive: re-importing this app's Claude plugin adds the root LICENSE.txt to every item's files", async () => {
    const project = golden();
    const written = await engine.exports.claudePlugin(project);
    const back = await engine.imports.any(written.fileName, written.bytes);
    assert.deepEqual(back.project.items.map((item) => item.files.map((file) => file.path)), project.items.map((item) => item.files.map((file) => file.path)));
  });

  test("skill ZIP: a lone skill's tool server providers survive a re-import (design D2, self-contained skill folders)", async () => {
    const project = golden();
    const written = await engine.exports.skillZip(project, project.items[1], "claude");
    const back = await engine.imports.any(written.fileName, written.bytes);
    assert.deepEqual(back.notices, []);
    assert.deepEqual(back.project.items[0].capabilities, project.items[1].capabilities);
  });

  test("writeTeamsPackage: files from used skills that go in renamed to .txt get a report entry like the assistant's own files", async () => {
    const project = golden();
    const teams = await engine.exports.teamsPackage(project, project.items[0], teamsIcons());
    assert.ok((await zipEntries(teams)).has("guide.md.txt"));
    assert.ok(teams.report.some((entry) => entry.component === "guide.md" && entry.status === "transformed"));
  });
});

// ### Page size ###

// ### Products an item is not for ###

describe("products an author marks an item as not for", () => {
  /** The golden project with notFor set on the assistant, the skill, or both. */
  function marked({ agent = [], skill = [], reason = "" } = {}) {
    const raw = goldenRaw();
    raw.items.find((item) => item.kind === "agent").notFor = agent;
    const rawSkill = raw.items.find((item) => item.kind === "skill");
    rawSkill.notFor = skill;
    rawSkill.notForReason = reason;
    return build(raw);
  }
  const agentOf = (project) => project.items.find((item) => item.kind === "agent");
  const skillOf = (project) => project.items.find((item) => item.kind === "skill");

  test("an item marked as not for a product is blocked for every download for that product, and the downloads refuse", async () => {
    const project = marked({ agent: ["copilot"] });
    const agent = agentOf(project);
    for (const exportId of ["teamsZip", "msAgent"]) {
      const report = conversionReport(project, agent, exportId);
      assert.equal(report.length, 1, exportId);
      assert.equal(report[0].status, "blocked");
      assert.ok(report[0].note.startsWith("The author marked this assistant as not for Microsoft 365 Copilot."), report[0].note);
      assert.ok(report[0].note.includes("Products it works in"));
      assert.equal(planExport(project, agent, exportId).blocked, true);
    }
    await assert.rejects(engine.exports.teamsPackage(project, agent, teamsIcons()), /can't be made yet/);
    assert.throws(() => engine.exports.msAgent(project, agent), /can't be made yet/);
    // Other products are not affected.
    assert.equal(conversionReport(project, agent, "claude").some((entry) => entry.status === "blocked"), false);
  });

  test("the reason is part of the note, with one period at the end", () => {
    const project = marked({ skill: ["claude"], reason: "Needs the Claude Docs plugin." });
    const entry = conversionReport(project, skillOf(project), "claude")[0];
    assert.ok(entry.note.startsWith("The author marked this skill as not for Claude: Needs the Claude Docs plugin. To download it anyway"), entry.note);
    const coding = marked({ skill: ["cli"] });
    assert.ok(conversionReport(coding, skillOf(coding), "skill")[0].note.startsWith("The author marked this skill as not for coding tools."));
  });

  test("an assistant leaves out a used skill marked as not for the product, with its tools", () => {
    const project = marked({ skill: ["copilot"] });
    const agent = agentOf(project);
    const report = conversionReport(project, agent, "teamsZip");
    const entry = report.find((item) => item.component === "Skill Record Finder");
    assert.equal(entry.status, "unsupported");
    assert.equal(entry.note, "Left out with its tools, because its author marked it as not for Microsoft 365 Copilot.");
    assert.equal(report.some((item) => item.status === "blocked"), false);
    const text = composeInstructions(project, agent, "teamsZip");
    assert.equal(text.includes("## Skill: Record Finder"), false);
    assert.equal(text.includes(TOOLS_SECTION), false);
    // A skill download for another product still points at the skill.
    assert.ok(conversionReport(project, agent, "claude").some((item) => item.component === "Skill Record Finder" && item.status === "requires-setup"));
  });

  test("a whole-project plugin leaves out an item marked as not for its product and lists only the others", async () => {
    const project = marked({ skill: ["claude"], reason: "Needs the Claude Docs plugin" });
    const plugin = await engine.exports.claudePlugin(project);
    assert.equal(plugin.entries.some((entry) => entry.name.includes("/skills/record-finder/")), false);
    assert.ok(plugin.entries.some((entry) => entry.name.includes("/skills/golden-scout/SKILL.md")));
    const lines = plugin.report.filter((entry) => entry.component === "Record Finder");
    assert.deepEqual(lines, [{ component: "Record Finder", status: "unsupported", note: "Left out, because its author marked it as not for Claude: Needs the Claude Docs plugin." }]);
    const readme = entryText(plugin, "/README.md");
    const inside = readme.slice(readme.indexOf("## What is inside"), readme.indexOf("## How to install"));
    assert.ok(inside.includes("- Golden Scout"));
    assert.equal(inside.includes("- Record Finder"), false);
    // The Plugin for ChatGPT and other tools still holds both.
    const portable = await engine.exports.portablePlugin(project);
    assert.ok(portable.entries.some((entry) => entry.name.includes("/skills/record-finder/SKILL.md")));
  });

  test("a plugin is blocked when every item is marked as not for its product", async () => {
    const project = marked({ agent: ["chatgpt"], skill: ["chatgpt"] });
    await assert.rejects(engine.exports.portablePlugin(project), /there is nothing to put in the plugin/);
    await engine.exports.claudePlugin(project);
  });

  test("the setting is written to agentprise.json only when set, and opens again from a skill ZIP", async () => {
    const project = marked({ skill: ["gemini", "copilot"], reason: "Needs a coding tool" });
    const written = await engine.exports.skillZip(project, skillOf(project), "claude");
    const sidecar = JSON.parse(entryText(written, "/agentprise.json"));
    assert.deepEqual(sidecar.notFor, ["copilot", "gemini"]);
    assert.equal(sidecar.notForReason, "Needs a coding tool");
    const back = await engine.imports.any(written.fileName, written.bytes);
    const item = back.project.items[0];
    assert.deepEqual(item.notFor, ["copilot", "gemini"]);
    assert.equal(item.notForReason, "Needs a coding tool");
    const plain = golden();
    const unmarked = JSON.parse(entryText(await engine.exports.skillZip(plain, skillOf(plain), "claude"), "/agentprise.json"));
    assert.equal("notFor" in unmarked, false);
    assert.equal("notForReason" in unmarked, false);
  });
});

describe("page size", () => {
  test("index.html stays under 750 KB (750,000 bytes)", () => {
    // Measured as served: the repository stores LF, but a Windows checkout may
    // add a carriage return to every line.
    const size = Buffer.byteLength(readFileSync(join(repoRoot, "index.html"), "utf8").replace(/\r\n/g, "\n"));
    assert.ok(size < 750 * 1000, "index.html is " + size + " bytes");
  });
});
