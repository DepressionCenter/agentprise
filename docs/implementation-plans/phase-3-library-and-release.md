<!--
This file is part of Agentprise
docs/implementation-plans/phase-3-library-and-release.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Phase 3 plan: the Caveman library entry, knowledge base pages, release checks, and the pull request.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Phase 3: library and release

[Back to project README](../../README.md)

This plan adds the agent library, the remaining knowledge base pages, and the
release checks. It is written for an engineer who has Phases 1 and 2 working. When
it is done, the site serves Caveman from the library, the documentation matches
the code, and a pull request is open.

### Goal

A `library/` folder with Caveman as an Agent Skill bundle, a catalog the app
fetches, the Library tab, the knowledge base pages, and a verified pull request.

### Task 1: Caveman library entry

- [ ] Create `library/caveman/SKILL.md`, `icon.png`, `LICENSE.txt`, and
      `README.md` from the Caveman exports using the Phase 1 exporter, with the
      creator links replaced by the project's own links.
- [ ] Create `library/catalog.json` with a leading `_license` key and one entry:
      folder, display name, summary, tags, author, license.
- [ ] Embed the Caveman `SKILL.md` text in `index.html` so the demo works from a
      `file://` address; the icon is fetched when served and omitted otherwise.
- [ ] Add a test that imports `library/caveman/SKILL.md` and checks the fields.
- [ ] Commit: "Add Caveman to the library".

### Task 2: Library tab

- [ ] Fetch `library/catalog.json` when served over HTTP; fall back to the
      embedded entry otherwise. One card per entry with Try it and Download
      buttons, a search box over name, summary, and tags, and an "Add yours" link.
- [ ] Commit: "Add Library tab".

### Task 3: knowledge base pages

- [ ] Write `docs/usage.md`, `docs/faq.md` (mirrors the Help tab),
      `docs/how-to/add-to-library.md`, and `docs/compliance.md` (accessibility and
      privacy evidence only, including the note that no secrets or configuration
      files exist).
- [ ] Update `docs/README.md` to list every page and remove the template-only
      entries that no longer apply.
- [ ] Fill in the README quick start with two sentences and the link to the live
      site, without adding sections.
- [ ] Correct `.zenodo.json` so the programming language is JavaScript.
- [ ] Commit: "Add knowledge base pages".

### Task 4: release checks

- [ ] Run `node --test tests/`.
- [ ] Open the app in a browser, import the real Caveman `.zip` and `.agent`
      exports, download all four outputs, and import each downloaded file again.
- [ ] Run the automated accessibility scan and the keyboard walkthrough.
- [ ] Check the page weight is under 250 KB.
- [ ] Search the branch history for tool or model names and co-author trailers.
      The search must print nothing.
- [ ] Open the pull request with a plain-English description and no signature.

### Tests that need a real account

These cannot run in this repository and stay open until someone with access runs
them. Record results in `docs/formats.md`.

- Upload the generated bundle to a Gemini account and a Claude account.
- Load the generated `.agent` with the extra keys in SharePoint and in a Teams
  chat.
- Try a Teams package with an extra `LICENSE.txt` inside.

### Conclusion

After this phase v1 is complete. Later work (more library entries, the Gemini
Notebook attachment) starts a new plan.

### Additional resources

- [Phase 2: user interface](phase-2-user-interface.md)
- [Documentation skill](../../skills/documentation/SKILL.md)

[Back to project README](../../README.md)
