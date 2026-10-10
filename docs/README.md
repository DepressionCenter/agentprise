<!--
This file is part of Agentprise
docs/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Index of the Agentprise documentation: one linked line per page, with
         who each page is for.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Documentation

[Back to project README](../README.md)

Agentprise lets you describe an AI assistant once and download it for Microsoft
365 Copilot, Teams, Gemini, Claude, or ChatGPT. This folder holds the pages that
go deeper than the Help page inside the app. Most pages are for people who use
Agentprise. The ones for developers say so.

### Using Agentprise

The quickest way to learn the app is to open it and choose Create new. The Help
page inside the app answers the common questions: which download you need, who
can use your assistant, and where your work is kept.

- [Using Agentprise](usage.md): a walkthrough of each thing you can do, from
  creating an assistant to downloading it for a product.
- [Frequently asked questions](faq.md): the same answers as the Help page inside
  the app, in one place you can link to.
- [Formats](formats.md): what each download is for, what each one keeps, and what
  to do with the file once you have it. The second half of the page holds the
  technical details for maintainers.
- [Add your assistant to the Library](how-to/add-to-library.md): what to send and
  what happens next, with a section for the maintainer who adds it.

### Step-by-step guides

Each guide covers one job from start to finish, with a screenshot for every
screen you will see along the way.

- [Make a new assistant for Microsoft 365 Copilot](how-to/make-an-assistant-for-copilot.md):
  go from a blank page to the Agents list in Copilot or Teams.
- [Open an assistant you have and move it to Gemini or Claude](how-to/move-an-assistant-to-gemini-or-claude.md):
  open a file you already have and download it as a skill.
- [Put an assistant in a Teams group chat](how-to/add-an-assistant-to-a-teams-chat.md):
  download the `.agent` file, put it in SharePoint, and add it to the chat.
- [Copy an assistant into ChatGPT or Gemini Notebook](how-to/copy-an-assistant-into-chatgpt.md):
  find the text to copy and see which field each piece goes in.
- [Try a library assistant and change it](how-to/try-a-library-assistant.md):
  start from the Caveman sample and make it your own.

### Trust and privacy

- [Compliance](compliance.md): what the app does to keep your work private and
  the page usable by everyone, with the evidence behind each statement. Written
  for IT staff, privacy reviewers, and anyone who wants to check for themselves.

### For developers

- [Implementation plans](implementation-plans/README.md): how the app was built,
  in phases, for anyone changing the code.
- [Documentation template](doc-template.md) and
  [skill authoring examples](skill-examples.md): guides that came with the
  repository template, kept for reference.

### Conclusion

Start with the app itself. Come back here when you want to know what a download
contains, how your work is protected, or how the code is put together.

### Additional resources

- [Agentprise, the live app](https://code.depressioncenter.org/agentprise/)
- [Project instructions for contributors](../AGENTS.md)

[Back to project README](../README.md)
