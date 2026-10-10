<!--
This file is part of Agentprise
docs/implementation-plans/phase-4-user-guides.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Phase 4 plan: illustrated user guides with screenshots, written once the interface has settled.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Phase 4: user guides with screenshots

[Back to project README](../../README.md)

This plan adds illustrated, step-by-step guides for people who use Agentprise
without reading code. It runs last, after the interface has been reviewed and
adjusted, because every screenshot goes stale when a screen changes. It is written
for whoever writes the guides, who needs the app running locally and a browser.

### Goal

One guide per job a person comes to do, each with numbered steps and a screenshot
for every screen the steps touch, under `docs/how-to/`, linked from the docs index
and the knowledge base article.

### Guides to write

1. Make a new agent and download it for Microsoft 365 Copilot
   (`how-to/make-an-assistant-for-copilot.md`).
2. Open an agent you already have and move it to Gemini or Claude
   (`how-to/move-an-assistant-to-gemini-or-claude.md`).
3. Put an agent in a Teams group chat with the `.agent` file
   (`how-to/add-an-assistant-to-a-teams-chat.md`).
4. Copy an agent into ChatGPT or Gemini Notebook
   (`how-to/copy-an-assistant-into-chatgpt.md`).
5. Try a library agent and change it (`how-to/try-a-library-assistant.md`).

### Changes from the design

- The guides say "assistant" rather than "agent", because that is the word the
  app and the other pages use. "Agent" appears only where a product uses it,
  such as the Agents list in Copilot and the `.agent` file.
- The screenshots are taken at 1280 pixels wide, since the app's layout is
  designed for that width, and they are saved under `images/guides/`. Full
  screens are captured for the start page, the editor, the Library, and the
  Details page. Single cards and dialogs are captured on their own so a step
  can point at one thing.
- The first guide uses a synthetic assistant named Lab Helper, because it
  starts from a blank page. The other four use the Caveman sample.
- Steps that happen inside Copilot, Teams, SharePoint, Gemini, Claude, or
  ChatGPT are written as text only. Their screens change often and differ
  between organizations, and the text matches what the app itself shows under
  "After downloading" on the Details page.
- The knowledge base article lives outside this repository, so linking the
  guides from it is a separate step for whoever maintains that article.

### Screenshot rules

- Take screenshots at 1280 pixels wide in light mode, from the app served locally
  with ZippyServe, using the Caveman library agent so no real names or links
  appear. Save them as PNG under `images/guides/` with descriptive file names such
  as `workspace-name-blank.png`.
- Every screenshot gets alt text that says what the screen shows and what the
  reader should notice, per the accessibility skill. A screenshot never carries
  information that the surrounding text does not also give.
- Crop to the part of the screen the step is about. Do not annotate with color
  alone; use a numbered callout or describe the location in the text.
- When a screen changes, retake its screenshots in the same change set. A stale
  screenshot is a documentation defect.

### Tasks

- [x] Serve the app locally and load the Caveman library agent.
- [x] Write each guide from the "Page structure" in the documentation skill:
      hidden header, title, subtitle, link back, summary, numbered steps with
      screenshots, conclusion, additional resources.
- [x] Add the guides to `docs/README.md`. The knowledge base article is
      updated outside this repository.
- [ ] Have someone who has not used the app follow one guide cold and fix what
      confused them.
- [x] Open the pull request.

### Conclusion

After this phase a person can go from nothing to a working agent in their product
by following pictures and numbered steps, without help.

### Additional resources

- [Phase 3: library and release](phase-3-library-and-release.md)
- [Documentation skill](../../skills/documentation/SKILL.md)
- [Accessibility skill](../../skills/accessibility/SKILL.md)

[Back to project README](../../README.md)
