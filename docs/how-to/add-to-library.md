<!--
This file is part of Agentprise
docs/how-to/add-to-library.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-09
Summary: How to get an assistant listed in the Agentprise Library, and how a
         maintainer adds one to the repository.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Add your assistant to the Library

[Back to project README](../../README.md)

The Library is the list of ready-made assistants on the Library page of the app.
Anyone can send one in. This page tells you what to send and what happens next.
The last section is for the maintainer who adds it to the repository.

### What to send

1. Open your assistant in Agentprise and fill in the extra settings under
   **More**: a picture, your name and website, and the license you want. The
   license is the terms other people may use your assistant under.
2. Choose **Keep a copy I can edit later**. You get a `.zip` file.
3. Go to the [new issue page on GitHub](https://github.com/DepressionCenter/agentprise/issues/new)
   and choose **Send an assistant to the Library**. The form asks for the
   name, one sentence about what it is for, and the `.zip` file. A GitHub
   account is free.

The same form works for an assistant that is already in the Library. Choose
**Replace one that is already in the Library**, use the same name, and say what
changed.

Before you send it, check that:

- The instructions contain nothing private: no names of real people, no
  internal links, no passwords or keys, and no health information.
- Any SharePoint links are removed, because they only work inside your own
  organization.
- You are happy for anyone to use and change it under the license you chose.

A maintainer reads every file before it goes in. Assistants that could mislead
people, that target a person or group, or that carry anything private are not
added.

### For maintainers: adding an entry

The Library is the `library/` folder next to `index.html`. It holds one `.zip`
per assistant and a `catalog.json` that lists them. The app reads the catalog,
fetches each `.zip`, and opens it with the same importer it uses for a dropped
file, so an entry is nothing more than a bundle the app itself made.

1. Open the submitted `.zip` in the app and check every field. If anything needs
   to change, change it and choose **Keep a copy** to get a clean bundle.
2. Copy the `.zip` into `library/`. Keep the file name the app gave it, which is
   the skill name, such as `caveman.zip`. The name must be plain letters,
   digits, spaces, dots, hyphens, or underscores, ending in `.zip`, because the
   app refuses anything else.
3. Add a line to `library/catalog.json`:

   ```json
   {
     "file": "caveman.zip",
     "name": "Caveman",
     "summary": "Me agent, answer questions, big brain.",
     "tags": ["fun", "example", "copilot"],
     "author": "Gabriel Mongefranco",
     "license": "GPL-3.0-or-later"
   }
   ```

   The name, summary, author, and license must match what the bundle says, and
   the tests check that they do. Tags are free text for the search box.
4. Run `npm test`. The library tests open every listed bundle, check the catalog
   line against it, and check that the picture is 192 by 192 pixels.
5. Start the local server and open the Library page to see the card.

To replace an assistant, overwrite its `.zip` and update its catalog line. The
page has no copy of any entry inside it, so adding, replacing, or removing a
`.zip` and its catalog line is the whole change.

### Conclusion

Send a bundle through the GitHub issue form and a maintainer takes it from there. If you
maintain the repository, drop the bundle in `library/`, add the catalog line, and
run the tests.

### Additional resources

- [New issue on GitHub](https://github.com/DepressionCenter/agentprise/issues/new)
- [Using Agentprise](../usage.md)
- [Formats: what the bundle contains](../formats.md)
- [Project preferences for maintainers](../../skills/project-preferences/SKILL.md)

[Back to project README](../../README.md)
