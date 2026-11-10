// This file is part of Agentprise
// tests/file-names.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-10
// Summary: Tests that file names keep letters from any language and common
//          punctuation, that a name that has to change is named in a notice,
//          and that a program can't pass the checks by ending its name in a
//          dot or a space or by using full-width letters.
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
import { makeDeflatedZip } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const SKILL = "---\nname: lookup\ndescription: Looks things up.\n---\n\nRead references/gu\u00eda.md.\n";

/** Opens a skill .zip whose files are named by their path inside the skill folder. */
async function openSkill(paths) {
  const entries = [{ name: "lookup/SKILL.md", bytes: encode(SKILL) }].concat(paths.map((path) => ({ name: "lookup/" + path, bytes: encode("Text for " + path + ".\n") })));
  const opened = await engine.imports.any("lookup.zip", makeDeflatedZip(entries));
  assert.equal(opened.error, undefined, String(opened.error));
  return opened;
}

describe("file names", () => {
  test("names with accents, commas, and symbols keep their names in the project and in every download", async () => {
    const kept = ["references/gu\u00eda.md", "references/notes, draft.md", "scripts/c++_helper.py", "references/\u7b2c1\u7ae0\uff1a\u6982\u8981.md", "references/caf\u00e9 & cr\u00e8me (v2).txt"];
    const opened = await openSkill(kept);
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), kept);
    assert.equal(opened.notices.some((notice) => notice.startsWith("Renamed")), false);
    const backup = await engine.exports.backup(opened.project);
    const skillZip = await engine.exports.skillZip(opened.project, opened.project.items[0], "claude");
    for (const names of [backup.entries.map((entry) => entry.name), skillZip.entries.map((entry) => entry.name)]) {
      for (const path of kept) {
        assert.ok(names.some((name) => name.endsWith("/lookup/" + path) || name === "lookup/" + path), path);
      }
    }
    const reopened = await engine.imports.any(backup.fileName, backup.bytes);
    assert.deepEqual(reopened.project.items[0].files.map((file) => file.path), kept);
    assert.equal(reopened.notices.some((notice) => notice.startsWith("Renamed")), false);
  });

  test("a name in decomposed form, as a Mac writes it, is stored composed, so it matches the same name typed elsewhere", async () => {
    const opened = await openSkill(["references/gui\u0301a.md", "references/gu\u00eda.md"]);
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), ["references/gu\u00eda.md"]);
    assert.ok(opened.notices.some((notice) => notice.includes("references/gu\u00eda.md (another file has the same name)")));
    assert.equal(opened.notices.some((notice) => notice.startsWith("Renamed")), false);
  });

  test("a name that has to change is named in a notice with its new name", async () => {
    const opened = await openSkill(["references/notes: draft.md", "references/aux.md", "references/report\u202efdp.txt", "references/a\uff0fb.md"]);
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), ["references/notes draft.md", "references/aux_.md", "references/report fdp.txt", "references/a b.md"]);
    assert.ok(opened.notices.includes("Renamed 4 files so their names are safe to use on any computer: references/notes: draft.md to references/notes draft.md, references/aux.md to references/aux_.md, references/report\ufffdfdp.txt to references/report fdp.txt, and references/a\uff0fb.md to references/a b.md. If the steps or instructions name these files, update them."), opened.notices.join("\n"));

    const one = await openSkill(["references/notes: draft.md"]);
    assert.ok(one.notices.includes("Renamed references/notes: draft.md to references/notes draft.md, so the name is safe to use on any computer. If the steps or instructions name this file, update them."));

    const many = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup", files: [1, 2, 3, 4, 5, 6].map((n) => ({ path: "references/a:" + n + ".md", bytes: encode("x") })) }] });
    assert.ok(many.notices.includes("Renamed 6 files so their names are safe to use on any computer: references/a:1.md to references/a 1.md, references/a:2.md to references/a 2.md, references/a:3.md to references/a 3.md, references/a:4.md to references/a 4.md, references/a:5.md to references/a 5.md, and 1 more file. If the steps or instructions name these files, update them."));
  });

  test("an attached file whose name ends in a dot keeps its type and gets a notice", () => {
    const result = engine.project.normalize({ items: [{ kind: "agent", name: "Helper", files: [{ name: "notes.txt.", bytes: encode("Notes.") }, { name: "plan:v2.txt", bytes: encode("Plan.") }] }] });
    assert.deepEqual(result.project.items[0].files.map((file) => file.path), ["references/notes.txt", "references/plan v2.txt"]);
    assert.ok(result.notices.includes("Renamed 2 files so their names are safe to use on any computer: notes.txt. to notes.txt and plan:v2.txt to plan v2.txt. If the steps or instructions name these files, update them."), result.notices.join("\n"));
  });

  test("a program whose name ends in a dot or a space, or uses full-width letters, is still refused", async () => {
    const opened = await openSkill(["scripts/setup.msi .", "tool.jar .", "scripts/setup.\uff4d\uff53\uff49", "scripts/run.\uff45xe.txt", "references/notes.txt"]);
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), ["references/notes.txt"]);
    assert.ok(opened.notices.includes("Left out 4 files from a skill: scripts/setup.msi (it is a program), tool.jar (it is a program), scripts/setup.\uff4d\uff53\uff49 (it is a program), scripts/run.\uff45xe.txt (it is a program)."), opened.notices.join("\n"));
    const attached = engine.project.normalize({ items: [{ kind: "agent", name: "Helper", files: [{ name: "report.exe.", bytes: encode("x") }] }] });
    assert.deepEqual(attached.project.items[0].files, []);
  });

  test("a folder name that another program could read as two dots is refused", async () => {
    const opened = await openSkill(["references/\u2025/x.md", "references/ok.md"]);
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), ["references/ok.md"]);
  });
});
