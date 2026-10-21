<!--
This file is part of Agentprise
docs/faq.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-21
Summary: The questions people ask about Agentprise, with the same answers the
         Help page inside the app gives, plus questions about tools, plugins,
         and what changes in each download.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Frequently asked questions

[Back to project README](../README.md)

These are the questions people ask most, with the same answers as the Help page
inside the app, plus a few about tools and plugins. If your question is about
a particular download, the [formats page](formats.md) goes deeper.

### What is Agentprise?

An app that lets you describe an AI assistant or skill once and download it
in the form each product wants: Microsoft 365 Copilot, Teams, Gemini, Claude,
ChatGPT, and more. It runs in your browser. Nothing you type is sent anywhere.

### What are projects and skills?

A project is one thing you are building, kept in your browser under Your
projects on the Workspace page. Most projects hold one assistant. A project
can also hold skills: sets of steps an assistant follows only when a question
needs them, such as how to search PubMed. Choose Add a skill in a project to
write one, or add one from the Library or a skill file, then check it under
Skills it can use.

### Which download do I need?

It depends on where people will use the assistant.

- **Copilot / Teams Apps** gives you an app package (`.zip`) for the Agents
  list in the Microsoft 365 Copilot app and in Teams.
- **Teams Chat** gives you a `.agent` file for a Teams group chat, channel, or
  meeting. You put the file in a SharePoint library first.
- **Gemini** and **Claude** each get a skill (`.zip`), written for that
  product.
- **ChatGPT** gets project instructions to copy and paste into a ChatGPT
  project.
- **Gemini Notebook** gets a `.md` file to add as a source, or the same text
  to paste.
- **Claude plugin** gives you every assistant and skill in the project, with
  their tools, as one plugin for claude.ai, Cowork, and Claude Code.
- **Plugin** gives you the same for ChatGPT, Codex, GitHub Copilot, Cursor,
  and other tools that read Agent Plugins.

Not sure yet? Download a backup. You can come back any time and download it
for another product.

### Does it work with Kimi or OpenClaw?

Partly. Kimi Code CLI and an OpenClaw you run yourself both read the
**SKILL.md** download (the plain skill) and the **Plugin** download. OpenClaw
also reads the **Claude plugin**. The
[formats page](formats.md#what-to-do-with-the-file) has the steps. Kimi chat,
Kimi Agent mode, and the Kimi Claw that Kimi hosts for you have no way to
upload a skill file yet, so Agentprise cannot make a download for them.

### What does "Download Backup" do?

It saves the whole project, with every assistant, skill, and file, as one
`.zip` file on your computer. Drop that file on the Workspace page later to
open it again, change it, or download it for a different product. To upload to
Gemini or Claude, use their own Download buttons instead.

### Which files can I attach?

Word, PowerPoint, Excel, PDF, OneNote (`.one` and `.onepart`), and plain text
files, including scripts and data files such as PowerShell, Python, SQL,
Markdown, CSV, and JSON. Up to 20 files, each under 10 MB. The app reads the
start of every file and refuses programs, including ones renamed to look like
a document. Copilot accepts only document types, `.onepart`, and `.txt`, so a
script is added as a `.txt` file with the same name, and a `.one` file is left
out of the app package. The skill `.zip` keeps every file under its real name.

### Where do links go?

Each Copilot source has its own box under Copilot settings. Web sites go under
Web search, up to 4. SharePoint and OneDrive links go under SharePoint and
OneDrive, up to 20. Links to teams, channels, group chats, or meeting chats go
under Teams messages, up to 5. Shared or group mailbox addresses go under
Email. A box only matters while its source is on, and leaving it empty means
Copilot may use everything the person can see.

### Who can use my assistant?

In Microsoft 365, people need a Copilot license and permission to any files you
linked. Guests cannot use it in Teams chats. Gemini skills work only with
personal Google accounts for now, not work or school accounts, and may need a
paid Google AI plan. Claude skills need a paid Claude plan, and Claude plugins
need Skills turned on for the organization. In
ChatGPT, a plugin is uploaded by a workspace owner or someone with permission
to upload plugins.

### What are tools?

A tool lets an assistant do something on its own, such as search PubMed and
read the results. Tools come with Library entries and with files you open, and
the **Tools** list in the editor shows how each product connects them. Some
tools need a step after you download, such as turning on a connector or
pasting a server address. If a tool isn't connected, the assistant does what
it can and tells people it couldn't use the tool. See
[Connect the tools in a download](how-to/connect-tools.md).

### What does "needs setup" mean?

On the Inspect page, the list **What changes in this download** marks each part
of a download as kept, changed, needs setup, left out, or blocked. "Needs
setup" means the part is in the download but works only after a step from you
or your admin. The steps are in the `SETUP.md` file inside the download, or on
the Inspect page for the Copilot app package.

### Why is a download button turned off?

A required question is still empty, the download is blocked, or the author
marked the assistant or skill as not for that product. The card lists empty
questions as links. A blocked download shows why in the list **What changes in
this download** on the Inspect page. Common reasons are a web search list over
Copilot's limit of four sites, or instructions longer than Copilot's limit of
8,000 characters. Fix what the list names and the button turns back on.

When the author marked it as not for a product, a short note under the
download says so, such as "Marked as not for Claude: Needs the Claude Docs
plugin." To download it anyway, open **More settings**, then **Products it
works in**, and check the product.

### Why does my assistant's description start with "Persona:"?

Gemini, Claude, and plugins have skills but no separate place for an always-on
assistant. So Agentprise writes the assistant as a skill and starts its
description with "Persona:". Copilot, Teams Chat, ChatGPT project
instructions, and Gemini Notebook have the opposite problem, so a skill
becomes an assistant there, and an assistant's skills are added to its
instructions.

### Can I bring over a custom GPT or a Gem?

Custom GPTs retire on December 11, 2026, and ChatGPT has no file to export
one. Copy the GPT's name, description, instructions, and conversation starters
into a new assistant with **Create new**. Gems are turning into Gemini skills.
Once a Gem is a skill, download it from Gemini under **Settings**, then
**Skills**, then **More**, then **Download**, and drop the `.zip` file on the
Workspace page. Gems retire in November 2026 for personal Google accounts,
March 2027 for Workspace business, enterprise, and nonprofit accounts, and
June 2027 for Workspace education accounts. [Move a Gem or a custom GPT into Agentprise](how-to/move-a-gem-or-gpt.md)
walks through both, step by step.

### How do I change an assistant I already shared?

Open it from Your projects on the Workspace page, or drop the file you
downloaded before on that page, make your changes, and download it again. For
an app package, upload the new file in place of the old one. It keeps the same
id, so Copilot treats it as an update.

### Why does my assistant not answer in a Teams chat?

App packages do not work in group chats, channels, or meeting chats. Use the
Teams Chat download instead: put the `.agent` file in a SharePoint library,
choose Copy link for Teams, paste the link in the chat, and choose Add to this
chat.

### How long will the Teams Chat file keep working?

Until the end of March 2027. After that, Microsoft retires `.agent` files and
they stop answering, in SharePoint, in Teams chats, and in the Copilot app.
Only the file type is going away, not your assistant, and the Copilot / Teams
Apps download is not affected. From mid-November 2026, Microsoft gives the
file's owner an Upgrade to Microsoft 365 agent button in SharePoint.
[When Microsoft retires this file](how-to/add-an-assistant-to-a-teams-chat.md#when-microsoft-retires-this-file)
in the Teams chat guide explains the choices, and
[Microsoft's upgrade page](https://learn.microsoft.com/sharepoint/upgrade-sharepoint-agents)
has the dates. Agentprise keeps opening `.agent` files after that date, so
nothing you wrote is lost.

### Can I upload the .agent file to Copilot Agent Builder?

No. A file you upload there becomes reading material for a new agent, the same
as a Word document would. It does not set up the agent, and you cannot edit
the result as if it had. To build the same assistant in Agent Builder, create
a new agent there and paste the name, description, instructions, and example
questions from Agentprise, then choose its sources again in the builder. The
[Teams chat guide](how-to/add-an-assistant-to-a-teams-chat.md#do-not-upload-the-file-to-copilot-agent-builder)
has the steps.

### Why does Teams ask me to approve the answer?

In a group chat, Teams shows the person who asked a preview whenever the answer
used something the others may not be able to see, such as that person's own
chats, mail, or meetings. Turn off Teams messages, email, and meetings under
Copilot settings and answers post straight to the chat. Web search does not
cause this.

### What does the check for sensitive data look for?

Before you download, the app looks through your assistant's text and plain-text
files for things that often mean personal information, such as Social Security
numbers, phone numbers, email addresses, street addresses, and dates labelled
as a birth date or a hospital stay. It also looks for text that tries to take
over an assistant, such as "ignore previous instructions" or invisible
characters. It checks the text of each tool too. If it finds something, a
yellow box appears under **Download**. Choose **View details** to see where
each match is, with the digits hidden. It is a hint to look, not proof: a help desk
assistant may hold a phone number on purpose. It also misses plenty, including
people's names, so it is not a privacy review and never blocks a download. The
check runs in your browser and nothing is sent anywhere.

### Where does my work go?

Nowhere! Your Agentprise projects are kept only in your web browser, and are
never uploaded to the Internet. It is recommended to download a backup copy
since browsers can sometimes clear local storage.

### Can other people start from my assistant?

Yes. The Library holds ready-made assistants anyone can try and change. To add
yours, download a backup and
[send it to us on GitHub](https://github.com/DepressionCenter/agentprise/issues/new?template=library-assistant.yml).
The [how-to page](how-to/add-to-library.md) explains what to include.

### Why is the Library empty on my computer?

The Library is a folder of files next to the page, and a browser cannot read
that folder when you open `index.html` straight from a disk. Use the online
version at [code.depressioncenter.org/agentprise](https://code.depressioncenter.org/agentprise/),
or start the included server as the README describes.

### At a glance

| Download | Copilot / Teams Apps | Teams Chat | Gemini | Claude | ChatGPT |
|---|---|---|---|---|---|
| App package (`.zip`) | Yes | No | No | No | No |
| `.agent` file | No | Yes | No | No | No |
| Skill (`.zip`) | No | No | Yes | Yes | No |
| Plain skill, SKILL.md (`.skill.zip`) | No | No | Yes | Yes | No |
| Copy text | No | No | Notebook only | No | Yes, as project instructions |
| `.md` file | No | No | Notebook only | No | No |
| Claude plugin (`.claude-plugin.zip`) | No | No | No | Yes | No |
| Plugin (`.plugin.zip`) | No | No | No | No | Yes, uploaded in a workspace |
| Backup (`.agentprise.zip`) | No | No | No | No | No |

The backup opens only in Agentprise. Keep it to change the project later. The
Plugin download also works in Codex, GitHub Copilot, Cursor, OpenClaw, and
other tools that read Agent Plugins. The plain skill works in Claude Code,
Codex, Kimi Code CLI, OpenClaw, and other tools that read Agent Skills. The
`.agent` file works until the end of March 2027, when Microsoft retires that
file type.

### Conclusion

If your question is not here, the usage page walks through every part of the
app, and the formats page explains each file. Anything still unclear is worth an
issue on GitHub, so the answer can be added here.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Using Agentprise](usage.md)
- [Formats: which download goes where](formats.md)
- [Connect the tools in a download](how-to/connect-tools.md)
- [Move a Gem or a custom GPT into Agentprise](how-to/move-a-gem-or-gpt.md)
- [Add your assistant to the Library](how-to/add-to-library.md)
- [Ask a question or send an assistant on GitHub](https://github.com/DepressionCenter/agentprise/issues/new)

[Back to project README](../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
