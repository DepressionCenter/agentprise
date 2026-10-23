// This file is part of Agentprise
// tests/inspect-tabs.test.mjs
// Author(s): Gabriel Mongefranco.
// Created: 2026-10-23
// Last Modified: 2026-10-23
// Summary: Checks which item Inspect selects when the person moves between
//          download tabs, including the skill the Copilot skill tab picks and
//          the earlier item it gives back when the person leaves that tab, and
//          the names and wording in Microsoft download messages.
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

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadEngine } from "./load-engine.mjs";
import { goldenRaw, teamsIcons } from "./tools-fixture.mjs";

const engine = loadEngine();
await engine.ready;
const { itemForProductTab, skillForCopilotTab } = engine.inspect;

/**
 * The golden assistant, the skill it uses (Record Finder), and a second
 * synthetic skill (Note Taker) that the assistant does not use.
 * @returns {object} normalized project
 */
function threeItems() {
  const raw = goldenRaw();
  const extra = structuredClone(raw.items[1]);
  extra.id = "00000000-0000-4000-8000-0000000000aa";
  extra.name = "Note Taker";
  extra.skillName = "note-taker";
  raw.items.push(extra);
  const project = engine.project.normalize(raw).project;
  const [agent, used, other] = project.items;
  assert.equal(agent.kind, "agent");
  assert.deepEqual(agent.uses, [used.skillName]);
  assert.equal(other.skillName, "note-taker");
  return { project, agent, used, other };
}

/** Opens each tab in order, as arrow keys do, and returns the item each tab shows. */
function walk(project, startId, tabs) {
  let state = { itemId: startId, swap: null };
  return tabs.map((tab) => {
    state = itemForProductTab(project, state.itemId, tab, state.swap);
    return state;
  });
}

describe("Copilot skill tab choice", () => {
  test("prefers a skill the assistant uses that works in Copilot", () => {
    const { project, agent, used } = threeItems();
    assert.equal(skillForCopilotTab(project, agent).id, used.id);
  });

  test("skips a skill marked as not for Copilot when another skill works", () => {
    const { project, agent, used, other } = threeItems();
    used.notFor = ["copilot"];
    assert.equal(skillForCopilotTab(project, agent).id, other.id);
  });

  test("falls back to the first skill when every skill is marked as not for Copilot", () => {
    const { project, agent, used, other } = threeItems();
    used.notFor = ["copilot"];
    other.notFor = ["copilot"];
    // The report then explains why the download is turned off.
    assert.equal(skillForCopilotTab(project, agent).id, used.id);
  });

  test("returns null for a project with no skills", () => {
    const { project, agent } = threeItems();
    project.items = [agent];
    assert.equal(skillForCopilotTab(project, agent), null);
  });
});

describe("Item restore after the Copilot skill tab", () => {
  test("arrow keys across the Copilot skill tab end on the assistant again", () => {
    const { project, agent, used } = threeItems();
    const [onTeams, onSkill, onSkills, onPlugin] = walk(project, agent.id, ["teamsZip", "copilotSkill", "copilotSkills", "microsoftPlugin"]);
    assert.deepEqual(onTeams, { itemId: agent.id, swap: null });
    assert.deepEqual(onSkill, { itemId: used.id, swap: { from: agent.id, to: used.id } });
    assert.deepEqual(onSkills, { itemId: agent.id, swap: null });
    assert.deepEqual(onPlugin, { itemId: agent.id, swap: null });
  });

  test("opening the Copilot skill tab again keeps the earlier item to give back", () => {
    const { project, agent, used } = threeItems();
    const [, again, back] = walk(project, agent.id, ["copilotSkill", "copilotSkill", "backup"]);
    assert.deepEqual(again, { itemId: used.id, swap: { from: agent.id, to: used.id } });
    assert.equal(back.itemId, agent.id);
  });

  test("an item the person chooses on the Copilot skill tab stays selected", () => {
    const { project, agent, other } = threeItems();
    const onSkill = itemForProductTab(project, agent.id, "copilotSkill", null);
    assert.ok(onSkill.swap);
    // Choosing an item under Part of the project clears the swap, as selectItem does.
    const chosen = itemForProductTab(project, other.id, "copilotSkill", null);
    assert.deepEqual(chosen, { itemId: other.id, swap: null });
    assert.deepEqual(itemForProductTab(project, other.id, "copilotSkills", chosen.swap), { itemId: other.id, swap: null });
  });

  test("a different selected item is never replaced by the earlier one", () => {
    const { project, agent, used, other } = threeItems();
    // The swap is still set, but the person now has another skill selected.
    const swap = { from: agent.id, to: used.id };
    assert.deepEqual(itemForProductTab(project, other.id, "teamsZip", swap), { itemId: other.id, swap: null });
  });

  test("a removed earlier item is not given back", () => {
    const { project, agent, used } = threeItems();
    const swap = { from: agent.id, to: used.id };
    project.items = project.items.filter((item) => item.id !== agent.id);
    assert.deepEqual(itemForProductTab(project, used.id, "teamsZip", swap), { itemId: used.id, swap: null });
  });

  test("a skill selected before the Copilot skill tab stays selected after it", () => {
    const { project, other } = threeItems();
    const states = walk(project, other.id, ["copilotSkill", "copilotSkills"]);
    assert.deepEqual(states, [{ itemId: other.id, swap: null }, { itemId: other.id, swap: null }]);
  });
});

describe("Microsoft download messages", () => {
  const notes = (project, exportId) => engine.tools.conversionReport(project, project.items[0], exportId);
  const publisherNote = (project, exportId) => notes(project, exportId).find((entry) => entry.component === "Publisher details");

  test("the publisher note lists one or several missing details in plain words", () => {
    const { project } = threeItems();
    project.creator = { name: "Example Creator", organization: "", url: "https://example.org", privacy: "https://example.org/privacy", terms: "" };
    assert.equal(publisherNote(project, "teamsZip").note, "Agentprise filled in sample text for the terms link. Fill in Publisher details to use your own.");
    project.creator = { name: "Example Creator", organization: "", url: "", privacy: "", terms: "" };
    assert.equal(publisherNote(project, "copilotSkills").note, "Agentprise filled in sample text for the website, privacy link, and terms link. Fill in Publisher details to use your own.");
    project.creator = { name: "Example Creator", organization: "", url: "https://example.org", privacy: "https://example.org/privacy", terms: "https://example.org/terms" };
    assert.equal(publisherNote(project, "microsoftPlugin"), undefined);
  });

  test("notes on the Copilot app with skills tab use that download's name", () => {
    const { project } = threeItems();
    const welcome = notes(project, "copilotSkills").find((entry) => entry.component === "Welcome message");
    assert.equal(welcome.note, "The Copilot app with skills has no place for it.");
    const teams = notes(project, "teamsZip").find((entry) => entry.component === "Welcome message");
    assert.equal(teams.note, "The Copilot app package has no place for it.");
    assert.equal(engine.tools.EXPORTS.copilotSkills.label, "the Copilot app with skills");
  });

  test("a blocked Microsoft download names itself at the start of the error", async () => {
    const { project } = threeItems();
    project.items[1].body = "";
    await assert.rejects(engine.exports.microsoftPackage(project, project.items[0], teamsIcons(), "copilotSkills"), /^Error: The Copilot app with skills can't be made yet\./);
    await assert.rejects(engine.exports.microsoftPackage(project, project.items[0], teamsIcons(), "microsoftPlugin"), /^Error: The Microsoft 365 plugin can't be made yet\./);
  });

  test("a skill upload with an assistant selected points to Part of the project", () => {
    const { project } = threeItems();
    const [entry] = notes(project, "copilotSkill");
    assert.equal(entry.component, "Part of the project");
    assert.match(entry.note, /^Choose a skill under Part of the project\./);
  });
});
