<!--
This file is part of Agentprise
docs/design/agentprise-design.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-10
Summary: Short design specification of Agentprise as implemented on main
         on October 10, 2026, covering its architecture, data, workflows,
         supported formats, and known limits.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Design specification: Current State as of October 10, 2026

[Back to project README](../../README.md)

Agentprise lets you describe an AI assistant once and download it for several
products. This page gives maintainers a short baseline of the implemented tool.
It covers main at commit `46d0ca24cc58c75e39e14784b40322556ba52099`, including
pull request #21, as of October 10, 2026, in America/New_York time.

### Purpose and scope

The tool creates, imports, edits, previews, and converts assistant definitions
for Microsoft 365 Copilot, Teams, Gemini, Claude, and ChatGPT. It also produces
Markdown for Gemini Notebook. People can start with a blank assistant, an
existing file, or a Library entry.

Agentprise does not run an AI model, answer chat messages, or publish assistants
into vendor accounts. Its chat preview is a local display. Users install or
paste the exported content into the destination product themselves. External
tools, plugin execution, and projects containing several skills are outside
this implemented baseline.

### Architecture and data flow

The application lives in `index.html`, with embedded styles and JavaScript.
It has no build step, framework, package dependencies, or application backend.
GitHub Pages serves the public app. Bundled ZippyServe launchers support local
use on Windows, macOS, and Linux. Opening the HTML file directly also works,
except that the Library needs HTTP access.

The engine is exposed as `globalThis.Agentprise` and works without a browser
document. It owns the agent model, validation, sharing checks, archive handling,
and format converters. The interface follows it in the same script.

Files and Library bundles pass through format detection, parsing, and
normalization into one shared agent object. Both editors update that object.
Validation feeds the preview, field notices, and download controls. Exporters
turn the same state into destination files and report unsupported fields.

### User workflow

The sidebar opens four views: Workspace, Library, Inspect, and Help. Inspect
retains the internal `#details` route for existing links.

1. Create an assistant, open a file, or choose a Library entry.
2. Enter its name, description, instructions, and optional example questions.
3. Use More settings for the welcome message, picture, attachments, Copilot
   sources, and publisher details.
4. Review the preview and warnings. Inspect provides editable fields beside
   each output's file tree and text.
5. Download a destination file or copy the ChatGPT fields. Download Backup
   keeps the complete supported assistant for later editing.

Name, description, and instructions are required before downloads are enabled.
Replacing existing work asks for confirmation. Draft text is saved in
`localStorage`; attachments use IndexedDB. Start over clears both. Storage
failures leave editing available and warn that the draft cannot be kept.

### Shared model and Copilot settings

One agent holds its text, starters, icon bytes, attached files, publisher and
license details, SharePoint links and imported items, and Copilot settings.
The display name allows 100 characters; the derived skill name allows 64.
Descriptions allow 1,000 characters, instructions 8,000, and starters 12.

New assistants enable web search, code interpreter, and image generation.
SharePoint, Teams messages, email, and meetings start off. Each source has a
switch and optional limits. An enabled source with no limits represents all
sources the destination product permits that person to access.

The model carries website, SharePoint, Teams chat, mailbox, and meeting limits,
plus a response mode and the prefer-my-files setting. Imported meeting items,
shared mailbox, and email folders are displayed read-only with removal controls.
One capability reader and writer serve both Microsoft formats.

### File contracts

| Output | Contract and limits |
|---|---|
| Agentprise bundle, Gemini, Claude, and Backup | The same ZIP format preserves all supported fields. One skill folder contains `SKILL.md`, license and readme files, an optional icon, and attachments under `references/`. Extra fields use flat string metadata. |
| Plain skill | `.skill.zip` contains standard skill fields and reference files. It omits the icon and application metadata, so it is not a backup. |
| Teams Chat | `.agent` JSON uses schema version `0.2.0`, with `_license` and `_agentprise` fields. It cannot carry attachments. |
| Copilot / Teams Apps | ZIP contains a Teams manifest at version `1.28`, a declarative agent at `v1.8`, icons, and supported attachments. It omits the welcome message, copyright line, and license name. |
| ChatGPT and Gemini Notebook | Copy fields or Markdown carry the name, description, instructions, and starters. They do not preserve the full model. |

Import accepts bundles, plain skills, `SKILL.md`, `.agent` files, and Copilot app
packages. It preserves supported data and reports losses. This is not a promise
to preserve arbitrary vendor fields or runnable skill folders.

Attachments are limited to 20 files, each at most 10 MiB. Accepted document and
text types are checked by content. Scripts travel as reference text and are
never executed. Copilot packages rename non-`.txt` text files to `name.ext.txt`
and omit unsupported document types with a warning. Bundles keep accepted files
under their original names.

### Library, privacy, and accessibility

The Library contains 13 assistant bundles listed in `library/catalog.json`.
Search and tags filter the cards. Loading a card uses the same importer as a
user file. A failed bundle does not prevent other cards from loading.

Assistant content is processed locally. Production loads Google Analytics only
on `code.depressioncenter.org`; local copies do not load that tag. Library
requests retrieve static catalog and bundle files. Browser draft storage is
local persistence, not encrypted storage or an institutional privacy boundary.

Input normalization checks types and lengths. Archive handling checks paths,
duplicate names, checksums, and size limits. Display text is inserted as text,
not interpreted as HTML. Review before sharing uses local patterns to flag
possible identifiers and prompt injection text, with masked samples. It can
miss sensitive content and lets the user proceed after confirmation.

The interface targets Web Content Accessibility Guidelines (WCAG) 2.2 AA.
It includes labeled controls, keyboard navigation, visible focus, status
announcements, light and dark themes, and narrow-screen layouts. Existing
browser checks are recorded in the compliance page and pull requests; a full
screen-reader pass remains open.

### Verification and known limits

`npm test` runs syntax and ASCII checks plus Node's built-in test runner.
Tests cover the model, converters, hostile inputs, sharing patterns, and Library
bundles. PR #21 reports 105 passing tests, but its new source controls still
need a browser and accessibility pass.

Real-account checks remain for several generated formats, attached knowledge,
scoped Copilot sources, unlimited SharePoint access, and actual `.onepart`
files. The formats page records those gaps. Preserving a setting in a file
does not prove that a destination product honors it. This specification makes
no privacy, security, or accessibility certification claim.

### Sources and further detail

The main-branch code defines this baseline. Pull request descriptions explain
the design changes; later merged behavior takes precedence over earlier plans.

- [Reviewed main commit](https://github.com/DepressionCenter/agentprise/commit/46d0ca24cc58c75e39e14784b40322556ba52099).
- [Core engine, PR #1](https://github.com/DepressionCenter/agentprise/pull/1),
  [workspace design, PR #3](https://github.com/DepressionCenter/agentprise/pull/3),
  and [Library, PR #4](https://github.com/DepressionCenter/agentprise/pull/4).
- [Source preservation, PR #11](https://github.com/DepressionCenter/agentprise/pull/11),
  [file checks, PR #12](https://github.com/DepressionCenter/agentprise/pull/12),
  and [sharing checks, PR #14](https://github.com/DepressionCenter/agentprise/pull/14).
- [Output views, PR #15](https://github.com/DepressionCenter/agentprise/pull/15),
  [download controls, PR #17](https://github.com/DepressionCenter/agentprise/pull/17),
  and [community assistants, PR #20](https://github.com/DepressionCenter/agentprise/pull/20).
- [Current Copilot sources and uploads, PR #21](https://github.com/DepressionCenter/agentprise/pull/21).
- [Formats and open account tests](../formats.md) and
  [privacy and accessibility evidence](../compliance.md).

[Back to project README](../../README.md)
