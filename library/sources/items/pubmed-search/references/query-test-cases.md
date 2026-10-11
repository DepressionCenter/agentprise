<!--
This file is part of Agentprise
pubmed-search/references/query-test-cases.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-10
Summary: Example questions with the PubMed queries the PubMed Search skill should produce, used as
models for the agent and as checks for maintainers.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# PubMed Search: query test cases

Each case gives a question, the query the skill should produce, and what the case checks. The first six cases use blocks from the Mobile Tech Publication Search Starter Kit by Judy Smith (see mobile-tech-search-blocks.md). In every case the reply starts with the label "Prepared search strategy (not executed)" unless a PubMed tool ran the query in the conversation.

A close match is fine when the wording of the question differs. What matters is the structure: the right blocks, capital Boolean operators, balanced parentheses, straight double quotes, and the field tags shown.

## Case 1: Smart rings for sleep

**Question:** I am looking for studies that use smart rings for sleep.

**Expected query:**

```text
("Smart ring*"[tw] OR "smartring*"[tw] OR "smart-ring*"[tw] OR oura[tw] OR samsung[tw] OR "galaxy ring*"[tw] OR xiaomi[tw]) AND (Sleep[mesh] OR "Sleep Wake Disorders"[Mesh] OR wakefulness[mesh] OR sleep*[tw] OR apnea[tw] OR insomnia[tw] OR wakeful*[tw] OR wake[tw] OR "time in bed"[tw] OR nap[tw] OR naps[tw])
```

**What it tests:** Reproduces Example 1 of the starter kit exactly: the Smart Ring device block joined to the Sleep domain block with AND.

## Case 2: Mobile health technology in cardiovascular care

**Question:** I am interested in seeing how mobile health technologies are used in the cardiovascular domain. I don't have a specific device in mind.

**Expected query:**

```text
(Wearable Electronic Devices[Mesh] OR wearable*[tw] OR nearable*[tw] OR "fitness tracker*"[tw] OR "ambulatory monit*"[tw] OR "mobile data"[tw] OR "mobile technol*"[tw] OR "mobile health technol*"[tw]) AND ("cardiovascular agents"[mesh] OR "cardiovascular diseases"[mesh] OR Cardiovascular[tw] OR cardiac[tw] OR "heart rate*"[tw] OR electrocardiography[mesh] OR Electrocardiogram*[tw] OR arrhythmia*[tw] OR tachycardia[tw] OR ECG[tw] OR EKG[tw])
```

**What it tests:** Reproduces Example 2 of the starter kit (broad block AND Cardiovascular block), with the curly quotes around ambulatory monit* changed to straight quotes, as the pre-flight checklist requires.

## Case 3: University of Michigan researchers

**Question:** Find studies by University of Michigan researchers that use smart rings for sleep. I don't care if they are still at Michigan.

**Expected query:**

```text
("Smart ring*"[tw] OR "smartring*"[tw] OR "smart-ring*"[tw] OR oura[tw] OR samsung[tw] OR "galaxy ring*"[tw] OR xiaomi[tw]) AND (Sleep[mesh] OR "Sleep Wake Disorders"[Mesh] OR wakefulness[mesh] OR sleep*[tw] OR apnea[tw] OR insomnia[tw] OR wakeful*[tw] OR wake[tw] OR "time in bed"[tw] OR nap[tw] OR naps[tw]) AND "university of michigan"[Affiliation]
```

**What it tests:** Adds the starter kit's affiliation line to the end of the query. [Affiliation] and [ad] search the same field and cover all authors' affiliations.

## Case 4: Narrow with a title search

**Question:** The smart ring and sleep search gives me too many results. Help me focus it.

**Expected query:**

```text
("Smart ring*"[ti] OR "smartring*"[ti] OR "smart-ring*"[ti] OR oura[ti] OR samsung[ti] OR "galaxy ring*"[ti] OR xiaomi[ti]) AND (Sleep[mesh] OR "Sleep Wake Disorders"[Mesh] OR wakefulness[mesh] OR sleep*[ti] OR apnea[ti] OR insomnia[ti] OR wakeful*[ti] OR wake[ti] OR "time in bed"[ti] OR nap[ti] OR naps[ti])
```

**What it tests:** Follows the starter kit's advice to replace [tw] with [ti] so terms must appear in the title. MeSH terms stay as they are. The label stays "Prepared search strategy (not executed)" until a tool runs it.

## Case 5: Systematic review planning

**Question:** I'm starting a systematic review on smartwatches for sleep and need a search that finds everything.

**Expected query:**

```text
("Smart watch*"[tw] OR "smartwatch*"[tw] OR "smart-watch*"[tw] OR "apple watch*"[tw] OR arcawatch*[tw] OR actiwatch*[tw] OR pro-diary[tw] OR fitbit*[tw] OR garmin[tw] OR polar[tw] OR samsung[tw] OR withings[tw] OR xiaomi[tw] OR amazfit[tw]) AND (Sleep[mesh] OR "Sleep Wake Disorders"[Mesh] OR wakefulness[mesh] OR sleep*[tw] OR apnea[tw] OR insomnia[tw] OR wakeful*[tw] OR wake[tw] OR "time in bed"[tw] OR nap[tw] OR naps[tw])
```

**What it tests:** Must trigger the librarian-review recommendation before anything else, must not call the search exhaustive, and must not add systematic[sb], because the person is doing a review, not looking for reviews. Curly quotes in the Smart Watch block become straight quotes.

## Case 6: Overview through review articles

**Question:** Give me an overview of research on wearables and physical activity. I just want to get a sense of the field.

**Expected query:**

```text
(Wearable Electronic Devices[Mesh] OR wearable*[tw] OR nearable*[tw] OR "fitness tracker*"[tw] OR "ambulatory monit*"[tw] OR "mobile data"[tw] OR "mobile technol*"[tw] OR "mobile health technol*"[tw]) AND (exercise[mesh] OR exercise[tw] OR running[tw] OR walking[tw] OR swimming[tw] OR climb*[tw] OR "activ* time"[tw] OR "step count"[tw] OR ("heart rate"[tw] AND zone[tw] ) OR wheelchairs[mesh] OR (wheelchair*[tw] AND (propulsion[tw] OR push*)) OR gait[tw] OR "time sitting"[tw] OR "time standing"[tw] OR "time walking"[tw] OR (stair*[tw] AND climb*[tw]) OR "rest time"[tw]) AND review[pt]
```

**What it tests:** Combines the broad block with the Physical Activity block and follows the starter kit's suggestion to filter a broad search to review articles. The agent should say once that the filter leaves out primary studies. It also tests the pre-flight checklist: the lowercase "or" before gait[tw] in the published Physical Activity block becomes a capital OR, and the curly quotes in the broad block become straight quotes.

## Case 7: General topic with a date limit

**Question:** What has been published in the last five years about mobile apps for depression?

**Expected query:**

```text
(depression[mh] OR depress*[tiab]) AND ("mobile applications"[mh] OR app[tiab] OR apps[tiab] OR smartphone*[tiab]) AND "last 5 years"[dp]
```

**What it tests:** Tests a question with no starter-kit block: a MeSH term plus tagged text words for each concept, a truncated stem of at least four letters, capital AND and OR, and a relative date filter.

## Case 8: Fixing a pasted query

**Question:** Can you fix my search? depression and anxiety

**Expected query:**

```text
(depression[mh] OR depress*[tiab]) AND anxiety[tiab]
```

**What it tests:** Tests the lowercase-operator rule. A lowercase "and" is searched as a word and the untagged phrase can map to a journal name, so the agent must use a capital AND and explain the change in one sentence. A MeSH term for anxiety may also be added after checking it.
