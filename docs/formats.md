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
| Gemini | Gemini, Download skill | A skill (`.zip`) |
| Claude | Claude, Download skill | The same skill (`.zip`) |
| ChatGPT | ChatGPT, Copy text | Text to paste |
| Gemini Notebook | Gemini Notebook, Download .md file | A `.md` file to add as a source |
| Another tool that reads Agent Skills | Download SKILL.md, on the Inspect page | A plain skill (`.skill.zip`) with nothing specific to this app |
| Nowhere yet, or you want to edit it later | Download Backup | The same `.zip` as Download skill |

The skill `.zip` is the complete copy. Drop it on the Workspace page any time to
change the assistant or download it for another product. The plain skill drops
the welcome message, the starters, the picture, and the Copilot settings, so it
is not a backup.

### What each download keeps

Everything you write survives in the skill `.zip`. The `.agent` file keeps
everything except attached files, which it has no place for. The app package
cannot carry two things, and the app tells you so before you download it:

- The welcome message. Copilot has no place for it in an app package.
- Your copyright line and license name. The package's files reject extra fields.

Copy text carries the name, description, instructions, and example questions,
which is everything ChatGPT and Gemini Notebook can take.

Settings that only Microsoft 365 Copilot understands, such as SharePoint
sources, the web site list, attached files, and what Copilot may use, travel in
every download that has room for them but are ignored by the other products.

Attached files can be Word, PowerPoint, Excel, PDF, or plain text, including
scripts and data files such as `.ps1`, `.py`, `.sql`, `.md`, `.csv`, and
`.json`. The app reads the first bytes of every file and refuses anything
that does not match its name, so a program renamed to `.pdf` never gets in.
Copilot accepts only the document types and `.txt` as uploads, so the app
package carries a script as plain text under its own name plus `.txt`, for
example `deploy.ps1.txt`. The skill `.zip` keeps the real name.

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
| Microsoft `.agent` | `.agent` | Yes | Yes | All but attached files | SharePoint libraries and Teams chats |
| Teams app package | `.zip` | Yes | Yes | No (see below) | The Microsoft 365 Copilot app |
| Copy-ready text | none, or `.md` | No | Copy buttons and a `.md` download | Not applicable | ChatGPT custom GPTs and Gemini Notebook |

The bundle, the Gemini upload, and the Claude upload are the same bytes, so
"Download skill" for Gemini, "Download skill" for Claude, and "Download Backup"
all produce the same file. Gemini and Claude have separate tabs on the Inspect
page because their skill support may diverge. In the app, the Teams app package
is labeled "Copilot / Teams Apps" and the `.agent` file is labeled "Teams Chat".

Every download is named after the assistant, such as `Caveman.zip`,
`Caveman.agent`, and `Caveman.md`. The app package adds "Copilot app" to its
name, as in `Caveman Copilot app.zip`, so the two `.zip` downloads never
overwrite each other. Inside the skill `.zip`, the folder keeps the skill name.

### The Agentprise bundle

The bundle is a ZIP holding one folder named after the skill:

```
caveman/
  SKILL.md       Required by the Agent Skills standard. Frontmatter plus instructions.
  icon.png       The full-color icon, when one was set.
  LICENSE.txt    The full GPL v3 text for the default license, or a short notice.
  README.md      Name, description, creator, and how to use the file.
  references/    Attached files, when there are any, under their real names.
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
| `sharepoint-sources` | SharePoint links a person pasted, one per line | |
| `sharepoint-items` | SharePoint items that came from a Microsoft file, as one JSON array; each has `by` (`id` or `url`) plus the keys the builder wrote | |
| `copilot-web-search` | Copilot capability on or off | `"true"` |
| `copilot-web-sites` | Sites web search is limited to, one per line, at most four | |
| `copilot-teams-messages` | Copilot capability on or off | `"true"` |
| `copilot-email` | Copilot capability on or off | `"false"` |
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
| SharePoint links a person pasted | `gptDefinition.capabilities[OneDriveAndSharePoint].items_by_url[]` as `{url}` |
| SharePoint items from a Microsoft file | `items_by_sharepoint_ids[]` and `items_by_url[]`, every key as the builder wrote it (`url`, `name`, `site_id`, `web_id`, `list_id`, `unique_id`, `type`) |
| Web search, Teams messages, email, meetings, code interpreter, image generation | `gptDefinition.capabilities[]` named `WebSearch`, `TeamsMessages`, `Email`, `Meetings`, `CodeInterpreter`, `GraphicArt`, listed only when on |
| Web search sites | `capabilities[WebSearch].sites[].url`, at most four |
| Attached files | Nowhere. The export warns and leaves them out. |
| Prefer my files | `gptDefinition.behavior_overrides.special_instructions.discourage_model_knowledge` |
| Everything else | `_agentprise` |

The SharePoint builder writes every source with `url`, `name`, `site_id`,
`web_id`, `list_id`, `unique_id`, and `type`, files under
`items_by_sharepoint_ids` and sites under `items_by_url`. Agentprise keeps each
item whole and writes it back the same way, because a file whose site entry had
only `url` failed to load in a Teams chat. Links a person pastes go out as
`{url}` alone, since the app has no way to look up the ids; whether Teams accepts
those is an open test below. A site that limits a source to certain chats,
folders, mailboxes, or meetings keeps the switch on and loses the list, with a
notice.

Copilot honors a switch only when its capability is in the list, so a list
without `WebSearch` means web search is off, and the importer reads it that way
for any file that lists a switch or carries the `_agentprise` key. The SharePoint
builder never lists a switch, so a file with no `_agentprise` key and no switch
was made there. It opens with web search on and the other switches off, which is
what people expect once the file reaches a Teams chat. Copilot can also limit
web search to at most four sites with a `sites` list, and Agentprise carries it.
Files written by earlier versions of Agentprise kept the five switches inside
`_agentprise` instead of the list, and the importer still reads a switch that is
on there.

New assistants start with web search, code interpreter, and image generation on,
and with Teams messages, email, and meetings off. Those three read the asker's
own chats, mail, and meetings, and in a group chat Teams shows the asker a
preview to approve before others see an answer built on them. Microsoft documents
that rule for Copilot in group chats; see Verified vendor facts.

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
| SharePoint links and sites | `capabilities[OneDriveAndSharePoint].items_by_url[]` as `{url}` only, which is all the schema allows there |
| SharePoint files and folders stored by id | `items_by_sharepoint_ids[]` with `site_id`, `web_id`, `list_id`, `unique_id`, and the optional part and hub keys |
| Web search, Teams messages, email, meetings, code interpreter, image generation | `capabilities[]` named `WebSearch`, `TeamsMessages`, `Email`, `Meetings`, `CodeInterpreter`, `GraphicArt` |
| Web search sites | `capabilities[WebSearch].sites[].url`, at most four |
| Attached files | At the ZIP root, exactly as the Copilot app's own export places them, with no entry in either JSON file |
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
| Declarative agent schema 1.8: `WebSearch.sites` holds at most four https URLs with no query and at most two path segments; the items-by-URL object has only `url`; the items-by-IDs object has `site_id`, `web_id`, `list_id`, `unique_id`, `search_associated_sites`, `part_type`, `part_id`; `Email` is a capability; an `EmbeddedKnowledge` object exists but the Copilot app's export does not use it | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8), checked 2026-10-10 |
| Agent Builder takes up to four public site URLs, 100 SharePoint files, 50 OneDrive files, and 20 uploaded files of type .doc, .docx, .ppt, .pptx, .xls, .xlsx, .pdf, or .txt | [Add knowledge sources in Agent Builder](https://learn.microsoft.com/microsoft-365/copilot/extensibility/agent-builder-add-knowledge) and [agent details in the admin center](https://learn.microsoft.com/microsoft-365/admin/manage/agent-details), checked 2026-10-10 |
| The Copilot app's export of an agent with an uploaded file places the file at the ZIP root with no entry in either JSON file; its declarative agent lists `WebSearch` with `sites`, `TeamsMessages` with `urls: null`, `Email`, and a SharePoint file by id with only the four id keys | A test agent exported from the Copilot app on 2026-10-10 |
| The SharePoint builder writes each source with `url`, `name`, `site_id`, `web_id`, `list_id`, `unique_id`, and `type` (`Site` or `File`), files under `items_by_sharepoint_ids` and sites under `items_by_url`; a `.agent` file whose site entry carried only `url` installed in a Teams chat but answered "this agent is not available" | A test agent exported from SharePoint on 2026-10-10 and a tenant test the same day |
| The app package needs `manifest.json`, a 192 by 192 `color.png`, and a 32 by 32 transparent `outline.png` | [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365) |
| `developer.name` is at most 32 characters; `websiteUrl`, `privacyUrl`, and `termsOfUseUrl` are required | [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer) |
| The Copilot app's own export uses manifest 1.28 and the four `validDomains` Agentprise copies | A Caveman package exported from the Copilot app on 2026-10-09 |
| The SharePoint `.agent` file (schema 0.2.0) has the shape Agentprise writes | A Caveman `.agent` file exported from SharePoint on 2026-10-09 |
| A `.agent` file with an extra top-level key loads and runs in Teams | Loaded in a real tenant on 2026-10-09 |
| In a Teams group chat, an answer that used the web, or only sources everyone in the chat can see, posts to everyone; an answer that used sources not everyone can see is shown first to the person who asked, with Approve and Reject | [How to use Microsoft Copilot in Teams group chats](https://support.microsoft.com/office/how-to-use-microsoft-365-copilot-in-teams-group-chats-2c613de4-cd26-4ae3-9e4b-6905d745d991), checked 2026-10-10 |
| A `.agent` file written by Agentprise that listed `WebSearch`, `TeamsMessages`, and `Meetings` answered from the web in a Teams group chat and asked the person who asked to approve each answer; a SharePoint-made file with no switches answered without approval and without the web | Tenant tests on 2026-10-10 |

### Tests run in this repository

- `npm test` on 2026-10-10: 92 tests pass, including a round trip of a sample
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

### Conclusion

Pick the download for the product you use, and download a backup if you are unsure.
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
