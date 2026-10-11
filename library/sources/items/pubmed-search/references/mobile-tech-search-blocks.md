<!--
This file is part of Agentprise
pubmed-search/references/mobile-tech-search-blocks.md
Author(s): Gabriel Mongefranco.
Created: 2026-10-10
Last Modified: 2026-10-10
Summary: PubMed search blocks for mobile health technology, devices, and domains, copied from the
EFDC Mobile Tech Publication Search Starter Kit by Judy Smith.
Notes: See README file for documentation and full license information.

Copyright © 2026 The Regents of the University of Michigan

Licensed under the GNU Free Documentation License v1.3 or later.
See <https://www.gnu.org/licenses/fdl-1.3.html>. See README for full license information.

-->

# Mobile Tech Publication Search Starter Kit: PubMed search blocks

Adapted from the Mobile Tech Publication Search Starter Kit by Judy Smith, Informationist, Taubman Health Sciences Library, University of Michigan: [Mobile Tech Publication Search Starter Kit](https://teamdynamix.umich.edu/TDClient/210/DepressionCenter/KB/Article/12930/Mobile-Tech-Publication-Search-Starter-Kit) (Eisenberg Family Depression Center knowledge base, article 12930).

Copied on 2026-10-10. Only the PubMed column is included; the Dimensions column is left out.

## How to use these blocks

Pick the broad mobile health block or one device block, then join it to one domain block with `AND`. The examples near the end show the pattern.

**Note about quotation marks:** the source uses curly quotation marks (“ ”) in some blocks, for example around "ambulatory monit*" in the broad block and in the Activity Tracker, Smart Watch, and Heart Rate Strap blocks. PubMed uses straight double quotes (") for phrase searching. When you paste a block into PubMed, or build a query from it, change every curly quotation mark to a straight double quote. The blocks below are kept exactly as published.

In the examples copied below, the spaces around `AND` were non-breaking spaces in the source and are shown as ordinary spaces.

**Known issues in the published blocks:** the blocks below are kept exactly as published, so fix these when you build a query from them:

- Lowercase "or" appears in the Sleep Mat block (`pad[tw] or pads[tw] or mat[tw] or mats[tw]`), the Smart Phone block (`Smartphone[mesh] or smartphone*[tw]`), and the Physical Activity block (`) or gait[tw]`). PubMed treats a lowercase "or" as a search word, so change each one to a capital `OR`.
- The Continuous Glucose Monitor block has no operator between `rio[tw]` and `medtronic[tw]`. PubMed puts `AND` between terms when the operator is left out, so add `OR` between them.
- In the Physical Activity block, `push*` has no field tag, unlike the terms around it.

## Basic And Broad Mobile Health Technologies strategy (PubMed)

```text
(Wearable Electronic Devices[Mesh] OR wearable*[tw] OR nearable*[tw] OR "fitness tracker*"[tw] OR “ambulatory monit*”[tw] OR "mobile data"[tw] OR "mobile technol*"[tw] OR "mobile health technol*"[tw])
```

## Device Type Search strategies (PubMed Search column)

### Activity Tracker

```text
(Fitness trackers[mesh] OR “Fitness tracker*”[tw] OR “activity tracker*”[tw] OR fitbit[tw] OR garmin[tw] OR polar[tw] OR whoop[tw] OR xiaomi[tw] OR "mi-band"[tw] OR "mi band"[tw])
```

### Smart Watch

```text
(“Smart watch*”[tw] OR “smartwatch*”[tw] OR “smart-watch*”[tw] OR “apple watch*”[tw] OR arcawatch*[tw] OR actiwatch*[tw] OR pro-diary[tw] OR fitbit*[tw] OR garmin[tw] OR polar[tw] OR samsung[tw] OR withings[tw] OR xiaomi[tw] OR amazfit[tw])
```

### Smart Ring

```text
("Smart ring*"[tw] OR "smartring*"[tw] OR "smart-ring*"[tw] OR oura[tw] OR samsung[tw] OR "galaxy ring*"[tw] OR xiaomi[tw])
```

### Sleep Mat

```text
(("sleep tracking"[tw] AND (pad[tw] or pads[tw] or mat[tw] or mats[tw])) OR "sleep mat"[tw] OR "smart mat"[tw] OR "smart mats"[tw] OR whoop[tw] OR withings[tw] OR mypregnancycoach[tw] OR sleepspace[tw] OR "smart bed*"[tw] OR pro-diary[tw] OR actiwatch[tw])
```

### Dry EEG

```text
((Dry[tw] AND (eeg[tw] OR electrod*[tw])) OR zeto[tw] OR WR19[tw] OR b-alert[tw] OR withings[tw] OR "beamo"[tw] OR kardia[tw])
```

### Bluetooth Blood Pressure Cuff

```text
(("blood pressure determination"[mesh] OR "blood pressure cuff*"[tw] OR "blood pressure monitor*"[tw] OR "bp cuff*"[tw] OR "bp monitor*"[tw]) AND (Bluetooth[tw] OR "blue tooth"[tw] OR smart[tw] OR "Wearable Electronic Devices"[Mesh] OR wearable*[tw] OR nearable*[tw] OR garmin[tw] OR omron[tw] OR withings[tw]))
```

### Continuous Glucose Monitor

```text
("Continuous Glucose Monitoring"[Mesh] OR "Continuous glucose monitor*"[tw] OR "glucose meter*"[tw] OR cgm[tw] OR glucomet*[tw] OR accu-chek[tw] OR evencare[tw] OR ((abbott[tw] OR freestyle[tw] OR dexcom[tw] OR libre[tw] OR lingo[tw] OR rio[tw] medtronic[tw] OR "guardian connect"[tw] OR simplera[tw] OR eversense[tw]) AND ("Continuous glucose monitor*"[tw] OR "cgm"[tw])))
```

### Smart Phone

```text
(((Smartphone[mesh] or smartphone*[tw]) AND (wearable*[tw] OR nearable*[tw] OR "wearable electronic devices"[mesh])) OR (phone*[tw] AND sensor*[tw]) OR "ResearchKit"[tw] OR "research kit"[tw] OR "sensor kit"[tw] OR "SensorKit"[tw])
```

### Heart Rate Strap

```text
((Heart Rate[mesh] OR “heart rate*”[tw]) AND (strap[tw] OR sensor[tw] OR garmin[tw] OR polar[tw]))
```

### Sports Performance

```text
((athletic performance[mesh] OR sport[tw] OR sports[tw]) AND ("Wearable Electronic Devices"[Mesh] OR "fitness tracker*"[tw] OR wearable*[tw] OR nearable*[tw] OR garmin[tw] OR "foot pod*"[tw] OR garmin[tw] OR polar[tw] OR stryd[tw] OR "power meter*"[tw]))
```

### Thermometer

```text
(("thermometers"[Mesh] OR thermometer*[tw] OR temperature[mesh] OR temperature[tw]) AND ("Wearable Electronic Devices"[Mesh] OR wearable[tw] OR nearable[tw] OR withings[tw] OR temptraq[tw]))
```

## Domain Search strategies (PubMed Search column)

Note on page: "Note: We'll be adding additional domains. Check back for updates."

### Cardiovascular

```text
("cardiovascular agents"[mesh] OR "cardiovascular diseases"[mesh] OR Cardiovascular[tw] OR cardiac[tw] OR "heart rate*"[tw] OR electrocardiography[mesh] OR Electrocardiogram*[tw] OR arrhythmia*[tw] OR tachycardia[tw] OR ECG[tw] OR EKG[tw])
```

### Physical Activity

```text
(exercise[mesh] OR exercise[tw] OR running[tw] OR walking[tw] OR swimming[tw] OR climb*[tw] OR "activ* time"[tw] OR "step count"[tw] OR ("heart rate"[tw] AND zone[tw] ) OR wheelchairs[mesh] OR (wheelchair*[tw] AND (propulsion[tw] OR push*)) or gait[tw] OR "time sitting"[tw] OR "time standing"[tw] OR "time walking"[tw] OR (stair*[tw] AND climb*[tw]) OR "rest time"[tw])
```

### Sleep

```text
(Sleep[mesh] OR "Sleep Wake Disorders"[Mesh] OR wakefulness[mesh] OR sleep*[tw] OR apnea[tw] OR insomnia[tw] OR wakeful*[tw] OR wake[tw] OR "time in bed"[tw] OR nap[tw] OR naps[tw])
```

## Search notes (PubMed part, verbatim)

*Search notes:

PubMed:

[MeSH]=  Medical Subject Headings, PubMed’s indexing.

[TW] = Text Words, which searches the title, abstract, and author keywords plus MeSH terms, publication types, and other indexed fields (use [TIAB] instead to search only the title, abstract, and author keywords).

## Instructions for Combining Search strategies (verbatim)

Instructions for Combining Search strategies - Sample Searches

The search strategies below are designed to be combined.  Choose the BASIC AND BROAD MOBILE HEALTH TECHNOLOGIES SEARCH or a DEVICE TYPE SEARCH, and combine it with a DOMAIN SEARCH.

Below are some sample search constructions.

Example 1:

I am looking for studies that use smart rings for sleep.

Step 1:

Construct the search by copying the Smart Ring strategy and Sleep strategy and combine with:  AND

```text
("Smart ring*"[tw] OR "smartring*"[tw] OR "smart-ring*"[tw] OR oura[tw] OR samsung[tw] OR "galaxy ring*"[tw] OR xiaomi[tw]) AND (Sleep[mesh] OR "Sleep Wake Disorders"[Mesh] OR wakefulness[mesh] OR sleep*[tw] OR apnea[tw] OR insomnia[tw] OR wakeful*[tw] OR wake[tw] OR "time in bed"[tw] OR nap[tw] OR naps[tw])
```

Step 2:

Copy and paste the search into the PubMed search box.

Example 2:

I am interested in seeing how mobile health technologies are used in the cardiovascular domain. I don’t have a specific device in mind.

Step 1:

Construct the search by copying the BASIC AND BROAD MOBILE HEALTH TECHNOLOGIES  strategy and CARDIOVASCULAR DOMAIN strategy and combining with:  AND

```text
(Wearable Electronic Devices[Mesh] OR wearable*[tw] OR nearable*[tw] OR "fitness tracker*"[tw] OR “ambulatory monit*”[tw] OR "mobile data"[tw] OR "mobile technol*"[tw] OR "mobile health technol*"[tw]) AND ("cardiovascular agents"[mesh] OR "cardiovascular diseases"[mesh] OR Cardiovascular[tw] OR cardiac[tw] OR "heart rate*"[tw] OR electrocardiography[mesh] OR Electrocardiogram*[tw] OR arrhythmia*[tw] OR tachycardia[tw] OR ECG[tw] OR EKG[tw])
```

Step 2:

Copy and paste the search into the PubMed search box.

Example 3 on the page uses the Dimensions column only and is omitted here.

## Additional Use Cases (PubMed-relevant rows, verbatim)

- Broad searches to help me gain an overview of a topic
- Conduct your search in PubMed and then filter your results to REVIEW articles
- I need to focus my searches!  The results in PubMed are too broad.
- Replace the search field [tw] with [ti].
- Instead of searching the title, abstract and author supplied keywords, it will search for the terms in the TITLE field.

- I am looking for University of Michigan researchers, and I don't care if they are currently here or not
- Conduct your search in PubMed and add an affiliation search to the end of your search. You can do this by adding the following to the end of your search strategy:
- AND "university of michigan"[Affiliation]
