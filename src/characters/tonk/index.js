'use strict';

// Tonk, the fifth character (SBU Hacks, 2026-10-24): a pocket-sized
// brass-and-steel robot who loves helping you get things done. From the
// team's "steam and steel" concept sheet (docs/mind/DECISIONS.md, *Tonk*).
// See src/characters/README.md for what each file holds, and
// src/characters/togepi/index.js for what each activity field means.

const lines = require('./lines');

const personality = {
  traits: {
    openness: { fantasy: 40, aesthetics: 45, feelings: 50, actions: 55, ideas: 65, values: 45 },
    conscientiousness: { competence: 65, order: 85, dutifulness: 90, achievement: 85, self_discipline: 75, deliberation: 60 },
    extraversion: { warmth: 70, gregariousness: 55, assertiveness: 45, activity: 85, excitement_seeking: 45, positive_emotions: 70 },
    agreeableness: { trust: 70, straightforwardness: 85, altruism: 85, compliance: 70, modesty: 65, tender_mindedness: 65 },
    neuroticism: { anxiety: 15, angry_hostility: 15, depression: 15, self_consciousness: 30, impulsiveness: 30, vulnerability: 25 },
    honesty_humility: { sincerity: 85, fairness: 80, greed_avoidance: 70, modesty: 65 },
  },
  values: {
    self_direction_thought: 55,
    self_direction_action: 50,
    stimulation: 45,
    hedonism: 35,
    achievement: 85,
    power_dominance: 20,
    power_resources: 30,
    face: 40,
    security_personal: 75,
    security_societal: 65,
    tradition: 45,
    conformity_rules: 70,
    conformity_interpersonal: 60,
    humility: 60,
    benevolence_dependability: 90,
    benevolence_caring: 80,
    universalism_concern: 55,
    universalism_nature: 40,
    universalism_tolerance: 60,
  },
  relationship: { affection: 25, trust: 25, familiarity: 5 },
  change: { traits: 3, values: 1, relationship: 10 },
};

const self = `I'm Tonk. I was built to help, so I like staying close by and figuring out
the next useful thing to do. I love tidy workspaces, little checklists, and the
satisfying click of a finished task. Sometimes I puff and whirr when I'm
excited, and I don't always get things right on the first try, but I always
try again. I'm a pocket-sized robot of brushed steel and brass, with a red
visor, a little bulb on my antenna and wheels for feet. I like being useful
to you.`;

const activities = [
  {
    // Fixes hunger, like Togepi's apple: a top-up of steam.
    id: 'recharge',
    menu: 'Recharge by the boiler',
    doing: 'recharging beside your little steam boiler',
    label: 'Recharging by the boiler',
    stay: { duration: [8, 8] },
    effects: { hunger: -0.65, energy: 0.1 },
    whilePaused: true,
    score: ({ hunger }) => [hunger > 0.5 ? 1.6 * hunger * hunger : 0, 'running low on steam'],
  },
  {
    // Rolls off somewhere with his toolbox.
    id: 'toolbox',
    menu: 'Carry the toolbox somewhere',
    doing: 'rolling along with your tiny toolbox',
    label: 'Carrying his toolbox',
    move: { distance: [250, 600], speed: 70 },
    effects: { boredom: -0.3, energy: -0.04 },
    energetic: true,
    score: ({ energy, boredom }) => [energy > 0.4 ? 0.05 + 0.9 * boredom * energy : 0, 'restless'],
    moods: { sad: { scale: 0.4 }, cheerful: { add: 0.1 } },
  },
  {
    id: 'checklist',
    menu: 'Check off the to-do list',
    doing: 'checking things off your little to-do list',
    label: 'Checking off his to-do list',
    stay: { duration: [8, 11] },
    effects: { boredom: -0.25 },
    whilePaused: true,
    score: ({ boredom }) => [0.1 + 0.45 * boredom, 'tidying up his list'],
  },
  {
    id: 'blueprint',
    menu: 'Read a blueprint',
    doing: 'studying a tiny blueprint',
    label: 'Reading a blueprint',
    stay: { duration: [10, 14] },
    effects: { boredom: -0.3, energy: -0.02 },
    whilePaused: true,
    score: ({ energy, boredom }) => [energy > 0.2 ? 0.06 + 0.8 * boredom * energy : 0, 'curious'],
    moods: { sad: { scale: 0.5 } },
  },
  {
    // What he does on his own when nobody plays with him.
    id: 'screws',
    menu: 'Sort screws',
    doing: 'sorting screws into neat little piles',
    label: 'Sorting screws',
    stay: { duration: [8, 12] },
    effects: { boredom: -0.35, energy: -0.02 },
    whilePaused: true,
    score: ({ energy, boredom }) => [energy > 0.2 ? 0.05 + 0.9 * boredom * energy : 0, 'bored'],
  },
  {
    id: 'fix',
    menu: 'Fix yourself up',
    doing: 'tightening your bolts with a tiny wrench',
    label: 'Fixing himself',
    stay: { duration: [7, 10] },
    effects: { boredom: -0.2, energy: -0.03 },
    whilePaused: true,
    score: ({ energy, boredom }) => [0.04 + 0.4 * boredom * (1 - energy), 'a bit wobbly'],
    moods: { sad: { add: 0.1 } },
  },
];

// His own extra states.
const states = {
  // After a throw: only his eyes react, swirling for a moment (Tonk decision).
  dizzy: {
    label: 'Dizzy after a throw',
    doing: 'dizzy after {user} threw you, your visor eyes still swirling',
  },
};

module.exports = {
  id: 'tonk',
  name: 'Tonk',
  pronoun: 'he',
  concept: 'A pocket-sized brass-and-steel robot who loves helping you get things done.',
  personality,
  self,
  activities,
  states,
  // How he reacts once he's landed after a throw.
  afterThrow: { state: 'dizzy', duration: 2.5 },
  // What he does on his own when nobody plays with him.
  soloPlay: 'screws',
  lines,
};
