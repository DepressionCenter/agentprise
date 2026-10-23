// This file is part of Agentprise
// tests/schema-validator.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-10-22
// Summary: Self-tests for the JSON Schema subset validator used by the export
//          tests: each supported keyword accepts and rejects what it should,
//          unknown keywords throw, and every pinned schema uses only supported
//          keywords.
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
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validate, loadSchema, unsupportedKeywords } from "./schema-validator.mjs";
import { repoRoot } from "./load-engine.mjs";

const ok = (schema, value) => assert.deepEqual(validate(schema, value), [], JSON.stringify(value));
const bad = (schema, value) => assert.ok(validate(schema, value).length > 0, "expected an error for " + JSON.stringify(value));

// The pinned files and the hashes SOURCES.md records for them.
const PINNED = {
  "agent-plugins/plugin.schema.json": "0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883",
  "agent-plugins/mcp.schema.json": "6539175bfcdf43085855183e86da40ea94b166547a72b47ae9a0a390516d3acb",
  "copilot/declarative-agent-v1.8.schema.json": "57b0f6784fbff614f249597ed7720775adff88a75f60989f93539d3221a97035",
  "copilot/declarative-agent-v1.9.schema.json": "102abde77894ed0d30c5e097a1b17181a16527865fdcd2f824e2578799abd3a5",
  "copilot/plugin-v2.4.schema.json": "ea3016aa4917e1b714454a6a7be9444f8aa7a1923cba0a42343a6fd234a0eb00",
  "teams/manifest-v1.28.schema.json": "cce967bb1c77641634ce30353f2a699c44cf245e695d2c7a34bb8be771877c3d",
  "teams/manifest-v1.29.schema.json": "53e860fd650fd03fe587379d92af6c91374e791f041ce3f26c92d5e74aeafa0b",
};
const NATIVE_MICROSOFT_SCHEMAS = new Set(["copilot/declarative-agent-v1.9.schema.json", "teams/manifest-v1.29.schema.json"]);

describe("schema validator keywords", () => {
  test("type, including lists of types and integer", () => {
    ok({ type: "string" }, "a");
    bad({ type: "string" }, 1);
    ok({ type: "integer" }, 3);
    bad({ type: "integer" }, 3.5);
    ok({ type: "number" }, 3);
    ok({ type: ["string", "null"] }, null);
    bad({ type: ["string", "null"] }, false);
    ok({ type: "array" }, []);
    bad({ type: "object" }, []);
    bad({ type: "object" }, null);
  });

  test("enum and const compare JSON values deeply", () => {
    ok({ enum: ["a", { b: 1 }] }, { b: 1 });
    bad({ enum: ["a", "b"] }, "c");
    ok({ const: { x: [1, 2] } }, { x: [1, 2] });
    bad({ const: "x" }, "y");
  });

  test("strings: lengths count code points, and patterns are JavaScript regular expressions", () => {
    ok({ maxLength: 2 }, "\u{1F600}\u{1F600}");
    bad({ maxLength: 1 }, "ab");
    bad({ minLength: 2 }, "a");
    ok({ pattern: "^[a-z]+$" }, "abc");
    bad({ pattern: "^[a-z]+$" }, "abC");
    // Lookbehind, as the declarative agent instructions pattern uses.
    ok({ pattern: "^(?<!x)a" }, "a");
    // Non-strings ignore string keywords.
    ok({ maxLength: 1 }, 12345);
  });

  test("numbers: minimum and maximum are inclusive", () => {
    ok({ minimum: 1, maximum: 3 }, 3);
    bad({ minimum: 1 }, 0);
    bad({ maximum: 3 }, 4);
  });

  test("arrays: items, minItems, maxItems, uniqueItems", () => {
    ok({ items: { type: "string" }, minItems: 1, maxItems: 2 }, ["a"]);
    bad({ items: { type: "string" } }, ["a", 1]);
    bad({ minItems: 1 }, []);
    bad({ maxItems: 1 }, [1, 2]);
    bad({ uniqueItems: true }, [{ a: 1, b: 2 }, { b: 2, a: 1 }]);
    ok({ uniqueItems: true }, [1, "1"]);
    assert.throws(() => validate({ items: [{ type: "string" }] }, ["a"]), /tuple/);
  });

  test("objects: properties, required, additionalProperties, patternProperties, propertyNames, minProperties, dependencies", () => {
    const schema = { properties: { a: { type: "string" } }, required: ["a"], additionalProperties: false, patternProperties: { "^x-": {} } };
    ok(schema, { a: "1", "x-extra": 5 });
    bad(schema, { a: "1", b: 2 });
    bad(schema, {});
    bad(schema, { a: 1 });
    ok({ additionalProperties: { type: "number" } }, { any: 1 });
    bad({ additionalProperties: { type: "number" } }, { any: "1" });
    ok({ propertyNames: { enum: ["a", "b"] } }, { a: 1 });
    bad({ propertyNames: { enum: ["a", "b"] } }, { c: 1 });
    bad({ propertyNames: { pattern: "^[a-z]+$" } }, { A: 1 });
    bad({ minProperties: 1 }, {});
    bad({ dependencies: { a: ["b"] } }, { a: 1 });
    ok({ dependencies: { a: ["b"] } }, { a: 1, b: 2 });
    bad({ dependencies: { a: { required: ["c"] } } }, { a: 1 });
    ok({ dependencies: { a: { required: ["c"] } } }, { b: 1 });
  });

  test("combinations: allOf, anyOf, oneOf, not, if/then/else", () => {
    bad({ allOf: [{ type: "string" }, { minLength: 2 }] }, "a");
    ok({ anyOf: [{ type: "string" }, { type: "number" }] }, 1);
    bad({ anyOf: [{ type: "string" }, { type: "number" }] }, null);
    bad({ oneOf: [{ type: "number" }, { type: "integer" }] }, 1);
    ok({ oneOf: [{ type: "number" }, { type: "integer" }] }, 1.5);
    bad({ not: { type: "string" } }, "a");
    const conditional = { if: { properties: { type: { const: "Vault" } } }, then: { required: ["reference_id"] }, else: { not: { required: ["reference_id"] } } };
    bad(conditional, { type: "Vault" });
    ok(conditional, { type: "Vault", reference_id: "x" });
    ok(conditional, { type: "None" });
    bad(conditional, { type: "None", reference_id: "x" });
  });

  test("$ref follows local pointers into $defs and definitions, and refuses others", () => {
    const schema = { $defs: { name: { type: "string" }, group: { inner: { type: "number" } } }, definitions: { n: { $ref: "#/$defs/name" } }, properties: { a: { $ref: "#/definitions/n" }, b: { $ref: "#/$defs/group/inner" } } };
    ok(schema, { a: "x", b: 1 });
    bad(schema, { a: 1 });
    bad(schema, { b: "x" });
    assert.throws(() => validate({ $ref: "#/$defs/missing" }, 1), /Unresolvable/);
    assert.throws(() => validate({ $ref: "other.json#/x" }, 1), /Unsupported \$ref/);
  });

  test("boolean schemas, annotations, and format are accepted; format is not checked", () => {
    ok(true, 1);
    bad(false, 1);
    ok({ $schema: "x", $id: "y", $comment: "c", title: "t", description: "d", default: 1, format: "uri" }, "not a uri");
  });

  test("an unknown keyword throws, so an unchecked rule can never pass silently", () => {
    assert.throws(() => validate({ multipleOf: 2 }, 3), /Unsupported JSON Schema keyword "multipleOf"/);
    assert.throws(() => validate({ properties: { a: { contains: {} } } }, { a: [] }), /"contains"/);
    assert.deepEqual(unsupportedKeywords({ $defs: { x: { exclusiveMinimum: 1 } } }), ["exclusiveMinimum at /$defs/x"]);
  });
});

describe("pinned schemas", () => {
  for (const [path, hash] of Object.entries(PINNED)) {
    test(path + " is the recorded download and uses only supported keywords", () => {
      const bytes = readFileSync(join(repoRoot, "tests", "schemas", path));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
      assert.deepEqual(unsupportedKeywords(loadSchema(path)), []);
    });
  }

  test("SOURCES.md lists every pinned file with its hash and download date", () => {
    const sources = readFileSync(join(repoRoot, "tests", "schemas", "SOURCES.md"), "utf8").replace(/\r\n/g, "\n");
    assert.ok(sources.startsWith("<!--\nThis file is part of Agentprise\n"));
    for (const [path, hash] of Object.entries(PINNED)) {
      const row = sources.split("\n").find((line) => line.startsWith("| `" + path + "`"));
      assert.ok(row, path + " has a row");
      const date = NATIVE_MICROSOFT_SCHEMAS.has(path) ? "2026-10-22" : "2026-10-10";
      assert.ok(row.includes(hash) && row.includes(date) && row.includes("https://"), path);
    }
  });

  test("the pinned schemas reject obviously wrong documents", () => {
    bad(loadSchema("agent-plugins/plugin.schema.json"), { name: "Bad Name", version: "1.0.0" });
    bad(loadSchema("agent-plugins/mcp.schema.json"), { mcpServers: { x: { type: "streamable-http" } } });
    bad(loadSchema("copilot/plugin-v2.4.schema.json"), { schema_version: "v2.4" });
    bad(loadSchema("copilot/declarative-agent-v1.8.schema.json"), { version: "v1.8", name: "x" });
    bad(loadSchema("copilot/declarative-agent-v1.9.schema.json"), { version: "v1.9", name: "x" });
    bad(loadSchema("teams/manifest-v1.28.schema.json"), { manifestVersion: "1.28", extra: true });
    bad(loadSchema("teams/manifest-v1.29.schema.json"), { manifestVersion: "1.29", extra: true });
  });
});
