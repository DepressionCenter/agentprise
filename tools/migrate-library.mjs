// This file is part of Agentprise
// tools/migrate-library.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-10-10
// Summary: One-time maintainer script that converts each version 1 Agentprise
//          bundle in library/ into the version 2 project backup, checks that
//          every field survives, and adds the version 2 fields to the catalog.
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

// Usage, from the repository root:
//   node tools/migrate-library.mjs           convert every version 1 bundle
//   node tools/migrate-library.mjs --check   report what would change, write nothing
//
// The app reads only version 2 backups, so this script carries the one piece
// of version 1 knowledge needed: a version 1 bundle is one Agent Skill folder
// whose SKILL.md frontmatter metadata holds every agent field as flat strings.
// A bundle that is already a version 2 backup is left alone, so a second run
// changes nothing.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { loadEngine, repoRoot } from "../tests/load-engine.mjs";
import { makeDeflatedZip } from "../tests/helpers.mjs";

// ### Load Configuration ###
const engine = loadEngine();
const checkOnly = process.argv.includes("--check");
const libraryDir = join(repoRoot, "library");
const catalogPath = join(libraryDir, "catalog.json");
// Version 1 metadata keys that version 2 no longer writes to the frontmatter.
// The rest, with the copilot-, sharepoint-, and creator- prefixes, keep the
// names in the engine's META constant.
const V1_KEYS = { displayName: "display-name", welcome: "welcome", starters: "starters", copyright: "copyright" };
// The agent fields every download is built from, compared before and after.
const COMPARED_FIELDS = ["name", "description", "welcome", "instructions", "starters", "icon", "sharepointLinks", "sharepointItems", "files", "copilot", "creator", "copyright", "license"];

// ### Read Version 1 Bundles ###

/**
 * Reads a version 1 bundle into a normalized agent, the way the version 1
 * importer did: SKILL.md at the root or in one folder, the shortest path
 * winning, with the icon and references/ files beside it.
 * @param {Uint8Array} bytes the bundle
 * @returns {Promise<object>} the normalized agent
 */
async function readVersion1Bundle(bytes) {
  const entries = await engine.zip.read(bytes);
  const skillPath = Array.from(entries.keys())
    .filter((name) => name === "SKILL.md" || name.endsWith("/SKILL.md"))
    .sort((a, b) => a.length - b.length)[0];
  if (!skillPath) {
    throw new Error("no SKILL.md inside");
  }
  const folder = skillPath.slice(0, skillPath.length - "SKILL.md".length);
  const parsed = engine.yaml.parseFrontmatter(engine.bytes.toText(entries.get(skillPath)));
  if (parsed.warnings.length > 0) {
    throw new Error("frontmatter warnings: " + parsed.warnings.join(" "));
  }
  const data = parsed.data;
  const meta = data.metadata || {};
  const M = engine.META;
  const lines = (value) => (typeof value === "string" && value ? value.split("\n") : []);
  const json = (value) => (typeof value === "string" && value ? JSON.parse(value) : []);
  const license = String(data.license || "").replace(/\.\s+See LICENSE\.txt\.?$/, "");
  const files = [];
  entries.forEach((fileBytes, name) => {
    const prefix = folder + "references/";
    if (name.startsWith(prefix) && name.length > prefix.length && !name.slice(prefix.length).includes("/")) {
      files.push({ name: name.slice(prefix.length), bytes: fileBytes });
    }
  });
  const icon = entries.get(folder + "icon.png");
  const raw = {
    name: meta[V1_KEYS.displayName],
    description: data.description,
    instructions: parsed.body.replace(/^\n+/, "").replace(/\s+$/, ""),
    welcome: meta[V1_KEYS.welcome],
    starters: lines(meta[V1_KEYS.starters]),
    sharepointLinks: lines(meta[M.sharepoint]),
    sharepointItems: json(meta[M.sharepointItems]),
    files: files,
    icon: icon ? { bytes: icon, mime: "image/png" } : null,
    copilot: {
      webSearch: meta[M.webSearch],
      webSites: lines(meta[M.webSites]),
      sharepoint: meta[M.sharepointSwitch],
      teamsMessages: meta[M.teamsMessages],
      teamsLinks: lines(meta[M.teamsLinks]),
      email: meta[M.email],
      mailboxes: lines(meta[M.mailboxes]),
      sharedMailbox: meta[M.sharedMailbox],
      emailFolders: lines(meta[M.emailFolders]),
      meetings: meta[M.meetings],
      meetingItems: json(meta[M.meetingItems]),
      codeInterpreter: meta[M.codeInterpreter],
      imageGeneration: meta[M.imageGeneration],
      preferMyFiles: meta[M.preferMyFiles],
      responseMode: meta[M.responseMode],
      appId: meta[M.appId]
    },
    creator: { name: meta[M.creatorName], website: meta[M.creatorWebsite], privacy: meta[M.creatorPrivacy], terms: meta[M.creatorTerms] },
    copyright: meta[V1_KEYS.copyright],
    license: license
  };
  const result = engine.normalizeAgent(raw);
  if (result.notices.length > 0) {
    throw new Error("the agent did not normalize cleanly: " + result.notices.join(" "));
  }
  return result.agent;
}

/** The fields compared before and after, with bytes as plain arrays so deep equality reads them. */
function comparable(agent) {
  const out = {};
  for (const key of COMPARED_FIELDS) {
    out[key] = agent[key];
  }
  out.icon = agent.icon ? Array.from(agent.icon.bytes) : null;
  out.files = agent.files.map((file) => ({ name: file.name, bytes: Array.from(file.bytes) }));
  return JSON.parse(JSON.stringify(out));
}

// ### Convert Each Entry ###
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
let converted = 0;
let skipped = 0;
for (const entry of catalog.agents) {
  const path = join(libraryDir, entry.file);
  const bytes = new Uint8Array(readFileSync(path));
  if (engine.detectFormat(entry.file, bytes) === "plugin") {
    skipped += 1;
    console.log("already version 2: " + entry.file);
    continue;
  }
  const agent = await readVersion1Bundle(bytes);
  const wrapped = engine.project.fromAgent(agent);
  if (wrapped.notices.length > 0) {
    throw new Error(entry.file + ": " + wrapped.notices.join(" "));
  }
  const backup = await engine.exports.backup(wrapped.project);
  // The app writes stored ZIPs; library files are compressed, because the
  // Library page fetches every entry to show its picture.
  const packed = makeDeflatedZip(backup.entries);

  // ### Validate the Conversion ###
  // The new backup must open cleanly and give every download the same fields.
  const reopened = await engine.imports.any(entry.file, packed);
  if (reopened.error || reopened.notices.length > 0) {
    throw new Error(entry.file + ": the converted backup did not reopen cleanly: " + (reopened.error || reopened.notices.join(" ")));
  }
  const project = reopened.project;
  if (project.items.length !== 1 || project.items[0].kind !== "agent") {
    throw new Error(entry.file + ": the converted backup should hold exactly one assistant");
  }
  const view = engine.project.agentView(project, project.items[0]);
  if (!isDeepStrictEqual(comparable(view), comparable(agent))) {
    throw new Error(entry.file + ": a field changed during conversion");
  }
  if (!checkOnly) {
    writeFileSync(path, packed);
  }
  converted += 1;
  console.log((checkOnly ? "would convert: " : "converted: ") + entry.file + " (" + bytes.length + " to " + packed.length + " bytes)");
}

// ### Save Results ###
// Catalog entries gain kind and capabilities. Every version 1 entry is a
// single assistant with no tools.
let catalogChanged = false;
catalog.agents = catalog.agents.map((entry) => {
  if (entry.kind && Array.isArray(entry.capabilities)) {
    return entry;
  }
  catalogChanged = true;
  const next = {};
  for (const [key, value] of Object.entries(entry)) {
    next[key] = value;
    if (key === "summary") {
      next.kind = entry.kind || "agent";
      next.capabilities = Array.isArray(entry.capabilities) ? entry.capabilities : [];
    }
  }
  return next;
});
if (catalogChanged && !checkOnly) {
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
}
console.log((checkOnly ? "Check only. " : "") + converted + " converted, " + skipped + " already version 2" + (catalogChanged ? ", catalog " + (checkOnly ? "would be " : "") + "updated." : ", catalog unchanged."));
