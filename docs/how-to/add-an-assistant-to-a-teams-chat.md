<!--
This file is part of Agentprise
docs/how-to/add-an-assistant-to-a-teams-chat.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-23
Summary: Step-by-step guide with screenshots: download the .agent file and add
         an assistant to a Teams group chat, channel, or meeting chat. Also
         covers what to do when Microsoft retires .agent files after March 2027.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Put an assistant in a Teams group chat

[Back to project README](../../README.md)

An app package works in the Agents list, but it does not answer in a group
chat, a channel, or a meeting chat. For those, Teams wants a `.agent` file
stored in a SharePoint library. This guide downloads that file and adds it to
a chat. It takes about five minutes once the assistant is written. You need a
Microsoft 365 account with Copilot and a SharePoint library the people in the
chat can reach.

Microsoft retires `.agent` files after March 2027. Files already in a chat
keep answering until then. See [Retirement of .agent files](#retirement-of-agent-files)
for dates and replacement options.

### Step 1: Have your assistant open in Agentprise

Open [code.depressioncenter.org/agentprise](https://code.depressioncenter.org/agentprise/)
and either make a new assistant or open a file you have. If you need help
with that part, see
[Make a new assistant for Microsoft 365 Copilot](make-an-assistant-for-copilot.md)
or
[Open an assistant you have](move-an-assistant-to-gemini-or-claude.md).

Teams chats show a welcome message when someone opens the assistant, so this
is a good time to write one. Choose **More settings** under the questions and
type it in the **Welcome message** box.

![More settings opened for an assistant called Team Helper. The Welcome message box is at the top and is empty. Under it are a Picture area with a blue square showing the letter T, a File attachments area with an Add files button, and two closed sections: Microsoft Copilot settings and Publisher details.](../../images/guides/more-settings.png)

### Step 2: Download the .agent file

Under **Download**, find the **Teams Chat** row and choose **Download**.
Your browser saves one file named after the assistant, such as
`Caveman.agent`.

![The Download card for an assistant called Team Helper. Under the heading For Team Helper, the second row, Teams Chat, says .agent file and has a Download button on the right. The other rows are Copilot / Teams Apps, Gemini, Gemini Notebook, Claude, ChatGPT, and SKILL.md, followed by the Claude plugin and Plugin rows under For the whole project and a blue Download Backup button.](../../images/guides/where-it-can-go.png)

To see the file before you download it, choose **Inspect** on the left and
then the **Teams Chat** tab. Everything you wrote is in this one file,
including the welcome message and the picture.

![The Files for each product card of the Inspect page on the Teams Chat tab for Caveman. One file, Caveman.agent, is listed, with its contents shown. At the bottom are a button that reads Download Caveman.agent and four steps under the heading For a Teams chat.](../../images/guides/details-teams-chat.png)

### Step 3: Put the file in SharePoint

These steps happen in SharePoint and Teams, so Agentprise cannot show them.

1. Open a SharePoint document library that the people in your chat can reach.
   A library on the team's own site is the usual choice.
2. Upload the `.agent` file to it.
3. Open the file's menu and choose **Copy link for Teams**.

### Step 4: Add it to the chat

1. Open the group chat, channel, or meeting chat in Teams.
2. Paste the link you copied.
3. Choose **Add to this chat**.

The assistant now answers in that chat. People in the chat need a Copilot
license and permission to any SharePoint files you linked. Guests cannot use
it in Teams chats.

### Changing it later

Open the project from **Your projects** on the Workspace page in Agentprise,
or drop the `.agent` file on the drop area there. Make your changes, and
download it again. Upload the new file to SharePoint in place of
the old one, and the chat picks up the change.

### Retirement of .agent files

Microsoft lists two dates on its
[upgrade page](https://learn.microsoft.com/sharepoint/upgrade-sharepoint-agents)
(checked 2026-10-21):

1. **Mid-November 2026.** SharePoint and OneDrive stop saving new agents as
   `.agent` files and create them in Copilot Agent Builder instead. An
   **Upgrade to Microsoft 365 agent** button appears on existing files.
2. **End of March 2027.** Existing `.agent` files stop answering, in
   SharePoint, in Teams chats, and in the Copilot app.

Choose a replacement based on the assistant's purpose:

| Assistant's purpose | Replacement |
|---|---|
| Answers questions about one SharePoint site | Copilot in SharePoint, which needs no agent file |
| Repeats one task on a site, such as summarizing new items | A skill. Microsoft plans a conversion tool in Copilot in SharePoint. Agentprise can already download your instructions as SKILL.md |
| Is a named assistant that answers people's questions | Copilot Agent Builder. See [Create the assistant in Copilot Agent Builder](#create-the-assistant-in-copilot-agent-builder) |
| Works in the Agents list in Teams or the Copilot app | The Copilot / Teams Apps download, which is a different file type and is not affected |

#### Upgrade permissions and effects

The upgrade does not happen on its own. To start it, you need permission to
edit the `.agent` file and the site pages, and to share agents. If you don't
have those permissions, ask the file owner, its creator, or a site owner to
start the upgrade.

After the upgrade, you cannot edit the original `.agent` file. Share the
upgraded agent again unless it was already shared with the whole organization.
The upgrade does not copy usage history. Remove the old agent from each Teams
chat and add the upgraded agent using its sharing link.

Keep the `.agent` file and a backup from Agentprise until the replacement
works in the chat. Agentprise can still open `.agent` files after March 2027
so you can recover their contents. Agentprise cannot transfer ownership,
sharing permissions, installations, or history stored by Microsoft.

### Create the assistant in Copilot Agent Builder

Uploading a `.agent` file to Copilot Agent Builder adds it as reference
material. To set up an assistant with the same name, instructions, and
settings, copy your text into a new assistant there.

To build the same assistant in Agent Builder:

1. In Agentprise, open the assistant and choose **Inspect**, then the
   **Teams Chat** tab, to see everything you wrote in one place.
2. In Agent Builder, create a new agent.
3. Paste the name, description, instructions, and example questions into the
   matching boxes.
4. Choose the websites, SharePoint sources, and other settings again in the
   builder. Pasting the instructions does not set them.

### Conclusion

You can use the `.agent` file in Teams chats until the end of March 2027.
Test a replacement before that date and keep an Agentprise backup.
For the Agents list in Copilot or Teams, use the app package. The
[formats page](../formats.md) explains the download options.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Make a new assistant for Microsoft 365 Copilot](make-an-assistant-for-copilot.md)
- [Open an assistant you have and move it to Gemini or Claude](move-an-assistant-to-gemini-or-claude.md)
- [Formats: which download goes where](../formats.md)
- [Frequently asked questions](../faq.md)
- [Microsoft: upgrade SharePoint agents](https://learn.microsoft.com/sharepoint/upgrade-sharepoint-agents)
- [Microsoft: knowledge sources in Agent Builder](https://learn.microsoft.com/microsoft-365/copilot/extensibility/agent-builder-add-knowledge)

[Back to project README](../../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
