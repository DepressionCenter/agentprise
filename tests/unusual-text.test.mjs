// This file is part of Agentprise
// tests/unusual-text.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-11
// Summary: Tests that unusual names and text in opened files and backups are
//          kept in a form the app can open again: file names that differ only
//          by case or an empty folder part, line separator, tab, and control
//          characters in text, long numbered skill names, ZIP names stored in
//          code page 437, and large files checked for keys without freezing.
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
import { makeDeflatedZip, crc32 } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
// Raw characters that standard YAML readers refuse or read as a line break.
const RAW_CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/;
const LONG_NAME = "Summarize the weekly status report for the steering committee members";

/** Opens a written export through the importer the app uses for dropped files. */
async function reopen(written) {
  const result = await engine.imports.any(written.fileName, written.bytes);
  assert.equal(result.error, undefined, String(result.error));
  return result;
}

/** A project with one assistant that has the given files. */
function assistantWith(files) {
  return engine.project.normalize({ name: "Files", items: [{ kind: "agent", name: "Helper", instructions: "Help.", files }] });
}

/** The text of the SKILL.md in a skill .zip written for Claude. */
async function skillMdText(project, item) {
  const written = await engine.exports.skillZip(project, item, "claude");
  return decode(written.entries.find((entry) => entry.name.endsWith("SKILL.md")).bytes);
}

/**
 * A stored (not compressed) ZIP whose names are given as raw bytes, with the
 * general purpose flags and extra field of each entry, as older ZIP tools write them.
 * @param {Array<{name: number[], flags: number, extra?: Uint8Array, text: string}>} entries
 * @returns {Uint8Array}
 */
function rawNameZip(entries) {
  const parts = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new Uint8Array(entry.name);
    const extra = entry.extra || new Uint8Array(0);
    const data = encode(entry.text);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, entry.flags, true);
    lv.setUint32(14, crc32(data), true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, data);
    const central = new Uint8Array(46 + name.length + extra.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, entry.flags, true);
    cv.setUint32(16, crc32(data), true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, extra.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    central.set(extra, 46 + name.length);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const part of [...parts, ...centrals, end]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

/** An Info-ZIP Unicode Path extra field for a stored name. */
function unicodePathField(storedName, unicodeName, check = crc32(new Uint8Array(storedName))) {
  const utf8 = encode(unicodeName);
  const field = new Uint8Array(9 + utf8.length);
  const view = new DataView(field.buffer);
  view.setUint16(0, 0x7075, true);
  view.setUint16(2, 5 + utf8.length, true);
  field[4] = 1;
  view.setUint32(5, check, true);
  field.set(utf8, 9);
  return field;
}

describe("file names that end up the same", () => {
  test("an assistant keeps only the first of its files whose final names differ only by an empty folder part, a trailing space, or case", () => {
    const { project, notices } = assistantWith([
      { path: "references/notes.md", bytes: encode("first") },
      { path: "references//notes.md", bytes: encode("second") },
      { path: "references/notes.md ", bytes: encode("third") },
      { path: "References/NOTES.md", bytes: encode("fourth") },
    ]);
    const files = project.items[0].files;
    assert.deepEqual(files.map((file) => file.path), ["references/notes.md"]);
    assert.equal(decode(files[0].bytes), "first");
    assert.ok(notices.some((notice) => notice.includes("(another file has the same name)")), notices.join("\n"));
  });

  test("an attached file keeps its name, and another file with the same final name is left out", () => {
    const { project, notices } = assistantWith([
      { path: "references//notes.md", bytes: encode("first") },
      { path: "references/Notes.md", bytes: encode("second") },
    ]);
    const files = project.items[0].files;
    assert.deepEqual(files.map((file) => file.path), ["references/Notes.md"]);
    assert.equal(decode(files[0].bytes), "second");
    assert.ok(notices.some((notice) => notice.includes("references/notes.md (another file has the same name)")), notices.join("\n"));
  });

  test("a file that is left out for another reason doesn't take an attached file's name", () => {
    const { project } = assistantWith([
      { path: "references//notes.md", bytes: new Uint8Array(0) },
      { path: "references/.notes.md", bytes: encode("kept") },
    ]);
    const files = project.items[0].files;
    assert.equal(files.length, 1);
    assert.equal(decode(files[0].bytes), "kept");
  });

  test("the notice about an assistant's files says the files came from an assistant, with 1 file and with 3 files", () => {
    const one = assistantWith([
      { path: "references//notes.md", bytes: encode("first") },
      { path: "references/Notes.md", bytes: encode("second") },
    ]);
    assert.ok(one.notices.includes("Left out 1 file from an assistant: references/notes.md (another file has the same name)."), one.notices.join("\n"));
    const three = assistantWith([
      { path: "references/a.md", bytes: encode("a") },
      { path: "references/b.md", bytes: encode("b") },
      { path: "references/c.md", bytes: encode("c") },
      { path: "references//A.md", bytes: encode("a2") },
      { path: "references//B.md", bytes: encode("b2") },
      { path: "references//C.md", bytes: encode("c2") },
    ]);
    const notice = three.notices.find((text) => text.startsWith("Left out 3 files from an assistant: "));
    assert.ok(notice, three.notices.join("\n"));
    assert.equal(three.notices.some((text) => text.includes("from a skill")), false, three.notices.join("\n"));
    const skill = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup", files: [
      { path: "references/notes.md", bytes: encode("first") },
      { path: "references/NOTES.md", bytes: encode("second") },
    ] }] });
    assert.ok(skill.notices.includes("Left out 1 file from a skill: references/NOTES.md (another file has the same name)."), skill.notices.join("\n"));
  });

  test("names that differ only by a letter that has the same upper or lower case are the same file, while the sharp s and \"ss\" stay apart", () => {
    // U+1F80 and U+1F88 share a lower case, and the upper case of each is two letters long.
    // The capital sharp s (U+1E9E) has the small sharp s as its lower case.
    for (const [first, second] of [["ας.md", "ασ.md"], ["fıle.md", "file.md"], ["ſkill.md", "skill.md"], ["\u1f80.md", "\u1f88.md"]]) {
      for (const pair of [[first, second], [second, first]]) {
        const { project } = assistantWith(pair.map((name, index) => ({ path: "references/" + name, bytes: encode("copy " + index) })));
        assert.deepEqual(project.items[0].files.map((file) => file.path), ["references/" + pair[0]]);
        const skill = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup", files: pair.map((name) => ({ path: "references/" + name, bytes: encode(name) })) }] });
        assert.deepEqual(skill.project.items[0].files.map((file) => file.path), ["references/" + pair[0]]);
      }
    }
    const { project } = assistantWith([{ path: "references/straße.md", bytes: encode("one") }, { path: "references/strasse.md", bytes: encode("two") }]);
    assert.equal(project.items[0].files.length, 2);
  });

  test("two kept files whose names differ only by a letter with a two-letter upper case keep the first, say so, and the backup holds it", async () => {
    const { project, notices } = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup" }], unrecognized: [
      { path: "extra/\u1f88.md", bytes: encode("first") },
      { path: "extra/\u1f80.md", bytes: encode("second") },
    ] });
    assert.deepEqual(project.unrecognized.map((entry) => entry.path), ["extra/\u1f88.md"]);
    assert.ok(notices.includes("Left out 1 other file with the same name as another file."), notices.join("\n"));
    const backup = await engine.exports.backup(project);
    const kept = backup.entries.filter((entry) => entry.name.endsWith("/extra/\u1f88.md"));
    assert.equal(kept.length, 1);
    assert.equal(decode(kept[0].bytes), "first");
  });

  test("a backup whose assistant holds two files with the same final name opens, and its new backup opens again", async () => {
    const { project } = assistantWith([{ path: "references/notes.md", bytes: encode("first") }]);
    const backup = await engine.exports.backup(project);
    const entries = backup.entries.map((entry) => ({ name: entry.name, bytes: entry.bytes }));
    const kept = entries.find((entry) => entry.name.endsWith("/references/notes.md"));
    entries.push({ name: kept.name.replace("/references/notes.md", "/references//notes.md"), bytes: encode("second") });
    const opened = await engine.imports.any(backup.fileName, makeDeflatedZip(entries));
    assert.equal(opened.error, undefined, String(opened.error));
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), ["references/notes.md"]);
    assert.equal(decode(opened.project.items[0].files[0].bytes), "first");
    const again = await reopen(await engine.exports.backup(opened.project));
    assert.deepEqual(again.project.items[0].files.map((file) => file.path), ["references/notes.md"]);
  });
});

describe("line breaks and control characters in text", () => {
  for (const [label, character] of [["line separator", "\u2028"], ["paragraph separator", "\u2029"], ["next line", "\u0085"], ["vertical tab", "\u000b"], ["form feed", "\u000c"]]) {
    test("a " + label + " in a description becomes a line break that a skill .zip keeps", async () => {
      const { project } = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup", description: "First line" + character + "second line", body: "Steps" + character + "here." }] });
      const item = project.items[0];
      assert.equal(item.description, "First line\nsecond line");
      assert.equal(item.body, "Steps\nhere.");
      const text = await skillMdText(project, item);
      assert.equal(RAW_CONTROL.test(text), false, JSON.stringify(text));
      const back = await reopen(await engine.exports.skillZip(project, item, "claude"));
      assert.equal(back.project.items[0].description, "First line\nsecond line");
      assert.equal(back.notices.some((notice) => notice.startsWith("Skipped a line")), false, back.notices.join("\n"));
    });
  }

  test("characters that can't be printed are removed from text, while tabs and line breaks stay", () => {
    const { project } = engine.project.normalize({ items: [{ kind: "skill", name: "Look\u0000up\u0007", description: "A\u001b[31m red\u007f word\u0090 and\ta tab\r\nand a line." }] });
    assert.equal(project.items[0].name, "Lookup");
    assert.equal(project.items[0].description, "A[31m red word and\ta tab\nand a line.");
  });

  test("a setting that holds a control character is written with escapes and read back unchanged", () => {
    const characters = [];
    for (let code = 0; code < 0x20; code++) {
      characters.push(String.fromCharCode(code));
    }
    for (let code = 0x7f; code < 0xa0; code++) {
      characters.push(String.fromCharCode(code));
    }
    characters.push("\u2028", "\u2029");
    for (const character of characters) {
      const data = { description: "one" + character + "two", metadata: { note: "a" + character + "b" + character } };
      const text = engine.yaml.stringifyFrontmatter(data, "Body\n");
      assert.equal(RAW_CONTROL.test(text), false, JSON.stringify(text));
      const back = engine.yaml.parseFrontmatter(text);
      assert.deepEqual(back.warnings, [], JSON.stringify(text));
      assert.deepEqual(back.data, data, JSON.stringify(text));
    }
  });

  test("a tab in a one-line setting is written with an escape and read back unchanged", async () => {
    const text = engine.yaml.stringifyFrontmatter({ description: "Name\tScore", metadata: { note: "a\tb" } }, "Body\n");
    assert.equal(/\t/.test(text), false, JSON.stringify(text));
    assert.ok(text.includes("description: \"Name\\tScore\""), text);
    assert.deepEqual(engine.yaml.parseFrontmatter(text).data, { description: "Name\tScore", metadata: { note: "a\tb" } });
    const { project } = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup", description: "Name\tScore" }] });
    const back = await reopen(await engine.exports.skillZip(project, project.items[0], "claude"));
    assert.equal(back.project.items[0].description, "Name\tScore");
  });

  test("a skill setting kept as written holds no raw control character in SKILL.md", async () => {
    const { project } = engine.project.normalize({ items: [{ kind: "skill", name: "Lookup", description: "d", metadata: { note: "Slide one\u000bslide two\u2028end" } }] });
    const text = await skillMdText(project, project.items[0]);
    assert.equal(RAW_CONTROL.test(text), false, JSON.stringify(text));
    assert.ok(text.includes("note: \"Slide one\\u000bslide two\\u2028end\""), text);
    assert.equal(engine.yaml.parseFrontmatter(text).data.metadata.note, "Slide one\u000bslide two\u2028end");
  });

  test("a SKILL.md saved with a raw line separator in a setting still opens with its full description", async () => {
    for (const character of ["\u2028", "\u2029"]) {
      const text = "---\nname: lookup\ndescription: First line" + character + "second line\n---\n\nSteps.\n";
      const parsed = engine.yaml.parseFrontmatter(text);
      assert.deepEqual(parsed.warnings, []);
      assert.equal(parsed.data.description, "First line" + character + "second line");
      const opened = await reopen({ fileName: "lookup.zip", bytes: makeDeflatedZip([{ name: "lookup/SKILL.md", bytes: encode(text) }]) });
      assert.equal(opened.project.items[0].description, "First line\nsecond line");
    }
  });
});

describe("long numbered skill names", () => {
  /** Two skills with the same long name, an assistant that uses the second, and then the first removed. */
  function secondSkillOnly() {
    const { project } = engine.project.normalize({
      name: "Reports",
      items: [
        { kind: "skill", name: LONG_NAME, description: "First.", body: "One." },
        { kind: "skill", name: LONG_NAME, description: "Second.", body: "Two." },
        { kind: "agent", name: "Helper", instructions: "Help." },
      ],
    });
    const numbered = project.items[1].skillName;
    assert.ok(project.items[0].skillName.length > 62);
    assert.match(numbered, /-2$/);
    // The number takes the place of the end of the name, so the name still fits.
    assert.ok(!numbered.startsWith(project.items[0].skillName + "-"));
    assert.ok(numbered.length <= engine.LIMITS.skillName);
    project.items[2].uses = [numbered];
    project.items.splice(0, 1);
    return { project, numbered };
  }

  test("a shortened name with its number stays when the project is loaded from the browser again", () => {
    const { project, numbered } = secondSkillOnly();
    const record = engine.project.record(project);
    const store = new Map(engine.project.payloads(project).map((entry) => [entry.key, entry.bytes]));
    const back = engine.project.fromRecord(JSON.parse(JSON.stringify(record)), store);
    assert.deepEqual(back.notices, []);
    assert.equal(back.project.items[0].skillName, numbered);
    assert.deepEqual(back.project.items[1].uses, [numbered]);
  });

  test("a shortened name with its number stays when a backup is opened", async () => {
    const { project, numbered } = secondSkillOnly();
    const back = await reopen(await engine.exports.backup(project));
    assert.equal(back.project.items[0].skillName, numbered);
    assert.deepEqual(back.project.items[1].uses, [numbered]);
    assert.equal(back.notices.some((notice) => notice.includes("taken off its list")), false, back.notices.join("\n"));
  });

  test("an assistant keeps using a skill whose stored name changes", () => {
    const { project, notices } = engine.project.normalize({
      items: [
        { kind: "skill", name: "Lookup", skillName: "old-name", description: "d", body: "b" },
        { kind: "agent", name: "Helper", instructions: "i", uses: ["old-name"] },
      ],
    });
    assert.equal(project.items[0].skillName, "lookup");
    assert.deepEqual(project.items[1].uses, ["lookup"]);
    assert.deepEqual(notices, []);
  });

  test("a stored name that is too long or isn't the skill's name plus a number is not kept", () => {
    const { project } = engine.project.normalize({
      items: [
        { kind: "skill", name: "Lookup", skillName: "lookup-" + "1".repeat(70), description: "d", body: "b" },
        { kind: "skill", name: "Lookup", skillName: "lookup-x", description: "d", body: "b" },
      ],
    });
    assert.deepEqual(project.items.map((item) => item.skillName), ["lookup", "lookup-2"]);
  });
});

describe("ZIP names in an older Windows character set", () => {
  test("names without the UTF-8 flag that aren't UTF-8 are read in code page 437", async () => {
    const zip = rawNameZip([
      { name: [0x61, 0xa4, 0x6f, 0x2e, 0x6d, 0x64], flags: 0, text: "n with tilde" },
      { name: [0x61, 0x81, 0x6f, 0x2e, 0x6d, 0x64], flags: 0, text: "u with umlaut" },
    ]);
    const entries = await engine.zip.read(zip);
    assert.deepEqual([...entries.keys()], ["a\u00f1o.md", "a\u00fco.md"]);
    assert.equal(decode(entries.get("a\u00f1o.md")), "n with tilde");
  });

  test("a name with the UTF-8 flag, or valid UTF-8 without it, is read as UTF-8", async () => {
    const entries = await engine.zip.read(rawNameZip([
      { name: [...encode("caf\u00e9/a\u00f1o.md")], flags: 0x0800, text: "flagged" },
      { name: [...encode("gu\u00eda.md")], flags: 0, text: "unflagged" },
    ]));
    assert.deepEqual([...entries.keys()], ["caf\u00e9/a\u00f1o.md", "gu\u00eda.md"]);
  });

  test("an Info-ZIP Unicode Path is used only when it matches the stored name", async () => {
    const stored = [0x61, 0xa4, 0x6f, 0x2e, 0x6d, 0x64];
    const matching = await engine.zip.read(rawNameZip([{ name: stored, flags: 0, extra: unicodePathField(stored, "caf\u00e9.md"), text: "x" }]));
    assert.deepEqual([...matching.keys()], ["caf\u00e9.md"]);
    const stale = await engine.zip.read(rawNameZip([{ name: stored, flags: 0, extra: unicodePathField(stored, "caf\u00e9.md", 1234), text: "x" }]));
    assert.deepEqual([...stale.keys()], ["a\u00f1o.md"]);
  });

  test("a skill folder named in code page 437 opens with its files", async () => {
    const skill = "---\nname: cafe\ndescription: Orders coffee.\n---\n\nRead references/men\u00fa.md.\n";
    const folder = [0x63, 0x61, 0x66, 0x82, 0x2f];
    const zip = rawNameZip([
      { name: [...folder, ...encode("SKILL.md")], flags: 0, text: skill },
      { name: [...folder, ...encode("references/men"), 0xa3, ...encode(".md")], flags: 0, text: "Menu" },
    ]);
    const opened = await reopen({ fileName: "cafe.zip", bytes: zip });
    assert.deepEqual(opened.project.items[0].files.map((file) => file.path), ["references/men\u00fa.md"]);
  });

  test("two names that read as the same are refused with a message that names the file", async () => {
    const zip = rawNameZip([
      { name: [...encode("references/a"), 0xa4, ...encode("o.md")], flags: 0x0800, text: "one" },
      { name: [...encode("references/a"), 0x81, ...encode("o.md")], flags: 0x0800, text: "two" },
    ]);
    await assert.rejects(engine.zip.read(zip), (error) => {
      assert.equal(error.message, "The .zip holds two files with the same name: references/a\ufffdo.md. Rename one of them and zip the folder again, or ask the person who made the file for a new copy.");
      return true;
    });
  });

  test("names that differ only by the kind of slash are refused with the same message", async () => {
    const zip = makeDeflatedZip([{ name: "a/b.md", bytes: encode("one") }, { name: "a\\b.md", bytes: encode("two") }]);
    await assert.rejects(engine.zip.read(zip), { message: "The .zip holds two files with the same name: a/b.md. Rename one of them and zip the folder again, or ask the person who made the file for a new copy." });
  });
});

describe("checking large files for keys", () => {
  test("a 1 MB file that repeats a short token block is checked quickly, and a key at its end is still found", () => {
    const block = "token:\n  - ${A}\n";
    const repeated = block.repeat(Math.ceil(1024 * 1024 / block.length));
    for (const [text, holdsKey] of [[repeated, false], [repeated + "token:\n  - abc123xyz789\n", true]]) {
      const started = Date.now();
      const result = engine.project.normalize({ name: "Keys", unrecognized: [{ path: "settings.yaml", bytes: encode(text) }] }, { checkKeptFiles: true });
      const elapsed = Date.now() - started;
      // The check takes about a tenth of a second; the limit leaves room for slow test machines.
      assert.ok(elapsed < 3000, "Checking took " + elapsed + " ms");
      assert.equal(result.project.unrecognized.length, holdsKey ? 0 : 1, result.notices.join("\n"));
    }
  });

  for (const [label, padding] of [["blank lines", "\n"], ["comment lines", "#\n"]]) {
    test("a 1 MB file whose keys each sit deeper than the one before, padded with " + label + ", is checked quickly", () => {
      let nestedMappings = "";
      let nestedLists = "";
      for (let depth = 0; depth < 500; depth++) {
        nestedMappings += " ".repeat(depth) + "token:\n" + " ".repeat(depth + 1) + "a: b\n";
        nestedLists += " ".repeat(depth) + "token:\n" + " ".repeat(depth) + "- ${A}\n";
      }
      for (const nested of [nestedMappings, nestedLists]) {
        const text = nested + padding.repeat(Math.ceil((1024 * 1024 - nested.length) / padding.length));
        const started = Date.now();
        const result = engine.project.normalize({ name: "Keys", unrecognized: [{ path: "settings.yaml", bytes: encode(text) }] }, { checkKeptFiles: true });
        const elapsed = Date.now() - started;
        // The check takes well under a second; the limit leaves room for slow test machines.
        assert.ok(elapsed < 3000, "Checking took " + elapsed + " ms");
        assert.equal(result.project.unrecognized.length, 1, result.notices.join("\n"));
      }
    });
  }

  test("a key wrapped in a value setting or listed after blank and comment lines is still found", () => {
    for (const text of [
      "admin_password:\n\n  # The real one\n  type: string\n\n  value: abc123xyz789\n",
      "admin_password:\n  value:\n\n    # Only one\n    - abc123xyz789\n",
      "api_key:\n  - ${API_KEY}\n\n  # Old key\n  - abc123xyz789\n",
    ]) {
      const result = engine.project.normalize({ name: "Keys", unrecognized: [{ path: "settings.yaml", bytes: encode(text) }] }, { checkKeptFiles: true });
      assert.equal(result.project.unrecognized.length, 0, JSON.stringify(text));
    }
    for (const text of [
      "admin_password:\n\n  # Described here\n  type: string\n\nother: abc123xyz789\n",
      "api_key:\n  - ${API_KEY}\n\n# Next setting\nname: abc123xyz789\n",
    ]) {
      const result = engine.project.normalize({ name: "Keys", unrecognized: [{ path: "settings.yaml", bytes: encode(text) }] }, { checkKeptFiles: true });
      assert.equal(result.project.unrecognized.length, 1, JSON.stringify(text));
    }
  });

  test("a SKILL.md setting with a long run of spaces opens quickly, and a comment after a value is still removed", async () => {
    const text = "---\nname: lookup\ndescription: Finds" + " ".repeat(200000) + "records.\n---\n\nSteps.\n";
    const started = Date.now();
    const opened = await reopen({ fileName: "lookup.zip", bytes: makeDeflatedZip([{ name: "lookup/SKILL.md", bytes: encode(text) }]) });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 3000, "Opening took " + elapsed + " ms");
    assert.ok(opened.project.items[0].description.startsWith("Finds"));
    assert.equal(engine.yaml.parseFrontmatter("---\nname: lookup   # short name\n---\n").data.name, "lookup");
    assert.equal(engine.yaml.parseFrontmatter("---\nname: look#up\n---\n").data.name, "look#up");
  });
});
