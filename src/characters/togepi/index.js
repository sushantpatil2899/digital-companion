'use strict';

// Togepi, the first character: a little egg-shell Pokémon, cheerful and
// impulsive. Everything about him that isn't shared by all characters is in
// this folder (see src/characters/README.md):
//   index.js  this file: who he is, his personality and his own activities
//   look.js   how he looks (drawing code, also how his activities look)
//   voice.js  his "toge-priii" chirps
//   lines.js  the fixed texts on his signs and the little floating texts

const lines = require('./lines');

// Togepi as he is in the games and anime (approved 2026-10-20, see
// docs/mind/togepi-personality.md). The relationship starts at "just met".
const personality = {
  traits: {
    openness: { fantasy: 85, aesthetics: 70, feelings: 90, actions: 85, ideas: 35, values: 60 },
    conscientiousness: { competence: 30, order: 15, dutifulness: 30, achievement: 20, self_discipline: 20, deliberation: 15 },
    extraversion: { warmth: 90, gregariousness: 80, assertiveness: 55, activity: 80, excitement_seeking: 80, positive_emotions: 95 },
    agreeableness: { trust: 85, straightforwardness: 75, altruism: 80, compliance: 35, modesty: 45, tender_mindedness: 80 },
    neuroticism: { anxiety: 25, angry_hostility: 30, depression: 15, self_consciousness: 20, impulsiveness: 85, vulnerability: 55 },
    honesty_humility: { sincerity: 85, fairness: 70, greed_avoidance: 50, modesty: 45 },
  },
  values: {
    self_direction_thought: 45,
    self_direction_action: 75,
    stimulation: 90,
    hedonism: 90,
    achievement: 20,
    power_dominance: 20,
    power_resources: 20,
    face: 40,
    security_personal: 60,
    security_societal: 25,
    tradition: 20,
    conformity_rules: 15,
    conformity_interpersonal: 40,
    humility: 45,
    benevolence_dependability: 80,
    benevolence_caring: 85,
    universalism_concern: 55,
    universalism_nature: 65,
    universalism_tolerance: 65,
  },
  relationship: { affection: 25, trust: 25, familiarity: 5 },
  // How far each layer may move per weekly reflection (Phase 4).
  change: { traits: 3, values: 1, relationship: 10 },
};

const self = `I'm Togepi! I hatched from an egg and kept the shell. My shell is full of joy,
and I feed on the happy feelings of the people around me. I'm curious, I wander
off, I do things my own way, and I bring good luck to people who are kind.`;

// His own activities, in the order his brain scores them. Each one:
//   menu      its item in the Activities menu
//   doing     what he's doing, in words for his mind ("you are …")
//   label     the brain view's name for it
//   stay      { duration: [min, max] s } he does it on the spot, or
//   move      { distance: [min, max] px or (screenWidth) => [min, max], speed px/s }
//             he walks while doing it
//   effects   one-off changes to his needs when he starts (src/main/brain.js)
//   effort    how hard it works him (multiplies energy drain; default 1)
//   energetic damped at night and on low battery
//   whilePaused  allowed while "Stay put" is on
//   score     (needs, context) => [appeal, why] from { energy, hunger, boredom, happy }
//             and the context (e.g. context.music)
//   moods     extra changes to its appeal by mood band:
//             { scale: f or (needs) => f } or { add: n }
//   variants  ways it can turn out, picked at random when it starts:
//             [{ id, chance, effects?, then? }]; `effects` replace the
//             activity's, `then` ({ state, duration }) follows it
//   night     only at night (the character's `isNight(hour)`; greyed out in
//             the menu by day)
// A moving activity's `then` (or its variant's) follows when he arrives.
// A character may also have its own `states` (entered through a variant's
// `then`; { label, doing, tap?, endEvent?, then?, resumeFetch? }), where
// `tap` ({ effects, then }) is what a click on him does in that state,
// `then` ({ state, duration } or { activity }) follows it and `resumeFetch`
// goes back to fetching the toy.
const activities = [
  {
    id: 'eat',
    menu: 'Eat an apple',
    doing: 'eating an apple',
    label: 'Eating an apple',
    stay: { duration: [5, 5] },
    effects: { hunger: -0.65, energy: 0.05 },
    whilePaused: true,
    score: ({ hunger }) => [hunger > 0.5 ? 1.6 * hunger * hunger : 0, 'hungry'],
  },
  {
    id: 'flower',
    menu: 'Smell a flower',
    doing: 'smelling a flower',
    label: 'Smelling a flower',
    stay: { duration: [6, 10] },
    effects: { boredom: -0.15 },
    whilePaused: true,
    score: ({ happy }) => [0.12 + 0.2 * happy, 'smell flowers'],
    moods: { sad: { scale: 0.5 }, cheerful: { add: 0.1 }, grumpy: { scale: 0.5 } },
  },
  {
    id: 'play',
    menu: 'Play with the ball',
    doing: 'playing with your ball',
    label: 'Playing with his ball',
    move: { distance: [120, 320], speed: 95 },
    effects: { boredom: -0.4, energy: -0.04 },
    effort: 3,
    energetic: true,
    score: ({ energy, boredom }) => [energy > 0.3 ? 0.05 + 1.2 * boredom * energy : 0, 'bored'],
    moods: { sad: { scale: ({ boredom }) => (boredom < 0.85 ? 0.3 : 1) } },
  },
  {
    id: 'adventure',
    menu: 'Go on an adventure',
    doing: 'off on an adventure',
    label: 'On an adventure',
    move: { distance: (width) => [width * 0.5, Math.min(width * 0.9, 1600)], speed: 85 },
    effects: { boredom: -0.55, energy: -0.06 },
    effort: 2.5,
    energetic: true,
    score: ({ energy, boredom }) => [energy > 0.5 ? 0.04 + 0.8 * boredom * energy : 0, 'restless'],
    moods: { sad: { scale: 0 } },
  },
];

module.exports = {
  id: 'togepi',
  name: 'Togepi',
  pronoun: 'he',
  concept: 'A little egg-shell Pokémon, full of joy, who wanders off and does things his own way.',
  personality,
  self,
  activities,
  // What he does on his own when nobody plays with him.
  soloPlay: 'play',
  lines,
};
