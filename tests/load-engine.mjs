// This file is part of Agentprise
// tests/load-engine.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-09
// Summary: Loads the engine script from index.html into a Node vm context so the
//          test suite can call it without a browser.
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

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Returns the text of the single application script inside index.html.
 * The app keeps all JavaScript in one script block so this extraction is exact.
 * @returns {string} JavaScript source
 */
export function readEngineSource() {
  const html = readFileSync(join(repoRoot, "index.html"), "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("index.html has no script block");
  }
  return match[1];
}

/**
 * Evaluates the engine in this realm, wrapped in a function so its top-level
 * declarations stay private, then returns the Agentprise namespace it exposes.
 * There is no document in Node, so the UI startup code in the script does not
 * run. Sharing the realm keeps object prototypes identical to the test's own,
 * which strict deep equality depends on.
 * @returns {object} the Agentprise engine namespace
 */
export function loadEngine() {
  const wrapped = "(function () {" + readEngineSource() + "\n})";
  const factory = vm.runInThisContext(wrapped, { filename: "index.html" });
  factory();
  if (!globalThis.Agentprise) {
    throw new Error("The script did not expose globalThis.Agentprise");
  }
  return globalThis.Agentprise;
}

export { repoRoot };
