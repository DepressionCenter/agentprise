<!--
This file is part of Agentprise
docs/implementation-plans/phase-2-user-interface.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Phase 2 plan: the six tabs, the build form, downloads, draft autosave, and accessibility work.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Phase 2: user interface

[Back to project README](../../README.md)

This plan builds the screens of Agentprise on top of the Phase 1 engine. It is
written for an engineer who has the engine in front of them and has read the
[accessibility skill](../../skills/accessibility/SKILL.md). When this phase is
done, a person can make an agent, open one they already have, check it, and
download it in every format, using only a keyboard if they wish.

### Goal

Six tabs in `index.html` (Home, Library, Build, Check, Download, Help) that call the
engine, autosave a draft to `localStorage`, and meet WCAG 2.2 AA.

### Architecture

All markup lives in `index.html`. Each tab is a section with the `tabpanel` role
controlled by a `tablist` with arrow-key navigation. A single in-memory
`state.agent` object is the source of truth; the form writes into it on input and
the Check and Download tabs read from it. Icon handling uses a hidden canvas: the
uploaded image is decoded through an `Image` element, redrawn at 192 by 192 for
the color icon and reduced to a white silhouette at 32 by 32 for the outline icon.
All text reaches the page through `textContent`.

### Global constraints

Same as Phase 1, plus:

- U-M Blue `#00274C` for the header and primary buttons, Maize `#FFCB05` for
  accents and focus rings on dark surfaces, Arboretum Blue `#2F65A7` for links.
  Maize is never used as text on white. Dark mode follows the system setting.
- 16px base text, system font stack, 44px minimum pointer targets, 3px visible
  focus ring, `prefers-reduced-motion` respected.
- Interface text at a grade 7 to 9 reading level, no exclamation marks in system
  messages.

### Review focus

1. Opening a file while a draft exists must not silently replace the draft. The
   app asks first with a native dialog.
2. A file over the size cap must show a plain message naming the limit, not hang
   or throw.
3. Switching tabs must not lose typed text, because every input writes to state
   on the `input` event.
4. The Download tab must disable download buttons while the Check tab reports a
   problem, and say why.
5. If `localStorage` is blocked, every feature still works and a quiet note says
   the draft will not be kept.

### Task 1: shell, tabs, theme, and focus management

- [x] Add the skip link, header, tablist, six empty panels, footer with "Clear my
      draft", and the CSS custom properties for light and dark modes.
- [x] Implement the tablist: Left and Right arrows move between tabs, Home and
      End jump, `aria-selected` and `tabindex` roving, and hash routing so the
      browser Back button works.
- [x] Check contrast of every color pair in both modes and record the ratios in
      `docs/compliance.md` (Phase 3 finishes that page).
- [x] Commit: "Add app shell, tabs, and theme".

### Task 2: Home tab and file opening

- [x] Headline, one-sentence subtitle, three large buttons, three-step strip, and
      the unsaved-work banner.
- [x] A drop zone with a visible Browse button and a file input that accepts
      `.agent`, `.zip`, and `.md`. On file: read bytes, cap at
      `LIMITS.zipTotalBytes`, call `detectFormat`, then the matching importer, show
      notices in the live region, load the agent into state, and move to Build.
- [x] Commit: "Add Home tab and file import".

### Task 3: Build tab

- [x] One fieldset per row from the design: Name (with the read-only derived
      skill name underneath), Short description, Welcome message, Instructions
      with a counter and a "Help me write this" template button, Conversation
      starters with Add, Remove, Move up, and Move down buttons, Icon with
      preview, Remove, and Use the default icon, Knowledge from SharePoint,
      Copilot options in a collapsed details element, About you in a collapsed
      details element with a license dropdown.
- [x] Every input has a visible label, a hint joined through `aria-describedby`,
      and an inline error element announced politely.
- [x] Autosave to `localStorage` on every change, debounced to 300 ms. The icon
      is stored as a base64 string.
- [x] Commit: "Add Build tab".

### Task 4: Check tab

- [x] Run `validateAgent` on entry. List problems and warnings as links that move
      focus to the field. Show a preview card with icon, name, and description.
      Put the raw-files view in a closed details element with one tab per format.
- [x] Commit: "Add Check tab".

### Task 5: Download tab

- [x] Four cards in the order from the design, each with a file type line, one
      sentence on who it is for, a Download button, a yellow notice for fields the
      format drops, and a numbered "What to do next" list in a details element.
- [x] The "Not sure which one?" chooser with three yes or no questions between
      cards 2 and 3.
- [x] Card 4 holds four read-only text boxes with Copy buttons and a "Download
      as .md" button.
- [x] Commit: "Add Download tab".

### Task 6: Help tab

- [x] The FAQ from the design and the "At a glance" table with text alternatives
      for every symbol.
- [x] Commit: "Add Help tab".

### Task 7: keyboard and screen reader walkthrough

- [x] Walk every screen with the keyboard only and fix anything unreachable.
- [x] Run an automated scan (Lighthouse or axe through the browser tools) and fix
      what it reports.
- [x] Record what was tested and what still needs a human under the Accessibility
      heading of the response.
- [x] Commit: "Fix accessibility findings".

### Verification

Open `index.html` from a `file://` address and from a local static server. Confirm
every tab works, the draft survives a reload, and the four downloads pass the
engine's own import.

### Conclusion

After this phase the app is usable end to end. Phase 3 adds the library, the
documentation, and the release checks.

### Additional resources

- [Phase 1: core engine](phase-1-core-engine.md)
- [Phase 3: library and release](phase-3-library-and-release.md)
- [Accessibility skill](../../skills/accessibility/SKILL.md)
- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)

[Back to project README](../../README.md)
