// This file is part of Agentprise
// tests/formats.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-10
// Summary: Tests for the format converters inside index.html: the Agent Skill
//          bundle, the Microsoft .agent file, the Teams app package, copy-ready
//          text, format detection, and full round trips between them.
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
import { makePng, sampleAgent, agentFields } from "./helpers.mjs";

const engine = loadEngine();
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const teamsIcons = () => ({ color: makePng(192, 192), outline: makePng(32, 32, [255, 255, 255, 255]) });

describe("Microsoft .agent", () => {
  test("export has the documented key order and shape", () => {
    const agent = sampleAgent(engine);
    const { fileName, text, warnings } = engine.formats.msAgent.export(agent);
    assert.equal(fileName, "Caveman.agent");
    assert.deepEqual(warnings, ["The Teams Chat file can't carry attached files, so they were left out."]);
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
    assert.deepEqual(capabilities.map((c) => c.name), ["WebSearch", "Email", "Meetings", "GraphicArt", "OneDriveAndSharePoint"]);
    assert.deepEqual(capabilities[0].sites, [{ url: "https://example.org" }, { url: "https://example.net/docs/guide" }]);
    // Items keep every field in the SharePoint builder's key order; typed links follow as url-only entries.
    assert.deepEqual(Object.keys(capabilities[4].items_by_sharepoint_ids[0]), ["url", "name", "site_id", "web_id", "list_id", "unique_id", "type"]);
    assert.equal(capabilities[4].items_by_sharepoint_ids[0].type, "File");
    assert.equal(capabilities[4].items_by_url.length, 3);
    assert.equal(capabilities[4].items_by_url[0].name, "Team site");
    assert.deepEqual(capabilities[4].items_by_url[1], { url: agent.sharepointLinks[0] });
    assert.equal(config.gptDefinition.behavior_overrides.special_instructions.discourage_model_knowledge, true);
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
    assert.deepEqual(notices, []);
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

  test("a SharePoint-made file that lists no switch opens with web search on and personal sources off", () => {
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
    const { agent } = engine.formats.msAgent.import(text);
    assert.equal(agent.copilot.webSearch, true);
    assert.equal(agent.copilot.teamsMessages, false);
    assert.equal(agent.copilot.meetings, false);
    assert.equal(agent.copilot.codeInterpreter, false);
    assert.equal(agent.copilot.preferMyFiles, true);
    // Writing it back lists WebSearch, so the file keeps the web in a Teams chat.
    const doc = JSON.parse(engine.formats.msAgent.export(agent).text);
    assert.deepEqual(doc.customCopilotConfig.gptDefinition.capabilities.map((c) => c.name), ["WebSearch", "OneDriveAndSharePoint"]);
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

describe("Agent Skill bundle", () => {
  test("export writes the four files in one skill folder", async () => {
    const agent = sampleAgent(engine);
    const { fileName, bytes, warnings, skillName } = await engine.formats.bundle.export(agent);
    assert.equal(fileName, "Caveman.zip");
    assert.equal(skillName, "caveman");
    assert.equal(warnings.length, 0);
    const entries = await engine.zip.read(bytes);
    assert.deepEqual([...entries.keys()], ["caveman/SKILL.md", "caveman/icon.png", "caveman/LICENSE.txt", "caveman/README.md", "caveman/references/notes.txt"]);
    const skillMd = decode(entries.get("caveman/SKILL.md"));
    assert.ok(skillMd.startsWith("---\nname: caveman\n"));
    const { data, body } = engine.yaml.parseFrontmatter(skillMd);
    assert.equal(data.description, agent.description);
    assert.equal(data.license, "GPL-3.0-or-later. See LICENSE.txt.");
    for (const value of Object.values(data.metadata)) {
      assert.equal(typeof value, "string");
    }
    assert.equal(data.metadata["display-name"], "Caveman");
    assert.equal(data.metadata["copilot-prefer-my-files"], "true");
    assert.equal(data.metadata["copilot-email"], "true");
    assert.equal(data.metadata["copilot-web-sites"], "https://example.org\nhttps://example.net/docs/guide");
    assert.deepEqual(JSON.parse(data.metadata["sharepoint-items"]), agent.sharepointItems);
    assert.equal(body.trim(), agent.instructions);
    assert.ok(decode(entries.get("caveman/LICENSE.txt")).includes("GNU GENERAL PUBLIC LICENSE"));
    assert.ok(decode(entries.get("caveman/README.md")).startsWith("<!--\nCaveman\n"));
  });

  test("round trips every field", async () => {
    const agent = sampleAgent(engine);
    const { bytes } = await engine.formats.bundle.export(agent);
    const result = await engine.formats.bundle.import(bytes);
    assert.equal(result.error, undefined);
    assert.deepEqual(agentFields(result.agent), agentFields(agent));
  });

  test("attached files travel under references and other files there are reported", async () => {
    const agent = sampleAgent(engine);
    const { bytes } = await engine.formats.bundle.export(agent);
    const entries = await engine.zip.read(bytes);
    assert.equal(decode(entries.get("caveman/references/notes.txt")), "Lab notes for the demo.");
    assert.ok(decode(entries.get("caveman/README.md")).includes("notes.txt"));
    const skill = engine.zip.write([
      { name: "x/SKILL.md", bytes: encode("---\nname: x\ndescription: A skill\n---\nDo things.\n") },
      { name: "x/references/readme.md", bytes: encode("# notes") },
      { name: "x/references/data.txt", bytes: encode("rows") },
      { name: "x/references/deep/more.txt", bytes: encode("ignored") },
    ]);
    const result = await engine.formats.bundle.import(skill);
    assert.deepEqual(result.agent.files.map((f) => f.name), ["data.txt"]);
    assert.ok(result.notices.some((n) => n.includes("readme.md")));
  });

  test("non-default license writes a short notice", async () => {
    const agent = sampleAgent(engine);
    agent.license = "MIT";
    const { bytes } = await engine.formats.bundle.export(agent);
    const entries = await engine.zip.read(bytes);
    const license = decode(entries.get("caveman/LICENSE.txt"));
    assert.ok(license.includes("MIT"));
    assert.ok(!license.includes("GNU GENERAL PUBLIC LICENSE"));
    const back = await engine.formats.bundle.import(bytes);
    assert.equal(back.agent.license, "MIT");
  });

  test("imports a SKILL.md at the root and inside a folder", async () => {
    const skill = "---\nname: helper\ndescription: Helps.\n---\n\nDo helpful things.\n";
    const root = engine.zip.write([{ name: "SKILL.md", bytes: encode(skill) }, { name: "icon.png", bytes: makePng(64, 64) }]);
    const nested = engine.zip.write([{ name: "helper/SKILL.md", bytes: encode(skill) }, { name: "helper/icon.png", bytes: makePng(64, 64) }]);
    for (const bytes of [root, nested]) {
      const { agent, error } = await engine.formats.bundle.import(bytes);
      assert.equal(error, undefined);
      assert.equal(agent.name, "Helper");
      assert.equal(agent.description, "Helps.");
      assert.equal(agent.instructions, "Do helpful things.");
      assert.ok(agent.icon);
    }
  });

  test("unknown frontmatter fields and bad names load with notices", () => {
    const text = "---\nname: My_Skill\ndescription: d\nauthor: someone\n---\nbody";
    const { agent, notices } = engine.formats.skillMd.import(text);
    assert.equal(agent.name, "My_Skill");
    assert.ok(notices.some((n) => n.includes("\"author\"")));
    assert.ok(notices.some((n) => n.includes("my-skill")));
  });

  test("a ZIP without SKILL.md is rejected with a message", async () => {
    const bytes = engine.zip.write([{ name: "readme.txt", bytes: encode("hi") }]);
    const result = await engine.formats.bundle.import(bytes);
    assert.ok(result.error.includes("SKILL.md"));
    const notZip = await engine.formats.bundle.import(encode("plain text file that is not a zip"));
    assert.ok(notZip.error);
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
    assert.deepEqual(declarative.capabilities.map((c) => c.name), ["WebSearch", "Email", "Meetings", "GraphicArt", "OneDriveAndSharePoint"]);
    assert.deepEqual(declarative.capabilities[0].sites, [{ url: "https://example.org" }, { url: "https://example.net/docs/guide" }]);
    // The schema allows only ids under items_by_sharepoint_ids and only url under items_by_url.
    assert.deepEqual(declarative.capabilities[4].items_by_sharepoint_ids, [{ site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444" }]);
    assert.deepEqual(declarative.capabilities[4].items_by_url, [{ url: "https://example.sharepoint.com/sites/team" }, { url: agent.sharepointLinks[0] }, { url: agent.sharepointLinks[1] }]);
    assert.equal(decode(entries.get("notes.txt")), "Lab notes for the demo.");
    assert.equal(declarative.behavior_overrides.special_instructions.discourage_model_knowledge, true);
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
    list.push({ name: "guide.pdf", bytes: encode("%PDF-1.4 demo") }, { name: "tool.exe", bytes: encode("MZ") }, { name: "en.json", bytes: encode("{}") });
    const result = await engine.formats.teamsZip.import(engine.zip.write(list));
    assert.deepEqual(result.agent.files.map((f) => f.name), ["guide.pdf"]);
    assert.ok(result.notices.some((n) => n.includes("tool.exe") && !n.includes("en.json")));
    const again = await engine.formats.teamsZip.export(result.agent, teamsIcons());
    assert.equal(decode((await engine.zip.read(again.bytes)).get("guide.pdf")), "%PDF-1.4 demo");
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
  });

  test("detectFormat picks the right importer", async () => {
    const agent = sampleAgent(engine);
    const bundle = await engine.formats.bundle.export(agent);
    const teams = await engine.formats.teamsZip.export(agent, teamsIcons());
    assert.equal(engine.detectFormat("Caveman.agent", encode("{}")), "msAgent");
    assert.equal(engine.detectFormat("SKILL.md", encode("---")), "skillMd");
    assert.equal(engine.detectFormat("caveman.zip", bundle.bytes), "bundle");
    assert.equal(engine.detectFormat("Caveman.zip", teams.bytes), "teamsZip");
    assert.equal(engine.detectFormat("other.zip", engine.zip.write([{ name: "a.txt", bytes: encode("x") }])), "unknown");
    assert.equal(engine.detectFormat("photo.jpg", new Uint8Array([0xff, 0xd8])), "unknown");
    assert.equal(engine.detectFormat("export.json", encode("{\"schemaVersion\":\"0.2.0\",\"customCopilotConfig\":{}}")), "msAgent");
  });

  test("full round trip across every lossless format", async () => {
    const original = sampleAgent(engine);
    const bundle1 = await engine.formats.bundle.export(original);
    const fromBundle = (await engine.formats.bundle.import(bundle1.bytes)).agent;
    assert.deepEqual(agentFields(fromBundle), agentFields(original));
    // The .agent file carries everything but attached files.
    const msText = engine.formats.msAgent.export(fromBundle).text;
    const fromMs = engine.formats.msAgent.import(msText).agent;
    const bundle2 = await engine.formats.bundle.export(fromMs);
    const fromBundle2 = (await engine.formats.bundle.import(bundle2.bytes)).agent;
    const withoutFiles = agentFields(original);
    withoutFiles.files = [];
    assert.deepEqual(agentFields(fromBundle2), withoutFiles);
    // The package carries the files but only the schema's keys for each SharePoint item.
    const teams = await engine.formats.teamsZip.export(fromBundle, { color: original.icon.bytes, outline: makePng(32, 32) });
    const fromTeams = (await engine.formats.teamsZip.import(teams.bytes)).agent;
    const bundle3 = await engine.formats.bundle.export(fromTeams);
    const final = (await engine.formats.bundle.import(bundle3.bytes)).agent;
    const expected = agentFields(original);
    expected.welcome = "";
    expected.copyright = "";
    expected.copilot = { ...expected.copilot, appId: teams.appId };
    expected.sharepointLinks = [original.sharepointItems[1].url].concat(original.sharepointLinks);
    expected.sharepointItems = [{ by: "id", site_id: original.sharepointItems[0].site_id, web_id: original.sharepointItems[0].web_id, list_id: original.sharepointItems[0].list_id, unique_id: original.sharepointItems[0].unique_id }];
    assert.deepEqual(agentFields(final), expected);
    assert.ok(teams.warnings.some((w) => w.includes("copyright")));
  });
});
