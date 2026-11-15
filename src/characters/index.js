'use strict';

// The characters you can pick (Phase 9, docs/mind/PLAN.md). Each lives in
// its own folder with the same parts; see README.md there.

const CHARACTERS = {
  togepi: require('./togepi'),
  pip: require('./pip'),
  mori: require('./mori'),
  nomi: require('./nomi'),
  tonk: require('./tonk'),
  wolfie: require('./wolfie'),
};

const DEFAULT = 'togepi';

/** Character `id`, or the default one if there's no such character. */
function get(id) {
  return CHARACTERS[id] || CHARACTERS[DEFAULT];
}

/** Every character, in the order they're offered. */
function list() {
  return Object.values(CHARACTERS);
}

/** Character `ch`'s own activity `name`, or null. */
function activity(ch, name) {
  return (ch && ch.activities.find((a) => a.id === name)) || null;
}

module.exports = { get, list, activity, DEFAULT };
