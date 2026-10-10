<!--
This file is part of Agentprise
docs/usage.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: How to use Agentprise, job by job: create an assistant, open one you
         have, start from the Library, download it for each product, and keep a copy.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Using Agentprise

[Back to project README](../README.md)

This page walks through each thing you can do in Agentprise, in the order most
people do them. It is written for the person making an assistant, not for a
developer. If you only want to know which download to pick, the
[formats page](formats.md) is shorter. If you would rather follow pictures,
the [step-by-step guides](README.md#step-by-step-guides) cover the same jobs
with a screenshot for each screen.

### Open the app

Go to [code.depressioncenter.org/agentprise](https://code.depressioncenter.org/agentprise/).
There is nothing to install and no account to make. Everything happens in your
browser, and nothing you type is sent anywhere.

The page has four parts, listed down the left side:

- **Workspace** is where you describe your assistant.
- **Library** holds ready-made assistants you can start from.
- **Details** shows every field and the exact files each product receives.
- **Help** answers the most common questions.

### Create a new assistant

1. On the Workspace page, choose **Create new**.
2. Answer the four questions. Each one has a blank under it.
   - Under **What should it be called?**, type a short name. This is how the
     assistant will be listed wherever you send it.
   - Under **What does it do?**, write one sentence that says what it is for.
   - Under **How should it behave?**, describe how you want it to answer, what
     it should focus on, and what it should avoid. Plain English is fine. If
     you are not sure where to start, choose **Help me write this** to get a
     template.
   - Under **What might people ask it first?**, type a few questions people
     might ask. They will be able to click these instead of typing. Choose
     **Add another question** to add more, up to twelve.
3. Watch the preview on the right. It updates as you type and shows roughly
   what people will see. When you write more than three questions, the preview
   shows three of them at random, because most products show only a few at a
   time.

The buttons under **Where it can go** stay off until the name, the description,
and the behavior are filled in. The card tells you what is still missing, and
each item is a link that takes you to that blank.

### Add more detail

Choose **More** under the questions to open the extra settings. None of them are
required.

- **Welcome message.** This is the first thing people see when they open the
  assistant in a Teams chat or in SharePoint. The Copilot app package has no
  place for it.
- **Picture.** Choose a square PNG or JPG. The app resizes it to the sizes each
  product wants. If you skip it, the app draws the first letter of the name on
  a blue square.
- **Copilot settings.** Here you choose what the assistant may use in Microsoft
  365 and paste links to SharePoint files or folders it should read. You can
  also tell it to prefer those files over its own knowledge. Other products
  ignore these settings.
- **About you.** Fill in your name, your website, and links to your privacy and
  terms pages. The Copilot app package needs all four, so the app fills in
  placeholders if you leave them blank. The copyright line and license travel
  with the assistant.

### Open a file you already have

Drop the file anywhere on the Workspace start page, or choose **Open a file** in
the editor. Agentprise opens:

- Any file it made itself: the skill `.zip`, the `.agent` file, or the app
  package `.zip`.
- A `.agent` file exported from SharePoint.
- An app package `.zip` exported from the Microsoft 365 Copilot app.
- Any Agent Skill `.zip` or `SKILL.md` file, from Gemini, Claude, or elsewhere.

If you are already working on something, the app asks before replacing it.
The one exception is a Library sample you have not changed, which is replaced
without asking, because the same sample is still in the Library.

### Start from the Library

1. Choose **Library** on the left, or **Use a sample** on the start page.
2. Search by name, summary, or tag if the list is long. The row of tags under
   the search box narrows the list to one tag. Choose **All** or **Show all**
   to see everything again.
3. Choose **Try it**. The assistant opens in the Workspace, ready to change
   or download.

The start page also shows a strip of up to ten assistants from the Library,
in a random order, under the drop area. Choose one to open it. The arrows on
each side scroll the strip when it does not fit.

The copy is yours to change. The original in the Library stays as it was. The
Library needs the app to run from a web address, so it is empty when you open
`index.html` straight from a folder on your computer.

### Download it for a product

Under **Where it can go**, choose the product people will use:

| Product | Button | What you get |
|---|---|---|
| The Agents list in the Microsoft 365 Copilot app or in Teams | Copilot / Teams Apps, **Download app package** | An app package (`.zip`) |
| A Teams group chat, channel, or meeting | Teams Chat, **Download .agent file** | One `.agent` file |
| Gemini or Claude | **Download skill** | A skill (`.zip`), the same file for both |
| ChatGPT or Gemini Notebook | ChatGPT, **Copy text** | Text to paste, with a `.md` file if you want one |

The [formats page](formats.md) explains what to do with each file once you have
it, and what the app package leaves out.

### Keep a copy you can edit later

Choose **Keep a copy I can edit later**. You get a small `.zip` that holds
everything you wrote, including the picture. Drop it on the Workspace page any
time to pick up where you left off or to download it for another product. The
same file also works as a skill in Gemini and Claude.

### See exactly what each product receives

Choose **Details** on the left, or **See the files each product receives** under
the download buttons. The left side shows every field as a plain form, and the
right side shows the files for the product you pick, with your own words
highlighted. Changes you make here show up in the Workspace too.

### Come back later

Your work stays in your browser on the computer you used, so you can close the
page and return to it. It is not uploaded anywhere. **Start over** in the editor
clears it. If you clear your browser data, the draft goes with it, so keep a
copy of anything you care about.

### Conclusion

You can now describe an assistant, start from a sample or a file you have, and
download it for Copilot, Teams, Gemini, Claude, or ChatGPT. For what to do with
each file afterwards, see the formats page. For questions, see the FAQ.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Formats: which download goes where](formats.md)
- [Frequently asked questions](faq.md)
- [Step-by-step guides with screenshots](README.md#step-by-step-guides)
- [Add your assistant to the Library](how-to/add-to-library.md)

[Back to project README](../README.md)
