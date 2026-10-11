<!--
This file is part of Agentprise
docs/how-to/move-an-assistant-to-gemini-or-claude.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-11
Summary: Step-by-step guide with screenshots: open an assistant file you already
         have, check it, and download it as a skill for Gemini or Claude.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Open an assistant you have and move it to Gemini or Claude

[Back to project README](../../README.md)

You already have an assistant as a file. Maybe you built it in SharePoint or
in the Microsoft 365 Copilot app, or you downloaded it from Agentprise before.
This guide opens that file, lets you check it, and gives you a skill file for
Gemini or Claude. It takes about five minutes.

Agentprise opens these files:

- A `.agent` file from SharePoint.
- An app package `.zip` from the Microsoft 365 Copilot app.
- Any file Agentprise made, including a backup you kept.
- Any Agent Skill `.zip` or `SKILL.md` file, from Gemini, Claude, or
  elsewhere.
- A plugin `.zip` made for Claude, for Codex, or for any tool that reads the
  Agent Plugins format.

If your assistant is a Gem in Gemini or a custom GPT in ChatGPT, see
[Move a Gem or a custom GPT into Agentprise](move-a-gem-or-gpt.md) first.

The example uses the Caveman sample, so the screens show a real assistant
without showing anyone's private work.

### Step 1: Open the file

1. Go to [code.depressioncenter.org/agentprise](https://code.depressioncenter.org/agentprise/).
2. Drag the file onto the dotted box, or choose **Choose a file** and pick it.

![The dotted drop box on the start page. It reads Drop an agent or skill file here. It says it accepts an Agentprise backup, a plugin or skill .zip, a .zip from the Copilot app, a .agent file, or a SKILL.md file, and that each file opens as a new project. A Choose a file button sits below.](../../images/guides/dropzone.png)

If you are in the middle of a project, the start page is not showing.
Choose **Workspace** on the left, or the home button at the top, to get back
to it.

The file opens as a new project and is added to **Your projects**. It never
replaces work you already have unless you say so. If the same project is
already in your workspace, for example because you are opening a backup you
downloaded earlier, the app asks what to do:

- **Keep both** adds the file as a second project, with "(copy)" at the end of
  its name.
- **Replace mine** puts the file in place of your project, and any changes you
  made to yours are lost.
- **Cancel** leaves everything as it was.

![A dialog titled You already have Caveman. It says the project is already in your workspace and asks whether to replace it with the one you opened or keep both, and warns that replacing loses your changes. It has three buttons: Cancel, Replace mine, and Keep both.](../../images/guides/replace-dialog.png)

A short note at the top confirms the file opened.

![A note bar that reads Opened caveman.zip as a project.](../../images/guides/status-opened.png)

### Step 2: Check what came through

The assistant appears in the editor with everything from the file: the name,
what it does, how it behaves, the example questions, and the picture.

![The editor with Caveman loaded. A note at the top reads Loaded Caveman. Change anything you like; it is your copy now. The In this project bar shows Caveman as an Assistant. The name, description, and instructions are filled in, and the preview on the right shows the Caveman picture, the name, the welcome line, and three example questions. The Download card, headed For Caveman, starts below the preview.](../../images/guides/editor-caveman.png)

Read through the four questions and fix anything you want to change. Then
open **More settings** under the questions and check the picture and the
**Publisher details** section.

If the file held more than one assistant or skill, each one is listed in the
**In this project** bar at the top. Choose a name in the bar to check it.

Two things are worth knowing when the file came from Microsoft:

- Sources from Microsoft 365 stay with the assistant: SharePoint links you
  pasted, files SharePoint stored by an internal id, Teams chats, mailboxes,
  and meetings. Files uploaded to the Copilot app come along too, inside a
  `references` folder in the skill.
- Settings that only Copilot understands, such as those sources, what Copilot
  may use, and the response mode, stay in the file but Gemini and Claude
  ignore them.

### Step 3: Download the skill

The downloads are for one assistant or skill at a time. The heading at the
top of the **Download** card says which one, such as "For Caveman." To
download another one in the project, choose it in the **In this project** bar
first.

Under **Download**, choose **Download** on the Gemini row or on the Claude
row. Each button gives a skill written for that product, so download the one
for the product you use. The file is a `.zip` named after the assistant, such
as `Caveman.zip`. The two files have the same layout, but they can differ in
small ways. For example, the Gemini skill leaves out Word, Excel, PowerPoint,
and OneNote files, because Gemini skills do not accept them.

![The Download card, shown here for an assistant called Team Helper. Under the heading For Team Helper, the Gemini and Claude rows each say Skill (.zip) and have a Download button on the right. The other rows are Copilot / Teams Apps, Teams Chat, Gemini Notebook, ChatGPT, and SKILL.md, followed by the Claude plugin and Plugin rows under For the whole project and a blue Download Backup button.](../../images/guides/where-it-can-go.png)

Gemini and Claude have skills but no separate place for an assistant, so the
skill's description starts with "Persona:". If the assistant uses skills, the
skill file holds only the assistant. Download each skill too, or use the
**Claude plugin** download under **For the whole project**, which holds every
assistant and skill in the project in one file.

This skill file is not the same as **Download Backup**. The skill holds one
assistant or skill, ready for Gemini or Claude. The backup holds the whole
project, ready to open in Agentprise again. Your project also stays under
**Your projects** in this browser, but browsers can clear what they store, so
download a backup of anything you want to keep.

To see what is inside, choose **Inspect** on the left. The Inspect page shows
every field as a plain form on the left, and the files for one product on the
right.

![The Inspect page for Caveman. The left card, titled Assistant details, shows the name, description, instructions, and prompt suggestions as form fields. The right card, titled Output Format, has ten tabs: Agentprise Backup, ChatGPT, Claude, Claude Plugin, Copilot / Teams Apps, Gemini, Gemini Notebook, Plugin, SKILL.md, and Teams Chat, with Gemini selected. Under the tabs, a report titled What changes in this download says the assistant is written as a skill whose description starts with Persona:, and the files in the caveman folder are listed below it, with SKILL.md shown.](../../images/guides/details.png)

Choose the **Gemini** tab, or the **Claude** tab for Claude. It lists the
files, with your own words highlighted. If the list
**What changes in this download** appears above the files, read it. It says
what was changed or left out for that product, and what needs setup.

![The Output Format card on the Gemini tab for Caveman. The report What changes in this download says the assistant is written as a skill whose description starts with Persona:. The files SKILL.md, agentprise.json, icon.png, LICENSE.txt, and README.md are listed inside a folder named caveman, with the contents of SKILL.md shown. At the bottom are a button that reads Download Caveman.zip and three steps for Gemini.](../../images/guides/details-gemini-claude.png)

### Step 4: Upload it to Gemini

1. In Gemini, open **Settings**, then **Skills**.
2. Choose **Upload** and pick the `.zip` file.
3. Check the skill and choose **Create**.

Gemini skills work only with personal Google accounts for now, not work or
school accounts. They may need a paid Google AI plan.

### Step 5: Upload it to Claude

1. In Claude, open **Customize**, then **Skills**.
2. Choose the plus button (**+**), then **Create skill**, then
   **Upload a skill**, and pick the `.zip` file.
3. Turn the skill on. It stays private to you until you share it.

Claude skills need a paid plan with code execution turned on.

### Step 6: Connect any tools

If the assistant uses tools, such as a search of PubMed, the skill holds a
file called `SETUP.md`. It lists the steps for each tool, such as turning on a
connector in Claude. You can skip this step if there is no `SETUP.md`. See
[Connect the tools in a download](connect-tools.md) for help with each step.

### Conclusion

Your assistant now works in Gemini or Claude. To change it
later, open it from **Your projects** or drop your backup on the Workspace
page. To send the same assistant to a ChatGPT project, see
[Copy an assistant into a ChatGPT project or Gemini Notebook](copy-an-assistant-into-chatgpt.md).

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Make a new assistant for Microsoft 365 Copilot](make-an-assistant-for-copilot.md)
- [Move a Gem or a custom GPT into Agentprise](move-a-gem-or-gpt.md)
- [Copy an assistant into a ChatGPT project or Gemini Notebook](copy-an-assistant-into-chatgpt.md)
- [Connect the tools in a download](connect-tools.md)
- [Formats: what each download keeps](../formats.md)
- [Frequently asked questions](../faq.md)
- [Gemini productivity overview](https://gemini.google/overview/productivity/)
- [Claude skills documentation](https://claude.com/docs/skills/how-to)
- [Use skills in Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude)
- [Gemini skills help](https://support.google.com/gemini/answer/17094296)

[Back to project README](../../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
