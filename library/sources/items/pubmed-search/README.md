<!--
This file is part of Agentprise
pubmed-search/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-10
Summary: What the PubMed Search skill does, what it needs in each AI product, credits, and license.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# PubMed Search

A skill that helps an AI assistant build, run, and review PubMed literature searches.

## What it does

PubMed is the National Library of Medicine's free database of biomedical and health research citations. This skill teaches an assistant to turn a plain question, such as "Are smart rings useful for tracking sleep?", into a careful PubMed search. It writes the search, explains it, and gives you a link that opens it in PubMed. When the assistant has a PubMed tool, it can also run the search and read the abstracts.

The skill is honest about what it did. It always tells you whether a search was only written or was actually run.

## The three modes

| Mode | What you see at the top | What it means |
|---|---|---|
| Query preparation | **Prepared search strategy (not executed)** | The assistant wrote a search for you but did not run it. Click the link or paste the search into PubMed to see the results. This works in every product. |
| Live search | **Search completed on (date)** | A PubMed tool ran the search. You get the number of results, the article list, and a record of exactly what was searched, so you can repeat it later. |
| Abstract review | **Abstract review** | The assistant read the abstracts that a tool returned or that you pasted in. Each article is marked as "abstract-read" or "metadata-only" (only the title and details were seen), and conclusions come only from abstracts it read. |

You may also see **Web discovery**. That means the results came from a web search of the PubMed site, not from a real PubMed search. Treat them as leads, not as a complete list.

If you are planning a systematic review or another formal review, the assistant will suggest that you ask a health sciences librarian to check the search first. That is good practice: formal reviews usually search several databases and need every step written down.

## What it needs in each product

Query preparation works everywhere with nothing extra. Running live searches needs a PubMed tool:

| Product | How live search works |
|---|---|
| Claude | Turn on the PubMed connector in Claude's settings. As a second option, the bundled Python script can run searches, but only if your workspace allows code to reach eutils.ncbi.nlm.nih.gov. The default settings do not allow it, so a workspace owner would need to add it. |
| Microsoft 365 Copilot | The skill includes an API plugin (`openapi/pubmed-eutils.yaml`) that calls PubMed's public E-utilities service. It needs no sign-in. |
| ChatGPT | Live search needs an MCP (Model Context Protocol) server for PubMed that you or your organization supply and connect, named "pubmed". Without one, ChatGPT prepares searches only. |
| Gemini | Gemini prepares searches only. Gemini skills cannot reach the internet from scripts. |
| Coding agents (Claude Code, Codex, Gemini CLI, and others) | The bundled script `scripts/pubmed.py` runs searches. It needs Python 3 and network access. |

### Setting up the script

The script uses only Python's standard library. Before you use it, set these environment variables:

- `NCBI_EMAIL` (required): the contact email of the person or team who deploys the skill. NCBI asks for the developer's address, not each user's own address.
- `NCBI_API_KEY` (optional): an NCBI API key. Without a key, NCBI allows 3 requests per second; a key raises that to 10. The script waits between requests either way.

Example commands:

```
python3 scripts/pubmed.py search --query '("smart ring*"[tw]) AND sleep[mh]' --retmax 20
python3 scripts/pubmed.py summary --ids 12345678,23456789
python3 scripts/pubmed.py abstract --ids 12345678,23456789
```

Each command prints one JSON result. The script talks only to eutils.ncbi.nlm.nih.gov, saves nothing to disk, and keeps no cache.

## What is inside

- `SKILL.md`: the instructions the assistant follows.
- `references/pubmed-syntax-guide.md`: a short guide to PubMed search syntax, checked against National Library of Medicine documentation.
- `references/mobile-tech-search-blocks.md`: ready-made search blocks for mobile health technology and wearable devices.
- `references/query-test-cases.md`: example questions and the searches the skill should write.
- `scripts/pubmed.py`: the search script for coding agents and Claude.
- `openapi/pubmed-eutils.yaml`: the API plugin description for Microsoft 365 Copilot.

## Privacy

Searches are sent to PubMed, an outside service run by the U.S. National Library of Medicine. Never put names, record numbers, or other private details about a person into a search.

## Credits

The mobile health search blocks are adapted from the [Mobile Tech Publication Search Starter Kit](https://teamdynamix.umich.edu/TDClient/210/DepressionCenter/KB/Article/12930/Mobile-Tech-Publication-Search-Starter-Kit) by Judy Smith, Informationist, Taubman Health Sciences Library, University of Michigan.

PubMed and the E-utilities are services of the National Center for Biotechnology Information (NCBI) at the U.S. National Library of Medicine. See the [NCBI Disclaimer and Copyright notice](https://www.ncbi.nlm.nih.gov/About/disclaimer.html). PubMed abstracts may be protected by copyright, so quote them sparingly.

Made by Gabriel Mongefranco with Agentprise, free software from the Eisenberg Family Depression Center at the University of Michigan: <https://github.com/DepressionCenter/agentprise>.

## License

Copyright (C) 2026 Gabriel Mongefranco. The skill is licensed under the GNU General Public License v3.0 or later. The full text is in LICENSE.txt. The documentation and reference files carry the GNU Free Documentation License v1.3 or later, as noted at the top of each file: <https://www.gnu.org/licenses/fdl-1.3.html>.
