// This file is part of Agentprise
// tests/schema-validator.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-10-10
// Summary: A small JSON Schema validator for the tests. It supports exactly the
//          keywords used by the pinned schemas in tests/schemas/ and throws on
//          any other keyword, so a schema feature it does not check can never
//          pass silently. The page never loads it.
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
import { join } from "node:path";
import { repoRoot } from "./load-engine.mjs";

// Keywords that only describe a schema and never affect validation. "format" is
// deliberately ignored: the pinned schemas use it for uri and email hints that
// vendors do not enforce consistently.
const ANNOTATIONS = new Set(["$schema", "$id", "$comment", "title", "description", "default", "format", "examples", "deprecated", "markdownDescription"]);

// Keywords this validator checks. Anything not here or in ANNOTATIONS throws.
const CHECKED = new Set([
  "$ref", "$defs", "definitions",
  "type", "enum", "const",
  "properties", "required", "additionalProperties", "patternProperties", "propertyNames", "minProperties", "dependencies",
  "items", "minItems", "maxItems", "uniqueItems",
  "pattern", "minLength", "maxLength",
  "minimum", "maximum",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
]);

const regexCache = new Map();

/** Compiles a schema pattern as a JavaScript RegExp, adding the "u" flag only when the plain form fails. */
function compilePattern(pattern) {
  if (regexCache.has(pattern)) {
    return regexCache.get(pattern);
  }
  let regex;
  try {
    regex = new RegExp(pattern);
  } catch {
    regex = new RegExp(pattern, "u");
  }
  regexCache.set(pattern, regex);
  return regex;
}

/** The JSON type name of a value, with "integer" reported separately from "number". */
function jsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value, type) {
  const actual = jsonType(value);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
}

/** A stable text form of a JSON value with sorted keys, for equality checks. */
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function equal(a, b) {
  return canonical(a) === canonical(b);
}

/** Resolves a local JSON pointer such as "#/$defs/runtime" against the root schema. */
function resolveRef(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#")) {
    throw new Error("Unsupported $ref (only local \"#/...\" pointers are supported): " + ref);
  }
  if (ref === "#") return root;
  if (!ref.startsWith("#/")) {
    throw new Error("Unsupported $ref (anchors are not supported): " + ref);
  }
  let node = root;
  for (const raw of ref.slice(2).split("/")) {
    const key = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
    if (node === null || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, key)) {
      throw new Error("Unresolvable $ref: " + ref);
    }
    node = node[key];
  }
  return node;
}

/**
 * Validates a value against a schema node and returns every error found.
 * @param {object} root the whole schema, for $ref
 * @param {object|boolean} schema the node to apply
 * @param {*} value the instance
 * @param {string} path JSON pointer of the instance, for messages
 * @returns {Array<{path: string, message: string}>}
 */
function check(root, schema, value, path) {
  if (schema === true) return [];
  if (schema === false) return [{ path, message: "no value is allowed here" }];
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("Schema node at " + path + " is not an object or boolean");
  }
  for (const key of Object.keys(schema)) {
    if (!CHECKED.has(key) && !ANNOTATIONS.has(key)) {
      throw new Error("Unsupported JSON Schema keyword \"" + key + "\" (instance path " + (path || "/") + ")");
    }
  }
  const errors = [];
  const fail = (message, at = path) => errors.push({ path: at || "/", message });

  // ### Reference ###
  if ("$ref" in schema) {
    errors.push(...check(root, resolveRef(root, schema.$ref), value, path));
  }

  // ### Type and fixed values ###
  if ("type" in schema) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      fail("expected type " + types.join(" or ") + ", got " + jsonType(value));
      return errors;
    }
  }
  if ("enum" in schema && !schema.enum.some((option) => equal(option, value))) {
    fail("value " + JSON.stringify(value) + " is not one of " + JSON.stringify(schema.enum));
  }
  if ("const" in schema && !equal(schema.const, value)) {
    fail("value must equal " + JSON.stringify(schema.const));
  }

  // ### Strings ###
  if (typeof value === "string") {
    const length = [...value].length;
    if ("minLength" in schema && length < schema.minLength) fail("string is shorter than " + schema.minLength);
    if ("maxLength" in schema && length > schema.maxLength) fail("string is longer than " + schema.maxLength + " (" + length + ")");
    if ("pattern" in schema && !compilePattern(schema.pattern).test(value)) fail("string does not match " + schema.pattern);
  }

  // ### Numbers ###
  if (typeof value === "number") {
    if ("minimum" in schema && value < schema.minimum) fail("number is below " + schema.minimum);
    if ("maximum" in schema && value > schema.maximum) fail("number is above " + schema.maximum);
  }

  // ### Arrays ###
  if (Array.isArray(value)) {
    if ("minItems" in schema && value.length < schema.minItems) fail("array has fewer than " + schema.minItems + " items");
    if ("maxItems" in schema && value.length > schema.maxItems) fail("array has more than " + schema.maxItems + " items");
    if (schema.uniqueItems === true) {
      const seen = new Set();
      value.forEach((entry, index) => {
        const key = canonical(entry);
        if (seen.has(key)) fail("array items are not unique (index " + index + ")");
        seen.add(key);
      });
    }
    if ("items" in schema) {
      if (Array.isArray(schema.items)) {
        throw new Error("Unsupported tuple form of \"items\" at " + (path || "/"));
      }
      value.forEach((entry, index) => errors.push(...check(root, schema.items, entry, path + "/" + index)));
    }
  }

  // ### Objects ###
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if ("minProperties" in schema && keys.length < schema.minProperties) fail("object has fewer than " + schema.minProperties + " properties");
    for (const name of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) fail("missing required property \"" + name + "\"");
    }
    // Draft-04 dependencies: a list names properties that must also be present; a schema must also hold.
    for (const [name, rule] of Object.entries(schema.dependencies || {})) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) continue;
      if (Array.isArray(rule)) {
        for (const other of rule) {
          if (!Object.prototype.hasOwnProperty.call(value, other)) fail("property \"" + name + "\" requires \"" + other + "\"");
        }
      } else {
        errors.push(...check(root, rule, value, path));
      }
    }
    const properties = schema.properties || {};
    const patterns = Object.entries(schema.patternProperties || {}).map(([pattern, sub]) => [compilePattern(pattern), sub]);
    for (const key of keys) {
      const at = path + "/" + key.replace(/~/g, "~0").replace(/\//g, "~1");
      let matched = false;
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        matched = true;
        errors.push(...check(root, properties[key], value[key], at));
      }
      for (const [regex, sub] of patterns) {
        if (regex.test(key)) {
          matched = true;
          errors.push(...check(root, sub, value[key], at));
        }
      }
      if (!matched && "additionalProperties" in schema) {
        if (schema.additionalProperties === false) {
          fail("property \"" + key + "\" is not allowed", at);
        } else {
          errors.push(...check(root, schema.additionalProperties, value[key], at));
        }
      }
      if ("propertyNames" in schema) {
        for (const problem of check(root, schema.propertyNames, key, at)) {
          fail("property name \"" + key + "\": " + problem.message, at);
        }
      }
    }
  }

  // ### Combinations ###
  for (const sub of schema.allOf || []) {
    errors.push(...check(root, sub, value, path));
  }
  if ("anyOf" in schema && !schema.anyOf.some((sub) => check(root, sub, value, path).length === 0)) {
    fail("value matches none of the anyOf options");
  }
  if ("oneOf" in schema) {
    const passing = schema.oneOf.filter((sub) => check(root, sub, value, path).length === 0).length;
    if (passing !== 1) fail("value matches " + passing + " of the oneOf options, not exactly one");
  }
  if ("not" in schema && check(root, schema.not, value, path).length === 0) {
    fail("value matches a schema it must not match");
  }
  if ("if" in schema) {
    if (check(root, schema.if, value, path).length === 0) {
      if ("then" in schema) errors.push(...check(root, schema.then, value, path));
    } else if ("else" in schema) {
      errors.push(...check(root, schema.else, value, path));
    }
  }
  return errors;
}

/**
 * Validates a JSON value against a schema.
 * @param {object} schema a JSON Schema using only the supported keywords
 * @param {*} value the parsed JSON instance
 * @returns {Array<{path: string, message: string}>} empty when valid
 * @throws {Error} when the schema uses an unsupported keyword or an unresolvable $ref
 */
export function validate(schema, value) {
  return check(schema, schema, value, "");
}

// Keywords whose value is one schema, a list of schemas, or a map of schemas.
const SINGLE_SCHEMA = ["additionalProperties", "propertyNames", "items", "not", "if", "then", "else"];
const SCHEMA_LIST = ["allOf", "anyOf", "oneOf"];
const SCHEMA_MAP = ["properties", "patternProperties"];
const DEFINITION_MAP = ["$defs", "definitions"];

/**
 * Walks every schema node, including definitions nothing references, and
 * returns the keywords this validator does not support.
 * @param {object} schema
 * @returns {string[]} "keyword at /pointer" entries; empty when fully supported
 */
export function unsupportedKeywords(schema) {
  const found = [];
  const visit = (node, at) => {
    if (typeof node === "boolean") return;
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      found.push("non-schema value at " + at);
      return;
    }
    for (const [key, sub] of Object.entries(node)) {
      if (!CHECKED.has(key) && !ANNOTATIONS.has(key)) found.push(key + " at " + (at || "/"));
      if (SINGLE_SCHEMA.includes(key)) {
        if (Array.isArray(sub)) found.push("tuple " + key + " at " + (at || "/"));
        else visit(sub, at + "/" + key);
      } else if (SCHEMA_LIST.includes(key)) {
        sub.forEach((entry, index) => visit(entry, at + "/" + key + "/" + index));
      } else if (SCHEMA_MAP.includes(key)) {
        for (const [name, entry] of Object.entries(sub)) visit(entry, at + "/" + key + "/" + name);
      } else if (DEFINITION_MAP.includes(key)) {
        for (const [name, entry] of Object.entries(sub)) visitDefinition(entry, at + "/" + key + "/" + name);
      } else if (key === "dependencies") {
        for (const [name, rule] of Object.entries(sub)) {
          if (!Array.isArray(rule)) visit(rule, at + "/dependencies/" + name);
        }
      }
    }
  };
  // A definitions entry is a schema, or a folder of schemas when none of its keys is a keyword
  // (the declarative agent schema groups its capability schemas under $defs/capabilities).
  const visitDefinition = (node, at) => {
    const isFolder = node !== null && typeof node === "object" && !Array.isArray(node)
      && Object.keys(node).length > 0
      && Object.keys(node).every((key) => !CHECKED.has(key) && !ANNOTATIONS.has(key))
      && Object.values(node).every((entry) => entry !== null && typeof entry === "object" && !Array.isArray(entry));
    if (isFolder) {
      for (const [name, entry] of Object.entries(node)) visitDefinition(entry, at + "/" + name);
    } else {
      visit(node, at);
    }
  };
  visit(schema, "");
  return found;
}

/**
 * Loads a pinned schema from tests/schemas/.
 * @param {string} relativePath for example "copilot/plugin-v2.4.schema.json"
 * @returns {object}
 */
export function loadSchema(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, "tests", "schemas", relativePath), "utf8"));
}

/** Formats validation errors one per line, for assertion messages. */
export function describeErrors(errors) {
  return errors.map((error) => error.path + ": " + error.message).join("\n");
}
