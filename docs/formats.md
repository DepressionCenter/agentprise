<!--
This file is part of Agentprise
docs/formats.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-22
Summary: What each Agentprise download is for and what it keeps, written for
         people using the app, followed by the technical details maintainers
         need: field mappings, tools, conversion reports, vendor facts with
         check dates, and open tests.
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
| A Teams group chat, channel, or meeting | Teams Chat | One `.agent` file (Microsoft retires this file type after March 2027) |
| Gemini | Gemini | A skill (`.zip`) |
| Claude | Claude | A skill (`.zip`) |
| A ChatGPT project | ChatGPT, Copy | Project instructions to paste |
| Gemini Notebook | Gemini Notebook | A `.md` file to add as a source |
| Another tool that reads Agent Skills, such as Claude Code, Codex, Kimi Code CLI, or OpenClaw | SKILL.md | A plain skill (`.skill.zip`) with nothing specific to this app |
| Claude (claude.ai, Cowork, or Claude Code), with every assistant, skill, and tool in the project | Claude plugin | One plugin (`.claude-plugin.zip`) |
| ChatGPT, Codex, GitHub Copilot, Cursor, OpenClaw, or another tool that reads Agent Plugins, with every assistant, skill, and tool in the project | Plugin | One plugin (`.plugin.zip`) |
| Nowhere yet, or you want to edit it later | Download Backup | The whole project as one `.agentprise.zip` |
| A skill for an existing Copilot assistant | More Microsoft downloads, then Add a skill to Copilot | One skill with `SKILL.md` at the ZIP root (`.copilot-skill.zip`) |
| A Copilot assistant in an organization with native skills enabled | More Microsoft downloads, then Copilot app with skills | An app package with separate skill folders (`.zip`) |
| Copilot Cowork in Microsoft 365 | More Microsoft downloads, then Microsoft 365 plugin | The whole project as optional skills and supported tool connections (`.microsoft-plugin.zip`) |

The first seven standard downloads are for one assistant or skill: the one named at the
top of the Download card. The two plugins sit under **For the whole project**,
because each one holds every assistant and skill in the project, with the
tools they use. The backup is the complete copy of the whole project, with
every assistant, skill, and file in it. Drop it on the Workspace page any time
to change the project or download it for another product.

**More Microsoft downloads** is optional. Choose **Review** to see what changes
and what needs setup before downloading. **Add a skill to Copilot** uploads one
selected skill to an existing assistant through Agent Builder.
**Copilot app with skills** includes the
selected assistant and its selected skills. **Microsoft 365 plugin** includes
the whole project, turning assistants into optional skills for Copilot Cowork.
Keep using **Copilot / Teams Apps** if your organization has not enabled native
skills. Neither new download runs a tool or contacts Microsoft from Agentprise.

The backup is meant for Agentprise, so use a skill or plugin download when you
want to upload to a product. The plain skill drops the welcome message, the
starters, the picture, and the Copilot settings, so it is not a backup either.

### What each download keeps

The backup keeps everything in the project. The skill `.zip` for Gemini and
Claude keeps everything about one assistant or skill, so Agentprise can open
it again. It leaves out only what belongs to the whole project: the other
assistants and skills, your organization, and the version number. The Gemini
skill also leaves out Word, Excel, PowerPoint, and OneNote files, because
Gemini skills do not accept them. The `.agent` file keeps everything about one
assistant except attached files, which it has no place for. The app package
cannot carry two things, and the app tells you so before you download it:

- The welcome message. Copilot has no place for it in an app package.
- Your copyright line and license name. The package's files reject extra fields.

The ChatGPT download is one box of project instructions to paste. Gemini
Notebook gets the name, description, instructions, and example questions,
which is everything it can take.

The Claude and generic Plugin downloads keep each assistant and skill as a skill folder, the tool
servers the product can reach, a `README.md`, a `LICENSE.txt`, and a
`SETUP.md` when something needs setting up. Agentprise can open either
plugin again. The Plugin download brings back the whole project, and the
Claude plugin brings back its assistants, skills, and tool servers.

**Products it works in**, the setting that turns off the downloads for a
product, is kept by the backup, the skill `.zip`, and the plugins. The plain
skill has no place for it, so a plain skill opened again works in every
product.

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

### Assistants, skills, and products that have only one of them

Some products have skills but no separate place for an assistant, and some
have the opposite. Agentprise changes the item to fit, and the report says so.

- In the Claude and Gemini skills, the plain skill, and both plugins, an
  assistant becomes a skill whose description starts with "Persona:".
- In the Copilot app package, the Teams Chat file, the ChatGPT project
  instructions, and the Gemini Notebook file, a skill becomes an always-on
  assistant, and its steps become the instructions.
- When an assistant uses skills, those same four downloads add each skill's
  steps to the assistant's instructions under a heading such as
  "Skill: Meeting notes". When the steps do not fit in Copilot's limit of
  8,000 characters, the app package carries them as an attached file instead.
  The Teams Chat file cannot carry files, so a skill that does not fit is left
  out there, with its tools.
- A skill ZIP holds only one item. When an assistant uses skills, download each
  skill too, or use a plugin, which holds them all.

### How tools travel in each download

Some assistants and skills use tools, such as a search of PubMed. A tool can
reach a product in five ways: a connector the product offers, a tool server on
the web or on the computer, an action built from a web service description, a
script inside the skill, or web search limited to a few sites. Each tool lists
the ways it works in each product, in order. The **Tools** list in the editor
shows them.

This table shows what each download does with each kind of tool. "Written in"
means the download sets the tool up. "Named only" means the instructions
mention the tool, and you connect it in the product yourself.

| Kind of tool | Copilot app package | Teams Chat | ChatGPT project instructions, Gemini Notebook | Claude, Gemini, and plain skills | Claude plugin | Plugin |
|---|---|---|---|---|---|---|
| Connector | Named only | Named only | Named only | Named only | Named only | Named only |
| Tool server | Written in as an action, for servers on the web | Left out | Named only | Named only | Written in, for servers on the web | Written in, for servers on the web or the computer |
| Action from a web service description | Written in as an action | Left out | Named only | Named only | Left out | Left out |
| Script in the skill | Left out | Left out | Left out | Travels with the skill | Travels with the skill | Travels with the skill |
| Web search on a few sites | Written in as Copilot web search | Written in as Copilot web search | Named only | Named only | Named only | Named only |

Gemini skills cannot run a script that reaches the internet, so a script that
does travels in the Gemini skill but works only elsewhere. Every download
also writes a section into the instructions called **Tools available in this
setup**. It lists each tool, the ways to reach it, what to do when none works,
and a rule: "Only report a search, lookup, or retrieval as completed when a
tool returned results in this conversation." When that section does not fit in
Copilot's limit, each tool gets one line, and the app package carries the full
notes as an attached file called `tool-notes.md.txt`. The Teams Chat file
cannot carry files, so it keeps only the one-line notes.

To finish connecting the tools after you download, see
[Connect the tools in a download](how-to/connect-tools.md).

### The report for each download

Every download has a report on the Inspect page, in the list called
**What changes in this download**. Each line gets one of five labels: kept,
changed, needs setup, left out, or blocked. The skill ZIPs and the plugins
repeat the report in `README.md`, under **What changed in this export**.

A blocked download cannot be made, and its button stays off. These are the
reasons:

- A tool limits Copilot web search to more than four sites.
- The tools' sites and your own web search sites together are more than four.
- The instructions, with skill steps and tool notes, are longer than Copilot
  allows.
- The download would drop a list that limits a Copilot source, which would let
  the assistant use the whole source.
- The author marked the assistant or skill as not for this product under
  **More settings**, then **Products it works in**. A whole-project plugin is
  blocked this way only when every item in the project is marked; otherwise it
  leaves the marked items out.

### What to do with the file

**Copilot / Teams Apps.** In the Microsoft 365 Copilot app or in Teams, choose
Agents, then Upload (or Create, then Upload), and pick the `.zip` file. Choose
Share to give it to other people. Your admin may need to allow custom agents. To
update it later, upload the new file in place of the old one. When the package
includes actions, the setup steps on the Inspect page say what your admin must
allow.

**Teams Chat.** Upload the `.agent` file to a SharePoint document library. Open
the file's menu, choose Copy link for Teams, paste the link in a Teams chat, and
choose Add to this chat. People in the chat need a Copilot license and permission
to any files you linked. Microsoft retires `.agent` files after March 2027, and
files already in use keep answering until then.
[When Microsoft retires this file](how-to/add-an-assistant-to-a-teams-chat.md#when-microsoft-retires-this-file)
says what to use instead. Agentprise keeps opening `.agent` files after that
date, so you can always recover what a file holds. Do not upload the file to
Copilot Agent Builder: files uploaded there become reading material for a new
agent, not its settings.

**Skill (.zip).** In Gemini, open Settings, then Skills, then Upload, and pick
the `.zip` file. Gemini skills work with personal Google accounts for now, not
work or school accounts. In Claude, open Customize, then Skills, choose the
plus button, then Create skill, then Upload a skill, and pick the `.zip` file.
Then turn the skill on. Claude skills need a paid plan with code execution on.

**ChatGPT.** Open a project in ChatGPT, or create one in the sidebar. Open the
project's menu, then Project settings, and paste the box into Instructions.
Add any files the assistant uses to the project yourself. For skills and
tools in ChatGPT, use the Plugin download instead.

**Gemini Notebook.** Open the notebook, then More, then Notebook settings, and
paste the instructions, or add the `.md` file as a source.

**Claude plugin.** In claude.ai or the Claude desktop app, open Customize,
then Plugins. Choose Add, then Upload plugin, and pick the `.zip` file. Then
open the plugin's Connectors tab to connect any tool servers. Plugins need
Skills turned on for your organization.

**Plugin.** In ChatGPT, a workspace owner, or someone allowed to upload
plugins, opens the Admin console, then Plugins, chooses Add, then Upload
plugin, and picks the `.zip` file. In Codex, GitHub Copilot, Cursor,
OpenClaw, and similar tools, unzip the file and add the folder as a plugin,
following the tool's own steps.

**Plain skill (.skill.zip).** Unzip the file where your tool looks for skills,
such as the `.agents/skills` folder of a project.

- In OpenClaw, or a Kimi Claw you run yourself, unzip it into the `skills`
  folder of your OpenClaw workspace. Or unzip it anywhere and run
  `openclaw skills install` with the path to the folder.
- In Kimi Code CLI, unzip it into the `.agents/skills` folder of your project,
  or into `.kimi-code/skills` in your home folder to use it in every project.

Kimi chat, Kimi Agent mode, and the Kimi Claw that Kimi hosts for you have no
way to upload a skill file today. They offer skills only from Kimi's own list,
from ClawHub, or made inside Kimi.

**Backup (.agentprise.zip).** Keep it somewhere safe, because browsers can
clear what they store. Drop it on the Workspace page to open the project
again.

If a download holds a `SETUP.md` file, follow its steps too.

### Opening a file you already have

Agentprise opens any of its own downloads, plus files made elsewhere:

- A `.agent` file exported from SharePoint.
- A `.zip` exported from the Microsoft 365 Copilot app, or another Microsoft
  365 app package with assistants, skills, or connectors, such as a Copilot
  Cowork plugin.
- Any Agent Skill `.zip` or `SKILL.md` file. A `.zip` with several skills
  inside opens with each one as its own skill.
- A plugin `.zip` in the Agent Plugins format, a Claude plugin, or a Codex
  plugin. Its skills become skills in the project, and its tool servers are
  kept with the project.

Drop the file on the drop area of the Workspace page, or use the Choose a file
button there. Each file opens as a new project. When the same project is already
in your workspace, the app asks whether to keep both or replace yours. To add a
file's skills to the project you have open instead, choose Add from a file in
the project.

When you open a skill `.zip` or a plugin that Agentprise made, the app takes
out the **Tools available in this setup** section and the "Persona:" start of
the description, because it writes those again for each download. The plain
skill has no record of what was added, so it opens with that text in place.

A Microsoft 365 app package opens like this:

- Each assistant in it becomes an assistant in the project. Its actions become
  tools, as long as the action calls a tool server on the web or uses an API
  description inside the package. Download the Copilot app package again and
  the actions come back the same.
- Skills the package lists become skills. When an assistant lists a skill, it
  uses that skill in the project too.
- Connectors become tool servers for the whole project, under **More
  settings**, then **Tool connections**. A download includes a server only
  when a tool uses it. The backup always keeps them.
- A package with more than one assistant opens with all of them, and each one
  downloads as its own Copilot app package.
- Sign-ins keep their kind, such as OAuth, but not their registration, which
  belongs to the organization the package came from. Your admin registers the
  sign-in again where you install it.
- Anything else, such as a local plugin or a skill folder the package doesn't
  list, is kept in the backup only, in a folder called `microsoft-package`. A
  message lists each part that was left out and why.
- A file that looks like it holds a password, key, or token is left out, and
  so is a server address with a key in it.
- An assistant whose file appears to contain a key is left out. Remove the
  key from the source file and open the package again.
- If the package's `manifest.json` appears to contain a key, the whole
  package is refused. Remove the key and open the package again.
  A key in an action's description file leaves that action out too.
- Assistants open with the license "Not stated", because the package has no
  place to declare one. This also applies to packages made by Agentprise.
- When an assistant came from an Agentprise download, its instructions still
  end with the old **Tools available in this setup** list. A message reminds
  you to delete it, because the next download writes the list again.

Plugins sometimes carry hooks, commands, agents folders, or other files
Agentprise does not understand. The app keeps them with the project and writes
them back only into the backup. It never reads or runs them, and it never
keeps a program. A skill or plugin that names no license opens with the
license "Not stated" and a note, so you can check with its author before you
share it.

A skill keeps its own tool server settings when a plugin has a server with
the same name. If the settings differ, the plugin's server gets a numbered
name, and both are kept.
When two imported skills use the same server name for different settings,
the second server gets a numbered name and that skill's tools use it.

## For maintainers

The rest of this page records how each file is built, the vendor facts the
converters rely on with the date each was checked, and the tests that still need
a real account. Read it before changing any converter in `index.html`.

### The formats at a glance

| Format | File | Opens in Agentprise | Downloads from Agentprise | Keeps every field | Who it is for |
|---|---|---|---|---|---|
| Agentprise project backup (Agent Plugins 1.0 folder) | `.agentprise.zip` | Yes | Yes | Yes, for the whole project | Keeping a project to edit later |
| Skill (Agent Skill folder with a sidecar) | `.zip` | Yes | Yes | Yes for one item, without the project's organization and version | Gemini and Claude |
| Plain skill | `.skill.zip` | Yes | Yes | Standard Agent Skills fields only | Any tool that reads Agent Skills, such as Claude Code, Codex, Kimi Code CLI, and OpenClaw |
| Claude plugin | `.claude-plugin.zip` | Yes, as skills and servers | Yes | No: instructions are composed for Claude, and local servers are left out | claude.ai, Cowork, and Claude Code |
| Plugin (Agent Plugins 1.0 folder with the project record) | `.plugin.zip` | Yes, as a project | Yes | No: instructions are composed for ChatGPT | ChatGPT, Codex, GitHub Copilot, Cursor, OpenClaw |
| Agent Plugins folder, Claude plugin, or Codex plugin made elsewhere | `.zip` | Yes | As the backup or either plugin | Skills and servers; everything else is kept as unrecognized files | Bringing a plugin into a project |
| Microsoft `.agent` | `.agent` | Yes | Yes | All but attached files | SharePoint libraries and Teams chats |
| Teams app package, or another Microsoft 365 app package | `.zip` | Yes, as a project with its assistants, actions, skills, and connectors | Yes, one assistant per package | No (see below) | The Microsoft 365 Copilot app and Copilot Cowork |
| Copy-ready text | none, or `.md` | No | Copy buttons and a `.md` download | Not applicable | ChatGPT projects and Gemini Notebook |

The Gemini skill and the Claude skill share one folder layout, but each is
composed for its own product, so their instructions and reports can differ.
The Gemini skill also leaves out Office and OneNote files. The backup holds
the whole project, and so do the plugin downloads. The native Copilot package
also includes the selected assistant's skills. Other downloads hold one
item. In the app, the baseline Teams app package is labeled "Copilot / Teams Apps" and
the `.agent` file is labeled "Teams Chat".

Every one-item download is named after the item, such as `Caveman.zip`,
`Caveman.skill.zip`, `Caveman.agent`, and `Caveman.md`. The app package adds
"Copilot app" to its name, as in `Caveman Copilot app.zip`, so the `.zip`
downloads never overwrite each other. Inside the skill `.zip`, the folder keeps
the skill name. The whole-project files are named after the project in skill
name form: `caveman.agentprise.zip`, `caveman.claude-plugin.zip`, and
`caveman.plugin.zip`.

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
server whose address the installer must supply is written with the placeholder
address `https://example.com/replace-with-your-mcp-server-address`, which the
importer reads back as empty. The app writes these files and never runs or
contacts the servers.

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
  agentprise.json  Every Agentprise setting the standard has no place for.
  icon.png         The full-color icon of an assistant, when one was set.
  LICENSE.txt      The full GPL v3 text for the default license, or a short notice.
  README.md        Skill .zip and plain skill only: name, description, creator, how to use the file, and the conversion report.
  SETUP.md         Skill .zip and plain skill only, when a tool needs setup.
  references/      Attached files, when there are any, under their real names.
```

A skill brought in from elsewhere keeps its own `LICENSE.txt` and `README.md`,
and keeps its other files in their own folders, such as `scripts/`, when they
are types the app accepts for attachments. Any other file in the folder that is
not a program is kept as an unrecognized file, which only the backup writes
back. The plain skill
(`.skill.zip`) is the same folder without `agentprise.json` or `icon.png`, and
its `SKILL.md` carries only the standard fields.

In the backup, `SKILL.md` holds the item's own text. In every other download
it holds the composed instructions for that product (see "Composed
instructions" below), and the description of an assistant written as a skill
starts with `Persona: `.

`SKILL.md` keeps the fields the Agent Skills standard defines (`name`,
`description`, `license`, and for a skill `compatibility` and `allowed-tools`)
at the top level. `compatibility` is the "What it needs to work" field. Its
`metadata` holds one Agentprise key, `agentprise-kind`, set to `agent` or
`skill`, so a tool that reads only `SKILL.md` still knows an assistant from a
skill. A skill's own metadata from elsewhere is kept next to it as it was.
Gemini and Claude ignore metadata they do not know.

Every other Agentprise setting for the item is in `agentprise.json`, which
sits next to `SKILL.md`. Keeping them there, as ordinary JSON values, means
the folder stays a valid Agent Skill, since the standard allows only text
values under `metadata`, and a folder copied out of a project stays complete.
The file starts with a `_license` key, like the other JSON files the app
writes.

| Key | Holds |
|---|---|
| `schemaVersion` | `2` |
| `kind` | `agent` or `skill` |
| `id` | The item's UUID |
| `name` | The name people see, with capitals and spaces |
| `welcome`, `starters`, `uses` | Assistants only: the welcome message, the conversation starters, and the skill names of the skills it can use |
| `sharepointLinks` | Assistants only: SharePoint links a person pasted, as a list |
| `sharepointItems` | Assistants only: SharePoint items that came from a Microsoft file; each has `by` (`id` or `url`) plus the keys the builder wrote |
| `copilot` | Assistants only: the Copilot settings, described in the next table |
| `appId`, `license` | Skills only: the Teams app id, and the skill's own license when it differs from the project's |
| `capabilities` | The item's tool declarations (see "Tools" below), empty when it has none |
| `notFor` | Only when set: the products the author marked the item as not for, from `copilot`, `claude`, `chatgpt`, `gemini`, and `cli` (coding tools) |
| `notForReason` | Only when set: the author's reason, up to 200 characters |
| `copyright` | The project's free-text copyright line |
| `creator` | The project's publisher details, shown in the Teams manifest: `name`, `url`, `privacy`, and `terms` |
| `files` | The path and type of each of the item's own files |
| `composed` | `true` in every export that writes this file except the backup, so a reader knows `SKILL.md` holds composed text and takes the tools section and the `Persona: ` prefix back out |
| `servers` | Exports only: the project servers this item's tools name, so a folder copied out alone keeps them |

| `copilot` key | Holds | Example |
|---|---|---|
| `webSearch`, `teamsMessages`, `email`, `meetings`, `codeInterpreter`, `imageGeneration` | Each Copilot capability, on or off | `true` |
| `sharepoint` | The SharePoint and OneDrive capability, on or off | `false` |
| `webSites` | Sites web search is limited to, at most four | `["https://example.org"]` |
| `teamsLinks` | Teams chats the source is limited to, at most five | |
| `mailboxes` | Shared or group mailboxes email is limited to, at most 25 | `["lab-team@example.org"]` |
| `sharedMailbox` | One shared mailbox address that came from a file | |
| `emailFolders` | Folder ids that came from a file | `["inbox"]` |
| `meetingItems` | Meetings the source is limited to, as `{id, is_series}`, at most five | |
| `preferMyFiles` | Tell Copilot to answer from the sources, not its own knowledge | `false` |
| `responseMode` | `Auto`, `Quick response`, or `Think deeper` | `"Auto"` |
| `appId` | The Teams app id, kept so re-exports update the same app | |

Files written before 2026-10-11 keep these settings in `SKILL.md` metadata
instead, as text: `sharepoint-sources` and `copilot-web-sites` hold one link
per line, `sharepoint-items` and `copilot-meeting-items` hold a JSON list, the
switches hold `"true"` or `"false"`, and the publisher details are
`creator-name`, `creator-website`, `creator-privacy`, and `creator-terms`. The
other keys are `copilot-` followed by the setting name in lowercase with
hyphens, such as `copilot-prefer-my-files`. The app still reads these keys
when `agentprise.json` does not have the setting, so those files open the same
as before. An old assistant without `copilot-sharepoint` reads as having
SharePoint on when it has SharePoint links or items, and off otherwise.

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

### Tools: capabilities, providers, and servers

An item declares tools as capabilities. The app has no form for writing a new
one; capabilities arrive with Library entries and imported files and pass
through `normalizeCapability` and `normalizeProvider`. The editor shows them
as **Tools** cards and lets a person remove the item's own tools, and the
**Tool connections** section under More settings lists the project servers.

| Capability field | Holds |
|---|---|
| `id` | A stable id such as `pubmed.search`, owned by the declaring entry |
| `label`, `description` | What people see in the Tools card and what the instructions say the tool does |
| `required` | `true` when the item cannot do its main job without the tool; the report then says so wherever no route works |
| `fallback` | What to do when no route works; the default is "No tool for this is connected in this setup. Say so plainly and offer what you can do without it." |
| `providers` | A map from target to an ordered list of routes. Targets are `copilot`, `claude`, `chatgpt`, `gemini`, `cli`, and `*` for any other |

Each route is a provider of one kind from a closed list (`PROVIDER_KINDS`).
Every kind except `none` may carry `instructions`, which are added to the
composed instructions under that route.

| Kind | Fields | Meaning |
|---|---|---|
| `connector` | `name` | A connector the product offers, such as PubMed in Claude |
| `mcp` | `server`, `tools` | A project server by name, optionally limited to some of its tools |
| `openapi` | `spec`, `operations`, `auth` | An OpenAPI description among the item's files and the operation ids to use |
| `script` | `path`, `runtime` | A script among the item's files |
| `websearch` | `sites` | Web search limited to https sites with no query and at most two path segments |
| `none` | | No route on this target |

Each export reads one target's routes. The Copilot app package and the Teams
Chat file read `copilot`, the Claude skill and the Claude plugin read
`claude`, the ChatGPT text and the Plugin download read `chatgpt`, the Gemini
skill and Gemini Notebook read `gemini`, and the plain skill reads `cli`. A
target with no list falls back to `*`.

A project server (`servers` in the project record) has `label`, `transport`
(`http`, `sse`, or `stdio`), `userSupplied`, `auth` (`none`, `oauth`, or
`apikey`), and `tools`. A web server has a `url`; a local one has a `command`
(a program name or a relative path, never one with `..`) and `args`. `cleanServerUrl` keeps an
address only when it is https with no user name, password, or fragment, and
no query parameter named like a key, token, secret, password, or signature.
The editor's **Address of the** box uses the same check.

`PROVIDER_SUPPORT` decides what each export does with each kind: `tool` writes
it into the download, `text` names it in the instructions for the installer to
connect, and `omit` leaves it out with a report entry.

| Kind | `teamsZip` | `msAgent` | `chatgpt`, `notebook` | `claude`, `gemini`, `skill` | `claudePlugin` | `portablePlugin` |
|---|---|---|---|---|---|---|
| `connector` | text | text | text | text | text | text |
| `mcp` | tool (web servers, no API key) | omit | text | text | tool (web servers) | tool |
| `openapi` | tool | omit | text | text | omit | omit |
| `script` | omit | omit | omit | tool | tool | tool |
| `websearch` | tool | tool | text | text | text | text |

### Composed instructions

`planExport` builds everything one export of one item writes and reports, and
both `composeInstructions` and `conversionReport` read it, so the text and the
report always agree. The composed text is, in order:

1. The item's own instructions or steps.
2. For an export without skills (`teamsZip`, `msAgent`, `chatgpt`,
   `notebook`), each used skill under `## Skill: <name>`, with a
   "Use this when:" line from its description.
3. A line for each skill that moved to an attached file.
4. `## Tools available in this setup`, with one `###` section per tool: its
   description, "Use the first of these that is available in this
   conversation:", the usable routes as a numbered list with their
   instructions, and "If none of them is available:" followed by the
   fallback. A tool with no usable route gets only its fallback. The section
   ends with "Only report a search, lookup, or retrieval as completed when a
   tool returned results in this conversation."

Tool labels are put on one line, and a `#` at the start of any line of tool
text is escaped, so tool text cannot add headings of its own. For an export
without skills, the tools of used skills are listed too.

Copilot's 8,000-character limit applies to the app package and the Teams Chat
file. The planner fits text in this order:

1. Used skills are inlined while the whole text fits.
2. A skill that does not fit moves to `references/<skill-name>.md` in the app
   package, which carries it as `<skill-name>.md.txt`. The Teams Chat file
   cannot carry files, so the skill is left out with its tools and the plan is
   made again without it.
3. In the app package, a skill item whose own steps exceed the limit moves
   its steps to an attached file, and the instructions point at it.
4. If the text is still too long, each tool shrinks to one line, and the app
   package carries the full tool section as `tool-notes.md.txt`. The Teams
   Chat file gets the one-line notes only.
5. If the text is still too long, the export is blocked.

The other exports have no limit. In the app package, the files of used skills
travel as attached files, and a file a tool names, such as an OpenAPI
description, travels as that tool's own file instead of as knowledge.

### Conversion report

Each report entry has a `component`, a `status` from `REPORT_STATUSES`, and a
plain note. The interface and the READMEs show the statuses as plain words.

| Status | Shown as | Used for |
|---|---|---|
| `preserved` | kept | A route written into the download, or web search that already covers the whole web |
| `transformed` | changed | An assistant written as a skill, a skill written as an assistant, skill steps inlined or attached, shortened tool notes, web search sites added, publisher placeholders, renamed Copilot files |
| `requires-setup` | needs setup | Connectors, servers named only in text, placeholder server addresses, Copilot sign-in ids, scripts on Claude and Gemini, a used skill that travels in its own download, files the copied text cannot carry |
| `unsupported` | left out | Routes the export cannot use, a required tool with no usable route, the welcome message and license in the app package, file types a product refuses, files over Copilot's count, actions over 10 |
| `blocked` | blocked | See below |

An export is blocked, and `assertNotBlocked` refuses to write it, when:

- a Copilot `websearch` route lists more than four sites;
- the sites the tools need, merged with the assistant's own web search list,
  are more than four;
- the composed instructions are still over the limit after every step above;
- `widenedSources` finds that the Copilot writer would drop a list that limits
  web search sites, Teams chats, mailboxes, or SharePoint sources while the
  switch is on.

The download button is disabled while its report has a blocked entry, and the
Inspect page shows a "Blocked" file in place of the output. The plugin
reports combine every item's report, each line prefixed with the item name.
`README.md` in skill ZIPs and plugins repeats the report under
`## What changed in this export`.

### Setup guide

`writeSetupGuide` writes `SETUP.md` from the setup steps the plans collected,
one section per distinct step, worded for the export's product. Skill ZIPs and
plugins carry it as a file. The app package has no place for it, so the
Inspect page shows it as "Setup steps (not in the package)". Sections:

- **Turn on the connector**, with Claude, Copilot, and generic wording.
- **Add the address of your server**, naming the file to edit (`.mcp.json`,
  `mcp.json`, or `plugin-<namespace>.json inside the app package`) and the
  placeholder to replace.
- **Connect the server**, for servers named only in text.
- **Register the sign-in**, for Copilot actions whose auth is not `none`: an
  admin registers it, for example in the Teams Developer Portal, and the
  installer replaces `replace-with-your-auth-registration-id`.
- **Let the script reach the internet**, naming up to five https hosts found
  in the script (`hostsInText`), with Claude, Gemini, and coding-agent
  wording.
- **Allow custom apps in Microsoft 365**, when the app package has actions.

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

Microsoft is retiring the format. From mid-November 2026, SharePoint and
OneDrive stop saving new agents as `.agent` files and show an
"Upgrade to Microsoft 365 agent" button to anyone with edit permission on the
file who can also share agents, usually the file's owner, its creator, or a
site owner. Existing files keep answering until
the end of March 2027 and then stop responding. After an upgrade the original
file can no longer be edited, sharing and usage history do not transfer, and a
Teams chat needs the upgraded agent added again by its sharing link. Each form
of the agent has its own editing route: the legacy file is edited in the
SharePoint agent builder (or by opening it in Agentprise and downloading it
again), an upgraded agent is edited in Copilot Agent Builder, and an agent in
the Copilot app is updated by uploading a new app package. Uploading a `.agent`
file into Agent Builder is not an editing or import route: files uploaded there
become embedded knowledge for a new agent and never set it up. Agentprise keeps
reading and writing the format past the retirement date, so what a file holds
can always be recovered and moved. The dated sources are under Verified vendor
facts.

The instructions are the composed text for `msAgent`. A `websearch` route adds
its sites to `WebSearch.sites` the same way as in the app package (see below).
Whether a Teams chat honors `WebSearch.sites` in a `.agent` file is open test
V3.

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
without `WebSearch` means web search is off, and the importer reads every file
that way. The SharePoint builder lists only `OneDriveAndSharePoint`, so that
entry never counts as a switch: a file with no `_agentprise` key and no other
capability was made there. It opens with every switch off, so the assistant
matches the file, and a notice says web search starts off and where to turn it
on. The importer never turns on a source the file did not grant. Earlier
versions of Agentprise opened such a file with web search on; files saved by
them list `WebSearch` and still open with it on. The SharePoint switch itself follows
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
were uploaded as knowledge, and that is what Agentprise writes. When the
assistant's tools become Copilot actions, the package also holds their plugin
manifests and API descriptions:

```
manifest.json               Teams app manifest, schema 1.28
declarativeAgent_0.json     Declarative agent, schema v1.8
color.png                   192 by 192 full-color icon
outline.png                 32 by 32 white icon on a transparent background
guide.pdf                   Any attached files, at the root, with no manifest entry
deploy.ps1.txt              A script or data file, renamed so Copilot accepts it
meeting-notes.md.txt        A used skill's steps that did not fit the instructions
tool-notes.md.txt           The full tool notes, when they were shortened to fit
plugin-pubmedeutils.json    One Copilot plugin manifest (v2.4) per action
apis/pubmedeutils/pubmed-eutils.yaml   The OpenAPI description an action uses
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
| Name, description | `declarativeAgent_0.json` top level; `manifest.json` `name` and `description` |
| Instructions | `declarativeAgent_0.json` `instructions`, the composed text for `teamsZip`, at most 8,000 characters |
| Starters | `conversation_starters[].text`, at most 12 |
| Welcome message | Nowhere. The export warns and leaves it out. |
| Copyright line and license name | Nowhere. The export warns and leaves them out. |
| Icon | `color.png` plus a generated `outline.png` |
| SharePoint and OneDrive switch | `capabilities[OneDriveAndSharePoint]`, second in the list as the Copilot app writes it: omitted when off, bare when on with no limit, with lists when on with sources |
| SharePoint links and sites | `capabilities[OneDriveAndSharePoint].items_by_url[]` as `{url}` only, which is all the schema allows there |
| SharePoint files and folders stored by id | `items_by_sharepoint_ids[]` with `site_id`, `web_id`, `list_id`, `unique_id`, and the optional part and hub keys |
| Web search, Teams messages, email, meetings, code interpreter, image generation | `capabilities[]` named `WebSearch`, `TeamsMessages`, `Email`, `Meetings`, `CodeInterpreter`, `GraphicArt` |
| Web search sites | `capabilities[WebSearch].sites[].url`, at most four, including sites the tools add |
| Teams chats, mailboxes and folders, meetings | `capabilities[TeamsMessages].urls[]`, `capabilities[Email].group_mailboxes[]`, `shared_mailbox`, `folders[]`, and `capabilities[Meetings].items_by_id[]`, each present only when the source is limited |
| Actions | `declarativeAgent_0.json` `actions[]` as `{id, file}`, at most 10, written only when there is at least one |
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

#### Copilot actions

`writeCopilotActions` turns the actions `planExport` decided into plugin
manifest v2.4 files. Each action is one source: one OpenAPI description, or
one web tool server. Its `namespace` is the server name, or the description's
file name without its extension, reduced to letters and digits, with a number
added when two would collide. The file is `plugin-<namespace>.json`, and the
declarative agent lists it as `{"id": "<namespace>", "file": "plugin-<namespace>.json"}`.

| Plugin manifest field | Value |
|---|---|
| `$schema`, `schema_version` | The v2.4 schema URL and `v2.4` |
| `name_for_human`, `description_for_human` | The server label or tool label, cut to 20 and 100 characters |
| `description_for_model` | The descriptions of the tools that use the action, joined, at most 2,048 characters |
| `functions` | OpenAPI: each named operation that the description defines and that matches `^[A-Za-z0-9_-]{1,100}$`. Tool server: the listed tools, or none |
| `runtimes[0]` OpenAPI | `type` `OpenApi`, `spec.url` `apis/<namespace>/<file>` (the description copied into the package) |
| `runtimes[0]` tool server | `type` `RemoteMCPServer`, `spec.url` the server address or the placeholder |
| `run_for_functions` | The function names, or `["*"]` with no functions, which makes Copilot discover the server's tools itself |
| `auth` | `{"type": "None"}`, or `OAuthPluginVault` or `ApiKeyPluginVault` with `reference_id` `replace-with-your-auth-registration-id` |
| `privacy_policy_url`, `legal_info_url` | The project's privacy and terms links, when set |

A local (`stdio`) server and a server that needs an API key are left out,
because Copilot cannot use them. An operation the description does not define
is left out with its own report entry. An eleventh action is left out.

Tool web search sites merge into the assistant's own Copilot web search
without widening it (`mergeWebSearchSites`): whole-web search stays whole-web,
web search that was off turns on for the tools' sites only, and a site list
grows only up to four, past which the export is blocked.

The package stays on declarative agent v1.8. Version 1.9 adds `agent_skills`,
which would let Copilot load skills as folders instead of inlined text, but on
2026-10-10 it was a Frontier preview with no reference page.

#### Opening a Microsoft 365 app package

`readTeamsArchive` reads a package into a project. `detectFormat` sends it
there when the ZIP has a root `manifest.json` and no root `SKILL.md` or plugin
layout. A root `plugin.json` alone would send it to the plugin importer, so
`importProject` first checks `isMicrosoftManifest`: a root `manifest.json`
that lists assistants, skills, or connectors opens as a package even when a
connector names `plugin.json` as its tool description. A root `SKILL.md`
cannot override that manifest either: the unlisted root skill stays in the
backup only and never becomes an assistant attachment. When the manifest
names no assistant, skill, or connector, the
importer falls back to `readSkillArchive` if the ZIP holds skill folders, so a
web app's `manifest.json` beside skills still opens as skills. Every path the
manifest names goes through `packagePath`: an optional `./` start is allowed,
and a path that `cleanArchivePath` would change, refuse, or that is missing
from the ZIP is left out with a notice. The ZIP reader already refuses two
entries with the same name.

An API description's relative URL is resolved from the action manifest's
folder, following [Microsoft's URL reference rules](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-manifest-2.4#relative-references-in-urls),
checked 2026-10-21. For example, `agents/plugin.json` can name `api.yaml`
beside it, or `../apis/records.yaml` elsewhere inside the package.
`packageRelativePath` resolves the reference before `packagePath` validates
the result. References cannot leave the package, use a remote address, or
include a query or fragment. Percent-encoded characters are decoded before
validation. A root file never overrides a file beside the action manifest.

Classification happens before the package credential check. An unrelated
web manifest follows the skill importer even if it has a field that looks
like a credential. A manifest listing Microsoft assistants, skills, or
connectors still blocks the package when that check finds a match.

Every file and folder name in a Microsoft package is checked for the same
credential patterns before any part opens. A match blocks the whole package,
including attempts to open it as a plugin or skill ZIP. The error asks you
to remove the key from the name and its references without showing the name.

The project opens at most 20 assistants and skills. Assistants fill those
places first. Extra items stay as source files in the backup, along with
the source manifest and assistant descriptions needed to find them. A notice
asks you to split the package to open the remaining items. Credential and
executable-file checks still apply to retained files.

Each assistant opens at most 20 actions. Extra actions keep their source
descriptions and local API descriptions in the backup, along with the
assistant description and source manifest. A notice asks you to split those
actions across assistants. Files with credential matches remain excluded.

A listed skill opens at most 50 accepted files. Extra files keep their
original package paths under `microsoft-package/` in the backup. Credential
and program checks still apply. The notice asks you to split the skill to
use the extra files.

The project holds at most 10 tool servers across skills, actions, and
connectors. When a connector does not fit after those servers are combined,
the source manifest stays in the backup. The success notice counts only
connectors that opened. A separate notice explains how to open the rest.
Actions whose servers do not fit also retain their action, assistant, and
manifest sources. Their remaining usable providers still open; an action
with no usable provider stays in the backup only. A missing or rejected
action reference also retains the assistant and manifest for repair.
Skills whose tools need a missing server retain their source files and the
manifest, plus any assistant description that names them. Server names are
assigned before the limit applies, so a dropped server's name cannot be
reassigned to a different address during the merge.
A rejected assistant reference retains the manifest while valid package
parts still open.
Malformed assistant JSON also retains the manifest and original assistant
file. An assistant rejected for credentials retains only its safe manifest.

A backup holds at most 50 files that the app cannot use. If a Microsoft
package would exceed that limit, Agentprise refuses the whole package and
asks you to split it. This count includes unsupported files inside skills.
It prevents a partially preserved project from replacing the source package.
Files whose names conflict in the backup also block the package. Rename them
so they differ beyond capitalization, and update their references.

Each action opens at most six usable runtimes. Extra runtime definitions
and their local API descriptions stay in the backup with the action,
assistant, and manifest sources. Credential and program checks still apply.

Each provider keeps at most 50 valid function names. When names are refused
or exceed that limit, the complete action and local API descriptions stay
in the backup with the assistant and manifest sources. An OpenAPI runtime
without explicit operation names stays in the backup only. Agentprise does
not infer operations from the API description. Add names to `functions` or
`run_for_functions` in the action file to import that runtime.
An MCP runtime with an explicit tool list that becomes empty is also kept
only in the backup. It never becomes unrestricted tool discovery. Copilot
export applies the same rule when none of a tool's names can be written.

Root files that cannot be attached because of their contents, name, or the
20-file attachment limit stay in the backup when they pass those checks.
Each refused attachment gets a notice. Empty files and files with invalid
document contents are preserved for you to inspect.
An API description takes precedence over a root attachment with the same
stored path; the root attachment stays in the backup.

Only the color icon actually loaded by an assistant counts as imported.
Other icons stay in the backup, including both icons in a package with
only skills or connectors. A connector with an unsafe or missing tool
description path still opens as a server. A notice asks you to fix the
reference, and the source manifest stays in the backup.

| Package part | Becomes | Limits |
|---|---|---|
| `copilotAgents.declarativeAgents[].file` | One assistant each, read by `teamsAgentRaw` | A file named twice is read once. Without a list, `declarativeAgent_0.json` is read. Only the first assistant keeps the manifest `id` as its app id; the others get a new one on download, with a notice |
| Root files of accepted types | Attached files of every assistant | With two or more assistants, each gets a copy and a notice |
| `actions[]` with an `OpenApi` runtime | A tool (`action.<namespace>`) with an `openapi` provider under `*`; the description is copied to the assistant's files at its package path | A local file or inline `api_description` is required. A web address is never fetched |
| `actions[]` with a `RemoteMCPServer` runtime | A tool with an `mcp` provider, and a project server named after the `namespace` | A credential match excludes the action. A static `mcp_tool_description` keeps the runtime in the backup only. Otherwise, `cleanServerUrl` checks its address |
| `run_for_functions`, or `functions[].name` when it is `["*"]` | The provider's `operations` or `tools`, and the server's `tools` | At most 50 valid names. Refused names retain the source files. An OpenAPI runtime without explicit names stays in the backup only |
| Runtime `auth.type` | `None`, `OAuthPluginVault`, `ApiKeyPluginVault`, and `DynamicClientRegistration` (kept as `oauth`) | Any other type leaves the runtime out, so a sign-in is never written back as none. `reference_id` is not kept |
| `agent_skills[].folder` and root `agentSkills[].folder` | Skill items, read by `readItemFolders`; an assistant's own list becomes its `uses`, matched by folder after `normalizeProject` numbers repeated skill names | A folder named by both is read once. A folder without `SKILL.md` is left out |
| Root `agentConnectors[]` with `toolSource.remoteMcpServer` | A project server named after the connector `id`, with `displayName` as its label | No `authorization` means `oauth`, since Microsoft registers a client itself. A repeated `id` is read once. Other tool sources are left out, and the manifest is kept |

A skill's `agentprise.json` can name its own servers. A skill keeps its
server names, and a server from an action or connector whose name a skill
already uses for a different server gets a numbered name, such as
`remote-2`. The assistant's tools are pointed at the numbered name, so each
tool still connects to its own address.
`readItemFolders` first applies that rule between skills too: a later skill's
different server gets a numbered name and its providers are updated before
the package servers are combined. If a later skill uses those same settings,
it reuses the existing numbered server. This also applies to plugin and skill
ZIP imports.

An inline `spec.api_description` takes precedence over `spec.url`. The importer
writes it to a unique `inline-description-N.yaml` file beside its action
manifest. Existing paths, including names that differ only by capitalization,
are reserved. Shared actions reuse the generated files. The usual credential,
file-content, path, and count checks still apply.

A runtime with `spec.mcp_tool_description` stays in the backup only, together
with its action and assistant sources. A referenced local tool-list file is
kept with them. This avoids changing a fixed tool list into dynamic discovery.
For root connectors, a valid `mcpToolDescription.file` retains both the file
and the package manifest; the server still opens in Tool connections.
Duplicate connector IDs also retain the manifest, including definitions that
were skipped. The first connector with each ID supplies the imported server.

An OpenAPI description may be at most four folders below the package root
(five path components, including the filename), matching item-file and
provider-spec limits. A deeper description leaves that runtime out with a
notice asking the author to move the file and update its reference. The
importer does not create a tool with no usable provider for that runtime.

Action capability ids keep namespace separators such as hyphens and
underscores. A repeated namespace, or one that becomes identical after
cleaning or truncation, gets a numbered id so neither action is lost.

Each skill file belongs to its nearest enclosing skill folder. A nested
skill that the manifest does not list is kept for the backup only and gets
a notice, even when its parent is listed. An explicitly listed descendant
opens separately. Files from a skill rejected for credentials cannot become
files of a listed parent.
Safe companion files from that rejected skill remain in the backup.
Rejected skill references also retain the source manifest and any assistant
description that names them, so the author can repair the package.

An assistant can import at most 50 API description files across its actions.
Extra descriptions and their action sources remain in the backup, along with
the assistant description and manifest. Providers that need those extra files
are left out; each action keeps its other usable providers. Another assistant
that shares an action applies its own file limit.
Rejected API contents or names retain the same sources. Descriptions directly
under `references/` also share the 20-file attachment limit. If they do not
fit, their providers are removed and their sources stay in the backup.
Credential and program exclusions still apply to all retained files.

A plugin manifest with a runtime the app can't read, an assistant file that
isn't JSON, a connector's tool description file, a skill folder the manifest
doesn't list, and every other file the importer did not use are kept as
unrecognized files under `microsoft-package/` with the note "From a Microsoft
365 app package." The folder keeps a kept `SKILL.md` or `plugin.json` from
being read as part of the backup when it opens again. Every text file the
importer would keep, whether as a skill file, an API description, an attached
file, or a kept file, first goes through `holdsCredential`, which looks for a
key, token, or password in a query string, a JSON value, or a bearer header
(`CREDENTIAL_TEXT_PATTERN`), and on a YAML or settings line such as
`client_secret: abc123` or `export EXAMPLE_API_KEY=abc123`
(`CREDENTIAL_LINE_PATTERN`). A line whose value names a key kept elsewhere,
such as `${CLIENT_SECRET}`, or says only `true` or `false`, is not a match
(`CREDENTIAL_REFERENCE_VALUE`). A match leaves the file out, and the notice names
only the file. A skill whose `SKILL.md` matches is not imported as a skill, and an
action whose API description matches is left out. In a kept JSON or YAML
file, `withoutRegistrationIds` replaces each `reference_id` and `referenceId`
value with `replace-with-your-auth-registration-id`, so no tenant's
registration id reaches the backup. Programs are refused by
`normalizeProject`, as for every import.
Registration-ID rewrites preserve UTF-8 or UTF-16 encoding and any byte-order
mark. UTF-16 detection also handles common files without that mark.
Basic and Bearer authorization headers, including proxy headers, are checked
by `CREDENTIAL_HEADER_PATTERN`. A matching header excludes the file before
it can become an attachment, skill file, or backup-only file.

A credential reference must occupy the whole settings value. Plain variable
references such as `${CLIENT_SECRET}` and `{{ secrets.token }}` are allowed.
Fallbacks, substitutions, and literal text added to a reference are checked
as credential values. For example, `${CLIENT_SECRET:-EXAMPLE_SECRET}` is
not treated as a reference to a key stored elsewhere.

For retained package files, the `microsoft-package/` prefix does not count
toward the original path's limit of eight components and 200 characters.
Normalization checks the original path, then adds the fixed prefix back.
This preserves the longest supported paths through backup round trips,
while still refusing traversal and paths beyond those limits.

The root manifest is checked before any of its values are used. A match
blocks the package, including attempts to open its contents as a skill ZIP
instead. This covers publisher links and project descriptions as well as
connector addresses. The error asks the author to remove the credentials.
Assistant and action description files are checked before their values are
imported, regardless of their filename extension. A match leaves that part
out, and its file is excluded from the backup. `holdsCredential` also checks
unknown file types, such as `.env`, `.toml`, and `.pem`, even when they contain
zero bytes. It decodes UTF-16 files with a byte-order mark and removes zero
bytes from decoded text before scanning. Other control bytes are checked both
as separators and with those bytes removed, so neither form can hide a field.
Files with invalid text encoding or replacement characters are excluded with
a repair notice. An unreadable root manifest blocks the package. Known binary
types, including complete PNG images, receive a scan of their readable bytes.
A format signature does not exempt those bytes from credential checks.
This does not inspect compressed document contents. Mislabeled text, such as a
password stored in a fake PDF, is scanned before it can become a skill file
or a backup-only file. Private
key headers, including `BEGIN PRIVATE KEY` and `BEGIN RSA PRIVATE KEY`, count
as matches. This heuristic does not detect every credential or encoding.
URL user names and passwords also count as matches, as do `auth` query
parameters. Query names are decoded before checking. Valid JSON is scanned
as parsed keys and values, including nested objects, arrays, and escaped
field names. Names such as `X-API-Key` and `database_password` use the same
credential-name rules as settings files. Complete variable references remain
allowed; literal values and references with fallbacks remain excluded.
Literal passwords and numeric values have no minimum length. Empty values
remain allowed, but a quoted space is a literal value.
Malformed JSON receives the text scan.
YAML flow mappings, such as `database: {password: ...}`, also receive field
checks. Quoted names, nested mappings, numeric values, and multiline values
are covered. Empty values and complete external references remain allowed.
XML-style credential elements and attributes are checked too, including
namespace prefixes and `name` or `key` fields paired with a `value` attribute.
Standard character references are decoded for that check; external entities
are never loaded. Empty fields and complete external references remain allowed.

A package with an assistant opens with the project license `Not stated` and
a notice. A Microsoft package cannot declare the assistant's license, even
when Agentprise made it. Each imported skill keeps its own declared license.

A package that Agentprise wrote opens with the same three actions, and the
next Copilot app package writes the same plugin manifests, API description,
action list, and web search sites. The instructions still hold the old
**Tools available in this setup** section, because a package has no record
of what the app added, and the app says so instead of guessing. The inlined
skill text stays in the instructions for the same reason.

`teamsZipImport`, the format reader on `formats.teamsZip.import`, still reads
only the first assistant, without actions or skills. The app itself opens
files through `importProject`.

### Optional Microsoft exports

These exports are built locally by `planMicrosoftPackage`, `writeMicrosoftPackage`,
`planCopilotSkill`, and `writeCopilotSkill` in `index.html`. They use the existing project model,
Copilot tool choices, and **Products it works in** settings. No validator,
command-line tool, sign-in, or network request is part of the browser export.

#### Add a skill to Copilot

Select a skill in your project, then choose **Review** beside **Add a skill to
Copilot**. The ZIP contains `SKILL.md` at its root, `LICENSE.txt`, and supported
resources at their relative paths. It has no app manifest or assistant wrapper.
In Agent Builder, open your assistant and choose **Configure**, **Skills**, then
**Add**. Upload the ZIP and use **Try it** to test a request that needs the skill.

The skill body must be under 20,000 characters after tool notes are added.
Each file can be at most 25 MB; the complete ZIP can be at most 50 MB.
Relative paths have at most three components. Copilot allows eight skills and
350 files across an assistant's skills. Agentprise checks the selected skill's
file count; check the combined count when adding it to an existing assistant.
Scripts and unsupported resources are excluded with notices. Supported tool
references remain instructions with separate setup steps. The upload does not
install actions, connections, or permissions. Selecting an assistant blocks this
choice and asks you to select a skill instead.

See Microsoft's [Agent Builder skill upload guide](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-skills)
and [native skill limits](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/declarative-agent-skills).

#### Copilot app with skills

The selected assistant stays an assistant. Its `uses` list selects the skills
written to `skills/<skill-name>/SKILL.md`, with their descriptions and resource
files. Its own instructions stay separate from skill steps. A selected skill
gets a short wrapper assistant that refers to that skill.

This profile uses app manifest 1.28, declarative agent v1.9 with `agent_skills`,
and API-plugin v2.4 for actions. The usual **Copilot / Teams Apps** download
still uses v1.8 and adds skill steps to the assistant's instructions.
Both profiles keep the assistant's app id so later packages can update it.
Ask your admin to upload the native app package in the Microsoft 365 admin
center, under **Copilot**, **Agents**, then **Upload custom agent**. This is an
app package, not an Agent Builder skill ZIP or a Copilot Studio solution.
See Microsoft's [custom agent upload guide](https://learn.microsoft.com/en-us/microsoft-365/copilot/agent-essentials/agent-lifecycle/agent-upload-agents).

The native profile blocks more than eight skills, more than 350 skill files,
and skill text of 20,000 characters or more after tool notes are added.
Relative resource paths have at most three components. Leading hyphens are
allowed in file and folder names; hidden and Windows reserved names are blocked. The complete ZIP must
fit within 10 MB. It blocks attached assistant knowledge files; move them into
a skill or use the usual download. API descriptions registered as actions are
not counted as attached knowledge. That exemption matches both the owning
item and the file path, so a skill action cannot hide an assistant attachment
with the same name.

#### Microsoft 365 plugin

This profile uses app manifest 1.29 with root `agentSkills` and, when needed,
`agentConnectors`. It includes eligible project items as skills, with an
assistant's description prefixed by `Persona:`. It has no declarative-agent
file. The project id identifies the plugin across exports. The selected item's
picture supplies the package icons.

Remote connectors must use HTTPS Streamable HTTP and either no authentication
or OAuth. OAuth exports contain a registration placeholder that an admin must
replace. Local servers, SSE servers, API-key servers, OpenAPI action providers,
and scoped web-search providers are left out with notices. A connector with a
restricted tool list is also left out: dynamic discovery would broaden that
list, and the project has no complete tool-description schema to export.
Manifest 1.29 permits URL-only connectors, so no tool-description file is
invented. This is a contract-specific version choice; baseline exports stay
on manifest 1.28.

Each plugin has at most 20 skills. Each skill has at most 20 companion files,
including its license. Each companion is at most 5 MB, and their total is at
most 10 MB. The complete package is also
capped at 10 MB. Unsafe, duplicate, and overlong paths block the download.
An assistant's active source restrictions block this profile because a plugin
cannot enforce them. Use an assistant package to preserve those restrictions.

#### Exclusions and setup

Both new downloads exclude script files and script tool routes. Agentprise
does not verify sandbox runtimes or dependencies. Other unsupported resource
types are excluded with a notice. Resource files keep their names and bytes.
Extensionless license files, such as `LICENSE`, `COPYING`, and `NOTICE`, receive
a `.txt` extension with a notice. When needed, the original license bytes are
also copied to `LICENSE.txt` so the skill's license link works. A conflicting
filename blocks the download instead of overwriting either file. The original
project and its backup keep the original names and excluded files.

Items marked as not for Copilot are excluded. An export with no eligible
skills is blocked. Setup instructions appear on Inspect as **Setup steps (not
in the package)**. They are not added to the Microsoft ZIP. Download a backup
before changing the project; these packages are not lossless backups.

#### Evidence and tenant checks

Checked on 2026-10-22: the new Windows tests exercise both package layouts,
references, resource bytes, source limits, tool exclusions, count and size
limits, hostile paths, and the pinned schemas. Microsoft 365 Agents Toolkit CLI
1.1.18 also passed `atk validate --manifest-file` for the native assistant and
plugin fixtures, including a remote connector. The native agent includes its
v1.9 `$schema` address because the Toolkit needs it to find the schema.
These manifest checks do not establish Microsoft upload acceptance or actual
skill invocation. `atk validate --package-file` required account sign-in and
was canceled; signed-in package validation and tenant installation remain open.

The alternative Claude-plugin conversion was also checked with CLI 1.1.18.
Unpack the **Claude plugin** download, then run this command against its inner
folder. Replace the example links with your publisher links:

```sh
npx --yes --package @microsoft/m365agentstoolkit-cli@1.1.18 atk import openplugin --path ./skill-check --output ./converted --privacy-url https://example.org/privacy --terms-url https://example.org/terms --telemetry false
cd converted
npx --yes --package @microsoft/m365agentstoolkit-cli@1.1.18 atk package --manifest-file appPackage/manifest.json --output-package-file build/plugin.zip --output-folder build --telemetry false
```

The synthetic fixture imported and packaged successfully. The CLI warned that
the `.claude-plugin` location is deprecated, but accepted it. Its generated
manifest used `devPreview`, with root `agentSkills`; the referenced skill and
resource files were included. This is a developer conversion route, not a
requirement for Agentprise's browser downloads. It was not installed in a tenant.

Microsoft documents native assistant skills as a Frontier preview, unavailable
with Information Barriers or public-store submission. Scripts cannot use the
network or install dependencies. The native-skills overview gives a 350-file
limit; the Toolkit guide says 400. Agentprise uses 350 until a tenant test
resolves the difference. Sources checked on 2026-10-22:
[native skill restrictions](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-skills),
[Toolkit skill setup](https://learn.microsoft.com/microsoft-365/copilot/extensibility/build-declarative-agents-add-custom-skills),
and [Microsoft plugin package format](https://learn.microsoft.com/microsoft-365/copilot/cowork/cowork-plugin-development).

On 2026-10-22, the user reported uploading the synthetic `record-finder` skill
through Agent Builder's **Configure**, **Skills**, **Add** route. The ZIP held
root `SKILL.md`, `LICENSE.txt`, and `references/check.txt`. Asking for the sample
marker returned `COPPER-FINCH`, the marker stored in that reference file. This
confirms the reported skill upload and reference read. The test used a manually
prepared ZIP; regression and browser checks verify that the skill download
produces the same layout and file contents. It does not verify full app or
Cowork plugin installation, tool sign-in, updates, or access by another user.

For further tenant tests, use only a synthetic assistant and a skill with a reference
file containing a made-up marker. Record the date, cloud, destination, upload
route, and versions. Check installation, a request that triggers the skill,
retrieval of the marker, save and reopen, an update to the same assistant,
source restrictions, and access by another test user. Test a plugin separately
from an assistant package, including any registered tool connection. Mark
unavailable checks as skipped. Enabling skills in a tenant alone does not prove
that these packages install or work there.

### The Claude and generic whole-project plugins

Both plugins put each item in `skills/<skill-name>/` as an item folder whose
`SKILL.md` holds the composed text for the plugin's product, with
`agentprise.json` (`composed: true` and `servers`). The folders keep the
item's files, as in the skill ZIPs. An item whose author marked it as not for
the plugin's product (Claude for the Claude plugin, ChatGPT for the Plugin) is
left out, with a "left out" line in the report, and `README.md` lists only the
items inside.

The Claude plugin (`<name>.claude-plugin.zip`):

```
caveman/
  .claude-plugin/plugin.json   name, displayName, version, description, author (name, url), license
  .mcp.json                    Web tool servers only, as "type": "http" (or "sse"), when a tool uses them
  skills/caveman/...           One item folder per assistant or skill, composed for Claude
  README.md                    What is inside, how to install, and the report
  SETUP.md                     When something needs setup
  LICENSE.txt
```

The plugin `name` is the project name in skill name form. Claude refuses
names that start with `claude-`, `anthropic-`, `anthropics-`, or `cc-plugin-`,
or that put `official` next to Claude or Anthropic, so `claudePluginName`
drops `official` there and adds `my-` in front of a reserved start. Local
servers are left out with a report entry, because claude.ai cannot run them.
`.mcp.json` has no `$schema` and no headers.

The Plugin (`<name>.plugin.zip`):

```
caveman/
  plugin.json        Agent Plugins 1.0.0, with the project record in
                     extensions["org.depressioncenter.agentprise"]
  mcp.json           Agent Plugins MCP 1.0.0: streamable-http, sse, and stdio servers
  skills/caveman/... One item folder per assistant or skill, composed for ChatGPT
  README.md
  SETUP.md           When something needs setup
  LICENSE.txt
```

Because `plugin.json` carries the Agentprise extension, the Plugin opens
again as a project. It writes no `.codex-plugin/plugin.json`: ChatGPT, Codex,
and VS Code read the root `plugin.json` (see the vendor facts below).

For plugins without the Agentprise project extension, `combineServers`
combines skill and plugin server settings after normalization. Identical
settings share a name. Different settings keep the skill's name and give
the plugin server a free numbered name, reserving existing names first.
Differences in labels, sign-in kinds, or tool lists count too, even when
the address is the same. The Microsoft package reader uses the same helper
and updates its assistants' tool references to the assigned names.

### Copy-ready text

ChatGPT has no file to import, and Gemini Notebook has no skill upload. For
ChatGPT, Agentprise shows one box, **Project instructions**, with the composed
text for `chatgpt`, to paste into a ChatGPT project. For Gemini Notebook, it
shows the name, description, instructions, and starters in boxes with Copy
buttons, plus a `.md` download that can be added to a notebook as a source.
Copied text cannot carry files, so the report marks attached files as needing
setup.

Custom GPTs retire on 2026-12-11 and have no export file, so Agentprise no
longer writes for them and has no importer for them. To move a GPT, copy its
fields into Create new. A Gem that Google has turned into a Gemini skill can
be downloaded from Gemini as a `.zip` and opened with the regular skill
importer. [Move a Gem or a custom GPT into Agentprise](how-to/move-a-gem-or-gpt.md)
gives the steps for both.

### Verified vendor facts

Checked on 2026-10-09 unless a line says otherwise. Facts checked on
2026-10-10 come from vendor documentation and downloaded schemas, not from a
real account, unless the line names a tenant test.

#### Agent Skills and Agent Plugins

| Fact | Source |
|---|---|
| An Agent Skill is a folder with `SKILL.md`; `name` is 1 to 64 characters of `a-z`, `0-9`, and single hyphens, with no hyphen at either end, and must match the folder name; `description` is up to 1,024 characters; `compatibility` is up to 500; `metadata` is a string-to-string map; unknown top-level fields are not allowed | [Agent Skills specification](https://agentskills.io/specification), checked again 2026-10-10 |
| Agent Plugins 1.0.0 is the published release; 1.1.0 is a working draft that differs only in version strings | [Agent Plugins specification](https://agent-plugins.org/specification), checked 2026-10-10 |
| Agent Plugins 1.0.0 `plugin.json` is closed: `$schema` (exactly `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`) and `name` are required; the only other keys are `version`, `description`, `author` (only `name`, `email`, `url`), `homepage`, `repository` (a string), `license`, `keywords`, and `extensions` (objects keyed by reverse-domain namespace); `name` matches `^(?!.*(?:--\|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$`, at most 64 characters | Pinned `tests/schemas/agent-plugins/plugin.schema.json`, downloaded 2026-10-10 |
| Agent Plugins skills live only in `skills/<name>/SKILL.md` and servers only in `mcp.json`; `plugin.json` cannot name other paths; clients must not fetch the schema at load time | [Agent Plugins specification](https://agent-plugins.org/specification), checked 2026-10-10 |
| Agent Plugins 1.0.0 `mcp.json` requires `$schema` (the 1.0.0 MCP schema, same version as `plugin.json`) and `mcpServers`; each server is exactly one of `stdio` (`command`, `args`, `env`, `cwd`), `streamable-http` (`url`, `headers`), or `sse`; non-loopback URLs must be https with no user information or fragment; credentials must not go in `headers` or `env` | Pinned `tests/schemas/agent-plugins/mcp.schema.json` and the specification, 2026-10-10 |
| VS Code and GitHub Copilot CLI read a root `plugin.json` with the Agent Plugins `$schema` as Agent Plugins; without it, the same file is read as the older Copilot format | VS Code agent plugins documentation (approved 2026-10-07) and the [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference), checked 2026-10-10 |

#### Claude

| Fact | Source |
|---|---|
| Claude uploads a skill ZIP from Customize, then Skills, then the plus button, Create skill, and Upload a skill; the ZIP holds the skill folder, named like the skill, at its top level; the skill is then turned on and stays private until shared. The 2026-10-09 check of the same docs recorded Settings, then Capabilities, which is now out of date | [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude) and [Claude skills documentation](https://claude.com/docs/skills/how-to), checked 2026-10-10 |
| Claude skills need code execution and file creation on; the docs and a support article name different settings pages for that switch | [Claude skills overview](https://claude.com/docs/skills/overview), checked 2026-10-10 |
| Claude's docs allow a skill description of 1,024 characters, and one support article says 200 | [Claude skills documentation](https://claude.com/docs/skills/how-to) and [Use custom skills](https://support.claude.com/en/articles/12512198), checked 2026-10-10 |
| A Claude plugin has `.claude-plugin/plugin.json` with `name` required and `displayName`, `version`, `description`, `author` (`name` required), `homepage`, `repository`, `license`, and `keywords` optional; every other file sits at the plugin root; unknown top-level keys are removed with a warning | [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference), checked 2026-10-10 |
| Claude refuses plugin names that start with `claude-`, `anthropic-`, `anthropics-`, or `cc-plugin-`, names that are exactly `claude`, `anthropic`, `anthropics`, `claude-code`, or `claude-mods`, and names that put `official` next to Claude or Anthropic | [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference), checked 2026-10-10 |
| A plugin's `.mcp.json` lists servers under `mcpServers`, with a web server as `"type": "http"` and a `url`; secrets must not go in the file | [Build a plugin](https://claude.com/docs/plugins/build), checked 2026-10-10 |
| In claude.ai chat, plugin skills load, commands load as skills, agents and hooks are ignored, web servers with a fixed URL are listed on the plugin's Connectors tab and work once connected, and local servers are ignored; a plugin with a top-level `bin/` folder cannot be installed | [Plugin platform support](https://claude.com/docs/plugins/platform-support), checked 2026-10-10 |
| A plugin is uploaded from Customize, then Plugins, Add, Upload plugin, as a `.zip` with one `.claude-plugin/plugin.json` at its root or inside one top-level folder; limits are 5,000 files and 200 MB; adding a plugin does not connect its connectors | [Claude plugins overview](https://claude.com/docs/plugins/overview), checked 2026-10-10 |
| On Team and Enterprise plans, turning off Skills under Organization settings, Plugins & skills, Policy turns plugins off for the whole organization | [Plugin administration](https://claude.com/docs/plugins/admin), checked 2026-10-10 |
| Team and Enterprise network egress for code execution can be off, package managers only, package managers plus specific domains, or all domains; the default domain list holds package registries and does not include `eutils.ncbi.nlm.nih.gov` | [Create and edit files with Claude](https://support.claude.com/en/articles/12111783), checked 2026-10-10 |

#### Microsoft 365 Copilot

| Fact | Source |
|---|---|
| Declarative agent schema 1.8 is the latest version with a reference page: name up to 100, description up to 1,000, instructions up to 8,000, at most 12 starters, capability names as listed above, `behavior_overrides.special_instructions.discourage_model_knowledge`, unrecognized properties invalidate the document | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8) and pinned `tests/schemas/copilot/declarative-agent-v1.8.schema.json`, checked 2026-10-10 |
| Declarative agent schema 1.8: `actions` holds 1 to 10 objects with only `id` and `file`, where `file` is the path to a plugin manifest | Pinned `tests/schemas/copilot/declarative-agent-v1.8.schema.json`, 2026-10-10 |
| Declarative agent schema 1.9 exists and adds `agent_skills` (at most 8 `{folder}` entries), but its reference page returned 404 and custom skills are a Frontier preview | [Add custom skills](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-skills) and the v1.9 schema URL, checked 2026-10-10 |
| Declarative agent schema 1.8: `WebSearch.sites` holds at most four https URLs with no query and at most two path segments; the items-by-URL object has only `url`; the items-by-IDs object has `site_id`, `web_id`, `list_id`, `unique_id`, `search_associated_sites`, `part_type`, `part_id`; `Email` is a capability; an `EmbeddedKnowledge` object exists but the Copilot app's export does not use it | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8), checked 2026-10-10 |
| Scoped web search grounds on content Bing has indexed, so pages built in the browser may be missing | [Knowledge sources](https://learn.microsoft.com/microsoft-365/copilot/extensibility/knowledge-sources), checked 2026-10-10 |
| Plugin manifest v2.4 is the latest; it requires `schema_version`, `name_for_human`, `namespace`, and `description_for_human`; `$schema` is allowed at the root and `_license` is not; a runtime requires `type` (`OpenApi`, `LocalPlugin`, or `RemoteMCPServer`), `auth`, and `spec`; `auth.type` is `None`, `OAuthPluginVault`, or `ApiKeyPluginVault`, and the vault types need `reference_id` | [Plugin manifest 2.4](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-manifest-2.4) and pinned `tests/schemas/copilot/plugin-v2.4.schema.json`, checked 2026-10-10 |
| A `RemoteMCPServer` runtime needs `spec.url`; without `spec.mcp_tool_description`, Copilot discovers the tools by calling the server, and the docs pair that with `run_for_functions: ["*"]` | [Dynamic tool discovery](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-dynamic-tool-discovery), checked 2026-10-10 |
| Tool server plugins support Entra sign-in, dynamic client registration, OAuth, or no sign-in, and not API keys; sign-ins live in an auth configuration referenced by `reference_id` | [Plugin authentication](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-authentication), checked 2026-10-10 |
| API plugins do not support nested objects in parameters, `oneOf`, `allOf`, `anyOf`, or API keys in query parameters | [Known issues: API plugins](https://learn.microsoft.com/microsoft-365/copilot/extensibility/known-issues#api-plugins), checked 2026-10-10 |
| Agent Builder takes up to four public site URLs, 100 SharePoint files, one SharePoint list, 50 OneDrive files, five Teams chats and five meetings, and 20 uploaded files; its documentation lists the upload types .doc, .docx, .ppt, .pptx, .xls, .xlsx, .pdf, and .txt; a pasted SharePoint link must include the site path and no query string, and a OneDrive link is a shared link | [Add knowledge sources in Agent Builder](https://learn.microsoft.com/microsoft-365/copilot/extensibility/agent-builder-add-knowledge), checked 2026-10-10 |
| The Copilot app's upload dialog also accepted `.onepart` (a OneNote page), so the app accepts `.one` and `.onepart` and sends only `.onepart` in the package | A tenant check on 2026-10-10 |
| Declarative agent schema 1.6 and later: `TeamsMessages.urls` holds at most five Teams links; `Email` takes `shared_mailbox`, `group_mailboxes` (at most 25), and `folders[].folder_id`; `Meetings.items_by_id` holds at most five `{id, is_series}`; schema 1.7 adds `behavior_overrides.default_response_mode` with the values `Auto`, `Quick response`, and `Think deeper` | [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8), checked 2026-10-10 |
| The Copilot app's export of an agent with an uploaded file places the file at the ZIP root with no entry in either JSON file; its declarative agent lists, in this order, `WebSearch` with `sites`, `OneDriveAndSharePoint` with a file by id, `items_by_url: []`, and `additional_search_terms: null`, `TeamsMessages` with three `urls` (one team link carrying a query string), `Email` with `group_mailboxes` once a shared mailbox was added, `Meetings` with `items_by_id`, `CodeInterpreter`, and `GraphicArt`; it writes `actions: []`, `conversation_starters: []`, and `behavior_overrides: {special_instructions: null, default_response_mode: "Think deeper"}`; an earlier export wrote `urls: null` for an unlimited `TeamsMessages` | Test agents exported from the Copilot app on 2026-10-10 |
| The Teams client host is `teams.microsoft.com` in the commercial cloud, `gov.teams.microsoft.us` in GCC High, `dod.teams.microsoft.us` in DoD, and `teams.microsoftonline.cn` for 21Vianet; the app accepts Teams links on those hosts | [Plan for sovereign clouds](https://learn.microsoft.com/microsoftteams/platform/concepts/sovereign-cloud), checked 2026-10-10 |
| A OneNote section file starts with the file type GUID `{7B5C52E4-D88C-4DA7-AEB1-5378D02996D3}` and holds the file format GUID `{109ADD3F-911B-49F5-A5D0-1791EDC8AED8}` at byte 48 | [MS-ONESTORE header](https://learn.microsoft.com/openspecs/office_file_formats/ms-onestore/), checked 2026-10-10 |
| The SharePoint builder writes each source with `url`, `name`, `site_id`, `web_id`, `list_id`, `unique_id`, and `type` (`Site`, `Folder`, or `File`), files under `items_by_sharepoint_ids` and folders and sites under `items_by_url`; a `.agent` file whose site entry carried only `url` installed in a Teams chat but answered "this agent is not available" | Test agents exported from SharePoint on 2026-10-10 and a tenant test the same day |
| The app package needs `manifest.json`, a 192 by 192 `color.png`, and a 32 by 32 transparent `outline.png` | [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365) |
| `developer.name` is at most 32 characters; `websiteUrl`, `privacyUrl`, and `termsOfUseUrl` are required | [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer) |
| The Copilot app's own export uses manifest 1.28 and the four `validDomains` Agentprise copies; manifest 1.30 is the latest, and 1.28 is valid | A Caveman package exported from the Copilot app on 2026-10-09; [app manifest versions](https://learn.microsoft.com/microsoft-365/extensibility/schema/), checked 2026-10-10 |
| The SharePoint `.agent` file (schema 0.2.0) has the shape Agentprise writes | A Caveman `.agent` file exported from SharePoint on 2026-10-09 |
| A `.agent` file with an extra top-level key loads and runs in Teams | Loaded in a real tenant on 2026-10-09 |
| In a Teams group chat, an answer that used the web, or only sources everyone in the chat can see, posts to everyone; an answer that used sources not everyone can see is shown first to the person who asked, with Approve and Reject | [How to use Microsoft Copilot in Teams group chats](https://support.microsoft.com/office/how-to-use-microsoft-365-copilot-in-teams-group-chats-2c613de4-cd26-4ae3-9e4b-6905d745d991), checked 2026-10-10 |
| A `.agent` file written by Agentprise that listed `WebSearch`, `TeamsMessages`, and `Meetings` answered from the web in a Teams group chat and asked the person who asked to approve each answer; a SharePoint-made file with no switches answered without approval and without the web | Tenant tests on 2026-10-10 |
| `.agent` files stop responding after the end of March 2027; from mid-November 2026, SharePoint and OneDrive create agents in Copilot Agent Builder instead of saving `.agent` files, an "Upgrade to Microsoft 365 agent" button appears in the SharePoint builder, and a `convert-agent-file-to-skill` skill arrives in Copilot in SharePoint; the retirement also applies to Government Cloud | [Upgrade SharePoint agents](https://learn.microsoft.com/sharepoint/upgrade-sharepoint-agents), checked 2026-10-21 |
| The upgrade is started by a person, never automatically, and needs edit permission on the `.agent` file, the ability to share agents, and permission to edit pages (Microsoft names the owner, creator, or site owner as best suited); after it, the original `.agent` file can no longer be edited, sharing does not carry over except org-wide sharing, usage history does not transfer, and an agent in a Teams chat or channel must be removed and added again by its sharing link | [Upgrade SharePoint agents](https://learn.microsoft.com/sharepoint/upgrade-sharepoint-agents), checked 2026-10-21 |
| Microsoft's upgrade paths by role: a site Q&A agent moves to Copilot in SharePoint, a repeatable site task becomes a skill, a named Q&A or retrieval agent moves to Agent Builder, and a Copilot Studio custom engine agent publishes to the Copilot app | [Upgrade SharePoint agents](https://learn.microsoft.com/sharepoint/upgrade-sharepoint-agents), checked 2026-10-21 |
| Files uploaded to Copilot Agent Builder become embedded content the agent reads (knowledge); no import of a `.agent` file or any other definition file into Agent Builder is documented | [Add knowledge sources in Agent Builder](https://learn.microsoft.com/microsoft-365/copilot/extensibility/agent-builder-add-knowledge), checked 2026-10-21 |
| A Copilot Cowork plugin is a Microsoft 365 app package: `manifest.json`, `color.png`, `outline.png`, and `skills/<name>/SKILL.md` folders, with optional `tools/` files; the manifest lists skills in root `agentSkills` and tool servers in root `agentConnectors`, and a package may hold skills only, connectors only, or both | [Build plugins for Copilot Cowork](https://learn.microsoft.com/microsoft-365/copilot/cowork/cowork-plugin-development), checked 2026-10-21 |
| A root `agentSkills` entry is `{folder}` only, a path of at most 256 characters to a folder with `SKILL.md`; a manifest lists at most 20 | [root.agentSkills](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-agent-skills) and [Build plugins for Copilot Cowork](https://learn.microsoft.com/microsoft-365/copilot/cowork/cowork-plugin-development), checked 2026-10-21 |
| A root `agentConnectors` entry has `id` (at most 64 characters), `displayName`, `description`, and in manifests 1.28 to 1.30 a `toolSource.remoteMcpServer` with `mcpServerUrl`, `mcpToolDescription.file` (required in 1.28), and `authorization` with `type` `None`, `OAuthPluginVault`, `ApiKeyPluginVault`, or `DynamicClientRegistration` and a `referenceId` for every type but `None`; the preview manifest adds `plugin` and `localMcpServer` sources and the `AzureKeyVault` type | [root.agentConnectors](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-agent-connectors), checked 2026-10-21 |
| In Cowork, a connector with no `authorization` gets an OAuth client registered for it, which Copilot Chat does not support; API key sign-in is not available in Cowork yet | [Build plugins for Copilot Cowork](https://learn.microsoft.com/microsoft-365/copilot/cowork/cowork-plugin-development), checked 2026-10-21 |

#### ChatGPT and OpenAI

| Fact | Source |
|---|---|
| A root `plugin.json` with the Agent Plugins schema is the recommended plugin format for ChatGPT and Codex; `.codex-plugin/plugin.json` is an optional fallback; skills come from `skills/` and servers from `mcp.json` | [OpenAI: build plugins](https://developers.openai.com/plugins/build/plugins), checked 2026-10-10 |
| A plugin ZIP is uploaded in ChatGPT from the Admin console, Plugins, Add, Upload plugin, by a workspace owner or someone with upload permission; Upload plugins is off by default for Enterprise; uploading does not connect the plugin's apps | [Plugins in ChatGPT](https://help.openai.com/en/articles/20001256), checked 2026-10-10 |
| The OpenAI developer portal accepts a plugin ZIP in either layout; the OpenAI API's hosted sandbox requires `.codex-plugin/plugin.json`, which Agentprise does not target | [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission) and the OpenAI API plugins guide, checked 2026-10-10 |
| Project instructions are added from a project's menu, Project settings; they apply only in that project; no character limit is stated | [Projects in ChatGPT](https://help.openai.com/en/articles/10169521), checked 2026-10-10 |
| Custom GPTs retire on 2026-12-11, or 2027-02-11 for Enterprise workspaces with an approved deferral; Enterprise creation of new custom GPTs is planned to end 2026-10-26; Migrate to plugin turns a GPT's instructions into a skill in a plugin; no GPT export file exists | [Custom GPT retirement and migration FAQ](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq), checked 2026-10-10 |

#### Gemini

| Fact | Source |
|---|---|
| Gemini uploads a skill from Settings, then Skills, then Upload, as a `SKILL.md`, a folder, or a ZIP with `SKILL.md` in its main folder; uploads total 100 MB at most; Word, Excel, and other binary office files are not supported; scripts that reach the internet are not supported | [Gemini skills help](https://support.google.com/gemini/answer/17094296), checked 2026-10-10 |
| Gemini skills work only with personal Google accounts, for people 18 or older; work and school accounts are not supported yet | [Gemini skills help](https://support.google.com/gemini/answer/17094296) and [Gems to skills](https://support.google.com/gemini/answer/18560919), checked 2026-10-10 |
| Gems become skills in November 2026 for personal accounts, March 2027 for Workspace business, enterprise, and nonprofit accounts, and June 2027 for Workspace education accounts. The 2026-10-09 check recorded 2026-11-17 for personal accounts | [Gems to skills](https://support.google.com/gemini/answer/18560919), checked 2026-10-10 |
| A Gemini skill can be downloaded as a `.zip` from Settings, Skills, More, Download | [Gemini skills help](https://support.google.com/gemini/answer/17094296), checked 2026-10-10 |

#### OpenClaw and Kimi

| Fact | Source |
|---|---|
| OpenClaw follows the Agent Skills specification; a `SKILL.md` needs only `name` and `description`, and `metadata.openclaw` is optional | [OpenClaw skills](https://docs.openclaw.ai/skills) and [Creating skills](https://docs.openclaw.ai/tools/creating-skills), checked 2026-10-11 |
| OpenClaw loads skills from `<workspace>/skills`, `<workspace>/.agents/skills`, and `~/.agents/skills`, and `openclaw skills install` takes a folder path | [OpenClaw skills](https://docs.openclaw.ai/skills) and [ClawHub skill format](https://docs.openclaw.ai/clawhub/skill-format), checked 2026-10-11 |
| OpenClaw reads the skills in an Agent Plugins folder (root `plugin.json`), a Claude plugin (`.claude-plugin/plugin.json`), and Codex and Cursor plugins, without checking them against those formats | [OpenClaw plugin manifest](https://docs.openclaw.ai/plugins/manifest), checked 2026-10-11 |
| Kimi Claw is OpenClaw hosted by Kimi; its help pages offer skills from Kimi's list, from ClawHub, or synced from Agent mode, and document no upload of a `SKILL.md` or `.zip` | [Kimi Claw overview](https://www.kimi.com/help/kimi-claw/overview) and [Use skills in Claw](https://www.kimi.com/en/help/plugins-and-skills/use-skills-in-claw), checked 2026-10-11 |
| Kimi Agent mode makes a custom skill from up to three Office or PDF files, or from a chat with its skill creator; it documents no upload of a `SKILL.md` or `.zip` | [Use skills in Agent](https://www.kimi.com/en/help/plugins-and-skills/use-skills-in-agent), checked 2026-10-11 |
| Kimi Code CLI reads skills from `.kimi-code/skills` and `.agents/skills` in a project and from `~/.kimi-code/skills` and `~/.agents/skills` for one person | [Kimi Code CLI skills](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html), checked 2026-10-11 |
| Kimi Code CLI plugins use their own `kimi.plugin.json` or `.kimi-plugin/plugin.json`, with `skills` and `mcpServers`, and install with `/plugins install` and a folder or `.zip` | [Kimi Code CLI plugins](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins.html), checked 2026-10-11 |

### Tests run in this repository

- `npm test` on 2026-10-10 ran 220 tests, and 219 passed. The one failure was
  a content check on the Library entry `pubmed-search.zip`, which must refuse
  legal and medical advice. The suite covers a project exported to the backup
  and opened again normalizing to an identical record, the closed Agent
  Plugins 1.0.0 shape of `plugin.json` and the schema and transport of
  `mcp.json`, imports of a Claude plugin, two Codex plugins, a generic Agent
  Plugins folder, and a version 1 bundle (which opens as a skill), a skill
  `.zip` of an assistant restoring its kind, starters, welcome message, icon,
  and Copilot settings, hostile project input, a synthetic copy of the Copilot
  app's 2026-10-10 export shape, and a check that every backup listed in
  `library/catalog.json` opens without notices, survives a backup round trip,
  and matches its catalog line.
- `tests/microsoft-package.test.mjs` opens this app's Copilot app package
  with three actions and checks that the next download writes the same
  plugin manifests, API description, action list, and web search sites. It
  also opens synthetic packages from `tests/microsoft-package-fixture.mjs`:
  an assistant with actions, skills only, connectors only, a mix, two
  assistants, and a hostile package with unsafe paths, repeated entries, an
  unknown sign-in, and keys in addresses and files. Other tests cover keys on
  YAML and settings lines, a connector that names a root `plugin.json`, and a
  skill server and an action server with the same name. Further tests cover
  credentials in assistant files, unknown text types, private keys, binary
  file preservation, and unstated assistant licenses through backup round
  trips, colliding servers between skills in package, plugin, and skill ZIP
  imports, and API descriptions at five, six, and eight path components.
  Root-manifest tests cover publisher URLs, descriptions, connector addresses,
  and rejection without a skill fallback through all three detection routes.
  Action and assistant metadata tests include misleading binary extensions.
  Other cases check disguised text attachments, unique action ids, and
  listed, unlisted, or rejected nested skills.
  Root-skill precedence and retained paths at their depth and length limits
  are checked through backup round trips too. Further cases check refused
  root attachments, packages with more than 20 assistants and skills,
  unused icons, invalid connector description paths, action-count limits,
  and unrelated web manifests with credential-like fields. Further cases
  check credential-bearing filenames and folders through each detection
  route, connectors beyond the combined server limit, and skill files beyond
  the file-count limit. Overflow sources are checked through backup round trips.
  Other cases check fallback secrets, rejected action paths, and action
  servers beyond the combined limit, including shared and mixed-provider actions.
  Relative API paths are checked against root-file collisions and path
  escapes. Other cases check runtime limits and rejected assistant references.
  `tests/project.test.mjs` covers colliding server names in all three
  plugin layouts, identical definitions, and existing numbered names. The synthetic
  packages follow Microsoft's documentation and were not checked by
  Microsoft's package validator. `npm test` on 2026-10-22 ran 332 tests, and
  all passed.
- `tests/tools.test.mjs` exports a fixed synthetic project
  (`tests/tools-fixture.mjs`), with an assistant that uses a skill that has one
  tool of each provider kind, to every download and compares each result with
  the golden files under `tests/fixtures/exports/`. Set `UPDATE_GOLDEN=1` to
  write them again after a deliberate change.
- Exports are checked against the pinned schemas in `tests/schemas/`
  (Agent Plugins 1.0.0 `plugin.json` and `mcp.json`, declarative agent v1.8,
  plugin manifest v2.4, and Teams manifest 1.28) by the small validator in
  `tests/schema-validator.mjs`, which has its own tests.
  `tests/schemas/SOURCES.md` lists each file's URL, download date, and SHA-256
  hash. The tests read these files from disk and never fetch a schema.
- A test keeps `index.html` under 750,000 bytes, so the page stays quick to
  load. The test fails as soon as the file grows past that.
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

#### Tools, skills, and plugins (V1 to V8)

The design for tools listed eight facts to check. On 2026-10-10 the vendor
documentation settled some of them. The rest need a real account.

| Item | Question | Status on 2026-10-10 |
|---|---|---|
| V1 | Can a Copilot API plugin use an operation that returns `text/plain`, such as PubMed abstracts? | Open. No Microsoft page says. If it cannot, `pubmed.abstracts` on Copilot drops to its fallback, which asks people to paste abstracts. Needs a tenant test. |
| V2 | Which declarative agent version to target, its instruction limit, and the plugin fields for a remote tool server | Settled by docs and schemas: v1.8, 8,000 characters, plugin manifest v2.4 with a `RemoteMCPServer` runtime. Version 1.9 with `agent_skills` is a preview only; whether to move to it is a follow-up. |
| V3 | Does a `.agent` file in a Teams chat honor `WebSearch.sites`? | Open. The `.agent` schema is not documented. Needs a tenant test. |
| V4 | Does ChatGPT accept a plugin with only a root `plugin.json`? | Partly settled. OpenAI documents it for ChatGPT, Codex, and the developer portal. The Admin console upload does not name a layout, so upload a Plugin download there once. |
| V5 | What does claude.ai load from a plugin, and is Skills on for the EFDC Team workspace? | Component list settled by docs (see vendor facts). Whether Skills is on in the EFDC workspace needs an Owner to look. |
| V6 | Do Gemini skills accept work and school accounts? | Settled: not yet. Recheck before changing the Gemini steps. |
| V7 | Does Copilot web search limited to `pubmed.ncbi.nlm.nih.gov` return useful results? | Open. The site passes the schema rules; usefulness needs a tenant test. |
| V8 | Can a person download a migrated ChatGPT plugin or a Gemini skill? | Gemini: yes, as a `.zip`, which the regular skill importer opens. ChatGPT: no download is documented for the person who migrated a GPT, so a GPT still moves by copying its fields into Create new. |

#### Other open tests

- Install a plain skill and a Plugin made by Agentprise in an OpenClaw you run
  yourself and in Kimi Code CLI, and confirm the skills load. The steps above
  come from their documentation; a real install has not been recorded.
- Upload a skill `.zip` made by Agentprise to a Gemini account and to a Claude
  account, and confirm both accept the `agentprise.json` file beside
  `SKILL.md`. The Claude upload path itself was settled by the documentation
  on 2026-10-10 (Customize, then Skills); a real upload has not been recorded.
- Upload a Claude plugin made by Agentprise to claude.ai, connect a web tool
  server from its Connectors tab, and confirm the skills load.
- Upload a Copilot app package with an action to a tenant, once with an
  OpenAPI action and once with a tool server, and confirm Copilot lists and
  calls them.
- Open a real Copilot Cowork plugin, and a package with `agent_skills` made by
  Microsoft 365 Agents Toolkit, and confirm the skills and connectors arrive.
  The importer was tested only with packages built from Microsoft's
  documentation.
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
- After mid-November 2026, run Microsoft's "Upgrade to Microsoft 365 agent" on
  a `.agent` file written by Agentprise and record what the upgrade keeps. The
  upgrade steps in the Teams chat guide come from Microsoft's page, not from a
  run.
- Create an agent in Copilot Agent Builder by pasting the name, description,
  instructions, and example questions from Agentprise, and confirm the agent
  behaves like the `.agent` file did. Also confirm that uploading the `.agent`
  file itself only adds it as reading material.

### Conclusion

Pick the download for the product you use, and download a backup if you are
unsure. If the download has tools, read its report and setup steps. Maintainers:
keep the project backup lossless, keep each item folder a valid Agent Skill,
keep the Microsoft and Agent Plugins files free of extra keys where their
schemas forbid them, keep `planExport` the single source for both the
instructions and the report, and update the tables above whenever a converter
or importer changes.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Connect the tools in a download](how-to/connect-tools.md)
- [Native Copilot skill restrictions](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-skills)
- [Toolkit skill setup](https://learn.microsoft.com/microsoft-365/copilot/extensibility/build-declarative-agents-add-custom-skills)
- [Microsoft plugin package format](https://learn.microsoft.com/microsoft-365/copilot/cowork/cowork-plugin-development)
- [Move a Gem or a custom GPT into Agentprise](how-to/move-a-gem-or-gpt.md)
- [Add your assistant to the Library](how-to/add-to-library.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Plugins specification](https://agent-plugins.org/specification)
- [OpenClaw skills](https://docs.openclaw.ai/skills)
- [OpenClaw plugin manifest](https://docs.openclaw.ai/plugins/manifest)
- [Kimi Code CLI skills](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html)
- [Declarative agent schema 1.8](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-manifest-1.8)
- [Plugin manifest 2.4](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-manifest-2.4)
- [Dynamic tool discovery for Copilot plugins](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-dynamic-tool-discovery)
- [Plugin authentication for Copilot](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-authentication)
- [Known issues for Copilot API plugins](https://learn.microsoft.com/microsoft-365/copilot/extensibility/known-issues#api-plugins)
- [Add custom skills to a declarative agent](https://learn.microsoft.com/microsoft-365/copilot/extensibility/declarative-agent-skills)
- [Knowledge sources for declarative agents](https://learn.microsoft.com/microsoft-365/copilot/extensibility/knowledge-sources)
- [App package for Microsoft 365](https://learn.microsoft.com/office/dev/add-ins/overview/app-package-for-microsoft-365)
- [Microsoft 365 app manifest versions](https://learn.microsoft.com/microsoft-365/extensibility/schema/)
- [Manifest developer object](https://learn.microsoft.com/microsoft-365/extensibility/schema/root-developer)
- [Claude skills documentation](https://claude.com/docs/skills/how-to)
- [Claude skills overview](https://claude.com/docs/skills/overview)
- [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude)
- [Use custom skills in Claude](https://support.claude.com/en/articles/12512198)
- [Create and edit files with Claude](https://support.claude.com/en/articles/12111783)
- [Claude plugins overview](https://claude.com/docs/plugins/overview)
- [Build a Claude plugin](https://claude.com/docs/plugins/build)
- [Claude plugin platform support](https://claude.com/docs/plugins/platform-support)
- [Claude plugin administration](https://claude.com/docs/plugins/admin)
- [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference)
- [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
- [OpenAI: build plugins](https://developers.openai.com/plugins/build/plugins)
- [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission)
- [Plugins in ChatGPT](https://help.openai.com/en/articles/20001256)
- [Projects in ChatGPT](https://help.openai.com/en/articles/10169521)
- [Custom GPT retirement and migration FAQ](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq)
- [Gemini skills help](https://support.google.com/gemini/answer/17094296)
- [Gems to skills in Gemini](https://support.google.com/gemini/answer/18560919)
- [Gemini productivity overview](https://gemini.google/overview/productivity/)

[Back to project README](../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
