// This file is part of Agentprise
// tests/library-author-search.test.mjs
// Author(s): Agentprise contributors.
// Created: 2026-10-23
// Last Modified: 2026-10-23
// Summary: Checks that Library search matches each entry's author, ignores
//          capital letters, handles entries without an author, combines with
//          the kind and tag filters, and that the search box label says people
//          can search by author. The app is a single page with no bundler, so
//          the check runs the page script in a Node vm context with a small
//          stub DOM and a synthetic catalog, then calls renderLibrary itself.
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

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { readEngineSource } from "./load-engine.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(repoRoot, "index.html"), "utf8");

// Synthetic entries only. Authors and names here are invented for the test.
const CATALOG = {
  agents: [
    {
      file: "chart-helper.zip",
      name: "Chart Helper",
      summary: "Draws charts from a table",
      tags: ["data", "plots"],
      kind: "skill",
      requires: "",
      capabilities: [],
      author: "Gabriel Mongefranco",
      license: "GPL-3.0-or-later"
    },
    {
      file: "plain-note.zip",
      name: "Plain Note",
      summary: "A short note",
      tags: ["notes", "data"],
      kind: "agent",
      requires: "",
      capabilities: []
    },
    {
      file: "review-project.zip",
      name: "Review Project",
      summary: "Checks drafts",
      tags: ["writing"],
      kind: "project",
      requires: "",
      capabilities: [],
      author: "Ada Lovelace",
      license: "GPL-3.0-or-later"
    }
  ]
};

/**
 * A stand-in for any DOM value the page touches but the tests do not inspect:
 * calls and property reads return another stand-in, so drawing code runs and does nothing.
 */
function stand_in() {
  const target = function () {};
  return new Proxy(target, {
    get(_, property) {
      if (property === "then" || typeof property === "symbol") {
        return undefined;
      }
      if (property === "toString" || property === "valueOf") {
        return () => "";
      }
      return stand_in();
    },
    apply() {
      return stand_in();
    }
  });
}

/** A minimal element: real children, text, and attributes; anything else is a stand-in. */
function createNode(tagName, text) {
  const node = {
    tagName,
    attributes: {},
    children: [],
    textContent: text || "",
    value: "",
    hidden: false,
    className: "",
    get firstChild() {
      return node.children[0] || null;
    },
    appendChild(child) {
      node.children.push(child);
      return child;
    },
    removeChild(child) {
      node.children.splice(node.children.indexOf(child), 1);
      return child;
    },
    setAttribute(name, value) {
      node.attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.hasOwn(node.attributes, name) ? node.attributes[name] : null;
    },
    addEventListener() {}
  };
  return new Proxy(node, {
    get(target, property) {
      return property in target ? target[property] : stand_in();
    }
  });
}

/** All text under a node, in document order. */
function textOf(node) {
  return node.textContent + node.children.map(textOf).join("");
}

/** Loads the page script with a stub DOM and the synthetic catalog. */
function loadPage() {
  const elements = new Map();
  const document = {
    readyState: "loading",
    body: createNode("body"),
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createNode("div"));
      }
      return elements.get(id);
    },
    createElement(tagName) {
      return createNode(tagName);
    },
    createTextNode(text) {
      return createNode("#text", text);
    },
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const sandbox = {
    document,
    window: { addEventListener() {} },
    location: { protocol: "http:", hash: "", href: "http://localhost/" },
    console,
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
    URL,
    fetch: async (url) => {
      if (url === "library/catalog.json") {
        return { ok: true, json: async () => structuredClone(CATALOG) };
      }
      return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
    }
  };
  vm.createContext(sandbox);
  // The page starts itself only after DOMContentLoaded, which this stub never fires.
  vm.runInContext(readEngineSource(), sandbox, { filename: "index.html" });
  return { sandbox, elements };
}

/** Matches the page's search rule, extracted from the page source so the test uses the shipped code. */
function loadMatcher() {
  const kinds = html.match(/^const LIBRARY_KINDS = (\{.*\});/m);
  assert.ok(kinds, "LIBRARY_KINDS was not found in index.html");
  const libraryKinds = new Function("return " + kinds[1])();
  const start = html.indexOf("function libraryEntryMatchesQuery(");
  assert.notEqual(start, -1, "libraryEntryMatchesQuery was not found in index.html");
  const close = html.slice(start).match(/^\}\r?$/m);
  assert.ok(close, "libraryEntryMatchesQuery has no closing brace at column 0");
  const source = html.slice(start, start + close.index + close[0].length);
  return new Function("LIBRARY_KINDS", source + "\nreturn libraryEntryMatchesQuery;")(libraryKinds);
}

const matches = loadMatcher();

const withAuthor = {
  name: "Chart Helper",
  summary: "Draws charts from a table",
  tags: ["data", "plots"],
  kind: "skill",
  requires: "",
  author: "Gabriel Mongefranco"
};

const withoutAuthor = {
  name: "Plain Note",
  summary: "A short note",
  tags: ["notes"],
  kind: "agent",
  requires: ""
};

test("Library search finds an entry by its author's full name", () => {
  assert.equal(matches(withAuthor, "gabriel mongefranco"), true);
});

test("Library search finds part of an author's name regardless of capital letters", () => {
  // renderLibrary lowercases the query before calling the matcher.
  assert.equal(matches(withAuthor, "MONGE".toLowerCase()), true);
  assert.equal(matches(withAuthor, "gabriel".toLowerCase()), true);
});

test("Library search does not match an author who is not on the entry", () => {
  assert.equal(matches(withAuthor, "nobody"), false);
});

test("Library search does not match the word undefined on an entry without an author", () => {
  assert.equal(matches(withoutAuthor, "undefined"), false);
});

test("Library search still finds an entry without an author by its name", () => {
  assert.equal(matches(withoutAuthor, "plain note"), true);
});

test("Library search still matches names, tags, summaries, and kinds", () => {
  assert.equal(matches(withAuthor, "chart helper"), true);
  assert.equal(matches(withAuthor, "plots"), true);
  assert.equal(matches(withAuthor, "from a table"), true);
  assert.equal(matches(withAuthor, "skill"), true);
});

describe("renderLibrary with the author-aware search", () => {
  let page;
  let status;
  let list;

  /** Sets the chip and the search text, runs the page's own render, and returns the status and card text. */
  async function show(query, chip = "") {
    page.sandbox.setLibraryTag(chip, false);
    page.sandbox.$("library-search").value = query;
    await page.sandbox.renderLibrary();
    return { status: textOf(status), cards: list.children.map(textOf) };
  }

  before(() => {
    page = loadPage();
    status = page.sandbox.$("library-status");
    list = page.sandbox.$("library-list");
  });

  test("renderLibrary shows only the entry whose author matches", async () => {
    const result = await show("gabriel mongefranco");
    assert.equal(result.status, "1 entry");
    assert.equal(result.cards.length, 1);
    assert.match(result.cards[0], /Chart Helper/);
  });

  test("renderLibrary author search ignores capital letters", async () => {
    const result = await show("MONGE".toLowerCase());
    assert.equal(result.status, "1 entry");
  });

  test("renderLibrary author search with no match says nothing matches", async () => {
    const result = await show("nobody");
    assert.equal(result.status, "Nothing matches.");
    assert.equal(result.cards.length, 0);
  });

  test("renderLibrary does not match the word undefined against an entry with no author", async () => {
    const result = await show("undefined");
    assert.equal(result.status, "Nothing matches.");
  });

  test("renderLibrary finds an entry with no author by its name", async () => {
    const result = await show("plain note");
    assert.equal(result.status, "1 entry");
    assert.match(result.cards[0], /Plain Note/);
  });

  test("renderLibrary author search works with the kind filter", async () => {
    const found = await show("gabriel", "kind:skill");
    assert.equal(found.status, "1 entry");
    const missed = await show("lovelace", "kind:skill");
    assert.equal(missed.status, "Nothing matches.");
  });

  test("renderLibrary author search works with the tag filter", async () => {
    const found = await show("gabriel", "data");
    assert.equal(found.status, "1 entry");
    assert.match(found.cards[0], /Chart Helper/);
    const missed = await show("lovelace", "data");
    assert.equal(missed.status, "Nothing matches.");
  });

  test("renderLibrary with no search and no chip shows every entry", async () => {
    const result = await show("");
    assert.equal(result.status, "3 entries");
  });
});

test("Library search box label says people can search by author", () => {
  const label = html.match(/<label for="library-search"[^>]*>([^<]*)<\/label>/);
  assert.ok(label, "the library-search label was not found in index.html");
  assert.match(label[1], /\bauthor\b/i, "Library search label must say that people can search by author");
});
