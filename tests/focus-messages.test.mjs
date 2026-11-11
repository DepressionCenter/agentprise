// This file is part of Agentprise
// tests/focus-messages.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-10
// Summary: Tests where keyboard focus goes after the actions in a project's
//          More actions menu, which messages stay until Dismiss, how a
//          blocked Download button says why, the Library strip's arrows,
//          and the Library's loading and failure messages. The interface
//          code is taken from index.html and run with small stand-ins for
//          the page.
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
import { repoRoot } from "./load-engine.mjs";

// Lines end in LF here, so the markers match on a checkout that uses CRLF.
const page = readFileSync(join(repoRoot, "index.html"), "utf8").replace(/\r\n/g, "\n");

/** The page source from one marker up to, not including, another. */
function slice(startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  const end = page.indexOf(endMarker, start);
  assert.ok(start !== -1 && end > start, "Could not find " + startMarker + " in index.html");
  return page.slice(start, end);
}

// The interface code is not exposed on the engine namespace, so each part
// is cut out of the page by the comments and names around it.
const HELPERS_CODE = slice("/**\n * Marks a button as unavailable", "/** An icon, a visible label");
const STATUS_CODE = slice("/**\n * Sets the polite live region", "function downloadBytes(");
const OPEN_FILE_CODE = slice("/** Opens a file as a new project. */", "/** Adds a file's items to the open project. */");
const MERGE_CODE = slice("/** Selects the first added item. */", "function setupFileOpening()");
const ADD_PROJECT_CODE = slice("async function addProjectToWorkspace(", "/** The one confirm dialog.");
const CONFIRM_CODE = slice("/** The one confirm dialog.", "// ### Interface: workspace page ###");
const OPEN_PROJECT_CODE = slice("async function openProject(id, moveFocus)", "/** One empty assistant");
const RECENT_CODE = slice("function renderRecent()", "function openRename(summary)");
const START_DOWNLOAD_CODE = slice("async function startDownload(format)", "async function copyToClipboard(area)");
const CARD_CODE = slice("/** The name opens it; the menu holds the other actions. */", "/** Closes every open project menu except keep. */");
const MENU_CODE = slice("/** Closes every open project menu except keep. */", "/** Swaps each tile's monogram");
const RENAME_CODE = slice("function openRename(summary)", "/** Renames a stored project");
const COPY_CODE = slice("/**\n * Copies a Workspace card's project", "async function backupStoredProject(summary)");
const DELETE_CODE = slice("function confirmDelete(summary)", "// ### Interface: icons (canvas) ###");
const DIALOG_CODE = slice("/** After a dialog from a project's More actions menu closes", "async function initApp()");
const DERIVED_CODE = slice("/** Preview, readiness, counters, review, and download buttons. */", "/** Labels, hints, limits");
const EXPORTS_CODE = slice("// Download card formats and the export each one makes.", "/** Used to block a download");
const NOTES_CODE = slice("/** The report lines that stop a download. */", "function renderReport(report)");
const DOWNLOAD_SETUP_CODE = slice("/**\n * Says why a download button, or the ChatGPT Copy button", "// ### Interface: Details files ###");
const STRIP_CODE = slice("/**\n * Each arrow is available only while", "/** A random library sample")
  + slice("function setupStrip()", "// ### Interface: analytics ###");
const LIBRARY_CODE = slice("async function renderLibrary()", "\nfunction stripTile(entry)");

/** A page element with the parts the code uses; handlers are kept by event name. */
function element(fake, id, tag) {
  const node = {
    id, tag: tag || "", label: "", attributes: {}, children: [], parent: null,
    hidden: false, textContent: "", value: "", open: false, handlers: {},
    setAttribute(name, value) { node.attributes[name] = String(value); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(node.attributes, name) ? node.attributes[name] : null; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(node.attributes, name); },
    removeAttribute(name) { delete node.attributes[name]; },
    appendChild(child) { child.parent = node; node.children.push(child); return child; },
    addEventListener(name, handler) { (node.handlers[name] = node.handlers[name] || []).push(handler); },
    focus() { fake.document.activeElement = node; fake.focused.push(node.id || node.label); },
    contains(other) {
      for (let current = other; current; current = current.parent) {
        if (current === node) {
          return true;
        }
      }
      return false;
    },
    click(event) { (node.handlers.click || []).forEach((handler) => handler(Object.assign({ target: node, preventDefault() {}, stopPropagation() {} }, event))); },
  };
  return node;
}

/** Visible text of a stand-in element: its own text, or its children's. */
function textOf(node) {
  if (typeof node.text === "string") {
    return node.text;
  }
  return node.children.length ? node.children.map(textOf).join("") : node.textContent;
}

/** Element stand-ins for $, el, clearChildren, setText, and document; focus is logged by id or label. */
function fakePage() {
  const fake = { focused: [], elements: {} };
  fake.document = {
    activeElement: null,
    body: { id: "body" },
    createTextNode: (text) => ({ text, children: [] }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(name, handler) { (fake.document.handlers[name] = fake.document.handlers[name] || []).push(handler); },
    handlers: {},
  };
  fake.document.activeElement = fake.document.body;
  fake.$ = (id) => (fake.elements[id] = fake.elements[id] || element(fake, id));
  fake.el = (tag, attributes, children) => {
    const node = element(fake, "", tag);
    Object.keys(attributes || {}).forEach((key) => {
      if (key === "text") {
        node.textContent = attributes.text;
      } else if (key !== "className") {
        node.setAttribute(key, attributes[key]);
      }
    });
    node.label = (attributes || {})["aria-label"] || (attributes || {}).text || "";
    (children || []).forEach((child) => node.appendChild(typeof child === "string" ? { text: child, children: [] } : child));
    return node;
  };
  fake.clearChildren = (node) => { node.children = []; node.textContent = ""; };
  fake.setText = (node, text) => { node.children = []; node.textContent = text; };
  return fake;
}

/** Timers that run only when the test says so. */
function manualTimers() {
  const pending = [];
  return {
    pending,
    setTimeout: (callback, delay) => { pending.push({ callback, delay }); return pending.length; },
    clearTimeout: (handle) => { if (pending[handle - 1]) { pending[handle - 1].callback = () => {}; } },
    runAll() { pending.splice(0).forEach((timer) => timer.callback()); },
  };
}

/** Lets pending promise callbacks run. */
async function settle() {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("messages that stay until Dismiss", () => {
  /** announce and setupStatus on a page that shows view. */
  function statusArea(view) {
    const fake = fakePage();
    const timers = manualTimers();
    const sandbox = {
      ...fake,
      ...timers,
      ui: { view, statusTimer: null },
      STATUS_SECONDS: 8,
      focusViewHeading: (name) => fake.$(name === "project" ? "editor-heading" : name + "-heading").focus(),
    };
    vm.runInNewContext(STATUS_CODE + "\nsetupStatus();", sandbox);
    return { sandbox, fake, timers, status: fake.$("status"), dismiss: fake.$("status-dismiss") };
  }

  test("a short confirmation clears after 8 seconds and shows no Dismiss button", () => {
    const area = statusArea("project");
    area.sandbox.announce("Copied.");
    assert.equal(textOf(area.status), "Copied.");
    assert.equal(area.dismiss.hidden, true);
    assert.deepEqual(area.timers.pending.map((timer) => timer.delay), [8000]);
    area.timers.runAll();
    assert.equal(textOf(area.status), "");
  });

  test("a message that stays shows Dismiss and has no timer", () => {
    const area = statusArea("project");
    area.sandbox.announce("Opened team.zip as a project. Left out 1 file.", true);
    assert.equal(textOf(area.status), "Opened team.zip as a project. Left out 1 file.");
    assert.equal(area.dismiss.hidden, false);
    assert.deepEqual(area.timers.pending, []);
  });

  test("Dismiss clears the message and moves focus to the heading of the page that is open", () => {
    const area = statusArea("project");
    area.sandbox.announce("The download didn't work. Try again in a moment.", true);
    area.dismiss.focus();
    area.dismiss.click();
    assert.equal(textOf(area.status), "");
    assert.equal(area.dismiss.hidden, true);
    assert.deepEqual(area.fake.focused, ["status-dismiss", "editor-heading"]);
  });

  test("a new short message while Dismiss has focus moves focus to the heading, never the page itself", () => {
    const area = statusArea("workspace");
    area.sandbox.announce("Deleted 1 project file.", true);
    area.dismiss.focus();
    area.sandbox.announce("Renamed the project to Team Helper.");
    assert.equal(area.dismiss.hidden, true);
    assert.equal(area.fake.document.activeElement, area.fake.$("workspace-heading"));
  });

  test("a second message that stays keeps Dismiss and its focus", () => {
    const area = statusArea("project");
    area.sandbox.announce("First notice.", true);
    area.dismiss.focus();
    area.sandbox.announce("Second notice.", true);
    assert.equal(area.dismiss.hidden, false);
    assert.equal(area.fake.document.activeElement, area.dismiss);
    assert.equal(textOf(area.status), "Second notice.");
  });

  test("Dismiss sits outside the live region, says what it dismisses, and is a real button", () => {
    const markup = page.match(/<div class="status-area">[\s\S]*?<\/div>\n\s*<\/div>/)[0];
    assert.match(markup, /<div class="status-bar" id="status" role="status" aria-live="polite"><\/div>/, "the live region holds only the message");
    assert.match(markup, /<button type="button" class="status-dismiss" id="status-dismiss" hidden>.*Dismiss<span class="visually-hidden"> message<\/span><\/button>/);
    // Buttons are at least 44 by 44 pixels and every focusable element has the focus ring.
    assert.match(page, /button, \.button \{[^}]*min-height: 44px;[^}]*min-width: 44px;/);
    assert.match(page, /:focus-visible \{ outline: 3px solid var\(--focus\); outline-offset: 2px; \}/);
  });
});

describe("which messages stay", () => {
  test("opening a file keeps the message only when it holds notices or the sharing check found something", async () => {
    const calls = [];
    const run = async (notices, findings) => {
      const sandbox = {
        announce() {},
        readFileBytes: async () => new Uint8Array(1),
        importProject: async () => ({ project: { name: "Team" }, notices }),
        saveNow: async () => undefined,
        scanProject: () => new Array(findings),
        addProjectToWorkspace: async (project, message, keep) => calls.push([message, keep]),
        unopenedFileMessage: (name) => "Couldn't open " + name + ".",
      };
      vm.runInNewContext(OPEN_FILE_CODE, sandbox);
      await sandbox.openFile({ name: "team.zip" });
    };
    await run([], 0);
    await run(["Left out 3 files."], 0);
    await run([], 1);
    assert.deepEqual(calls, [
      ["Opened team.zip as a project.", false],
      ["Opened team.zip as a project. Left out 3 files.", true],
      ["Opened team.zip as a project. Please check the yellow box under Download before you share it.", true],
    ]);
  });

  test("adding a project to the Workspace passes keep through, and a failed save always stays", async () => {
    const run = async (keep, saved) => {
      const messages = [];
      const sandbox = {
        ui: { projects: [] },
        refreshProjectList: async () => {},
        setProject() {}, showView() {},
        saveNow: async () => saved,
        failedSaveMessage: () => "Agentprise couldn't save it.",
        announce: (message, stays) => messages.push([message, stays]),
      };
      vm.runInNewContext(ADD_PROJECT_CODE, sandbox);
      await sandbox.addProjectToWorkspace({ id: "p1", name: "Team" }, "Opened team.zip as a project.", keep);
      return messages[0];
    };
    assert.deepEqual(await run(undefined, true), ["Opened team.zip as a project.", false]);
    assert.deepEqual(await run(true, true), ["Opened team.zip as a project.", true]);
    assert.deepEqual(await run(false, null), ["Opened team.zip as a project. Agentprise couldn't save it.", true]);
  });

  test("Add from a file keeps the message when it holds notices or nothing was added", () => {
    const run = (added, notices) => {
      const messages = [];
      const sandbox = {
        ui: { project: { id: "p1", created: "2026-01-01T00:00:00Z", items: [] }, itemId: "" },
        mergeProjects: () => ({ project: { items: added.map((name) => ({ id: name, name })) }, added: added.slice(), notices: [] }),
        renderForm() {}, scheduleSave() {},
        listNames: (names) => names.join(" and "),
        announce: (message, keep) => messages.push([message, keep]),
      };
      vm.runInNewContext(MERGE_CODE, sandbox);
      sandbox.mergeIntoOpenProject({}, "team.zip", notices);
      return messages[0];
    };
    assert.deepEqual(run(["Helper"], []), ["Added Helper from team.zip.", false]);
    assert.deepEqual(run(["Helper"], ["Left out 1 file."]), ["Added Helper from team.zip. Left out 1 file.", true]);
    assert.deepEqual(run([], []), ["Nothing could be added from team.zip.", true]);
  });

  test("opening a saved project that needed changes keeps the message", async () => {
    const messages = [];
    const sandbox = {
      ui: { memoryProjects: new Map(), memoryStored: new Map() },
      loadStoredProject: async () => ({ project: { id: "p1" }, notices: ["The picture was left out."] }),
      setProject() {}, showView() {}, markTabStale() {},
      recordFingerprint: () => "",
      storedRevision: () => "2026-01-01T00:00:00Z",
      projectPayloads: () => [],
      savedBytes: new Map(),
      announce: (message, keep) => messages.push([message, keep]),
    };
    vm.runInNewContext(OPEN_PROJECT_CODE, sandbox);
    await sandbox.openProject("p1", true);
    assert.deepEqual(messages, [["A few saved settings had to be changed to open this project. The picture was left out.", true]]);
  });

  test("opening a project leaves the message alone, so a message written while it opens stays", async () => {
    const run = async (openId) => {
      const messages = [];
      const sandbox = {
        ui: { project: openId ? { id: openId } : null, memoryProjects: new Map(), memoryStored: new Map() },
        loadStoredProject: async () => ({ project: { id: "p2" }, notices: [] }),
        setProject() {}, showView() {}, markTabStale() {},
        recordFingerprint: () => "",
        storedRevision: () => "2026-01-01T00:00:00Z",
        projectPayloads: () => [],
        savedBytes: new Map(),
        announce: (message, keep) => messages.push([message, keep]),
      };
      vm.runInNewContext(OPEN_PROJECT_CODE, sandbox);
      await sandbox.openProject("p2", true);
      return messages;
    };
    assert.deepEqual(await run("p1"), []);
    assert.deepEqual(await run("p2"), []);
    assert.deepEqual(await run(null), [], "a message shown while the app starts stays");
  });

  test("a Workspace card's name and Edit button clear the message before the project opens", () => {
    const fake = fakePage();
    const calls = [];
    const sandbox = {
      ...fake,
      ui: {},
      drawDefaultIcon: () => ({ toDataURL: () => "" }),
      projectContents: () => "",
      iconButton: (icon, label, hidden) => { const button = fake.el("button", {}); button.label = label + hidden; return button; },
      openRename() {}, confirmDelete() {}, closeProjectMenus() {}, focusProjectMenu() {},
      announce: (message) => calls.push(["announce", message]),
      openProject: (id) => calls.push(["open", id]),
    };
    vm.runInNewContext(CARD_CODE, sandbox);
    const node = sandbox.projectCard({ id: "p2", name: "Other", items: [] });
    const nameButton = node.children[1].children[0];
    const editButton = node.children[2].children[0];
    assert.equal(editButton.label, "Edit Other");
    nameButton.click();
    editButton.click();
    assert.deepEqual(calls, [["announce", ""], ["open", "p2"], ["announce", ""], ["open", "p2"]]);
  });

  test("choosing another project under Recent keeps a failed save of the project left on screen", async () => {
    const fake = fakePage();
    const failed = "Agentprise couldn't save Team, because this browser's storage is full or blocked.";
    const messages = [];
    let status = "Opened team.zip as a project. Left out 1 file.";
    const sandbox = {
      ...fake,
      ui: {
        project: { id: "p1", name: "Team" },
        projects: [{ id: "p1", name: "Team" }, { id: "p2", name: "Other" }],
        memoryProjects: new Map(), memoryStored: new Map(),
      },
      RECENT_MAX: 5,
      readWorkspacePrefs: () => ({ recentProjectIds: ["p1", "p2"] }),
      announce: (message, keep) => { messages.push([message, keep]); status = message; },
      loadStoredProject: async (id) => ({ project: { id, name: "Other" }, notices: [] }),
      setProject(project) { sandbox.ui.project = project; },
      showView() {}, markTabStale() {},
      recordFingerprint: () => "",
      storedRevision: () => "2026-01-01T00:00:00Z",
      projectPayloads: () => [],
      savedBytes: new Map(),
    };
    sandbox.saveNow = async () => { sandbox.announce(failed, true); return null; };
    vm.runInNewContext(RECENT_CODE + OPEN_PROJECT_CODE, sandbox);
    sandbox.renderRecent();
    const links = fake.$("recent-list").children.map((item) => item.children[0]);
    links.find((link) => link.getAttribute("data-project-id") === "p2").click();
    await settle();
    assert.equal(sandbox.ui.project.id, "p2");
    assert.deepEqual(messages, [["", undefined], [failed, true]]);
    assert.equal(status, failed);
  });

  test("a download with warnings or setup notes keeps its message; a plain one clears", async () => {
    const run = async (warnings, report) => {
      const messages = [];
      const sandbox = {
        ui: { project: {} },
        currentItem: () => ({}),
        writeMsAgent: () => ({ fileName: "team.agent", text: "{}", warnings, report }),
        downloadBytes() {},
        toBytes: () => new Uint8Array(0),
        announce: (message, keep) => messages.push([message, keep]),
      };
      vm.runInNewContext(START_DOWNLOAD_CODE, sandbox);
      await sandbox.startDownload("msAgent");
      return messages[0];
    };
    assert.deepEqual(await run([], []), ["Downloaded team.agent.", false]);
    assert.deepEqual(await run(["The welcome message was left out."], []), ["Downloaded team.agent. The welcome message was left out.", true]);
    assert.deepEqual(await run([], [{ status: "requires-setup" }]), ["Downloaded team.agent. Some parts need to be set up. The Inspect page lists them.", true]);
  });
});

describe("focus after the actions in a project's More actions menu", () => {
  /** A Workspace card for id, with a More actions menu whose button is its summary. */
  function card(fake, id) {
    const node = element(fake, "", "li");
    node.setAttribute("data-project-id", id);
    const menu = element(fake, "", "details");
    const summary = element(fake, "", "summary");
    summary.label = "More actions for " + id;
    const rename = element(fake, "", "button");
    rename.label = "Rename " + id;
    menu.appendChild(summary);
    menu.appendChild(rename);
    node.appendChild(menu);
    node.querySelector = () => summary;
    menu.querySelector = () => summary;
    return { node, menu, summary, rename };
  }

  /** The menu code on a Workspace that lists these project ids. */
  function workspace(ids, view) {
    const fake = fakePage();
    const list = fake.$("project-list");
    const cards = ids.map((id) => card(fake, id));
    cards.forEach((entry) => list.appendChild(entry.node));
    let openDialog = false;
    fake.document.querySelector = (selector) => {
      if (selector === "dialog[open]") {
        return openDialog ? {} : null;
      }
      return selector === "details.project-menu[open]" ? cards.map((entry) => entry.menu).find((menu) => menu.open) || null : null;
    };
    fake.document.querySelectorAll = (selector) => (selector === "details.project-menu[open]" ? cards.map((entry) => entry.menu).filter((menu) => menu.open) : []);
    const sandbox = {
      ...fake,
      ui: { view: view || "workspace" },
      focusViewHeading: (name) => fake.$(name + "-heading").focus(),
    };
    vm.runInNewContext(MENU_CODE + "\nsetupProjectMenus();", sandbox);
    return { sandbox, fake, list, cards, setDialog: (open) => { openDialog = open; } };
  }

  test("focus moves to the project's More actions button after its card is drawn again", () => {
    const space = workspace(["p1", "p2"]);
    space.cards[1].menu.open = true;
    // Drawing the cards again leaves focus on the page itself.
    space.fake.document.activeElement = space.fake.document.body;
    space.sandbox.focusProjectMenu(["p2"]);
    assert.deepEqual(space.fake.focused, ["More actions for p2"]);
    assert.equal(space.cards[1].menu.open, false, "the menu closes");
  });

  test("focus moves from an action in the menu to the menu's button", () => {
    const space = workspace(["p1"]);
    space.cards[0].menu.open = true;
    space.cards[0].rename.focus();
    space.sandbox.focusProjectMenu(["p1"]);
    assert.equal(space.fake.document.activeElement, space.cards[0].summary);
  });

  test("after Make a copy, focus moves to the copy's button, or to the project's own when there is no copy", () => {
    const copied = workspace(["copy", "p1"]);
    copied.sandbox.focusProjectMenu(["copy", "p1"]);
    assert.deepEqual(copied.fake.focused, ["More actions for copy"]);

    const failed = workspace(["p1"]);
    failed.sandbox.focusProjectMenu([null, "p1"]);
    assert.deepEqual(failed.fake.focused, ["More actions for p1"]);
  });

  test("when the card is gone, focus moves to the Workspace heading", () => {
    const space = workspace(["p2"]);
    space.sandbox.focusProjectMenu(["p1"]);
    assert.deepEqual(space.fake.focused, ["workspace-heading"]);
  });

  test("focus the person moved elsewhere, or a page other than the Workspace, is left alone", () => {
    const moved = workspace(["p1"]);
    moved.fake.$("library-search").focus();
    moved.sandbox.focusProjectMenu(["p1"]);
    assert.deepEqual(moved.fake.focused, ["library-search"]);

    const elsewhere = workspace(["p1"], "project");
    elsewhere.sandbox.focusProjectMenu(["p1"]);
    assert.deepEqual(elsewhere.fake.focused, []);
  });

  test("while a dialog is open, Escape and clicks leave the menus alone", () => {
    const space = workspace(["p1"]);
    space.cards[0].menu.open = true;
    space.setDialog(true);
    space.fake.document.handlers.keydown.forEach((handler) => handler({ key: "Escape" }));
    space.fake.document.handlers.click.forEach((handler) => handler({ target: { closest: () => null } }));
    assert.equal(space.cards[0].menu.open, true);
    assert.deepEqual(space.fake.focused, []);

    space.setDialog(false);
    // A click on a button in a dialog arrives after the dialog closed.
    space.fake.document.handlers.click.forEach((handler) => handler({ target: { closest: (selector) => (selector === "dialog" ? {} : null) } }));
    assert.equal(space.cards[0].menu.open, true);
    space.fake.document.handlers.keydown.forEach((handler) => handler({ key: "Escape" }));
    assert.equal(space.cards[0].menu.open, false, "with no dialog open, Escape closes the menu");
  });

  /** setupDialogs with stand-ins; dialogs send close a moment after close(), as browsers do. */
  function dialogs() {
    const fake = fakePage();
    const focusCalls = [];
    const renamed = [];
    ["confirm-dialog", "rename-dialog", "preview-dialog"].forEach((id) => {
      const dialog = fake.$(id);
      dialog.close = () => { setTimeout(() => (dialog.handlers.close || []).forEach((handler) => handler()), 0); };
    });
    const sandbox = {
      ...fake,
      ui: { menuReturn: null, pendingConfirm: null, pendingAlt: null },
      focusProjectMenu: (ids) => focusCalls.push(Array.from(ids)),
      renameProject: async (id, name) => { renamed.push([id, name]); },
    };
    vm.runInNewContext(DIALOG_CODE + "\nsetupDialogs();", sandbox);
    return { sandbox, fake, focusCalls, renamed };
  }

  test("Cancel or Escape in Rename moves focus back to the project's More actions button", async () => {
    const page = dialogs();
    page.sandbox.ui.menuReturn = "p1";
    page.fake.$("rename-cancel").click();
    await settle();
    assert.deepEqual(page.focusCalls, [["p1"]]);
    assert.equal(page.sandbox.ui.menuReturn, null);
  });

  test("Save in Rename renames, then moves focus to the renamed card's button", async () => {
    const page = dialogs();
    page.sandbox.ui.menuReturn = "p1";
    page.fake.$("rename-dialog").setAttribute("data-project-id", "p1");
    page.fake.$("rename-input").value = "Team Helper";
    page.fake.$("rename-form").handlers.submit[0]({ preventDefault() {} });
    await settle();
    assert.deepEqual(page.renamed, [["p1", "Team Helper"]]);
    assert.deepEqual(page.focusCalls, [["p1"]], "focus moves once, after the rename");
  });

  test("Keep it moves focus back to the menu's button; Delete it leaves focus to the delete code", async () => {
    const kept = dialogs();
    kept.sandbox.ui.menuReturn = "p1";
    kept.fake.$("confirm-cancel").click();
    await settle();
    assert.deepEqual(kept.focusCalls, [["p1"]]);

    const deleted = dialogs();
    let proceeded = false;
    deleted.sandbox.ui.menuReturn = "p1";
    deleted.sandbox.ui.pendingConfirm = () => { proceeded = true; };
    deleted.fake.$("confirm-ok").click();
    await settle();
    assert.equal(proceeded, true);
    assert.deepEqual(deleted.focusCalls, []);
  });

  test("Rename and Delete remember the card, and any other confirm dialog forgets it", () => {
    const fake = fakePage();
    const sandbox = {
      ...fake,
      ui: { menuReturn: null },
      announce() {},
    };
    fake.$("confirm-dialog").showModal = () => {};
    fake.$("rename-dialog").showModal = () => {};
    fake.$("rename-input").select = () => {};
    vm.runInNewContext(CONFIRM_CODE + RENAME_CODE + DELETE_CODE, sandbox);
    sandbox.openRename({ id: "p1", name: "Team" });
    assert.equal(sandbox.ui.menuReturn, "p1");
    sandbox.confirmDelete({ id: "p2", name: "Other" });
    assert.equal(sandbox.ui.menuReturn, "p2");
    sandbox.openConfirm("Remove the tool?", "It goes away.", "Remove it", "Keep it", () => {});
    assert.equal(sandbox.ui.menuReturn, null);
  });

  test("Make a copy and Download backup move focus to a More actions button when they finish", async () => {
    const fake = fakePage();
    const focusCalls = [];
    const sandbox = {
      ...fake,
      ui: {},
      drawDefaultIcon: () => ({ toDataURL: () => "" }),
      projectContents: () => "",
      iconButton: (icon, label, hidden) => { const button = fake.el("button", {}); button.label = label + hidden; return button; },
      copyStoredProject: async () => "copy",
      backupStoredProject: async () => {},
      openRename() {}, confirmDelete() {}, openProject() {}, closeProjectMenus() {},
      focusProjectMenu: (ids) => focusCalls.push(Array.from(ids)),
    };
    vm.runInNewContext(CARD_CODE, sandbox);
    const node = sandbox.projectCard({ id: "p1", name: "Team", items: [] });
    assert.equal(node.getAttribute("data-project-id"), "p1");
    const find = (label) => {
      const all = [];
      const walk = (current) => { all.push(current); (current.children || []).forEach(walk); };
      walk(node);
      return all.find((part) => part.label === label);
    };
    find("Make a copy of Team").click();
    find("Download backup of Team").click();
    await settle();
    assert.deepEqual(focusCalls, [["copy", "p1"], ["p1"]]);
  });

  test("Make a copy gives the copy's id, or null when there is no copy", async () => {
    const run = async (overrides) => {
      const sandbox = {
        ui: { failedSaves: new Set() },
        announce() {},
        projectForCard: async (summary) => ({ project: { id: summary.id } }),
        duplicateProject: () => ({ id: "copy", name: "Team (copy)" }),
        saveStoredProject: async () => true,
        refreshProjectList: async () => {},
        failedSaveMessage: () => "",
        failureReason: () => "Try again in a moment.",
        PROJECT_MISSING_MESSAGE: "Missing.",
        ...overrides,
      };
      vm.runInNewContext(COPY_CODE, sandbox);
      return sandbox.copyStoredProject({ id: "p1", name: "Team" });
    };
    assert.equal(await run(), "copy");
    assert.equal(await run({ saveStoredProject: async () => null }), "copy");
    assert.equal(await run({ projectForCard: async () => null }), null);
    assert.equal(await run({ projectForCard: async () => { throw new TypeError("Unexpected."); } }), null);
  });
});

describe("a Download button blocked by its report", () => {
  const instructionsLine = { component: "Instructions", status: "blocked", note: "The instructions and tool notes are 8,412 characters, and Copilot allows 8,000. Shorten the instructions by 412 characters." };

  /** updateDerived with these buttons, report lines by format, required questions left empty or not, and plugin stand-ins. */
  function derive(buttons, reports, unanswered, plugin) {
    const fake = fakePage();
    const notesCalls = [];
    fake.document.querySelectorAll = (selector) => (selector === ".download-button" ? buttons : []);
    const sandbox = {
      ...fake,
      ui: { project: { items: [] }, view: "project" },
      currentItem: () => ({ kind: "agent", skillName: "team", compatibility: "" }),
      LIMITS: { instructions: 8000, skillBody: 50000 },
      itemBody: () => "",
      iconPreviewUri: () => "",
      itemRunsScript: () => false,
      sizeNameBlank() {}, autosize() {},
      validateItem: () => ({ problems: unanswered ? [{ field: "name" }] : [], warnings: [] }),
      scanProject: () => [],
      fileTextsForScan: () => [],
      projectHasContent: () => true,
      pluginItemsBlocked: () => false,
      pluginWaitingItems: () => [],
      ...(plugin || {}),
      downloadReport: (format) => reports[format] || [],
      blockedLines: (report) => report.filter((entry) => entry.status === "blocked"),
      renderDestinationNotes: (project, item, blocks, waiting) => notesCalls.push(Object.assign({}, blocks, { waiting })),
      renderPreview() {}, renderReadiness() {}, renderReview() {}, renderItemBar() {}, renderBreadcrumb() {}, renderProjectNav() {},
      scheduleProductRender() {},
      KIND_WORDS: { agent: { noun: "assistant" } },
    };
    vm.runInNewContext(HELPERS_CODE + DERIVED_CODE, sandbox);
    sandbox.updateDerived();
    return { notesCalls };
  }

  /** A Download button for format. */
  function downloadButton(fake, format, id) {
    const button = element(fake, id || "", "button");
    button.setAttribute("data-format", format);
    button.disabled = false;
    return button;
  }

  test("the button stays focusable, marked aria-disabled, and its report lines go to its note", () => {
    const fake = fakePage();
    const teams = downloadButton(fake, "teamsZip");
    const claude = downloadButton(fake, "claudeSkill");
    const result = derive([teams, claude], { teamsZip: [instructionsLine] }, false);
    assert.equal(teams.disabled, false);
    assert.equal(teams.getAttribute("aria-disabled"), "true");
    assert.equal(claude.disabled, false);
    assert.equal(claude.getAttribute("aria-disabled"), null);
    assert.deepEqual(result.notesCalls[0].teamsZip, [instructionsLine]);
    assert.deepEqual(result.notesCalls[0].claudeSkill, []);
  });

  test("an empty required question still disables the button, since the box above lists it", () => {
    const fake = fakePage();
    const teams = downloadButton(fake, "teamsZip");
    teams.setAttribute("aria-disabled", "true");
    derive([teams], { teamsZip: [instructionsLine] }, true);
    assert.equal(teams.disabled, true);
    assert.equal(teams.getAttribute("aria-disabled"), null);
  });

  test("a plugin that waits on another item's required question stays focusable; one that waits only on the open item is disabled", () => {
    const fake = fakePage();
    const plugin = downloadButton(fake, "claudePlugin");
    const skill = { id: "s1", name: "Summaries", kind: "skill" };
    const result = derive([plugin], {}, false, { pluginItemsBlocked: () => true, pluginWaitingItems: () => [skill] });
    assert.equal(plugin.disabled, false);
    assert.equal(plugin.getAttribute("aria-disabled"), "true");
    assert.deepEqual(result.notesCalls[0].waiting.claudePlugin, [skill]);

    const alone = downloadButton(fake, "claudePlugin");
    derive([alone], {}, true, { pluginItemsBlocked: () => true, pluginWaitingItems: () => [] });
    assert.equal(alone.disabled, true);
    assert.equal(alone.getAttribute("aria-disabled"), null);
  });

  test("the Inspect page's Download button and the Review buttons keep their own states", () => {
    const fake = fakePage();
    const inspect = downloadButton(fake, "teamsZip", "product-download");
    const review = downloadButton(fake, "copilotSkill");
    review.setAttribute("data-review", "true");
    derive([inspect, review], { teamsZip: [instructionsLine], copilotSkill: [instructionsLine] }, false);
    assert.equal(inspect.disabled, true);
    assert.equal(inspect.getAttribute("aria-disabled"), null);
    assert.equal(review.disabled, false);
    assert.equal(review.getAttribute("aria-disabled"), null);
  });

  /** renderDestinationNotes with an item marked as not for these products, and items a plugin waits on. */
  function notes(notFor, blocks, waiting) {
    const fake = fakePage();
    const buttons = {};
    const views = [];
    fake.document.querySelector = (selector) => {
      const format = selector.match(/data-format='(\w+)'/)[1];
      return (buttons[format] = buttons[format] || downloadButton(fake, format));
    };
    const sandbox = {
      ...fake,
      EXPORTS: new Proxy({}, { get: (target, key) => ({ target: { teamsZip: "copilot", claude: "claude", gemini: "gemini", chatgpt: "chatgpt", claudePlugin: "claude" }[key] || "copilot" }) }),
      notForTarget: (item, target) => item.notFor.includes(target),
      notForPhrase: (item, target) => "as not for " + target + ".",
      KIND_WORDS: { agent: { noun: "assistant" }, skill: { noun: "skill" } },
      announce() {},
      showView: (name, moveFocus) => views.push(["view", name, moveFocus]),
      selectProduct: (name) => views.push(["product", name]),
      selectItem: (id, moveFocus) => views.push(["item", id, moveFocus]),
      itemLabel: (item) => item.name || "this " + item.kind,
      namesInSentence: (names) => (names.length <= 2 ? names.join(" and ") : names.slice(0, -1).join(", ") + ", and " + names[names.length - 1]),
    };
    vm.runInNewContext(HELPERS_CODE + EXPORTS_CODE + NOTES_CODE, sandbox);
    sandbox.renderDestinationNotes({}, { id: "a1", kind: "agent", name: "Team", notFor }, blocks, waiting);
    return { fake, buttons, views };
  }

  test("the note says why, links to the product's Inspect tab, and describes the button", () => {
    const result = notes([], { teamsZip: [instructionsLine], geminiSkill: [instructionsLine] });
    const note = result.fake.$("note-teamsZip");
    assert.equal(note.hidden, false);
    assert.equal(textOf(note), "Agentprise can't make this download yet. Instructions: " + instructionsLine.note + " See details in Inspect");
    assert.equal(result.buttons.teamsZip.getAttribute("aria-describedby"), "note-teamsZip");
    const link = note.children.find((child) => child.tag === "a");
    assert.equal(link.getAttribute("href"), "#details");
    link.click();
    result.fake.$("note-geminiSkill").children.find((child) => child.tag === "a").click();
    assert.deepEqual(result.views, [["view", "details", true], ["product", "teamsZip"], ["view", "details", true], ["product", "gemini"]]);
  });

  test("a plugin's note names the other items with an empty required question and links to the first one", () => {
    const one = notes([], {}, { claudePlugin: [{ id: "s1", kind: "skill", name: "Summaries" }] });
    const note = one.fake.$("note-claudePlugin");
    assert.equal(note.hidden, false);
    assert.equal(textOf(note), "Agentprise can't make this download yet, because Summaries still has an empty required question. Open Summaries");
    assert.equal(one.buttons.claudePlugin.getAttribute("aria-describedby"), "note-claudePlugin");
    note.children.find((child) => child.tag === "a").click();
    assert.deepEqual(one.views, [["item", "s1", true]]);

    const three = notes([], {}, { portablePlugin: [{ id: "a1", kind: "agent", name: "Team" }, { id: "s1", kind: "skill", name: "" }, { id: "s2", kind: "skill", name: "Notes" }] });
    const many = three.fake.$("note-portablePlugin");
    assert.equal(textOf(many), "Agentprise can't make this download yet, because Team, the skill with no name, and Notes still have empty required questions. Open the skill with no name");
    many.children.find((child) => child.tag === "a").click();
    assert.deepEqual(three.views, [["item", "s1", true]]);
  });

  test("a download with no reason has no note and no description", () => {
    const result = notes([], {});
    assert.equal(result.fake.$("note-teamsZip").hidden, true);
    assert.equal(result.buttons.teamsZip.getAttribute("aria-describedby"), null);
    assert.equal(result.fake.$("chatgpt-copy").getAttribute("aria-disabled"), null);
  });

  test("an item marked as not for a product keeps its short note, and the ChatGPT button stays focusable", () => {
    const result = notes(["claude", "chatgpt"], { claudeSkill: [{ component: "Team", status: "blocked", note: "The author marked this assistant as not for Claude." }] });
    assert.equal(textOf(result.fake.$("note-claudeSkill")), "Marked as not for claude.");
    assert.equal(result.fake.$("note-claudeSkill").children.some((child) => child.tag === "a"), false);
    assert.equal(result.fake.$("chatgpt-copy").getAttribute("aria-disabled"), "true");
  });

  test("pressing an unavailable button only says why; an available one downloads", () => {
    const fake = fakePage();
    const teams = downloadButton(fake, "teamsZip");
    const claude = downloadButton(fake, "claudeSkill");
    teams.setAttribute("aria-disabled", "true");
    fake.document.querySelectorAll = (selector) => (selector === ".download-button" ? [teams, claude] : []);
    const messages = [];
    const downloads = [];
    const opened = [];
    const sandbox = {
      ...fake,
      ui: { project: { items: [] } },
      currentItem: () => ({ id: "a1", kind: "agent", name: "Team" }),
      itemLabel: (item) => item.name,
      notForPhrase: (item, target) => "as not for " + target + ".",
      downloadReport: (format) => (format === "teamsZip" || format === "chatgpt" ? [instructionsLine] : []),
      runDownload: (format) => downloads.push(format),
      announce: (message, keep) => messages.push([message, keep]),
      showView: (name) => opened.push(name),
      selectProduct() {},
    };
    vm.runInNewContext(HELPERS_CODE + NOTES_CODE + DOWNLOAD_SETUP_CODE + "\nsetupDownloads();", sandbox);
    teams.click();
    claude.click();
    assert.deepEqual(downloads, ["claudeSkill"]);
    assert.deepEqual(messages, [["Agentprise can't make this download yet. Instructions: " + instructionsLine.note, true]]);

    fake.$("chatgpt-copy").setAttribute("aria-disabled", "true");
    fake.$("chatgpt-copy").click();
    assert.deepEqual(opened, [], "the ChatGPT tab doesn't open");
    assert.deepEqual(messages[1], ["Agentprise can't copy this text, because the author marked Team as not for chatgpt. To copy it anyway, open More settings, then Products it works in, and check ChatGPT.", true]);
    fake.$("chatgpt-copy").removeAttribute("aria-disabled");
    fake.$("chatgpt-copy").click();
    assert.deepEqual(opened, ["details"]);
  });

  test("pressing an unavailable plugin button names the other items with an empty required question", () => {
    const fake = fakePage();
    const plugin = downloadButton(fake, "claudePlugin");
    plugin.setAttribute("aria-disabled", "true");
    fake.document.querySelectorAll = (selector) => (selector === ".download-button" ? [plugin] : []);
    const messages = [];
    const team = { id: "a1", kind: "agent", name: "Team" };
    const skill = { id: "s1", kind: "skill", name: "Summaries" };
    const sandbox = {
      ...fake,
      ui: { project: { items: [team, skill] } },
      currentItem: () => team,
      EXPORTS: { claudePlugin: { target: "claude" } },
      notForTarget: () => false,
      validateItem: (project, item) => ({ problems: item === skill ? [{ field: "description" }] : [] }),
      itemLabel: (item) => item.name,
      KIND_WORDS: { agent: { noun: "assistant" }, skill: { noun: "skill" } },
      namesInSentence: (names) => names.join(" and "),
      downloadReport: () => [],
      runDownload() {},
      announce: (message, keep) => messages.push([message, keep]),
    };
    vm.runInNewContext(HELPERS_CODE + NOTES_CODE + DOWNLOAD_SETUP_CODE + "\nsetupDownloads();", sandbox);
    plugin.click();
    assert.deepEqual(messages, [["Agentprise can't make this download yet, because Summaries still has an empty required question.", true]]);
  });

  test("an unavailable button has muted text and a dashed border, not lower opacity, so its focus ring keeps full contrast", () => {
    assert.match(page, /button\[aria-disabled="true"\], button\[aria-disabled="true"\]:hover \{ color: var\(--muted\); background: var\(--panel\); border-style: dashed; cursor: not-allowed; \}/);
  });
});

describe("the Library strip's arrows", () => {
  /** The strip with its track scrolled to scrollLeft. */
  function strip(scrollLeft) {
    const fake = fakePage();
    const track = fake.$("strip-track");
    Object.assign(track, { scrollWidth: 1000, clientWidth: 400, scrollLeft, scrolled: [], scrollBy(options) { track.scrolled.push(options.left); } });
    const sandbox = {
      ...fake,
      window: { matchMedia: () => ({ matches: true }), addEventListener() {} },
    };
    vm.runInNewContext(HELPERS_CODE + STRIP_CODE + "\nsetupStrip();\nupdateStripArrows();", sandbox);
    return { fake, track, back: fake.$("strip-back"), forward: fake.$("strip-forward") };
  }

  test("at the start, Scroll back is marked aria-disabled, never disabled, and ignores clicks", () => {
    const start = strip(0);
    assert.equal(start.back.getAttribute("aria-disabled"), "true");
    assert.equal(start.back.disabled, undefined, "a disabled button would lose focus");
    assert.equal(start.forward.getAttribute("aria-disabled"), null);
    start.back.focus();
    start.back.click();
    assert.deepEqual(start.track.scrolled, []);
    assert.equal(start.fake.document.activeElement, start.back, "focus stays on the button");
    start.forward.click();
    assert.equal(start.track.scrolled.length, 1);
  });

  test("at the end, Scroll forward is marked aria-disabled and ignores clicks", () => {
    const end = strip(600);
    assert.equal(end.forward.getAttribute("aria-disabled"), "true");
    assert.equal(end.back.getAttribute("aria-disabled"), null);
    end.forward.click();
    assert.deepEqual(end.track.scrolled, []);
  });
});

describe("Library loading and failure messages", () => {
  /** renderLibrary with a catalog that loads or fails; timers run when the test says so. */
  function library(catalogLoads, catalogOk) {
    const fake = fakePage();
    const timers = manualTimers();
    const statusTexts = [];
    const retryWrites = [];
    const retry = fake.$("library-retry");
    let disabled = false;
    Object.defineProperty(retry, "disabled", { get: () => disabled, set: (value) => { retryWrites.push(value); disabled = value; } });
    retry.hidden = true;
    const ui = { catalog: [], catalogOk: catalogOk === true, libraryTag: "" };
    const sandbox = {
      ...fake,
      ...timers,
      ui,
      libraryLoading: null,
      STATUS_REPEAT_MS: 100,
      APP_SITE_URL: "https://example.org/agentprise/",
      setText: (node, text) => { statusTexts.push(text); node.textContent = text; },
      ensureLibrary: async () => { retryWrites.push("request"); ui.catalogOk = catalogLoads; },
      libraryAvailable: () => true,
      renderLibraryFilters() {},
      matchesLibraryFilter: () => true,
      libraryEntryMatchesQuery: () => true,
      storeCard: (entry) => entry,
    };
    vm.runInNewContext(LIBRARY_CODE, sandbox);
    return { sandbox, fake, timers, statusTexts, retryWrites, status: fake.$("library-status") };
  }

  const FAILED = "The Library couldn't be loaded. Choose Try again to request it again.";

  test("the loading and failure messages call it the Library", async () => {
    const lib = library(false);
    await lib.sandbox.renderLibrary();
    lib.timers.runAll();
    assert.deepEqual(lib.statusTexts, ["Loading the Library...", "", FAILED]);
  });

  test("a second failed retry clears the line, then writes it again after a pause, so it is read again", async () => {
    const lib = library(false);
    await lib.sandbox.renderLibrary();
    lib.timers.runAll();
    lib.statusTexts.length = 0;
    await lib.sandbox.renderLibrary();
    assert.equal(lib.status.textContent, "", "cleared right away");
    assert.deepEqual(lib.timers.pending.map((timer) => timer.delay), [100]);
    lib.timers.runAll();
    assert.equal(lib.status.textContent, FAILED);
    assert.deepEqual(lib.statusTexts, ["Loading the Library...", "", FAILED]);
  });

  test("a failure line written late never replaces a newer one", async () => {
    const lib = library(false);
    await lib.sandbox.renderLibrary();
    lib.sandbox.setText(lib.status, "Loading the Library...");
    lib.timers.runAll();
    assert.equal(lib.status.textContent, "Loading the Library...");
  });

  test("Try again is disabled only while a request for the Library runs", async () => {
    const failing = library(false);
    await failing.sandbox.renderLibrary();
    assert.deepEqual(failing.retryWrites, [true, "request", false]);

    // A search after the Library loaded leaves the hidden button alone.
    const loaded = library(true, true);
    loaded.fake.$("library-search").value = "coach";
    await loaded.sandbox.renderLibrary();
    assert.deepEqual(loaded.retryWrites, ["request"]);
  });

  test("interface text names the Library page with a capital L", () => {
    for (const old of ["Loading the library", "The library could not be loaded", "Or start from the library", "See the whole library", "Pick one from the library", "Search the library", "The library file"]) {
      assert.equal(page.includes(old), false, old);
    }
  });
});
