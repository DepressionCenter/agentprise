// This file is part of Agentprise
// tests/saving.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-05
// Last Modified: 2026-11-05
// Summary: Tests when the editor saves a project to browser storage. Uses the
//          real saveNow source taken from index.html, with stored writes
//          replaced by a recorder.
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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { loadEngine, repoRoot } from "./load-engine.mjs";
import { makePng } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const page = readFileSync(join(repoRoot, "index.html"), "utf8");
const encode = (text) => new TextEncoder().encode(text);

// The save code is not exposed on the engine namespace, so its source is cut out of the page.
// Markers are the start of recordFingerprint and the start of scheduleSave.
const SAVE_START = "/** The record minus its modified time";
const SAVE_END = "function scheduleSave()";

/** The page's saveNow, with each stored write recorded and remembered as the real one is. */
function saver(project) {
  const start = page.indexOf(SAVE_START);
  const end = page.indexOf(SAVE_END, start);
  assert.ok(start !== -1 && end > start, "Could not find saveNow in index.html");
  const writes = [];
  const sandbox = {
    ui: { project, savedRecord: "", saveTimer: 0 },
    savedBytes: new Map(),
    clearTimeout() {},
    projectRecord: engine.project.record,
    projectPayloads: engine.project.payloads,
    projectHasContent: (candidate) => candidate.items.length > 0,
    rememberOpened() {},
    refreshProjectList: async () => {},
    saveStoredProject: async (saved) => {
      writes.push(saved.modified);
      engine.project.payloads(saved).forEach((payload) => sandbox.savedBytes.set(saved.id + "/" + payload.key, payload.bytes));
    },
  };
  vm.runInNewContext(page.slice(start, end) + "\nresult = saveNow;", sandbox);
  return { saveNow: sandbox.result, writes };
}

describe("saving a project", () => {
  test("a new picture in place of an old one is saved, and a save with nothing new is skipped", async () => {
    const project = engine.project.normalize({ name: "Example helper", items: [{ kind: "agent", name: "Example helper" }] }).project;
    project.items[0].icon = { bytes: makePng(4, 4) };
    const { saveNow, writes } = saver(project);
    await saveNow();
    assert.equal(writes.length, 1);
    await saveNow();
    assert.equal(writes.length, 1, "nothing changed");
    // The record says only that there is a picture, so it stays the same.
    project.items[0].icon = { bytes: makePng(8, 8) };
    await saveNow();
    assert.equal(writes.length, 2);
  });

  test("a different file with the same name and size is saved", async () => {
    const project = engine.project.normalize({ name: "Example", items: [{ kind: "skill", name: "Example", body: "Steps.", files: [{ path: "references/notes.txt", bytes: encode("first") }] }] }).project;
    const { saveNow, writes } = saver(project);
    await saveNow();
    project.items[0].files = [{ path: "references/notes.txt", bytes: encode("other") }];
    await saveNow();
    assert.equal(writes.length, 2);
  });
});
