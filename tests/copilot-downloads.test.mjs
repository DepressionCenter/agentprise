// This file is part of Agentprise
// tests/copilot-downloads.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-11
// Last Modified: 2026-11-11
// Summary: Tests that the Copilot downloads match what Microsoft 365 accepts:
//          files outside references/ are reported as left out, a long or
//          multi-line description is shortened to one line of 1,000
//          characters with a report entry and a download message, two files
//          never share a name in the package, and double square brackets in
//          the name, description, example questions, or the start or end of
//          the instructions block the download.
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
import { goldenRaw, teamsIcons } from "./tools-fixture.mjs";
import { BYTE_SHAPES } from "./helpers.mjs";
import { loadSchema, validate, describeErrors } from "./schema-validator.mjs";

const engine = loadEngine();
await engine.ready;
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const AGENT_SCHEMA = "copilot/declarative-agent-v1.8.schema.json";
const SKILLS_AGENT_SCHEMA = "copilot/declarative-agent-v1.9.schema.json";

/** Schema errors for one declarative agent file. */
const schemaErrors = (document, file = AGENT_SCHEMA) => validate(loadSchema(file), document);

/** A one-skill project with these settings on the skill. */
function skillProject(settings) {
  return engine.project.normalize({
    name: "Note Kit",
    creator: { name: "Example Creator", url: "https://example.org", privacy: "https://example.org/privacy", terms: "https://example.org/terms" },
    items: [Object.assign({
      kind: "skill", name: "Note Helper", description: "Helps with notes.", body: "Read the notes and answer.", capabilities: [], files: [],
    }, settings)],
  }).project;
}

/** The golden assistant with its skill, after these changes to the raw project. */
function goldenProject(change) {
  const raw = goldenRaw();
  change(raw);
  return engine.project.normalize(raw).project;
}

const report = (project, exportId, item = project.items[0]) => engine.tools.conversionReport(project, item, exportId);
const entryFor = (entries, component) => entries.find((entry) => entry.component === component);

/** The Copilot app package and its declarative agent file. */
async function teamsPackage(project, item = project.items[0]) {
  const result = await engine.exports.teamsPackage(project, item, teamsIcons());
  const entries = await engine.zip.read(result.bytes);
  return { result, entries, agent: JSON.parse(decode(entries.get("declarativeAgent_0.json"))) };
}

/** A description of whole words, count characters long. */
function wordsOfLength(count) {
  let text = "";
  for (let n = 1; text.length < count; n++) {
    text += (text ? " " : "") + "word" + n;
  }
  return text.slice(0, count).replace(/ $/, "x");
}

describe("files outside references/ in the Copilot downloads", () => {
  test("a skill's files outside references/ are each reported as left out, and the package leaves them out", async () => {
    const project = skillProject({
      body: "Fill in templates/letter.txt for each reply.",
      files: [
        { path: "references/notes.md", bytes: encode("# Notes\n") },
        { path: "templates/letter.txt", bytes: encode("Dear reader,\n") },
        { path: "references/style/guide.md", bytes: encode("# Style\n") },
      ],
    });
    const entries = report(project, "teamsZip");
    const letter = entryFor(entries, "templates/letter.txt");
    const guide = entryFor(entries, "references/style/guide.md");
    assert.equal(letter.status, "unsupported");
    assert.equal(letter.note, "Left out, because the Copilot app package takes only files directly inside references/. The backup keeps it. The steps still tell the assistant to use it, so change the steps or add the file again in references/ before you share this download.");
    assert.equal(guide.note, "Left out, because the Copilot app package takes only files directly inside references/. The backup keeps it.");
    const built = await teamsPackage(project);
    assert.deepEqual([...built.entries.keys()].filter((name) => !/\.(json|png)$/.test(name)), ["notes.md.txt"]);
  });

  test("a used skill's file outside references/ is reported with the skill's name, and a script its tool names is reported only once", () => {
    const project = goldenProject((raw) => {
      raw.items[1].files.push({ path: "templates/letter.txt", bytes: encode("Dear reader,\n") });
    });
    const entries = report(project, "teamsZip");
    assert.equal(entryFor(entries, "templates/letter.txt").note, "Left out from the skill Record Finder, because the Copilot app package takes only files directly inside references/. The backup keeps it.");
    assert.equal(entries.filter((entry) => entry.note.includes("scripts/lookup.py")).length, 1, JSON.stringify(entries, null, 2));
    assert.ok(!entries.some((entry) => entry.component === "openapi/records.yaml"), "the API description goes in with its action");
  });

  test("the Teams Chat file says it has no place for files when only a used skill has them", () => {
    const project = goldenProject((raw) => {
      raw.items[1].files = [{ path: "templates/letter.txt", bytes: encode("Dear reader,\n") }];
      raw.items[1].capabilities = [];
    });
    assert.equal(entryFor(report(project, "msAgent"), "Attached files").note, "The Teams Chat file has no place for files.");
    const alone = goldenProject((raw) => {
      raw.items[0].uses = [];
    });
    assert.equal(entryFor(report(alone, "msAgent"), "Attached files"), undefined);
  });
});

describe("a description Copilot can take", () => {
  test("a 1,024-character skill description ends at the last whole word within 1,000 characters, with a report entry and a download message", async () => {
    const long = wordsOfLength(1024);
    const project = skillProject({ description: long });
    const built = await teamsPackage(project);
    const description = built.agent.description;
    assert.ok(description.length <= 1000 && description.length > 980, String(description.length));
    assert.ok(long.startsWith(description + " "), "the cut falls between two words");
    assert.deepEqual(schemaErrors(built.agent), [], describeErrors(schemaErrors(built.agent)));
    assert.equal(entryFor(built.result.report, "Description").status, "transformed");
    assert.match(entryFor(built.result.report, "Description").note, /^Copilot allows at most 1,000 characters, .+ Your project keeps the full text\. To choose the words yourself, shorten the description to 1,000 characters or fewer\.$/);
    assert.equal(built.result.warnings[0], "Copilot allows at most 1,000 characters in a description, so Agentprise shortened it in this download. Your project keeps the full text.");
    assert.equal(project.items[0].description, long, "the project keeps the full text");
  });

  test("the Copilot app with skills shortens a skill's description the same way and says so after the download", async () => {
    const long = wordsOfLength(1024);
    const project = skillProject({ description: long });
    const result = await engine.exports.microsoftPackage(project, project.items[0], teamsIcons(), "copilotSkills");
    const agent = JSON.parse(decode((await engine.zip.read(result.bytes)).get("declarativeAgent_0.json")));
    assert.ok(agent.description.length <= 1000);
    assert.deepEqual(schemaErrors(agent, SKILLS_AGENT_SCHEMA), [], describeErrors(schemaErrors(agent, SKILLS_AGENT_SCHEMA)));
    assert.equal(result.warnings.length, 1);
    assert.match(entryFor(result.report, "Description").note, /ends the description at the last whole word that fits/);
  });

  test("extra spaces outside quotes go first, so a description that then fits keeps every word", async () => {
    const quoted = "\"keep  these  spaces\"";
    let words = "";
    let padded = "";
    for (let length = 600; padded.length <= 1000; length += 5) {
      words = wordsOfLength(length);
      padded = words.replace(/ /g, "   ") + " " + quoted;
    }
    assert.ok(padded.length <= 1024, "a skill description holds up to 1,024 characters");
    const project = skillProject({ description: padded });
    const built = await teamsPackage(project);
    assert.equal(built.agent.description, words + " " + quoted);
    assert.deepEqual(built.result.warnings, []);
    assert.match(entryFor(built.result.report, "Description").note, /^Copilot takes a description of one line with at most 1,000 characters/);
  });

  test("line breaks in a short description become spaces, since Microsoft's schema takes one line", async () => {
    const project = skillProject({ description: "Helps with notes.\r\n\r\nUse it for meeting notes.\nAnd\n\rtask lists." });
    const built = await teamsPackage(project);
    assert.equal(built.agent.description, "Helps with notes. Use it for meeting notes. And task lists.");
    assert.deepEqual(schemaErrors(built.agent), [], describeErrors(schemaErrors(built.agent)));
    assert.deepEqual(built.result.warnings, []);
    const raw = JSON.parse(JSON.stringify(built.agent));
    raw.description = "Helps with notes.\nUse it for meeting notes.";
    assert.notDeepEqual(schemaErrors(raw), [], "the schema refuses a line break in the description");
  });

  test("a description that already fits on one line is unchanged and not reported", async () => {
    const project = skillProject({ description: "Helps with  notes." });
    const built = await teamsPackage(project);
    assert.equal(built.agent.description, "Helps with  notes.");
    assert.equal(entryFor(built.result.report, "Description"), undefined);
    assert.deepEqual(built.result.warnings, []);
  });
});

describe("file names in the Copilot app package", () => {
  test("notes.md and notes.md.txt never both go in as notes.md.txt, and the package opens again", async () => {
    const project = skillProject({
      files: [
        { path: "references/notes.md", bytes: encode("# First\n") },
        { path: "references/notes.md.txt", bytes: encode("Second\n") },
      ],
    });
    const built = await teamsPackage(project);
    const names = [...built.entries.keys()].filter((name) => !/\.(json|png)$/.test(name));
    assert.deepEqual(names, ["notes.md.txt"]);
    assert.equal(decode(built.entries.get("notes.md.txt")), "# First\n");
    const left = entryFor(built.result.report, "notes.md.txt");
    assert.equal(left.status, "unsupported");
    assert.equal(left.note, "Left out, because another file in the package is already named notes.md.txt. To include it, rename one of the two files.");
    const opened = await engine.imports.any(built.result.fileName, built.result.bytes);
    assert.ok(!opened.error, opened.error);
  });

  test("names that differ only in case, on the assistant and in a used skill, go in once", async () => {
    const project = goldenProject((raw) => {
      raw.items[0].files = [{ path: "references/Guide.pdf", bytes: encode("%PDF-1.4 first") }];
      raw.items[1].files.push({ path: "references/guide.pdf", bytes: encode("%PDF-1.4 second") });
    });
    const built = await teamsPackage(project);
    const pdfs = [...built.entries.keys()].filter((name) => name.toLowerCase() === "guide.pdf");
    assert.deepEqual(pdfs, ["Guide.pdf"]);
    assert.equal(entryFor(built.result.report, "guide.pdf").note, "Left out from the skill Record Finder, because another file in the package is already named guide.pdf. To include it, rename one of the two files.");
  });

  test("the message after the download names the files the package leaves out", async () => {
    const one = await teamsPackage(skillProject({
      files: [
        { path: "references/notebook.one", bytes: BYTE_SHAPES.onenote },
        { path: "templates/letter.txt", bytes: encode("Dear reader,\n") },
      ],
    }));
    assert.deepEqual(one.result.warnings.slice(0, 2), [
      "The Copilot app package can't include notebook.one, because Copilot doesn't accept that type. The skill and the backup keep it.",
      "The Copilot app package leaves out templates/letter.txt. The Inspect page says why.",
    ]);
    const three = await teamsPackage(skillProject({
      files: ["a", "b", "c"].map((name) => ({ path: "templates/" + name + ".txt", bytes: encode(name + "\n") })),
    }));
    assert.equal(three.result.warnings[0], "The Copilot app package leaves out 3 files, such as templates/a.txt. The Inspect page says why.");
  });

  test("a type Copilot refuses is reported as left out, as before", () => {
    const project = skillProject({ files: [{ path: "references/notebook.one", bytes: BYTE_SHAPES.onenote }] });
    const entries = report(project, "teamsZip");
    assert.deepEqual(entries.filter((entry) => entry.component === "notebook.one").map((entry) => [entry.status, entry.note]), [["unsupported", "Left out, because Copilot doesn't accept this type of file."]]);
  });
});

describe("double square brackets in a Copilot download", () => {
  test("the schema refuses [[ in an example question, which is why the download blocks it", async () => {
    const built = await teamsPackage(goldenProject(() => {}));
    const raw = JSON.parse(JSON.stringify(built.agent));
    raw.conversation_starters = [{ text: "Link this note to [[Daily log]]" }];
    assert.notDeepEqual(schemaErrors(raw), []);
    raw.conversation_starters = [{ text: "Link this note to Daily log" }];
    assert.deepEqual(schemaErrors(raw), []);
  });

  test("each field with [[ or ]] gets its own blocked entry, and the Copilot downloads are refused", async () => {
    const project = goldenProject((raw) => {
      raw.items[0].name = "Daily [[log]] helper";
      raw.items[0].description = "Links notes such as Daily log]].";
      raw.items[0].starters = ["Link this note to [[Daily log]]", "What is new?", "Open [[Weekly]]"];
      raw.items[0].instructions = "[[Start]] here and help with notes.";
    });
    for (const exportId of ["teamsZip", "copilotSkills"]) {
      const blocked = report(project, exportId).filter((entry) => entry.status === "blocked").map((entry) => entry.component);
      assert.deepEqual(blocked.filter((name) => ["Name", "Description", "Example questions", "Instructions"].includes(name)), ["Name", "Description", "Example questions", "Instructions"], exportId);
    }
    const starters = entryFor(report(project, "teamsZip"), "Example questions");
    assert.equal(starters.note, "Microsoft 365 refuses the package when an example question has [[ or ]]. 2 questions have them. Remove the double brackets, such as writing Daily log instead of [[Daily log]].");
    await assert.rejects(engine.exports.teamsPackage(project, project.items[0], teamsIcons()));
    assert.ok(!report(project, "claude").some((entry) => entry.status === "blocked"), "other products take double brackets");
  });

  test("instructions may hold [[ and ]] in the middle, and the skill in the Copilot app with skills uses its own instructions", () => {
    const middle = goldenProject((raw) => {
      raw.items[0].instructions = "Link each note to [[Daily log]] when asked.";
    });
    assert.ok(!report(middle, "teamsZip").some((entry) => entry.status === "blocked"));
    const skill = skillProject({ body: "[[Start]] by reading the notes." });
    assert.ok(!report(skill, "copilotSkills").some((entry) => entry.component === "Instructions"));
    assert.equal(entryFor(report(skill, "teamsZip"), "Instructions").status, "blocked");
  });
});
