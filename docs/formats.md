<!--
This file is part of Agentprise
docs/formats.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: What each Agentprise download is for and what it keeps, written for
         people using the app, followed by the technical details maintainers
         need: field mappings, vendor facts with check dates, and open tests.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Formats

[Back to project README](../README.md)

Each AI product stores an assistant its own way, so Agentprise offers a different
download for each one. This page tells you which download to pick, what each one
keeps, and what to do with the file afterwards. The second half, "For
maintainers", holds the technical details behind each file.

### Which download do I need?

| You want to use it in | Choose | You get |
|---|---|---|
| The Agents list in the Microsoft 365 Copilot app or in Teams | Copilot / Teams Apps | An app package (`.zip`) |
| A Teams group chat, channel, or meeting | Teams Chat | One `.agent` file |
| Gemini | Gemini, Download skill | A skill (`.zip`) |
| Claude | Claude, Download skill | The same skill (`.zip`) |
| ChatGPT or Gemini Notebook | ChatGPT, Copy text | Text to paste, and a `.md` file if you want one |
| Nowhere yet, or you want to edit it later | Keep a copy I can edit later | The same `.zip` as Download skill |

The skill `.zip` is the complete copy. Drop it on the Workspace page any time to
change the assistant or download it for another product.

### What each download keeps

Everything you write survives in the skill `.zip` and in the `.agent` file. The
app package cannot carry two things, and the app tells you so before you
download it:

- The welcome message. Copilot has no place for it in an app package.
- Your copyright line and license name. The package's files reject extra fields.

Copy text carries the name, description, instructions, and example questions,
which is everything ChatGPT and Gemini Notebook can take.

Settings that only Microsoft 365 Copilot understands, such as SharePoint files
and what Copilot may use, travel in every download but are ignored by the other
products.

### What to do with the file

**Copilot / Teams Apps.** In the Microsoft 365 Copilot app or in Teams, choose
Agents, then Upload (or Create, then Upload), and pick the `.zip` file. Choose
Share to give it to other people. Your admin may need to allow custom agents. To
update it later, upload the new file in place of the old one.

**Teams Chat.** Upload the `.agent` file to a SharePoint document library. Open
the file's menu, choose Copy link for Teams, paste the link in a Teams chat, and
choose Add to this chat. People in the chat need a Copilot license and permission
to any files you linked.

**Download skill.** In Gemini, open Settings, then Skills, then Upload. In
Claude, open Settings, then Capabilities, then Skills, then Upload. Pick the
`.zip` file. Gemini skills may need a paid Google AI plan, and Claude skills need
a paid Claude plan.

**Copy text.** In ChatGPT, open Explore GPTs, then Create, then the Configure tab,
and paste each box into the matching field. In Gemini Notebook, open the
notebook, then More, then Notebook settings, and paste the instructions, or add
the `.md` file as a source.

### Opening a file you already have

Agentprise opens any of its own downloads, plus files made elsewhere: a `.agent`
file exported from SharePoint, a `.zip` exported from the Copilot app, and any
Agent Skill `.zip` or `SKILL.md` file. Drop the file on the Workspace page, or
choose Open a file in the editor.

## For maintainers

The rest of this page records how each file is built, the vendor facts the
converters rely on with the date each was checked, and the tests that still need
a real account. Read it before changing any converter in `index.html`.

### The formats at a glance

| Format | File | Opens in Agentprise | Downloads from Agentprise | Keeps every field | Who it is for |
|---|---|---|---|---|---|
| Agentprise bundle (Agent Skill) | `.zip` | Yes | Yes | Yes | Gemini, Claude, and keeping a copy to edit later |
| Microsoft `.agent` | `.agent` | Yes | Yes | Yes | SharePoint libraries and Teams chats |
| Teams app package | `.zip` | Yes | Yes | No (see below) | The Microsoft 365 Copilot app |
| Copy-ready text | none, or `.md` | No | Copy buttons and a `.md` download | Not applicable | ChatGPT custom GPTs and Gemini Notebook |

The bundle, the Gemini upload, and the Claude upload are the same bytes, so
"Download skill" for Gemini, "Download skill" for Claude, and "Keep a copy" all
produce the same file. In the app, the Teams app package is labeled "Copilot /
Teams Apps" and the `.agent` file is labeled "Teams Chat".

### The Agentprise bundle

The bundle is a ZIP holding one folder named after the skill:

```
caveman/
  SKILL.md       Required by the Agent Skills standard. Frontmatter plus instructions.
  icon.png       The full-color icon, when one was set.
  LICENSE.txt    The full GPL v3 text for the default license, or a short notice.
  README.md      Name, description, creator, and how to use the file.
```

`SKILL.md` keeps the fields the Agent Skills standard defines (`name`,
`description`, `license`) at the top level. Everything the Microsoft formats need
but the standard lacks lives under `metadata`, as flat strings, because the
standard defines `metadata` as a map from string keys to string values and some
readers reject anything else. Gemini and Claude ignore metadata they do not know.

| Metadata key | Holds | Example |
|---|---|---|
| `agentprise-version` | The bundle layout version | `"1"` |
| `display-name` | The name people see, with capitals and spaces | `Caveman` |
| `welcome` | The first message people see in SharePoint and Teams | |
| `starters` | Conversation starters, one per line | |
| `sharepoint-sources` | SharePoint links, one per line | |
| `copilot-web-search` | Copilot capability on or off | `"true"` |
| `copilot-teams-messages` | Copilot capability on or off | `"true"` |
| `copilot-meetings` | Copilot capability on or off | `"true"` |
| `copilot-code-interpreter` | Copilot capability on or off | `"true"` |
| `copilot-image-generation` | Copilot capability on or off | `"true"` |
| `copilot-prefer-my-files` | Tell Copilot to answer from the sources, not its own knowledge | `"false"` |
| `copilot-app-id` | The Teams app id, kept so re-exports update the same app | |
| `creator-name`, `creator-website`, `creator-privacy`, `creator-terms` | Shown in the Teams manifest | |
| `copyright` | A free-text copyright line | `Copyright (C) 2026 Example Creator` |

The skill `name` is derived from the display name: lowercase letters, digits, and
single hyphens, at most 64 characters, never starting or ending with a hyphen.
`SKILL.md` has no HTML comment at the top because the standard requires the YAML
frontmatter to be the very first bytes. The license lives in the `license` field
and in `LICENSE.txt` instead.

### The Microsoft `.agent` file

SharePoint stores agents as a single JSON file with `schemaVersion` `0.2.0`. The
schema is not documented. Agentprise writes the shape that the SharePoint agent
builder exported on 2026-10-09, plus two extra top-level keys placed before
`schemaVersion`:

- `_license`: one line naming the creator's copyright and license, then Agentprise.
- `_agentprise`: the display name, the Teams app id, the creator fields, the
  copyright line, and the license name.

The SharePoint reader ignores keys it does not know. A `.agent` file with an extra
top-level key was loaded and used in a Teams chat in a real tenant on 2026-10-09.
When Agentprise opens a `.agent` file made in SharePoint, the key is absent, so the
creator fields stay blank and nothing the file ever had is lost. The importer
never requires the key.

| Field | Where it lives in the `.agent` file |
|---|---|
| Name, description, instructions | `customCopilotConfig.gptDefinition.*` |
| Starters | `customCopilotConfig.conversationStarters.conversationStarterList[].text` |
| Welcome message | `customCopilotConfig.conversationStarters.welcomeMessage.text` (omitted when empty) |
| Icon | `customCopilotConfig.icon` as a `data:image/png;base64,` URI |
| SharePoint links | `gptDefinition.capabilities[OneDriveAndSharePoint].items_by_url[].url` |
| Web search, Teams messages, meetings, code interpreter, image generation | `gptDefinition.capabilities[]` named `WebSearch`, `TeamsMessages`, `Meetings`, `CodeInterpreter`, `GraphicArt`, listed only when on |
| Prefer my files | `gptDefinition.behavior_overrides.special_instructions.discourage_model_knowledge` |
| Everything else | `_agentprise` |

SharePoint can also store sources by ID in `items_by_sharepoint_ids`. Agentprise
cannot carry those, so the importer reports how many it skipped and asks for them
as links.

Copilot honors a switch only when its capability is in the list, so a list
without `WebSearch` means web search is off, and the importer reads it that way.
Copilot can also limit web search to a few sites with a `sites` list. Agentprise
cannot carry that list, so the importer says so and web search covers the whole
web. Files written by earlier versions of Agentprise kept the five switches
inside `_agentprise` instead of the list, and the importer still reads a switch
that is on there.

### The Teams app package

The Microsoft 365 Copilot app exports a ZIP with four files, and that is what
Agentprise writes:

```
manifest.json            Teams app manifest, schema 1.28
declarativeAgent_0.json  Declarative agent, schema v1.8
color.png                192 by 192 full-color icon
outline.png              32 by 32 white icon on a transparent background
```

Both JSON files are validated against their schemas, and the declarative agent
schema says that unrecognized properties make the whole document invalid. So the
package carries no extra keys and no license notice.

| Field | Where it lives in the package |
|---|---|
| Name, description, instructions | `declarativeAgent_0.json` top level; `manifest.json` `name` and `description` |
| Starters | `conversation_starters[].text`, at most 12 |
| Welcome message | Nowhere. The export warns and leaves it out. |
| Copyright line and license name | Nowhere. The export warns and leaves them out. |
| Icon | `color.png` plus a generated `outline.png` |
| SharePoint links | `capabilities[OneDriveAndSharePoint].items_by_url[].url` |
| Web search, Teams messages, meetings, code interpreter, image generation | `capabilities[]` named `WebSearch`, `TeamsMessages`, `Meetings`, `CodeInterpreter`, `GraphicArt` |
| Prefer my files | `behavior_overrides.special_instructions.discourage_model_knowledge` |
| Creator | `manifest.json` `developer` (name at most 32 characters, three https links) |
| App id | `manifest.json` `id`, a UUID generated once and kept in the agent |

When the creator fields are blank, the manifest uses `Agent creator` and
`https://example.com` addresses, and the export says so. The manifest `version`
is built from the current date and time (`1.YYYYMMDD.HHMMSS`) so a later export
of the same app always sorts higher and installs as an update. The manifest
`name.short` is cut to 30 characters and `description.short` to 80, which the
Teams schema requires.

### Copy-ready text

ChatGPT custom GPTs have no import file, and Gemini Notebook has no skill upload.
For both, Agentprise shows the name, description, instructions, and starters in
boxes with Copy buttons, plus a `.md` download that can be added to a notebook as
a source.

### Verified vendor facts

Checked on 2026-10-09 unless a line says otherwise.

| Fact | Source |
|---|---|
| An Agent Skill is a folder with `SKILL.md`; `name` is 1 to 64 lowercase characters and hyphens, must match the folder name; `description` is up to 1,024 characters; `metadata` is a string-to-string map; unknown top-level fields are not allowed | [Agent Skills specification](https://agentskills.io/specification) |
| Gemini uploads a skill from Settings, then Skills, then Upload, as a `SKILL.md` or a ZIP with `SKILL.md` in the root folder; Gems migrate to Skills starting 2026-11-17 for personal accounts | [Gemini productivity overview](https://gemini.google/overview/productivity/) and Google's help pages for Gemini Skills |
| Claude uploads skills as a ZIP from Settings, then Capabilities, on paid plans with code execution on | [Claude skills documentation](https://claude.com/docs/skills/how-to) |
| Declarative agent schema 1.8: name up to 100, description up to 1,000, instructions up to 8,000, at most 12 starters, capability names as listed above, `behavior_overrides.special_instructions.discourage_model_knowledge`, unrecognized properties invalidate the document | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8) |
| The app package needs `manifest.json`, a 192 by 192 `color.png`, and a 32 by 32 transparent `outline.png` | [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365) |
| `developer.name` is at most 32 characters; `websiteUrl`, `privacyUrl`, and `termsOfUseUrl` are required | [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer) |
| The Copilot app's own export uses manifest 1.28 and the four `validDomains` Agentprise copies | A Caveman package exported from the Copilot app on 2026-10-09 |
| The SharePoint `.agent` file (schema 0.2.0) has the shape Agentprise writes | A Caveman `.agent` file exported from SharePoint on 2026-10-09 |
| A `.agent` file with an extra top-level key loads and runs in Teams | Loaded in a real tenant on 2026-10-09 |

### Tests run in this repository

- `npm test` on 2026-10-09: 50 tests pass, including a round trip of a sample
  agent through bundle, `.agent`, bundle, Teams package, and bundle, and a check
  that every bundle listed in `library/catalog.json` opens and matches its
  catalog line.
- The real Caveman `.agent` and Teams package exports both import. The `.agent`
  import returns every field, and the Teams import returns every field except the
  welcome message and starters (that export had none).

### Tests that still need a real account

These are open. Record the date and result here when someone runs them.

- Upload a bundle made by Agentprise to a Gemini account and to a Claude account.
- Load a `.agent` file written by Agentprise, with `_license` and `_agentprise`,
  in a SharePoint library and in a Teams chat. The tenant test recorded above
  used a hand-edited file, not this app's output.
- Try a Teams package with an extra `LICENSE.txt` file inside. The app does not
  add one until this is known to work.

### Conclusion

Pick the download for the product you use, and keep a copy if you are unsure.
Maintainers: keep the bundle lossless, keep the Microsoft files free of extra keys
where their schemas forbid them, and update the tables above whenever a converter
changes.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8)
- [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365)
- [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer)
- [Gemini productivity overview](https://gemini.google/overview/productivity/)
- [Claude skills documentation](https://claude.com/docs/skills/how-to)

[Back to project README](../README.md)
