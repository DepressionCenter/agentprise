// This file is part of Agentprise
// tests/library-author-search.test.mjs
// Author(s): Agentprise contributors.
// Created: 2026-10-23
// Last Modified: 2026-10-28
// Summary: Tests that the library search matches an entry by its author,
//          as well as by its name, summary, tags, kind and requirements.
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./load-engine.mjs";

const engine = loadEngine();
await engine.ready;

const entry = {
  name: "Grant Writer",
  summary: "Drafts grant sections.",
  tags: ["writing"],
  kind: "agent",
  requires: "",
  author: "Dana Reyes",
};

test("an entry is found by its author", () => {
  assert.equal(engine.libraryEntryMatches(entry, "dana"), true);
  assert.equal(engine.libraryEntryMatches(entry, "reyes"), true);
});

test("an entry is still found by its name and tags", () => {
  assert.equal(engine.libraryEntryMatches(entry, "grant"), true);
  assert.equal(engine.libraryEntryMatches(entry, "writing"), true);
});

test("an entry with no author is found by its other fields only", () => {
  const anonymous = { ...entry, author: undefined };
  assert.equal(engine.libraryEntryMatches(anonymous, "grant"), true);
  assert.equal(engine.libraryEntryMatches(anonymous, "reyes"), false);
});

test("an entry matching neither its author nor its other fields is left out", () => {
  assert.equal(engine.libraryEntryMatches(entry, "pubmed"), false);
});
