// This file is part of Agentprise
// tests/library-retry.test.mjs
// Author(s): Jay.
// Created: 2026-10-30
// Last Modified: 2026-11-10
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
const RENDER_START = "async function renderLibrary()";
const RENDER_END = "\nfunction stripTile(entry)";

function loadRenderLibrary(sandbox) {
  const renderStart = page.indexOf(RENDER_START);
  const renderEnd = page.indexOf(RENDER_END, renderStart);
  assert.ok(renderStart !== -1 && renderEnd > renderStart, "Could not find renderLibrary in index.html");
  vm.runInNewContext(page.slice(renderStart, renderEnd) + "\nresult = renderLibrary;", sandbox);
  return sandbox.result;
}

function renderLibrarySandbox(catalogOk) {
  const document = { activeElement: null };
  const retry = { disabled: false, hidden: true, focus() { document.activeElement = this; } };
  const heading = { focus() { document.activeElement = this; } };
  const search = { value: "", focus() { document.activeElement = this; } };
  const elements = {
    "library-list": { appendChild() {} },
    "library-status": { textContent: "" },
    "library-retry": retry,
    "library-heading": heading,
    "library-search": search,
    "library-clear": { hidden: false },
  };
  document.activeElement = retry;
  const sandbox = {
    document,
    ui: { catalog: [], catalogOk },
    libraryLoading: null,
    $: (id) => elements[id],
    setText: (element, text) => { element.textContent = text; },
    ensureLibrary: async () => {},
    libraryAvailable: () => true,
    renderLibraryFilters() {},
    matchesLibraryFilter: () => true,
    libraryEntryMatchesQuery: () => true,
    clearChildren() {},
    storeCard: (entry) => entry,
    setTimeout,
    STATUS_REPEAT_MS: 0,
  };
  return { sandbox, elements, renderLibrary: loadRenderLibrary(sandbox) };
}

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

  test("restores focus to Try again when the catalog load fails", async () => {
    const { sandbox, elements, renderLibrary } = renderLibrarySandbox(false);
    await renderLibrary();

    assert.equal(elements["library-retry"].hidden, false);
    assert.equal(sandbox.document.activeElement, elements["library-retry"]);
  });

  test("moves focus to the Library heading when the retry succeeds", async () => {
    const { sandbox, elements, renderLibrary } = renderLibrarySandbox(true);
    await renderLibrary();

    assert.equal(elements["library-retry"].hidden, true);
    assert.equal(sandbox.document.activeElement, elements["library-heading"]);
  });
});
