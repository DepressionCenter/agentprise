<!--
This file is part of Agentprise
docs/faq.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
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
- **ChatGPT** gets text to copy and paste, because ChatGPT and Gemini Notebook
  have no file to upload.

Not sure yet? Keep a copy. You can come back any time and download it for
another product.

### What does "Keep a copy" do?

It saves a small `.zip` file to your computer. Drop that file on the Workspace
page later to change the assistant or download it for a different product. The
same file also works as a skill in Gemini and Claude.

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

### Where does my work go?

It stays in your browser, so you can close the page and pick up later on the
same computer. Nothing is uploaded. Start over removes it.

### Can other people start from my assistant?

Yes. The Library holds ready-made assistants anyone can try and change. To add
yours, keep a copy and
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
| Skill, also "Keep a copy" (`.zip`) | No | No | Yes | Yes | No |
| Copy text | No | No | Notebook only | No | Yes |

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
