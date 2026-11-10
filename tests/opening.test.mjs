// This file is part of Agentprise
// tests/opening.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-10
// Summary: Tests that opening a damaged file, adding one to a project, and
//          backing up or copying a project from the Workspace always end
//          with a message, and that a backup never grows past the size the
//          app can open again. The interface code is taken from index.html
//          and run with small stand-ins for the page.
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

const engine = loadEngine();
await engine.ready;
const page = readFileSync(join(repoRoot, "index.html"), "utf8");
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const UNOPENED = "Agentprise couldn't open example.zip. The file may be damaged. Try another copy, or ask the person who made it to make it again.";

/** The page source from one marker up to, not including, another. */
function slice(startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  const end = page.indexOf(endMarker, start);
  assert.ok(start !== -1 && end > start, "Could not find " + startMarker + " in index.html");
  return page.slice(start, end);
}

// The interface code is not exposed on the engine namespace: the message for
// a file that failed to open, the storage notes and save messages, openFile
// and addFromFile, setupFileOpening, and the Workspace card's copy and backup.
const PAGE_CODE = slice("/** The message for a file that failed to open in an unexpected way. */", "/** Reads a project file for importProject")
  + slice("function storageBlocked()", "/** Deletes the version 1 draft")
  + slice("/** Opens a file as a new project. */", "/** Selects the first added item. */")
  + slice("function setupFileOpening()", "// ### Interface: items ###")
  + slice("async function copyStoredProject(summary)", "function confirmDelete(summary)");
const MISSING = JSON.parse(page.match(/const PROJECT_MISSING_MESSAGE = (".*?");/)[1]);

/** A page element with the parts the code uses; handlers are kept by event name. */
function element() {
  const handlers = {};
  return {
    handlers, value: "", files: null, hidden: false, textContent: "",
    classList: { add() {}, remove() {} },
    addEventListener: (name, handler) => { (handlers[name] = handlers[name] || []).push(handler); },
    click() {},
  };
}

/** Runs the page code with stand-ins; overrides replace any of them. */
function pageWith(overrides = {}) {
  const messages = [];
  const elements = {};
  const sandbox = {
    ui: { project: null, failedSaves: new Set(), storageOk: true },
    $: (id) => (elements[id] = elements[id] || element()),
    document: { addEventListener() {} },
    announce: (message) => messages.push(message),
    readFileBytes: async () => encode("x"),
    importProject: async () => ({ project: { name: "Example", items: [] }, notices: [] }),
    saveNow: async () => undefined,
    scanProject: () => [],
    addProjectToWorkspace: async () => {},
    mergeIntoOpenProject() {},
    projectForCard: async (summary) => ({ project: { id: summary.id, name: summary.name } }),
    duplicateProject: (project, name) => ({ id: "copy", name }),
    saveStoredProject: async () => true,
    refreshProjectList: async () => {},
    writeProjectBundle: async () => ({ fileName: "team-helper.agentprise.zip", bytes: encode("zip") }),
    downloadBytes() {},
    PROJECT_MISSING_MESSAGE: MISSING,
    // The engine's own errors, so a message written for people is recognized as one.
    Error,
    ZipError: engine.zip.ZipError,
    ...overrides,
  };
  vm.runInNewContext(PAGE_CODE, sandbox);
  return { sandbox, messages, elements };
}

/** Lets pending promise callbacks and timers run. */
async function settle() {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("opening a file", () => {
  test("a file that stops a reader in an unexpected way gets a message", async () => {
    const bytes = new Proxy(new Uint8Array(30), { get() { throw new TypeError("Unexpected."); } });
    assert.deepEqual(await engine.imports.any("example.zip", bytes), { error: UNOPENED });
  });

  test("a backup whose plugin.json holds other values where text belongs still opens", async () => {
    const project = engine.project.normalize({ name: "Demo", items: [{ kind: "skill", name: "Hello", description: "Says hello.", body: "Say hello." }], unrecognized: [{ path: "hooks/hooks.json", bytes: encode("{}") }] }).project;
    const backup = await engine.exports.backup(project);
    const entries = await engine.zip.read(backup.bytes);
    const manifestName = [...entries.keys()].find((name) => name.endsWith("/plugin.json"));
    const manifest = JSON.parse(decode(entries.get(manifestName)));
    const record = manifest.extensions[engine.AGENTPRISE_EXTENSION_KEY];
    // An object whose toString isn't a function can't be turned into text.
    record.items[0].skillName = { toString: 1 };
    record.unrecognized[0].path = { toString: 1 };
    entries.set(manifestName, encode(JSON.stringify(manifest)));
    const opened = await engine.imports.any(backup.fileName, engine.zip.write([...entries].map(([name, bytes]) => ({ name, bytes }))));
    assert.equal(opened.error, undefined);
    assert.deepEqual(opened.project.items.map((item) => item.name), ["Hello"]);
    assert.deepEqual(opened.project.unrecognized.map((entry) => entry.path), ["hooks/hooks.json"]);
  });

  test("an unexpected failure after the file is read is announced as an error", async () => {
    const { sandbox, messages } = pageWith({ scanProject() { throw new TypeError("Unexpected."); } });
    await sandbox.openFile({ name: "example.zip" });
    assert.deepEqual(messages, ["Opening example.zip...", UNOPENED]);
  });

  test("Add from a file announces an unexpected failure, and the same file can be chosen again", async () => {
    const { sandbox, messages, elements } = pageWith({ mergeIntoOpenProject() { throw new TypeError("Unexpected."); } });
    sandbox.ui.project = { name: "Team Helper", items: [] };
    sandbox.setupFileOpening();
    const picker = sandbox.$("add-from-file");
    picker.files = [{ name: "example.zip" }];
    picker.value = "example.zip";
    picker.handlers.change[0]({ target: picker });
    await settle();
    assert.deepEqual(messages, [UNOPENED]);
    assert.equal(elements["add-from-file"].value, "", "the picker is cleared");
  });
});

describe("Workspace card actions", () => {
  const summary = { id: "team", name: "Team Helper" };

  test("a backup that can't be made says why, and an unexpected failure gives a next step", async () => {
    const tooLarge = pageWith({ async writeProjectBundle() { throw new Error("The backup would be larger than 50 MB, which is more than this app can open again. Remove some large files first."); } });
    await tooLarge.sandbox.backupStoredProject(summary);
    assert.deepEqual(tooLarge.messages, ["The backup of Team Helper didn't work. The backup would be larger than 50 MB, which is more than this app can open again. Remove some large files first."]);

    const unexpected = pageWith({ async projectForCard() { throw new TypeError("Cannot read properties of undefined."); } });
    await unexpected.sandbox.backupStoredProject(summary);
    assert.deepEqual(unexpected.messages, ["The backup of Team Helper didn't work. Try again in a moment."]);

    const missing = pageWith({ async projectForCard() { return null; } });
    await missing.sandbox.backupStoredProject(summary);
    assert.deepEqual(missing.messages, [MISSING]);

    const works = pageWith();
    await works.sandbox.backupStoredProject(summary);
    assert.deepEqual(works.messages, ["Downloaded team-helper.agentprise.zip."]);
  });

  test("a copy that can't be saved says so, and a failed copy says what happened", async () => {
    const unsaved = pageWith({ async saveStoredProject() { return null; } });
    await unsaved.sandbox.copyStoredProject(summary);
    assert.deepEqual(unsaved.messages, ["Made a copy named Team Helper (copy). Agentprise couldn't save Team Helper (copy), because this browser's storage is full or blocked. This tab keeps the project until you close the tab. To keep the project after that, download a backup."]);
    assert.ok(unsaved.sandbox.ui.failedSaves.has("copy"), "a later failed save of the copy isn't announced again");

    const failed = pageWith({ async projectForCard() { throw new TypeError("Unexpected."); } });
    await failed.sandbox.copyStoredProject(summary);
    assert.deepEqual(failed.messages, ["The copy of Team Helper didn't work. Try again in a moment."]);
  });
});

describe("backup size", () => {
  test("a backup whose files fit under 50 MB but whose .zip doesn't is refused before it downloads", async () => {
    const limit = engine.LIMITS.zipTotalBytes;
    const full = engine.LIMITS.fileBytes;
    const build = (lastSize) => engine.project.normalize({ name: "Large", items: [{ kind: "skill", name: "Large", description: "Holds large files.", body: "Read the files.", files: [1, 2, 3, 4, 5].map((n) => ({ path: "references/part" + n + ".txt", bytes: new Uint8Array(n === 5 ? lastSize : full).fill(97) })) }] }).project;
    const contents = (project) => engine.exports.backupEntries(project).reduce((sum, entry) => sum + entry.bytes.length, 0);
    // Sizes the last file so the files add up to a few bytes under the limit.
    let lastSize = full - 64 * 1024;
    for (let i = 0; i < 3; i++) {
      lastSize += limit - 8 - contents(build(lastSize));
    }
    const project = build(lastSize);
    assert.equal(contents(project), limit - 8);
    await assert.rejects(engine.exports.backup(project), /^Error: The backup would be larger than 50 MB, which is more than this app can open again\. Remove some large files first\.$/);
  });
});
