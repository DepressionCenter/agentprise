<!--
This file is part of Agentprise
docs/how-to/move-a-gem-or-gpt.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-11
Last Modified: 2026-10-11
Summary: Step-by-step guide: bring a Gemini Gem or a ChatGPT custom GPT into
         Agentprise before those products retire, by opening the Gemini skill
         download or by copying the GPT's fields into Create new.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Move a Gem or a custom GPT into Agentprise

[Back to project README](../../README.md)

### Summary

Google is retiring Gems, and OpenAI is retiring custom GPTs. This guide shows
you how to keep the assistant you built by bringing it into Agentprise before
it goes away. From there you can send it to Copilot, Teams, Claude, ChatGPT
projects, or Gemini again. A Gem takes about two minutes. A GPT takes about ten,
because you copy its parts by hand.

### Overview

Neither Google nor OpenAI gives you one file that holds a whole Gem or GPT.
Instead, each company is turning its old assistants into skills or plugins:

- Google turns each Gem into a Gemini skill. You can download a Gemini skill as
  a `.zip` file, and Agentprise opens that file directly.
- OpenAI offers to turn each GPT into a ChatGPT plugin with a skill inside. Its
  help pages do not say how the person who made the change can download that
  plugin. So for a GPT, you copy each part into a new assistant in Agentprise.

#### When they retire

| Product | Account type | Retires |
|---|---|---|
| Custom GPTs | All ChatGPT plans | December 11, 2026 |
| Custom GPTs | Enterprise workspaces with an approved deferral | February 11, 2027 |
| Gems | Personal Google accounts | November 2026 |
| Gems | Google Workspace business, enterprise, and nonprofit accounts | March 2027 |
| Gems | Google Workspace education accounts | June 2027 |

These dates come from the Google and OpenAI help pages listed at the end of
this page, as they read on October 10, 2026. Check those pages if your date is
close, because vendors sometimes change them.

### Move a Gem

Google changes your Gems into Gemini skills for you. Once that has happened,
you download the skill from Gemini and open it in Agentprise.

#### Step 1: Download the skill from Gemini

1. Open Gemini and go to **Settings**, then **Skills**.
2. Find the skill that used to be your Gem.
3. Move your mouse over the skill, then choose **More**, then **Download**.

Gemini saves a `.zip` file with the skill inside. Leave it zipped.

Skills in Gemini are open only to people 18 or older who sign in with a
personal Google account. If you use a work or school account, the skill
download is not available to you yet. In that case, copy the Gem's name,
description, and instructions into **Create new**, the same way the GPT steps
below describe.

#### Step 2: Open the file in Agentprise

1. Go to [code.depressioncenter.org/agentprise](https://code.depressioncenter.org/agentprise/).
2. Drag the `.zip` file onto the dotted box on the Workspace page, or choose
   **Choose a file** and pick it.

The skill opens as a new project and is added to **Your projects**.

#### Step 3: Check it and make it an assistant if you want

The file opens as a skill, because that is what Gemini made it. A skill is a
set of steps an assistant follows only when a question needs them. Read the
name, the description, and the steps, and fix anything that came across
wrong.

If you want an always-on assistant, like your Gem was, choose **Create new**
on the Workspace page. Copy the skill's name and steps into the new
assistant's questions. Or keep the skill and give it to an assistant: open the
assistant, choose **Add from a file**, pick the same `.zip` file, and tick the
skill under **Skills it can use**.

Files your Gem used come along only if Google could copy them into the skill.
Google says files from GitHub are not supported in skills. Add any missing
files yourself under **More settings**, then **File attachments**.

### Move a custom GPT

OpenAI does not let you download a GPT, so you copy its parts into a new
assistant. Do this before the GPT retires, because after that you cannot open it.

#### Step 1: Open the GPT in ChatGPT

1. In ChatGPT, go to **My GPTs**.
2. Open the GPT you want to move, so you can see its name,
   description, instructions, conversation starters, and knowledge files.

If you already chose **Migrate to plugin**, the original GPT becomes
read-only. You can still open it and copy from it until it retires.

#### Step 2: Start a new assistant in Agentprise

1. Go to [code.depressioncenter.org/agentprise](https://code.depressioncenter.org/agentprise/).
2. On the Workspace page, choose **Create new**.

#### Step 3: Copy each part across

Copy each part of the GPT into the matching place in Agentprise.

| In the GPT | In Agentprise |
|---|---|
| Name | **What should it be called?** |
| Description | **What does it do?** |
| Instructions | **How should it behave?** |
| Conversation starters | **What might people ask it first?** Choose **Add another question** for each one, up to twelve. |
| Knowledge files | **More settings**, then **File attachments**, then **Add files**. Up to 20 files, each under 10 MB. |
| Picture | **More settings**, then **Picture**, then **Choose an image**. Save the picture to your computer first, if you can. |

Agentprise saves your work in the browser as you type. The preview on the
right shows roughly what people will see.

For knowledge files, use your own copies if you still have them. Agentprise
takes Word, PowerPoint, Excel, PDF, OneNote, and plain text files.

#### What does not come across

- **Actions.** A GPT action called another service. Agentprise cannot make a
  new tool, so leave actions out. If a Library skill offers the same tool,
  such as **PubMed Search**, you can add that skill instead.
- **The model choice and sharing settings.** Each product picks its own model
  and has its own sharing. You share the assistant again in the product you
  send it to.

### Download it for the product you want

Your Gem or GPT is now a project in Agentprise. Use the **Download** card on
the right to send it where you need it. To keep using it in ChatGPT, choose
**Copy** on the **ChatGPT** row and paste the text into a ChatGPT project. To
use it in Gemini again, choose **Download** on the **Gemini** row and upload
the skill in Gemini.

Choose **Download Backup** too. The backup holds the whole project, so you can
open it in Agentprise later even if your browser clears what it stores.

### Conclusion

You can now keep a Gem or a custom GPT after its product retires, and send the
same assistant to other products as well. To place it in a ChatGPT project,
see [Copy an assistant into a ChatGPT project or Gemini Notebook](copy-an-assistant-into-chatgpt.md).
To upload it to Gemini or Claude, see
[Open an assistant you have and move it to Gemini or Claude](move-an-assistant-to-gemini-or-claude.md).

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Using Agentprise](../usage.md)
- [Copy an assistant into a ChatGPT project or Gemini Notebook](copy-an-assistant-into-chatgpt.md)
- [Open an assistant you have and move it to Gemini or Claude](move-an-assistant-to-gemini-or-claude.md)
- [Make a new assistant for Microsoft 365 Copilot](make-an-assistant-for-copilot.md)
- [Frequently asked questions](../faq.md)
- [Gemini: transition from Gems to skills](https://support.google.com/gemini/answer/18560919)
- [Gemini: create and manage skills](https://support.google.com/gemini/answer/17094296)
- [OpenAI: custom GPT retirement and migration FAQ](https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq)

[Back to project README](../../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
