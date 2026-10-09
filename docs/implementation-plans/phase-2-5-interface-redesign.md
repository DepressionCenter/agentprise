<!--
This file is part of Agentprise
docs/implementation-plans/phase-2-5-interface-redesign.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Phase 2.5 plan: replace the tabbed U-M themed interface with the chosen
         workspace design: a sidebar, a fill-in-the-sentence editor with a live
         preview, and a Details view that shows what each product receives.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Phase 2.5: interface redesign

[Back to project README](../../README.md)

This plan replaces the six-tab, U-M themed interface from Phase 2 with the design
chosen after review. It is written for an engineer who has the Phase 2 app in
front of them and the design mockups beside it. The engine does not change. When
this phase is done, the same jobs work in the new layout: describe an assistant,
open one you already have, try a library sample, and download it for every
product.

### Goal

One page with a left sidebar (Workspace, Library, Details, Help), a workspace that
opens on a start page and turns into a fill-in-the-sentence editor with a live
chat preview and a "Where it can go" list, and a Details view that shows every
field as a plain form beside the exact files each product receives.

### The design

The mockups live on a private design canvas owned by the project lead. The parts
that matter for the build are recorded here so the plan stands on its own.

- **App shell.** A light gray page with a rounded, bordered shell inside it. A
  220 pixel white sidebar on the left holds the logo mark, the wordmark, a section
  label, the four navigation links, and a pinned note that reads "Browser only.
  Nothing you type leaves this browser." A 64 pixel top bar holds a breadcrumb on
  the left and a GitHub link on the right. The footer holds the copyright line
  with a link to the Eisenberg Family Depression Center and a "Source on GitHub"
  link. Everything stacks to one column at phone width.
- **Workspace, start page.** A short eyebrow line, the heading "Your assistant,
  anywhere.", one sentence, then a large dashed drop zone beside two cards:
  "Create new" and "Use a sample". The editor stays hidden until one of these is
  chosen or a file is dropped.
- **Workspace, editor.** A heading that names how the person arrived ("Describe
  your assistant", "Your file is open", "<name>, from the library", or "Your draft
  is open") with a "Start over" button. The left card holds sentences with blanks
  at a large size, then a "More" disclosure for the welcome message, the picture,
  the Copilot settings, and the creator details. The right column holds a chat
  preview card (icon, name, description, welcome bubble, starter buttons, an "Ask
  anything" pill) and a "Where it can go" card listing Microsoft 365 Copilot
  (Teams chats `.agent`, Copilot app `.zip`), Gemini (Download skill), Claude
  (Download skill), and ChatGPT (Copy text), with the primary button "Keep a copy
  I can edit later" and the note "A small .zip you can open here any time."
  After review the Microsoft entry was split in two: "Copilot / Teams Apps" for
  the app package and "Teams Chat" for the `.agent` file.
- **Details.** The same shell with Details active, a breadcrumb that includes the
  assistant's name, and a "Back to the simple view" button in the top bar. The
  left card, "What you write", is a plain form: Name, Description, Instructions
  with a character count, Opening questions one per line, Welcome message, the
  icon chooser, and the Copilot and creator disclosures. The right card, "What
  each product receives", has product tabs (Gemini and Claude, Teams chats,
  Copilot app, ChatGPT), a file tree with a code view of the selected file where
  the person's own words are highlighted, a Download button, and "After
  downloading" steps.
- **Tokens.** Text `#1B2430`, muted `#5B6572`, accent `#2B4C7E` with hover
  `#1D3558`, borders `#E3E6EA`, active navigation fill `#EEF1F5`, page `#E9ECF0`,
  shell `#F4F5F7`. Radii: shell 18, cards 16, buttons and inputs 10, bubbles 12,
  pills 999. Touch targets 44 pixels, primary buttons 48.

### Changes from the design

- **No web font.** The mockups load IBM Plex Sans and IBM Plex Mono from Google
  Fonts. A font request would contact Google from every visitor's browser, which
  contradicts the "nothing leaves this browser" promise and the project rule
  against web fonts. The page names IBM Plex first in its font stacks, so it is
  used where it is installed, and falls back to the system interface font
  elsewhere. Self-hosting the font files is possible later, at the cost of the
  single-file shape.
- **Darker input borders.** The mockups draw input borders in `#C8CDD3`, which
  is about 1.6:1 against white and fails WCAG 1.4.11 for component boundaries.
  Inputs use `#7F8A96` instead. Card borders stay light because they carry no
  meaning.
- **Questions instead of a sentence.** The mockup wove the blanks into one
  sentence ("My assistant is called ___. It helps people ___"). A description or
  instructions imported from a file rarely fit that grammar, and the first build
  read badly. The editor now asks four plain questions, each with a blank under
  it: what it should be called, what it does, how it should behave, and what
  people might ask it first. Each question is the blank's visible label.
- **No notice about saved work.** When a draft exists, the editor simply opens
  with it. Confirmations in the status bar clear themselves after a few seconds;
  errors stay until the person acts.
- **Links.** Links that leave the app open in a new tab. The documentation link
  uses the full GitHub address, because the site is served with `.nojekyll` and
  Markdown is not turned into web pages.
- **Dark mode stays.** The mockups show light mode only. The page keeps a dark
  palette that follows the system setting, with the same accent.
- **The starter list is text.** In the Details form, opening questions are one
  textarea with one question per line, as in the mockup. Reordering means moving
  a line, which replaces the Move up and Move down buttons from Phase 2.
- **Readiness replaces the Check tab.** The three required fields are checked as
  the person types. While one is missing, the download buttons are disabled and
  the "Where it can go" card lists what is missing as links that focus the field.
  Warnings about what a format drops appear next to that product in the Details
  view.

### Global constraints

Same as Phase 2, with these changes:

- The U-M palette is retired from the page. The default agent icon is the first
  letter of the name in white on the accent color.
- Views are routed by hash: `#workspace`, `#library`, `#details`, `#help`. The
  Phase 2 hashes `#home`, `#build`, `#check`, and `#download` still open the
  matching view so old links keep working.
- Every input in the simple editor has an accessible name, because the sentence
  around it is not a label.
- The page stays under 250 KB. The logo mark is a separate 42 KB PNG under
  `images/`.

### Review focus

1. A description or instructions imported from a file can be any text. The
   sentence blanks must show it in full without breaking the layout.
2. Switching between the simple editor and the Details form must never lose
   typed text, because both write to the same state and each re-renders from it.
3. Dropping a file on the start page while a draft exists must still ask first.
4. The Details code view must never interpret the person's text as markup. It is
   built from text nodes and `mark` elements only.
5. At 320 pixels wide, the sidebar becomes a top strip and no view scrolls
   sideways.

### Task 1: shell, navigation, and theme

- [x] Replace the header, tab strip, and footer with the sidebar, top bar, and
      footer from the design. Navigation is a `nav` with links and
      `aria-current`. Add the logo mark under `images/` and use it as the favicon.
- [x] Replace the theme tokens with the new palette in light and dark modes and
      check every pair with the contrast script.
- [x] Route the four views by hash and map the Phase 2 hashes to them.
- [x] Commit: "Replace the tabbed shell with the sidebar workspace".

### Task 2: workspace start page and editor

- [x] Build the start page: drop zone, "Create new", "Use a sample".
- [x] Build the question editor bound to name, description, instructions, and
      starters, with the "More" disclosure holding the remaining fields.
- [x] Build the chat preview card and keep it in step with every keystroke.
- [x] Build the "Where it can go" card with the download buttons, the readiness
      list, and "Keep a copy I can edit later".
- [x] Commit: "Add the sentence editor, preview, and destinations".

### Task 3: Details view

- [x] Build the "What you write" form, sharing the welcome, icon, Copilot, and
      creator controls with the simple editor by moving them between the two
      containers.
- [x] Build the product tabs, the file tree, the highlighted code view, the
      Download button, and the "After downloading" steps for each product.
      ChatGPT shows the copy boxes with Copy buttons and the `.md` download.
- [x] Commit: "Add the Details view".

### Task 4: library and help

- [x] Restyle the library list and the help page as cards inside the shell.
- [x] Commit: "Restyle the library and help views".

### Task 5: verification and documentation

- [x] Run `npm test`.
- [x] Rewrite the headless browser walkthrough for the new views, run it, and run
      axe-core on every view in both modes.
- [x] Update `docs/compliance.md` with the new structure, the new contrast
      tables, and the scan date. Update the project preferences skill.
- [x] Commit: "Update compliance evidence for the redesign".

### Verification

Serve the page locally and confirm: the start page opens with no draft, a saved
draft opens the editor, every sentence blank writes to the preview, every
download re-imports through the engine, the Details code view highlights the
typed text, and no view scrolls sideways at 320 pixels.

### Conclusion

After this phase the app has the chosen look and the two-level editor. Phase 3
adds the library content, the knowledge base pages, and the release checks.

### Additional resources

- [Phase 2: user interface](phase-2-user-interface.md)
- [Phase 3: library and release](phase-3-library-and-release.md)
- [Accessibility skill](../../skills/accessibility/SKILL.md)
- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)

[Back to project README](../../README.md)
