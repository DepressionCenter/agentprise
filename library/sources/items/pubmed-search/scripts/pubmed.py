# This file is part of Agentprise
# pubmed-search/scripts/pubmed.py
# Author(s): Gabriel Mongefranco.
# Created: 2026-10-10
# Last Modified: 2026-10-10
# Summary: Command-line helper that searches PubMed and fetches summaries and
#          abstracts through the NCBI E-utilities API, printing one JSON object.
# Notes: See README file for documentation and full license information.
#
# Copyright © 2026 The Regents of the University of Michigan
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along
# with this program. If not, see <https://www.gnu.org/licenses/>.

"""Search PubMed and fetch summaries and abstracts through NCBI E-utilities.

Usage:
    python3 pubmed.py search --query '<PubMed query>' [--retmax 20] [--sort relevance]
    python3 pubmed.py summary --ids 12345678,23456789
    python3 pubmed.py abstract --ids 12345678,23456789

Environment:
    NCBI_EMAIL    Required. Contact address of whoever deploys this skill (not each
                  end user), sent with every request as NCBI's usage policy asks.
    NCBI_API_KEY  Optional. An NCBI API key, which raises the rate limit.

Output:
    Exactly one JSON object on stdout. Errors go to stderr with a non-zero exit code.

Side effects:
    Network requests to eutils.ncbi.nlm.nih.gov only. No caching and no files written.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

### Configuration ###

BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
TOOL_NAME = "agentprise-pubmed-search"
DATABASE = "pubmed"
DEFAULT_RETMAX = 20
MAX_RETMAX = 100  # Skill policy, well under NCBI's own 10,000-record ceiling
MAX_IDS_PER_CALL = 20  # Skill policy; NCBI asks for POST only above about 200 ids
MIN_SECONDS_BETWEEN_CALLS = 0.35  # NCBI allows 3 requests per second without a key
TIMEOUT_SECONDS = 30
SORT_CHOICES = ("relevance", "pub_date", "Author", "JournalName")

EXIT_USAGE = 2
EXIT_CONFIG = 3
EXIT_NETWORK = 4
EXIT_RESPONSE = 5

_last_call_time = 0.0


class PubMedError(Exception):
    """A failure the user can act on, with the exit code to return."""

    def __init__(self, message, exit_code):
        super().__init__(message)
        self.exit_code = exit_code


### Validate Inputs ###

def parse_pmids(raw_ids):
    """Split a comma-separated string into a list of PMIDs.

    Args:
        raw_ids: String such as "12345678, 23456789".

    Returns:
        List of PMID strings, in the order given, without duplicates.

    Raises:
        PubMedError: if the list is empty or any id is not all digits.
    """
    pmids = []
    for part in raw_ids.split(","):
        pmid = part.strip()
        if not pmid:
            continue
        if not pmid.isdigit() or not pmid.isascii():
            raise PubMedError("PMIDs must contain digits only; got an invalid value.", EXIT_USAGE)
        if pmid not in pmids:
            pmids.append(pmid)
    if not pmids:
        raise PubMedError("Give at least one PMID with --ids.", EXIT_USAGE)
    return pmids


def read_contact_settings():
    """Read the NCBI contact email and optional API key from the environment.

    Returns:
        Tuple (email, api_key). api_key is None when NCBI_API_KEY is not set.

    Raises:
        PubMedError: if NCBI_EMAIL is missing or contains spaces.
    """
    email = os.environ.get("NCBI_EMAIL", "").strip()
    if not email:
        raise PubMedError(
            "NCBI_EMAIL is not set. Set it to the contact address of whoever deploys "
            "this skill, then try again.",
            EXIT_CONFIG,
        )
    if " " in email or "@" not in email:
        raise PubMedError("NCBI_EMAIL must be one email address with no spaces.", EXIT_CONFIG)
    api_key = os.environ.get("NCBI_API_KEY", "").strip() or None
    return email, api_key


### Retrieve Source Data ###

def call_eutils(endpoint, params):
    """Call one E-utilities endpoint and return the decoded response body.

    Args:
        endpoint: File name such as "esearch.fcgi".
        params: Dict of query parameters, without db, tool, email, or api_key.

    Returns:
        Response body as a str.

    Raises:
        PubMedError: on network failure, HTTP error, or timeout.
    """
    global _last_call_time
    email, api_key = read_contact_settings()
    full_params = {"db": DATABASE, "tool": TOOL_NAME, "email": email}
    full_params.update(params)
    if api_key:
        full_params["api_key"] = api_key

    wait = MIN_SECONDS_BETWEEN_CALLS - (time.monotonic() - _last_call_time)
    if wait > 0:
        time.sleep(wait)

    url = BASE_URL + endpoint + "?" + urllib.parse.urlencode(full_params)
    request = urllib.request.Request(url, headers={"User-Agent": TOOL_NAME})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        # The URL is left out of the message because it carries the email and API key.
        raise PubMedError(f"PubMed returned HTTP {error.code} for {endpoint}.", EXIT_NETWORK)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        reason = getattr(error, "reason", error)
        raise PubMedError(f"Could not reach PubMed ({endpoint}): {reason}", EXIT_NETWORK)
    finally:
        _last_call_time = time.monotonic()
    return body


def call_eutils_json(endpoint, params):
    """Call an endpoint that returns JSON and parse it.

    Raises:
        PubMedError: if the body is not JSON or reports an error.
    """
    body = call_eutils(endpoint, dict(params, retmode="json"))
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise PubMedError(f"PubMed sent a response from {endpoint} that is not JSON.", EXIT_RESPONSE)
    if not isinstance(data, dict):
        raise PubMedError(f"PubMed sent an unexpected response from {endpoint}.", EXIT_RESPONSE)
    if "error" in data:
        # Rate-limit and similar service errors arrive as {"error": "..."}.
        raise PubMedError(f"PubMed reported an error: {data.get('error')}", EXIT_RESPONSE)
    return data


### Transform Records ###

def run_search(query, retmax, sort):
    """Run an ESearch query.

    Returns:
        Dict with query, count (int), ids, querytranslation, warnings, errors, and date (UTC).
    """
    data = call_eutils_json("esearch.fcgi", {"term": query, "retmax": retmax, "sort": sort})
    result = data.get("esearchresult")
    if not isinstance(result, dict):
        raise PubMedError("PubMed's search response had no esearchresult section.", EXIT_RESPONSE)
    if "ERROR" in result:
        raise PubMedError(f"PubMed reported a search error: {result['ERROR']}", EXIT_RESPONSE)
    try:
        count = int(result.get("count", "0"))
    except (TypeError, ValueError):
        raise PubMedError("PubMed's search response had an unreadable count.", EXIT_RESPONSE)
    return {
        "query": query,
        "date": time.strftime("%Y-%m-%d", time.gmtime()),
        "count": count,
        "retmax": retmax,
        "sort": sort,
        "ids": list(result.get("idlist", [])),
        "querytranslation": result.get("querytranslation", ""),
        "warnings": result.get("warninglist", {}),
        "errors": result.get("errorlist", {}),
    }


def simplify_summary(record):
    """Keep the summary fields a person needs to identify an article."""
    article_ids = {item.get("idtype"): item.get("value") for item in record.get("articleids", [])}
    return {
        "pmid": record.get("uid", ""),
        "title": record.get("title", ""),
        "authors": [author.get("name", "") for author in record.get("authors", [])],
        "journal": record.get("source", ""),
        "pubdate": record.get("pubdate", ""),
        "pubtype": record.get("pubtype", []),
        "doi": article_ids.get("doi", ""),
        "pmcid": article_ids.get("pmc", ""),
    }


def run_summary(pmids):
    """Fetch ESummary records in batches of MAX_IDS_PER_CALL.

    Returns:
        Dict with records (list) and missing (PMIDs PubMed could not summarize).
    """
    records, missing = [], []
    for start in range(0, len(pmids), MAX_IDS_PER_CALL):
        batch = pmids[start:start + MAX_IDS_PER_CALL]
        data = call_eutils_json("esummary.fcgi", {"id": ",".join(batch)})
        result = data.get("result", {})
        for pmid in batch:
            record = result.get(pmid)
            if not isinstance(record, dict) or "error" in record:
                missing.append(pmid)
            else:
                records.append(simplify_summary(record))
    return {"records": records, "missing": missing}


def extract_abstracts(xml_text):
    """Parse EFetch PubMed XML into {pmid: abstract text}.

    Structured abstracts keep their section labels, for example "METHODS: ...".
    Records without an abstract are left out of the result.
    """
    # Entity declarations never appear in PubMed XML; refusing them blocks entity-expansion attacks
    # without a third-party parser.
    if "<!ENTITY" in xml_text:
        raise PubMedError("PubMed sent abstract data with unexpected XML entity declarations.", EXIT_RESPONSE)
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        raise PubMedError("PubMed sent abstract data that could not be read as XML.", EXIT_RESPONSE)
    abstracts = {}
    for article in list(root):
        pmid = (article.findtext(".//PMID") or "").strip()
        if not pmid:
            continue
        parts = []
        for abstract in article.iter("Abstract"):
            for section in abstract.iter("AbstractText"):
                text = " ".join("".join(section.itertext()).split())
                if not text:
                    continue
                label = section.get("Label")
                parts.append(f"{label}: {text}" if label else text)
        if parts:
            abstracts[pmid] = "\n".join(parts)
    return abstracts


def run_abstract(pmids):
    """Fetch abstracts with EFetch (XML) in batches of MAX_IDS_PER_CALL.

    Returns:
        Dict with abstracts ({pmid: text}) and missing (PMIDs with no abstract returned).
    """
    abstracts = {}
    for start in range(0, len(pmids), MAX_IDS_PER_CALL):
        batch = pmids[start:start + MAX_IDS_PER_CALL]
        # EFetch has no JSON output for PubMed, so the full XML record (no rettype) is parsed instead.
        body = call_eutils("efetch.fcgi", {"id": ",".join(batch), "retmode": "xml"})
        abstracts.update(extract_abstracts(body))
    ordered = {pmid: abstracts[pmid] for pmid in pmids if pmid in abstracts}
    missing = [pmid for pmid in pmids if pmid not in abstracts]
    return {"abstracts": ordered, "missing": missing}


### Command Line ###

def build_parser():
    """Build the argument parser for the three subcommands."""
    parser = argparse.ArgumentParser(description="Search PubMed through NCBI E-utilities.")
    commands = parser.add_subparsers(dest="command", required=True)

    search = commands.add_parser("search", help="Run a PubMed query and list PMIDs.")
    search.add_argument("--query", required=True, help="PubMed query string.")
    search.add_argument("--retmax", type=int, default=DEFAULT_RETMAX,
                        help=f"Number of PMIDs to return (1-{MAX_RETMAX}, default {DEFAULT_RETMAX}).")
    search.add_argument("--sort", default="relevance", choices=SORT_CHOICES, help="Sort order.")

    summary = commands.add_parser("summary", help="Get title, authors, journal, and date.")
    summary.add_argument("--ids", required=True, help="Comma-separated PMIDs.")

    abstract = commands.add_parser("abstract", help="Get abstract text.")
    abstract.add_argument("--ids", required=True, help="Comma-separated PMIDs.")
    return parser


def main(argv=None):
    """Run one subcommand, print one JSON object, and return the exit code."""
    args = build_parser().parse_args(argv)
    try:
        read_contact_settings()
        if args.command == "search":
            query = args.query.strip()
            if not query:
                raise PubMedError("The query is empty.", EXIT_USAGE)
            if not 1 <= args.retmax <= MAX_RETMAX:
                raise PubMedError(f"--retmax must be between 1 and {MAX_RETMAX}.", EXIT_USAGE)
            output = run_search(query, args.retmax, args.sort)
        elif args.command == "summary":
            output = run_summary(parse_pmids(args.ids))
        else:
            output = run_abstract(parse_pmids(args.ids))
    except PubMedError as error:
        print(f"pubmed.py: {error}", file=sys.stderr)
        return error.exit_code
    # ASCII escapes keep the output valid on consoles whose encoding is not UTF-8.
    json.dump(output, sys.stdout, ensure_ascii=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
