'use strict';

// Who's who in his prompts (Phase 9): your name and pronouns, settings asked
// on first run ("What should I call you?", he/him, she/her or they/them),
// and the active character's name. Set by src/main/main.js at startup and
// when they change. Fixed texts write {user}, {they}, {them}, {their} and
// {character} for them (see fill()).

const PRONOUNS = {
  he: { they: 'he', them: 'him', their: 'his', themselves: 'himself', plural: false },
  she: { they: 'she', them: 'her', their: 'her', themselves: 'herself', plural: false },
  they: { they: 'they', them: 'them', their: 'their', themselves: 'themselves', plural: true },
};

let userName = 'Friend';
let pronouns = PRONOUNS.they;
let characterName = 'Togepi';

/** Set any of them (missing, blank or unknown ones stay as they are). */
function setNames({ user, pronoun, character } = {}) {
  if (typeof user === 'string' && user.trim()) userName = user.trim().slice(0, 40);
  if (PRONOUNS[pronoun]) pronouns = PRONOUNS[pronoun];
  if (typeof character === 'string' && character.trim()) characterName = character.trim();
}

const user = () => userName;
const character = () => characterName;
// Your pronouns: he / she / they, him / her / them, his / her / their, himself…
const they = () => pronouns.they;
const them = () => pronouns.them;
const their = () => pronouns.their;
const themselves = () => pronouns.themselves;
/** The verb form that goes with your pronoun: v('is', 'are'), v('uses', 'use'). */
const v = (singular, plural) => (pronouns.plural ? plural : singular);
/** `s` with a capital first letter. */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** `text` with {user}, {they}, {them}, {their} and {character} filled in. */
function fill(text) {
  return String(text)
    .replace(/\{user\}/g, userName)
    .replace(/\{they\}/g, pronouns.they)
    .replace(/\{them\}/g, pronouns.them)
    .replace(/\{their\}/g, pronouns.their)
    .replace(/\{character\}/g, characterName);
}

module.exports = { PRONOUNS, setNames, user, character, they, them, their, themselves, v, cap, fill };
