// This file is part of Agentprise
// tests/importers.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-11
// Last Modified: 2026-10-11
// Summary: Opens the committed import fixtures (plugins and skill ZIPs made by
//          other tools, and hostile archives) and checks the items, servers,
//          licenses, notices, and unrecognized files each one produces. For the
//          two plugin fixtures, unrecognized files must survive a backup round
//          trip unchanged and appear in no other download.
// Notes: See README file for documentation and full license information.
//        The fixtures and how they were made: tests/fixtures/imports/README.md
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
import { loadEngine, repoRoot } from "./load-engine.mjs";
import { makePng, makeDeflatedZip } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const FIXTURES = join(repoRoot, "tests", "fixtures", "imports");
const NOTE = "Not interpreted by Agentprise.";
const UNKNOWN_LICENSE_NOTICE = "doesn't say which license it uses";
const BEHAVIOR_NOTICE = "hook, command, or agent files. Agentprise keeps them in the backup but never reads or runs them.";
// Leading bytes of Windows, Linux, and macOS programs, which no import may keep.
const PROGRAM_SIGNATURES = [[0x4d, 0x5a], [0x7f, 0x45, 0x4c, 0x46], [0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf], [0xca, 0xfe, 0xba, 0xbe]];

/** Bytes of one committed fixture archive. */
function fixtureBytes(name) {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

/** Opens a fixture through the importer the app uses for dropped files, failing on an error. */
async function openFixture(name) {
  const result = await engine.imports.any(name, fixtureBytes(name));
  assert.equal(result.error, undefined, String(result.error));
  return result;
}

/** The fixture's own entries, read with the app's ZIP reader. */
async function fixtureEntries(name) {
  return engine.zip.read(fixtureBytes(name));
}

function isProgram(path, bytes) {
  return PROGRAM_SIGNATURES.some((signature) => signature.every((byte, i) => bytes[i] === byte)) || /\.(exe|dll|bin|so|dylib|msi|com|scr)$/i.test(path);
}

/** Every file a project holds, as [path, bytes]: item files, icons, and unrecognized files. */
function allProjectFiles(project) {
  const files = [];
  project.items.forEach((item) => {
    item.files.forEach((file) => files.push(["skills/" + item.skillName + "/" + file.path, file.bytes]));
    if (item.icon) {
      files.push(["skills/" + item.skillName + "/icon.png", item.icon.bytes]);
    }
  });
  project.unrecognized.forEach((entry) => files.push([entry.path, entry.bytes]));
  return files;
}

/** Unrecognized files as sorted [path, note, bytes] rows for exact comparison. */
function unrecognizedRows(project) {
  return project.unrecognized.map((entry) => [entry.path, entry.note, engine.bytes.toBase64(entry.bytes)]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/**
 * Every download other than the backup, each as a list of {name, bytes}.
 * Text downloads (.agent, copy text) become one entry per text field.
 */
async function otherExports(project) {
  const downloads = [];
  for (const item of project.items) {
    for (const id of ["claude", "gemini"]) {
      const written = await engine.exports.skillZip(project, item, id);
      downloads.push({ label: id + " skill ZIP of " + item.skillName, entries: written.entries });
    }
    const plain = await engine.exports.plainSkill(project, item);
    downloads.push({ label: "plain skill ZIP of " + item.skillName, entries: plain.entries });
    const icons = { color: makePng(192, 192), outline: makePng(32, 32) };
    const teams = await engine.exports.teamsPackage(project, item, icons);
    const teamsEntries = await engine.zip.read(teams.bytes);
    downloads.push({ label: "Copilot app package of " + item.skillName, entries: Array.from(teamsEntries, ([name, bytes]) => ({ name, bytes })) });
    const agentFile = engine.exports.msAgent(project, item);
    downloads.push({ label: ".agent of " + item.skillName, entries: [{ name: agentFile.fileName, bytes: encode(agentFile.text) }] });
    for (const id of ["chatgpt", "notebook"]) {
      const copy = engine.exports.copyText(project, item, id);
      const fields = Object.entries(copy).filter(([, value]) => typeof value === "string" || Array.isArray(value));
      downloads.push({ label: id + " copy text of " + item.skillName, entries: fields.map(([key, value]) => ({ name: key, bytes: encode(Array.isArray(value) ? value.join("\n") : value) })) });
    }
  }
  const claudePlugin = await engine.exports.claudePlugin(project);
  downloads.push({ label: "Claude plugin", entries: claudePlugin.entries });
  const portablePlugin = await engine.exports.portablePlugin(project);
  downloads.push({ label: "portable plugin", entries: portablePlugin.entries });
  return downloads;
}

/**
 * Fails when an unrecognized file shows up in a download: an entry with the
 * same bytes, or a text entry that contains its text (plain or JSON-escaped).
 * The allowed copies are a plugin's root license, which the importer places
 * in each foreign skill that had no license of its own, and which plugin
 * downloads write as their root LICENSE.txt so the author's terms travel.
 */
function assertNoLeaks(project, downloads) {
  const licenseSkills = (entry) => project.items.filter((item) => item.files.some((file) => file.path === "LICENSE.txt" && engine.bytes.equal(file.bytes, entry.bytes))).map((item) => item.skillName);
  for (const entry of project.unrecognized) {
    const allowed = /^(LICENSE|LICENCE|COPYING)(\.(txt|md))?$/i.test(entry.path) ? licenseSkills(entry) : [];
    const text = decode(entry.bytes).trim();
    const escaped = JSON.stringify(text).slice(1, -1);
    for (const download of downloads) {
      for (const file of download.entries) {
        if (allowed.length > 0 && (allowed.some((skill) => file.name.endsWith(skill + "/LICENSE.txt")) || /^[^/]+\/LICENSE\.txt$/.test(file.name))) {
          continue;
        }
        const where = entry.path + " leaked into " + download.label + " as " + file.name;
        assert.equal(engine.bytes.equal(file.bytes, entry.bytes), false, where);
        if (text.length >= 20) {
          const content = decode(file.bytes);
          assert.equal(content.includes(text) || content.includes(escaped), false, where + " (text)");
        }
      }
    }
  }
}

// ### Fixture 1: an Agent Plugins folder made elsewhere ###

describe("01-agent-plugins-folder.zip: an Agent Plugins folder made by another tool", () => {
  test("opens as a plugin with two skills, both servers, and the vendor extension kept", async () => {
    const { project, notices, format } = await openFixture("01-agent-plugins-folder.zip");
    assert.equal(format, "plugin");
    assert.equal(project.name, "Field Kit");
    assert.equal(project.version, "0.4.0");
    assert.equal(project.description, "Field notes and summaries.");
    assert.deepEqual([project.creator.name, project.creator.url], ["Example Author", "https://example.org"]);
    assert.deepEqual(project.items.map((item) => [item.kind, item.skillName, item.body]), [
      ["skill", "note-taker", "Write notes as short bullets."],
      ["skill", "summarizer", "Summarize in three sentences."],
    ]);
    // env is dropped because it can hold secrets; the command is kept as text only.
    assert.deepEqual(project.servers, {
      "remote-search": { label: "remote-search", transport: "http", url: "https://mcp.example.org/mcp", userSupplied: false, auth: "none", tools: [] },
      "local-notes": { label: "local-notes", transport: "stdio", url: "", userSupplied: false, auth: "none", tools: [], command: "npx", args: ["-y", "example-notes-server"] },
    });
    assert.equal(JSON.stringify(project).includes("EXAMPLE_API_KEY"), false);
    // A plugin.json extension from another tool is kept as metadata, not as a file.
    assert.deepEqual(project.pluginExtras.extensions, { "com.example.client": { theme: "dark", pinned: ["note-taker"] } });
    assert.equal(project.pluginExtras.authorEmail, "author@example.org");
    assert.deepEqual(notices, [
      "The tool server \"local-notes\" had settings that can hold passwords or keys (env), so this app didn't keep them. Add them again where you install it.",
      "The tool server \"local-notes\" runs a program on the computer. Agentprise keeps its command as text and never runs it.",
      "The plugin has 3 " + BEHAVIOR_NOTICE,
    ]);
  });

  test("a root LICENSE makes the license \"See LICENSE.txt\" and is copied into the skill without one", async () => {
    const { project } = await openFixture("01-agent-plugins-folder.zip");
    const source = await fixtureEntries("01-agent-plugins-folder.zip");
    const rootLicense = source.get("field-kit/LICENSE");
    assert.equal(project.license, "See LICENSE.txt");
    const [noteTaker, summarizer] = project.items;
    assert.deepEqual(noteTaker.files.map((file) => file.path), ["references/template.md", "LICENSE.txt"]);
    assert.ok(engine.bytes.equal(noteTaker.files[1].bytes, rootLicense));
    // A skill that brings its own license keeps it.
    assert.deepEqual(summarizer.files.map((file) => file.path), ["LICENSE.txt"]);
    assert.ok(engine.bytes.equal(summarizer.files[0].bytes, source.get("field-kit/skills/summarizer/LICENSE.txt")));
  });

  test("hooks, agents, commands, the vendor folder, LICENSE, and README are kept byte for byte and never interpreted", async () => {
    const { project } = await openFixture("01-agent-plugins-folder.zip");
    const source = await fixtureEntries("01-agent-plugins-folder.zip");
    const expected = ["LICENSE", "README.md", "agents/x.md", "com.example.client/settings.json", "commands/y.md", "hooks/hooks.json"];
    assert.deepEqual(project.unrecognized.map((entry) => entry.path).sort(), expected);
    for (const entry of project.unrecognized) {
      assert.equal(entry.note, NOTE);
      assert.ok(engine.bytes.equal(entry.bytes, source.get("field-kit/" + entry.path)), entry.path);
    }
    // agents/x.md has skill-like frontmatter, but only skills/ folders become items.
    assert.deepEqual(project.items.map((item) => item.skillName), ["note-taker", "summarizer"]);
    assert.equal(project.items.some((item) => item.body.includes("Review notes") || item.body.includes("Summarize today's notes")), false);
    // The hook's command is never turned into a server or anything else.
    assert.equal(JSON.stringify(engine.project.record(project)).includes("echo example"), false);
  });
});

// ### Fixture 2: a Claude plugin ###

describe("02-claude-plugin.zip: a Claude plugin", () => {
  test("opens with its skill, its http server without headers, and its declared license", async () => {
    const { project, notices, format } = await openFixture("02-claude-plugin.zip");
    assert.equal(format, "plugin");
    assert.equal(project.name, "Clinic Helper");
    assert.equal(project.version, "1.1.0");
    assert.equal(project.license, "MIT");
    assert.deepEqual([project.creator.name, project.creator.url], ["Example Team", "https://example.org"]);
    assert.deepEqual(project.items.map((item) => [item.kind, item.skillName, item.files.map((file) => file.path)]), [
      ["skill", "intake-checklist", ["references/forms.md"]],
    ]);
    assert.deepEqual(project.servers, {
      "clinic-docs": { label: "Clinic Docs", transport: "http", url: "https://docs.example.org/mcp", userSupplied: false, auth: "none", tools: [] },
    });
    assert.equal(JSON.stringify(project).includes("EXAMPLE_API_KEY"), false);
    assert.deepEqual(notices, [
      "The tool server \"Clinic Docs\" had settings that can hold passwords or keys (headers), so this app didn't keep them. Add them again where you install it.",
      "The plugin has 2 " + BEHAVIOR_NOTICE,
    ]);
  });

  test("commands and hooks are kept as unrecognized files and never interpreted", async () => {
    const { project } = await openFixture("02-claude-plugin.zip");
    const source = await fixtureEntries("02-claude-plugin.zip");
    assert.deepEqual(project.unrecognized.map((entry) => [entry.path, entry.note]), [["commands/triage.md", NOTE], ["hooks/hooks.json", NOTE]]);
    for (const entry of project.unrecognized) {
      assert.ok(engine.bytes.equal(entry.bytes, source.get("clinic-helper/" + entry.path)), entry.path);
    }
    assert.equal(JSON.stringify(engine.project.record(project)).includes("echo hello"), false);
  });
});

// ### Fixture 3: a Codex layout ###

describe("03-codex-layout.zip: a Codex plugin layout", () => {
  test("finds skills through the manifest's skills path and reads servers without a type", async () => {
    const { project, notices, format } = await openFixture("03-codex-layout.zip");
    assert.equal(format, "plugin");
    assert.equal(project.name, "Codex Helper");
    assert.equal(project.version, "0.2.0");
    assert.deepEqual(project.items.map((item) => [item.kind, item.skillName, item.body]), [["skill", "lookup", "Search first, then answer."]]);
    // No type and an address means a remote server; a command means a local one.
    assert.deepEqual(project.servers, {
      search: { label: "search", transport: "http", url: "https://search.example.org/mcp", userSupplied: false, auth: "none", tools: [] },
      files: { label: "files", transport: "stdio", url: "", userSupplied: false, auth: "none", tools: [], command: "uvx", args: ["example-files-server"] },
    });
    assert.deepEqual(project.unrecognized, []);
    // No license anywhere: the project says so and the importer warns.
    assert.equal(project.license, "Not stated");
    assert.deepEqual(notices, [
      "The tool server \"files\" runs a program on the computer. Agentprise keeps its command as text and never runs it.",
      "The plugin doesn't say which license it uses. Check with its author before you share it.",
    ]);
  });
});

// ### Fixture 4: several skills in one ZIP ###

describe("04-multi-skill.zip: three skill folders, one nested, with loose files", () => {
  test("each SKILL.md becomes an item, the nested skill's files stay with it, and loose files are unrecognized", async () => {
    const { project, notices, format } = await openFixture("04-multi-skill.zip");
    const source = await fixtureEntries("04-multi-skill.zip");
    assert.equal(format, "skillZip");
    // Folders are read shortest path first, so the nested beta comes last.
    assert.deepEqual(project.items.map((item) => [item.kind, item.skillName, item.body, item.files.map((file) => file.path)]), [
      ["skill", "alpha", "Alpha body.", ["references/a.md"]],
      ["skill", "gamma", "Gamma body.", ["LICENSE.txt"]],
      ["skill", "beta", "Beta body.", ["references/b.md"]],
    ]);
    assert.deepEqual(project.unrecognized.map((entry) => [entry.path, entry.note]), [["README.md", NOTE], ["notes.txt", NOTE]]);
    for (const entry of project.unrecognized) {
      assert.ok(engine.bytes.equal(entry.bytes, source.get(entry.path)), entry.path);
    }
    // One skill's license file is enough to point at it, and nothing warns.
    assert.equal(project.license, "See LICENSE.txt");
    assert.deepEqual(notices, []);
    assert.deepEqual(project.servers, {});
  });
});

// ### Fixture 5: one SKILL.md at the root ###

describe("05-single-skill-md.zip: a lone SKILL.md", () => {
  test("the ZIP opens as one skill with no license stated and a notice", async () => {
    const { project, notices, format } = await openFixture("05-single-skill-md.zip");
    assert.equal(format, "skillZip");
    assert.deepEqual(project.items.map((item) => [item.kind, item.name, item.skillName, item.body]), [["skill", "Solo Helper", "solo-helper", "Help with one thing at a time."]]);
    assert.equal(project.license, "Not stated");
    assert.deepEqual(project.unrecognized, []);
    assert.deepEqual(notices, ["The file doesn't say which license it uses. Check with its author before you share it."]);
  });

  test("the same SKILL.md opened as text gives the same project", async () => {
    const text = decode((await fixtureEntries("05-single-skill-md.zip")).get("SKILL.md"));
    const fromZip = (await openFixture("05-single-skill-md.zip")).project;
    for (const [label, opened] of [["readSkillMd", engine.imports.skillMd(text)], ["any(.md)", await engine.imports.any("SKILL.md", encode(text))]]) {
      assert.equal(opened.error, undefined, label);
      assert.deepEqual(opened.notices, ["The file doesn't say which license it uses. Check with its author before you share it."], label);
      assert.deepEqual(opened.project.items.map((item) => [item.skillName, item.body]), fromZip.items.map((item) => [item.skillName, item.body]), label);
      assert.equal(opened.project.license, "Not stated", label);
    }
  });
});

// ### Fixtures 6 and 7: hostile archives ###

describe("06-hostile-paths.zip and 07-hostile-files.zip: hostile archives", () => {
  test("an archive with a path that climbs out or starts at the root is refused whole", async () => {
    const result = await engine.imports.any("06-hostile-paths.zip", fixtureBytes("06-hostile-paths.zip"));
    assert.ok(result.error);
    assert.equal(result.project, undefined);
    // Each unsafe name alone is enough to refuse an archive that otherwise opens.
    const clean = Array.from(await fixtureEntries("07-hostile-files.zip"), ([name, bytes]) => ({ name, bytes }));
    for (const name of ["hostile-kit/../escape.txt", "/absolute.txt"]) {
      const bytes = makeDeflatedZip([...clean, { name, bytes: encode("unsafe") }]);
      const refused = await engine.imports.any("hostile.zip", bytes);
      assert.ok(refused.error, name + " must be refused");
      assert.equal(refused.project, undefined, name);
    }
  });

  test("without unsafe paths, programs, empty skill files, and unusable server names are left out with notices", async () => {
    const { project, notices } = await openFixture("07-hostile-files.zip");
    assert.deepEqual(project.items.map((item) => [item.skillName, item.files.map((file) => file.path)]), [
      ["safe", ["references/__proto__.md"]],
      ["proto", []],
    ]);
    // "constructor" can't name a server; "__proto__" is cleaned to a plain own key.
    assert.deepEqual(Object.keys(project.servers), ["proto__"]);
    assert.equal(project.servers.proto__.label, "__proto__");
    assert.ok(Object.prototype.hasOwnProperty.call(project.servers, "proto__"));
    assert.deepEqual(project.pluginExtras.extensions, { "com.example.safe": { ok: true } });
    // An empty file outside the skills is harmless and is kept for the backup like any other unknown file.
    assert.deepEqual(project.unrecognized.map((entry) => [entry.path, entry.bytes.length]), [["empty.txt", 0], ["__proto__.json", 19]]);
    assert.deepEqual(notices, [
      "The tool server \"constructor\" has a name this app can't use, so it was left out.",
      "The skill name \"__proto__\" doesn't follow the Agent Skills rules. It will be saved as \"proto\".",
      "The plugin doesn't say which license it uses. Check with its author before you share it.",
      "Left out 3 files from a skill: references/readme.txt (it is a Windows program), references/tool.exe (it is a program), references/empty.md (it is empty).",
      "Left out 2 program files. Agentprise never keeps or runs programs.",
    ]);
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.polluted, undefined);
  });

  test("no program reaches the project or its backup", async () => {
    const { project } = await openFixture("07-hostile-files.zip");
    for (const [path, bytes] of allProjectFiles(project)) {
      assert.equal(isProgram(path, bytes), false, path);
    }
    const backup = await engine.exports.backup(project);
    for (const entry of backup.entries) {
      assert.equal(isProgram(entry.name, entry.bytes), false, entry.name);
    }
    const back = await engine.imports.any(backup.fileName, backup.bytes);
    assert.equal(back.error, undefined);
    assert.deepEqual(unrecognizedRows(back.project), unrecognizedRows(project));
  });
});

// ### Unrecognized files: backup round trip and no leaks ###

describe("unrecognized files survive the backup and appear nowhere else", () => {
  test("02-claude-plugin.zip: unrecognized paths, notes, and bytes are identical after a backup round trip", async () => {
    const { project } = await openFixture("02-claude-plugin.zip");
    const backup = await engine.exports.backup(project);
    for (const entry of project.unrecognized) {
      const written = backup.entries.find((file) => file.name === "clinic-helper/" + entry.path);
      assert.ok(written && engine.bytes.equal(written.bytes, entry.bytes), entry.path + " is in the backup");
    }
    const back = await engine.imports.any(backup.fileName, backup.bytes);
    assert.equal(back.error, undefined);
    assert.deepEqual(unrecognizedRows(back.project), unrecognizedRows(project));
    assert.deepEqual(back.project.servers, project.servers);
    assert.equal(back.project.license, "MIT");
  });

  test("01-agent-plugins-folder.zip: the backup writes every unrecognized file at its own path, and the non-root ones come back identical", async () => {
    const { project } = await openFixture("01-agent-plugins-folder.zip");
    const backup = await engine.exports.backup(project);
    for (const entry of project.unrecognized) {
      const written = backup.entries.find((file) => file.name === "field-kit/" + entry.path);
      assert.ok(written && engine.bytes.equal(written.bytes, entry.bytes), entry.path + " is in the backup");
    }
    const back = await engine.imports.any(backup.fileName, backup.bytes);
    assert.equal(back.error, undefined);
    // README.md is checked by the to-do test below, which fails until the engine keeps it.
    const withoutReadme = (rows) => rows.filter((row) => row[0] !== "README.md");
    assert.deepEqual(withoutReadme(unrecognizedRows(back.project)), withoutReadme(unrecognizedRows(project)));
    assert.deepEqual(back.project.pluginExtras, project.pluginExtras);
    assert.deepEqual(back.project.servers, project.servers);
  });

  test("fixed: a foreign plugin's root README.md is dropped when its backup is opened again", async () => {
    // The backup writes field-kit/README.md (the author's own file) and lists it
    // under the extension's unrecognized paths, but readPluginArchive treats a
    // backup's root README.md, LICENSE.txt, and SETUP.md as app output and skips them.
    const { project } = await openFixture("01-agent-plugins-folder.zip");
    const backup = await engine.exports.backup(project);
    const back = await engine.imports.any(backup.fileName, backup.bytes);
    assert.deepEqual(unrecognizedRows(back.project), unrecognizedRows(project));
  });

  test("fixed: a plugin licensed only by a root LICENSE file gets a LICENSE.txt that points to itself", async () => {
    // The backup keeps the author's LICENSE file at its own path and writes no
    // generated one; the plugin downloads carry the author's terms as LICENSE.txt.
    const { project } = await openFixture("01-agent-plugins-folder.zip");
    const original = project.unrecognized.find((entry) => entry.path === "LICENSE");
    const backup = await engine.exports.backup(project);
    assert.ok(backup.entries.some((entry) => entry.name === "field-kit/LICENSE" && engine.bytes.equal(entry.bytes, original.bytes)));
    assert.equal(backup.entries.some((entry) => entry.name === "field-kit/LICENSE.txt"), false);
    for (const written of [await engine.exports.portablePlugin(project), await engine.exports.claudePlugin(project)]) {
      const license = written.entries.find((entry) => /^[^/]+\/LICENSE\.txt$/.test(entry.name));
      assert.ok(license && engine.bytes.equal(license.bytes, original.bytes), written.fileName + " carries the author's license");
    }
  });

  test("the leak check itself fails when an unrecognized file does reach a download", async () => {
    const { project } = await openFixture("02-claude-plugin.zip");
    const forms = project.items[0].files[0];
    project.unrecognized.push({ path: "extra/forms.md", note: NOTE, bytes: forms.bytes });
    await assert.rejects(async () => assertNoLeaks(project, await otherExports(project)), /extra\/forms\.md leaked into/);
  });

  for (const name of ["01-agent-plugins-folder.zip", "02-claude-plugin.zip"]) {
    test(name + ": no unrecognized file appears in any download other than the backup, before or after the round trip", async () => {
      const { project } = await openFixture(name);
      assert.ok(project.unrecognized.length > 0);
      assertNoLeaks(project, await otherExports(project));
      const backup = await engine.exports.backup(project);
      const back = await engine.imports.any(backup.fileName, backup.bytes);
      assert.equal(back.error, undefined);
      assertNoLeaks(back.project, await otherExports(back.project));
      // A secret the importer dropped stays out of every download.
      for (const download of await otherExports(back.project)) {
        for (const file of download.entries) {
          assert.equal(decode(file.bytes).includes("EXAMPLE_API_KEY"), false, download.label + ": " + file.name);
        }
      }
    });
  }
});
