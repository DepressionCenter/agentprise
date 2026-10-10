<!--
This file is part of Agentprise
docs/implementation-plans/README.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: Index of the phased implementation plans for the Agentprise web app.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Implementation plans

[Back to project README](../../README.md)

This folder holds the phased build plan for the Agentprise web app. It is written
for an engineer or agent who has never seen the project and needs to pick up a
phase cold. Each phase produces working, testable software on its own, and each
phase's plan lists its tasks with the files, tests, and commands involved.

### Phases

1. [Phase 1: core engine](phase-1-core-engine.md). The data model, the YAML and
   ZIP readers and writers, the importers and exporters for every supported
   format, and a Node test suite that runs against the script inside `index.html`.
2. [Phase 2: user interface](phase-2-user-interface.md). The six tabs, the build
   form, the check screen, the download cards, the help page, draft autosave, and
   the accessibility work that goes with them.
3. [Phase 2.5: interface redesign](phase-2-5-interface-redesign.md). The
   sidebar workspace, the fill-in-the-sentence editor with a live preview, and
   the Details view, replacing the tabbed U-M themed interface after review.
4. [Phase 3: library and release](phase-3-library-and-release.md). The Caveman
   bundle in the library folder, the catalog the Library view reads, the usage,
   FAQ, and how-to pages, browser verification, and the pull request.
5. [Phase 4: user guides with screenshots](phase-4-user-guides.md). Illustrated
   step-by-step guides for each job a person comes to do, written last so the
   screenshots match the settled interface.

### How these plans relate to the original design

The design document that shaped this plan lives outside the repository. The
[formats page](../formats.md) records the vendor facts the design relied on, with
the date each one was checked. Where this plan departs from that design, the phase
plan says so under a heading named "Changes from the design" and gives the reason.

### Branches and review

Each phase is built on its own branch, named after the phase
(`feature/phase-1-core-engine`, `feature/phase-2-user-interface`,
`feature/phase-2-5-interface-redesign`, `feature/phase-3-library-and-release`,
`feature/phase-4-user-guides`), and merged through its own pull request.
The next phase starts only after the previous one has been reviewed and merged.

### Conclusion

Start with Phase 1. Do not begin a later phase until the earlier phase's
verification steps pass and its pull request is merged, because each phase builds
on the interfaces the previous one defined.

### Additional resources

- [Project instructions](../../AGENTS.md)
- [Project preferences](../../skills/project-preferences/SKILL.md)
- [Formats and verified vendor facts](../formats.md)
- [Documentation index](../README.md)

[Back to project README](../../README.md)
