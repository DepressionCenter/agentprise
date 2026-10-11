<!--
This file is part of Agentprise
docs/formats.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-10
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
| Gemini | Gemini | A skill (`.zip`) |
| Claude | Claude | The same skill (`.zip`) |
| ChatGPT | ChatGPT, Copy | Text to paste |
| Gemini Notebook | Gemini Notebook | A `.md` file to add as a source |
| Another tool that reads Agent Skills | SKILL.md | A plain skill (`.skill.zip`) with nothing specific to this app |
| Nowhere yet, or you want to edit it later | Download Backup | The whole project as one `.agentprise.zip` |

Every download in the table except the backup is for one assistant or skill:
the one named at the top of the Download card. The backup is the complete copy
of the whole project, with every assistant, skill, and file in it. Drop it on
the Workspace page any time to change the project or download it for another
product. The backup is meant for Agentprise, so use the Gemini or Claude
button when you want to upload to those products. The plain skill drops the
welcome message, the starters, the picture, and the Copilot settings, so it is
not a backup either.

### What each download keeps

The backup keeps everything in the project. The skill `.zip` for Gemini and
Claude keeps everything about one assistant or skill, so Agentprise can open
it again. It leaves out only what belongs to the whole project: the other
assistants and skills, your organization, and the version number. The
`.agent` file keeps everything about one assistant except attached files,
which it has no place for. The app package cannot carry two things, and the
app tells you so before you download it:

- The welcome message. Copilot has no place for it in an app package.
- Your copyright line and license name. The package's files reject extra fields.

The ChatGPT text carries the name, description, instructions, and example questions,
which is everything ChatGPT and Gemini Notebook can take.

Settings that only Microsoft 365 Copilot understands, such as what Copilot may
use, the lists that limit each source, the response mode, and attached files,
travel in every download that has room for them but are ignored by the other
products. Each source has its own list: web sites under Web search (up to
four), SharePoint and OneDrive links under SharePoint and OneDrive (up to 20),
links to teams, channels, group chats, or meeting chats under Teams messages
(up to five), and shared or group mailbox addresses under Email (up to 25).
Meetings chosen in the Copilot app, a shared mailbox, and email folders can
only arrive inside a file; the app keeps them and shows them with a Remove
button. A list only matters while its source is on, and an empty list means
Copilot may use everything the person can see.

Attached files can be Word, PowerPoint, Excel, PDF, OneNote (`.one` and
`.onepart`), or plain text, including scripts and data files such as `.ps1`,
`.py`, `.sql`, `.md`, `.csv`, and `.json`. The app reads the first bytes of
every file and refuses anything that does not match its name, so a program
renamed to `.pdf` never gets in. Copilot accepts only the document types,
`.onepart`, and `.txt` as uploads, so the app package carries a script as
plain text under its own name plus `.txt`, for example `deploy.ps1.txt`, and
leaves out a `.one` file with a warning. The skill `.zip` and the backup keep
every file under its real name.

A skill can be downloaded for Copilot, Teams Chat, ChatGPT, and Gemini
Notebook too. Those products have no skills, so the skill's steps become the
assistant's instructions.

### What to do with the file

**Copilot / Teams Apps.** In the Microsoft 365 Copilot app or in Teams, choose
Agents, then Upload (or Create, then Upload), and pick the `.zip` file. Choose
Share to give it to other people. Your admin may need to allow custom agents. To
update it later, upload the new file in place of the old one.

**Teams Chat.** Upload the `.agent` file to a SharePoint document library. Open
the file's menu, choose Copy link for Teams, paste the link in a Teams chat, and
choose Add to this chat. People in the chat need a Copilot license and permission
to any files you linked.

**Skill (.zip).** In Gemini, open Settings, then Skills, then Upload. In
Claude, open Settings, then Capabilities, then Skills, then Upload. Pick the
`.zip` file. Gemini skills may need a paid Google AI plan, and Claude skills need
a paid Claude plan.

**Copy.** In ChatGPT, open Explore GPTs, then Create, then the Configure tab,
and paste each box into the matching field. In Gemini Notebook, open the
notebook, then More, then Notebook settings, and paste the instructions, or add
the `.md` file as a source.

**Backup (.agentprise.zip).** Keep it somewhere safe, because browsers can
clear what they store. Drop it on the Workspace page to open the project
again.

### Opening a file you already have

Agentprise opens any of its own downloads, plus files made elsewhere:

- A `.agent` file exported from SharePoint.
- A `.zip` exported from the Microsoft 365 Copilot app.
- Any Agent Skill `.zip` or `SKILL.md` file. A `.zip` with several skills
  inside opens with each one as its own skill.
- A plugin `.zip` in the Agent Plugins format, a Claude plugin, or a Codex
  plugin. Its skills become skills in the project, and its tool servers are
  kept with the project.

Drop the file on the drop area of the Workspace page, or choose Open a file in
a project. Each file opens as a new project. When the same project is already
in your workspace, the app asks whether to keep both or replace yours. To add a
file's skills to the project you have open instead, choose Add from a file in
the project.

Plugins sometimes carry hooks, commands, agents folders, or other files
Agentprise does not understand. The app keeps them with the project and writes
them back only into the backup. It never reads or runs them, and it never
keeps a program. A skill or plugin that names no license opens with the
license "Not stated" and a note, so you can check with its author before you
share it.

## For maintainers

The rest of this page records how each file is built, the vendor facts the
converters rely on with the date each was checked, and the tests that still need
a real account. Read it before changing any converter in `index.html`.

### The formats at a glance

| Format | File | Opens in Agentprise | Downloads from Agentprise | Keeps every field | Who it is for |
|---|---|---|---|---|---|
| Agentprise project backup (Agent Plugins 1.0 folder) | `.agentprise.zip` | Yes | Yes | Yes, for the whole project | Keeping a project to edit later |
| Skill (Agent Skill folder with a sidecar) | `.zip` | Yes | Yes | Yes for one item, without the project's organization and version | Gemini and Claude |
| Plain skill | `.skill.zip` | Yes | Yes | Standard Agent Skills fields only | Any tool that reads Agent Skills |
| Agent Plugins folder, Claude plugin, or Codex plugin made elsewhere | `.zip` | Yes | Only as the backup | Skills and servers; everything else is kept as unrecognized files | Bringing a plugin into a project |
| Microsoft `.agent` | `.agent` | Yes | Yes | All but attached files | SharePoint libraries and Teams chats |
| Teams app package | `.zip` | Yes | Yes | No (see below) | The Microsoft 365 Copilot app |
| Copy-ready text | none, or `.md` | No | Copy buttons and a `.md` download | Not applicable | ChatGPT custom GPTs and Gemini Notebook |

The Gemini upload and the Claude upload are the same bytes, so the Gemini row
and the Claude row produce the same skill `.zip`. Gemini and Claude have
separate tabs on the Inspect page because their skill support may diverge. The
backup is a different file: it holds the whole project, while every other
download holds one item. In the app, the Teams app package is labeled
"Copilot / Teams Apps" and the `.agent` file is labeled "Teams Chat".

Every download except the backup is named after the item, such as
`Caveman.zip`, `Caveman.skill.zip`, `Caveman.agent`, and `Caveman.md`. The app
package adds "Copilot app" to its name, as in `Caveman Copilot app.zip`, so the
`.zip` downloads never overwrite each other. Inside the skill `.zip`, the
folder keeps the skill name. The backup is named after the project in skill
name form, such as `caveman.agentprise.zip`.

### The project backup

The backup is an Agent Plugins 1.0 directory, zipped, inside one folder named
after the project:

```
caveman/
  plugin.json        Agent Plugins manifest. The project record sits under
                     extensions["org.depressioncenter.agentprise"].
  mcp.json           Tool servers, written only when the project has any.
  LICENSE.txt        The project license.
  README.md          What is inside and how to open it again.
  skills/
    caveman/         One item folder per assistant or skill (see below).
    meeting-notes/
  hooks/...          Unrecognized files from an import, at their original paths.
```

`plugin.json` keeps to the closed Agent Plugins 1.0.0 schema: `$schema`,
`name` (the project name in skill name form), `version` (the Version number
field, three numbers such as `1.0.0`), `description`, `author` (only when a
creator name is set, with `name`, `email`, and `url` only), `homepage`,
`repository`, `license`, `keywords`, and `extensions`. The Agentprise entry in
`extensions` holds the project record without item contents: `schemaVersion`
(`2`), `id`, `name`, `description`, `version`, `creator` (name, organization,
website, privacy and terms links), `copyright`, `license`, `created`,
`modified`, `servers`, `items` (kind, id, and skill name of each item, in
order), `unrecognized` (path and note of each kept file), and `pluginExtras`
(manifest fields from a plugin made elsewhere, so they are written back).
Other tools' `extensions` entries are kept.

`mcp.json` names the Agent Plugins MCP schema and lists each server under
`mcpServers`: a remote server as `type` `streamable-http` (or `sse`) with its
`url`, and a local server as `type` `stdio` with its `command` and `args`. A
server whose address the installer must supply is written with a placeholder
address. The app writes these files and never runs or contacts the servers.

A plugin made elsewhere keeps its own root `LICENSE.txt` and `README.md`; the
app writes its own only where the author had none. The project `id` is a UUID
made once and kept through every backup, which is how the app notices that a
project being opened is already in the workspace.

### Item folders

Each assistant or skill is one Agent Skill folder named after its skill name.
The same folder, zipped on its own, is the skill `.zip` for Gemini and Claude:

```
caveman/
  SKILL.md         Required by the Agent Skills standard. Frontmatter plus instructions.
  agentprise.json  The item fields the standard has no place for.
  icon.png         The full-color icon of an assistant, when one was set.
  LICENSE.txt      The full GPL v3 text for the default license, or a short notice.
  README.md        Skill .zip and plain skill only: name, description, creator, and how to use the file.
  references/      Attached files, when there are any, under their real names.
```

A skill brought in from elsewhere keeps its own `LICENSE.txt` and `README.md`,
and keeps its other files in their own folders, such as `scripts/`, when they
are types the app accepts for attachments. Any other file in the folder that is
not a program is kept as an unrecognized file, which only the backup writes
back. The plain skill
(`.skill.zip`) is the same folder without `agentprise.json` or `icon.png`, and
its `SKILL.md` carries only the standard fields.

`SKILL.md` keeps the fields the Agent Skills standard defines (`name`,
`description`, `license`, and for a skill `compatibility` and `allowed-tools`)
at the top level. `compatibility` is the "What it needs to work" field.
Everything the Microsoft formats need but the standard lacks lives under
`metadata`, as flat strings, because the standard defines `metadata` as a map
from string keys to string values and some readers reject anything else.
Gemini and Claude ignore metadata they do not know. A skill's own metadata
from elsewhere is kept as it was.

| Metadata key | Holds | Example |
|---|---|---|
| `agentprise-kind` | Whether the folder is an assistant or a skill | `agent` |
| `sharepoint-sources` | SharePoint links a person pasted, one per line | |
| `sharepoint-items` | SharePoint items that came from a Microsoft file, as one JSON array; each has `by` (`id` or `url`) plus the keys the builder wrote | |
| `copilot-web-search` | Copilot capability on or off | `"true"` |
| `copilot-web-sites` | Sites web search is limited to, one per line, at most four | |
| `copilot-sharepoint` | Copilot capability on or off. An assistant without this key reads as on when it has SharePoint links or items and off otherwise | `"false"` |
| `copilot-teams-messages` | Copilot capability on or off | `"true"` |
| `copilot-teams-links` | Teams chats the source is limited to, one link per line, at most five | |
| `copilot-email` | Copilot capability on or off | `"false"` |
| `copilot-mailboxes` | Shared or group mailboxes email is limited to, one address per line, at most 25 | |
| `copilot-shared-mailbox` | One shared mailbox address that came from a file | |
| `copilot-email-folders` | Folder ids that came from a file, one per line | |
| `copilot-meetings` | Copilot capability on or off | `"true"` |
| `copilot-meeting-items` | Meetings the source is limited to, as one JSON array of `{id, is_series}`, at most five | |
| `copilot-code-interpreter` | Copilot capability on or off | `"true"` |
| `copilot-image-generation` | Copilot capability on or off | `"true"` |
| `copilot-prefer-my-files` | Tell Copilot to answer from the sources, not its own knowledge | `"false"` |
| `copilot-response-mode` | `Auto`, `Quick response`, or `Think deeper` | `Auto` |
| `copilot-app-id` | The Teams app id, kept so re-exports update the same app | |
| `creator-name`, `creator-website`, `creator-privacy`, `creator-terms` | The project's publisher details, shown in the Teams manifest | |

The `sharepoint-` and `copilot-` keys are written for assistants only. A skill
carries `agentprise-kind`, its own metadata, and the `creator-` keys.

`agentprise.json` sits next to `SKILL.md` and holds what neither the standard
fields nor the metadata map can carry, so a folder copied out of a project
stays complete. It starts with a `_license` key, like the other JSON files the
app writes.

| Key | Holds |
|---|---|
| `schemaVersion` | `2` |
| `kind` | `agent` or `skill` |
| `id` | The item's UUID |
| `name` | The name people see, with capitals and spaces |
| `welcome`, `starters`, `uses` | Assistants only: the welcome message, the conversation starters, and the skill names of the skills it can use |
| `appId`, `license` | Skills only: the Teams app id, and the skill's own license when it differs from the project's |
| `capabilities` | Tool declarations, empty for items made in the app |
| `copyright` | The project's free-text copyright line |
| `files` | The path and type of each of the item's own files |

The skill `name` is derived from the display name: lowercase letters, digits, and
single hyphens, at most 64 characters, never starting or ending with a hyphen.
Two items with the same name get a number at the end, so their folders stay
apart. `SKILL.md` has no HTML comment at the top because the standard requires
the YAML frontmatter to be the very first bytes. The license lives in the
`license` field and in `LICENSE.txt` instead.

Backups made by version 1 of the app were a single Agent Skill folder that
kept every field in the frontmatter metadata. The app no longer reads those
fields, so such a file opens as a plain skill. The maintainer script
`tools/migrate-library.mjs` converted the Library from version 1 to version 2
once (see [Add your assistant to the Library](how-to/add-to-library.md)).

### Opening files made elsewhere

Every file is untrusted input. The importers read structure and text only, and
everything passes through the same project normalizer before it reaches the
form.

- A root `plugin.json` with the Agentprise extension is a backup. Without the
  extension it is an Agent Plugins folder made elsewhere. One wrapping folder
  around the plugin is allowed.
- `.claude-plugin/plugin.json` is a Claude plugin and
  `.codex-plugin/plugin.json` is the Codex layout. Both read servers from
  `.mcp.json` or from `mcpServers` in the manifest, and both may name another
  skills folder in the manifest's `skills` path.
- A ZIP with one or more `SKILL.md` files and no plugin manifest is read as
  skills. Each folder with a `SKILL.md` becomes an item, and files outside
  every skill folder are kept as unrecognized.
- A plugin's `displayName` or `name`, `description`, `version`, `author`, and
  `license` fill in the project. Its `homepage`, `repository`, `keywords`, and
  `extensions` are kept, so the backup writes them back.
- MCP servers become project servers. Their `headers`, `env`, and `cwd`
  settings are dropped with a notice, because they can hold secrets. A local
  server's command is stored as text and never run.
- `hooks/`, `commands/`, `agents/`, and every other file the app does not
  understand are kept as unrecognized files, written back only into the
  backup, and never read or run. Programs are refused everywhere.
- A plugin or skill with no license field and no license file opens with the
  license `Not stated` and a notice. A license file alone gives
  `See LICENSE.txt`. The app never replaces either with its default license.

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
| SharePoint and OneDrive switch | `gptDefinition.capabilities[OneDriveAndSharePoint]`, always present and last: both lists empty when the switch is off, no lists when it is on with no limit, the lists when it is on with sources |
| SharePoint links a person pasted | `capabilities[OneDriveAndSharePoint].items_by_url[]` as `{url}` |
| SharePoint items from a Microsoft file | `items_by_sharepoint_ids[]` and `items_by_url[]`, every key as the builder wrote it (`url`, `name`, `site_id`, `web_id`, `list_id`, `unique_id`, `type`) |
| Web search, Teams messages, email, meetings, code interpreter, image generation | `gptDefinition.capabilities[]` named `WebSearch`, `TeamsMessages`, `Email`, `Meetings`, `CodeInterpreter`, `GraphicArt`, listed only when on |
| Web search sites | `capabilities[WebSearch].sites[].url`, at most four |
| Teams chats | `capabilities[TeamsMessages].urls[].url`, at most five |
| Mailboxes and folders | `capabilities[Email].group_mailboxes[]`, `shared_mailbox`, and `folders[].folder_id` |
| Meetings | `capabilities[Meetings].items_by_id[]` as `{id, is_series}`, at most five |
| Attached files | Nowhere. The export warns and leaves them out. |
| Prefer my files | `gptDefinition.behavior_overrides.special_instructions.discourage_model_knowledge` |
| Response mode | `gptDefinition.behavior_overrides.default_response_mode`, written only when it is not `Auto` |
| Everything else | `_agentprise` |

The SharePoint builder writes every source with `url`, `name`, `site_id`,
`web_id`, `list_id`, `unique_id`, and `type` (`File`, `Folder`, or `Site`),
files under `items_by_sharepoint_ids` and folders and sites under
`items_by_url`. Agentprise keeps each item whole and writes it back the same
way, because a file whose site entry had only `url` failed to load in a Teams
chat. Links a person pastes go out as `{url}` alone, since the app has no way
to look up the ids; whether Teams accepts those is an open test below. Every
list that limits a source is carried: Teams chats, mailboxes and folders, and
meetings go out exactly as the declarative agent schema spells them, and a
`null` list in a file, which the Copilot app writes for a source it did not
limit, reads as no limit.

Copilot honors a switch only when its capability is in the list, so a list
without `WebSearch` means web search is off, and the importer reads it that way
for any file that lists a switch or carries the `_agentprise` key. The SharePoint
builder lists only `OneDriveAndSharePoint`, so that entry never counts as a
switch: a file with no `_agentprise` key and no other capability was made there.
It opens with web search on and the other switches off, which is what people
expect once the file reaches a Teams chat. The SharePoint switch itself follows
the entry: both lists present and empty means off (the builder's shape for an
agent with no sources), no lists at all means on with no limit, and lists with
entries mean on with those limits. When the entries are pasted links, the
switch turns on only for links that pass the host check, so a file whose only
sources were links on other hosts opens with the switch off and a notice, never
wide open. Files written by earlier versions of Agentprise kept the five
switches inside `_agentprise` instead of the list, and the importer still reads
a switch that is on there.

New assistants start with web search, code interpreter, and image generation on,
and with SharePoint, Teams messages, email, and meetings off. Those four read
the asker's own files, chats, mail, and meetings, and in a group chat Teams
shows the asker a preview to approve before others see an answer built on them.
Microsoft documents that rule for Copilot in group chats; see Verified vendor
facts.

### The Teams app package

The Microsoft 365 Copilot app exports a ZIP with four files, plus any files that
were uploaded as knowledge, and that is what Agentprise writes:

```
manifest.json            Teams app manifest, schema 1.28
declarativeAgent_0.json  Declarative agent, schema v1.8
color.png                192 by 192 full-color icon
outline.png              32 by 32 white icon on a transparent background
guide.pdf                Any attached files, at the root, with no manifest entry
deploy.ps1.txt           A script or data file, renamed so Copilot accepts it
```

JSON and YAML entries at the root of a package are read as package metadata,
never as attached files. On import, a root file named `name.ext.txt` whose
inner type is an accepted text type gets its real name back, so a package this
app wrote round-trips exactly.

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
| SharePoint and OneDrive switch | `capabilities[OneDriveAndSharePoint]`, second in the list as the Copilot app writes it: omitted when off, bare when on with no limit, with lists when on with sources |
| SharePoint links and sites | `capabilities[OneDriveAndSharePoint].items_by_url[]` as `{url}` only, which is all the schema allows there |
| SharePoint files and folders stored by id | `items_by_sharepoint_ids[]` with `site_id`, `web_id`, `list_id`, `unique_id`, and the optional part and hub keys |
| Web search, Teams messages, email, meetings, code interpreter, image generation | `capabilities[]` named `WebSearch`, `TeamsMessages`, `Email`, `Meetings`, `CodeInterpreter`, `GraphicArt` |
| Web search sites | `capabilities[WebSearch].sites[].url`, at most four |
| Teams chats, mailboxes and folders, meetings | `capabilities[TeamsMessages].urls[]`, `capabilities[Email].group_mailboxes[]`, `shared_mailbox`, `folders[]`, and `capabilities[Meetings].items_by_id[]`, each present only when the source is limited |
| Attached files | At the ZIP root, exactly as the Copilot app's own export places them, with no entry in either JSON file. Only the types Copilot accepts go in: documents, `.onepart`, and `.txt`, with other text types renamed `name.ext.txt`; a `.one` file is left out with a warning |
| Prefer my files | `behavior_overrides.special_instructions.discourage_model_knowledge`, written only when on |
| Response mode | `behavior_overrides.default_response_mode`, written only when it is not `Auto` |
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
| Declarative agent schema 1.8: `WebSearch.sites` holds at most four https URLs with no query and at most two path segments; the items-by-URL object has only `url`; the items-by-IDs object has `site_id`, `web_id`, `list_id`, `unique_id`, `search_associated_sites`, `part_type`, `part_id`; `Email` is a capability; an `EmbeddedKnowledge` object exists but the Copilot app's export does not use it | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8), checked 2026-10-10 |
| Agent Builder takes up to four public site URLs, 100 SharePoint files, one SharePoint list, 50 OneDrive files, five Teams chats and five meetings, and 20 uploaded files; its documentation lists the upload types .doc, .docx, .ppt, .pptx, .xls, .xlsx, .pdf, and .txt; a pasted SharePoint link must include the site path and no query string, and a OneDrive link is a shared link | [Add knowledge sources in Agent Builder](https://learn.microsoft.com/microsoft-365/copilot/extensibility/agent-builder-add-knowledge), checked 2026-10-10 |
| The Copilot app's upload dialog also accepted `.onepart` (a OneNote page), so the app accepts `.one` and `.onepart` and sends only `.onepart` in the package | A tenant check on 2026-10-10 |
| Declarative agent schema 1.6 and later: `TeamsMessages.urls` holds at most five Teams links; `Email` takes `shared_mailbox`, `group_mailboxes` (at most 25), and `folders[].folder_id`; `Meetings.items_by_id` holds at most five `{id, is_series}`; schema 1.7 adds `behavior_overrides.default_response_mode` with the values `Auto`, `Quick response`, and `Think deeper` | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8), checked 2026-10-10 |
| The Copilot app's export of an agent with an uploaded file places the file at the ZIP root with no entry in either JSON file; its declarative agent lists, in this order, `WebSearch` with `sites`, `OneDriveAndSharePoint` with a file by id, `items_by_url: []`, and `additional_search_terms: null`, `TeamsMessages` with three `urls` (one team link carrying a query string), `Email` with `group_mailboxes` once a shared mailbox was added, `Meetings` with `items_by_id`, `CodeInterpreter`, and `GraphicArt`; it writes `actions: []`, `conversation_starters: []`, and `behavior_overrides: {special_instructions: null, default_response_mode: "Think deeper"}`; an earlier export wrote `urls: null` for an unlimited `TeamsMessages` | Test agents exported from the Copilot app on 2026-10-10 |
| The Teams client host is `teams.microsoft.com` in the commercial cloud, `gov.teams.microsoft.us` in GCC High, `dod.teams.microsoft.us` in DoD, and `teams.microsoftonline.cn` for 21Vianet; the app accepts Teams links on those hosts | [Plan for sovereign clouds](https://learn.microsoft.com/microsoftteams/platform/concepts/sovereign-cloud), checked 2026-10-10 |
| A OneNote section file starts with the file type GUID `{7B5C52E4-D88C-4DA7-AEB1-5378D02996D3}` and holds the file format GUID `{109ADD3F-911B-49F5-A5D0-1791EDC8AED8}` at byte 48 | [MS-ONESTORE header](https://learn.microsoft.com/openspecs/office_file_formats/ms-onestore/), checked 2026-10-10 |
| The SharePoint builder writes each source with `url`, `name`, `site_id`, `web_id`, `list_id`, `unique_id`, and `type` (`Site`, `Folder`, or `File`), files under `items_by_sharepoint_ids` and folders and sites under `items_by_url`; a `.agent` file whose site entry carried only `url` installed in a Teams chat but answered "this agent is not available" | Test agents exported from SharePoint on 2026-10-10 and a tenant test the same day |
| The app package needs `manifest.json`, a 192 by 192 `color.png`, and a 32 by 32 transparent `outline.png` | [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365) |
| `developer.name` is at most 32 characters; `websiteUrl`, `privacyUrl`, and `termsOfUseUrl` are required | [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer) |
| The Copilot app's own export uses manifest 1.28 and the four `validDomains` Agentprise copies | A Caveman package exported from the Copilot app on 2026-10-09 |
| The SharePoint `.agent` file (schema 0.2.0) has the shape Agentprise writes | A Caveman `.agent` file exported from SharePoint on 2026-10-09 |
| A `.agent` file with an extra top-level key loads and runs in Teams | Loaded in a real tenant on 2026-10-09 |
| In a Teams group chat, an answer that used the web, or only sources everyone in the chat can see, posts to everyone; an answer that used sources not everyone can see is shown first to the person who asked, with Approve and Reject | [How to use Microsoft Copilot in Teams group chats](https://support.microsoft.com/office/how-to-use-microsoft-365-copilot-in-teams-group-chats-2c613de4-cd26-4ae3-9e4b-6905d745d991), checked 2026-10-10 |
| A `.agent` file written by Agentprise that listed `WebSearch`, `TeamsMessages`, and `Meetings` answered from the web in a Teams group chat and asked the person who asked to approve each answer; a SharePoint-made file with no switches answered without approval and without the web | Tenant tests on 2026-10-10 |

### Tests run in this repository

- `npm test` on 2026-10-10: 149 tests pass. They include a project exported to
  the backup and opened again normalizing to an identical record, the closed
  Agent Plugins 1.0.0 shape of `plugin.json` and the schema and transport of
  `mcp.json`, imports of a Claude plugin, two Codex plugins, a generic Agent
  Plugins folder, and a version 1 bundle (which opens as a skill), a skill
  `.zip` of an assistant restoring its kind, starters, welcome message, icon,
  and Copilot settings, hostile project input, a synthetic copy of the Copilot
  app's 2026-10-10 export shape, and a check that every backup listed in
  `library/catalog.json` opens without notices, survives a backup round trip,
  and matches its catalog line.
- `node tools/migrate-library.mjs --check` on 2026-10-10 reported all 13
  Library entries as already version 2 and the catalog unchanged.
- The real Caveman `.agent` and Teams package exports both import. The `.agent`
  import returns every field, and the Teams import returns every field except the
  welcome message and starters (that export had none).
- The real Copilot app export of 2026-10-10 (a SharePoint file by id, three
  Teams chats, a group mailbox, a meeting, Think deeper, and a `.txt` upload)
  imports with no loss and writes back the same Copilot settings. The real
  SharePoint builder export with a file, a folder, and a site imports with the
  switch on and all three items.

### Tests that still need a real account

These are open. Record the date and result here when someone runs them.

- Upload a skill `.zip` made by Agentprise to a Gemini account and to a Claude
  account, and confirm both accept the `agentprise.json` file beside
  `SKILL.md`.
- Confirm the Claude upload path. The vendor fact above, checked 2026-10-09,
  says Settings, then Capabilities; the app's steps on the Inspect page say
  Customize, then Skills.
- Load a `.agent` file written by Agentprise, with `_license` and `_agentprise`,
  in a SharePoint library and in a Teams chat. The tenant test recorded above
  used a hand-edited file, not this app's output.
- Try a Teams package with an extra `LICENSE.txt` file inside. The app does not
  add one until this is known to work.
- Load a `.agent` file with `WebSearch` on and `TeamsMessages` and `Meetings`
  off in a Teams group chat, and confirm the answers post without the approve
  step.
- Open a SharePoint-made `.agent` file that has sources, download it again, and
  add it to a Teams chat. The items now keep every key the builder wrote.
- Add a `.agent` file whose only source is a link a person pasted, with no ids,
  to a Teams chat, to learn whether Teams accepts a link without ids.
- Upload a package that carries an attached file to the Copilot app and check
  whether the agent lists the file as knowledge. If it does not, the next step is
  the schema's `EmbeddedKnowledge` entry.
- Upload a package that carries a script, such as `deploy.ps1.txt`, to the
  Copilot app and check whether the agent lists it and can quote from it.
- Export an agent from the Copilot app with "My SharePoint files, folders, and
  sites" on and no specific items, to learn how the app spells an unlimited
  `OneDriveAndSharePoint` entry. Agentprise writes a bare entry and reads both
  lists empty as off.
- Attach a real `.onepart` file. The app checks it against the OneNote section
  header; if a real one is refused, the check needs the real header.
- Load a `.agent` file written by Agentprise that limits Teams messages to
  chats, email to a group mailbox, or meetings to ids, or that sets a response
  mode, in a Teams chat, and confirm each limit is honored.
- Load a `.agent` file with a bare `OneDriveAndSharePoint` entry (switch on, no
  limit) in a Teams chat and confirm it reads every file the person can see.

### Conclusion

Pick the download for the product you use, and download a backup if you are unsure.
Maintainers: keep the project backup lossless, keep each item folder a valid
Agent Skill, keep the Microsoft files free of extra keys where their schemas
forbid them, and update the tables above whenever a converter or importer
changes.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Add your assistant to the Library](how-to/add-to-library.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Plugins specification](https://agent-plugins.org/specification)
- [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8)
- [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365)
- [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer)
- [Gemini productivity overview](https://gemini.google/overview/productivity/)
- [Claude skills documentation](https://claude.com/docs/skills/how-to)

[Back to project README](../README.md)
