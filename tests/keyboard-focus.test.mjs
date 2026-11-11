// This file is part of Agentprise
// tests/keyboard-focus.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-11
// Summary: Tests where keyboard focus goes and what screen readers hear when
//          a person uses the skip link, browser Back and Forward, a Remove
//          button in a file list, the picture control, and Add files. The
//          interface code is taken from index.html and run with small
//          stand-ins for the page.
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
// Lines end in LF here, so the markers match on a checkout that uses CRLF.
const page = readFileSync(join(repoRoot, "index.html"), "utf8").replace(/\r\n/g, "\n");
const encode = (text) => new TextEncoder().encode(text);

/** The page source from one marker up to, not including, another. */
function slice(startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  const end = page.indexOf(endMarker, start);
  assert.ok(start !== -1 && end > start, "Could not find " + startMarker + " in index.html");
  return page.slice(start, end);
}

// The interface code is not exposed on the engine namespace: the page names
// and the code that shows a page, the list helpers and Remove buttons,
// field errors, Add files, and the picture control's handlers.
const NAV_CODE = slice("const VIEW_NAMES = ", "// Inspect tabs in label order")
  + slice("/** Includes LEGACY_HASHES. */", "/** The open project's name and Inspect under Workspace");
const SETUP_NAV_CODE = slice("/** True for an address part that names a page", "// ### Interface: workspace storage ###");
const FIELD_ERROR_CODE = slice("/**\n * Shows or clears the error under a field", "/** Saved starters plus empty blanks");
const LIST_CODE = slice("/**\n * Moves focus after a Remove button rebuilds its list", "function renderEmailItems()")
  + slice("function renderSharepointItems()", "function formatSize(bytes)");
const ADD_FILES_CODE = slice("/** Adds picked files to the references folder", "function readStartersField()");
const PICTURE_CODE = slice("$(\"icon-input\").addEventListener(\"change\"", "$(\"add-skill\").addEventListener");

/** A page element with the parts the code uses; handlers are kept by event name. */
function element(id, focusLog) {
  const handlers = {};
  const attributes = {};
  const node = {
    id, handlers, attributes, children: [], hidden: false, textContent: "", value: "", files: null, tag: "",
    addEventListener: (name, handler) => { (handlers[name] = handlers[name] || []).push(handler); },
    setAttribute: (name, value) => { attributes[name] = String(value); },
    removeAttribute: (name) => { delete attributes[name]; },
    appendChild: (child) => { node.children.push(child); },
    focus: () => { focusLog.push(node.id || node.label); },
    click: () => { (handlers.click || []).forEach((handler) => handler({ target: node })); },
    // Only Remove buttons are looked up in a list.
    querySelectorAll: () => node.children.flatMap((child) => child.children.filter((part) => part.tag === "button")),
  };
  return node;
}

/** Element stand-ins for $, el, clearChildren, and setText; focus is logged by id or label. */
function fakePage() {
  const focused = [];
  const elements = {};
  return {
    focused,
    elements,
    $: (id) => (elements[id] = elements[id] || element(id, focused)),
    el(tag, attributes, children) {
      const node = element("", focused);
      node.tag = tag;
      node.label = attributes["aria-label"] || attributes.text || "";
      node.children = children || [];
      return node;
    },
    clearChildren: (node) => { node.children = []; },
    setText: (node, text) => { node.textContent = text; },
  };
}

describe("the skip link and browser Back and Forward", () => {
  /** Runs the page code on a page showing view, with a stand-in address and history. */
  function navigation(view, hash) {
    const fake = fakePage();
    const messages = [];
    const history = [];
    const listeners = {};
    const location = { hash };
    const sandbox = {
      ...fake,
      ui: { project: null, view },
      location,
      history: {
        pushState: (state, title, address) => { history.push("push " + address); location.hash = address; },
        replaceState: (state, title, address) => { history.push("replace " + address); location.hash = address; },
      },
      window: { addEventListener: (name, handler) => { listeners[name] = handler; } },
      document: { addEventListener: (name, handler) => { listeners[name] = handler; } },
      announce: (message) => messages.push(message),
      renderWorkspace() {}, renderForm() {}, renderInspectItems() {}, renderProductPanel() {},
      renderLibrary() {}, renderRecent() {}, renderBreadcrumb() {}, renderProjectNav() {},
    };
    vm.runInNewContext(NAV_CODE + SETUP_NAV_CODE + "\nsetupNavigation();", sandbox);
    return { sandbox, messages, history, listeners, location, focused: fake.focused };
  }

  /** A click on a link with this address. */
  function clickLink(listeners, href) {
    const event = { prevented: false, preventDefault() { this.prevented = true; }, target: { closest: () => ({ getAttribute: () => href }) } };
    listeners.click(event);
    return event;
  }

  test("the skip link moves focus into the open page and keeps the page and address", () => {
    const nav = navigation("help", "#help");
    const event = clickLink(nav.listeners, "#main");
    assert.equal(event.prevented, true, "the browser doesn't change the address");
    assert.deepEqual(nav.focused, ["main"]);
    assert.equal(nav.sandbox.ui.view, "help");
    assert.deepEqual(nav.history, []);
  });

  test("a menu link still opens its page and adds it to the history", () => {
    const nav = navigation("help", "#help");
    clickLink(nav.listeners, "#library");
    assert.equal(nav.sandbox.ui.view, "library");
    assert.deepEqual(nav.history, ["push #library"]);
    assert.deepEqual(nav.focused, ["library-heading"]);
  });

  test("Back and Forward move focus to the new page's heading", () => {
    const nav = navigation("help", "#help");
    nav.location.hash = "#library";
    nav.listeners.popstate();
    assert.equal(nav.sandbox.ui.view, "library");
    assert.deepEqual(nav.focused, ["library-heading"]);
    assert.deepEqual(nav.messages, [""], "the last page's message is cleared");
    assert.deepEqual(nav.history, [], "the address already names the page");
  });

  test("Back to an address that names no page keeps the open page", () => {
    const nav = navigation("help", "#help");
    nav.location.hash = "#main";
    nav.listeners.popstate();
    assert.equal(nav.sandbox.ui.view, "help");
    assert.deepEqual(nav.focused, ["help-heading"]);
    assert.deepEqual(nav.history, ["replace #help"], "the pages after this one in the history stay");
  });

  test("Back to the first address, or to the editor with no project open, never adds a page", () => {
    const first = navigation("help", "#help");
    first.location.hash = "";
    first.listeners.popstate();
    assert.equal(first.sandbox.ui.view, "workspace");
    assert.deepEqual(first.history, ["replace #workspace"], "Back can still leave the app");

    const editor = navigation("help", "#help");
    editor.location.hash = "#project";
    editor.listeners.popstate();
    assert.equal(editor.sandbox.ui.view, "workspace");
    assert.deepEqual(editor.history, ["replace #workspace"]);
    assert.deepEqual(editor.focused, ["workspace-heading"]);
  });

  test("an older address such as #home still opens its page", () => {
    const nav = navigation("help", "#help");
    nav.location.hash = "#home";
    nav.listeners.popstate();
    assert.equal(nav.sandbox.ui.view, "workspace");
  });

  test("the first page load replaces the address and leaves focus alone", () => {
    assert.match(slice("async function initApp()", "// The engine has no DOM dependency"), /\n    showView\(view, false, true\);\n/);
  });
});

describe("Remove buttons in file lists", () => {
  /** An assistant with these attached files, with its list drawn. */
  function fileList(names) {
    const fake = fakePage();
    const messages = [];
    const item = { kind: "agent", files: names.map((name) => ({ path: "references/" + name, bytes: encode("x") })), sharepointItems: [] };
    const sandbox = {
      ...fake,
      currentItem: () => item,
      pathLeaf: (path) => path.split("/").pop(),
      formatSize: () => "1 KB",
      updateDerived() {}, scheduleSave() {}, renderScriptToolForm() {},
      announce: (message) => messages.push(message),
    };
    vm.runInNewContext(LIST_CODE, sandbox);
    sandbox.renderFiles();
    return { sandbox, messages, item, focused: fake.focused, list: fake.$("file-items") };
  }

  const removeButton = (list, row) => list.querySelectorAll()[row];

  test("removing a file moves focus to the Remove button now in its row", () => {
    const page = fileList(["a.txt", "b.txt", "c.txt"]);
    removeButton(page.list, 0).click();
    assert.deepEqual(page.focused, ["Remove b.txt"]);
    assert.deepEqual(page.messages, ["Removed a.txt."]);
  });

  test("removing the last file in the list moves focus to the row before it", () => {
    const page = fileList(["a.txt", "b.txt", "c.txt"]);
    removeButton(page.list, 2).click();
    assert.deepEqual(page.focused, ["Remove b.txt"]);
  });

  test("removing three files in a row keeps focus in the list, then moves it to Add files", () => {
    const page = fileList(["a.txt", "b.txt", "c.txt"]);
    for (let i = 0; i < 3; i++) {
      removeButton(page.list, 0).click();
    }
    assert.deepEqual(page.focused, ["Remove b.txt", "Remove c.txt", "file-add"]);
    assert.deepEqual(page.item.files, []);
  });

  test("removing the last SharePoint source moves focus to the SharePoint switch", () => {
    const page = fileList([]);
    page.item.sharepointItems = [{ name: "Handbook", type: "File" }, { name: "Policies", type: "Folder" }];
    // The form is drawn again after a source is removed.
    page.sandbox.renderForm = () => page.sandbox.renderSharepointItems();
    page.sandbox.renderSharepointItems();
    const list = page.sandbox.$("sharepoint-items");
    removeButton(list, 1).click();
    removeButton(list, 0).click();
    assert.deepEqual(page.focused, ["Remove Handbook", "c-sharepoint"]);
    assert.equal(page.sandbox.$("sharepoint-items-wrap").hidden, true);
  });
});

describe("errors that screen readers read", () => {
  test("a refused picture is announced, described by the control, and marks it invalid until a picture is accepted", async () => {
    const fake = fakePage();
    const messages = [];
    const item = { kind: "agent", icon: null };
    let upload = async () => { throw new Error("Please choose a PNG or JPG image."); };
    const sandbox = {
      ...fake,
      currentItem: () => item,
      iconFromUpload: (file) => upload(file),
      updateDerived() {}, scheduleSave() {},
      announce: (message, keep) => messages.push([message, Boolean(keep)]),
    };
    vm.runInNewContext(FIELD_ERROR_CODE + PICTURE_CODE, sandbox);
    const input = fake.$("icon-input");
    const change = () => input.handlers.change[0]({ target: { files: [{ name: "photo.gif" }], value: "photo.gif" } });

    await change();
    assert.deepEqual(messages, [["Please choose a PNG or JPG image.", true]]);
    assert.equal(fake.$("icon-error").textContent, "Please choose a PNG or JPG image.");
    assert.equal(fake.$("icon-error").hidden, false);
    assert.equal(input.attributes["aria-invalid"], "true");
    assert.match(page.match(/<input type="file" id="icon-input"[^>]*>/)[0], /aria-describedby="icon-hint icon-error"/);

    upload = async () => ({ bytes: encode("png"), mime: "image/png" });
    await change();
    assert.equal(input.attributes["aria-invalid"], undefined);
    assert.equal(fake.$("icon-error").hidden, true);
    assert.deepEqual(messages[1], ["Picture updated.", false]);

    upload = async () => { throw new Error("That image could not be read. Please try another one."); };
    await change();
    assert.equal(input.attributes["aria-invalid"], "true");
    fake.$("icon-remove").handlers.click[0]();
    assert.equal(input.attributes["aria-invalid"], undefined, "Use the default clears the error too");
    assert.equal(fake.$("icon-error").hidden, true);
  });

  /** Add files for an assistant that already has notes.txt, with these files chosen. */
  async function addFiles(chosen) {
    const fake = fakePage();
    const messages = [];
    const item = { kind: "agent", files: [{ path: "references/notes.txt", bytes: encode("notes") }] };
    const sandbox = {
      ...fake,
      currentItem: () => item,
      readFileBytes: async (file) => file.bytes,
      BUNDLE_FILES_FOLDER: "references/",
      nameLeaf: (name) => name.split(/[\\/]/).pop(),
      pathLeaf: (path) => path.split("/").pop(),
      normalizeAgent: engine.normalizeAgent,
      bytesEqual: engine.bytes.equal,
      countOf: (count, singular, plural) => count + " " + (count === 1 ? singular : plural),
      renderFiles() {}, updateDerived() {}, scheduleSave() {},
      announce: (message, keep) => messages.push([message, Boolean(keep)]),
    };
    vm.runInNewContext(FIELD_ERROR_CODE + ADD_FILES_CODE, sandbox);
    await sandbox.addFiles(chosen);
    return { messages, item, error: fake.$("file-add-error"), input: fake.$("file-add") };
  }

  const program = { name: "setup.exe", bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) };

  test("files left out by Add files are announced with their reasons", async () => {
    const added = await addFiles([{ name: "plan.txt", bytes: encode("plan") }, program]);
    assert.equal(added.item.files.length, 2);
    assert.equal(added.messages.length, 1);
    const [message, keep] = added.messages[0];
    assert.match(message, /^Added 1 file\. Left out 1 attached file: setup\.exe \(/);
    assert.equal(keep, false);
    assert.equal(added.error.textContent, message.replace("Added 1 file. ", ""), "the same reasons stay under the button");
    assert.match(page.match(/<input type="file" id="file-add"[^>]*>/)[0], /aria-describedby="file-add-hint file-add-error"/);
  });

  test("when Add files adds nothing, the reasons are announced as an error that stays", async () => {
    const refused = await addFiles([program, { name: "notes.txt", bytes: encode("again") }]);
    assert.equal(refused.item.files.length, 1);
    const [message, keep] = refused.messages[0];
    assert.match(message, /^Didn't add any files\. Left out 2 attached files: setup\.exe \(.+\), notes\.txt \(another file has the same name\)/);
    assert.equal(keep, true);
    assert.equal(refused.input.attributes["aria-invalid"], "true");
  });
});

describe("file pickers and Tab stops", () => {
  test("each file picker styled as a button comes right after its label, so the focus rule reaches it", () => {
    assert.match(page, /\.button:has\(\+ input\[type=file\]:focus-visible\) \{ outline: 3px solid var\(--focus\); outline-offset: 2px; \}/);
    for (const id of ["add-from-file", "icon-input", "file-add"]) {
      assert.match(page, new RegExp("<label class=\"button\" for=\"" + id + "\">[^\\n]*</label>\\s*<input type=\"file\" id=\"" + id + "\""), id);
    }
  });

  test("the Workspace's hidden file control is not a Tab stop", () => {
    assert.match(page.match(/<input type="file" id="file-input"[^>]*>/)[0], /tabindex="-1"/);
  });
});
