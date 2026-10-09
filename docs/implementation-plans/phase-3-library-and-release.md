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
release checks. It is written for an engineer who has Phases 1 through 2.5
working. When it is done, the site serves Caveman from the library, the
documentation matches the code, and a pull request is open.

### Goal

A `library/` folder holding Caveman as an Agentprise bundle, a catalog the app
fetches, the Library view reading it, the knowledge base pages, and a verified
pull request.

### Changes from the design

- The library holds `.zip` bundles, not unzipped folders, and the page carries
  no copy of any entry. The maintainer drops the bundle the app itself makes
  into `library/` and adds one catalog line; nothing in `index.html` changes.
  When the page is opened from a file the Library explains that it needs a web
  address, instead of showing a built-in entry.
- Each card has one button, Try it, because a second button that only chose
  which page to open next looked like a different action.
- The Library view, the README quick start, and `docs/compliance.md` were
  delivered in Phase 2.5, so this phase updates them rather than creating them.
- The "Send it to us" links go to the GitHub new issue page, and the how-to page
  describes that route.
- Caveman drops the starter "What's new today at Michigan Medicine?", which only
  makes sense inside the university, and carries its creator's name, website,
  privacy and terms links, and copyright line.

### Task 1: Caveman library entry

- [x] Build `library/caveman.zip` with the bundle exporter from the real
      Caveman `.agent` export, with the starter above removed and the creator
      fields filled in.
- [x] Create `library/catalog.json` with a leading `_license` key and one entry:
      file, display name, summary, tags, author, license.
- [x] Mark `library/*.zip` as binary in `.gitattributes`.
- [x] Add `tests/library.test.mjs`: the catalog is well formed, every listed
      bundle opens with the same importer as a dropped file and matches its
      catalog line, the icon is 192 by 192, a catalog line cannot name a file
      outside the folder, and Caveman has the expected fields.
- [x] Commit: "Add Caveman to the library".

### Task 2: Library view

- [x] Read `library/catalog.json` when served over HTTP, fetch each listed
      `.zip`, and open it with the file importer so the cards show the real
      icon. A file that fails to open marks its own card and leaves the others
      usable. From a `file://` address the status explains that the Library
      needs a web address.
- [x] One card per entry with a Try it button, a search box over name, summary,
      and tags, and a "Send it to us on GitHub" link.
- [x] Save the draft at once when an entry is loaded, so a reload right after
      still shows it.

### Task 3: knowledge base pages

- [x] Write `docs/usage.md`, `docs/faq.md` (mirrors the Help view), and
      `docs/how-to/add-to-library.md`.
- [x] Update `docs/README.md`, `docs/compliance.md`, `docs/formats.md`, the
      project preferences skill, and the README's local-run note.
- [x] Correct `.zenodo.json` so the programming language is JavaScript.
- [x] Commit: "Add the usage, FAQ, and library how-to pages".

### Task 4: release checks

- [x] Run `npm test`.
- [x] In a served browser: the Library lists Caveman with its icon, search
      filters, Try it loads it into the editor with two starters, the Details
      view shows the bundle files, the draft survives a reload, the only
      library requests are the catalog and the zip, and no request leaves the
      host. From a file, the Library shows the web-address message.
- [x] Run the automated accessibility scan on the Library with a card, light
      and dark, and the 320 pixel reflow check.
- [x] Check the page weight is under 250 KB.
- [x] Search the branch history for tool or model names and co-author trailers.
      The search must print nothing.
- [x] Open the pull request with a plain-English description and no signature.

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

- [Phase 2.5: interface redesign](phase-2-5-interface-redesign.md)
- [Add your assistant to the Library](../how-to/add-to-library.md)
- [Documentation skill](../../skills/documentation/SKILL.md)

[Back to project README](../../README.md)
