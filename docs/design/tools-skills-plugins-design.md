<!--
This file is part of Agentprise
docs/design/tools-skills-plugins-design.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-23
Summary: Design and work plan for extending Agentprise from instruction-only
         agents to projects that carry skills, reference knowledge, and
         external tools (MCP servers, OpenAPI plugins, scripts, connectors),
         with the PubMed Search skill as the first worked example.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Design: tools, skills, and plugins

[Back to project README](../../README.md)

### Summary

This page is for maintainers and for coding agents writing the implementation
plan. It records the decisions made in October 2026 about how Agentprise will
support skills, reference knowledge, and external tools alongside the
instruction-only agents it handles today, and it lays out the data model, the
file layouts, the export rules, the first library content (a PubMed Search skill
and an updated Evidence Scout), and the order of work. Everything here is
planned unless a section says it already exists. Vendor facts carry the date
they were checked and belong in `docs/formats.md` once the work ships.

### Goals and non-goals

Agentprise should let a person describe an assistant once, attach the knowledge
and tools it needs, and download it in the form each product wants, with an
honest report of what each product cannot take. The app stays a single
`index.html` with no server, no sign-in, no build step, and no dependency, as
`skills/project-preferences/SKILL.md` requires. Nothing a person types or
uploads leaves the browser.

These things are out of scope and should not be built:

- EFDC will not host any MCP server, proxy, or API. The repository ships no
  `servers/` folder and no self-hosting guide.
- Agentprise does not run agents, call tools, test connections, or track whether
  a vendor service is up. It is a library and a converter.
- No export target is added until it has a real file to download. Kimi chat,
  Mistral Le Chat, and Copilot Notebooks stay out until a documented file format
  exists for them. OpenClaw, a Kimi Claw run by its owner, and Kimi Code CLI
  read the plain skill and the plugins Agentprise already makes, so they need
  no target of their own.
- Copilot Studio exports are deferred. Copilot Studio moves agents between
  environments as Power Platform solution zips (`solution.xml`, customizations,
  and `botcomponents` records with environment-bound identifiers), exported from
  one Dataverse environment and imported into another. There is no documented
  hand-authored agent file for Studio, and building a valid solution package
  from a static page would mean reimplementing Dataverse solution packaging.
  Most people this app serves also do not have a Studio license or a Power
  Platform environment. Revisit if Microsoft documents a portable agent
  definition for Studio or an import of declarative agent packages into it.
  The Microsoft targets remain the declarative agent app package and the
  SharePoint `.agent` file.

Backward compatibility is not a requirement. Nobody depends on the version 1
bundle or the version 1 draft storage yet, so the new model replaces them. The
existing library zips are converted once by a maintainer-run script and
committed in the new layout. The app does not carry version 1 import code.

### Decisions

Each decision has a number so the implementation plan can cite it.

D1. The internal project model is versioned and independent of every export
format. A project holds items (agents and skills), their files, their
capability declarations, and shared server definitions. Export formats are
written from the model and never define it.

D2. The Agent Plugins 1.0 directory layout is the backup container and one of
the export targets. Project-level data the standard has no field for lives under
`extensions["org.depressioncenter.agentprise"]` in `plugin.json`. Per-item data
lives in an `agentprise.json` file next to each `SKILL.md`, so a skill folder
copied out of a project stays self-contained. That file is the only home for
Agentprise item settings; `SKILL.md` metadata holds just `agentprise-kind`, and
the older `copilot-`, `sharepoint-`, and `creator-` metadata keys are read
only from files written before 2026-10-11.

D3. Capability names and provider mappings are data inside the library entry.
The app code knows only the schema of a capability declaration and the provider
kinds its exporters can write (D7). The app never hard-codes a capability name
such as `pubmed.search`.

D4. Each export emits only the manifests its target documents. The portable
plugin export writes a root `plugin.json`, `mcp.json`, and `skills/`. It does not
also write `.codex-plugin/plugin.json` or `.claude-plugin/plugin.json`. The
Claude plugin export writes `.claude-plugin/plugin.json`, `.mcp.json`, and
`skills/`. Redundant manifests that could disagree are not generated.

D5. Copilot MCP plugins export with dynamic tool discovery by default and
pinned tools only when the provider lists them. OpenAPI providers export as
Copilot API plugins with the specification bundled in the package. A
`websearch` provider exports as the `WebSearch` capability with `sites`, and the
instructions label it as discovery rather than query execution.

D6. Claude has one plugin format across Claude Code, Cowork, and claude.ai, with
a different component set per surface. The Claude plugin export includes remote
servers by https URL and drops stdio servers with a conversion-report entry,
because claude.ai cannot run them.

D7. Provider kinds are a closed list in code: `connector`, `mcp`, `openapi`,
`script`, `websearch`, and `none`. Each kind maps to specific output per target
(see "Provider kinds and what each exporter writes").

D8. ChatGPT gets a plugin export (D4) and a "Project instructions" copy box.
Live PubMed in ChatGPT is not provided. A provider of kind `mcp` may point at a
server marked `userSupplied: true`; the export then carries a placeholder and a
setup step, and the conversion report marks it "requires setup". Custom GPTs
are import-only (D11).

D9. Gemini gets the existing skill zip. Gems are import-only (D11). The setup
text for Gemini says that skills were available to personal Google accounts at
the time of writing and that Google planned work and school accounts later.

D10. Importing executes nothing and contacts nothing. Scripts, hooks, tool
descriptions, and manifests from an imported file are data. Unrecognized files
are kept in the project as unrecognized and written back only into the backup.

D11. Gems and custom GPTs get no importer code and no export. Neither product
has an export file: OpenAI offers no way to download a GPT as a single package,
and its migration turns a GPT's instructions into a skill inside a plugin, while
Google converts Gems into Gemini skills in place. People who want to move a
Gem or a GPT before it retires copy its fields into the existing Create new
form, and a how-to page says so. If a vendor lets a migrated plugin or skill be
downloaded, the regular plugin and skill importers handle it with no special
code. Retirement dates: custom GPTs December 11, 2026;
Gems November 2026 for personal accounts, March 2027 for Workspace, June 2027
for education.

D12. Validation runs offline against schema copies pinned in the repository.
The page never fetches a schema.

D13. Every export shows a conversion report with the statuses preserved,
transformed, requires-setup, unsupported, and blocked. A source scope or tool
restriction that a target cannot represent is blocked, never widened.

D14. Agent items are always-on instructions. Skill items are on-demand. When a
target has no agent concept, an agent becomes a skill whose description starts
with "Persona:". When a target has no skill concept, the skills an agent uses
are appended to its instructions, or attached as reference files if the
instruction limit is reached.

D15. The first tool-enabled library content is a reusable PubMed Search skill
with three modes (query preparation, live search, abstract review), plus an
Evidence Scout agent that uses it. Query preparation must work on every target
with no tool at all.

D16. Reference knowledge is curated, not copied. Each reference file carries its
source, attribution, and review date. The general PubMed syntax guide is checked
line by line against NLM documentation. The EFDC starter-kit search blocks are
an optional reference credited to Judy Smith, Taubman Health Sciences Library.

### Terms

- Workspace: the browser-local collection of projects and preferences.
- Project: one editable unit with a stable id, one or more items, shared server
  definitions, creator details, and a license.
- Item: an agent (always-on persona with instructions and starters) or a skill
  (on-demand instructions following the Agent Skills specification).
- Capability: something an item can do if a tool is available, declared by the
  item with a name, a required flag, fallback text, and providers per target.
- Provider: how a capability is satisfied on one target (D7).
- Server: a named MCP server definition shared by the project's items.
- Target: one product and surface the app can export to.
- Export: the files written for one target from one item or one project.
- Conversion report: the per-export list of what survived, changed, needs
  setup, was dropped, or was blocked (D13).

### Project model, version 2

The model is plain JSON. `normalizeProject` type-checks and length-caps every
field, the way `normalizeAgent` does today, and `normalizeAgent` keeps doing the
per-agent work inside it. Field names below are the names to use in code.

```json
{
  "schemaVersion": 2,
  "id": "a4e1c5f0-2d9b-4f3e-9a1c-6b7d8e9f0a12",
  "name": "Evidence Scout",
  "description": "Find and compare research evidence.",
  "version": "1.0.0",
  "creator": { "name": "First Last", "organization": "", "url": "" },
  "license": "GPL-3.0-or-later",
  "created": "2026-10-10T00:00:00Z",
  "modified": "2026-10-10T00:00:00Z",
  "servers": {
    "pubmed": {
      "label": "PubMed MCP server",
      "transport": "http",
      "url": "",
      "userSupplied": true,
      "auth": "none",
      "tools": []
    }
  },
  "items": [
    { "kind": "agent", "...": "see Agent item" },
    { "kind": "skill", "...": "see Skill item" }
  ],
  "unrecognized": [
    { "path": "hooks/hooks.json", "note": "Not interpreted by Agentprise." }
  ]
}
```

Rules for the project record:

- `id` is a UUID v4 generated once and never changed by import. An import of a
  bundle whose id already exists in the workspace asks whether to replace or
  duplicate.
- `version` is a semantic version string the user can edit. It is written into
  `plugin.json`, `.claude-plugin/plugin.json`, and the Copilot `manifest.json`.
- `servers.<name>.transport` is `http` or `stdio`. `stdio` entries carry
  `command` (one executable token) and `args`. `auth` is `none`, `oauth`, or
  `apikey`, and is informational for setup text only. `tools` is an optional
  list of tool names; a non-empty list means pinned tools on Copilot (D5).
- `userSupplied: true` means the url is empty on purpose and the person
  installing the export must fill it in (D8).
- `unrecognized` entries are paths of files kept from an import that Agentprise
  does not interpret (D10). Their bytes live in the files store.

#### Agent item

```json
{
  "kind": "agent",
  "id": "item-uuid",
  "name": "Evidence Scout",
  "skillName": "evidence-scout",
  "description": "...",
  "instructions": "...",
  "starters": ["..."],
  "welcome": "...",
  "icon": "icon.png",
  "copilot": { "...": "the existing copilot and sharepoint settings, unchanged" },
  "uses": ["pubmed-search"],
  "capabilities": [],
  "files": [{ "path": "references/brief-template.md", "type": "md" }]
}
```

`skillName` is derived from `name` and capped at 64 characters, as today. `uses`
lists skill items in the same project by `skillName`. An agent may declare
capabilities of its own; the ones it inherits come from the skills it uses.

#### Skill item

```json
{
  "kind": "skill",
  "id": "item-uuid",
  "name": "PubMed Search",
  "skillName": "pubmed-search",
  "description": "...",
  "compatibility": "...",
  "body": "The SKILL.md body in Markdown.",
  "license": "GPL-3.0-or-later",
  "capabilities": [{ "...": "see Capability" }],
  "files": [
    { "path": "references/pubmed-syntax-guide.md", "type": "md" },
    { "path": "scripts/pubmed.py", "type": "py" },
    { "path": "openapi/pubmed-eutils.yaml", "type": "yaml" }
  ]
}
```

#### Capability

```json
{
  "id": "pubmed.search",
  "label": "Run a PubMed query",
  "description": "Execute a Boolean PubMed query and return counts, PMIDs, and the query translation.",
  "required": false,
  "fallback": "No PubMed search tool is connected in this setup. Prepare the query, show it, and give the person a link to run it in PubMed. Never say a search was completed.",
  "providers": {
    "claude": [
      { "kind": "connector", "name": "PubMed", "instructions": "..." },
      { "kind": "script", "path": "scripts/pubmed.py", "runtime": "python3", "instructions": "..." }
    ],
    "copilot": [
      { "kind": "openapi", "spec": "openapi/pubmed-eutils.yaml", "operations": ["searchPubMed"], "auth": "none", "instructions": "..." }
    ],
    "chatgpt": [
      { "kind": "mcp", "server": "pubmed", "instructions": "..." }
    ],
    "cli": [
      { "kind": "script", "path": "scripts/pubmed.py", "runtime": "python3", "instructions": "..." }
    ],
    "*": []
  }
}
```

Providers for a target are an ordered list. Lookup uses the target key, then
`"*"`; an empty list means no provider. The exporter writes the manifest or
file for every provider in the list that needs one, and the composed
instructions present them in order, so the agent uses the first one that is
actually available in the conversation. On claude.ai, for example, the PubMed
connector comes first and the bundled script second, because the script only
works when the workspace's code execution allowlist includes the API host.
Capability ids are free-form strings that the entry owns (D3). `required: true`
means an export to a target with no provider is marked "unsupported" for that
item and the export README says the item will not do its main job there.

#### Target keys

The provider map is keyed by target. The keys are a closed list in code because
each exporter looks up its own key: `copilot` (app package and `.agent`),
`claude` (claude.ai skill zip and plugin), `chatgpt` (portable plugin and copy
box), `gemini` (skill zip and Notebook file), `cli` (Claude Code, Codex, Gemini
CLI, Copilot CLI, Cursor, Kimi Code CLI, Mistral Vibe, and any client that reads
`.agents/skills/`), and `*`.

### Provider kinds and what each exporter writes

| Kind | Fields | Copilot app package | `.agent` | Skill zip | Claude plugin | Portable plugin | Copy boxes and Notebook |
|---|---|---|---|---|---|---|---|
| `connector` | `name`, `instructions` | Instructions paragraph only | Instructions paragraph | Instructions paragraph | Instructions paragraph; README names the connector | Instructions paragraph | Instructions paragraph |
| `mcp` | `server`, `instructions`, optional `tools` | `plugin-<server>.json` with a remote MCP runtime; dynamic unless `tools` is set; action entry; auth from server | Unsupported | Instructions paragraph; `compatibility` note | `.mcp.json` entry (http only; stdio dropped with report) | `mcp.json` entry (http and stdio) | Instructions paragraph |
| `openapi` | `spec`, `operations`, `auth`, `instructions` | `plugin-<name>.json` with an OpenApi runtime; spec file copied into the package; action entry | Unsupported | Spec file kept under its path; instructions paragraph | Spec file kept; unsupported as a tool | Spec file kept; unsupported as a tool | Instructions paragraph |
| `script` | `path`, `runtime`, `instructions` | Unsupported; file attached as `name.ext.txt` per existing rule | Unsupported | File kept under `scripts/`; instructions paragraph | File kept; requires-setup on claude.ai (code execution network allowlist) | File kept | Unsupported |
| `websearch` | `sites`, `instructions` | `WebSearch` capability with `sites` (max 4) | `WebSearch` sites if the `.agent` schema allows; else instructions | Instructions paragraph | Instructions paragraph | Instructions paragraph | Instructions paragraph |
| `none` | none | Fallback text | Fallback text | Fallback text | Fallback text | Fallback text | Fallback text |

Where the table says "Instructions paragraph", the exporter inserts the
provider's `instructions` text into the composed instructions (next section)
and writes no manifest. Where it says "Unsupported", the conversion report gets
an unsupported entry and the fallback text is used instead.

### Composed instructions

Every target receives instructions assembled by one function,
`composeInstructions(project, item, targetKey)`, so no vendor-specific prose
lives in the app:

1. The item's own instructions.
2. For an agent on a target without skills (Copilot, `.agent`, copy boxes,
   Notebook): each used skill's body under a heading `## Skill: <name>`. If the
   target's instruction limit would be exceeded, the body is written to
   `references/<skillName>.md` instead and one sentence points to it. The
   Copilot limit is a constant, `COPILOT_INSTRUCTION_LIMIT`, set from the
   declarative agent manifest documentation at implementation time and recorded
   in `docs/formats.md`.
3. A closing section headed `## Tools available in this setup` with one
   paragraph per capability. The paragraph lists the target's providers in
   order, each with its `instructions`, tells the agent to use the first one
   that is available in the conversation, and ends with the capability's
   `fallback` for the case where none is. Providers the target cannot support
   are left out of the paragraph and reported. The section always ends with
   the sentence "Only report a search, lookup, or retrieval as completed when a
   tool returned results in this conversation."

Skill exports (skill zip, Claude plugin, portable plugin) do not inline used
skills, because the target loads them separately. They still get section 3.

### Conversion report

`conversionReport(project, item, targetKey)` returns a list of entries
`{ component, status, note }`. Statuses:

- preserved: written as-is.
- transformed: written in a different form, with the note saying how (for
  example "persona exported as a skill with a Persona: description").
- requires-setup: present but needs a step by the installer (connect a
  connector, fill in a server URL, enable custom app upload).
- unsupported: left out because the target has no place for it.
- blocked: a security restriction the target cannot represent, so the export of
  that component stops rather than widening access (D13).

The report appears in the Inspect tab above the file tree for every download,
and the export's `README.md` repeats it under "What changed in this export".
The existing warnings for the welcome message and copyright line become report
entries.

Blocking rules for the first release: a Copilot source list that limits a
source (web sites, SharePoint links, Teams chats, mailboxes) is blocked on any
target that would turn the switch on with no list; a `websearch` provider with
more than four sites is blocked on Copilot until the person trims the list.

### Project bundle (backup) layout

The backup is an Agent Plugins 1.0 directory zipped, named
`<project-slug>.agentprise.zip`:

```
evidence-scout/
  plugin.json
  mcp.json                       only when servers exist
  LICENSE.txt
  README.md                      includes the conversion report
  skills/
    evidence-scout/
      SKILL.md                   agent written as a skill; metadata agentprise-kind: agent
      agentprise.json
      icon.png
      LICENSE.txt
      references/...
    pubmed-search/
      SKILL.md
      agentprise.json
      LICENSE.txt
      references/...
      scripts/...
      openapi/...
```

`plugin.json` carries `$schema`, `name`, `version`, `description`, `author`,
`repository`, and `extensions["org.depressioncenter.agentprise"]` holding the
project record without item bodies and files. `agentprise.json` next to each
`SKILL.md` holds that item's `kind`, `id`, `uses`, `capabilities`, Copilot
settings, SharePoint links, and publisher details.

The skill zip export for a single item is that item's folder zipped, so the
Gemini and Claude downloads keep the same shape. The app does not read version
1 bundles. A maintainer-run Node script, `tools/migrate-library.mjs`, converts
each zip in `library/` to the version 2 layout once, and the converted zips are
committed together with the updated catalog.

### Workspace storage

- IndexedDB database `agentprise-projects` with object stores `projects`
  (key `id`, value the project record) and `files` (key
  `<projectId>/<itemId>/<path>`, value a Blob plus type).
- localStorage key `agentprise-workspace-v2` holding
  `{ lastOpenedProjectId, recentProjectIds, preferences }`.
- No migration from version 1 storage. On first load the app deletes the
  `agentprise-draft-v1` key and the `agentprise-draft-files` database if they
  exist.
- Workspace page: a project list (name, modified date, item count) with New,
  Open file, From library, Rename, Duplicate, Delete with confirmation, and a
  recent list. Inside a project: the item list, per-item downloads, and the
  project backup. Library previews show the catalog summary and icon before
  anything is loaded.

### Library catalog, version 2

`library/catalog.json` entries gain `kind` (`agent`, `skill`, or `project`),
`capabilities` (list of capability ids for display), and `requires` (one plain
sentence for the card, for example "Optional: a PubMed tool for live search").
A project zip may embed a copy of a skill that is also listed standalone; a test
compares the two copies byte for byte so they cannot drift.

### Targets and exports

| Target | Export | Unit | New in this work |
|---|---|---|---|
| Microsoft 365 Copilot app and Teams | App package `.zip` | One agent item per package | Actions from `mcp` and `openapi` providers; `WebSearch` sites from `websearch`; used skills inlined or attached; conversion report |
| Teams chat | `.agent` | One agent item | Conversion report; tools unsupported |
| Claude (claude.ai) and Gemini | Skill `.zip` | One item | `agentprise.json` sidecar; `compatibility` frontmatter; scripts kept |
| Claude plugin (Claude Code, Cowork, claude.ai) | `.zip` with `.claude-plugin/plugin.json`, `skills/`, `.mcp.json` | Whole project | New export |
| Portable plugin (ChatGPT, Codex, GitHub Copilot, Cursor, any Agent Plugins client) | `.zip` with `plugin.json`, `mcp.json`, `skills/` | Whole project | New export |
| ChatGPT | "Project instructions" copy box | One agent item | Renamed from the GPT copy box; tools paragraph |
| Gemini Notebook | `.md` | One agent item | Unchanged |
| Plain skill | `.skill.zip` | One item | Unchanged; standard fields only |
| Backup | `.agentprise.zip` | Whole project | New layout (D2) |

Every tool-enabled export also contains `SETUP.md` generated from the providers
used: for a connector, the steps to enable it; for a user-supplied server, where
to paste the URL; for Copilot, that custom app upload must be allowed by the
tenant and where the admin finds the setting; for a script, that the client
must allow outbound network access to the API host.

### Importers

Existing importers stay. New ones:

- Project bundle and portable plugin: a zip or folder with a root `plugin.json`.
- Claude plugin: a zip or folder with `.claude-plugin/plugin.json`.
- Codex compatibility layout: `.codex-plugin/plugin.json` with a `skills` path.
- Any zip containing one or more `SKILL.md` files, each becoming a skill item.
  This is also the path for a Gemini skill or a migrated ChatGPT plugin if the
  vendor lets it be downloaded (D11).

Import rules: `plugin.json` extensions other than Agentprise's are kept as
unrecognized; `mcp.json` servers become project servers; `hooks/`, `agents/`,
and `commands/` folders are kept as unrecognized files and never interpreted;
stdio `command` values are stored as text and never executed (D10).

### Validation and tests

- Pinned schema copies under `tests/schemas/` with a `SOURCES.md` listing the
  URL and download date of each: Agent Plugins `plugin.schema.json` and
  `mcp.schema.json` 1.0.0, the declarative agent manifest schema version the
  exporter targets, and the Copilot plugin manifest schema.
- Tests validate exported fixtures against those schemas. Choose one of two
  approaches at implementation time and record the choice in
  `skills/project-preferences/SKILL.md`: add `ajv` as a devDependency used only
  by `tests/`, or write a small subset validator for the fields these schemas
  use. The page itself never loads a validator.
- Agent Skills rules enforced in tests and in `normalizeItem`: skill name
  matches its folder, allowed characters, description at most 1024 characters,
  `compatibility` at most 500 characters.
- Golden files under `tests/fixtures/exports/<target>/` for each provider kind,
  so an exporter change shows exactly which bytes moved.
- Round-trip tests: export a project to the backup, import it, compare the
  normalized records.
- The existing `tests/check-syntax.mjs` ASCII check still applies to
  `index.html`.
- Page size stays under 500 KB. Long content such as the OpenAPI specification
  and the PubMed references live in library zips, not in `index.html`.

### PubMed Search skill

Folder `pubmed-search/`, shipped standalone as `library/pubmed-search.zip` and
embedded in the Evidence Scout project.

```
pubmed-search/
  SKILL.md
  agentprise.json
  LICENSE.txt
  README.md
  references/
    pubmed-syntax-guide.md
    mobile-tech-search-blocks.md
    query-test-cases.md
  scripts/
    pubmed.py
  openapi/
    pubmed-eutils.yaml
```

#### SKILL.md frontmatter

```yaml
---
name: pubmed-search
description: Build, run, and review PubMed literature searches. Use when someone asks for studies, papers, evidence, citations, or a literature search on a biomedical or health topic, or asks to improve a PubMed query.
license: GPL-3.0-or-later
compatibility: Works everywhere for query preparation. Live search needs one of these: the PubMed connector in Claude, the bundled E-utilities API plugin in Microsoft 365 Copilot, an MCP server you supply in ChatGPT, or Python 3 with network access in a coding agent.
metadata:
  agentprise-kind: skill
---
```

#### Modes

The body defines three modes and requires the agent to say which one it is in.

Query preparation works with no tool. The agent clarifies the question,
identifies concept blocks, writes a Boolean string with field tags and MeSH
terms, explains the main choices in two or three sentences, and outputs the
paste-ready query plus a link of the form
`https://pubmed.ncbi.nlm.nih.gov/?term=<url-encoded query>`. The output is
labeled "Prepared search strategy (not executed)". If the person pastes results
back, the agent revises the query.

Live search runs only when a provider returned results in the conversation. The
agent records the exact query sent, the retrieval date, filters, the result
count, the PMIDs returned, and the query translation and warnings the service
reported. The output is labeled "Search completed on <date>". A scoped web
search result is labeled "Web discovery" and is never presented as a completed
PubMed query.

Abstract review runs when abstracts are available from a provider or pasted by
the person. The agent marks each record as metadata-only or abstract-read, draws
conclusions only from abstracts it has read, and says when a claim would need
full-text review. It recommends a librarian review before any search is used
for a systematic review.

#### Capabilities and providers

`agentprise.json` declares four capabilities. Provider text is paraphrased
here; the file carries the full sentences.

| Capability | required | claude | copilot | chatgpt | cli | gemini and `*` |
|---|---|---|---|---|---|---|
| `pubmed.search` | false | connector PubMed, then script `scripts/pubmed.py search` | openapi `searchPubMed` | mcp server `pubmed` (user supplied) | script `scripts/pubmed.py search` | none |
| `pubmed.metadata` | false | connector PubMed, then script `... summary` | openapi `getSummaries` | mcp server `pubmed` | script `... summary` | none |
| `pubmed.abstracts` | false | connector PubMed, then script `... abstract` | openapi `getAbstracts` | mcp server `pubmed` | script `... abstract` | none |
| `pubmed.browse` | false | none | websearch `https://pubmed.ncbi.nlm.nih.gov` | none | none | none |

Fallback text for the first three says that no PubMed tool is connected, that
the agent will prepare the query and link to PubMed, and that it must not claim
a search was completed. `pubmed.browse` is discovery only and its provider
text says so.

On claude.ai the connector is listed first because it works on any plan with
no admin change. The script is second because claude.ai code execution reaches
only the hosts on the workspace allowlist, and the default allowlist does not
include `eutils.ncbi.nlm.nih.gov`. The script's provider text tells the agent
to fall back to query preparation, and to say why, when the network call
fails. `SETUP.md` for Claude says that a workspace owner can add the host to
the allowlist to enable the script.

#### E-utilities facts the script and the OpenAPI specification rely on

- Base URL `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`.
- `esearch.fcgi?db=pubmed&term=<query>&retmode=json&retmax=<n>&sort=relevance`
  returns `esearchresult.count`, `idlist`, `querytranslation`, and
  `warninglist`. Default `retmax` 20, maximum 100.
- `esummary.fcgi?db=pubmed&id=<comma list>&retmode=json` returns one record per
  PMID with title, authors, journal (`source`), `pubdate`, and identifiers.
  Maximum 20 ids per call.
- `efetch.fcgi?db=pubmed&id=<comma list>&rettype=abstract&retmode=text` returns
  plain text, and `retmode=xml` returns XML. EFetch has no JSON output.
- Every request carries `tool=agentprise-pubmed-search` and an `email`
  parameter the installer supplies, as NCBI asks. Without an API key the limit
  is three requests per second per IP; `api_key` raises it to ten. The script
  waits at least 350 milliseconds between calls and reads `NCBI_API_KEY` and
  `NCBI_EMAIL` from the environment.

#### scripts/pubmed.py

Python 3, standard library only (`urllib`, `json`, `argparse`, `time`,
`os`). Subcommands `search`, `summary`, and `abstract`. Every subcommand prints
one JSON object to stdout: `search` prints count, ids, querytranslation, and
warnings; `summary` prints records; `abstract` prints `{pmid: text}` and lists
PMIDs with no abstract separately. Errors go to stderr with a non-zero exit. No
caching, no writes to disk, no other hosts.

#### openapi/pubmed-eutils.yaml

OpenAPI 3.0.3, one server entry for the base URL, three GET operations with
`operationId` values `searchPubMed`, `getSummaries`, and `getAbstracts`, each
with a two-sentence description written for the Copilot orchestrator, the
`db=pubmed` and `tool` parameters fixed as defaults, `retmax` capped at 50, and
`email` as an optional parameter the installer fills in. `getAbstracts` is
declared with `text/plain` content. The Copilot export writes a plugin manifest
with an OpenApi runtime, `auth` of type None, and the three functions.

#### References

`references/pubmed-syntax-guide.md` is a short general guide: Boolean
operators and nesting, quotation marks and truncation, field tags with the NLM
definitions of `[tw]`, `[tiab]`, `[ti]`, `[mh]`, `[majr]`, `[pt]`, `[au]`,
`[ta]`, `[dp]`, and `[affiliation]`, automatic term mapping and when field tags
turn it off, MeSH explosion, common filters, and how to read the query
translation. Each statement is checked against NLM documentation and the file
header records the check date.

`references/mobile-tech-search-blocks.md` carries the PubMed column of the EFDC
Mobile Tech Publication Search Starter Kit: the broad mobile health block, the
device-type blocks, and the domain blocks, with the combining instructions and
the examples. The Dimensions column is left out. The header credits Judy Smith,
Taubman Health Sciences Library, links the article, and records the date the
text was copied. Confirm with the author that the text may ship under the
library's license before the file is added.

`references/query-test-cases.md` holds at least six question-to-query pairs
the skill should reproduce, including "smart rings for sleep" and "mobile
health technology in cardiovascular care" from the starter kit, one case that
adds `"university of michigan"[affiliation]`, one that needs a `[ti]`
narrowing, and one that should trigger the librarian-review recommendation.

### Evidence Scout and the other new entries

Evidence Scout becomes a project bundle with one agent item that uses
`pubmed-search`. Its instructions keep the current brief-writing behavior and
add the rules that a citation found in search results is not evidence for a
detailed description of findings, that mode labels from the skill must appear
in its output, and that it names which tool produced each result.

Red Team Raccoon and Survey Sleuth ship as instruction-only agents in the
current format and need none of this work. Survey Sleuth may later gain a
`pubmed.search` provider for instrument validation searches by reusing the same
skill. The sample wording changes in issue #19 ship with them.

### Order of work

Phase 0, finish the source-type work. PR #21 (issue #16) separates Copilot
source types and preserves their scopes. Complete its validation and merge it.
`copilotCapabilities` stays the single writer and `readCopilotCapabilities` the
single reader.

Phase 1, project model and workspace (issue #10). Add `PROJECT_SCHEMA_VERSION`,
`normalizeProject`, `normalizeItem`, the IndexedDB stores, removal of the old
draft keys, the project list, recent items, duplicate and delete, library
previews, the version 2 backup with its importer, and
`tools/migrate-library.mjs`. Acceptance: a project exported to the backup and
re-imported normalizes to an identical record; every zip in `library/` has
been converted and loads; the Copilot, `.agent`, Gemini, and Claude downloads
for a converted one-agent library entry contain the same fields as before the
conversion; `npm test` passes.

Phase 2, capabilities, composed instructions, conversion report. Add the
capability schema, the `agentprise.json` reader and writer, `composeInstructions`,
`conversionReport`, the Inspect tab report, the export README section, and
`SETUP.md` generation. Acceptance: golden files for every provider kind on every
target; a `required: true` capability with provider `none` produces an
unsupported entry and the README sentence.

Phase 3, content. Write `pubmed-search` with its references, script, OpenAPI
file, and `agentprise.json`; rebuild Evidence Scout as a project; add Red Team
Raccoon and Survey Sleuth; apply issue #19. Acceptance: the skill passes the
Agent Skills checks; the references carry sources and dates; the test-case file
exists; the embedded and standalone copies of the skill are identical.

Phase 4, exporters. Portable plugin, Claude plugin, Copilot actions from
`openapi` and `mcp` providers with dynamic discovery by default, `WebSearch`
sites from `websearch`, the renamed ChatGPT copy box. Acceptance: exports
validate against the pinned schemas; the vendor facts the exporters rely on
are recorded in `docs/formats.md` under Verified vendor facts, with their
sources and dates.

Phase 5, importers. Portable plugin, Claude plugin, Codex layout, and
multi-skill zips. Acceptance: fixtures for each import; unknown files survive a
backup round trip and appear nowhere else.

Phase 6, documentation. Update `docs/formats.md` (download table, field
mappings, vendor facts), `docs/how-to/add-to-library.md` (items and projects),
a new `docs/how-to/connect-tools.md` for people installing a tool-enabled
export, a new `docs/how-to/move-a-gem-or-gpt.md` that walks through copying
fields into Create new before those products retire (D11), the Help page, the
README download list, and `docs/compliance.md` (imports execute nothing;
schemas are pinned and offline).

### Constants and names to add

- `PROJECT_SCHEMA_VERSION = 2`
- `TARGET_KEYS = ["copilot", "claude", "chatgpt", "gemini", "cli", "*"]`
- `PROVIDER_KINDS = ["connector", "mcp", "openapi", "script", "websearch", "none"]`
- `REPORT_STATUSES = ["preserved", "transformed", "requires-setup", "unsupported", "blocked"]`
- `COPILOT_INSTRUCTION_LIMIT = 8000`
- `COPILOT_WEBSEARCH_SITE_LIMIT = 4`
- `AGENTPRISE_EXTENSION_KEY = "org.depressioncenter.agentprise"`
- `STORAGE_DB = "agentprise-projects"`, `STORAGE_WORKSPACE_KEY = "agentprise-workspace-v2"`
- Functions: `normalizeProject`, `normalizeItem`, `composeInstructions`,
  `conversionReport`, `writeProjectBundle`, `readProjectBundle`,
  `writePortablePlugin`, `writeClaudePlugin`, `writeCopilotActions`,
  `writeSetupGuide`.

### Open choices for the maintainer

- Validator for tests: `ajv` as a devDependency, or a subset validator in the
  repository (see "Validation and tests").
- Whether used skills are inlined into Copilot instructions by default or
  always attached as reference files. The design says inline until the limit.

### Conclusion

With these decisions a coding agent can write the implementation plan phase by
phase, starting from the open pull request, then the project model, then the
PubMed content, then the exporters and importers. The app stays a single static
page, the library stays self-contained, and every export says what it kept and
what it could not.

### Additional resources

- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Plugins specification](https://agent-plugins.org/specification) and its
  [repository](https://github.com/agentplugins/agent-plugins-spec)
- [Vercel guide to Agent Plugins](https://vercel.com/kb/guide/agent-plugins)
- [Agent plugins in VS Code](https://code.visualstudio.com/docs/agent-customization/agent-plugins)
- [OpenAI: build plugins](https://developers.openai.com/plugins/build/plugins) and
  [build skills](https://developers.openai.com/plugins/build/skills)
- [OpenAI: custom GPT retirement and migration FAQ](https://help.openai.com/en/articles/20001519)
- [Microsoft: declarative agent manifest](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest)
- [Microsoft: knowledge sources, including scoped web search](https://learn.microsoft.com/microsoft-365/copilot/extensibility/knowledge-sources)
- [Microsoft: plugins overview](https://learn.microsoft.com/copilot-plugins/overview)
- [Microsoft: dynamic tool discovery for MCP plugins](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-dynamic-tool-discovery)
- [Claude Code plugins overview](https://code.claude.com/docs/en/plugins/overview) and
  [plugin components](https://code.claude.com/docs/en/plugins/components)
- [Plugins on claude.ai and in Cowork](https://claude.com/docs/plugins/overview)
- [Gemini: transition from Gems to skills](https://support.google.com/gemini/answer/18560919) and
  [create and manage skills](https://support.google.com/gemini/answer/17094296)
- [Mistral Vibe agents and skills](https://docs.mistral.ai/mistral-vibe/agents-skills)
- [NCBI E-utilities in depth](https://www.ncbi.nlm.nih.gov/books/NBK25499/) and
  [usage guidelines](https://www.ncbi.nlm.nih.gov/books/NBK25497/)
- [NLM: field tags, including text words and title/abstract](https://nlm.nih.gov/oet/ed/pubmed/mesh/mod04/01-100.html)
- [EFDC KB: Mobile Tech Publication Search Starter Kit](https://teamdynamix.umich.edu/TDClient/210/DepressionCenter/KB/Article/12930/Mobile-Tech-Publication-Search-Starter-Kit)

[Back to project README](../../README.md)
