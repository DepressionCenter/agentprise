// This file is part of Agentprise
// tests/author-files.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-11
// Summary: Tests the files a download writes beside the author's own: names in
//          README.md and SETUP.md stay plain text and can't end the hidden
//          license comment, an author's own SETUP.md is kept with the setup
//          steps added after it unless that would pass the size limit for one
//          file, a Claude plugin's README.md and SETUP.md
//          are left out, with a notice, only when they have the outline the
//          app writes, and a NOTICE file is never used as the license.
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
import { makeDeflatedZip } from "./helpers.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);

// Names a person could type or an opened file could hold, each meant to end
// the hidden comment or to show as a link, picture, code, or HTML.
const HOSTILE_NAMES = [
  "Demo --> <a href=\"https://example.org\">Verify your account</a>",
  "Close --!> <b>here</b>",
  "Arrow ---> here",
  "<!-- x -->",
  "a-",
  "First line\nSecond line",
  "[Verify](https://example.org)",
  "![x](https://example.org/x.png)",
  "<img src=x onerror=alert(1)>",
  "Use `code` and ``more``",
  "Back\\slash \\[x\\] \\",
  "# Heading",
  "Ends with #",
  "1. Numbered & *starred* _under_ ~struck~",
  "Entity &lt;b&gt; and &#60;i&#x3e;",
  "Other" + String.fromCharCode(0x85) + "line" + String.fromCharCode(0x2028) + "breaks" + String.fromCharCode(0x2029) + "-",
  // GitHub makes a link from a bare web address, and that link would include
  // the backslash before the next mark.
  "Kit https://e.org<a href=\"https://evil.example/login\" x=y>Verify your account",
  "Kit https://e.org<img src=\"https://evil.example/p.png\" alt=x>",
  "Kit www.e.org<img src=\"https://evil.example/p.png\" alt=x>",
  "Kit WWW.e.org*bold* HTTP://e.org~~gone~~",
  "`$https://a_",
];
const SETUP_HEADING_LINE = "# Setup steps added by Agentprise";

/** Normalizes a raw project and fails on any notice, so the fixtures stay clean. */
function build(raw) {
  const result = engine.project.normalize(raw);
  assert.deepEqual(result.notices, []);
  return result.project;
}

/** A one-skill project whose names, connector, copyright, and license all hold the given text. */
function hostileProject(name) {
  return build({
    name,
    description: name,
    copyright: "Copyright 2026 " + name + " -->",
    license: "Custom terms --> " + name,
    creator: { name, url: "https://example.org" },
    items: [{
      kind: "skill",
      name,
      description: name,
      body: "Do the work.",
      capabilities: [{ id: "lookup", label: name, fallback: "Say the lookup is off.", providers: { "*": [{ kind: "connector", name }] } }],
    }],
  });
}

/** The text a Markdown viewer shows for a line, after backslash escapes. */
const visible = (line) => line.replace(/\\([!-/:-@[-`{-~])/g, "$1");
/** The value as one line, as the downloads write it. */
const LINE_BREAKS = new RegExp("[" + String.fromCharCode(0x0d, 0x0a, 0x85, 0x2028, 0x2029) + "]", "g");
const oneLine = (value) => value.replace(LINE_BREAKS, " ");

/**
 * Each mark that no backslash escapes and that a viewer could read as markup:
 * "<", "[", a backtick, "*", "~", an "_" outside a word, or a character
 * reference such as &lt;.
 */
function unescapedMarks(text) {
  const pattern = /(\\*)([<[`*~]|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])|&(?:#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);)/gu;
  return [...text.matchAll(pattern)].filter((match) => match[1].length % 2 === 0).map((match) => match[2]);
}

/** True when a line holds a web address that GitHub would make into a link: "://" or "www." with no backslash in it. */
const bareAddress = (line) => /(?<!\\):\/\/|(?<![\p{L}\p{N}])www\./iu.test(line);

/**
 * Checks a generated README.md or SETUP.md: one hidden comment closed only by
 * its own "-->" line, with no "--" inside, and no markup from a value after it.
 * @returns {string[]} the lines after the comment
 */
function checkGenerated(text, label) {
  assert.ok(text.startsWith("<!--\n"), label + " starts with the comment");
  const close = text.indexOf("\n-->\n");
  assert.ok(close > 0, label + " closes the comment on its own line");
  assert.equal(text.indexOf("-->"), close + 1, label + " has no earlier -->");
  assert.equal(text.indexOf("--!>"), -1, label + " has no --!>");
  const inside = text.slice("<!--".length, close + 1);
  assert.equal(inside.includes("--"), false, label + " has no -- inside the comment");
  assert.equal(inside.split("\n").filter(Boolean).length, 2, label + " keeps each value on one line");
  assert.match(inside, /Made with Agentprise/, label);
  const after = text.slice(close + "\n-->\n".length);
  assert.deepEqual(unescapedMarks(after), [], label + " escapes every mark a viewer could read as markup after the comment");
  // Only the creator's address, the app's own site, and the server address placeholder show as addresses.
  const appAddress = /^(Made by |2\. Replace )|, using the address /;
  const withoutSite = (line) => line.split("https://code.depressioncenter.org/agentprise/").join("");
  assert.deepEqual(after.split("\n").filter((line) => !appAddress.test(line) && bareAddress(withoutSite(line))), [], label + " has no bare web address from a value");
  return after.split("\n");
}

/** Text of the one entry whose name matches. */
function entryText(written, pattern) {
  const entry = written.entries.find((item) => pattern.test(item.name));
  assert.ok(entry, written.fileName + " has " + pattern);
  return decode(entry.bytes);
}

/** Opens a download again and fails on an error. */
async function reopen(written) {
  const opened = await engine.imports.any(written.fileName, written.bytes);
  assert.equal(opened.error, undefined, String(opened.error));
  return opened;
}

describe("names in generated README.md and SETUP.md", () => {
  for (const name of HOSTILE_NAMES) {
    test("the name " + JSON.stringify(name) + " stays plain text and can't end the license comment", async () => {
      const project = hostileProject(name);
      const item = project.items[0];
      const shown = oneLine(name);
      const skillZips = [];
      for (const exportId of ["claude", "gemini", "skill"]) {
        const written = await engine.exports.skillZip(project, item, exportId);
        skillZips.push(written);
        const readme = checkGenerated(entryText(written, /^[^/]+\/README\.md$/), exportId + " README.md");
        assert.ok(readme.some((line) => line.startsWith("# ") && visible(line) === "# " + shown), exportId + " README heading shows the name as typed");
        assert.ok(readme.some((line) => visible(line) === "Made by " + shown + " (https://example.org)."), exportId + " Made by line");
        const setup = checkGenerated(entryText(written, /^[^/]+\/SETUP\.md$/), exportId + " SETUP.md");
        assert.ok(setup.some((line) => visible(line) === "# Set up " + shown), exportId + " SETUP heading");
        assert.ok(setup.some((line) => visible(line) === "## Turn on the " + shown + " connector"), exportId + " SETUP step heading");
      }
      const backup = await engine.exports.backup(project);
      const backupReadme = checkGenerated(entryText(backup, /^[^/]+\/README\.md$/), "backup README.md");
      assert.ok(backupReadme.some((line) => visible(line) === "# " + shown));
      assert.ok(backupReadme.some((line) => line.startsWith("- ") && visible(line).startsWith("- " + shown + " (skill): skills/")));
      const plugins = [await engine.exports.claudePlugin(project), await engine.exports.portablePlugin(project)];
      for (const written of plugins) {
        const readme = checkGenerated(entryText(written, /^[^/]+\/README\.md$/), written.fileName + " README.md");
        assert.ok(readme.some((line) => visible(line) === "# " + shown), written.fileName);
        checkGenerated(entryText(written, /^[^/]+\/SETUP\.md$/), written.fileName + " SETUP.md");
      }

      // Names come back from SKILL.md, agentprise.json, and plugin.json, never README.md.
      for (const written of [backup, ...plugins]) {
        const opened = await reopen(written);
        assert.equal(opened.project.name, project.name, written.fileName);
        assert.equal(opened.project.items[0].name, item.name, written.fileName);
        // The Claude plugin's LICENSE.txt is kept, as for any plugin made elsewhere.
        assert.deepEqual(opened.project.unrecognized.map((entry) => entry.path).filter((path) => path !== "LICENSE.txt"), [], written.fileName + " keeps no README.md or SETUP.md as a project file");
      }
      for (const written of skillZips) {
        const opened = await reopen(written);
        if (!written.fileName.endsWith(".skill.zip")) {
          assert.equal(opened.project.items[0].name, item.name, written.fileName);
        }
        // The plain skill has no list of files, so its LICENSE.txt is kept, as in
        // any skill from elsewhere, and so is its SETUP.md, because it keeps no tools.
        const plain = written.fileName.endsWith(".skill.zip");
        const kept = opened.project.items[0].files.map((file) => file.path).filter((path) => path !== "LICENSE.txt" && !(plain && path === "SETUP.md"));
        assert.deepEqual(kept, [], written.fileName + " keeps no README.md or SETUP.md as an author file");
      }
    });
  }

  test("copyright and license text that holds --> stays inside the comment", async () => {
    const project = build({
      name: "Plain Name",
      copyright: "Copyright 2026 Example --> <a href=\"https://example.org\">x</a>\n--!>",
      license: "See terms --> [here](https://example.org)",
      items: [{ kind: "skill", name: "Plain Name", description: "Helps.", body: "Do the work.", capabilities: [{ id: "lookup", label: "Lookup", fallback: "Say the lookup is off.", providers: { "*": [{ kind: "connector", name: "Example" }] } }] }],
    });
    const written = [await engine.exports.skillZip(project, project.items[0], "claude"), await engine.exports.backup(project), await engine.exports.claudePlugin(project), await engine.exports.portablePlugin(project)];
    for (const download of written) {
      checkGenerated(entryText(download, /^[^/]+\/README\.md$/), download.fileName + " README.md");
    }
    const setup = entryText(written[0], /^[^/]+\/SETUP\.md$/);
    checkGenerated(setup, "SETUP.md");
    assert.ok(setup.split("\n")[2].startsWith("Copyright 2026 Example - -> <a href=\"https://example.org\">x</a> - -!>."), "the comment keeps the text readable");
  });

  test("an underscore inside a word and an ampersand stay bare, so the file is easy to read", async () => {
    const project = hostileProject("Q&A for my_server");
    const readme = entryText(await engine.exports.skillZip(project, project.items[0], "claude"), /README\.md$/);
    assert.ok(readme.includes("\n# Q&A for my_server\n"), readme);
    assert.ok(entryText(await engine.exports.skillZip(project, project.items[0], "claude"), /SETUP\.md$/).includes("## Turn on the Q&A for my_server connector"));
  });

  test("a creator address with characters a viewer reads as markup shows as itself", async () => {
    const url = "https://example.org/a_b?x=1&y=<2>`[3]`";
    const project = build({ name: "Kit", creator: { name: "Example Creator", url }, items: [{ kind: "skill", name: "Kit", description: "Helps.", body: "Do the work." }] });
    const readme = entryText(await engine.exports.skillZip(project, project.items[0], "claude"), /README\.md$/);
    assert.ok(readme.includes("Made by Example Creator (<https://example.org/a_b?x=1&y=%3C2%3E`[3]`>)."), readme);
    const simple = build({ name: "Kit", creator: { name: "Example Creator", url: "https://example.org/help" }, items: [{ kind: "skill", name: "Kit", description: "Helps.", body: "Do the work." }] });
    const plain = entryText(await engine.exports.skillZip(simple, simple.items[0], "claude"), /README\.md$/);
    assert.ok(plain.includes("Made by Example Creator (https://example.org/help)."), plain);
  });

  test("report notes and file names in README.md are plain text", async () => {
    const project = build({
      name: "Kit",
      items: [{
        kind: "skill",
        name: "Kit",
        description: "Helps.",
        body: "Read the notes.",
        files: [{ path: "references/[notes](x) `v2`.md", bytes: encode("Notes.\n") }, { path: "references/a_b&c.md", bytes: encode("More notes.\n") }],
        capabilities: [{ id: "web", label: "Search [docs](https://example.org)", fallback: "Say web search is off.", providers: { "*": [{ kind: "websearch", sites: [], instructions: "" }] } }],
      }],
    });
    const written = await engine.exports.skillZip(project, project.items[0], "claude");
    assert.ok(written.report.some((entry) => entry.component.includes("[docs]")), "the report names the tool");
    const readme = entryText(written, /README\.md$/);
    assert.ok(readme.includes("- Search \\[docs\\](https\\://example.org): "), readme);
    const files = readme.split("\n").find((line) => line.startsWith("Files: "));
    assert.equal(visible(files), "Files: " + project.items[0].files.map((file) => file.path).join(", ") + ".");
    assert.deepEqual(unescapedMarks(readme.slice(readme.indexOf("\n-->\n"))), []);
  });

  /** A project whose tool server labels, server address, and script path hold the given text. */
  function serverProject(name) {
    return build({
      name: "Kit",
      items: [{
        kind: "skill",
        name: "Kit",
        description: "Helps.",
        body: "Do the work.",
        files: [{ path: "scripts/[a](b)_x_.py", bytes: encode("URL = 'https://api.example.org/x'\n") }],
        capabilities: [
          { id: "records", label: "Records", fallback: "Say the records are off.", providers: { "*": [{ kind: "mcp", server: "remote", tools: [], instructions: "" }, { kind: "mcp", server: "own", tools: [], instructions: "" }] } },
          { id: "fetch", label: "Fetch", fallback: "Say fetching is off.", providers: { "*": [{ kind: "script", path: "scripts/[a](b)_x_.py", runtime: "python3", instructions: "" }] } },
        ],
      }],
      servers: {
        remote: { label: name, transport: "http", url: "https://mcp.example.org/a_b<c>", auth: "none", tools: [] },
        own: { label: name + " 2", transport: "http", url: "", auth: "none", tools: [] },
      },
    });
  }

  test("tool server labels, the server address, and script paths in SETUP.md are plain text", async () => {
    const name = HOSTILE_NAMES[0];
    const shown = oneLine(name);
    const project = serverProject(name);
    const guides = [];
    for (const exportId of ["claude", "gemini", "skill"]) {
      guides.push([exportId, entryText(await engine.exports.skillZip(project, project.items[0], exportId), /SETUP\.md$/)]);
    }
    const claudePlugin = await engine.exports.claudePlugin(project);
    guides.push(["claudePlugin", entryText(claudePlugin, /^[^/]+\/SETUP\.md$/)]);
    const address = "<https://mcp.example.org/a_b%3Cc%3E>";
    for (const [exportId, text] of guides) {
      // The skill ZIPs name the first server in a step; the Claude plugin connects it as a tool.
      const skillZip = exportId !== "claudePlugin";
      assert.equal(text.includes(", using the address " + address + "."), skillZip, exportId + " shows the address as itself");
      // The address is the one autolink in the file, so the check for markup leaves it out.
      const lines = checkGenerated(text.split(address).join("the address"), exportId + " SETUP.md");
      if (skillZip) {
        assert.ok(lines.some((line) => visible(line) === "## Connect the " + shown), exportId + " connect step heading");
        assert.ok(lines.some((line) => visible(line).startsWith("The instructions mention the " + shown + ". ")), exportId + " connect step text");
        assert.ok(lines.some((line) => visible(line) === "## Connect the " + shown + " 2"), exportId + " step for the server without an address");
      } else {
        // The Claude plugin asks for the second server's address in its own file.
        assert.ok(lines.some((line) => visible(line) === "## Add the address of your " + shown + " 2"), "address step heading");
        assert.ok(lines.some((line) => visible(line) === "This download has no server address, because you supply your own " + shown + " 2."), "address step text");
      }
      assert.ok(lines.some((line) => visible(line).startsWith("The script scripts/[a](b)_x_.py runs only where python3 can run")), exportId + " script step");
    }
  });

  test("the Inspect page shows Microsoft setup steps without Markdown backslashes", () => {
    const name = "C# " + HOSTILE_NAMES[0];
    const project = hostileProject(name);
    const guide = engine.tools.writeSetupGuide(project, project.items, "teamsZip");
    assert.ok(guide.includes("\n# Set up " + name + "\n"), guide);
    assert.ok(guide.includes("\n## Turn on the " + name + " connector\n"), guide);
    assert.equal(guide.slice(guide.indexOf("\n-->\n")).includes("\\"), false, "no backslashes after the comment");
    checkGenerated(engine.tools.writeSetupGuide(project, project.items, "claude"), "the claude guide is still escaped");
  });
});

describe("README.md and SETUP.md at the top of a Claude plugin", () => {
  const SKILL = encode("---\nname: lookup\ndescription: Looks things up.\n---\n\nSearch first.\n");

  /** Opens a Claude plugin with the given README.md and SETUP.md; null leaves a file out. */
  async function openWithRootFiles(readme, setup) {
    const entries = [
      { name: "demo/.claude-plugin/plugin.json", bytes: encode(JSON.stringify({ name: "demo", version: "1.0.0", license: "MIT" })) },
      { name: "demo/skills/lookup/SKILL.md", bytes: SKILL },
    ];
    if (readme !== null) {
      entries.push({ name: "demo/README.md", bytes: encode(readme) });
    }
    if (setup !== null) {
      entries.push({ name: "demo/SETUP.md", bytes: encode(setup) });
    }
    const opened = await engine.imports.any("demo.zip", makeDeflatedZip(entries));
    assert.equal(opened.error, undefined, String(opened.error));
    return opened;
  }

  /** The root files kept when a Claude plugin opens with the given README.md and SETUP.md. */
  async function keptRootFiles(readme, setup) {
    const opened = await openWithRootFiles(readme, setup);
    return opened.project.unrecognized.map((entry) => entry.path).sort();
  }

  /** A Claude plugin's README.md and SETUP.md as the app writes them. */
  async function appRootFiles() {
    const project = build({ name: "Kit", description: "Helps.", items: [{ kind: "skill", name: "Kit", description: "Helps.", body: "Do the work.", capabilities: [{ id: "lookup", label: "Lookup", fallback: "Say the lookup is off.", providers: { "*": [{ kind: "connector", name: "Example" }] } }] }] });
    const written = await engine.exports.claudePlugin(project);
    return { readme: entryText(written, /^[^/]+\/README\.md$/), setup: entryText(written, /^[^/]+\/SETUP\.md$/) };
  }

  /** The notices about root files that Agentprise writes again with each download. */
  function rootFileNotices(opened) {
    return opened.notices.filter((notice) => notice.includes("writes a new one") || notice.includes("writes new ones"));
  }

  test("a notice names each file left out, worded for one file and for two", async () => {
    const { readme, setup } = await appRootFiles();
    assert.deepEqual(rootFileNotices(await openWithRootFiles(readme, setup)), [
      "Agentprise left out README.md and SETUP.md from the plugin, because it writes new ones with each download. If you added your own text to them, put that text in a file with another name, such as NOTES.md, and open the plugin again.",
    ]);
    assert.deepEqual(rootFileNotices(await openWithRootFiles(readme, null)), [
      "Agentprise left out README.md from the plugin, because it writes a new one with each download. If you added your own text to it, put that text in a file with another name, such as NOTES.md, and open the plugin again.",
    ]);
    assert.deepEqual(rootFileNotices(await openWithRootFiles("# Demo\n\nAuthor docs.\n", null)), [], "no notice when the author's file is kept");
  });

  test("edits inside a line leave the outline as it was, so the files are left out with a notice", async () => {
    const { readme, setup } = await appRootFiles();
    const cases = [
      [readme, setup + "\nCall the help desk at extension 5 before you start.\n", "a paragraph added to SETUP.md"],
      [readme, setup.replace("This works best", "Our team requires"), "a changed setup step"],
      [readme.replace("- Kit (skill): Helps.", "- Kit (skill): Helps you find records. See the wiki."), setup, "a changed item line"],
      [readme.replace("\n\nHelps.\n\n## What is inside", "\n\nHelps the whole team.\n\n## What is inside"), setup, "a changed description"],
    ];
    for (const [changedReadme, changedSetup, label] of cases) {
      assert.notEqual(changedReadme + changedSetup, readme + setup, label + " changes a file");
      const opened = await openWithRootFiles(changedReadme, changedSetup);
      assert.deepEqual(opened.project.unrecognized.map((entry) => entry.path), [], label);
      assert.equal(rootFileNotices(opened).length, 1, label + " shows the notice");
    }
  });

  test("files the app wrote are left out, and files an author changed are kept", async () => {
    const project = build({ name: "Kit", description: "Helps.", items: [{ kind: "skill", name: "Kit", description: "Helps.", body: "Do the work.", capabilities: [{ id: "lookup", label: "Lookup", fallback: "Say the lookup is off.", providers: { "*": [{ kind: "connector", name: "Example" }] } }] }] });
    const written = await engine.exports.claudePlugin(project);
    const readme = entryText(written, /^[^/]+\/README\.md$/);
    const setup = entryText(written, /^[^/]+\/SETUP\.md$/);
    assert.deepEqual(await keptRootFiles(readme, setup), []);
    assert.deepEqual(await keptRootFiles(readme + "\nMore about this plugin.\n", setup + "\n## Ask the help desk\n\nCall them first.\n"), ["README.md", "SETUP.md"]);
    assert.deepEqual(await keptRootFiles("<!-- Made with Agentprise -->\nAuthor docs\n", readme.replace("## How to install", "## How to install it")), ["README.md", "SETUP.md"]);
  });
  test("a long line that repeats \"Made with Agentprise\" is checked quickly", async () => {
    const line = "Made with Agentprise ".repeat(24000);
    const readme = "<!--\n" + line + "\n" + line + "\n" + line + "\nnot the end of the comment\n";
    const started = Date.now();
    const kept = await keptRootFiles(readme, readme);
    assert.ok(Date.now() - started < 2000, "took " + (Date.now() - started) + " ms");
    assert.deepEqual(kept, ["README.md", "SETUP.md"]);
  });
});

describe("an author's own SETUP.md", () => {
  // A byte order mark and Windows line endings, so a byte-for-byte check means something.
  const OWN_SETUP = String.fromCharCode(0xfeff) + "# Install\r\n\r\nRun the installer first.\r\n";
  const connector = { id: "lookup", label: "Lookup", fallback: "Say the lookup is off.", providers: { "*": [{ kind: "connector", name: "Example Records" }] } };

  /** A one-skill project with a connector, and its own setup file when a path is given. */
  function setupProject(path) {
    const files = path ? [{ path, bytes: encode(OWN_SETUP) }] : [];
    return build({ name: "Setup Kit", items: [{ kind: "skill", name: "Setup Kit", description: "Helps.", body: "Do the work.", capabilities: [connector], files }] });
  }

  for (const path of ["SETUP.md", "setup.md"]) {
    test("keeps " + path + " in every skill download, adds the steps after it, and opens again byte for byte", async () => {
      const project = setupProject(path);
      const item = project.items[0];
      const own = item.files.find((file) => file.path === path).bytes;
      for (const exportId of ["claude", "gemini", "skill"]) {
        const written = await engine.exports.skillZip(project, item, exportId);
        const setups = written.entries.filter((entry) => /\/setup\.md$/i.test(entry.name));
        assert.deepEqual(setups.map((entry) => entry.name), [item.skillName + "/" + path], exportId + " writes one setup file under the author's name");
        const bytes = setups[0].bytes;
        assert.ok(engine.bytes.equal(bytes.subarray(0, own.length), own), exportId + " starts with the author's bytes");
        const added = decode(bytes.subarray(own.length));
        assert.ok(added.startsWith("\n\n" + SETUP_HEADING_LINE + "\n"), exportId);
        assert.ok(added.includes("## Turn on the Example Records connector"), exportId);
        assert.equal(added.includes("<!--"), false, exportId + " adds no second license comment");

        const opened = await reopen(written);
        const back = opened.project.items[0].files.filter((file) => /^setup\.md$/i.test(file.path));
        assert.deepEqual(back.map((file) => file.path), [path], exportId);
        // The plain skill keeps no tools, so its SETUP.md keeps the steps, and
        // the next download, which has no tools to add steps for, keeps them too.
        const expected = exportId === "skill" ? bytes : own;
        assert.ok(engine.bytes.equal(back[0].bytes, expected), exportId + " brings back the author's SETUP.md byte for byte");

        // A second download from the opened project adds the steps once, not twice.
        const again = await engine.exports.skillZip(opened.project, opened.project.items[0], exportId);
        const text = decode(again.entries.find((entry) => /\/setup\.md$/i.test(entry.name)).bytes);
        assert.equal(text.split(SETUP_HEADING_LINE).length, 2, exportId);
        assert.match(text, /## Turn on the Example Records connector/, exportId);
      }
      for (const written of [await engine.exports.claudePlugin(project), await engine.exports.portablePlugin(project)]) {
        const inFolder = written.entries.find((entry) => entry.name.endsWith("/skills/" + item.skillName + "/" + path));
        assert.ok(inFolder && engine.bytes.equal(inFolder.bytes, own), written.fileName + " keeps the author's file in the skill folder");
        assert.match(entryText(written, /^[^/]+\/SETUP\.md$/), /## Turn on the Example Records connector/, written.fileName);
        const opened = await reopen(written);
        const back = opened.project.items[0].files.find((file) => file.path === path);
        assert.ok(back && engine.bytes.equal(back.bytes, own), written.fileName + " opens with the author's file");
        assert.deepEqual(opened.project.unrecognized.map((entry) => entry.path).filter((path) => path !== "LICENSE.txt"), [], written.fileName + " keeps no generated README.md or SETUP.md");
      }
    });
  }

  test("a download of an item without its own SETUP.md opens again with no SETUP.md kept, except the plain skill", async () => {
    const project = setupProject("");
    const item = project.items[0];
    const downloads = [];
    for (const exportId of ["claude", "gemini", "skill"]) {
      downloads.push(await engine.exports.skillZip(project, item, exportId));
    }
    downloads.push(await engine.exports.claudePlugin(project), await engine.exports.portablePlugin(project), await engine.exports.backup(project));
    for (const written of downloads) {
      if (written.fileName.endsWith(".agentprise.zip")) {
        assert.equal(written.entries.some((entry) => /SETUP\.md$/i.test(entry.name)), false);
      } else {
        assert.ok(written.entries.some((entry) => /SETUP\.md$/.test(entry.name)), written.fileName + " has the generated guide");
      }
      const opened = await reopen(written);
      const kept = opened.project.items[0].files.filter((file) => /setup\.md$/i.test(file.path));
      if (written.fileName.endsWith(".skill.zip")) {
        // The plain skill keeps no tools, so it keeps the guide whole and the steps aren't lost.
        const guide = written.entries.find((entry) => /SETUP\.md$/.test(entry.name)).bytes;
        assert.ok(kept.length === 1 && engine.bytes.equal(kept[0].bytes, guide), written.fileName);
        const again = await engine.exports.skillZip(opened.project, opened.project.items[0], "skill");
        assert.match(decode(again.entries.find((entry) => /SETUP\.md$/.test(entry.name)).bytes), /## Turn on the Example Records connector/);
      } else {
        assert.deepEqual(kept, [], written.fileName);
      }
      assert.equal(opened.project.unrecognized.some((entry) => /setup\.md$/i.test(entry.path)), false, written.fileName);
    }
  });

  test("an author's SETUP.md that holds the app's heading comes back whole", async () => {
    const own = encode("# My setup\n\nStep one.\n\n" + SETUP_HEADING_LINE + "\n\nAuthor text after a copied heading.\n");
    for (const withTools of [true, false]) {
      const project = build({ name: "Setup Kit", items: [{ kind: "skill", name: "Setup Kit", description: "Helps.", body: "Do the work.", capabilities: withTools ? [connector] : [], files: [{ path: "SETUP.md", bytes: own }] }] });
      for (const exportId of ["claude", "gemini", "skill"]) {
        const written = await engine.exports.skillZip(project, project.items[0], exportId);
        const opened = await reopen(written);
        const back = opened.project.items[0].files.find((file) => file.path === "SETUP.md");
        const downloaded = written.entries.find((entry) => entry.name.endsWith("/SETUP.md")).bytes;
        // The plain skill has no agentprise.json, so its SETUP.md stays as downloaded.
        assert.ok(back && engine.bytes.equal(back.bytes, exportId === "skill" ? downloaded : own), exportId + (withTools ? " with tools" : " without tools"));
      }
    }
    const opened = await engine.imports.any("helper.zip", makeDeflatedZip([
      { name: "helper/SKILL.md", bytes: encode("---\nname: helper\ndescription: Helps.\n---\n\nDo the work.\n") },
      { name: "helper/SETUP.md", bytes: own },
    ]));
    const file = opened.project.items[0].files.find((entry) => entry.path === "SETUP.md");
    assert.ok(file && engine.bytes.equal(file.bytes, own), "a skill made elsewhere keeps its SETUP.md whole");
  });

  /** A Claude ZIP rebuilt with SETUP.md and agentprise.json changed by the given functions. */
  function rebuild(written, changeSetup, changeSidecar) {
    return engine.zip.write(written.entries.map((entry) => {
      if (/\/SETUP\.md$/.test(entry.name)) {
        return { name: entry.name, bytes: changeSetup(entry.bytes) };
      }
      if (/\/agentprise\.json$/.test(entry.name)) {
        return { name: entry.name, bytes: encode(JSON.stringify(changeSidecar(JSON.parse(decode(entry.bytes))))) };
      }
      return entry;
    }));
  }

  test("the author's bytes come back when the added steps aren't valid UTF-8 or the length is wrong", async () => {
    const project = setupProject("SETUP.md");
    const own = project.items[0].files[0].bytes;
    const written = await engine.exports.skillZip(project, project.items[0], "claude");
    const marker = encode("\n\n" + SETUP_HEADING_LINE + "\n");
    const broken = rebuild(written, () => new Uint8Array([...own, ...marker, 0xff, 0xfe, 0xff, 0xfe, 0xff, 0xfe]), (doc) => doc);
    let back = (await engine.imports.any(written.fileName, broken)).project.items[0].files.find((file) => file.path === "SETUP.md");
    assert.ok(engine.bytes.equal(back.bytes, own), "cut at the recorded length");
    const tooLong = rebuild(written, (bytes) => bytes, (doc) => Object.assign(doc, { ownSetup: { path: "SETUP.md", length: own.length + 3 } }));
    const downloaded = written.entries.find((entry) => entry.name.endsWith("/SETUP.md")).bytes;
    back = (await engine.imports.any(written.fileName, tooLong)).project.items[0].files.find((file) => file.path === "SETUP.md");
    assert.ok(engine.bytes.equal(back.bytes, downloaded), "a length that doesn't end at the heading keeps the file whole");
  });

  test("a download whose SETUP.md the previous version replaced with the guide opens without it", async () => {
    const project = setupProject("SETUP.md");
    const item = project.items[0];
    const written = await engine.exports.skillZip(project, item, "claude");
    const guide = encode(engine.tools.writeSetupGuide(project, [item], "claude"));
    const old = rebuild(written, () => guide, (doc) => { delete doc.ownSetup; return doc; });
    const opened = await engine.imports.any(written.fileName, old);
    assert.equal(opened.project.items[0].files.some((file) => /setup\.md$/i.test(file.path)), false);
    const again = await engine.exports.skillZip(opened.project, opened.project.items[0], "claude");
    const text = decode(again.entries.find((entry) => /SETUP\.md$/.test(entry.name)).bytes);
    assert.equal(text.split("## Turn on the Example Records connector").length, 2, "the next download has the steps once");
  });

  test("a SETUP.md from another app is kept as it is", async () => {
    const own = encode("<!--\nNotes\n-->\n\n# Setup\n\nInstall it.\n");
    const opened = await engine.imports.any("helper.zip", makeDeflatedZip([
      { name: "helper/SKILL.md", bytes: encode("---\nname: helper\ndescription: Helps.\n---\n\nDo the work.\n") },
      { name: "helper/SETUP.md", bytes: own },
    ]));
    const file = opened.project.items[0].files.find((entry) => entry.path === "SETUP.md");
    assert.ok(file && engine.bytes.equal(file.bytes, own));
  });

  test("a SETUP.md near the size limit stays as it is, and the steps go in a file of their own", async () => {
    // One byte under the 10 MB limit for one file, so any added step would pass it.
    const own = new Uint8Array(10 * 1024 * 1024 - 1).fill(0x61);
    own.set(encode("# Install\n\n"), 0);
    for (const authorSteps of [false, true]) {
      // An author file already named SETUP-STEPS.md keeps its name and bytes.
      const authorStepsBytes = encode("# My own steps\n");
      const files = [{ path: "SETUP.md", bytes: own }].concat(authorSteps ? [{ path: "SETUP-STEPS.md", bytes: authorStepsBytes }] : []);
      const project = build({ name: "Setup Kit", items: [{ kind: "skill", name: "Setup Kit", description: "Helps.", body: "Do the work.", capabilities: [connector], files }] });
      const item = project.items[0];
      const stepsName = authorSteps ? "SETUP-STEPS-2.md" : "SETUP-STEPS.md";
      for (const exportId of ["claude", "gemini", "skill"]) {
        const label = exportId + (authorSteps ? " with an author file named SETUP-STEPS.md" : "");
        const written = await engine.exports.skillZip(project, item, exportId);
        const setup = written.entries.find((entry) => entry.name === item.skillName + "/SETUP.md");
        assert.ok(setup && engine.bytes.equal(setup.bytes, own), label + " keeps the author's SETUP.md unchanged");
        const steps = entryText(written, new RegExp("/" + stepsName.replace(/\./g, "\.") + "$"));
        assert.match(steps, /## Turn on the Example Records connector/, label);
        if (authorSteps) {
          const kept = written.entries.find((entry) => entry.name === item.skillName + "/SETUP-STEPS.md");
          assert.ok(kept && engine.bytes.equal(kept.bytes, authorStepsBytes), label + " keeps the author's SETUP-STEPS.md");
        }
        const entry = written.report.find((line) => line.component === "SETUP.md");
        assert.ok(entry && entry.status === "transformed" && entry.note.includes(stepsName), label + " reports where the steps went");
        assert.ok(entryText(written, /\/README\.md$/).includes(stepsName), label + " README.md names the steps file");

        const opened = await reopen(written);
        const back = opened.project.items[0].files;
        assert.ok(engine.bytes.equal(back.find((file) => file.path === "SETUP.md").bytes, own), label + " opens with the author's SETUP.md byte for byte");
        // The plain skill keeps no tools, so it keeps the steps file and the steps aren't lost.
        assert.equal(back.some((file) => file.path === stepsName), exportId === "skill", label + " steps file kept only by the plain skill");
        if (exportId === "claude") {
          const again = await engine.exports.skillZip(opened.project, opened.project.items[0], exportId);
          assert.equal(again.entries.filter((line) => /\/SETUP-STEPS(-2)?\.md$/.test(line.name) && /## Turn on the Example Records connector/.test(decode(line.bytes))).length, 1, label + " next download has the steps once");
        }
      }
    }
  });
});

describe("license files from a plugin made elsewhere", () => {
  const LICENSE = encode("MIT License\n\nCopyright (c) 2026 Example Org\n");
  const NOTICE = encode("This product includes software developed by Example Org.\n");
  const COPYING = encode("Copying terms from Example Org.\n");
  const SKILL = encode("---\nname: lookup\ndescription: Looks things up.\n---\n\nSearch first.\n");

  /** Opens a Claude plugin with the given root files, listed in that order before the skill. */
  async function openPlugin(rootFiles, skillFiles = []) {
    const entries = [{ name: "demo/.claude-plugin/plugin.json", bytes: encode(JSON.stringify({ name: "demo", version: "1.0.0" })) }]
      .concat(rootFiles.map(([path, bytes]) => ({ name: "demo/" + path, bytes })))
      .concat([{ name: "demo/skills/lookup/SKILL.md", bytes: SKILL }])
      .concat(skillFiles.map(([path, bytes]) => ({ name: "demo/skills/lookup/" + path, bytes })));
    const opened = await engine.imports.any("demo.zip", makeDeflatedZip(entries));
    assert.equal(opened.error, undefined, String(opened.error));
    return opened.project;
  }

  /** The root LICENSE.txt of both plugin downloads. */
  async function pluginLicenses(project) {
    const found = [];
    for (const written of [await engine.exports.claudePlugin(project), await engine.exports.portablePlugin(project)]) {
      found.push(written.entries.find((entry) => /^[^/]+\/LICENSE\.txt$/.test(entry.name)).bytes);
    }
    return found;
  }

  test("LICENSE wins over a NOTICE listed before it", async () => {
    const project = await openPlugin([["NOTICE", NOTICE], ["LICENSE", LICENSE]]);
    assert.equal(project.license, "See LICENSE.txt");
    const license = project.items[0].files.find((file) => file.path === "LICENSE.txt");
    assert.ok(license && engine.bytes.equal(license.bytes, LICENSE), "the skill gets the LICENSE text");
    assert.deepEqual(project.unrecognized.map((entry) => entry.path).sort(), ["LICENSE", "NOTICE"]);
    for (const bytes of await pluginLicenses(project)) {
      assert.ok(engine.bytes.equal(bytes, LICENSE), "the plugin download carries the LICENSE text");
    }
  });

  test("LICENSE.md wins over a COPYING file listed before it", async () => {
    const project = await openPlugin([["COPYING", COPYING], ["LICENSE.md", LICENSE]]);
    const license = project.items[0].files.find((file) => file.path === "LICENSE.txt");
    assert.ok(license && engine.bytes.equal(license.bytes, LICENSE));
    for (const bytes of await pluginLicenses(project)) {
      assert.ok(engine.bytes.equal(bytes, LICENSE));
    }
  });

  test("a skill with only a NOTICE file still gets the plugin's license", async () => {
    const project = await openPlugin([["LICENSE", LICENSE]], [["NOTICE", NOTICE]]);
    const files = project.items[0].files;
    assert.ok(engine.bytes.equal(files.find((file) => file.path === "NOTICE").bytes, NOTICE));
    assert.ok(engine.bytes.equal(files.find((file) => file.path === "LICENSE.txt").bytes, LICENSE));
  });

  test("a plugin with only a NOTICE file keeps it as NOTICE and states no license", async () => {
    const project = await openPlugin([["NOTICE", NOTICE]]);
    assert.equal(project.license, "Not stated");
    assert.equal(project.items[0].files.some((file) => /^licen[cs]e/i.test(file.path)), false, "no LICENSE.txt is made from the NOTICE");
    const notice = project.unrecognized.find((entry) => entry.path === "NOTICE");
    assert.ok(notice && engine.bytes.equal(notice.bytes, NOTICE));
    for (const bytes of await pluginLicenses(project)) {
      assert.equal(engine.bytes.equal(bytes, NOTICE), false);
      assert.match(decode(bytes), /not stated/);
    }
    const backup = await engine.exports.backup(project);
    assert.ok(backup.entries.some((entry) => entry.name === "demo/NOTICE" && engine.bytes.equal(entry.bytes, NOTICE)), "the backup keeps the NOTICE file");
    assert.match(decode(backup.entries.find((entry) => entry.name === "demo/LICENSE.txt").bytes), /not stated/);
  });

  test("a skill folder with only a NOTICE file opens with no license stated", async () => {
    const opened = await engine.imports.any("lookup.zip", makeDeflatedZip([
      { name: "lookup/SKILL.md", bytes: SKILL },
      { name: "lookup/NOTICE", bytes: NOTICE },
    ]));
    assert.equal(opened.project.license, "Not stated");
    assert.ok(opened.project.items[0].files.some((file) => file.path === "NOTICE"));
  });
});

describe("the Inspect page report", () => {
  const page = readFileSync(join(repoRoot, "index.html"), "utf8").replace(/\r\n/g, "\n");
  const start = page.indexOf("async function buildProductFiles(");
  const end = page.indexOf("function productReport(", start);
  const source = page.slice(start, end);

  /** Runs buildProductFiles with a planned report and a writer that may return its own. */
  async function inspect(planned, written) {
    const context = vm.createContext({
      productReport: () => planned,
      buildProductFilesUnchecked: async () => (written ? { files: [], report: written } : { files: [] }),
    });
    vm.runInContext(source, context);
    return (await context.buildProductFiles({}, {}, "claude")).report;
  }

  test("shows the report the skill ZIP writer returns, such as setup steps moved to SETUP-STEPS.md", async () => {
    assert.ok(start > 0 && end > start);
    const planned = [{ component: "Tools", status: "requires-setup", note: "Connect it." }];
    const written = planned.concat([{ component: "SETUP.md", status: "transformed", note: "Agentprise put the setup steps in SETUP-STEPS.md." }]);
    assert.equal(await inspect(planned, written), written);
    assert.equal(await inspect(planned, null), planned);
  });

  test("the skill ZIPs pass their report to the Inspect page", () => {
    const skill = page.slice(page.indexOf('if (product === "gemini" || product === "claude" || product === "skill")'));
    assert.match(skill.slice(0, skill.indexOf("\n    }\n")), /report: result\.report/);
  });
});
