// This file is part of Agentprise
// tests/library.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-11
// Summary: Tests for the agent library: the catalog and each backup it lists,
//          opened as a project with the same importer the app uses for
//          dropped files.
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
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { loadEngine, repoRoot } from "./load-engine.mjs";

const engine = loadEngine();
await engine.ready;
const libraryDir = join(repoRoot, "library");
const catalog = JSON.parse(readFileSync(join(libraryDir, "catalog.json"), "utf8"));

// The same rule the page applies to a catalog line: a plain file name ending in .zip.
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}\.zip$/;

/**
 * Opens a catalog entry as a project and returns it with the agent view of its
 * first item, which is the agent for an entry of kind "agent".
 */
async function openEntry(entry) {
  const bytes = new Uint8Array(readFileSync(join(libraryDir, entry.file)));
  assert.equal(engine.detectFormat(entry.file, bytes), "plugin", entry.file + " must be an Agentprise backup");
  const result = await engine.imports.any(entry.file, bytes);
  assert.equal(result.error, undefined, entry.file + ": " + result.error);
  assert.equal(result.format, "plugin");
  const item = result.project.items[0];
  return { project: result.project, item: item, notices: result.notices, agent: item ? engine.project.agentView(result.project, item) : null };
}

// Caveman supplies the publisher details for the original maintainer's entries.
const caveman = (await openEntry(catalog.agents.find((item) => item.file === "caveman.zip"))).agent;
const ENTRY_KINDS = ["agent", "skill", "project"];

describe("library catalog", () => {
  test("carries the license key and well-formed entries", () => {
    assert.equal(Object.keys(catalog)[0], "_license");
    assert.ok(catalog._license.includes("GNU General Public License"));
    assert.ok(Array.isArray(catalog.agents));
    assert.ok(catalog.agents.length >= 1);
    for (const entry of catalog.agents) {
      assert.match(entry.file, FILE_NAME);
      assert.ok(existsSync(join(libraryDir, entry.file)), entry.file + " is missing from library/");
      assert.ok(entry.name.length > 0);
      assert.ok(entry.summary.length > 0);
      assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0);
      assert.ok(entry.author.length > 0);
      assert.ok(entry.license.length > 0);
      assert.ok(ENTRY_KINDS.includes(entry.kind), entry.file + " has an unknown kind");
      assert.ok(Array.isArray(entry.capabilities), entry.file + " must list its tools, even when there are none");
    }
    // Two lines for one file or one name would make the page show the same card twice.
    const files = catalog.agents.map((entry) => entry.file);
    assert.equal(new Set(files).size, files.length, "a file is listed more than once");
    const names = catalog.agents.map((entry) => entry.name);
    assert.equal(new Set(names).size, names.length, "two entries share a name");
  });

  test("every backup opens cleanly and matches its catalog line", async () => {
    for (const entry of catalog.agents) {
      const { project, item, agent, notices } = await openEntry(entry);
      assert.deepEqual(notices, [], entry.file + " must open without notices");
      const fileTexts = project.items.flatMap((each) => each.files.map((file) => ({ itemId: each.id, name: file.path, text: engine.scan.fileText({ name: file.path, bytes: file.bytes }) }))).filter((file) => file.text);
      assert.deepEqual(engine.project.scan(project, fileTexts).map((f) => f.label + ": " + f.patternLabel), [], entry.file + " must not raise sharing warnings");
      if (entry.kind === "agent") {
        assert.equal(project.items.length, 1, entry.file + " must hold exactly one item");
        assert.equal(item.kind, "agent", entry.file + " must hold an agent");
      }
      // The catalog lists the tool ids the entry declares, so cards can show them without opening the file.
      const declared = [...new Set(project.items.flatMap((i) => i.capabilities.map((c) => c.id)))];
      assert.deepEqual(entry.capabilities.slice().sort(), declared.sort(), entry.file + " catalog tools must match the file");
      assert.deepEqual(project.unrecognized, [], entry.file + " must not carry files the app cannot read");
      assert.equal(project.license, entry.license);
      // A backup re-exported and opened again is the same project.
      const again = await engine.exports.backup(project);
      const reopened = await engine.imports.any(again.fileName, again.bytes);
      assert.deepEqual(engine.project.record(reopened.project), engine.project.record(project), entry.file + " must survive a backup round trip");
      assert.equal(agent.name, entry.name);
      assert.equal(agent.description, entry.summary);
      assert.equal(agent.creator.name, entry.author);
      assert.equal(agent.license, entry.license);
      assert.ok(agent.instructions.length > 0);
      if (entry.kind === "skill") {
        // A skill entry is one skill; the assistant rules below apply to assistants only.
        assert.deepEqual(project.items.map((i) => i.kind), ["skill"], entry.file + " must hold one skill");
        assert.ok(item.description.length <= 1024 && item.compatibility.length <= 500, entry.file + " must keep the Agent Skills limits");
        assert.deepEqual(engine.project.validateItem(project, item).problems, []);
        continue;
      }
      assert.equal(item.kind, "agent", entry.file + " must lead with an assistant");
      // Every entry carries the same safety limits: no legal or medical advice, and the 988 Lifeline notice for anyone in crisis.
      assert.ok(agent.instructions.includes("Give no legal or medical advice."), entry.file + " must refuse legal and medical advice");
      assert.ok(agent.instructions.includes("Call or text 988 to reach the 988 Lifeline"), entry.file + " must carry the 988 Lifeline notice");
      assert.ok(agent.instructions.includes("https://chat.988lifeline.org/"), entry.file + " must link the 988 Lifeline chat");
      // No entry reads meetings or files unless the person adds them; chat and web search are the author's choice.
      assert.equal(agent.copilot.webSearch, true, entry.file + " must have web search on");
      assert.equal(agent.copilot.imageGeneration, true, entry.file + " must have image creation on");
      // Community entries retain their own attribution and publisher links.
      if (entry.author === caveman.creator.name) {
        assert.deepEqual(agent.creator, caveman.creator, entry.file + " must carry the same publisher details as Caveman");
      }
      const words = [agent.name, agent.description, agent.welcome, agent.instructions, ...agent.starters].join("\n");
      assert.ok(!/onedrive/i.test(words), entry.file + " must not mention OneDrive");
      assert.equal(agent.copilot.sharepoint, false, entry.file + " must not read SharePoint by default");
      assert.equal(agent.copilot.teamsMessages, false, entry.file + " must not read Teams messages by default");
      assert.equal(agent.copilot.email, false, entry.file + " must not read email by default");
      assert.equal(agent.copilot.meetings, false, entry.file + " must not read meetings by default");
      assert.deepEqual(agent.sharepointLinks, [], entry.file + " must not link files by default");
      assert.deepEqual(engine.validateAgent(agent).problems, []);
      assert.deepEqual(engine.project.validateItem(project, item).problems, []);
      assert.ok(agent.icon, entry.file + " should carry an icon so the card and the Teams package have one");
      const size = engine.png.dimensions(agent.icon.bytes);
      assert.deepEqual([size.width, size.height], [192, 192]);
    }
  });

  test("a catalog line cannot reach outside the library folder", () => {
    for (const bad of ["../index.html", "sub/caveman.zip", "caveman.agent", ".hidden.zip", "C:\\caveman.zip", ""]) {
      assert.equal(FILE_NAME.test(bad), false, bad);
    }
  });
});

describe("community persona entries", () => {
  const contributors = [
    { file: "pirate-first-mate.zip", name: "Beth Plotts", website: "https://mcommunity.umich.edu/person/eplotts", copyright: "Copyright (C) 2026 Beth Plotts" },
    { file: "dude.zip", name: "Jeremy Gluskin", website: "https://mcommunity.umich.edu/person/jgluskin", copyright: "Copyright \u00a9 Jeremy Gluskin, 2026" },
    { file: "aussie-battler.zip", name: "Shelley Boa", website: "https://mcommunity.umich.edu/person/sboa", copyright: "Copyright (C) 2026 Shelley Boa" }
  ];

  for (const contributor of contributors) {
    test(contributor.file + " preserves its contributor attribution", async () => {
      const entry = catalog.agents.find((item) => item.file === contributor.file);
      assert.ok(entry, contributor.file + " must be listed");
      assert.deepEqual(entry.tags, ["fun", "persona", "copilot"]);
      const { agent } = await openEntry(entry);
      assert.deepEqual(agent.creator, { name: contributor.name, website: contributor.website, privacy: "", terms: "" });
      assert.equal(agent.copyright, contributor.copyright);
      assert.equal(agent.license, "GPL-3.0-or-later");
      assert.equal(agent.copilot.appId, "", "downloads must not reuse a contributor's app identity");
    });
  }
});

describe("Caveman entry", () => {
  test("has the expected fields and exports without warnings", async () => {
    const entry = catalog.agents.find((item) => item.file === "caveman.zip");
    assert.ok(entry, "catalog lists caveman.zip");
    const { agent } = await openEntry(entry);
    assert.equal(agent.name, "Caveman");
    assert.equal(agent.welcome, "Me agent, answer questions, big brain.");
    assert.deepEqual(agent.starters, ["Caveman, what can you do?", "Weather good for smash rock today?", "Ugh! Tell me more about... [topic] like I’m five and just discovered fire.", "Me invent wheel today. You proud? (Or me do it wrong?)"]);
    assert.equal(agent.copilot.preferMyFiles, true);
    assert.deepEqual(agent.sharepointLinks, []);
    assert.equal(agent.creator.website, "https://gabriel.mongefranco.com");
    assert.ok(agent.creator.privacy.length > 0 && agent.creator.terms.length > 0, "Copilot needs privacy and terms links");
    assert.equal(agent.copyright, "Copyright (C) 2026 Gabriel Mongefranco");
    const { project, item } = await openEntry(entry);
    const backup = await engine.exports.backup(project);
    assert.equal(backup.fileName, "caveman.agentprise.zip");
    assert.deepEqual(backup.report, []);
    for (const exportId of ["claude", "gemini"]) {
      const skillZip = await engine.exports.skillZip(project, item, exportId);
      assert.equal(skillZip.fileName, "Caveman.zip");
      // The only change is the persona written as a skill, since skill products have no place for assistants.
      assert.deepEqual(skillZip.report.map((e) => [e.component, e.status]), [["Caveman", "transformed"]]);
    }
    const ms = engine.exports.msAgent(project, item);
    assert.deepEqual(ms.warnings, []);
    assert.deepEqual(ms.report, []);
    assert.equal(ms.fileName, "Caveman.agent");
  });
});

describe("library entries built from sources", () => {
  test("every built entry matches its source folders and catalog line", () => {
    const output = execFileSync(process.execPath, [join(repoRoot, "tools", "build-library.mjs"), "--check"], { encoding: "utf8" });
    assert.match(output, /matches its sources/);
  });

  test("the PubMed Search skill inside Evidence Scout is byte for byte the one listed on its own", async () => {
    const folder = async (file) => {
      const entries = await engine.zip.read(new Uint8Array(readFileSync(join(libraryDir, file))));
      const files = {};
      entries.forEach((bytes, name) => {
        const at = name.indexOf("/skills/pubmed-search/");
        if (at >= 0) {
          files[name.slice(at)] = Buffer.from(bytes).toString("base64");
        }
      });
      return files;
    };
    const embedded = await folder("evidence-scout.zip");
    assert.ok(Object.keys(embedded).length >= 8, "Evidence Scout must embed the whole PubMed Search folder");
    assert.deepEqual(embedded, await folder("pubmed-search.zip"));
  });

  test("Evidence Scout uses PubMed Search and every Copilot download fits", async () => {
    const { project, item } = await openEntry(catalog.agents.find((entry) => entry.file === "evidence-scout.zip"));
    assert.deepEqual(item.uses, ["pubmed-search"]);
    assert.deepEqual(project.servers.pubmed, { label: "PubMed MCP server", transport: "http", url: "", userSupplied: true, auth: "none", tools: [] });
    for (const exportId of ["teamsZip", "msAgent", "chatgpt", "claude", "gemini", "skill", "claudePlugin", "portablePlugin"]) {
      assert.equal(engine.tools.planExport(project, item, exportId).blocked, false, "Evidence Scout must not be blocked in " + exportId);
    }
    const text = engine.tools.composeInstructions(project, item, "teamsZip");
    assert.ok(text.includes("Prepared search strategy (not executed)"));
    assert.ok(text.endsWith(engine.tools.COMPLETION_RULE));
  });

  test("PubMed Search follows the Agent Skills rules and carries its sources", async () => {
    const entries = await engine.zip.read(new Uint8Array(readFileSync(join(libraryDir, "pubmed-search.zip"))));
    const text = (path) => engine.bytes.toText(entries.get("pubmed-search/skills/pubmed-search/" + path));
    const front = engine.yaml.parseFrontmatter(text("SKILL.md"));
    assert.deepEqual(front.warnings, []);
    assert.equal(front.data.name, "pubmed-search");
    for (const label of ["Prepared search strategy (not executed)", "Search completed on", "Web discovery", "https://pubmed.ncbi.nlm.nih.gov/?term="]) {
      assert.ok(text("SKILL.md").includes(label), "SKILL.md must name " + label);
    }
    const guide = text("references/pubmed-syntax-guide.md");
    assert.match(guide, /Checked against NLM documentation on 2026-10-10/);
    assert.match(guide, /https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/help\//);
    const blocks = text("references/mobile-tech-search-blocks.md");
    assert.match(blocks, /Judy Smith/);
    assert.match(blocks, /Copied on 2026-10-10/);
    const cases = text("references/query-test-cases.md");
    assert.ok((cases.match(/^#{2,3} /gm) || []).length >= 6, "the test-case file must hold at least six cases");
    assert.match(cases, /smart ring/i);
    assert.match(cases, /cardiovascular/i);
    assert.match(cases, /"university of michigan"\[affiliation\]/i);
    const spec = text("openapi/pubmed-eutils.yaml");
    for (const operation of ["searchPubMed", "getSummaries", "getAbstracts"]) {
      assert.match(spec, new RegExp("operationId: " + operation));
    }
    assert.match(text("scripts/pubmed.py"), /eutils\.ncbi\.nlm\.nih\.gov/);
  });
});
