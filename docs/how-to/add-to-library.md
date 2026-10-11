<!--
This file is part of Agentprise
docs/how-to/add-to-library.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-09
Last Modified: 2026-10-11
Summary: How to get an assistant or skill listed in the Agentprise Library, and
         how a maintainer adds one to the repository.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Agentprise

## Add your assistant to the Library

[Back to project README](../../README.md)

The Library is the list of ready-made assistants and skills on the Library page
of the app. Anyone can send one in. This page tells you what to send and what
happens next. The last sections are for the maintainer who adds it to the
repository.

### What to send

1. Open your project in Agentprise. Open **More settings** and fill in
   **Publisher details**: your name, your website, and the license you want.
   Give your assistant a picture too. The license is the terms other people
   may use your work under.
2. Choose **Download Backup**. You get one `.zip` file with the whole project,
   named like `my-assistant.agentprise.zip`.
3. Open the [Library form on GitHub](https://github.com/DepressionCenter/agentprise/issues/new?template=library-assistant.yml).
   It asks for the name, one sentence about what it is for, and the `.zip`
   file. A GitHub account is free.

The same form works for an assistant that is already in the Library. Choose
**Replace one that is already in the Library**, use the same name, and say what
changed.

Before you send it, check that:

- The instructions contain nothing private: no names of real people, no
  internal links, no passwords or keys, and no health information.
- Any SharePoint sources are removed, because they only work inside your own
  organization, and any attached files hold nothing private.
- You are happy for anyone to use and change it under the license you chose.

A maintainer reads every file before it goes in. Entries that could mislead
people, that target a person or group, or that carry anything private are not
added.

Every assistant in the Library also carries the same short safety section in
its instructions. It gives no legal or medical advice, and it answers anyone who
seems to be in a mental health crisis with the 988 Lifeline notice. If yours
does not have that section yet, the maintainer adds it before listing. Web
search is on for every entry, so each one can look things up. No entry reads
Teams messages, email, meetings, or SharePoint files unless the person who
downloads it turns that on, so answers post to a group chat without an approval
step.

### For maintainers: adding an entry

The Library is the `library/` folder next to `index.html`. It holds one `.zip`
per entry and a `catalog.json` that lists them. Each `.zip` is a version 2
project backup, the same file **Download Backup** makes. The app reads the
catalog, fetches each `.zip`, and opens it with the same importer it uses for a
dropped file. So an entry is a backup plus one catalog line.

1. Open the submitted `.zip` in the app and check every field of every
   assistant and skill. If anything needs to change, change it and choose
   **Download Backup** to get a clean backup.
2. Copy the `.zip` into `library/` and rename it to the project's name in
   skill name form, without `.agentprise`, such as `caveman.zip`, so every
   Library file follows one rule. The name must be plain letters, digits,
   spaces, dots, hyphens, or underscores, ending in `.zip`, because the app
   refuses anything else.
3. Add a line to `library/catalog.json`:

   ```json
   {
     "file": "caveman.zip",
     "name": "Caveman",
     "summary": "Me agent, answer questions, big brain.",
     "kind": "agent",
     "capabilities": [],
     "tags": ["fun", "persona", "copilot"],
     "author": "Gabriel Mongefranco",
     "license": "GPL-3.0-or-later"
   }
   ```

   The fields are:

   | Field | What to put there |
   |---|---|
   | `file` | The file name in `library/` |
   | `name`, `summary`, `author`, `license` | The name, description, publisher name, and license of the first item in the backup, exactly as the backup says them |
   | `kind` | `agent` for one assistant, `skill` for a skill, or `project` for an assistant with skills. The card shows these as Assistant, Skill, and Assistant with skills |
   | `capabilities` | The tool ids the backup declares, as a list. Use `[]` when the backup has no tools |
   | `requires` | Optional. One plain sentence for the card about what the entry needs, such as "Optional: a PubMed tool for live search." Up to 200 characters |
   | `tags` | Free text for the search box and the tag buttons |

   Preserve each contributor's name, website, copyright, and license. Leave
   missing privacy and terms links blank; the app warns that Copilot app
   packages will use placeholders for those links.
4. Run `npm test`. The library tests open every listed backup and check that
   it opens without notices, carries no files the app cannot read, survives a
   backup round trip, and matches its catalog line, including `kind` and
   `capabilities`. An `agent` entry must hold exactly one assistant, and a
   `skill` entry exactly one skill within the Agent Skills limits. When the
   first item is an assistant, it must carry the safety section, have web
   search and image creation on, have SharePoint, Teams messages, email, and
   meetings off, link no SharePoint files, and have a 192 by 192 pixel picture.
5. Start the local server and open the Library page to see the card. Choose
   **View** and **Open** to check that it opens.

To replace an entry, overwrite its `.zip` and update its catalog line. The
page has no copy of any entry inside it, so adding, replacing, or removing a
`.zip` and its catalog line is the whole change.

The app writes backups without compression. That works in the Library, but the
file is larger, and the Library page downloads every entry to show its
picture. The entries converted by the migration script below are compressed.

### For maintainers: entries built from source folders

Some entries are kept as plain files, so changes can be reviewed line by line
instead of inside a `.zip`. They live under `library/sources/`:

- `library/sources/items/<skill-name>/` holds one assistant or skill folder:
  `SKILL.md`, `agentprise.json`, an `icon.png` for an assistant, and its other
  files, such as `references/`, `scripts/`, and `openapi/`.
- `library/sources/entries/<entry>.json` names the `.zip` to build, the item
  folders it holds, the project fields (id, name, version, publisher,
  license, dates, and tool servers), and its catalog line.

A skill used by more than one entry has one folder, so every copy is built
from the same files. PubMed Search, for example, is its own entry and is also
inside Evidence Scout. After changing a source folder or an entry file, run:

```
node tools/build-library.mjs
```

It rebuilds each `.zip` and its catalog line. The build is repeatable: ids and
dates come from the sources, and the `.zip` entries carry no dates. So
`node tools/build-library.mjs --check`, which the tests run, fails whenever a
committed `.zip` or catalog line no longer matches its sources.

### For maintainers: the version 1 conversion

Before projects existed, a Library entry was a version 1 bundle: one Agent
Skill folder that kept every field in its frontmatter metadata. The app no
longer reads those fields. The script `tools/migrate-library.mjs` converted
every Library entry to a version 2 backup once, on 2026-10-10, and added
`kind` and `capabilities` to each catalog line. It checks that every field the
downloads are built from is the same before and after, and stops if anything
changed.

Run it from the repository root with Node 20 or later:

```
node tools/migrate-library.mjs --check
node tools/migrate-library.mjs
```

The first command reports what would change and writes nothing. The second
converts. A backup that is already version 2 is left alone, so a second run
changes nothing. On 2026-10-10, `--check` reported all 13 entries as already
version 2 and the catalog unchanged.

When the app changes how it writes a backup, add `--relayout` to either
command. The script then opens every Library `.zip` that has no source folder,
writes it again the way the app writes a backup today, and checks that it
opens to the same project. Entries built from `library/sources/` are left to
`tools/build-library.mjs`. On 2026-10-11, `--relayout` rewrote 12 entries so
their Copilot settings and publisher details sit in `agentprise.json`, and a
second run reported nothing to rewrite.

### Conclusion

Send a backup through the GitHub issue form and a maintainer takes it from
there. If you maintain the repository, drop the backup in `library/`, add the
catalog line, and run the tests.

### Additional resources

- [Send an assistant to the Library, the form on GitHub](https://github.com/DepressionCenter/agentprise/issues/new?template=library-assistant.yml)
- [Using Agentprise](../usage.md)
- [Formats: what the project backup contains](../formats.md)
- [Project preferences for maintainers](../../skills/project-preferences/SKILL.md)

[Back to project README](../../README.md)

----

Copyright © 2026 The Regents of the University of Michigan
