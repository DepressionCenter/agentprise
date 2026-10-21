// This file is part of Agentprise
// tests/formats.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-21
// Summary: Tests for the format converters inside index.html: the Agent Skill
//          ZIP and plain skill written from a project item, SKILL.md imports,
//          the Microsoft .agent file, the Teams app package, copy-ready text,
//          format detection, and full round trips between them.
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
import { makePng, sampleAgent, agentFields, BYTE_SHAPES } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const teamsIcons = () => ({ color: makePng(192, 192), outline: makePng(32, 32, [255, 255, 255, 255]) });
const projectOf = (agent) => engine.project.fromAgent(agent).project;
const viewOf = (project) => engine.project.agentView(project, project.items[0]);
// A skill made elsewhere that names no license opens with this notice and is never relabeled with the default.
const NO_LICENSE_NOTICE = "The file doesn't say which license it uses. Check with its author before you share it.";

describe("Microsoft .agent", () => {
  test("export has the documented key order and shape", () => {
    const agent = sampleAgent(engine);
    const { fileName, text, warnings } = engine.formats.msAgent.export(agent);
    assert.equal(fileName, "Caveman.agent");
    assert.deepEqual(warnings, ["The Teams Chat file can't include attached files, so they were left out."]);
    const doc = JSON.parse(text);
    assert.deepEqual(Object.keys(doc), ["_license", "_agentprise", "schemaVersion", "customCopilotConfig"]);
    assert.equal(doc.schemaVersion, "0.2.0");
    assert.ok(doc._license.includes("Copyright (C) 2026 Example Creator"));
    assert.ok(doc._license.includes("GPL-3.0-or-later"));
    const config = doc.customCopilotConfig;
    assert.equal(config.gptDefinition.name, "Caveman");
    assert.equal(config.conversationStarters.welcomeMessage.text, agent.welcome);
    assert.equal(config.conversationStarters.conversationStarterList.length, 3);
    const capabilities = config.gptDefinition.capabilities;
    // OneDriveAndSharePoint stays last, the shape that was loaded in a Teams chat on 2026-10-10.
    assert.deepEqual(capabilities.map((c) => c.name), ["WebSearch", "TeamsMessages", "Email", "Meetings", "GraphicArt", "OneDriveAndSharePoint"]);
    assert.deepEqual(capabilities[0].sites, [{ url: "https://example.org" }, { url: "https://example.net/docs/guide" }]);
    assert.deepEqual(capabilities[1].urls, agent.copilot.teamsLinks.map((url) => ({ url })));
    assert.deepEqual(capabilities[2], { name: "Email", shared_mailbox: "front-desk@example.org", group_mailboxes: ["lab-team@example.org"], folders: [{ folder_id: "inbox" }] });
    assert.deepEqual(capabilities[3], { name: "Meetings", items_by_id: [{ id: "AAMkAGExampleMeetingId0123456789==", is_series: true }] });
    // Items keep every field in the SharePoint builder's key order; typed links follow as url-only entries.
    assert.deepEqual(Object.keys(capabilities[5].items_by_sharepoint_ids[0]), ["url", "name", "site_id", "web_id", "list_id", "unique_id", "type"]);
    assert.equal(capabilities[5].items_by_sharepoint_ids[0].type, "File");
    assert.equal(capabilities[5].items_by_url.length, 3);
    assert.equal(capabilities[5].items_by_url[0].name, "Team site");
    assert.deepEqual(capabilities[5].items_by_url[1], { url: agent.sharepointLinks[0] });
    assert.deepEqual(config.gptDefinition.behavior_overrides, { special_instructions: { discourage_model_knowledge: true }, default_response_mode: "Think deeper" });
    assert.ok(config.icon.startsWith("data:image/png;base64,"));
    assert.deepEqual(Object.keys(doc._agentprise.copilot), ["app_id"]);
    assert.equal(doc._agentprise.creator.website, "https://example.org");
  });

  test("round trips every field", () => {
    const agent = sampleAgent(engine);
    const { text } = engine.formats.msAgent.export(agent);
    const result = engine.formats.msAgent.import(text);
    assert.equal(result.error, undefined);
    const expected = agentFields(agent);
    expected.files = [];
    assert.deepEqual(agentFields(result.agent), expected);
  });

  test("omits the welcome message key when empty", () => {
    const agent = sampleAgent(engine);
    agent.welcome = "";
    const doc = JSON.parse(engine.formats.msAgent.export(agent).text);
    assert.equal("welcomeMessage" in doc.customCopilotConfig.conversationStarters, false);
  });

  test("a SharePoint-made file without the extra key reads its switches from the capabilities", () => {
    const text = JSON.stringify({
      schemaVersion: "0.2.0",
      customCopilotConfig: {
        conversationStarters: { conversationStarterList: [{ text: "Hi" }], welcomeMessage: { text: "Welcome" } },
        gptDefinition: {
          name: "Plain",
          description: "Made in SharePoint",
          instructions: "Be helpful.",
          capabilities: [
            { name: "WebSearch", sites: [{ url: "https://example.org/" }] },
            { name: "CodeInterpreter" },
            { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [{ site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444" }], items_by_url: [] },
          ],
          behavior_overrides: { special_instructions: { discourage_model_knowledge: false } },
        },
      },
    });
    const { agent, notices } = engine.formats.msAgent.import(text);
    assert.equal(agent.name, "Plain");
    assert.equal(agent.welcome, "Welcome");
    assert.equal(agent.copilot.webSearch, true);
    assert.equal(agent.copilot.codeInterpreter, true);
    assert.equal(agent.copilot.teamsMessages, false);
    assert.equal(agent.copilot.meetings, false);
    assert.equal(agent.copilot.imageGeneration, false);
    assert.equal(agent.copilot.preferMyFiles, false);
    assert.equal(agent.creator.name, "");
    assert.deepEqual(agent.copilot.webSites, ["https://example.org/"]);
    assert.deepEqual(agent.sharepointItems, [{ by: "id", site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444" }]);
    assert.deepEqual(notices, []);
  });

  test("keeps the sources a SharePoint-made file carries, in the builder's own shape", () => {
    const file = { url: "https://example-my.sharepoint.com/personal/someone/_layouts/15/Doc.aspx?sourcedoc=%7B4444%7D&file=plan.docx", name: "plan.docx", site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444", type: "File" };
    const site = { url: "https://example.sharepoint.com/sites/team", name: "Team site", site_id: "55555555-5555-4555-8555-555555555555", web_id: "66666666-6666-4666-8666-666666666666", list_id: "00000000-0000-0000-0000-000000000000", unique_id: "00000000-0000-0000-0000-000000000000", type: "Site" };
    const text = JSON.stringify({
      schemaVersion: "0.2.0",
      customCopilotConfig: {
        conversationStarters: { conversationStarterList: [{ text: "Summarize recent items" }], welcomeMessage: { text: "Ask a question" } },
        gptDefinition: {
          name: "Team helper",
          description: "Reads the team site",
          instructions: "Be helpful.",
          capabilities: [{ name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [file], items_by_url: [site] }],
          behavior_overrides: { special_instructions: { discourage_model_knowledge: true } },
        },
      },
    });
    const { agent, notices } = engine.formats.msAgent.import(text);
    assert.deepEqual(agent.sharepointLinks, []);
    assert.deepEqual(agent.sharepointItems, [{ by: "id", ...file }, { by: "url", ...site }]);
    // The file grants no switch, so the only notice is the web-search one.
    assert.equal(notices.length, 1);
    assert.ok(notices[0].includes("doesn't turn on web search"));
    const doc = JSON.parse(engine.formats.msAgent.export(agent).text);
    const sharepoint = doc.customCopilotConfig.gptDefinition.capabilities.find((c) => c.name === "OneDriveAndSharePoint");
    assert.deepEqual(sharepoint, { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [file], items_by_url: [site] });
  });

  test("a file this app wrote without WebSearch opens with web search off", () => {
    const text = JSON.stringify({
      _agentprise: { version: "1", copilot: { app_id: "" } },
      schemaVersion: "0.2.0",
      customCopilotConfig: {
        gptDefinition: {
          name: "Quiet",
          description: "No web",
          instructions: "Be helpful.",
          capabilities: [{ name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [] }],
        },
      },
    });
    const { agent } = engine.formats.msAgent.import(text);
    assert.equal(agent.copilot.webSearch, false);
  });

  test("the SharePoint switch decides the OneDriveAndSharePoint entry and reads back the same way", () => {
    const agent = sampleAgent(engine);
    agent.sharepointLinks = [];
    agent.sharepointItems = [];
    const entryOf = (text) => JSON.parse(text).customCopilotConfig.gptDefinition.capabilities.find((c) => c.name === "OneDriveAndSharePoint");
    // Off: the SharePoint builder's own shape for an agent with no sources.
    agent.copilot.sharepoint = false;
    assert.deepEqual(entryOf(engine.formats.msAgent.export(agent).text), { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [] });
    assert.equal(engine.formats.msAgent.import(engine.formats.msAgent.export(agent).text).agent.copilot.sharepoint, false);
    // On with no limit: a bare entry, which the schema reads as every file the person can see.
    agent.copilot.sharepoint = true;
    assert.deepEqual(entryOf(engine.formats.msAgent.export(agent).text), { name: "OneDriveAndSharePoint" });
    assert.equal(engine.formats.msAgent.import(engine.formats.msAgent.export(agent).text).agent.copilot.sharepoint, true);
    // On with links: both lists, as the builder writes them.
    agent.sharepointLinks = ["https://example.sharepoint.com/sites/demo"];
    assert.deepEqual(entryOf(engine.formats.msAgent.export(agent).text), { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [{ url: "https://example.sharepoint.com/sites/demo" }] });
    const back = engine.formats.msAgent.import(engine.formats.msAgent.export(agent).text).agent;
    assert.equal(back.copilot.sharepoint, true);
    assert.deepEqual(back.sharepointLinks, ["https://example.sharepoint.com/sites/demo"]);
  });

  test("a file whose only SharePoint sources are links on other hosts opens with the switch off", () => {
    const text = JSON.stringify({
      _agentprise: { version: "1", copilot: { app_id: "" } },
      schemaVersion: "0.2.0",
      customCopilotConfig: {
        gptDefinition: {
          name: "Old links",
          description: "Written before links were checked",
          instructions: "Be helpful.",
          capabilities: [{ name: "WebSearch" }, { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [{ url: "https://example.org/wiki" }, { url: "https://teams.microsoft.com/l/chat/19:abc@thread.v2" }] }],
        },
      },
    });
    const { agent, notices } = engine.formats.msAgent.import(text);
    assert.equal(agent.copilot.sharepoint, false);
    assert.deepEqual(agent.sharepointLinks, []);
    assert.ok(notices.some((n) => n.includes("Removed 2 SharePoint links")));
    // Writing it back never widens the agent to every SharePoint file.
    const entry = JSON.parse(engine.formats.msAgent.export(agent).text).customCopilotConfig.gptDefinition.capabilities.find((c) => c.name === "OneDriveAndSharePoint");
    assert.deepEqual(entry, { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [] });
  });

  test("a SharePoint-made file that lists no switch opens with every switch off and a notice", () => {
    const text = JSON.stringify({
      schemaVersion: "0.2.0",
      customCopilotConfig: {
        conversationStarters: { conversationStarterList: [{ text: "Hi" }] },
        gptDefinition: {
          name: "Site helper",
          description: "Made in SharePoint",
          instructions: "Be helpful.",
          capabilities: [{ name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [] }],
          behavior_overrides: { special_instructions: { discourage_model_knowledge: true } },
        },
        icon: "https://res.public.onecdn.static.microsoft/files/sp-client/example.svg",
      },
    });
    const { agent, notices } = engine.formats.msAgent.import(text);
    assert.equal(agent.copilot.webSearch, false);
    assert.equal(agent.copilot.sharepoint, false);
    assert.equal(agent.copilot.teamsMessages, false);
    assert.equal(agent.copilot.meetings, false);
    assert.equal(agent.copilot.codeInterpreter, false);
    assert.equal(agent.copilot.preferMyFiles, true);
    assert.equal(agent.copilot.responseMode, "Auto");
    assert.ok(notices.some((n) => n.includes("doesn't turn on web search")));
    // Writing it back lists only what the file granted, so nothing widens.
    const doc = JSON.parse(engine.formats.msAgent.export(agent).text);
    assert.deepEqual(doc.customCopilotConfig.gptDefinition.capabilities.map((c) => c.name), ["OneDriveAndSharePoint"]);
    assert.deepEqual(doc.customCopilotConfig.gptDefinition.behavior_overrides, { special_instructions: { discourage_model_knowledge: true } });
  });

  test("a file from an earlier version still reads its switches from the extra key", () => {
    const text = JSON.stringify({
      _agentprise: { version: "1.0.0", copilot: { web_search: true, teams_messages: false, meetings: false, code_interpreter: true, image_generation: false, app_id: "" } },
      schemaVersion: "0.2.0",
      customCopilotConfig: {
        gptDefinition: {
          name: "Older",
          description: "Written before capabilities were listed",
          instructions: "Be helpful.",
          capabilities: [{ name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [], items_by_url: [] }],
        },
      },
    });
    const { agent } = engine.formats.msAgent.import(text);
    assert.equal(agent.copilot.webSearch, true);
    assert.equal(agent.copilot.codeInterpreter, true);
    assert.equal(agent.copilot.teamsMessages, false);
  });

  test("rejects JSON that is not an agent without throwing", () => {
    assert.ok(engine.formats.msAgent.import("[]").error);
    assert.ok(engine.formats.msAgent.import("\"x\"").error);
    assert.ok(engine.formats.msAgent.import("{not json").error);
    assert.ok(engine.formats.msAgent.import("{\"schemaVersion\":\"0.2.0\"}").error);
  });

  test("caps hostile values and keeps markup literal", () => {
    const text = JSON.stringify({
      customCopilotConfig: {
        gptDefinition: { name: "N".repeat(10000), description: "<script>alert(1)</script>", instructions: "x" },
        icon: "data:image/svg+xml;base64,PHN2Zz4=",
      },
    });
    const { agent, notices } = engine.formats.msAgent.import(text);
    assert.equal(agent.name.length, 100);
    assert.equal(agent.description, "<script>alert(1)</script>");
    assert.equal(agent.icon, null);
    assert.ok(notices.some((n) => n.includes("name")));
    assert.ok(notices.some((n) => n.includes("PNG")));
  });
});

describe("Agent Skill ZIP", () => {
  test("the skill ZIP of an agent writes its folder with SKILL.md, the sidecar, and the icon", async () => {
    const agent = sampleAgent(engine);
    const project = projectOf(agent);
    const { fileName, entries, report } = await engine.exports.skillZip(project, project.items[0], "claude");
    assert.equal(fileName, "Caveman.zip");
    // Claude has no separate place for assistants, so the report says the agent became a skill.
    assert.deepEqual(report.map((e) => [e.component, e.status]), [["Caveman", "transformed"]]);
    assert.ok(report[0].note.includes("Persona:"));
    assert.deepEqual(entries.map((e) => e.name), ["caveman/SKILL.md", "caveman/agentprise.json", "caveman/icon.png", "caveman/LICENSE.txt", "caveman/README.md", "caveman/references/notes.txt"]);
    const byName = new Map(entries.map((e) => [e.name, e.bytes]));
    const skillMd = decode(byName.get("caveman/SKILL.md"));
    assert.ok(skillMd.startsWith("---\nname: caveman\n"));
    const { data, body } = engine.yaml.parseFrontmatter(skillMd);
    assert.deepEqual(Object.keys(data), ["name", "description", "license", "metadata"]);
    assert.equal(data.description, "Persona: " + agent.description);
    assert.equal(data.license, "GPL-3.0-or-later. See LICENSE.txt.");
    for (const value of Object.values(data.metadata)) {
      assert.equal(typeof value, "string");
    }
    // The metadata keeps only the kind; every other Agentprise setting is in the sidecar.
    assert.deepEqual(data.metadata, { "agentprise-kind": "agent" });
    assert.equal(body.trim(), agent.instructions);
    const sidecar = JSON.parse(decode(byName.get("caveman/agentprise.json")));
    assert.equal(sidecar.schemaVersion, engine.PROJECT_SCHEMA_VERSION);
    assert.equal(sidecar.kind, "agent");
    assert.equal(sidecar.id, project.items[0].id);
    assert.equal(sidecar.name, "Caveman");
    assert.equal(sidecar.welcome, agent.welcome);
    assert.deepEqual(sidecar.starters, agent.starters);
    assert.deepEqual(sidecar.uses, []);
    assert.deepEqual(sidecar.capabilities, []);
    assert.equal(sidecar.copyright, agent.copyright);
    assert.deepEqual(sidecar.files, [{ path: "references/notes.txt", type: "txt" }]);
    // Copilot settings, SharePoint links, and publisher details are plain JSON values.
    assert.deepEqual(sidecar.copilot, JSON.parse(JSON.stringify(project.items[0].copilot)));
    assert.equal(sidecar.copilot.preferMyFiles, true);
    assert.equal(sidecar.copilot.responseMode, "Think deeper");
    assert.deepEqual(sidecar.copilot.webSites, ["https://example.org", "https://example.net/docs/guide"]);
    assert.deepEqual(sidecar.sharepointLinks, project.items[0].sharepointLinks);
    assert.deepEqual(sidecar.sharepointItems, JSON.parse(JSON.stringify(project.items[0].sharepointItems)));
    assert.equal(sidecar.creator.name, "Example Creator");
    assert.equal(sidecar.creator.privacy, "https://example.org/privacy");
    // An export marks its composed text so a re-import can take the additions back out.
    assert.equal(sidecar.composed, true);
    assert.ok(sidecar._license.includes("GPL-3.0-or-later"));
    assert.deepEqual(Array.from(byName.get("caveman/icon.png")), Array.from(agent.icon.bytes));
    assert.ok(decode(byName.get("caveman/LICENSE.txt")).includes("GNU GENERAL PUBLIC LICENSE"));
    const readme = decode(byName.get("caveman/README.md"));
    assert.ok(readme.startsWith("<!--\nCaveman\n"));
    assert.ok(readme.includes("references/notes.txt"));
    assert.ok(readme.includes("## What changed in this export"));
    assert.equal(decode(byName.get("caveman/references/notes.txt")), "Lab notes for the demo.");
  });

  test("the skill ZIP of an agent round trips every field", async () => {
    const agent = sampleAgent(engine);
    agent.copilot.appId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const project = projectOf(agent);
    const { fileName, bytes } = await engine.exports.skillZip(project, project.items[0], "claude");
    assert.equal(engine.detectFormat(fileName, bytes), "skillZip");
    const result = await engine.imports.any(fileName, bytes);
    assert.equal(result.error, undefined);
    assert.equal(result.format, "skillZip");
    assert.deepEqual(result.notices, []);
    assert.equal(result.project.items.length, 1);
    assert.equal(result.project.items[0].kind, "agent");
    assert.deepEqual(agentFields(viewOf(result.project)), agentFields(viewOf(project)));
  });

  test("a skill item writes its own fields and keeps nested files", async () => {
    const { project } = engine.project.normalize({
      license: "GPL-3.0-or-later",
      items: [{
        kind: "skill", name: "Data Tools", description: "Works with data.", body: "# Steps\nRun the script.", compatibility: "Needs Python 3", license: "MIT", allowedTools: "Bash(python:*)", metadata: { team: "lab" },
        files: [{ path: "scripts/run.py", bytes: encode("print('hi')") }, { path: "references/guide.md", bytes: encode("# Guide") }],
      }],
    });
    const item = project.items[0];
    const { fileName, entries } = await engine.exports.skillZip(project, item, "claude");
    assert.equal(fileName, "Data Tools.zip");
    assert.deepEqual(entries.map((e) => e.name), ["data-tools/SKILL.md", "data-tools/agentprise.json", "data-tools/LICENSE.txt", "data-tools/README.md", "data-tools/scripts/run.py", "data-tools/references/guide.md"]);
    const { data, body } = engine.yaml.parseFrontmatter(decode(entries[0].bytes));
    assert.deepEqual(Object.keys(data), ["name", "description", "license", "compatibility", "allowed-tools", "metadata"]);
    assert.equal(data.license, "MIT. See LICENSE.txt.");
    assert.equal(data.compatibility, "Needs Python 3");
    assert.equal(data["allowed-tools"], "Bash(python:*)");
    assert.deepEqual(data.metadata, { "agentprise-kind": "skill", team: "lab" });
    assert.equal(body.trim(), item.body);
    const sidecar = JSON.parse(decode(entries[1].bytes));
    assert.equal(sidecar.kind, "skill");
    assert.equal(sidecar.license, "MIT");
    assert.equal("welcome" in sidecar, false);
    const license = decode(entries[2].bytes);
    assert.ok(license.includes("MIT") && !license.includes("GNU GENERAL PUBLIC LICENSE"));
    const back = await engine.imports.any(fileName, engine.zip.write(entries));
    assert.deepEqual(back.notices, []);
    const record = engine.project.record(back.project).items[0];
    assert.deepEqual(record, engine.project.record(project).items[0]);
  });

  test("files in a skill made elsewhere are kept, moved aside, or refused by content", async () => {
    const skill = engine.zip.write([
      { name: "x/SKILL.md", bytes: encode("---\nname: x\ndescription: A skill\n---\nDo things.\n") },
      { name: "x/references/photo.png", bytes: makePng(4, 4) },
      { name: "x/references/deploy.ps1", bytes: encode("Write-Host 'hi'") },
      { name: "x/references/data.txt", bytes: encode("rows") },
      { name: "x/references/fake.pdf", bytes: BYTE_SHAPES.windows },
      { name: "x/references/deep/more.txt", bytes: encode("kept") },
    ]);
    const result = await engine.imports.any("x.zip", skill);
    const item = result.project.items[0];
    assert.equal(item.kind, "skill");
    // Scripts keep their real names; a program hiding behind a document name is refused by content.
    assert.deepEqual(item.files.map((f) => f.path), ["references/deploy.ps1", "references/data.txt", "references/deep/more.txt"]);
    assert.ok(result.notices.some((n) => n.includes("references/fake.pdf (it is a Windows program)")));
    // A type the app cannot interpret stays with the project, for the backup only.
    assert.deepEqual(result.project.unrecognized.map((u) => u.path), ["skills/x/references/photo.png"]);
    // The agent view lists only the files directly under references/.
    assert.deepEqual(viewOf(result.project).files.map((f) => f.name), ["deploy.ps1", "data.txt"]);
  });

  test("an agent folder with its Copilot and publisher settings as metadata strings still opens with them", async () => {
    // Files made before agentprise.json held these settings keep them in SKILL.md metadata.
    const skillMd = [
      "---", "name: old-agent", "description: d", "metadata:",
      "  agentprise-kind: agent",
      "  sharepoint-sources: https://example.sharepoint.com/sites/a",
      "  copilot-web-search: \"true\"",
      "  copilot-web-sites: https://example.org",
      "  copilot-email: \"false\"",
      "  copilot-response-mode: Think deeper",
      "  creator-name: Example Creator",
      "  creator-website: https://example.org",
      "---", "", "Talk plainly.", "",
    ].join("\n");
    const sidecar = JSON.stringify({ schemaVersion: engine.PROJECT_SCHEMA_VERSION, kind: "agent", id: "11111111-1111-4111-8111-111111111111", name: "Old Agent", welcome: "", starters: [], uses: [], capabilities: [], copyright: "", files: [] });
    const zip = engine.zip.write([{ name: "old-agent/SKILL.md", bytes: encode(skillMd) }, { name: "old-agent/agentprise.json", bytes: encode(sidecar) }]);
    const result = await engine.imports.any("old-agent.zip", zip);
    const item = result.project.items[0];
    assert.equal(item.kind, "agent");
    assert.deepEqual(item.sharepointLinks, ["https://example.sharepoint.com/sites/a"]);
    assert.equal(item.copilot.webSearch, true);
    assert.deepEqual(item.copilot.webSites, ["https://example.org"]);
    assert.equal(item.copilot.email, false);
    assert.equal(item.copilot.responseMode, "Think deeper");
    assert.equal(result.project.creator.name, "Example Creator");
    assert.equal(result.project.creator.url, "https://example.org");
  });

  test("an agent SKILL.md written without the SharePoint switch opens with it on when links exist", () => {
    const head = "---\nname: old\ndescription: d\nmetadata:\n  agentprise-kind: agent\n  sharepoint-sources: ";
    const withLinks = engine.imports.skillMd(head + "https://example.sharepoint.com/sites/a\n---\nbody");
    assert.equal(withLinks.project.items[0].kind, "agent");
    assert.equal(withLinks.project.items[0].copilot.sharepoint, true);
    const withoutLinks = engine.imports.skillMd(head + "\"\"\n---\nbody");
    assert.equal(withoutLinks.project.items[0].copilot.sharepoint, false);
    const moved = engine.imports.skillMd(head + "https://teams.microsoft.com/l/chat/19:abc@thread.v2\n---\nbody");
    assert.equal(moved.project.items[0].copilot.sharepoint, false);
    assert.ok(moved.notices.some((n) => n.includes("Teams chats under Teams messages")));
  });

  test("a non-default license writes a short notice", async () => {
    const agent = sampleAgent(engine);
    agent.license = "MIT";
    const project = projectOf(agent);
    const { entries } = await engine.exports.skillZip(project, project.items[0], "claude");
    const license = decode(entries.find((e) => e.name === "caveman/LICENSE.txt").bytes);
    assert.ok(license.includes("MIT"));
    assert.ok(!license.includes("GNU GENERAL PUBLIC LICENSE"));
    // The backup keeps the license in the project record.
    const backup = await engine.exports.backup(project);
    const fromBackup = await engine.imports.any(backup.fileName, backup.bytes);
    assert.equal(fromBackup.project.license, "MIT");
  });

  test("re-importing the skill ZIP of an agent keeps a non-default license", async () => {
    const agent = sampleAgent(engine);
    agent.license = "MIT";
    const project = projectOf(agent);
    const { fileName, bytes } = await engine.exports.skillZip(project, project.items[0], "gemini");
    const back = await engine.imports.any(fileName, bytes);
    assert.equal(back.project.license, "MIT");
    assert.equal(viewOf(back.project).license, "MIT");
  });

  test("imports a SKILL.md at the root and inside a folder as a skill", async () => {
    const skill = "---\nname: helper\ndescription: Helps.\n---\n\nDo helpful things.\n";
    const root = engine.zip.write([{ name: "SKILL.md", bytes: encode(skill) }, { name: "icon.png", bytes: makePng(64, 64) }]);
    const nested = engine.zip.write([{ name: "helper/SKILL.md", bytes: encode(skill) }, { name: "helper/icon.png", bytes: makePng(64, 64) }]);
    for (const bytes of [root, nested]) {
      assert.equal(engine.detectFormat("helper.zip", bytes), "skillZip");
      const { project, error, notices } = await engine.imports.any("helper.zip", bytes);
      assert.equal(error, undefined);
      assert.deepEqual(notices, [NO_LICENSE_NOTICE]);
      assert.equal(project.license, "Not stated");
      const item = project.items[0];
      assert.equal(item.kind, "skill");
      assert.equal(item.name, "Helper");
      assert.equal(item.skillName, "helper");
      assert.equal(item.description, "Helps.");
      assert.equal(item.body, "Do helpful things.");
      // A skill's own picture is kept for the backup under a name the app does not reserve.
      assert.deepEqual(project.unrecognized.map((u) => u.path), ["skills/helper/assets/icon.png"]);
    }
  });

  test("a single SKILL.md opens on its own, by name or through the any importer", async () => {
    const text = "---\nname: helper\ndescription: Helps.\n---\n\nDo helpful things.\n";
    assert.equal(engine.detectFormat("SKILL.md", encode(text)), "skillMd");
    const viaAny = await engine.imports.any("SKILL.md", encode(text));
    assert.equal(viaAny.format, "skillMd");
    assert.deepEqual(viaAny.notices, [NO_LICENSE_NOTICE]);
    const licensed = engine.imports.skillMd("---\nname: helper\ndescription: Helps.\nlicense: MIT\n---\n\nDo helpful things.\n");
    assert.deepEqual(licensed.notices, []);
    assert.equal(licensed.project.license, "MIT");
    const direct = engine.imports.skillMd(text);
    assert.deepEqual(engine.project.record(direct.project).items.map((i) => [i.kind, i.name, i.body]), [["skill", "Helper", "Do helpful things."]]);
    assert.equal(viaAny.project.items[0].body, "Do helpful things.");
  });

  test("unknown frontmatter fields and bad names load with notices", () => {
    const { project, notices } = engine.imports.skillMd("---\nname: My_Skill\ndescription: d\nauthor: someone\n---\nbody");
    assert.equal(project.items[0].skillName, "my-skill");
    assert.equal(project.items[0].name, "My Skill");
    assert.ok(notices.some((n) => n.includes("\"author\"")));
    assert.ok(notices.some((n) => n.includes("my-skill")));
    const nameless = engine.imports.skillMd("no frontmatter here");
    assert.ok(nameless.notices.some((n) => n.includes("no name")));
  });

  test("a ZIP with several SKILL.md folders becomes one project with a skill each", async () => {
    const bytes = engine.zip.write([
      { name: "a/SKILL.md", bytes: encode("---\nname: a\ndescription: A.\n---\nA body") },
      { name: "b/SKILL.md", bytes: encode("---\nname: b\ndescription: B.\n---\nB body") },
      { name: "b/references/r.txt", bytes: encode("r") },
      { name: "loose.txt", bytes: encode("l") },
    ]);
    assert.equal(engine.detectFormat("many.zip", bytes), "skillZip");
    const { project, notices } = engine.imports.skillArchive(await engine.zip.read(bytes));
    assert.deepEqual(notices, [NO_LICENSE_NOTICE]);
    assert.deepEqual(project.items.map((i) => [i.kind, i.skillName, i.body, i.files.map((f) => f.path)]), [["skill", "a", "A body", []], ["skill", "b", "B body", ["references/r.txt"]]]);
    // A file outside every skill folder is kept for the backup only.
    assert.deepEqual(project.unrecognized.map((u) => u.path), ["loose.txt"]);
  });

  test("the plain skill carries only standard fields and no picture or sidecar", async () => {
    const agent = sampleAgent(engine);
    const project = projectOf(agent);
    const { fileName, entries, report } = await engine.exports.plainSkill(project, project.items[0]);
    assert.equal(fileName, "Caveman.skill.zip");
    assert.deepEqual(report.map((e) => [e.component, e.status]), [["Caveman", "transformed"]]);
    assert.deepEqual(entries.map((e) => e.name), ["caveman/SKILL.md", "caveman/LICENSE.txt", "caveman/README.md", "caveman/references/notes.txt"]);
    const { data, body } = engine.yaml.parseFrontmatter(decode(entries[0].bytes));
    assert.deepEqual(Object.keys(data), ["name", "description", "license"]);
    assert.equal(data.name, "caveman");
    // Without a sidecar nothing marks the text as composed, so the Persona prefix stays on re-import.
    assert.equal(data.description, "Persona: " + agent.description);
    assert.equal(body.trim(), agent.instructions);
    // It still opens here, as any standard skill does, but as a skill without the extras.
    const result = await engine.imports.any(fileName, engine.zip.write(entries));
    assert.equal(result.error, undefined);
    const item = result.project.items[0];
    assert.equal(item.kind, "skill");
    assert.equal(item.name, "Caveman");
    assert.equal(item.body, agent.instructions);
    assert.equal(viewOf(result.project).icon, null);
    assert.deepEqual(viewOf(result.project).starters, []);
  });

  test("a ZIP without SKILL.md is rejected with a message", async () => {
    const bytes = engine.zip.write([{ name: "readme.txt", bytes: encode("hi") }]);
    assert.ok(engine.imports.skillArchive(await engine.zip.read(bytes)).error.includes("SKILL.md"));
    assert.ok((await engine.imports.any("other.zip", bytes)).error);
    assert.ok((await engine.imports.any("notzip.zip", encode("plain text file that is not a zip"))).error);
  });
});

describe("Teams app package", () => {
  test("export writes the four Microsoft files with strict schemas", async () => {
    const agent = sampleAgent(engine);
    const { fileName, bytes, warnings, appId } = await engine.formats.teamsZip.export(agent, teamsIcons());
    assert.equal(fileName, "Caveman Copilot app.zip");
    assert.match(appId, /^[0-9a-f-]{36}$/);
    assert.equal(agent.copilot.appId, appId);
    const welcomeWarnings = warnings.filter((w) => w.includes("welcome"));
    assert.equal(welcomeWarnings.length, 1);
    const entries = await engine.zip.read(bytes);
    assert.deepEqual([...entries.keys()], ["manifest.json", "declarativeAgent_0.json", "color.png", "outline.png", "notes.txt"]);
    const manifest = JSON.parse(decode(entries.get("manifest.json")));
    const allowed = ["version", "id", "developer", "name", "description", "icons", "accentColor", "validDomains", "$schema", "manifestVersion", "copilotAgents"];
    assert.deepEqual(Object.keys(manifest).filter((k) => !allowed.includes(k)), []);
    assert.equal(manifest.manifestVersion, "1.28");
    assert.equal(manifest.id, appId);
    assert.equal(manifest.developer.name, "Example Creator");
    assert.equal(manifest.copilotAgents.declarativeAgents[0].file, "declarativeAgent_0.json");
    const declarative = JSON.parse(decode(entries.get("declarativeAgent_0.json")));
    assert.equal(declarative.version, "v1.8");
    // The order the Copilot app wrote in its own export on 2026-10-10.
    assert.deepEqual(declarative.capabilities.map((c) => c.name), ["WebSearch", "OneDriveAndSharePoint", "TeamsMessages", "Email", "Meetings", "GraphicArt"]);
    assert.deepEqual(declarative.capabilities[0].sites, [{ url: "https://example.org" }, { url: "https://example.net/docs/guide" }]);
    // The schema allows only ids under items_by_sharepoint_ids and only url under items_by_url.
    assert.deepEqual(declarative.capabilities[1].items_by_sharepoint_ids, [{ site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444" }]);
    assert.deepEqual(declarative.capabilities[1].items_by_url, [{ url: "https://example.sharepoint.com/sites/team" }, { url: agent.sharepointLinks[0] }, { url: agent.sharepointLinks[1] }]);
    assert.deepEqual(declarative.capabilities[2].urls, agent.copilot.teamsLinks.map((url) => ({ url })));
    assert.deepEqual(declarative.capabilities[3], { name: "Email", shared_mailbox: "front-desk@example.org", group_mailboxes: ["lab-team@example.org"], folders: [{ folder_id: "inbox" }] });
    assert.deepEqual(declarative.capabilities[4].items_by_id, [{ id: "AAMkAGExampleMeetingId0123456789==", is_series: true }]);
    assert.equal(decode(entries.get("notes.txt")), "Lab notes for the demo.");
    assert.deepEqual(declarative.behavior_overrides, { special_instructions: { discourage_model_knowledge: true }, default_response_mode: "Think deeper" });
    assert.equal(declarative.conversation_starters.length, 3);
    assert.equal("welcome" in declarative, false);
    assert.equal("_license" in declarative, false);
  });

  test("keeps the same app id on a second export", async () => {
    const agent = sampleAgent(engine);
    const first = await engine.formats.teamsZip.export(agent, teamsIcons());
    const second = await engine.formats.teamsZip.export(agent, teamsIcons());
    assert.equal(first.appId, second.appId);
  });

  test("blank creator fields become placeholders with one warning", async () => {
    const agent = sampleAgent(engine);
    agent.creator = { name: "", website: "", privacy: "", terms: "" };
    agent.copilot.preferMyFiles = false;
    agent.copilot.responseMode = "Auto";
    const { bytes, warnings } = await engine.formats.teamsZip.export(agent, teamsIcons());
    assert.equal(warnings.filter((w) => w.includes("Placeholder")).length, 1);
    const entries = await engine.zip.read(bytes);
    const manifest = JSON.parse(decode(entries.get("manifest.json")));
    assert.equal(manifest.developer.websiteUrl, "https://example.com");
    const declarative = JSON.parse(decode(entries.get("declarativeAgent_0.json")));
    assert.equal("behavior_overrides" in declarative, false);
  });

  test("round trips every field except welcome", async () => {
    const agent = sampleAgent(engine);
    const { bytes } = await engine.formats.teamsZip.export(agent, teamsIcons());
    const result = await engine.formats.teamsZip.import(bytes);
    assert.equal(result.error, undefined);
    const expected = agentFields(agent);
    expected.welcome = "";
    expected.copyright = "";
    expected.icon = Array.from(teamsIcons().color);
    // The package keeps only the schema's keys: a site by URL comes back as a typed link, a file by ID keeps its ids.
    expected.sharepointLinks = ["https://example.sharepoint.com/sites/team"].concat(agent.sharepointLinks);
    expected.sharepointItems = [{ by: "id", site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444" }];
    assert.deepEqual(agentFields(result.agent), expected);
    assert.ok(result.notices.some((n) => n.includes("welcome")));
  });

  test("a package carries attached files at the root and reports files it cannot use", async () => {
    const agent = sampleAgent(engine);
    agent.files = [];
    const { bytes } = await engine.formats.teamsZip.export(agent, teamsIcons());
    const entries = await engine.zip.read(bytes);
    const list = [...entries].map(([name, data]) => ({ name, bytes: data }));
    list.push({ name: "guide.pdf", bytes: encode("%PDF-1.4 demo") }, { name: "tool.exe", bytes: encode("MZ") }, { name: "en.json", bytes: encode("{}") }, { name: "fake.pdf", bytes: BYTE_SHAPES.windows });
    const result = await engine.formats.teamsZip.import(engine.zip.write(list));
    assert.deepEqual(result.agent.files.map((f) => f.name), ["guide.pdf"]);
    assert.ok(result.notices.some((n) => n.includes("tool.exe") && !n.includes("en.json")));
    assert.ok(result.notices.some((n) => n.includes("fake.pdf (it is a Windows program)")));
    const again = await engine.formats.teamsZip.export(result.agent, teamsIcons());
    assert.equal(decode((await engine.zip.read(again.bytes)).get("guide.pdf")), "%PDF-1.4 demo");
  });

  test("a script goes out as .txt under its own name and comes back with its real name", async () => {
    const agent = sampleAgent(engine);
    agent.files = [{ name: "deploy.ps1", bytes: encode("Write-Host 'hi'") }, { name: "notes.txt", bytes: encode("plain") }];
    const { bytes } = await engine.formats.teamsZip.export(agent, teamsIcons());
    const entries = await engine.zip.read(bytes);
    assert.deepEqual([...entries.keys()].slice(4), ["deploy.ps1.txt", "notes.txt"]);
    assert.equal(decode(entries.get("deploy.ps1.txt")), "Write-Host 'hi'");
    const back = await engine.formats.teamsZip.import(bytes);
    assert.deepEqual(back.agent.files.map((f) => f.name), ["deploy.ps1", "notes.txt"]);
    const project = projectOf(back.agent);
    const skillZip = await engine.exports.skillZip(project, project.items[0], "claude");
    assert.ok(skillZip.entries.some((e) => e.name === "caveman/references/deploy.ps1"));
    const backup = await engine.exports.backup(project);
    assert.ok(backup.entries.some((e) => e.name === "caveman/skills/caveman/references/deploy.ps1"));
  });

  test("the SharePoint switch decides whether the package lists OneDriveAndSharePoint", async () => {
    const agent = sampleAgent(engine);
    agent.sharepointLinks = [];
    agent.sharepointItems = [];
    const entryOf = async (built) => JSON.parse(decode((await engine.zip.read(built.bytes)).get("declarativeAgent_0.json"))).capabilities.find((c) => c.name === "OneDriveAndSharePoint");
    agent.copilot.sharepoint = false;
    assert.equal(await entryOf(await engine.formats.teamsZip.export(agent, teamsIcons())), undefined);
    assert.equal((await engine.formats.teamsZip.import((await engine.formats.teamsZip.export(agent, teamsIcons())).bytes)).agent.copilot.sharepoint, false);
    agent.copilot.sharepoint = true;
    assert.deepEqual(await entryOf(await engine.formats.teamsZip.export(agent, teamsIcons())), { name: "OneDriveAndSharePoint" });
    assert.equal((await engine.formats.teamsZip.import((await engine.formats.teamsZip.export(agent, teamsIcons())).bytes)).agent.copilot.sharepoint, true);
    agent.sharepointLinks = ["https://example-my.sharepoint.com/:f:/g/personal/someone/folder"];
    assert.deepEqual(await entryOf(await engine.formats.teamsZip.export(agent, teamsIcons())), { name: "OneDriveAndSharePoint", items_by_url: [{ url: agent.sharepointLinks[0] }] });
  });

  test("imports the shape the Copilot app exported on 2026-10-10 without losing a source", async () => {
    // A synthetic copy of a real export: made-up ids, every list the app wrote, and the null values it uses for unscoped lists.
    const declarative = {
      version: "v1.8",
      id: "0a95bfd2-3fda-451a-8344-95443dcd5297.gpt.11111111-1111-4111-8111-111111111111",
      actions: [],
      conversation_starters: [],
      name: "Test Agent",
      description: "Set to think deeper, with links and a file.",
      instructions: "Be friendly and helpful.",
      behavior_overrides: { special_instructions: null, default_response_mode: "Think deeper" },
      capabilities: [
        { name: "WebSearch", sites: [{ url: "https://example.org/" }] },
        { name: "OneDriveAndSharePoint", items_by_sharepoint_ids: [{ site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444" }], items_by_url: [], additional_search_terms: null },
        { name: "TeamsMessages", urls: [{ url: "https://teams.microsoft.com/l/team/19:abc@thread.tacv2/General?groupId=55555555-5555-4555-8555-555555555555" }, { url: "https://teams.microsoft.com/l/chat/19:meeting_abc@thread.v2" }] },
        { name: "Email", group_mailboxes: ["lab-team@example.org"] },
        { name: "Meetings", items_by_id: [{ id: "040000008200E00074C5B7101A82E008000000000000000000000000000000000000000000000000", is_series: true }] },
        { name: "CodeInterpreter" },
        { name: "GraphicArt" },
      ],
    };
    const manifest = { version: "1.0.0", id: "0a95bfd2-3fda-451a-8344-95443dcd5297", developer: { name: "Example", websiteUrl: "https://example.org", privacyUrl: "https://example.org/p", termsOfUseUrl: "https://example.org/t" }, name: { short: "Test Agent", full: "Test Agent" }, description: { short: "s", full: "f" }, icons: { outline: "outline.png", color: "color.png" }, accentColor: "#E0F6FC", validDomains: [], manifestVersion: "1.28", copilotAgents: { declarativeAgents: [{ id: declarative.id, file: "declarativeAgent_0.json" }] } };
    const bytes = engine.zip.write([
      { name: "manifest.json", bytes: encode(JSON.stringify(manifest)) },
      { name: "color.png", bytes: makePng(192, 192) },
      { name: "outline.png", bytes: makePng(32, 32) },
      { name: "declarativeAgent_0.json", bytes: encode(JSON.stringify(declarative)) },
      { name: "TestFile.txt", bytes: encode("abc\ndef") },
    ]);
    const { agent, notices } = await engine.formats.teamsZip.import(bytes);
    assert.deepEqual(notices.filter((n) => !n.includes("welcome")), []);
    assert.equal(agent.copilot.responseMode, "Think deeper");
    assert.equal(agent.copilot.preferMyFiles, false);
    assert.equal(agent.copilot.sharepoint, true);
    assert.deepEqual(agent.copilot.webSites, ["https://example.org/"]);
    assert.deepEqual(agent.copilot.teamsLinks, declarative.capabilities[2].urls.map((u) => u.url));
    assert.deepEqual(agent.copilot.mailboxes, ["lab-team@example.org"]);
    assert.equal(agent.copilot.sharedMailbox, "");
    assert.deepEqual(agent.copilot.meetingItems, declarative.capabilities[4].items_by_id);
    assert.deepEqual(agent.copilot.emailFolders, []);
    assert.equal(agent.sharepointItems.length, 1);
    assert.deepEqual(agent.files.map((f) => f.name), ["TestFile.txt"]);
    // A null list means an unscoped source, which is how the app writes TeamsMessages when no chat is chosen.
    declarative.capabilities[2].urls = null;
    const nullList = await engine.formats.teamsZip.import(engine.zip.write([{ name: "declarativeAgent_0.json", bytes: encode(JSON.stringify(declarative)) }]));
    assert.equal(nullList.agent.copilot.teamsMessages, true);
    assert.deepEqual(nullList.agent.copilot.teamsLinks, []);
    assert.deepEqual(nullList.notices.filter((n) => !n.includes("welcome") && !n.includes("icon")), []);
  });

  test("a package leaves out a file Copilot does not accept and says so", async () => {
    const agent = sampleAgent(engine);
    agent.files = [{ name: "notes.one", bytes: BYTE_SHAPES.onenote }, { name: "page.onepart", bytes: BYTE_SHAPES.onenote }, { name: "deploy.ps1", bytes: encode("Write-Host 'hi'") }];
    const { bytes, warnings } = await engine.formats.teamsZip.export(agent, teamsIcons());
    const entries = await engine.zip.read(bytes);
    assert.deepEqual([...entries.keys()].slice(4), ["page.onepart", "deploy.ps1.txt"]);
    assert.ok(warnings.some((w) => w.includes("notes.one") && w.includes("can't include")));
    const project = projectOf(agent);
    const skillZip = await engine.zip.read((await engine.exports.skillZip(project, project.items[0], "claude")).bytes);
    assert.ok(skillZip.has("caveman/references/notes.one"));
  });

  test("placeholder creator values import as blank", async () => {
    const agent = sampleAgent(engine);
    agent.creator = { name: "", website: "", privacy: "", terms: "" };
    const { bytes } = await engine.formats.teamsZip.export(agent, teamsIcons());
    const { agent: back } = await engine.formats.teamsZip.import(bytes);
    assert.deepEqual(back.creator, { name: "", website: "", privacy: "", terms: "" });
  });

  test("rejects a package without the declarative agent file", async () => {
    const bytes = engine.zip.write([{ name: "manifest.json", bytes: encode("{}") }]);
    const result = await engine.formats.teamsZip.import(bytes);
    assert.ok(result.error.includes("declarativeAgent_0.json"));
  });

  test("refuses wrong icon sizes", async () => {
    const agent = sampleAgent(engine);
    await assert.rejects(engine.formats.teamsZip.export(agent, { color: makePng(100, 100), outline: makePng(32, 32) }), /192 by 192/);
  });
});

describe("copy text and detection", () => {
  test("copy text has every field and a Markdown document", () => {
    const agent = sampleAgent(engine);
    const copy = engine.formats.copyText.export(agent);
    assert.equal(copy.name, "Caveman");
    assert.equal(copy.starters.split("\n").length, 3);
    assert.ok(copy.markdown.startsWith("# Caveman\n\nMe agent"));
    assert.ok(copy.markdown.includes("## Conversation starters\n\n- Caveman, what can you do?"));
    assert.equal(copy.fileName, "Caveman.md");
    // The project writer gives the same text for the agent item.
    const project = projectOf(agent);
    const fromProject = engine.exports.copyText(project, project.items[0], "notebook");
    assert.equal(fromProject.markdown, copy.markdown);
    // Copied text cannot carry the attached file, so the installer adds it by hand.
    assert.deepEqual(fromProject.report, [{ component: "Attached files", status: "requires-setup", note: "Copied text can't include files. Add them to the notebook yourself." }]);
    const chatgpt = engine.exports.copyText(project, project.items[0], "chatgpt");
    assert.equal(chatgpt.instructions, agent.instructions);
    assert.ok(chatgpt.report[0].note.includes("ChatGPT project"));
  });

  test("detectFormat picks the right importer", async () => {
    const agent = sampleAgent(engine);
    const project = projectOf(agent);
    const backup = await engine.exports.backup(project);
    const skillZip = await engine.exports.skillZip(project, project.items[0], "claude");
    const plain = await engine.exports.plainSkill(project, project.items[0]);
    const teams = await engine.formats.teamsZip.export(agent, teamsIcons());
    assert.equal(engine.detectFormat("Caveman.agent", encode("{}")), "msAgent");
    assert.equal(engine.detectFormat("SKILL.md", encode("---")), "skillMd");
    assert.equal(engine.detectFormat("notes.MD", encode("---")), "skillMd");
    assert.equal(engine.detectFormat(backup.fileName, backup.bytes), "plugin");
    assert.equal(engine.detectFormat("caveman.zip", skillZip.bytes), "skillZip");
    assert.equal(engine.detectFormat("caveman.zip", plain.bytes), "skillZip");
    assert.equal(engine.detectFormat("Caveman.zip", teams.bytes), "teamsZip");
    assert.equal(engine.detectFormat("other.zip", engine.zip.write([{ name: "a.txt", bytes: encode("x") }])), "unknown");
    assert.equal(engine.detectFormat("photo.jpg", new Uint8Array([0xff, 0xd8])), "unknown");
    assert.equal(engine.detectFormat("export.json", encode("{\"schemaVersion\":\"0.2.0\",\"customCopilotConfig\":{}}")), "msAgent");
    assert.equal(engine.detectFormat("broken.zip", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])), "unknown");
    // Each detected format opens through the same importer the app uses for a dropped file.
    for (const [name, bytes, format] of [[backup.fileName, backup.bytes, "plugin"], ["caveman.zip", skillZip.bytes, "skillZip"], ["Caveman.zip", teams.bytes, "teamsZip"], ["Caveman.agent", encode(engine.formats.msAgent.export(agent).text), "msAgent"]]) {
      const opened = await engine.imports.any(name, bytes);
      assert.equal(opened.error, undefined, name);
      assert.equal(opened.format, format);
      assert.equal(opened.project.items[0].name, "Caveman");
    }
  });

  test("full round trip across every lossless format", async () => {
    const original = sampleAgent(engine);
    const project = projectOf(original);
    assert.deepEqual(agentFields(viewOf(project)), agentFields(original));
    const backupOf = async (p) => {
      const written = await engine.exports.backup(p);
      const opened = await engine.imports.any(written.fileName, written.bytes);
      assert.equal(opened.error, undefined);
      assert.equal(opened.format, "plugin");
      return opened.project;
    };
    const fromBackup = await backupOf(project);
    assert.deepEqual(agentFields(viewOf(fromBackup)), agentFields(original));
    // The .agent file carries everything but attached files.
    const msText = engine.exports.msAgent(fromBackup, fromBackup.items[0]).text;
    const fromMs = await engine.imports.any("Caveman.agent", encode(msText));
    assert.equal(fromMs.format, "msAgent");
    const fromBackup2 = await backupOf(fromMs.project);
    const withoutFiles = agentFields(original);
    withoutFiles.files = [];
    assert.deepEqual(agentFields(viewOf(fromBackup2)), withoutFiles);
    // The package carries the files but only the schema's keys for each SharePoint item.
    const teams = await engine.exports.teamsPackage(fromBackup, fromBackup.items[0], { color: original.icon.bytes, outline: makePng(32, 32) });
    assert.equal(fromBackup.items[0].copilot.appId, teams.appId, "the package's app id is stored on the item");
    const fromTeams = await engine.imports.any("Caveman Copilot app.zip", teams.bytes);
    assert.equal(fromTeams.format, "teamsZip");
    const final = await backupOf(fromTeams.project);
    const expected = agentFields(original);
    expected.welcome = "";
    expected.copyright = "";
    expected.license = "Not stated";
    expected.copilot = { ...expected.copilot, appId: teams.appId };
    expected.sharepointLinks = [original.sharepointItems[1].url].concat(original.sharepointLinks);
    expected.sharepointItems = [{ by: "id", site_id: original.sharepointItems[0].site_id, web_id: original.sharepointItems[0].web_id, list_id: original.sharepointItems[0].list_id, unique_id: original.sharepointItems[0].unique_id }];
    assert.deepEqual(agentFields(viewOf(final)), expected);
    assert.ok(teams.warnings.some((w) => w.includes("copyright")));
  });
});
