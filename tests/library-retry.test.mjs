// This file is part of Agentprise
// tests/library-retry.test.mjs
// Author(s): Jay.
// Created: 2026-10-30
// Last Modified: 2026-11-05
// Summary: Tests that a failed Library catalog load can be retried. Uses the
//          real ensureLibrary source taken from index.html, with a stubbed
//          catalog fetch that fails once and then succeeds.
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
import { repoRoot } from "./load-engine.mjs";

const page = readFileSync(join(repoRoot, "index.html"), "utf8");

// The loader is not exposed on the engine namespace, so its source is cut out of the page.
// Markers are the start of ensureLibrary and the start of renderLibrary.
const LOADER_START = "let libraryLoading = null;";
const LOADER_END = "async function renderLibrary()";

describe("library retry markup", () => {
  test("has a hidden Try again button beside the Library status", () => {
    assert.match(
      page,
      /<button[^>]*id="library-retry"[^>]*hidden[^>]*>\s*Try again\s*<\/button>/,
      "Library Try again button is missing from index.html"
    );
  });

  test("wires the Try again button to renderLibrary", () => {
    assert.match(
      page,
      /\$\("library-retry"\)\.addEventListener\("click", function \(\) \{ renderLibrary\(\); \}\);/,
      "Try again button click handler is missing"
    );
  });
});

describe("library catalog retry", () => {
  test("a call after a failed load requests the catalog again and loads it", async () => {
    const loaderStart = page.indexOf(LOADER_START);
    const loaderEnd = page.indexOf(LOADER_END);
    assert.ok(loaderStart !== -1 && loaderEnd > loaderStart, "Could not find ensureLibrary in index.html");

    // The first request fails (null) and the second returns one catalog line.
    let catalogRequests = 0;
    const catalogResponses = [null, [{ file: "Example.zip", name: "Example" }]];
    const sandbox = {
      ui: { catalog: [], catalogOk: false },
      loadLibraryEntries: async function () {},
      fetchCatalog: async function () {
        catalogRequests += 1;
        return catalogResponses.shift() ?? null;
      },
      result: null
    };
    vm.runInNewContext(page.slice(loaderStart, loaderEnd) + "\nresult = { first: ensureLibrary, again: ensureLibrary };", sandbox);

    await sandbox.result.first();
    assert.equal(sandbox.ui.catalogOk, false, "the first load should fail");
    await sandbox.result.again();

    assert.equal(catalogRequests, 2, "expected 2 catalog requests, got " + catalogRequests);
    assert.equal(sandbox.ui.catalogOk, true, "the retried catalog should load");
    assert.equal(sandbox.ui.catalog.length, 1);
  });

  test("overlapping calls share one pending request", async () => {
    const loaderStart = page.indexOf(LOADER_START);
    const loaderEnd = page.indexOf(LOADER_END);

    let catalogRequests = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const sandbox = {
      ui: { catalog: [], catalogOk: false },
      loadLibraryEntries: async function () {},
      fetchCatalog: async function () {
        catalogRequests += 1;
        await gate;
        return [];
      },
      result: null
    };
    vm.runInNewContext(page.slice(loaderStart, loaderEnd) + "\nresult = { ensure: ensureLibrary };", sandbox);

    const first = sandbox.result.ensure();
    const second = sandbox.result.ensure();
    release();
    await Promise.all([first, second]);

    assert.equal(catalogRequests, 1, "overlapping calls should send one request, got " + catalogRequests);
  });
});
