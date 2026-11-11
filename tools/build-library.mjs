// This file is part of Agentprise
// tools/build-library.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-11-10
// Summary: Maintainer script that builds Library backups from the readable
//          source folders under library/sources/ and updates their catalog
//          lines, so Library content can be reviewed as plain files.
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
//   node tools/build-library.mjs           build every entry in library/sources/entries/
//   node tools/build-library.mjs --check   fail if a committed ZIP or catalog line differs from its source
//
// Each entry file names the item folders it holds and the project fields
// that are not part of any item. Item folders live once under
// library/sources/items/, so a skill listed on its own and inside a project
// is built from the same files and cannot drift. Builds are deterministic:
// ids and timestamps come from the sources and ZIP entries carry no dates,
// so --check can compare bytes.
//
// Both commands first check every file under library/sources/ and stop, naming
// each problem, when library/sources/ is reached through a link, or a source
// is a symbolic link, a hard link, a file that is not a regular file, a text
// file that is not UTF-8, or a text file or JSON value with control
// characters. Each built ZIP is checked for control characters again before
// it is written.

import { readFileSync, writeFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { loadEngine, repoRoot } from "../tests/load-engine.mjs";
import { makeDeflatedZip } from "../tests/helpers.mjs";
import { listSourceFiles, checkSourceFolder, linkedFolderProblems, builtFileProblems } from "./library-sources.mjs";

// ### Load Configuration ###
const engine = loadEngine();
await engine.ready;
const checkOnly = process.argv.includes("--check");
const libraryDir = join(repoRoot, "library");
const sourcesDir = join(libraryDir, "sources");
const itemsDir = join(sourcesDir, "items");
const entriesDir = join(sourcesDir, "entries");
const catalogPath = join(libraryDir, "catalog.json");
// Catalog fields in the order the catalog writes them.
const CATALOG_KEYS = ["file", "name", "summary", "kind", "capabilities", "requires", "tags", "author", "license"];
// The rule the page applies to a catalog file name, so an entry cannot write outside library/.
const ENTRY_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}\.zip$/;

// ### Read Sources ###

/** The path of a file under the repository, with forward slashes, for messages. */
function shownPath(full) {
  return relative(repoRoot, full).split(sep).join("/");
}

/**
 * Lists the files in one item folder, with paths relative to it and forward
 * slashes. Stops the build when the folder holds a symbolic link, a hard
 * link, a special file, or a file stored outside the items folder.
 */
function listFiles(folder) {
  const problems = [];
  const files = listSourceFiles(folder, shownPath(folder), problems, itemsDir);
  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }
  return files;
}

/**
 * Builds one entry: reads its item folders as a skill archive, applies the
 * project fields, and writes the backup the Library serves.
 * @param {object} entry the parsed entry file
 * @returns {Promise<Uint8Array>} the ZIP bytes
 */
async function buildEntry(entry) {
  // The folders are read as a plugin whose manifest already holds the
  // project record, so tools can find the servers the entry declares.
  const archive = new Map();
  const record = Object.assign({}, entry.project, { items: entry.items.map((skillName) => ({ skillName: skillName })) });
  const manifest = { "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "entry", extensions: { [engine.AGENTPRISE_EXTENSION_KEY]: record } };
  archive.set("entry/plugin.json", new TextEncoder().encode(JSON.stringify(manifest)));
  for (const itemName of entry.items) {
    const folder = join(itemsDir, itemName);
    if (!existsSync(folder)) {
      throw new Error(entry.file + ": no item folder " + relative(repoRoot, folder));
    }
    // An item name such as "../../.git" would read files from outside the items folder.
    if (dirname(realpathSync(folder)) !== realpathSync(itemsDir)) {
      throw new Error(entry.file + ": the item " + JSON.stringify(itemName) + " is not a folder directly inside " + shownPath(itemsDir) + ". Use the folder name, such as pubmed-search.");
    }
    for (const path of listFiles(folder)) {
      archive.set("entry/skills/" + itemName + "/" + path, new Uint8Array(readFileSync(join(folder, ...path.split("/")))));
    }
  }
  const read = engine.imports.plugin(archive);
  if (read.error) {
    throw new Error(entry.file + ": " + read.error);
  }
  if (read.notices.length > 0) {
    throw new Error(entry.file + ": the item folders did not read cleanly: " + read.notices.join(" "));
  }
  if (read.project.unrecognized.length > 0) {
    throw new Error(entry.file + ": these files are not ones the app uses: " + read.project.unrecognized.map((file) => file.path).join(", "));
  }
  const backup = await engine.exports.backup(read.project);
  const problems = builtFileProblems(entry.file, backup.entries);
  if (problems.length > 0) {
    throw new Error("The built file " + entry.file + " would hold control characters. Find this text in the entry file or its item folders, and remove the control characters:\n" + problems.join("\n"));
  }
  return makeDeflatedZip(backup.entries);
}

/** The catalog line for an entry, in the catalog's key order. */
function catalogLine(entry) {
  const line = {};
  for (const key of CATALOG_KEYS) {
    if (key === "file") {
      line.file = entry.file;
    } else if (entry.catalog[key] !== undefined) {
      line[key] = entry.catalog[key];
    }
  }
  return line;
}

// ### Check Sources ###
const sourceProblems = linkedFolderProblems(repoRoot, "library/sources");
if (sourceProblems.length === 0) {
  sourceProblems.push(...checkSourceFolder(sourcesDir, shownPath(sourcesDir)).problems);
}
if (sourceProblems.length > 0) {
  console.error("The Library build stopped because of these problems in the source folders. Fix each one, then run the build again.\n" + sourceProblems.join("\n"));
  process.exit(1);
}

// ### Build Each Entry ###
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const problems = [];
let built = 0;
for (const fileName of readdirSync(entriesDir).filter((name) => name.endsWith(".json")).sort()) {
  const entry = JSON.parse(readFileSync(join(entriesDir, fileName), "utf8"));
  if (typeof entry.file !== "string" || !ENTRY_FILE_NAME.test(entry.file)) {
    console.error(fileName + ": the file name " + JSON.stringify(entry.file) + " must be a plain name ending in .zip, such as pubmed-search.zip. Fix it, then run the build again.");
    process.exit(1);
  }
  const bytes = await buildEntry(entry);
  const target = join(libraryDir, entry.file);
  const line = catalogLine(entry);
  const index = catalog.agents.findIndex((existing) => existing.file === entry.file);
  if (checkOnly) {
    if (!existsSync(target) || !Buffer.from(readFileSync(target)).equals(Buffer.from(bytes))) {
      problems.push(entry.file + " differs from its sources. Run node tools/build-library.mjs.");
    }
    if (index < 0 || !isDeepStrictEqual(catalog.agents[index], line)) {
      problems.push(entry.file + " has a catalog line that differs from its entry file.");
    }
    continue;
  }
  writeFileSync(target, bytes);
  if (index < 0) {
    catalog.agents.push(line);
  } else {
    catalog.agents[index] = line;
  }
  built += 1;
  console.log("built: " + entry.file + " (" + bytes.length + " bytes) from " + relative(repoRoot, join(entriesDir, fileName)).split(sep).join("/"));
}

// ### Save Results ###
if (checkOnly) {
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("Every built Library entry matches its sources.");
} else {
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
  console.log(built + " entries built; catalog updated.");
}
