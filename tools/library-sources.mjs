// This file is part of Agentprise
// tools/library-sources.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-11-10
// Last Modified: 2026-11-11
// Summary: Safety checks for the Library source folders under library/sources/.
//          Lists the files the Library build may publish without following
//          symbolic links or hard links, and finds text files and JSON values
//          that hold control characters.
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

// Library source folders come from contributors, so every path and every byte
// is untrusted. A symbolic link could make the build publish a file from
// outside the folder, such as .git/config, and a control character such as a
// backspace or a terminal escape code can hide text from a reviewer.

import { readdirSync, lstatSync, realpathSync, readFileSync } from "node:fs";
import { join, sep, extname } from "node:path";

// ### Configuration ###

// File types read as bytes when their contents are not text. Every other file
// must be UTF-8 text with no control characters, so an unknown type fails the
// check instead of skipping it. A file of these types whose bytes are UTF-8
// text is checked too, because the app keeps a text file under scripts/ as a
// script whatever its name, such as scripts/run.png.
const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".docx", ".pptx", ".xlsx", ".doc", ".ppt", ".xls", ".one", ".onepart", ".zip"]);

// C0 control characters except tab and line feed, plus DEL and the C1 range,
// which holds the single-character terminal escape U+009B. Text is checked
// with this after the carriage return of a Windows line ending is removed,
// because a carriage return on its own makes a terminal print the rest of the
// line over the start of it.
const LINE_CONTROL_CHARACTER = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

// Every C0 control character, DEL, and the C1 range. A name printed in a
// message shows each of these as a code, so a tab, line feed, or carriage
// return in a file name or JSON name cannot change how the message looks.
const NAME_CONTROL_CHARACTER = /[\u0000-\u001F\u007F-\u009F]/g;

// ### Helpers ###

/** Joins words as "a", "a and b", or "a, b, and c". */
function joinWords(words) {
  if (words.length <= 2) {
    return words.join(" and ");
  }
  return words.slice(0, -1).join(", ") + ", and " + words[words.length - 1];
}

/** Writes a code such as U+001B for one character. */
function characterCode(character) {
  return "U+" + character.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
}

/** A name safe to print in a terminal, with each control character shown as a code such as <U+001B>. */
function printable(name) {
  return name.replace(NAME_CONTROL_CHARACTER, (character) => "<" + characterCode(character) + ">");
}

/** Whether bytes are UTF-8 with no NUL byte, the same test the app uses to keep a file as text. */
function isUtf8Text(bytes) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    return false;
  }
  return bytes.indexOf(0) < 0;
}

/**
 * The distinct codes of the control characters in `text` other than tab, line
 * feed, and a carriage return that comes right before a line feed.
 */
function standaloneControlCodes(text) {
  return controlCodes(text.replace(/\r\n/g, "\n"), LINE_CONTROL_CHARACTER);
}

/** The words that say which control characters a piece of text holds and what to do, such as "holds the control character U+001B, ... Remove it." */
function controlCharacterSentence(codes) {
  const what = codes.length === 1 ? "the control character " : "the control characters ";
  return "holds " + what + joinWords(codes) + ", which can hide text from a reviewer. Remove " + (codes.length === 1 ? "it." : "them.");
}

/** The distinct codes, such as U+001B, of the characters in `text` that match `pattern`, in order of first use. */
function controlCodes(text, pattern) {
  return [...new Set(text.match(pattern) || [])].map(characterCode);
}

/** Whether a path inside `root` stays inside it once every link is resolved. */
function staysInside(fullPath, realRoot) {
  return realpathSync(fullPath).startsWith(realRoot + sep);
}

// ### Public Interface ###

/**
 * Whether the Library build checks a source file as text. A file is text
 * unless its extension is a binary type, such as .png, and its bytes are not
 * UTF-8 text. A real picture is skipped, but a script saved as
 * scripts/run.png is checked.
 * @param {string} path the file's path or name
 * @param {Uint8Array} [bytes] the file's contents; without them, a binary type counts as binary
 * @returns {boolean}
 */
export function isTextSource(path, bytes) {
  if (!BINARY_EXTENSIONS.has(extname(path).toLowerCase())) {
    return true;
  }
  return bytes instanceof Uint8Array && isUtf8Text(bytes);
}

/**
 * Lists every regular file under a folder without following symbolic links.
 * Each symbolic link (including a Windows junction), each special file such
 * as a pipe, each hard link, and each file whose real location is outside
 * `root` adds a line to `problems` and is left out of the list. A hard link
 * is refused because it can share its contents with a file anywhere on the
 * same disk, and a git checkout never makes one.
 * @param {string} folder the folder to list
 * @param {string} label how messages name the folder, such as "library/sources/items/demo"
 * @param {string[]} problems receives one plain sentence per refused path
 * @param {string} [root] the folder every file must stay inside; defaults to `folder`
 * @returns {string[]} paths relative to `folder`, with forward slashes, sorted
 * @throws {Error} when `folder` or `root` cannot be read
 */
export function listSourceFiles(folder, label, problems, root = folder) {
  const realRoot = realpathSync(root);
  const found = [];
  const walk = (dir, relativeDir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const relativePath = relativeDir ? relativeDir + "/" + name : name;
      const shown = printable(label + "/" + relativePath);
      const info = lstatSync(full);
      if (printable(name) !== name) {
        problems.push(shown + " has a control character in its name. Rename it.");
      } else if (info.isSymbolicLink()) {
        problems.push(shown + " is a symbolic link. Replace it with a copy of the file or folder it points to, or remove it.");
      } else if (info.isDirectory()) {
        walk(full, relativePath);
      } else if (!info.isFile()) {
        problems.push(shown + " is not a regular file or folder. Remove it.");
      } else if (info.nlink > 1) {
        problems.push(shown + " is a hard link. Replace it with a copy of the file.");
      } else if (!staysInside(full, realRoot)) {
        problems.push(shown + " is stored outside " + printable(label) + ". Move the file into the folder.");
      } else {
        found.push(relativePath);
      }
    }
  };
  walk(folder, "");
  return found.sort();
}

/**
 * Checks one text file for bytes that are not UTF-8 and for control
 * characters other than tab, line feed, and a carriage return that comes
 * right before a line feed.
 * @param {string} label how messages name the file, such as "library/sources/items/demo/SKILL.md"
 * @param {Uint8Array} bytes the file's contents
 * @returns {string[]} one plain sentence per problem; empty when the file is clean
 */
export function textSourceProblems(label, bytes) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    return [printable(label) + " is not UTF-8 text. Save it as UTF-8 text, or remove it."];
  }
  const problems = [];
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    // Every line but the last ended at a line feed, so a carriage return at its end belongs to a Windows line ending.
    const body = index < lines.length - 1 && line.endsWith("\r") ? line.slice(0, -1) : line;
    const codes = controlCodes(body, LINE_CONTROL_CHARACTER);
    if (codes.length > 0) {
      problems.push(printable(label) + ", line " + (index + 1) + ", " + controlCharacterSentence(codes));
    }
  });
  return problems;
}

/**
 * Checks every name and string value in parsed JSON for control characters
 * other than tab, line feed, and a carriage return that comes right before a
 * line feed. JSON can write a control character as an escape such as \u001b
 * or \r, which the check of the file's bytes cannot see, and the app decodes
 * the escape when it reads the file.
 * @param {string} label how messages name the file, such as "library/sources/entries/demo.json"
 * @param {*} value the parsed JSON
 * @returns {string[]} one plain sentence per name or value with a problem, naming its place, such as project.description
 */
export function jsonValueProblems(label, value) {
  const problems = [];
  const visit = (node, place) => {
    if (typeof node === "string") {
      const codes = standaloneControlCodes(node);
      if (codes.length > 0) {
        problems.push(printable(label) + ", " + (place || "the whole file") + ", " + controlCharacterSentence(codes));
      }
    } else if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, place + "[" + index + "]"));
    } else if (node !== null && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        const childPlace = (place ? place + "." : "") + printable(key);
        const keyCodes = standaloneControlCodes(key);
        if (keyCodes.length > 0) {
          problems.push(printable(label) + ", the name " + childPlace + ", " + controlCharacterSentence(keyCodes));
        }
        visit(child, childPlace);
      }
    }
  };
  visit(value, "");
  return problems;
}

/**
 * Checks that a folder in the repository is the real folder, and that
 * neither it nor any folder above it inside the repository is a link. A link
 * there would make every file in another folder count as inside.
 * @param {string} repoRoot the repository's root folder
 * @param {string} relativeFolder the folder to check, with forward slashes, such as "library/sources"
 * @returns {string[]} one plain sentence when the folder is reached through a link; empty otherwise
 * @throws {Error} when the folder cannot be read
 */
export function linkedFolderProblems(repoRoot, relativeFolder) {
  const parts = relativeFolder.split("/");
  if (realpathSync(join(repoRoot, ...parts)) === join(realpathSync(repoRoot), ...parts)) {
    return [];
  }
  return [printable(relativeFolder) + ", or a folder above it, is a link to another folder. Replace the link with the real folder."];
}

/**
 * Checks one text file and, for a .json file that parses, every name and
 * string value in it. Shared by the source check and the check of each
 * built backup.
 * @param {string} label how messages name the file
 * @param {string} path the file's path or name, used for its extension
 * @param {Uint8Array} bytes the file's contents
 * @returns {string[]} one plain sentence per problem; empty when the file is clean
 */
function textFileProblems(label, path, bytes) {
  const problems = textSourceProblems(label, bytes);
  if (problems.length > 0 || extname(path).toLowerCase() !== ".json") {
    return problems;
  }
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8").decode(bytes));
  } catch (error) {
    return problems;
  }
  return jsonValueProblems(label, parsed);
}

/**
 * Checks each file in a backup that `isTextSource` counts as text, so a
 * control character that reached the app in a form the source check cannot
 * see, such as an escape the app decodes, never reaches the Library.
 * @param {string} zipName the backup's file name, such as pubmed-search.zip
 * @param {{name: string, bytes: Uint8Array}[]} entries the backup's files
 * @returns {string[]} one plain sentence per problem, naming the backup and the file; empty when every file is clean
 */
export function builtFileProblems(zipName, entries) {
  const problems = [];
  for (const file of entries) {
    if (isTextSource(file.name, file.bytes)) {
      problems.push(...textFileProblems(zipName + ", " + file.name, file.name, file.bytes));
    }
  }
  return problems;
}

/**
 * Checks a whole source folder: refuses symbolic links, hard links, and
 * special files, checks every file `isTextSource` counts as text with
 * `textSourceProblems`, and
 * checks every .json file that parses with `jsonValueProblems`. A .json file
 * that does not parse is left to the build, which reports it.
 * @param {string} folder the folder to check, such as library/sources
 * @param {string} label how messages name the folder, such as "library/sources"
 * @returns {{problems: string[], textFiles: string[]}} the problems found and the text files checked, relative to `folder`
 * @throws {Error} when the folder cannot be read
 */
export function checkSourceFolder(folder, label) {
  const problems = [];
  const files = listSourceFiles(folder, label, problems);
  const textFiles = [];
  for (const path of files) {
    const bytes = new Uint8Array(readFileSync(join(folder, ...path.split("/"))));
    if (isTextSource(path, bytes)) {
      textFiles.push(path);
      problems.push(...textFileProblems(label + "/" + path, path, bytes));
    }
  }
  return { problems: problems, textFiles: textFiles };
}
