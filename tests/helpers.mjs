// This file is part of Agentprise
// tests/helpers.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-09
// Last Modified: 2026-10-10
// Summary: Builders for synthetic test data: a valid PNG of any size, a deflated
//          ZIP archive, document and program byte shapes, and a sample agent
//          with every field filled.
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

import zlib from "node:zlib";

const encoder = new TextEncoder();

/** CRC-32 as PNG and ZIP define it. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = encoder.encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  view.setUint32(8 + data.length, crc32(crcInput), false);
  return out;
}

/**
 * Builds a valid opaque RGBA PNG of the given size filled with one color.
 * @returns {Uint8Array}
 */
export function makePng(width, height, rgba = [0, 39, 76, 255]) {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, width, false);
  iv.setUint32(4, height, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      raw.set(rgba, row + 1 + x * 4);
    }
  }
  const idat = new Uint8Array(zlib.deflateSync(raw));
  const parts = [signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

/**
 * Builds a ZIP archive whose entries use the deflate method, the way vendor
 * exports do. Names are stored as given, including unsafe ones, so tests can
 * craft hostile archives.
 * @param {Array<{name: string, bytes: Uint8Array}>} entries
 * @returns {Uint8Array}
 */
export function makeDeflatedZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = entry.bytes;
    const packed = new Uint8Array(zlib.deflateRawSync(data));
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, packed.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, packed);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, packed.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + packed.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let cursor = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

/** A minimal Office Open XML shape: a deflated ZIP holding the part every Office file has. */
export function makeOfficeZip() {
  return makeDeflatedZip([{ name: "[Content_Types].xml", bytes: encoder.encode("<Types/>") }, { name: "word/document.xml", bytes: encoder.encode("<w:document/>") }]);
}

/** The first bytes of the kinds of file the app refuses or accepts by content, each padded to a few bytes. */
export const BYTE_SHAPES = Object.freeze({
  windows: new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]),
  elf: new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]),
  machO32: new Uint8Array([0xfe, 0xed, 0xfa, 0xce, 0x00, 0x00]),
  machO64: new Uint8Array([0xfe, 0xed, 0xfa, 0xcf, 0x00, 0x00]),
  machO32Swapped: new Uint8Array([0xce, 0xfa, 0xed, 0xfe, 0x00, 0x00]),
  machO64Swapped: new Uint8Array([0xcf, 0xfa, 0xed, 0xfe, 0x00, 0x00]),
  javaOrFat: new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00]),
  ole: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]),
  pdf: encoder.encode("%PDF-1.7\n1 0 obj\n"),
  pdfWithPrefix: new Uint8Array([...encoder.encode("junk before the header "), ...encoder.encode("%PDF-1.4\n")]),
  utf16Text: new Uint8Array([0xff, 0xfe, 0x68, 0x00, 0x69, 0x00]),
  textWithNul: new Uint8Array([0x68, 0x69, 0x00, 0x68, 0x69]),
  utf8WithBom: new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]),
});

/** Returns the byte offset of the first central directory record. */
export function findCentralDirectory(zipBytes) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  for (let i = zipBytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      return view.getUint32(i + 16, true);
    }
  }
  throw new Error("no end record");
}

/**
 * A synthetic agent with every field filled, modeled on the Caveman demo but
 * with example.com links and a tiny generated icon.
 */
export function sampleAgent(engine) {
  const agent = engine.createAgent();
  agent.name = "Caveman";
  agent.description = "Me agent, answer questions, big brain.";
  agent.welcome = "Me agent, answer questions, big brain.";
  agent.instructions = "# Purpose\nAnswer questions while speaking like a friendly, capable caveman.\n\n# Style\n- Short sentences.\n- Drop articles: \"Me help you.\"\n\nNever reduce accuracy.";
  agent.starters = ["Caveman, what can you do?", "Tell me more about...", "What's new today?"];
  agent.icon = { bytes: makePng(192, 192), mime: "image/png" };
  agent.sharepointLinks = ["https://example.sharepoint.com/sites/demo", "https://example.sharepoint.com/sites/demo/Shared%20Documents/guide.docx"];
  // One item by ID and one by URL, shaped the way the SharePoint builder writes them, with made-up ids.
  agent.sharepointItems = [
    { by: "id", url: "https://example-my.sharepoint.com/personal/someone/Documents/plan.docx", name: "plan.docx", site_id: "11111111-1111-4111-8111-111111111111", web_id: "22222222-2222-4222-8222-222222222222", list_id: "33333333-3333-4333-8333-333333333333", unique_id: "44444444-4444-4444-8444-444444444444", type: "File" },
    { by: "url", url: "https://example.sharepoint.com/sites/team", name: "Team site", site_id: "55555555-5555-4555-8555-555555555555", web_id: "66666666-6666-4666-8666-666666666666", list_id: "00000000-0000-0000-0000-000000000000", unique_id: "00000000-0000-0000-0000-000000000000", type: "Site" },
  ];
  agent.files = [{ name: "notes.txt", bytes: new TextEncoder().encode("Lab notes for the demo.") }];
  agent.copilot = {
    webSearch: true,
    webSites: ["https://example.org", "https://example.net/docs/guide"],
    teamsMessages: false,
    email: true,
    meetings: true,
    codeInterpreter: false,
    imageGeneration: true,
    preferMyFiles: true,
    appId: "",
  };
  agent.creator = {
    name: "Example Creator",
    website: "https://example.org",
    privacy: "https://example.org/privacy",
    terms: "https://example.org/terms",
  };
  agent.copyright = "Copyright (C) 2026 Example Creator";
  agent.license = "GPL-3.0-or-later";
  return agent;
}

/** Deep comparison helper that treats icons by byte content. */
export function agentFields(agent) {
  return {
    ...agent,
    icon: agent.icon ? Array.from(agent.icon.bytes) : null,
    files: agent.files.map((file) => ({ name: file.name, bytes: Array.from(file.bytes) })),
  };
}
