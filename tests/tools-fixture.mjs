// This file is part of Agentprise
// tests/tools-fixture.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-10
// Last Modified: 2026-10-10
// Summary: A fixed synthetic project for the tools tests and golden export
//          files: an assistant that uses one skill, and a skill with one tool
//          per provider kind, with fixed ids and timestamps so every export is
//          byte-stable. All names, addresses, and ids are made up.
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

import { makePng } from "./helpers.mjs";

const encode = (text) => new TextEncoder().encode(text);

// Fixed ids so exports never change between runs.
export const IDS = Object.freeze({
  project: "10000000-0000-4000-8000-000000000001",
  agent: "20000000-0000-4000-8000-000000000002",
  skill: "30000000-0000-4000-8000-000000000003",
  agentAppId: "40000000-0000-4000-8000-000000000004",
});

// A small OpenAPI description naming both operations the openapi provider uses.
export const OPENAPI_TEXT = [
  "openapi: 3.0.3",
  "info:",
  "  title: Example records API",
  "  version: 1.0.0",
  "servers:",
  "  - url: https://api.example.org/v1",
  "paths:",
  "  /records:",
  "    get:",
  "      operationId: searchRecords",
  "      summary: Search records by keyword.",
  "      responses:",
  "        \"200\":",
  "          description: Matching records.",
  "  /records/{id}:",
  "    get:",
  "      operationId: getRecord",
  "      summary: Get one record.",
  "      parameters:",
  "        - name: id",
  "          in: path",
  "          required: true",
  "          schema:",
  "            type: string",
  "      responses:",
  "        \"200\":",
  "          description: One record.",
  "",
].join("\n");

// A script whose only network address is the example API host, so setup steps can name it.
export const SCRIPT_TEXT = [
  "import json, sys, urllib.request",
  "BASE = \"https://api.example.org/v1/records\"",
  "print(json.dumps(json.load(urllib.request.urlopen(BASE + \"?q=\" + sys.argv[1]))))",
  "",
].join("\n");

/** One capability per provider kind, every provider under "*" so each target sees the same list. */
export function goldenCapabilities() {
  return [
    {
      id: "records.connector", label: "Record connector", description: "Looks up records through a connector.", required: false,
      fallback: "Explain that no record connector is connected and offer to help write the request instead.",
      providers: { "*": [{ kind: "connector", name: "Example Records", instructions: "Search with the record title." }] },
    },
    {
      id: "records.server", label: "Record server", description: "Searches records on a tool server.", required: false,
      fallback: "Say that no record server is connected.",
      providers: {
        "*": [
          { kind: "mcp", server: "remote", tools: [], instructions: "Ask the server for its tools first." },
          { kind: "mcp", server: "pinned", tools: ["search", "fetch"], instructions: "Use search, then fetch." },
          { kind: "mcp", server: "local", tools: [], instructions: "Use the local helper." },
        ],
      },
    },
    {
      id: "records.api", label: "Record API", description: "Calls the records API.", required: false,
      fallback: "Say that the records API is not connected.",
      providers: { "*": [{ kind: "openapi", spec: "openapi/records.yaml", operations: ["searchRecords", "getRecord"], auth: "none", instructions: "Call searchRecords first." }] },
    },
    {
      id: "records.script", label: "Record script", description: "Runs the lookup script.", required: false,
      fallback: "Say that the script cannot run here.",
      providers: { "*": [{ kind: "script", path: "scripts/lookup.py", runtime: "python3", instructions: "Run python3 scripts/lookup.py with the search words." }] },
    },
    {
      id: "records.web", label: "Record web search", description: "Finds record pages on the web.", required: false,
      fallback: "Say that web search is off.",
      providers: { "*": [{ kind: "websearch", sites: ["https://records.example.org"], instructions: "Treat results as discovery, not a finished search." }] },
    },
    {
      id: "records.manual", label: "Manual check", description: "Checks a record by hand.", required: false,
      fallback: "Ask the person to paste the record.",
      providers: { "*": [{ kind: "none" }] },
    },
  ];
}

/**
 * The raw golden project. Callers pass it to engine.project.normalize.
 * @returns {object}
 */
export function goldenRaw() {
  return {
    id: IDS.project,
    name: "Golden Kit",
    description: "A fixed project for export tests.",
    version: "1.2.3",
    creator: { name: "Example Creator", organization: "Example Org", url: "https://example.org", privacy: "https://example.org/privacy", terms: "https://example.org/terms" },
    copyright: "Copyright (C) 2026 Example Creator",
    license: "GPL-3.0-or-later",
    created: "2026-10-10T00:00:00.000Z",
    modified: "2026-10-10T00:00:00.000Z",
    servers: {
      remote: { label: "Example search server", transport: "http", url: "https://mcp.example.org/mcp", auth: "none", tools: [] },
      pinned: { label: "Pinned tools server", transport: "http", url: "https://tools.example.org/mcp", auth: "oauth", tools: ["search", "fetch"] },
      local: { label: "Local helper server", transport: "stdio", command: "npx", args: ["-y", "example-mcp-server"], auth: "none", tools: [] },
    },
    items: [
      {
        kind: "agent",
        id: IDS.agent,
        name: "Golden Scout",
        description: "Finds records and explains them.",
        instructions: "# Purpose\nHelp people find records and explain what they say.\n\n# Rules\n- Name the tool behind every result.",
        starters: ["Find a record about sleep.", "Explain this record."],
        welcome: "Ask me to find a record.",
        icon: { bytes: makePng(192, 192), mime: "image/png" },
        copilot: { webSearch: false, appId: IDS.agentAppId },
        uses: ["record-finder"],
        capabilities: [],
        files: [],
      },
      {
        kind: "skill",
        id: IDS.skill,
        name: "Record Finder",
        description: "Find and read records. Use when someone asks for a record.",
        compatibility: "Works everywhere for planning; live lookups need one of the tools.",
        body: "# Steps\n1. Clarify the question.\n2. Use a tool from the list below when one is available.",
        license: "",
        capabilities: goldenCapabilities(),
        files: [
          { path: "openapi/records.yaml", bytes: encode(OPENAPI_TEXT) },
          { path: "scripts/lookup.py", bytes: encode(SCRIPT_TEXT) },
          { path: "references/guide.md", bytes: encode("# Guide\n\nRead the record title first.\n") },
        ],
      },
    ],
  };
}

/** Teams icons of the sizes the package needs. */
export function teamsIcons() {
  return { color: makePng(192, 192), outline: makePng(32, 32, [255, 255, 255, 255]) };
}
