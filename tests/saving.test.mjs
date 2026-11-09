// This file is part of Agentprise
// tests/saving.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-05
// Last Modified: 2026-11-09
// Summary: Tests when the editor saves a project to browser storage, and that
//          a tab with an older copy of a project never overwrites a newer
//          one. Uses the real save code taken from index.html, with a small
//          in-memory stand-in for the browser database shared by the tabs.
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

/** The page source from one marker up to, not including, another. */
function slice(startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  const end = page.indexOf(endMarker, start);
  assert.ok(start !== -1 && end > start, "Could not find " + startMarker + " in index.html");
  return page.slice(start, end);
}

// The save code is not exposed on the engine namespace. The first part runs
// from savedBytes to deleteStoredProject, the second from recordFingerprint to
// scheduleSave, and the third is renameProject.
const SAVE_CODE = slice("// Bytes last written per key", "async function deleteStoredProject") + slice("/** The record minus its modified time", "function scheduleSave()") + slice("/** Renames a stored project, or the open one. */", "async function projectForCard");
const STALE = JSON.parse(page.match(/const STALE_TAB_MESSAGE = (".*?");/)[1]);

/**
 * A stand-in for the two IndexedDB stores. Each request answers on a later
 * microtask, a transaction ends once its requests are done, and read-write
 * transactions run one at a time in the order they start, as in IndexedDB.
 * Setting failNext makes the next transaction fail, as when storage is full.
 */
function memoryDatabase() {
  const stores = { projects: new Map(), files: new Map() };
  const inRange = (key, range) => typeof range === "object" ? key.startsWith(range.prefix) : key === range;
  let queue = Promise.resolve();
  const database = { stores, withStores, failNext: false };
  function withStores(names, mode, work) {
    if (database.failNext) {
      database.failNext = false;
      return Promise.reject(new Error("The storage is full."));
    }
    const run = () => new Promise((resolve) => {
      let pending = 0;
      const request = (answer) => {
        const holder = { onsuccess: null, result: undefined };
        pending += 1;
        queueMicrotask(() => {
          holder.result = answer();
          if (holder.onsuccess) holder.onsuccess();
          pending -= 1;
          if (pending === 0) setTimeout(() => resolve(result), 0);
        });
        return holder;
      };
      const transaction = {
        objectStore: (name) => ({
          get: (key) => request(() => stores[name].get(key)),
          getAllKeys: (range) => request(() => [...stores[name].keys()].filter((key) => inRange(key, range))),
          put: (value, key) => request(() => { stores[name].set(key === undefined ? value.id : key, value); }),
          delete: (range) => request(() => { [...stores[name].keys()].filter((key) => inRange(key, range)).forEach((key) => stores[name].delete(key)); }),
        }),
      };
      const result = work(transaction);
      if (pending === 0) setTimeout(() => resolve(result), 0);
    });
    queue = queue.then(run);
    return queue;
  }
  return database;
}

let clock = Date.UTC(2026, 0, 1);

/** One browser tab with the given project open, sharing the database with other tabs. */
function tab(database, project, storedModified = "") {
  const messages = [];
  const posted = [];
  const status = { textContent: "" };
  const sandbox = {
    ui: { project, savedRecord: "", saveTimer: 0, storedModified, replaceStored: false, staleTab: false, saving: null, memoryStored: new Map(), memoryProjects: new Map(), channel: { postMessage: (data) => posted.push(data) } },
    withStores: database.withStores,
    projectFileRange: (id) => ({ prefix: id + "/" }),
    projectRecord: engine.project.record,
    projectPayloads: engine.project.payloads,
    projectHasContent: (candidate) => candidate.items.length > 0,
    fileTypeOf: (path) => path.split(".").pop(),
    isPlainObject: (value) => value !== null && typeof value === "object" && !Array.isArray(value),
    storageBlocked() {},
    STALE_TAB_MESSAGE: STALE,
    announce: (message) => { messages.push(message); status.textContent = message; },
    $: () => status,
    clearTimeout() {},
    rememberOpened() {},
    refreshProjectList: async () => {},
    renderBreadcrumb() {},
    renderProjectNav() {},
    asText: (value) => String(value).trim(),
    LIMITS: { name: 100 },
    // Stands in for the page's loader: the copy kept in memory, or else the stored copy.
    loadStoredProject: async (id) => sandbox.ui.memoryProjects.has(id) ? engine.project.normalize(sandbox.ui.memoryProjects.get(id)) : { project: loadCopy(database, id), notices: [] },
    Blob,
    // Each save gets a time one second after the last, so two saves never share one.
    Date: function SaveClock() { clock += 1000; return new Date(clock); },
  };
  vm.runInNewContext(SAVE_CODE + "\nresult = saveNow;", sandbox);
  if (storedModified) {
    sandbox.ui.savedRecord = sandbox.recordFingerprint(project);
    engine.project.payloads(project).forEach((payload) => sandbox.savedBytes.set(project.id + "/" + payload.key, payload.bytes));
  }
  return { ui: sandbox.ui, saveNow: sandbox.result, renameProject: sandbox.renameProject, messages, posted };
}

/** A copy of the stored project, as another tab would load it. */
function loadCopy(database, id) {
  const record = database.stores.projects.get(id);
  const payloads = new Map();
  for (const [key, value] of database.stores.files) {
    if (key.startsWith(id + "/")) payloads.set(key.slice(id.length + 1), value.bytes);
  }
  return engine.project.fromRecord(JSON.parse(JSON.stringify(record)), payloads).project;
}

function helper(files = []) {
  return engine.project.normalize({ name: "Team Helper", items: [{ kind: "agent", name: "Team Helper", description: "Helps the team.", instructions: "Original instructions.", files }] }).project;
}

describe("saving a project", () => {
  test("a new picture in place of an old one is saved, and a save with nothing new is skipped", async () => {
    const database = memoryDatabase();
    const project = helper();
    project.items[0].icon = { bytes: makePng(4, 4) };
    const one = tab(database, project);
    await one.saveNow();
    assert.deepEqual(one.posted.map((message) => [message.id, message.modified]), [[project.id, project.modified]], "the other tabs hear which project changed");
    await one.saveNow();
    assert.equal(one.posted.length, 1, "nothing changed, so nothing is written");
    // The record says only that there is a picture, so it stays the same.
    project.items[0].icon = { bytes: makePng(8, 8) };
    await one.saveNow();
    assert.equal(one.posted.length, 2);
    assert.deepEqual(database.stores.files.get(project.id + "/" + project.items[0].id + "/icon.png").blob.size, makePng(8, 8).length);
  });

  test("a different file with the same name and size is saved", async () => {
    const database = memoryDatabase();
    const project = helper([{ name: "notes.txt", bytes: encode("first") }]);
    const one = tab(database, project);
    await one.saveNow();
    project.items[0].files = [{ path: "references/notes.txt", bytes: encode("other") }];
    await one.saveNow();
    assert.equal(one.posted.length, 2);
  });
});

describe("the same project open in two tabs", () => {
  /** Tab one saves the project, then tab two opens the stored copy. */
  async function twoTabs() {
    const database = memoryDatabase();
    const first = helper();
    const one = tab(database, first);
    await one.saveNow();
    const second = loadCopy(database, first.id);
    const two = tab(database, second, second.modified);
    return { database, first, second, one, two };
  }

  test("an older tab never overwrites newer changes or deletes a newer file", async () => {
    const { database, first, second, one, two } = await twoTabs();
    first.items[0].instructions = "Newer instructions.";
    first.items[0].files.push({ path: "references/notes.txt", bytes: encode("Example line.") });
    await one.saveNow();
    const notesKey = first.id + "/" + first.items[0].id + "/references/notes.txt";
    assert.ok(database.stores.files.has(notesKey));

    second.items[0].description = "Helps the team!";
    await two.saveNow();
    assert.equal(database.stores.projects.get(first.id).items[0].instructions, "Newer instructions.");
    assert.ok(database.stores.files.has(notesKey), "the newer tab's file is still stored");
    assert.deepEqual(two.messages, [STALE]);
    assert.equal(two.ui.staleTab, true);

    // Later edits in the older tab are not saved either, and the message is not repeated while it shows.
    second.items[0].description = "Helps the whole team.";
    await two.saveNow();
    assert.equal(database.stores.projects.get(first.id).items[0].description, "Helps the team.");
    assert.deepEqual(two.messages, [STALE]);
  });

  test("a project deleted in another tab is not stored again", async () => {
    const { database, first, second, two } = await twoTabs();
    database.stores.projects.delete(first.id);
    second.items[0].description = "Helps the team!";
    await two.saveNow();
    assert.equal(database.stores.projects.has(first.id), false);
    assert.deepEqual(two.messages, [STALE]);
  });

  test("a single tab keeps saving, even when a second save starts before the first ends", async () => {
    const { database, first, one } = await twoTabs();
    first.items[0].instructions = "Step one.";
    const firstSave = one.saveNow();
    first.items[0].instructions = "Step two.";
    await Promise.all([firstSave, one.saveNow()]);
    assert.equal(database.stores.projects.get(first.id).items[0].instructions, "Step two.");
    assert.deepEqual(one.messages, []);
  });

  test("a save that fails keeps the project for the visit, and the next save still works", async () => {
    const { database, first, one } = await twoTabs();
    first.items[0].instructions = "Kept for this visit.";
    database.failNext = true;
    await one.saveNow();
    assert.equal(database.stores.projects.get(first.id).items[0].instructions, "Original instructions.");
    // The tab remembers what storage still holds, for when the project opens again from memory.
    assert.deepEqual({ ...one.ui.memoryStored.get(first.id) }, { modified: one.ui.storedModified, replace: false });
    first.items[0].instructions = "Saved once storage works.";
    await one.saveNow();
    assert.equal(database.stores.projects.get(first.id).items[0].instructions, "Saved once storage works.");
    assert.equal(one.ui.memoryStored.has(first.id), false);
    assert.deepEqual(one.messages, []);
  });

  test("when the first of two overlapping saves fails, the second still saves", async () => {
    const { database, first, one } = await twoTabs();
    first.items[0].instructions = "Step one.";
    database.failNext = true;
    const firstSave = one.saveNow();
    first.items[0].instructions = "Step two.";
    await Promise.all([firstSave, one.saveNow()]);
    assert.equal(database.stores.projects.get(first.id).items[0].instructions, "Step two.");
    assert.deepEqual(one.messages, []);
  });

  test("a refused save of a project that is no longer open leaves the new project saving", async () => {
    const { first, second, one, two } = await twoTabs();
    first.items[0].instructions = "Newer instructions.";
    await one.saveNow();
    second.items[0].description = "Helps the team!";
    const pending = two.saveNow();
    two.ui.project = helper();
    await pending;
    assert.equal(two.ui.staleTab, false);
    assert.equal(two.messages.length, 1);
    assert.match(two.messages[0], /^The last changes to Team Helper weren't saved, because it was changed or deleted in another tab\./);
  });

  test("renaming a project kept in memory never replaces newer changes from another tab", async () => {
    const { database, first, second, one, two } = await twoTabs();
    first.items[0].instructions = "Kept for this visit.";
    database.failNext = true;
    await one.saveNow();
    // Tab one opens another project, then tab two saves newer changes to the first one.
    one.ui.project = helper();
    second.items[0].instructions = "Newer instructions.";
    await two.saveNow();
    await one.renameProject(first.id, "Renamed Helper");
    const stored = database.stores.projects.get(first.id);
    assert.equal(stored.items[0].instructions, "Newer instructions.");
    assert.equal(stored.name, "Team Helper");
    assert.equal(one.ui.memoryProjects.get(first.id).items[0].instructions, "Kept for this visit.", "this tab still has the changes it couldn't save");
    assert.match(one.messages.at(-1), /^The name didn't change, because the project was changed in another tab\./);
  });

  test("renaming a project kept in memory saves its changes when no other tab changed it", async () => {
    const { database, first, one } = await twoTabs();
    first.items[0].instructions = "Kept for this visit.";
    database.failNext = true;
    await one.saveNow();
    one.ui.project = helper();
    await one.renameProject(first.id, "Renamed Helper");
    const stored = database.stores.projects.get(first.id);
    assert.equal(stored.name, "Renamed Helper");
    assert.equal(stored.items[0].instructions, "Kept for this visit.");
    assert.equal(one.ui.memoryProjects.has(first.id), false);
    assert.equal(one.messages.at(-1), "Renamed the project to Renamed Helper.");
  });

  test("Replace mine replaces the stored copy this tab never loaded", async () => {
    const { database, first } = await twoTabs();
    const opened = engine.project.normalize(JSON.parse(JSON.stringify(engine.project.record(first)))).project;
    opened.items[0].instructions = "From the opened file.";
    const replacing = tab(database, opened);
    replacing.ui.replaceStored = true;
    await replacing.saveNow();
    assert.equal(database.stores.projects.get(first.id).items[0].instructions, "From the opened file.");
    assert.deepEqual(replacing.messages, []);
  });
});
