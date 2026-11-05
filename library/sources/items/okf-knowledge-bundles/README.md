<!--
This file is part of Agentprise
okf-knowledge-bundles/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-11-05
Last Modified: 2026-11-05
Summary: What the OKF Knowledge Bundles skill does, what it needs in each AI product, privacy, credits, and license.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# OKF Knowledge Bundles

A skill that helps an AI assistant search a knowledge bundle and cite the original pages, not the bundle's own files.

## What it does

Some teams keep a searchable copy of their websites, knowledge base articles, and videos as a folder of plain text files. This skill teaches an assistant to search that folder, read the files that fit your question, and answer in its own words. Every link in the answer goes to the original page, so you can open it and check the facts yourself.

The skill also tells the assistant to say so when nothing fits, instead of stretching a weak match into an answer.

## What OKF and Extractium are

- **Open Knowledge Format (OKF)** is a simple way to store knowledge as Markdown files. Each file describes one resource, such as a web page or a video, and starts with a short block of details, including the address of the original page. See the [OKF specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).
- **Extractium** is a free tool from the Eisenberg Family Depression Center that visits websites, knowledge bases, document collections, and video channels and saves what it finds as an OKF bundle: <https://github.com/DepressionCenter/extractium>.

## What it needs in each product

The skill needs nothing extra beyond access to the bundle's files. It works in Microsoft 365 Copilot, Claude, ChatGPT, Gemini, and coding tools, as long as the assistant can search and read the folder. The folder can be on your computer, in a code repository, in SharePoint or OneDrive, or attached to the conversation.

If the assistant cannot open the files, it tells you and asks you to share the folder or the files.

## What is inside

- `SKILL.md`: the instructions the assistant follows.

## Privacy

The files in a bundle are copies of pages that a tool collected, and they may hold more text than you expect. The skill tells the assistant not to quote, summarize, or restate personal or health information it finds in them, and to tell you about it instead. Before you share a bundle with an assistant, check that it holds only public material, or material your organization allows in that product.

## Credits

The Open Knowledge Format is described in Google Cloud Platform's knowledge-catalog project. Extractium is free software from the Eisenberg Family Depression Center at the University of Michigan.

Made by Gabriel Mongefranco with Agentprise, free software from the Eisenberg Family Depression Center at the University of Michigan: <https://github.com/DepressionCenter/agentprise>.

## License

Copyright (C) 2026 Gabriel Mongefranco. The skill is licensed under the GNU General Public License v3.0 or later. The full text is in LICENSE.txt. This page carries the GNU Free Documentation License v1.3 or later, as noted at the top of the file: <https://www.gnu.org/licenses/fdl-1.3.html>.
