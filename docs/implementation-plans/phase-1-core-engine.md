<!--
This file is part of Agentprise
docs/implementation-plans/phase-1-core-engine.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Phase 1 plan: the agent model, YAML and ZIP code, format converters, and the Node test suite.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Phase 1: core engine

[Back to project README](../../README.md)

This plan builds the part of Agentprise that has no screen: the agent model, the
validation rules, the YAML and ZIP code, and the converters that read and write
every supported file format. It is written for an engineer who has never seen the
project. When this phase is done, a Node test suite proves that a Caveman agent
survives a round trip through every lossless format, and that hostile files are
rejected.

### Goal

One `index.html` file whose script exposes a pure, testable engine on
`globalThis.Agentprise`, plus a Node test suite in `tests/` that runs against that
script with no extra dependencies.

### Architecture

The whole app is one HTML file with one `<style>` block and one `<script>` block.
The script is split into named sections. Everything in this phase is pure
JavaScript with no DOM access, so Node can load it in a `vm` context and test it.
The UI (Phase 2) calls into the engine and never duplicates its logic. ZIP files
are read with a small built-in parser and inflated with the platform
`DecompressionStream` API, and written with the store method. YAML support covers
only the subset the bundle uses.

### Tech stack

Plain HTML, CSS, and JavaScript (ES2020). No frameworks, no build step, no runtime
dependencies. Tests use the Node built-in test runner (`node --test`), available in
Node 20 and later.

### Global constraints

These come from `AGENTS.md` and the project preferences and apply to every task.

- Every source file opens with the required license header in the language's own
  comment syntax (`AGENTS.md` section 3). JSON files carry a leading `_license`
  key where the consumer tolerates it.
- ASCII only in code and comments. Unicode only in visible interface text.
- No external network calls except to the app's own `library/` folder.
- Uploaded files are untrusted input. Every value read from a file is type-checked
  and length-capped before it reaches the model.
- Text goes into the page with `textContent`, never `innerHTML`.
- Plain-English mode for every comment, docstring, commit message, and page.
- No robot signatures, co-author trailers, or tool names in commits.

### Changes from the design

- The skill `name` is capped at 64 characters, because the Agent Skills
  specification requires it. The display name keeps the 100 character limit.
- The Teams package keeps the "prefer my files" setting. Declarative agent schema
  1.8 defines `behavior_overrides.special_instructions.discourage_model_knowledge`,
  so the export writes it there instead of dropping it with a warning. The only
  field the Teams package loses is the welcome message.
- Inflate uses the platform `DecompressionStream("deflate-raw")` API instead of a
  hand-written decoder. The API is standard in every current browser and in Node.
  A browser without it still opens ZIPs whose entries are stored uncompressed, and
  shows a plain message for compressed ones.
- Tests use the Node built-in runner rather than jsdom, because the engine has no
  DOM dependency. Icon resizing and outline generation need a canvas, so they live
  in the UI layer and are checked in the browser in Phase 3.

### Review focus

Inputs the design does not mention that the engine must still handle. Each one has
a test in the task that owns the code.

1. A `SKILL.md` with Windows line endings must parse the same as one with Unix
   line endings. Test in Task 3.
2. A ZIP whose `SKILL.md` sits inside a nested folder (`caveman/SKILL.md`), which
   is how Gemini and Claude expect it, must load, and one at the root must load
   too. Test in Task 6.
3. A `.agent` file that is valid JSON but not an object (an array, a string) must
   be rejected with a plain message, not a thrown exception. Test in Task 5.
4. Conversation starters beyond the limit of 12 must be truncated with a notice,
   not silently dropped and not rejected outright. Test in Task 2.
5. A starter or SharePoint link that is an empty string after trimming must be
   removed before export, because Microsoft rejects empty starter text. Test in
   Task 2.

### File structure

- `index.html`: the app. In this phase it holds the header comment, a minimal
  body placeholder, and the engine script. Phase 2 fills in the interface.
- `tests/load-engine.mjs`: extracts the script block from `index.html` and
  evaluates it in a `vm` context with the platform globals the engine needs.
- `tests/engine.test.mjs`: the test suite.
- `skills/project-preferences/SKILL.md`: records the project-specific choices.
- `docs/formats.md`: the verified vendor facts and the field mappings.

### Engine interface

Everything below is exposed as `globalThis.Agentprise`. Later tasks and Phase 2
rely on these exact names.

```javascript
Agentprise.LIMITS            // { name: 100, skillName: 64, description: 1000,
                             //   instructions: 8000, welcome: 1000, starters: 12,
                             //   starterText: 500, sharepointLinks: 20,
                             //   zipEntries: 200, zipEntryBytes: 10485760,
                             //   zipTotalBytes: 52428800, iconBytes: 2097152 }
Agentprise.createAgent()     // -> Agent with every field at its default
Agentprise.normalizeAgent(a) // -> { agent, notices: [string] } trims, caps, drops empties
Agentprise.validateAgent(a)  // -> { problems: [{field, message}], warnings: [{field, message}] }
Agentprise.toSkillName(displayName) // -> lowercase hyphenated name, 1 to 64 chars
Agentprise.yaml.parseFrontmatter(text) // -> { data: object, body: string, warnings: [string] }
Agentprise.yaml.stringifyFrontmatter(data, body) // -> string
Agentprise.zip.read(bytes)   // -> Promise<Map<string, Uint8Array>>; throws ZipError
Agentprise.zip.write(entries)// -> Uint8Array; entries is [{ name, bytes }]
Agentprise.png.dimensions(bytes) // -> { width, height } or null
Agentprise.formats.bundle.export(agent)  // -> Promise<{ fileName, bytes, warnings }>
Agentprise.formats.bundle.import(bytes)  // -> Promise<{ agent, notices }>
Agentprise.formats.skillMd.import(text)  // -> { agent, notices }
Agentprise.formats.msAgent.export(agent) // -> { fileName, text, warnings }
Agentprise.formats.msAgent.import(text)  // -> { agent, notices }
Agentprise.formats.teamsZip.export(agent, icons) // -> Promise<{ fileName, bytes, warnings }>
Agentprise.formats.teamsZip.import(bytes)        // -> Promise<{ agent, notices }>
Agentprise.formats.copyText.export(agent)        // -> { name, description, instructions, starters, markdown }
Agentprise.detectFormat(fileName, bytes)         // -> "bundle" | "skillMd" | "msAgent" | "teamsZip" | "unknown"
```

The `Agent` object:

```javascript
{
  version: "1",
  name: "",             // display name, 1 to 100 characters
  description: "",      // up to 1000 characters
  welcome: "",          // optional, up to 1000 characters
  instructions: "",     // up to 8000 characters
  starters: [],         // up to 12 strings, each up to 500 characters
  icon: null,           // { bytes: Uint8Array, mime: "image/png" } or null
  sharepointLinks: [],  // up to 20 absolute https URLs
  copilot: { webSearch: true, teamsMessages: true, meetings: true,
             codeInterpreter: true, imageGeneration: true,
             preferMyFiles: false, appId: "" },
  creator: { name: "", website: "", privacy: "", terms: "" },
  copyright: "",        // free text, shown in the bundle frontmatter
  license: "GPL-3.0-or-later"
}
```

### Task 1: scaffold the file, the loader, and the first test

Files: create `index.html` (replace the redirect page), `tests/load-engine.mjs`,
`tests/engine.test.mjs`, and `package.json` with only a `test` script and no
dependencies.

- [ ] Write `tests/load-engine.mjs`. It reads `index.html`, finds the single
      script block, builds a `vm` context whose globals are `TextEncoder`,
      `TextDecoder`, `Uint8Array`, `DecompressionStream`, `CompressionStream`,
      `crypto`, `atob`, `btoa`, `console`, `setTimeout`, `Blob`, and `Response`,
      runs the script, and exports the `Agentprise` object from that context.
- [ ] Write the first test: `Agentprise.LIMITS.starters === 12` and
      `createAgent().name === ""`.
- [ ] Run `node --test tests/` and confirm it fails because `index.html` has no
      engine.
- [ ] Replace `index.html` with the license header, the doctype, a `<main>`
      placeholder, and a script holding the configuration section, `LIMITS`,
      `createAgent`, and `globalThis.Agentprise = { LIMITS, createAgent }`.
      Guard UI startup with `if (typeof document !== "undefined") { ... }`.
- [ ] Run `node --test tests/` and confirm it passes.
- [ ] Commit: "Add engine scaffold and Node test loader".

### Task 2: normalize and validate

Files: modify `index.html`; add tests.

- [ ] Tests: a 150 character name is cut to 100 with a notice; 15 starters are cut
      to 12 with a notice; an empty starter is removed; a SharePoint link that is
      not `https://` is removed with a notice; `validateAgent` reports a problem
      for an empty name and an empty instructions field; it reports a warning
      when a welcome message is set (the Teams package drops it);
      `toSkillName("My Agent!!")` returns `"my-agent"` and never starts or ends
      with a hyphen or contains two hyphens in a row; a 100 character name yields
      a 64 character skill name.
- [ ] Implement `normalizeAgent`, `validateAgent`, and `toSkillName`.
- [ ] Run tests, commit: "Add agent normalization and validation".

### Task 3: YAML frontmatter subset

Files: modify `index.html`; add tests.

Supported syntax: `---` fences, `key: value` scalars, double-quoted scalars with
backslash escapes for the quote and the backslash, one nested mapping level, and
block scalars (`|`) whose lines are indented two spaces more than the key. Nothing
else. Unknown constructs produce a warning and are skipped.

- [ ] Tests: parse the Caveman frontmatter shown in `docs/formats.md`; parse the
      same text with Windows line endings and get equal output; a value containing
      a colon and space inside quotes stays whole; `stringifyFrontmatter` then
      `parseFrontmatter` returns equal data for a mapping holding a block string
      with three lines; a top-level key the bundle does not use is preserved in
      `data` and does not raise an error; text without a frontmatter fence returns
      an empty `data` object and the whole text as `body`.
- [ ] Implement `yaml.parseFrontmatter` and `yaml.stringifyFrontmatter`. The
      writer always quotes scalars that contain a colon, a hash, leading or
      trailing spaces, or that look like booleans or numbers, and uses block
      scalars for any value containing a newline.
- [ ] Run tests, commit: "Add YAML frontmatter reader and writer".

### Task 4: ZIP read and write, PNG dimensions

Files: modify `index.html`; add tests.

- [ ] Tests: `zip.write` of two stored entries then `zip.read` returns both with
      equal bytes; an archive produced with deflate (method 8) inflates
      correctly; an entry named `../evil` is rejected with `ZipError`; an entry
      name with a backslash or a leading slash is rejected; an archive with 201
      entries is rejected; a header whose declared uncompressed size exceeds
      `zipEntryBytes` is rejected before inflating; a PNG header from a 192 by
      192 image returns `{ width: 192, height: 192 }`; random bytes return `null`.
- [ ] Implement a CRC-32 table, `zip.write` (local headers, central directory,
      end record, store method only, UTF-8 names with the UTF-8 flag set),
      `zip.read` (walks the central directory from the end record, checks the
      signature, caps entry count and sizes, inflates method 8 with
      `DecompressionStream`, verifies CRC-32), and `png.dimensions` (checks the
      8 byte signature and reads the IHDR chunk).
- [ ] Run tests, commit: "Add ZIP reader and writer and PNG header check".

### Task 5: Microsoft `.agent` import and export

Files: modify `index.html`; add tests.

- [ ] Tests: exporting a Caveman agent produces JSON whose first key is
      `_license`, second `_agentprise`, then `schemaVersion: "0.2.0"` and
      `customCopilotConfig` with the shape in `docs/formats.md`; importing that
      text gives an agent equal to the original on every field; importing a
      `.agent` without `_agentprise` applies defaults; importing an array, a
      string, or invalid JSON returns a rejection message, not an exception; a
      description containing a script tag comes back as the same literal text; a
      10,000 character name is cut to 100 with a notice; `preferMyFiles` round
      trips through `behavior_overrides.special_instructions.discourage_model_knowledge`;
      an icon round trips through the `data:image/png;base64,` URI.
- [ ] Implement `formats.msAgent.export` and `formats.msAgent.import`.
- [ ] Run tests, commit: "Add Microsoft .agent import and export".

### Task 6: bundle (Agent Skill) import and export

Files: modify `index.html`; add tests.

- [ ] Tests: export writes `<skill>/SKILL.md`, `<skill>/icon.png` when an icon
      exists, `<skill>/LICENSE.txt`, and `<skill>/README.md`; `SKILL.md` starts
      with `---` on the first byte; frontmatter `name` equals `toSkillName(name)`;
      `metadata` values are all strings; import of the exported bytes returns an
      equal agent; import of a ZIP with `SKILL.md` at the root works; import of a
      ZIP with a nested folder works; a `SKILL.md` with an unknown top-level
      frontmatter field loads with a warning; `formats.skillMd.import` works on
      bare text; a bundle whose `name` has uppercase letters loads with a notice
      and a corrected skill name.
- [ ] Implement `formats.bundle.export`, `formats.bundle.import`, and
      `formats.skillMd.import`. The README inside the bundle is a short page with
      the hidden license comment, the agent name, description, author, and a
      one-paragraph "how to use" note. `LICENSE.txt` is the full GPL-3.0-or-later
      text for the default license, or a one-line notice naming the chosen license
      otherwise.
- [ ] Run tests, commit: "Add Agent Skill bundle import and export".

### Task 7: Teams package import and export

Files: modify `index.html`; add tests.

- [ ] Tests: export produces `manifest.json`, `declarativeAgent_0.json`,
      `color.png`, and `outline.png`; `manifest.json` has no `_license` key and
      no key outside the 1.28 schema; `declarativeAgent_0.json` has `version:
      "v1.8"`, the capability names in the order `WebSearch`, `TeamsMessages`,
      `Meetings`, `CodeInterpreter`, `GraphicArt` only for the ones enabled,
      `OneDriveAndSharePoint` with `items_by_url` when links exist, and
      `behavior_overrides` only when `preferMyFiles` is true; a welcome message
      yields exactly one warning naming the welcome field; the app id is a UUID
      generated once and reused on a second export of the same agent; blank
      creator fields become the documented placeholders; import of the exported
      bytes returns an equal agent on every field except `welcome`; import of a
      package missing `declarativeAgent_0.json` is rejected with a message.
- [ ] Implement `formats.teamsZip.export(agent, icons)` where `icons` is
      `{ color: Uint8Array, outline: Uint8Array }` prepared by the caller (the UI
      resizes with a canvas; tests pass fixture PNG bytes). Implement
      `formats.teamsZip.import`.
- [ ] Run tests, commit: "Add Teams app package import and export".

### Task 8: copy text, format detection, and round trips

Files: modify `index.html`; add tests.

- [ ] Tests: `copyText.export` returns the four fields and a Markdown document
      that starts with the name as a heading; `detectFormat` returns `msAgent`
      for `.agent`, `skillMd` for `SKILL.md`, `teamsZip` for a ZIP containing
      `manifest.json`, `bundle` for a ZIP containing a `SKILL.md`, and `unknown`
      otherwise; a full round trip bundle to `.agent` to bundle to Teams package
      to bundle leaves every field equal except `welcome` after the Teams step.
- [ ] Implement `formats.copyText.export` and `detectFormat`.
- [ ] Run tests, commit: "Add copy text export and format detection".

### Task 9: documentation for this phase

Files: `skills/project-preferences/SKILL.md`, `docs/formats.md`, `docs/README.md`.

- [ ] Fill in the project preferences: single file, zero dependencies, bundle
      format, metadata key names, the four download cards, test command.
- [ ] Write `docs/formats.md` with the verified facts, their source links and
      check dates, the field mapping tables, and the open test on the Teams
      package extra file.
- [ ] Add both pages to the docs index.
- [ ] Commit: "Document formats and project preferences".

### Verification

Run the test suite and a syntax check on the extracted script:

```
node --test tests/
node tests/check-syntax.mjs
```

Both must pass before Phase 2 starts.

### Conclusion

After this phase the engine is complete and tested, and Phase 2 can build the
interface on the names listed under "Engine interface" without changing them.

### Additional resources

- [Phase 2: user interface](phase-2-user-interface.md)
- [Formats and verified vendor facts](../formats.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8)

[Back to project README](../../README.md)
