// This file is part of Agentprise
// tests/library.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-09
// Summary: Tests for the agent library: the catalog and each bundle it lists,
//          opened with the same importer the app uses for dropped files.
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
import { join } from "node:path";
import { loadEngine, repoRoot } from "./load-engine.mjs";

const engine = loadEngine();
const libraryDir = join(repoRoot, "library");
const catalog = JSON.parse(readFileSync(join(libraryDir, "catalog.json"), "utf8"));

// The same rule the page applies to a catalog line: a plain file name ending in .zip.
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}\.zip$/;

async function openEntry(entry) {
  const bytes = new Uint8Array(readFileSync(join(libraryDir, entry.file)));
  assert.equal(engine.detectFormat(entry.file, bytes), "bundle", entry.file + " must be an Agentprise bundle");
  const result = await engine.formats.bundle.import(bytes);
  assert.equal(result.error, undefined, entry.file + ": " + result.error);
  return result;
}

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
    }
    // Two lines for one file or one name would make the page show the same card twice.
    const files = catalog.agents.map((entry) => entry.file);
    assert.equal(new Set(files).size, files.length, "a file is listed more than once");
    const names = catalog.agents.map((entry) => entry.name);
    assert.equal(new Set(names).size, names.length, "two entries share a name");
  });

  test("every bundle opens cleanly and matches its catalog line", async () => {
    for (const entry of catalog.agents) {
      const { agent, notices } = await openEntry(entry);
      assert.deepEqual(notices, []);
      assert.equal(agent.name, entry.name);
      assert.equal(agent.description, entry.summary);
      assert.equal(agent.creator.name, entry.author);
      assert.equal(agent.license, entry.license);
      assert.ok(agent.instructions.length > 0);
      // Every entry carries the same safety limits: no legal or medical advice, and the 988 Lifeline notice for anyone in crisis.
      assert.ok(agent.instructions.includes("Give no legal or medical advice."), entry.file + " must refuse legal and medical advice");
      assert.ok(agent.instructions.includes("Call or text 988 to reach the 988 Lifeline"), entry.file + " must carry the 988 Lifeline notice");
      assert.ok(agent.instructions.includes("https://chat.988lifeline.org/"), entry.file + " must link the 988 Lifeline chat");
      // No entry reads meetings or files unless the person adds them; chat and web search are the author's choice.
      assert.equal(agent.copilot.webSearch, true, entry.file + " must have web search on");
      assert.equal(agent.copilot.meetings, false, entry.file + " must not read meetings by default");
      assert.deepEqual(agent.sharepointLinks, [], entry.file + " must not link files by default");
      assert.deepEqual(engine.validateAgent(agent).problems, []);
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

describe("Caveman entry", () => {
  test("has the expected fields and exports without warnings", async () => {
    const entry = catalog.agents.find((item) => item.file === "caveman.zip");
    assert.ok(entry, "catalog lists caveman.zip");
    const { agent } = await openEntry(entry);
    assert.equal(agent.name, "Caveman");
    assert.equal(agent.welcome, "Me agent, answer questions, big brain.");
    assert.deepEqual(agent.starters, ["Caveman, what can you do?", "Tell me more about..."]);
    assert.equal(agent.copilot.preferMyFiles, true);
    assert.deepEqual(agent.sharepointLinks, []);
    assert.equal(agent.creator.website, "https://gabriel.mongefranco.com");
    assert.ok(agent.creator.privacy.length > 0 && agent.creator.terms.length > 0, "Copilot needs privacy and terms links");
    assert.equal(agent.copyright, "Copyright (C) 2026 Gabriel Mongefranco");
    const bundle = await engine.formats.bundle.export(agent);
    assert.deepEqual(bundle.warnings, []);
    const ms = engine.formats.msAgent.export(agent);
    assert.deepEqual(ms.warnings, []);
    assert.equal(ms.fileName, "Caveman.agent");
  });
});
