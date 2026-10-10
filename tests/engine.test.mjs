// This file is part of Agentprise
// tests/engine.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-10
// Summary: Tests for the engine inside index.html: the agent model, validation,
//          YAML frontmatter, ZIP reading and writing, and PNG header checks.
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
import { makePng, makeDeflatedZip, findCentralDirectory, sampleAgent } from "./helpers.mjs";

const engine = loadEngine();
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);

describe("model", () => {
  test("limits and defaults", () => {
    assert.equal(engine.LIMITS.starters, 12);
    assert.equal(engine.LIMITS.skillName, 64);
    const agent = engine.createAgent();
    assert.equal(agent.name, "");
    assert.equal(agent.license, "GPL-3.0-or-later");
    assert.equal(agent.copilot.webSearch, true);
    assert.equal(agent.copilot.preferMyFiles, false);
    assert.equal(agent.copilot.teamsMessages, false);
    assert.equal(agent.copilot.email, false);
    assert.deepEqual(agent.copilot.webSites, []);
    assert.deepEqual(agent.sharepointItems, []);
    assert.deepEqual(agent.files, []);
  });

  test("toSkillName follows the Agent Skills rules", () => {
    assert.equal(engine.toSkillName("My Agent!!"), "my-agent");
    assert.equal(engine.toSkillName("  --Caf\u00e9 Helper--  "), "cafe-helper");
    assert.equal(engine.toSkillName("a__b   c"), "a-b-c");
    assert.equal(engine.toSkillName(""), "agent");
    assert.equal(engine.toSkillName("!!!"), "agent");
    const long = engine.toSkillName("x".repeat(100));
    assert.equal(long.length, 64);
    const nearBoundary = engine.toSkillName("x".repeat(63) + " y");
    assert.ok(!nearBoundary.endsWith("-"));
    assert.ok(!/--/.test(engine.toSkillName("a - b")));
  });
});

describe("normalizeAgent", () => {
  test("caps text and lists with notices", () => {
    const { agent, notices } = engine.normalizeAgent({
      name: "n".repeat(150),
      starters: Array.from({ length: 15 }, (_, i) => "starter " + i),
    });
    assert.equal(agent.name.length, 100);
    assert.equal(agent.starters.length, 12);
    assert.ok(notices.some((n) => n.includes("name")));
    assert.ok(notices.some((n) => n.includes("12")));
  });

  test("drops empty starters and non-https links", () => {
    const { agent, notices } = engine.normalizeAgent({
      starters: ["  ", "keep me", ""],
      sharepointLinks: ["http://example.com/plain", "https://example.sharepoint.com/sites/a", "not a url", ""],
    });
    assert.deepEqual(agent.starters, ["keep me"]);
    assert.deepEqual(agent.sharepointLinks, ["https://example.sharepoint.com/sites/a"]);
    assert.ok(notices.some((n) => n.includes("https")));
  });

  test("rejects non-object input and non-PNG icons", () => {
    assert.equal(engine.normalizeAgent(null).agent.name, "");
    assert.equal(engine.normalizeAgent([1, 2]).agent.name, "");
    const bad = engine.normalizeAgent({ icon: { bytes: encode("not a png"), mime: "image/png" } });
    assert.equal(bad.agent.icon, null);
    assert.ok(bad.notices.some((n) => n.includes("PNG")));
    const good = engine.normalizeAgent({ icon: { bytes: makePng(8, 8), mime: "image/png" } });
    assert.ok(good.agent.icon);
    assert.equal(good.agent.icon.mime, "image/png");
  });

  test("accepts string booleans and ignores unknown copilot keys", () => {
    const { agent } = engine.normalizeAgent({ copilot: { webSearch: "false", preferMyFiles: "true", bogus: true, appId: "not-a-uuid" } });
    assert.equal(agent.copilot.webSearch, false);
    assert.equal(agent.copilot.preferMyFiles, true);
    assert.equal(agent.copilot.bogus, undefined);
    assert.equal(agent.copilot.appId, "");
    const uuid = "0A95BFD2-3FDA-451A-8344-95443DCD5297";
    assert.equal(engine.normalizeAgent({ copilot: { appId: uuid } }).agent.copilot.appId, uuid.toLowerCase());
    assert.equal(engine.normalizeAgent({ copilot: { email: "true" } }).agent.copilot.email, true);
  });

  test("keeps SharePoint items with only the known keys", () => {
    const { agent } = engine.normalizeAgent({ sharepointItems: [
      { by: "id", url: "https://example.sharepoint.com/sites/a/doc.docx", name: "<b>doc</b>", site_id: "11111111-1111-4111-8111-111111111111", list_id: "not a guid", type: "File", evil: "x" },
      { by: "weird", url: "javascript:alert(1)", name: "no address" },
      { by: "url", url: "https://example.sharepoint.com/sites/b", search_associated_sites: true },
      "not an object",
    ] });
    assert.deepEqual(agent.sharepointItems, [
      { by: "id", url: "https://example.sharepoint.com/sites/a/doc.docx", name: "<b>doc</b>", site_id: "11111111-1111-4111-8111-111111111111", type: "File" },
      { by: "url", url: "https://example.sharepoint.com/sites/b", search_associated_sites: true },
    ]);
  });

  test("keeps at most four web sites of the allowed shape", () => {
    const { agent, notices } = engine.normalizeAgent({ copilot: { webSites: [
      "https://example.org", "https://example.org/a/b", "https://example.org/a/b/c", "https://example.org/?q=1", "http://example.org", "https://example.net", "https://example.com", "https://example.edu",
    ] } });
    assert.deepEqual(agent.copilot.webSites, ["https://example.org", "https://example.org/a/b", "https://example.net", "https://example.com"]);
    assert.ok(notices.some((n) => n.includes("3 web site(s) were removed")));
    assert.ok(notices.some((n) => n.includes("first 4")));
  });

  test("keeps attached files Copilot accepts and drops the rest", () => {
    const small = encode("hello");
    const files = [
      { name: "../plan.docx", bytes: small },
      { name: "tool.exe", bytes: small },
      { name: "PLAN.docx", bytes: small },
      { name: "empty.txt", bytes: new Uint8Array(0) },
      { name: "big.pdf", bytes: new Uint8Array(engine.LIMITS.fileBytes + 1) },
      { name: "no bytes.txt" },
    ];
    for (let i = 0; i < 25; i++) { files.push({ name: "note" + i + ".txt", bytes: small }); }
    const { agent, notices } = engine.normalizeAgent({ files });
    assert.equal(agent.files.length, 20);
    assert.equal(agent.files[0].name, "plan.docx");
    assert.ok(agent.files.every((f) => f.name.endsWith(".docx") || f.name.endsWith(".txt")));
    assert.ok(agent.files.every((f) => !f.name.includes("..")));
    assert.ok(notices.some((n) => n.includes("11 attached file(s) were left out")));
  });

  test("keeps script tags as literal text", () => {
    const { agent } = engine.normalizeAgent({ description: "<script>alert(1)</script>" });
    assert.equal(agent.description, "<script>alert(1)</script>");
  });
});

describe("validateAgent", () => {
  test("reports missing required fields as problems", () => {
    const { problems } = engine.validateAgent(engine.createAgent());
    const fields = problems.map((p) => p.field);
    assert.deepEqual(fields, ["name", "description", "instructions"]);
  });

  test("reports format-specific losses as warnings", () => {
    const agent = sampleAgent(engine);
    const { problems, warnings } = engine.validateAgent(agent);
    assert.equal(problems.length, 0);
    assert.ok(warnings.some((w) => w.field === "welcome"));
    assert.ok(warnings.some((w) => w.field === "sharepointLinks"));
    assert.ok(!warnings.some((w) => w.field === "creator"));
    agent.creator.terms = "";
    assert.ok(engine.validateAgent(agent).warnings.some((w) => w.field === "creator"));
  });
});

describe("yaml frontmatter", () => {
  const sample = [
    "---",
    "name: caveman",
    "description: Me agent, answer questions, big brain.",
    "license: GPL-3.0-or-later. See LICENSE.txt.",
    "metadata:",
    "  agentprise-version: \"1\"",
    "  display-name: Caveman",
    "  starters: |",
    "    Caveman, what can you do?",
    "    Tell me more about...",
    "    What's new today?",
    "  sharepoint-sources: \"\"",
    "  copilot-web-search: \"true\"",
    "  quoted: \"has: colon and \\\"quotes\\\"\"",
    "---",
    "# Purpose",
    "",
    "Answer questions.",
  ].join("\n");

  test("parses the bundle layout", () => {
    const { data, body, warnings } = engine.yaml.parseFrontmatter(sample);
    assert.equal(warnings.length, 0);
    assert.equal(data.name, "caveman");
    assert.equal(data.description, "Me agent, answer questions, big brain.");
    assert.equal(data.metadata["agentprise-version"], "1");
    assert.equal(data.metadata["display-name"], "Caveman");
    assert.equal(data.metadata.starters, "Caveman, what can you do?\nTell me more about...\nWhat's new today?\n");
    assert.equal(data.metadata["sharepoint-sources"], "");
    assert.equal(data.metadata["copilot-web-search"], "true");
    assert.equal(data.metadata.quoted, "has: colon and \"quotes\"");
    assert.equal(body, "# Purpose\n\nAnswer questions.");
  });

  test("Windows line endings parse the same", () => {
    const unix = engine.yaml.parseFrontmatter(sample);
    const windows = engine.yaml.parseFrontmatter(sample.replace(/\n/g, "\r\n"));
    assert.deepEqual(windows.data, unix.data);
    assert.equal(windows.body, unix.body);
  });

  test("round trips through the writer", () => {
    const data = {
      name: "demo",
      description: "A description: with a colon",
      metadata: {
        block: "line one\nline two\n\nline four",
        trailing: "ends with newline\n",
        empty: "",
        numeric: "123",
        bool: "true",
        hash: "value # not a comment",
        leading: " spaced",
      },
    };
    const text = engine.yaml.stringifyFrontmatter(data, "Body text\n");
    assert.ok(text.startsWith("---\nname: demo\n"));
    const parsed = engine.yaml.parseFrontmatter(text);
    assert.equal(parsed.warnings.length, 0);
    assert.deepEqual(parsed.data, data);
    assert.equal(parsed.body, "Body text\n");
  });

  test("unknown keys are kept and unsupported syntax warns", () => {
    const text = "---\nname: x\ncompatibility: anything\ntags:\n  - one\n  - two\n---\nbody";
    const { data, warnings, body } = engine.yaml.parseFrontmatter(text);
    assert.equal(data.compatibility, "anything");
    assert.ok(warnings.length > 0);
    assert.equal(body, "body");
  });

  test("text without frontmatter is all body", () => {
    const { data, body } = engine.yaml.parseFrontmatter("just instructions\nhere");
    assert.deepEqual(data, {});
    assert.equal(body, "just instructions\nhere");
  });
});

describe("png", () => {
  test("reads dimensions and rejects other bytes", () => {
    assert.deepEqual(engine.png.dimensions(makePng(192, 192)), { width: 192, height: 192 });
    assert.deepEqual(engine.png.dimensions(makePng(32, 16)), { width: 32, height: 16 });
    assert.equal(engine.png.dimensions(encode("GIF89a and some more bytes here......")), null);
    assert.equal(engine.png.dimensions(new Uint8Array(3)), null);
  });
});

describe("zip", () => {
  test("writes and reads stored entries", async () => {
    const bytes = engine.zip.write([
      { name: "a/SKILL.md", bytes: encode("---\nname: a\n---\nhello") },
      { name: "a/icon.png", bytes: makePng(4, 4) },
    ]);
    assert.equal(decode(bytes.subarray(0, 2)), "PK");
    const entries = await engine.zip.read(bytes);
    assert.deepEqual([...entries.keys()], ["a/SKILL.md", "a/icon.png"]);
    assert.equal(decode(entries.get("a/SKILL.md")), "---\nname: a\n---\nhello");
    assert.ok(engine.bytes.equal(entries.get("a/icon.png"), makePng(4, 4)));
  });

  test("reads deflated entries", async () => {
    const payload = encode("x".repeat(5000) + "end");
    const bytes = makeDeflatedZip([{ name: "manifest.json", bytes: payload }]);
    const entries = await engine.zip.read(bytes);
    assert.ok(engine.bytes.equal(entries.get("manifest.json"), payload));
  });

  test("rejects unsafe entry names", async () => {
    for (const name of ["../evil.txt", "a/../../evil.txt", "/abs.txt", "dir\\file.txt", "C:/x.txt"]) {
      const bytes = engine.zip.write([{ name, bytes: encode("x") }]);
      await assert.rejects(engine.zip.read(bytes), engine.zip.ZipError, name);
    }
  });

  test("rejects too many entries", async () => {
    const entries = Array.from({ length: 201 }, (_, i) => ({ name: "f" + i, bytes: encode("x") }));
    await assert.rejects(engine.zip.read(engine.zip.write(entries)), /entries/);
  });

  test("rejects an entry that declares an oversize length before inflating", async () => {
    const bytes = makeDeflatedZip([{ name: "big.bin", bytes: encode("small") }]);
    const central = findCentralDirectory(bytes);
    new DataView(bytes.buffer).setUint32(central + 24, 0xfffffff0, true);
    await assert.rejects(engine.zip.read(bytes), /larger than/);
  });

  test("rejects an entry whose inflated size exceeds its declared size", async () => {
    const bytes = makeDeflatedZip([{ name: "lie.bin", bytes: encode("a".repeat(4096)) }]);
    const central = findCentralDirectory(bytes);
    new DataView(bytes.buffer).setUint32(central + 24, 10, true);
    await assert.rejects(engine.zip.read(bytes), engine.zip.ZipError);
  });

  test("rejects damaged checksums and non-zip input", async () => {
    const bytes = engine.zip.write([{ name: "a.txt", bytes: encode("hello world") }]);
    bytes[30 + 5 + 2] ^= 0xff;
    await assert.rejects(engine.zip.read(bytes), /checksum/);
    await assert.rejects(engine.zip.read(encode("this is not a zip file at all, really")), /not a ZIP/);
  });
});
