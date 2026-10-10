<!--
This file is part of Agentprise
docs/faq.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-10
Summary: The questions people ask about Agentprise, with the same answers the
         Help page inside the app gives.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Frequently asked questions

[Back to project README](../README.md)

These are the questions people ask most, with the same answers as the Help page
inside the app. If your question is about a particular download, the
[formats page](formats.md) goes deeper.

### What is Agentprise?

A place to describe an AI assistant once and get it in the form each product
wants, whether that is Microsoft 365 Copilot, a Teams chat, Gemini, Claude, or
ChatGPT. It runs in your browser. Nothing you type is sent anywhere.

### Which download do I need?

It depends on where people will use the assistant.

- **Copilot / Teams Apps** gives you an app package (`.zip`) for the Agents
  list in the Microsoft 365 Copilot app and in Teams.
- **Teams Chat** gives you a `.agent` file for a Teams group chat, channel, or
  meeting. You put the file in a SharePoint library first.
- **Gemini** and **Claude** each get a skill. It is the same file, and it works
  in both.
- **ChatGPT** gets text to copy and paste, because it has no file to upload.
- **Gemini Notebook** gets a `.md` file to add as a source, or the same text
  to paste.

Not sure yet? Download a backup. You can come back any time and download it
for another product.

### What does "Download Backup" do?

It saves a small `.zip` file to your computer. Drop that file on the Workspace
page later to change the assistant or download it for a different product. The
same file also works as a skill in Gemini and Claude.

### Which files can I attach?

Word, PowerPoint, Excel, PDF, and plain text files, including scripts and data
files such as PowerShell, Python, SQL, Markdown, CSV, and JSON. Up to 20 files,
each under 10 MB. The app reads the start of every file and refuses programs,
including ones renamed to look like a document. Copilot accepts only document
types, so a script reaches it as a `.txt` file with the same name. The skill
`.zip` keeps the real name.

### Who can use my assistant?

In Microsoft 365, people need a Copilot license and permission to any files you
linked. Guests cannot use it in Teams chats. Gemini skills may need a paid Google
AI plan, and Claude skills need a paid Claude plan.

### How do I change an assistant I already shared?

Drop the file you downloaded before on the Workspace page, make your changes, and
download it again. For an app package, upload the new file in place of the old
one. It keeps the same id, so Copilot treats it as an update.

### Why does my assistant not answer in a Teams chat?

App packages do not work in group chats, channels, or meeting chats. Use the
Teams Chat download instead: put the `.agent` file in a SharePoint library,
choose Copy link for Teams, paste the link in the chat, and choose Add to this
chat.

### Why does Teams ask me to approve the answer?

In a group chat, Teams shows the person who asked a preview whenever the answer
used something the others may not be able to see, such as that person's own
chats, mail, or meetings. Turn off Teams messages, email, and meetings under
Copilot settings and answers post straight to the chat. Web search does not
cause this.

### What does "Review before sharing" check?

Before you download, the app looks through your assistant's text and plain-text
files for shapes that often mean personal information, such as Social Security
numbers, phone numbers, email addresses, dates, street addresses, and long
numbers, and for phrases common in prompt injection, such as "ignore previous
instructions" or invisible characters. Each match is listed with where it was
found and a masked sample. It is a hint to look, not proof: a help desk
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
| Skill, also Download Backup (`.zip`) | No | No | Yes | Yes | No |
| Plain skill, SKILL.md (`.skill.zip`) | No | No | Yes | Yes | No |
| Copy text | No | No | Notebook only | No | Yes |
| `.md` file | No | No | Notebook only | No | No |

### Conclusion

If your question is not here, the usage page walks through every part of the
app, and the formats page explains each file. Anything still unclear is worth an
issue on GitHub, so the answer can be added here.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Using Agentprise](usage.md)
- [Formats: which download goes where](formats.md)
- [Add your assistant to the Library](how-to/add-to-library.md)
- [Ask a question or send an assistant on GitHub](https://github.com/DepressionCenter/agentprise/issues/new)

[Back to project README](../README.md)
