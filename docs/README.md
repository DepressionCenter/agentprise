<!--
This file is part of Agentprise
docs/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-10
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

Agentprise lets you describe an AI assistant once, give it skills and tools,
and download it for Microsoft 365 Copilot, Teams, Gemini, Claude, ChatGPT, or
coding tools. This folder holds the pages that
go deeper than the Help page inside the app. Most pages are for people who use
Agentprise. The ones for developers say so.

### Using Agentprise

The quickest way to learn the app is to open it and choose Create new. The Help
page inside the app answers the common questions: which download you need, who
can use your assistant, and where your work is kept.

- [Using Agentprise](usage.md): a walkthrough of each thing you can do, from
  keeping your projects and creating an assistant to adding skills and
  downloading it for a product.
- [Frequently asked questions](faq.md): the answers from the Help page inside
  the app, plus questions about tools and plugins, in one place you can link
  to.
- [Formats](formats.md): what each download is for, what each one keeps, how
  tools travel in each one, what to do with the file once you have it, and
  which files Agentprise can open. The second half of the page holds the
  technical details for maintainers, including what is inside the project
  backup and the plugins, how instructions and reports are built, and the
  vendor facts with the date each was checked.
- [Add your assistant to the Library](how-to/add-to-library.md): what to send and
  what happens next, with sections for the maintainer who adds it and for the
  one-time Library conversion.

### Step-by-step guides

Each guide covers one job from start to finish. Most have a screenshot for
every Agentprise screen you will see along the way.

- [Make a new assistant for Microsoft 365 Copilot](how-to/make-an-assistant-for-copilot.md):
  go from a blank page to the Agents list in Copilot or Teams.
- [Open an assistant you have and move it to Gemini or Claude](how-to/move-an-assistant-to-gemini-or-claude.md):
  open a file you already have and download it as a skill.
- [Put an assistant in a Teams group chat](how-to/add-an-assistant-to-a-teams-chat.md):
  download the `.agent` file, put it in SharePoint, and add it to the chat.
- [Copy an assistant into a ChatGPT project or Gemini Notebook](how-to/copy-an-assistant-into-chatgpt.md):
  find the text to copy and see where each piece goes.
- [Connect the tools in a download](how-to/connect-tools.md): what "needs
  setup" means, and how to turn on connectors, fill in a server address,
  allow custom apps in Copilot, and let scripts reach the internet.
- [Try a library assistant and change it](how-to/try-a-library-assistant.md):
  preview the Caveman sample, add it to your projects, and make it your own.

### Trust and privacy

- [Compliance](compliance.md): what the app does to keep your work private and
  the page usable by everyone, with the evidence behind each statement. Written
  for IT staff, privacy reviewers, and anyone who wants to check for themselves.

### For developers

- [Current design specification](design/agentprise-design.md): a short baseline
  of the implemented tool as of October 10, 2026.
- [Design: tools, skills, and plugins](design/tools-skills-plugins-design.md):
  the plan for projects, skills, and tools, in phases. Projects, skills,
  tools, conversion reports, and the plugin downloads are in the app now.
  The open vendor checks are listed on the formats page.
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
