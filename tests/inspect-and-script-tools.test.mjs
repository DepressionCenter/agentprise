// This file is part of Agentprise
// tests/inspect-and-script-tools.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-11
// Last Modified: 2026-11-11
// Summary: Tests that Inspect highlights a crafted file quickly and stops
//          after a fixed number of marks, that a skill's author can add files
//          to its scripts folder and make a script tool that every product
//          able to run scripts uses, and that the unused Inspect field map is
//          gone. The interface code is taken from index.html and run with
//          small stand-ins for the page.
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

const HIGHLIGHT_CODE = slice("// Inspect stops adding marks after this many", "// Longer text files show only their start");
const FIELD_ERROR_CODE = slice("/**\n * Shows or clears the error under a field", "/** Saved starters plus empty blanks");
const ADD_FILES_CODE = slice("/** Adds picked files to the references folder", "function readStartersField()");
const SCRIPT_FORM_CODE = slice("/** Shows the Add a script tool form", "/** How a tool works in one product");

/** A page element with the parts the code uses; focus is logged by id. */
function element(id, focused) {
  const node = {
    id, tag: "", attributes: {}, children: [], hidden: false, textContent: "", value: "",
    setAttribute(name, value) { node.attributes[name] = String(value); },
    removeAttribute(name) { delete node.attributes[name]; },
    appendChild(child) { node.children.push(child); return child; },
    focus() { focused.push(node.id); },
  };
  return node;
}

/** Stand-ins for $, el, clearChildren, setText, and document. */
function fakePage() {
  const focused = [];
  const elements = {};
  return {
    focused,
    elements,
    $: (id) => (elements[id] = elements[id] || element(id, focused)),
    el(tag, attributes) {
      const node = element("", focused);
      node.tag = tag;
      Object.assign(node, { value: (attributes || {}).value || "", textContent: (attributes || {}).text || "" });
      return node;
    },
    clearChildren: (node) => { node.children = []; },
    setText: (node, text) => { node.textContent = text; },
    document: { createTextNode: (text) => ({ tag: "#text", textContent: text }) },
  };
}

/** A skill with these files, normalized. */
function skillProject(files) {
  return engine.project.normalize({
    name: "Report Kit",
    items: [{ kind: "skill", name: "Monthly Report", description: "Makes the monthly report.", body: "Make the report.", capabilities: [], files }],
  }).project;
}

const SCRIPT = { path: "scripts/report.py", bytes: encode("print('report')\n") };

describe("highlighting the person's words on the Inspect page", () => {
  /** The marks and text appendHighlighted adds for this text and these needles. */
  function highlight(text, needles) {
    const fake = fakePage();
    const sandbox = { ...fake };
    vm.runInNewContext(HIGHLIGHT_CODE, sandbox);
    const container = element("file-body", fake.focused);
    sandbox.appendHighlighted(container, text, needles);
    return container.children;
  }

  test("a longer value wins where two start at the same place, and no text is lost", () => {
    const parts = highlight("Golden Scout and Golden notes", ["Golden Scout", "Golden"]);
    assert.deepEqual(parts.map((part) => [part.tag, part.textContent]), [
      ["mark", "Golden Scout"], ["#text", " and "], ["mark", "Golden"], ["#text", " notes"],
    ]);
    assert.deepEqual(highlight("plain text", []).map((part) => part.textContent), ["plain text"]);
  });

  test("a 200,000-character file that repeats a short name, with many near-miss values, shows quickly with at most 2,000 marks", () => {
    const text = "ab,".repeat(66667).slice(0, 200000);
    // Each near-miss value starts like the file but never appears in it.
    const needles = Array.from({ length: 120 }, (unused, index) => "ab,".repeat(index + 1) + "x").reverse().concat(["ab"]);
    const started = performance.now();
    const parts = highlight(text, needles);
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 2000, "took " + Math.round(elapsed) + " ms");
    assert.equal(parts.filter((part) => part.tag === "mark").length, 2000);
    assert.equal(parts.map((part) => part.textContent).join(""), text, "the rest of the file shows as text");
  });

  test("the unused Inspect field map is gone", () => {
    assert.ok(!page.includes("DETAILS_FIELDS"));
  });
});

describe("making a script tool", () => {
  const input = (settings) => Object.assign({ path: "scripts/report.py", label: "Make the monthly report", runtime: "python3", command: "python3 scripts/report.py --month 2026-01", needs: "Python 3 and network access to example.org" }, settings);

  test("the tool has one route that every product reads, and none for Copilot", () => {
    const project = skillProject([SCRIPT]);
    const result = engine.tools.scriptTool(project, project.items[0], input());
    assert.equal(result.capability.id, "monthly-report.script.report");
    assert.equal(result.capability.label, "Make the monthly report");
    assert.deepEqual(result.capability.providers, {
      "*": [{ kind: "script", path: "scripts/report.py", runtime: "python3", instructions: "Run it from the skill folder with `python3 scripts/report.py --month 2026-01`. What it needs: Python 3 and network access to example.org." }],
      copilot: [],
    });
  });

  test("Claude, Gemini, coding tools, and the Plugin download use the script; Copilot and copied text leave it out", () => {
    const project = skillProject([SCRIPT]);
    const item = project.items[0];
    item.capabilities.push(engine.tools.scriptTool(project, item, input()).capability);
    for (const exportId of ["claude", "gemini", "skill", "claudePlugin", "portablePlugin"]) {
      const plan = engine.tools.planExport(project, item, exportId);
      assert.match(plan.text, /1\. The script scripts\/report\.py\. Run it from the skill folder with `python3 scripts\/report\.py --month 2026-01`\./, exportId);
      assert.ok(!plan.text.includes("```bash"), "the command the author gave is not repeated");
    }
    const copied = engine.tools.conversionReport(project, item, "chatgpt");
    assert.ok(copied.some((entry) => entry.note === "Left out the script scripts/report.py, because the ChatGPT text cannot use it."), JSON.stringify(copied));
    const copilot = engine.tools.conversionReport(project, item, "teamsZip");
    assert.ok(copilot.some((entry) => entry.component === "scripts/report.py" && entry.status === "unsupported"), JSON.stringify(copilot));
  });

  test("a command with its own options is the only command, even when it doesn't start with the program and path", () => {
    const project = skillProject([SCRIPT]);
    const item = project.items[0];
    item.capabilities.push(engine.tools.scriptTool(project, item, input({ command: "python3 -I scripts/report.py --dry-run" })).capability);
    const text = engine.tools.planExport(project, item, "skill").text;
    assert.match(text, /Run it from the skill folder with `python3 -I scripts\/report\.py --dry-run`\./);
    assert.ok(!text.includes("```bash"), text);
  });

  test("with a program and no command, the instructions get the command block the app writes", () => {
    const project = skillProject([SCRIPT]);
    const item = project.items[0];
    item.capabilities.push(engine.tools.scriptTool(project, item, input({ command: "", needs: "" })).capability);
    assert.equal(item.capabilities[0].providers["*"][0].instructions, "");
    assert.match(engine.tools.planExport(project, item, "skill").text, /```bash\n {3}python3 scripts\/report\.py\n {3}```/);
  });

  test("each tool gets its own id, and the tool stays when the project opens again", () => {
    const project = skillProject([SCRIPT]);
    const item = project.items[0];
    item.capabilities.push(engine.tools.scriptTool(project, item, input()).capability);
    item.capabilities.push(engine.tools.scriptTool(project, item, input({ label: "Make the yearly report" })).capability);
    assert.deepEqual(item.capabilities.map((capability) => capability.id), ["monthly-report.script.report", "monthly-report.script.report-2"]);
    const reopened = engine.project.normalize(project);
    assert.deepEqual(reopened.project.items[0].capabilities, item.capabilities);
    assert.deepEqual(reopened.notices, []);
  });

  test("a command keeps its own spaces, such as two inside quotes", () => {
    const project = skillProject([SCRIPT]);
    const result = engine.tools.scriptTool(project, project.items[0], input({ command: "python3 scripts/report.py --delimiter \"  \"", needs: "" }));
    assert.equal(result.capability.providers["*"][0].instructions, "Run it from the skill folder with `python3 scripts/report.py --delimiter \"  \"`.");
  });

  test("a command with backticks stays one code span", () => {
    const project = skillProject([SCRIPT]);
    const result = engine.tools.scriptTool(project, project.items[0], input({ command: "echo `date`", needs: "" }));
    assert.equal(result.capability.providers["*"][0].instructions, "Run it from the skill folder with `` echo `date` ``.");
  });

  test("the form says what to fix: a script outside scripts/, no description, a program name with other characters, or too many tools", () => {
    const project = skillProject([SCRIPT, { path: "references/notes.md", bytes: encode("# Notes\n") }]);
    const item = project.items[0];
    assert.equal(engine.tools.scriptTool(project, item, input({ path: "references/notes.md" })).field, "t-script");
    assert.equal(engine.tools.scriptTool(project, item, input({ label: "  " })).field, "t-label");
    const runtime = engine.tools.scriptTool(project, item, input({ runtime: "python3; rm -rf ~" }));
    assert.deepEqual(runtime, { field: "t-runtime", message: "Use only letters, numbers, dots, dashes, and spaces, such as python3." });
    for (let n = 0; n < engine.LIMITS.capabilities; n++) {
      item.capabilities.push(engine.tools.scriptTool(project, item, input()).capability);
    }
    assert.equal(engine.tools.scriptTool(project, item, input()).message, "A skill can have at most 20 tools. Remove one before you add another.");
  });
});

describe("the editor's script tool form and folder choice", () => {
  /** The form for a skill with these files, with the code from index.html. */
  function form(files) {
    const fake = fakePage();
    const messages = [];
    const project = skillProject(files);
    const item = project.items[0];
    const sandbox = {
      ...fake,
      ui: { project },
      currentItem: () => item,
      scriptTool: engine.tools.scriptTool,
      SCRIPTS_FOLDER: "scripts/",
      renderTools() {}, updateDerived() {}, scheduleSave() {},
      announce: (message, keep) => messages.push([message, Boolean(keep)]),
    };
    vm.runInNewContext(FIELD_ERROR_CODE + SCRIPT_FORM_CODE, sandbox);
    sandbox.renderScriptToolForm(item);
    return { sandbox, fake, item, messages };
  }

  test("a skill with no scripts sees how to add one, and the fields stay hidden", () => {
    const view = form([{ path: "references/notes.md", bytes: encode("# Notes\n") }]);
    assert.equal(view.fake.$("script-tool").hidden, false);
    assert.equal(view.fake.$("script-tool-empty").hidden, false);
    assert.equal(view.fake.$("script-tool-fields").hidden, true);
  });

  test("an empty description is shown under its box and focused; a full form adds the tool and clears the boxes", () => {
    const view = form([SCRIPT]);
    const $ = view.fake.$;
    assert.deepEqual($("t-script").children.map((option) => option.value), ["scripts/report.py"]);
    $("t-script").value = "scripts/report.py";
    $("t-runtime").value = "python3";
    view.sandbox.addScriptTool();
    assert.equal($("t-label-error").hidden, false);
    assert.equal($("t-label").attributes["aria-invalid"], "true");
    assert.deepEqual(view.fake.focused, ["t-label"]);
    assert.equal(view.item.capabilities.length, 0);
    $("t-label").value = "Make the monthly report";
    view.sandbox.addScriptTool();
    assert.equal(view.item.capabilities.length, 1);
    assert.equal($("t-label-error").hidden, true);
    assert.equal($("t-label").value, "");
    assert.deepEqual(view.messages, [["Added the tool Make the monthly report. Its card is in the Tools list.", false]]);
  });

  /** Add files for a skill with the folder set to folder. */
  async function addFiles(folder, chosen) {
    const fake = fakePage();
    const item = { kind: "skill", files: [] };
    fake.$("file-folder").value = folder;
    const sandbox = {
      ...fake,
      currentItem: () => item,
      readFileBytes: async (file) => file.bytes,
      BUNDLE_FILES_FOLDER: "references/",
      SCRIPTS_FOLDER: "scripts/",
      nameLeaf: (name) => name.split(/[\\/]/).pop(),
      pathLeaf: (path) => path.split("/").pop(),
      cleanSkillFiles: (list) => ({ files: list.map((file) => ({ path: file.path, bytes: file.bytes })), leftovers: [] }),
      bytesEqual: engine.bytes.equal,
      countOf: (count, singular, plural) => count + " " + (count === 1 ? singular : plural),
      renderFiles() {}, updateDerived() {}, scheduleSave() {}, announce() {},
    };
    vm.runInNewContext(FIELD_ERROR_CODE + ADD_FILES_CODE, sandbox);
    await sandbox.addFiles(chosen);
    return item.files.map((file) => file.path);
  }

  test("Add files puts a skill's files in the folder chosen in Folder for new files", async () => {
    assert.deepEqual(await addFiles("scripts/", [{ name: "report.rb", bytes: encode("puts 1\n") }]), ["scripts/report.rb"]);
    assert.deepEqual(await addFiles("references/", [{ name: "notes.md", bytes: encode("# Notes\n") }]), ["references/notes.md"]);
    assert.match(page, /<label for="file-folder">Folder for new files<\/label>\s*<select id="file-folder">/);
  });
});
