<!--
This file is part of Agentprise
docs/usage.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-10
Summary: How to use Agentprise, job by job: keep your projects, create an
         assistant, add skills, check its tools, open a file you have, start
         from the Library, download it for each product or as a plugin, read
         what changes in each download, and download a backup.
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

- **Workspace** is where your projects are kept and where you start new ones.
- **Library** holds ready-made assistants and skills you can start from.
- **Inspect** shows every field and the exact files each product receives.
- **Help** answers the most common questions.

Under them, **Recent** lists up to five projects you opened lately. Choose
one to go straight back to it.

### Projects, assistants, and skills

Everything you make in Agentprise is a **project**. A project is one thing
you are building. Most projects hold one assistant. A project can also hold
**skills**.

- An **assistant** is always on. It has a name, a short description, the way
  it should behave, and a few example questions.
- A **skill** is a set of steps an assistant follows only when a question
  needs them, such as how to turn meeting notes into a summary. Products that
  read skills, such as Gemini and Claude, can also use a skill on its own.

You can keep as many projects as you like. They stay in this browser on this
computer.

### Your projects

The Workspace page lists **Your projects**, newest first. It shows nine at a
time. When you have more, choose **Show all** to see every one, and
**Show fewer** to go back. Each tile shows the picture, the name, what the
project holds (such as "1 assistant and 2 skills"), and when it last changed.

Choose a project's name to open it. Choose **More** on a tile for the other
actions:

- **Rename** gives the project a new name.
- **Make a copy** adds a second project with "(copy)" at the end of its name.
  The copy is separate, so a change to one does not touch the other.
- **Download backup** saves the whole project as one `.zip` file.
- **Delete** removes the project from this browser. The app asks first,
  because this cannot be undone. Download a backup first if you may want it
  later.

### Create a new assistant

1. On the Workspace page, choose **Create new**. A new project opens with one
   empty assistant. Nothing is saved until you start typing.
2. Answer the four questions. Each one has a blank under it.
   - Under **What should it be called?**, type a short name. This is how the
     assistant will be listed wherever you send it. It also becomes the name
     of the project.
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

Your work is saved in the browser as you type. The buttons under **Download**
stay off until the name, the description, and the behavior are filled in. The
card tells you what is still missing, and each item is a link that takes you
to that blank.

### Add a skill to a project

The bar at the top of a project, **In this project**, lists everything the
project holds. Choose a name in the bar to edit it.

1. Choose **Add a skill**. A new, empty skill opens.
2. Answer the questions:
   - Under **What should it be called?**, type a short name.
   - Under **What does it do, and when should it be used?**, write one or two
     sentences. Products read this to decide when to use the skill, so say
     what kind of request should start it.
   - Under **What steps should it follow?**, write the steps the way you would
     explain them to a new colleague. **Help me write this** gives you a
     template.
3. Choose the assistant in the **In this project** bar. Under
   **Skills it can use**, tick the skills it should follow. This list appears
   once the project has a skill.

You can also bring in skills that already exist:

- Choose **Add from a file** and pick a skill, plugin, or backup file. The
  assistants and skills inside it join the project you have open. If two of
  them would end up with the same folder name in the downloads, the new one's
  folder gets a number at the end, such as `meeting-notes-2`. Its name stays
  the same.
- In the Library, choose **View** on a skill, then **Add to** followed by
  the name of your open project.

To take an assistant or a skill out of a project, open it, open
**More settings**, and choose **Remove this skill from the project** or
**Remove this assistant from the project**. The app asks first. This button
appears only when the project holds two or more things, because a project
always keeps at least one.

### Tools

Some assistants and skills use tools, such as a search of PubMed. A tool lets
the assistant do something on its own, like run a search and read the
results. You cannot write a new tool in Agentprise. Tools come with Library
entries, such as the **PubMed Search** skill, and with skill or plugin files
you open.

When the assistant or skill you are editing has tools, a **Tools** list
appears under the questions. Each card shows:

- The tool's name and what it does. "(needed for its main job)" after the
  name means the assistant cannot do what it was made for without it.
- How each product connects it: Microsoft 365 Copilot, Claude, ChatGPT,
  Gemini, and coding tools. "Works without the tool and says so" means that
  product has no way to use it.
- "Comes with the skill" and a skill's name, when the tool belongs to a skill
  the assistant uses. Change or remove those tools in the skill itself.
- **Remove this tool**, for the item's own tools. The app asks first. After
  that, no download mentions the tool.

Without a tool, the assistant still does the work it can and tells people
that no tool was used. It never claims a search was done when no tool
returned results.

Some tools reach a tool server, which is a service on the web or on your
computer. The servers belong to the whole project and are listed under
**More settings**, then **Tool connections**:

- A server on the web has a box called **Address of the** followed by its
  name. When a tool says you supply your own server, paste its address here
  before you download. The address must start with `https://` and cannot hold
  a user name, a password, a `#` part, or a key or token. You can also leave
  it empty and fill it in after you download; the setup steps say where.
- A server that runs on the computer shows its command. Agentprise never runs
  it. Tools such as Claude Code and Codex can.
- **Remove this connection** takes the server out of the project. Tools that
  used it stop mentioning it in every download.

To finish connecting tools after you download, see
[Connect the tools in a download](how-to/connect-tools.md).

### Add more detail

Choose **More settings** under the questions to open the extra settings. None
of them are required. Some of them appear only for an assistant or only for a
skill.

- **Welcome message** (assistants only). This is the first thing people see
  when they open the assistant in a Teams chat or in SharePoint. The Copilot
  app package has no place for it.
- **Picture** (assistants only). Choose a square PNG or JPG. The app resizes
  it to the sizes each product wants. If you skip it, the app draws the first
  letter of the name on a blue square.
- **What it needs to work** (skills only). One or two sentences about the
  tools, products, or access the skill needs, such as "Live search needs the
  PubMed connector." It can be up to 500 characters.
- **File attachments.** Add up to 20 files from your computer: Word,
  PowerPoint, Excel, PDF, OneNote, or plain text, including scripts and data
  files. The app checks each file's contents and refuses programs, even ones
  renamed to look like a document. The files travel in the skill and the
  backup. The Copilot app package carries the types Copilot accepts: documents,
  `.onepart`, and `.txt`. Scripts reach it as `.txt` files under the same name,
  and a `.one` file is left out with a warning. The Teams Chat file cannot
  carry files.
- **Microsoft Copilot settings** (assistants only). Here you choose what the
  assistant may use in Microsoft 365. Each source is a switch, and the box
  under it limits the source to a few places: up to four web sites, up to 20
  SharePoint or OneDrive links, up to five Teams chats or channels, and up to
  25 shared or group mailboxes. A box is greyed out while its switch is off,
  and an empty box means everything the person can see. Sources that came with
  a file you opened, such as SharePoint items, meetings, or a shared mailbox,
  are listed with a Remove button and travel with every Copilot download. You
  can also tell the assistant to prefer its sources over its own knowledge and
  pick a response mode (Auto, Quick response, or Think deeper). Web search
  starts on. SharePoint, Teams messages, email, and meetings start off,
  because in a group chat Teams asks the person who asked to approve any answer
  that used their own files, chats, mail, or meetings before others can see
  it. Other products ignore these settings.
- **Publisher details.** These belong to the whole project and go with
  everything in it. Fill in your name, your organization, your website, and
  links to your privacy and terms pages. The Copilot app package needs your
  name and the three links, so the app fills in placeholders if you leave them
  blank. The copyright line and the license travel with the project. The
  **Version number** is three numbers, such as 1.0.0. Raise it when you share
  a new version.

### Open a file you already have

Drop the file on the drop area of the Workspace page, or choose
**Choose a file** there. In a project, you can also choose **Open a file**.
Agentprise opens:

- Any file it made itself: the backup, the skill `.zip`, the `.agent` file, or
  the app package `.zip`.
- A `.agent` file exported from SharePoint.
- An app package `.zip` exported from the Microsoft 365 Copilot app.
- Any Agent Skill `.zip` or `SKILL.md` file, from Gemini, Claude, or elsewhere.
  When a `.zip` holds several skills, each one becomes its own skill in the
  project.
- A plugin `.zip` made for Claude, for Codex, or for any tool that reads the
  Agent Plugins format.

Each file opens as a new project. It never replaces a project you already
have, unless you say so. If your workspace already holds the same project,
for example because you are opening a backup you downloaded earlier, the app
asks what to do:

- **Keep both** adds the file as a second project with "(copy)" at the end of
  its name.
- **Replace mine** puts the file in place of your project. Any changes you
  made to yours are lost.
- **Cancel** leaves everything as it was.

A few things are worth knowing about files made elsewhere:

- Some plugins carry parts Agentprise does not understand, such as hooks,
  commands, or agents folders. The app keeps them with the project and puts
  them back only in the backup. It never reads or runs them.
- Programs are never kept, whatever the file calls them.
- If a skill or plugin does not say which license it uses, the license shows
  as "Not stated", and a note asks you to check with its author before you
  share it. The app never puts its own license on someone else's work.
- Backups made by the first version of Agentprise open as a plain skill.

### Start from the Library

1. Choose **Library** on the left, or **Use a sample** on the start page.
2. Search by name, summary, kind, or tag if the list is long. The row of tags
   under the search box narrows the list to one tag. Choose **All** or
   **Show all** to see everything again.
3. Each card says whether it is an **Assistant**, a **Skill**, or an
   **Assistant with skills**. Some cards also have a line that says what the
   entry needs to work.
4. Choose **View** to look inside before you take it. The preview shows
   what the entry holds, a few example questions, and the start of its
   instructions.
5. Choose **Try it**. The entry is added to Your projects as a new project and
   opens, ready to change or download.

The start page also shows a strip of up to ten entries from the Library,
in a random order, under the drop area. Choose one to try it. The arrows on
each side scroll the strip when it does not fit.

The copy is yours to change. The original in the Library stays as it was. The
Library needs the app to run from a web address, so it is empty when you open
`index.html` straight from a folder on your computer.

### Download it for a product

Most downloads are for one assistant or skill at a time. A line at the top of
the **Download** card says which one, such as "The downloads below are for
Caveman." To download something else in the project, choose it in the
**In this project** bar first.

Each row names a product and the file it gets. Choose **Download** on the row
for the product people will use:

| Product | Button | What you get |
|---|---|---|
| The Agents list in the Microsoft 365 Copilot app or in Teams | **Copilot / Teams Apps** | An app package (`.zip`) |
| A Teams group chat, channel, or meeting | **Teams Chat** | One `.agent` file |
| Gemini | **Gemini** | A skill (`.zip`) |
| Claude | **Claude** | A skill (`.zip`) |
| A ChatGPT project | **ChatGPT**, then **Copy** | Project instructions to paste |
| Gemini Notebook | **Gemini Notebook** | A `.md` file to add as a source |
| Any other tool that reads Agent Skills | **SKILL.md** | A plain skill (`.skill.zip`) with nothing specific to this app |

Each download is written for its own product. For example, the Gemini skill
leaves out Word, Excel, PowerPoint, and OneNote files, because Gemini skills
do not accept them, and each product gets its own notes on how to reach the
tools.

When you choose **Copy** on the ChatGPT row, the Inspect page opens with one
box called **Project instructions**. In ChatGPT, open a project, open its
menu, then **Project settings**, and paste the box into **Instructions**. Add
any files the assistant uses to the project yourself. For skills and tools in
ChatGPT, use the **Plugin** download below instead.

Under **For the whole project**, two more rows give you every assistant and
skill in the project in one file, with the tools they use:

| Product | Button | What you get |
|---|---|---|
| Claude: claude.ai, Cowork, or Claude Code | **Claude plugin** | One plugin (`.claude-plugin.zip`) |
| ChatGPT, Codex, GitHub Copilot, Cursor, or another tool that reads Agent Plugins | **Plugin** | One plugin (`.plugin.zip`) |

To upload the Claude plugin, open **Customize**, then **Plugins** in Claude,
choose **Add**, then **Upload plugin**. Then open the plugin's
**Connectors** tab to connect any tool servers. In ChatGPT, a workspace owner
or someone allowed to upload plugins uploads the Plugin download from the
Admin console, under **Plugins**.

The [formats page](formats.md) explains what to do with each file once you have
it, and what each one leaves out.

### What changes in each download, and setup steps

Products differ, so a download is not always an exact copy of what you wrote.
For example, Gemini and Claude have no separate place for an assistant, so the
assistant becomes a skill whose description starts with "Persona:". Copilot
has no skills, so a skill's steps are added to the assistant's instructions.

To see what changes, choose **Inspect**, pick the product's tab, and read the
list called **What changes in this download**. Each line has one of five
labels:

- **kept**: works the same way in that product.
- **changed**: rewritten to fit the product. The note says how.
- **needs setup**: in the download, but it works only after a step from you
  or your admin, such as turning on a connector.
- **left out**: that product has no way to use it.
- **blocked**: the download would break, or would let the assistant use more
  than you asked for. The download button stays off until you fix it, and
  the note says what to change.

Downloads with tools come with setup steps. When something needs setting up,
the skill ZIPs and the two plugins hold a file called `SETUP.md`, and their `README.md` repeats the list
under **What changed in this export**. The Copilot app package has no place
for extra files, so its steps show on the Inspect page as
**Setup steps (not in the package)**.
[Connect the tools in a download](how-to/connect-tools.md) walks through each
kind of step.

### Review before sharing

Before you download, look at the **Review before sharing** box under
**Download**. It appears only when the app finds something. The app looks
through the text and the plain-text files of every assistant and skill in the
project for shapes that often mean personal information, such as Social
Security numbers, phone numbers, email addresses, dates, street addresses, and
long numbers. It also looks for phrases common in prompt injection, such as
"ignore previous instructions", invisible characters, and hidden HTML
comments. The text of each tool is checked too, because it goes into the
instructions of every download. Each line says where the match is and shows a
masked sample, and clicking it takes you to the field.

A match is a hint, not proof. A help desk assistant may hold a phone number on
purpose. The check also misses plenty, including people's names, so it is not a
privacy review. It never blocks a download: the download button asks once, and
you can go ahead. Everything runs in your browser and nothing is sent anywhere.

### Download a backup you can edit later

Choose **Download Backup** at the bottom of the **Download** card. Unlike the
other buttons, it saves the whole project: every assistant, every skill, and
all their files and pictures, in one `.zip` named after the project, such as
`caveman.agentprise.zip`. You can also choose **Download backup** from
**More** on the project's tile on the Workspace page.

Drop the backup on the Workspace page any time to pick up where you left off,
or to download it for another product. The backup is for Agentprise. To upload
to Gemini or Claude, use their own **Download** buttons instead.

### Inspect the output

Choose **Inspect** on the left, or **Inspect output files** under the download
buttons. The left side shows every field as a plain form, and the right side
shows the files for the output format you pick, with your own words
highlighted. Changes you make here show up in the Workspace too. The tabs run
in alphabetical order and include **SKILL.md**, a plain Agent Skill with
nothing specific to this app, **Claude Plugin** and **Plugin**, which show the
files of the two plugins, and **Agentprise Backup**, which shows the files of
the whole project. Each tab has its own download button under the files. When
a download changes something, the list **What changes in this download**
appears above the files.

When the project holds more than one assistant or skill, a list called
**Part of the project** sits above the tabs. Pick the one you want to see.

### Come back later

Your projects stay in your browser on the computer you used, so you can close
the page and return to them. Find them under **Your projects** on the
Workspace page, or under **Recent** on the left. They are not uploaded
anywhere.

If your browser blocks storage, for example in some private windows, you can
still make things and download them. A note on the left says that your
projects will not be kept after you close the page, so download a backup
before you leave. If you clear your browser data, your projects go with it, so
keep a backup of anything you care about.

### Conclusion

You can now keep several projects, describe an assistant, give it skills,
check its tools, start from a sample or a file you have, and download it for
Copilot, Teams, Gemini, Claude, or ChatGPT, one item at a time or as a whole
plugin. For what to do with each file afterwards, see the formats page. To
finish connecting tools, see the guide on connecting tools. For questions, see
the FAQ.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Formats: which download goes where](formats.md)
- [Connect the tools in a download](how-to/connect-tools.md)
- [Frequently asked questions](faq.md)
- [Step-by-step guides with screenshots](README.md#step-by-step-guides)
- [Add your assistant to the Library](how-to/add-to-library.md)

[Back to project README](../README.md)
