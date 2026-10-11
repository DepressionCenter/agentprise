<!--
This file is part of Agentprise
pubmed-search/references/pubmed-syntax-guide.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-10
Summary: Short guide to PubMed search syntax for the PubMed Search skill. Checked against NLM documentation on 2026-10-10.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# PubMed search syntax guide

A short guide to writing PubMed queries: how to combine terms, which field tags to use, and how to tell what PubMed actually searched.

Checked against the PubMed User Guide and NLM training pages on 2026-10-10. See [Sources](#sources) at the end.

## Boolean operators and nesting

- Type `AND`, `OR`, and `NOT` in capital letters. In a test search on 2026-10-10, PubMed searched a lowercase "and" as an ordinary word.
  - `AND` finds records that contain all the terms.
  - `OR` finds records that contain at least one of the terms.
  - `NOT` removes records that contain a term.
- When you leave out an operator, PubMed puts `AND` between concepts. For example, `vitamin c common cold` becomes `vitamin c AND common cold`.
- PubMed reads a query from left to right. Put parentheses around each group of synonyms so it is processed as one unit:

  ```
  (insomnia OR sleep*[tiab]) AND (smartphone*[tiab] OR "mobile applications"[mh])
  ```

## Phrases and quotation marks

- Put a phrase in straight double quotes (`"`) to search it as a phrase: `"kidney allograft"`.
- A quoted phrase skips automatic term mapping (see below). For example, `"health planning"` finds records indexed to the MeSH term Health Planning but not its narrower terms.
- PubMed searches phrases using a phrase index. If a quoted phrase is not in that index, PubMed ignores the quotes, searches the words separately, and shows the message "Quoted phrase not found in phrase index".
- If you tag a phrase (for example `kidney allograft[tiab]`) and the phrase is not in the index, PubMed breaks it into separate terms.
- To find words next to each other when the phrase is not in the index, use a proximity search with a distance of 0: `"cognitive impairment in multiple sclerosis"[tiab:~0]`.
- Proximity searches use the form `"search terms"[field:~N]`, where N is the most words allowed between the terms. They work only in the Title `[ti]`, Title/Abstract `[tiab]`, and Affiliation `[ad]` fields, and not with wildcards.

## Truncation (wildcards)

- An asterisk `*` stands for zero or more characters. For example, `"vaccin* schedul*"` finds "vaccine schedule", "vaccination schedules", and more.
- A term needs at least four characters before the first asterisk: `colo*` works. With fewer, PubMed cannot use the wildcard and treats the asterisk as a space, so it searches only the letters you typed.
- You can use more than one wildcard in a term (`organi*ation*`) and inside a phrase (`"colo* cancer*"`, `breast feed*[tiab]`).
- Wildcards turn off automatic term mapping and MeSH explosion. `"heart attack*"` does not map to the MeSH term Myocardial Infarction. If a concept has a MeSH term, add it separately with `OR`.

## Field tags

A field tag limits a term to one part of the record.

- Put the tag in square brackets right after the term: `crabs[mh]`. Case and spacing do not matter.
- A tag after several words searches them as a phrase: `kidney allograft[tiab]`.
- To search several separate words in one field, tag each word: `covid-19[ti] vaccine[ti] children[ti]`.
- A field tag turns off automatic term mapping for that term.

| Tag | Field | What it searches (NLM definition, shortened) |
|---|---|---|
| `[tw]` | Text Words | Title, abstract, other abstract, MeSH terms, MeSH subheadings, publication types, substance names, personal name as subject, corporate author, secondary source, comment and correction notes, and other terms (keywords). It turns off automatic term mapping and MeSH explosion. |
| `[tiab]` | Title/Abstract | Title, collection title, abstract, other abstract, and author keywords. It does not search MeSH terms. |
| `[ti]` | Title | Words in the title, and the collection title for book citations. |
| `[mh]` | MeSH Terms | NLM's Medical Subject Headings, the controlled vocabulary used to describe each MEDLINE article. A tagged term still maps to the right MeSH heading, and entry terms map too. Put the tagged term in double quotes to search only that exact heading. |
| `[majr]` | MeSH Major Topic | A MeSH term that is one of the main topics of the article. |
| `[pt]` | Publication Type | The kind of material, such as Review, Clinical Trial, Retracted Publication, or Letter. A publication type includes its more specific types unless you use `[pt:noexp]`. |
| `[au]` | Author | Last name, a space, and up to two initials, with no periods or comma: `fauci as`. PubMed truncates author names automatically; put the name in quotes to stop that: `"o'brien j"[au]`. |
| `[ta]` | Journal | Journal title abbreviation, full title, or ISSN: `J Biol Chem`, `Journal of Biological Chemistry`, or `0021-9258`. Use it when a journal name is also a subject word, as in `cell[ta]`. |
| `[dp]` | Publication Date | Dates as `yyyy/mm/dd[dp]`, with month and day optional: `1998[dp]`. Ranges use a colon: `1996:1998[dp]`. Relative dates: `"last 5 years"[dp]`. `[dp]` and `[pdat]` are the same. |
| `[ad]` or `[affiliation]` | Affiliation | Author, corporate author, and investigator affiliations, when the publisher supplied them. Searches all affiliations on the record. |

More about affiliations:

- `[ad]` is the short form and `[Affiliation]` is the full form. Both search the same field.
- `cleveland[ad] AND clinic[ad]` can match words spread across different authors' affiliations on one record.
- To keep words inside one affiliation, use proximity: `"Hopkins Bloomberg Public"[ad:~45]`.
- Affiliations for all authors were added starting in 2014. Older citations include only the first author's affiliation.

## Automatic term mapping

PubMed changes untagged terms before searching them. This is called automatic term mapping (ATM).

- An untagged term is matched, in this order, against a subject translation table (which includes MeSH), a journals table, the author index, and an investigator index. Matching stops at the first table that matches.
- A term found in the subject table is searched as MeSH (including narrower MeSH terms) and in all fields. For example, `child rearing` becomes `"child rearing"[MeSH Terms] OR ("child"[All Fields] AND "rearing"[All Fields]) OR "child rearing"[All Fields]`.
- The subject table also adds British and American spellings, singular and plural forms, synonyms, and generic names for brand-name drugs.
- These turn ATM off:
  - a field tag, such as `[tiab]` or `[tw]`;
  - double quotes around a phrase;
  - a wildcard `*`.
- Turning ATM off can miss relevant records, because articles are indexed with the most specific MeSH term available. To keep both, combine a MeSH term with tagged text words: `(insomnia[mh] OR insomnia[tiab])`.
- ATM can match a journal name instead of a topic. For example, a lowercase `depression and anxiety` matched the journal *Depress Anxiety* in a test search on 2026-10-10. Use capital `AND` and tags to avoid this.

## MeSH explosion

- MeSH terms are arranged in a hierarchy. A MeSH search automatically includes the narrower terms under it. This is called explosion.
- To search only the term itself, use `[mh:noexp]`: `eye[mh:noexp]`. This also works with `[majr:noexp]` and with a subheading, as in `hypertension/therapy[mh:noexp]`.
- Turning off explosion can drop relevant articles, because articles are indexed with the most specific term available. Use it only when you mean to leave out the narrower terms.
- Subheadings attach with a slash: `neoplasms/diet therapy` or `neoplasms/dh`. Only one subheading can be attached to a MeSH term.

## Common filters

Filters can remove relevant records. Many filters rely on MeSH terms added during MEDLINE indexing, so they can miss citations that are not indexed for MEDLINE, such as preprints and citations that are online ahead of print. Add filters only when the person asks or the question needs them.

| Filter | Add to the query |
|---|---|
| Last year, 5 years, 10 years | `AND "last year"[dp]`, `AND "last 5 years"[dp]`, `AND "last 10 years"[dp]` |
| Custom date range | `AND 2020:2024[dp]` |
| Has an abstract | `AND hasabstract` |
| Free full text | `AND free full text[sb]` |
| Full text | `AND full text[sb]` |
| English | `AND english[la]` |
| Humans | `AND humans[mh]` |
| Other animals | `AND "animals"[mh:noexp]` |
| Review | `AND review[pt]` |
| Systematic reviews | `AND systematic[sb]` (filter strategy), or `AND systematic review[pt]` (publication type only, which can miss records not yet indexed) |
| Exclude preprints | `NOT preprint[pt]` |

Most article type filters use the type name with `[pt]`, for example `"multicenter study"[pt]`.

## Read the query translation

PubMed shows how it translated a query. On the website this is in Search Details, under History on the Advanced Search page. In the E-utilities API it is the `querytranslation` field, with each mapping in `translationset` and problems in `warninglist` and `errorlist`.

Check these things:

1. **Did each untagged term map the way you meant?** Look for MeSH terms, spelling variants, and journal names PubMed added.
2. **Were your phrases kept?** A "quoted phrase not found" warning means the words were searched separately.
3. **Were any terms not found?** A "phrase not found" error means a term matched nothing.
4. **Did your wildcards survive?** A truncated stem that appears without its `*` was too short.
5. **Did your tags work?** In a test search on 2026-10-10, PubMed did not report a made-up tag in `fieldsnotfound`; the translation simply kept `depression[notafield]` as typed. If a tagged term looks unchanged in the translation, check the tag against the table above.

Exact phrases do not appear in the list of term mappings, because they skip ATM.

## PubMed search links

To share a search, build a link from `https://pubmed.ncbi.nlm.nih.gov/?term=` followed by the query, with spaces written as `+`. Example: `https://pubmed.ncbi.nlm.nih.gov/?term=antioxidant+chocolate`. Very long queries may hit a browser's link length limit. PubMed can display up to 10,000 results for one search.

## Sources

- PubMed User Guide, National Library of Medicine. https://pubmed.ncbi.nlm.nih.gov/help/ (page dated September 30, 2026; read 2026-10-10).
- NLM PubMed Online Training, Module 4, "Search within a Specific Field". https://www.nlm.nih.gov/oet/ed/pubmed/mesh/mod04/01-100.html (read 2026-10-10).
- NLM PubMed Online Training, Module 4, "Turn off Automatic Term Mapping (ATM)". https://www.nlm.nih.gov/oet/ed/pubmed/mesh/mod04/01-200.html (read 2026-10-10).
- NLM PubMed Online Training, Module 4, "Turn off Automatic Explosion". https://www.nlm.nih.gov/oet/ed/pubmed/mesh/mod04/01-300.html (read 2026-10-10).
- NCBI, "A General Introduction to the E-utilities" (Entrez Programming Utilities Help). https://www.ncbi.nlm.nih.gov/books/NBK25497/ (read from a web archive copy dated 2026-07-20, because the live page was not reachable on 2026-10-10).
- Test searches against the NCBI E-utilities API on 2026-10-10. These show how the service behaved that day, not documented rules.

Second check on 2026-10-10: every statement above was compared line by line with saved copies of the PubMed User Guide (including its "Filter search strategies" table and its list of characters converted to spaces), NLM training module 4 pages 01-100, 01-200, and 01-300, NBK25497, and the saved test search responses. Statements marked "in a test search" rest only on those responses.
