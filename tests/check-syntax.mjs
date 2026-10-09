// This file is part of Agentprise
// tests/check-syntax.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-09
// Summary: Parses the script inside index.html and fails if it has a syntax
//          error or contains non-ASCII characters outside string literals.
// Notes: See README file for documentation and full license information.
//
// Copyright © 2026 The Regents of the University of Michigan
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License along
// with this program. If not, see <https://www.gnu.org/licenses/>.

import vm from "node:vm";
import { readEngineSource } from "./load-engine.mjs";

const source = readEngineSource();

// ### Syntax check ###
try {
  new vm.Script(source, { filename: "index.html" });
} catch (error) {
  console.error("Syntax error in index.html script: " + error.message);
  process.exit(1);
}

// ### ASCII check ###
// The project keeps code and comments ASCII only. Visible interface text lives in
// the HTML, not the script, so any non-ASCII byte in the script is a defect.
const lines = source.split("\n");
let nonAscii = 0;
lines.forEach((line, index) => {
  const match = line.match(/[^\x00-\x7F]/);
  if (match) {
    nonAscii += 1;
    console.error("Non-ASCII character on script line " + (index + 1) + ": " + line.trim().slice(0, 80));
  }
});
if (nonAscii > 0) {
  process.exit(1);
}
console.log("index.html script: syntax OK, ASCII only");
