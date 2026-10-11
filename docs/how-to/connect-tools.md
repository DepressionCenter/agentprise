<!--
This file is part of Agentprise
docs/how-to/connect-tools.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-11
Summary: Guide for people who install a download that uses tools: what "needs
         setup" means, and how to turn on connectors, fill in a server address,
         allow custom apps and sign-in ids in Copilot, and let scripts reach
         the internet.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Connect the tools in a download

[Back to project README](../../README.md)

### Summary

Some assistants and skills use tools, such as a search of PubMed. Agentprise
writes each tool into the download, but some tools need one more step from you
or your admin before they work. This guide explains what "needs setup" means
and walks you through each kind of step. It is for the person who installs the
download, whether or not you made the assistant.

### Overview

A tool lets an assistant do something on its own, such as run a search and
read the results. Each product connects tools its own way. For example,
Claude often uses connectors, Microsoft 365 Copilot uses actions, and ChatGPT
and coding tools use tool servers. A skill can also carry a small script.

Agentprise does not run any tool, and it never contacts one. It writes the
settings each product needs, plus a section in the instructions called
**Tools available in this setup**. That section lists each tool, the ways to
reach it in this product, and what to do when none of them works.

You do not have to set up every tool. An assistant still works without its
tools. It does the parts it can and tells people it couldn't use the tool (see
[What happens without the tool](#what-happens-without-the-tool)).

#### Where tools come from

You cannot write a new tool inside Agentprise. Tools arrive with entries from
the Library, such as the **PubMed Search** skill, and with skill or plugin
files you open. In the project editor, a **Tools** list under the questions
shows each tool, what it does, and how it connects in Microsoft 365 Copilot,
Claude, ChatGPT, Gemini, and coding tools. A tool that came with a skill the
assistant uses says "Part of the skill" and the skill's name.

![Part of the editor for Evidence Scout. Under Skills it can use, PubMed Search is ticked. Under Tools are four tool cards: Run a PubMed query, Get article details, Read abstracts, and Browse PubMed pages. Each card says what the tool does, that it comes with the skill PubMed Search, and how Microsoft 365 Copilot, Claude, ChatGPT, Gemini, and coding tools connect it.](../../images/guides/editor-tools.png)

### Find out what needs setup

Agentprise tells you what each download needs in three places.

#### The report on the Inspect page

1. In Agentprise, choose **Inspect** on the left.
2. Choose the tab for your product, such as **Claude** or
   **Copilot / Teams Apps**.
3. Read the list called **What changes in this download**, above the files.

Each line names a part of the assistant and gives it one of five labels.

![The Output Format card of the Inspect page on the Claude Plugin tab for the Evidence Scout project, with Part of the project set to Evidence Scout (assistant). The report What changes in this download has one changed line, saying the assistant is written as a skill whose description starts with Persona:, and six needs setup lines for the PubMed Search tools. Those lines say each tool works once the PubMed connector is turned on, or that the script runs only where python3 has network access and, on claude.ai, a workspace Owner must allow the address it calls.](../../images/guides/details-claude-plugin.png)

| Label | What it means | What you do |
|---|---|---|
| kept | The part works the same way in this product. | Nothing. |
| changed | The part was rewritten to fit the product, such as a skill's steps added to the instructions. | Nothing, but read the note so you know what changed. |
| needs setup | The part is in the download, but it works only after a step from you or your admin. | Follow the setup steps for that part. |
| left out | The product has no way to use this part, so it is not in the download. | Nothing you can do in this product. The assistant works without it. |
| blocked | The download would break or would give the assistant more access than you asked for. | Fix the problem first. The download button stays off until you do. |

#### The setup steps

Downloads with tools come with setup steps written for that product.

- When something needs setting up, the skill ZIPs for Claude, Gemini, and
  other tools, the **Claude plugin**, and the **Plugin** download hold a file
  called `SETUP.md`. Open it in any text editor.
- The Copilot app package has no place for extra files. Its steps show on the
  Inspect page instead, as a file called
  **Setup steps (not in the package)** on the **Copilot / Teams Apps** tab.
- The Teams Chat file, the ChatGPT project instructions, and the Gemini
  Notebook file have no setup steps of their own. Read the notes in the
  report, and use the steps on this page.

`SETUP.md` has one section for each step that applies. Skip the sections for
tools you do not plan to use.

#### The README file

The skill ZIPs and the plugin downloads also hold a `README.md` file. Its
section **What changed in this export** repeats the report from the Inspect
page, so the person who installs the file can read it later.

### Fix a blocked download

A blocked download cannot be made until you fix what the report names. These
are the reasons a download can be blocked, and the fix for each.

| Report says | Why | Fix |
|---|---|---|
| A tool lists more than 4 web search sites | Copilot can limit web search to 4 sites at most. | Use a different download, remove the tool with **Remove this tool**, or ask the tool's author for a version with fewer sites. |
| Your sites and the tools' sites together are more than 4 | Agentprise adds the tools' sites to your own list under Web search, and the total would be more than 4. | Open **More settings**, then **Microsoft Copilot settings**, and remove some of your own web sites. |
| The instructions are too long | Copilot allows 8,000 characters of instructions, and the instructions plus tool notes are longer. | Shorten the instructions by the number of characters the report gives. |
| A source list would be dropped | The download would let the assistant use a whole source, such as all of SharePoint, instead of the places you listed. | Report the problem on GitHub. Agentprise blocks this so access is never widened without you knowing. |

### Steps for each kind of setup

#### Turn on a connector

A connector is a ready-made link between the product and another service,
such as PubMed. The download names the connector, but you or your admin turn
it on.

- **Claude:** open **Customize**, then **Connectors**. Find the connector and
  connect it. On a Team or Enterprise plan, an Owner may need to add it first
  under **Organization settings**, then **Connectors**.
- **Claude plugin:** after you upload the plugin, open the plugin's
  **Connectors** tab and connect what it lists. Adding a plugin does not
  connect its tools for you.
- **Microsoft 365 Copilot:** ask your admin whether a connector for that
  service is available to Copilot.
- **Other products:** look for the service in the product's list of
  connectors or apps, and connect it.

#### Fill in a tool server address

A tool server is a service on the web that gives an assistant tools. Some
tools say "you supply your own server". Agentprise cannot know your address,
so you add it. The easiest time to do this is before you download.

**Before you download (recommended):**

1. Open the project in Agentprise.
2. Open **More settings**, then **Tool connections**.
3. In the box called **Address of the** followed by the server's name, paste
   the address of your server.
4. Download again. The address is now inside the file.

The address must start with `https://`. Agentprise refuses an address that
holds a user name, a password, a `#` part, or a key or token after the `?`.
Every person who installs the file can read it, so a key must never be part of
the address. Connect sign-ins in the product instead.

**After you download:** the file holds a stand-in address,
`https://example.com/replace-with-your-mcp-server-address`. The setup steps
name the file to change.

| Download | File to change |
|---|---|
| Claude plugin | `.mcp.json` |
| Plugin for ChatGPT, Codex, GitHub Copilot, Cursor | `mcp.json` |
| Copilot app package | `plugin-` followed by a short name and `.json`, such as `plugin-notes.json` |

1. Unzip the download.
2. Open the file in a text editor, such as Notepad or TextEdit.
3. Replace the stand-in address with the `https://` address of your server.
4. Save the file.
5. Zip the files again with the same layout they had. A plugin keeps its one
   main folder. For the Copilot app package, `manifest.json` must sit at the
   top of the ZIP, not inside a folder.

Until the address is filled in, the assistant works without that tool and
says so.

`.mcp.json` starts with a dot, so some computers hide it. Turn on hidden files
in your file manager if you cannot see it.

#### Allow custom apps in Microsoft 365

When a Copilot app package includes actions, your organization must allow
custom apps. A Teams administrator turns this on in the Teams admin center,
under **Teams apps**, then **Setup policies**, with **Upload custom apps**.
The setup steps include this section only when the package has actions.

#### Register a sign-in for a Copilot action

Some actions need a sign-in or a key. Copilot keeps those in the organization,
not in the package, so a Microsoft 365 admin must register the sign-in first,
for example in the Teams Developer Portal.

1. Ask your admin to register the sign-in for the tool the setup steps name.
2. The admin gives you an id for that registration.
3. Unzip the app package and open the file the setup steps name, such as
   `plugin-notes.json`.
4. Replace `replace-with-your-auth-registration-id` with the id.
5. Save the file and zip the files again, with `manifest.json` at the top of
   the ZIP.

Copilot does not accept an API key for tool servers. When a tool server needs
one, Agentprise leaves it out of the app package and says so in the report.

#### Let a script reach the internet

Some skills carry a small script, such as a Python file that searches PubMed.
The script runs only where the product allows it to reach the internet.
`SETUP.md` names the web addresses the script calls.

- **Claude (claude.ai):** code execution must be on. On a Team or Enterprise
  plan, a workspace Owner opens **Organization settings**, then
  **Capabilities**, chooses
  **Package managers and specific domains**, and adds the addresses from
  `SETUP.md`. Claude's default list holds package sites, such as the
  Python package index, and a few others, so a script's addresses usually
  need adding.
- **Gemini:** Gemini skills cannot run scripts that reach the internet. The
  skill still works in Gemini without the script.
- **Coding tools such as Claude Code or Codex:** allow the command when the
  tool asks.
- **Copilot, Teams Chat, ChatGPT project instructions, and Gemini Notebook:**
  these cannot run scripts, so Agentprise leaves the script out and says so
  in the report.

A script can also need a setting from you. For example, the PubMed Search
script runs only when the `NCBI_EMAIL` environment variable holds the contact
address of the person or team who set up the skill. The skill's `SKILL.md`
names what its script needs.

Before you allow a script, open it and check what it does, or ask someone who
can read code. Agentprise checks that the file is plain text, but it does not
check what the script does.

#### Add a skill the assistant uses

A skill ZIP for Claude or Gemini holds one assistant or skill. When an
assistant uses a skill, the report says "needs setup" for that skill. Download
the skill too and add it in the same place. Or use the **Claude plugin** or
the **Plugin** download, which hold every assistant and skill in the project.

### What happens without the tool

The instructions in every download tell the assistant what to do when a tool
is missing:

1. Use the first way to reach the tool that works in this conversation.
2. If none works, follow the tool's own fallback, such as "prepare a search
   people can paste into PubMed".
3. Only report a search, lookup, or retrieval as done when a tool returned
   results in this conversation.

So an assistant without its tool does not pretend. It says plainly that no
tool was used, and it offers what it can do without one. A tool marked
"(required)" in the **Tools** list is the exception: without it,
the assistant cannot do what it was made for. When a download has no way to
reach such a tool, the report says so.

### Example: the PubMed Search skill

The PubMed Search skill in the Library connects differently in each product.
The **Tools** list shows the same thing for your own copy.

| Product | How it searches PubMed | What you set up |
|---|---|---|
| Claude | The PubMed connector, or else the skill's script | Connect PubMed, or let the script reach the PubMed web address |
| Microsoft 365 Copilot app package | An action built from the PubMed web service, plus web search limited to the PubMed site | Allow custom apps |
| ChatGPT and the Plugin download | A PubMed tool server you supply | In the Plugin download, fill in the server address. With the ChatGPT project instructions, connect your server in ChatGPT |
| Gemini | No tool | Nothing. It prepares searches you can run in PubMed yourself |
| Coding tools, with the SKILL.md download | The skill's script | Allow the command when asked |

### Conclusion

You can now read the report for any download, fix a blocked download, and
finish each kind of setup step. Start with the tools you need most. Until
you connect the rest, the assistant tells people it can't use them. To see what each download holds,
read [Formats](../formats.md).

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Using Agentprise](../usage.md)
- [Formats: what each download keeps](../formats.md)
- [Frequently asked questions](../faq.md)
- [Open an assistant you have and move it to Gemini or Claude](move-an-assistant-to-gemini-or-claude.md)
- [Claude plugins overview](https://claude.com/docs/plugins/overview)
- [Build MCP plugins for Microsoft 365 Copilot](https://learn.microsoft.com/microsoft-365/copilot/extensibility/build-mcp-plugins)
- [Plugins in ChatGPT](https://help.openai.com/en/articles/20001256)
- [Manage custom apps in the Microsoft Teams admin center](https://learn.microsoft.com/microsoftteams/teams-custom-app-policies-and-settings)

[Back to project README](../../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
