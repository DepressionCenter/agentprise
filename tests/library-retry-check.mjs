// This file is part of Agentprise
// tests/library-retry-check.mjs
// Author(s): [Contributor name].
// Created: 2026-10-30
// Last Modified: 2026-10-30
// Summary: Checks that a failed Library catalog load can be retried, using the
//          real ensureLibrary and renderLibrary source taken from index.html.
// Notes: See README file for documentation and full license information.
//
// Copyright © 2026 The Regents of the University of Michigan
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program. If not, see <https://www.gnu.org/licenses/>.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

// ### Load the Page ###

// An optional path argument checks another copy of the page, such as an older revision.
const pagePath = process.argv[2] ?? fileURLToPath(new URL("../index.html", import.meta.url));
const page = await readFile(pagePath, "utf8");
const failures = [];

function check(condition, passMessage, failMessage) {
    if (condition) {
        console.log("PASS: " + passMessage);
    } else {
        failures.push(failMessage);
        console.log("FAIL: " + failMessage);
    }
}

// ### Check the Markup ###

// The Try again button sits beside the Library status and starts hidden.
check(
    /<button[^>]*id="library-retry"[^>]*hidden[^>]*>\s*Try again\s*<\/button>/.test(page),
    "Library has a hidden Try again button",
    "Library Try again button is missing from index.html"
);

// Clicking the button must be wired to renderLibrary.
check(
    /\$\("library-retry"\)\.addEventListener\("click", function \(\) \{ renderLibrary\(\); \}\);/.test(page),
    "Try again button calls renderLibrary",
    "Try again button click handler is missing"
);

// ### Extract the Loader Source ###

// Runs the page's own loader code with a stubbed catalog fetch, so the test covers the real logic.
const loaderStart = page.indexOf("let libraryLoading = null;");
const loaderEnd = page.indexOf("async function renderLibrary()");
if (loaderStart === -1 || loaderEnd === -1 || loaderEnd <= loaderStart) {
    failures.push("Could not find ensureLibrary in index.html");
    console.log("FAIL: Could not find ensureLibrary in index.html");
} else {
    const loaderSource = page.slice(loaderStart, loaderEnd);
    let catalogRequests = 0;
    let catalogResponses = [null, [{ file: "Example.zip", name: "Example" }]];
    const sandbox = {
        ui: { catalog: [], catalogOk: false },
        loadLibraryEntries: async function () {},
        fetchCatalog: async function () {
            catalogRequests += 1;
            return catalogResponses.shift() ?? null;
        },
        result: null
    };
    runInNewContext(loaderSource + "\nresult = { first: ensureLibrary, again: ensureLibrary };", sandbox);

    // ### Run the Failure and Retry Sequence ###

    await sandbox.result.first();
    const failedOk = sandbox.ui.catalogOk;
    await sandbox.result.again();
    const retriedOk = sandbox.ui.catalogOk;

    check(
        failedOk === false && catalogRequests === 2 && retriedOk === true,
        "a later call after a failed load makes a new request and loads the catalog (requests: " + catalogRequests + ")",
        "a failed catalog load is cached; expected 2 catalog requests and a loaded catalog, got " + catalogRequests + " request(s), loaded=" + retriedOk
    );
}

// ### Report ###

if (failures.length > 0) {
    console.log("Library retry check failed: " + failures.length + " problem(s).");
    process.exitCode = 1;
} else {
    console.log("Library retry check passed.");
}
