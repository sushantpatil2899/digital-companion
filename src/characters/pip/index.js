'use strict';

// Pip, the second character (Phase 9, step 2): a tiny clockwork bird who
// thinks he's much smarter than everyone else. Designed by Sushant (concept
// sheet, 2026-10-24); his look, poses, activities, "Who I am" and sliders
// were approved by him (docs/mind/DECISIONS.md). See src/characters/README.md
// for what each file holds, and src/characters/togepi/index.js for what each
// activity field means.

const lines = require('./lines');

const personality = {
  traits: {
    openness: { fantasy: 55, aesthetics: 50, feelings: 40, actions: 75, ideas: 95, values: 60 },
    conscientiousness: { competence: 80, order: 55, dutifulness: 45, achievement: 70, self_discipline: 50, deliberation: 55 },
    extraversion: { warmth: 55, gregariousness: 50, assertiveness: 80, activity: 70, excitement_seeking: 55, positive_emotions: 60 },
    agreeableness: { trust: 50, straightforwardness: 75, altruism: 60, compliance: 30, modesty: 15, tender_mindedness: 45 },
    neuroticism: { anxiety: 20, angry_hostility: 35, depression: 15, self_consciousness: 10, impulsiveness: 50, vulnerability: 25 },
    honesty_humility: { sincerity: 70, fairness: 70, greed_avoidance: 45, modesty: 15 },
  },
  values: {
    self_direction_thought: 95,
    self_direction_action: 85,
    stimulation: 70,
    hedonism: 45,
    achievement: 75,
    power_dominance: 40,
    power_resources: 45,
    face: 60,
    security_personal: 40,
    security_societal: 35,
    tradition: 20,
    conformity_rules: 30,
    conformity_interpersonal: 35,
    humility: 20,
    benevolence_dependability: 65,
    benevolence_caring: 55,
    universalism_concern: 50,
    universalism_nature: 45,
    universalism_tolerance: 60,
  },
  relationship: { affection: 25, trust: 25, familiarity: 5 },
  change: { traits: 3, values: 1, relationship: 10 },
};

const self = `I'm Pip. I'm a highly sophisticated autonomous companion with absolutely no
reason to explain why I just walked into that wall. I like figuring things out,
watching what you're doing, and occasionally offering extremely valuable advice
that you didn't ask for. I collect interesting facts, remember patterns, and
enjoy being right. I also enjoy being wrong, although considerably less. I run
on a wind-up key I can't quite reach, which I consider a design flaw, not a
personal one. My humour is dry and a little smug.`;

const activities = [
  {
    // Fixes hunger, like Togepi's apple.
    id: 'wind',
    menu: 'Wind yourself up',
    doing: 'trying to reach the wind-up key on your head',
    label: 'Winding himself up',
    stay: { duration: [8, 8] },
    effects: { hunger: -0.65, energy: 0.05 },
    // Sometimes he can't reach it and waits for you to wind him (windAsk).
    variants: [
      { id: 'gotIt', chance: 0.6 },
      { id: 'gaveUp', chance: 0.4, effects: {}, then: { state: 'windAsk', duration: 20 } },
    ],
    whilePaused: true,
    score: ({ hunger }) => [hunger > 0.5 ? 1.6 * hunger * hunger : 0, 'running down'],
  },
  {
    id: 'investigate',
    menu: 'Investigate something',
    doing: 'investigating something with your magnifying glass',
    label: 'Investigating',
    stay: { duration: [8, 12] },
    effects: { boredom: -0.3, energy: -0.02 },
    score: ({ energy, boredom }) => [energy > 0.3 ? 0.08 + 0.9 * boredom * energy : 0, 'curious'],
    moods: { sad: { scale: 0.5 }, cheerful: { add: 0.1 } },
  },
  {
    id: 'newspaper',
    menu: 'Read the newspaper',
    doing: 'reading your tiny newspaper',
    label: 'Reading the newspaper',
    stay: { duration: [10, 14] },
    effects: { boredom: -0.25 },
    whilePaused: true,
    score: ({ boredom }) => [0.1 + 0.45 * boredom, 'catching up on the news'],
  },
  {
    id: 'cube',
    menu: 'Solve the puzzle cube',
    doing: 'solving your puzzle cube',
    label: 'Solving his puzzle cube',
    stay: { duration: [7, 10] },
    effects: { boredom: -0.35, energy: -0.02 },
    whilePaused: true,
    score: ({ energy, boredom }) => [energy > 0.2 ? 0.05 + 0.9 * boredom * energy : 0, 'bored'],
    moods: { sad: { scale: 0.5 } },
  },
  {
    id: 'build',
    menu: 'Build something',
    doing: 'building a little contraption',
    label: 'Building something',
    stay: { duration: [10, 14] },
    effects: { boredom: -0.45, energy: -0.05 },
    effort: 1.6,
    energetic: true,
    variants: [
      { id: 'works', chance: 0.6 },
      { id: 'smoke', chance: 0.4 },
    ],
    score: ({ energy, boredom }) => [energy > 0.4 ? 0.04 + 1.0 * boredom * energy : 0, 'restless'],
    moods: { sad: { scale: 0 }, cheerful: { add: 0.1 } },
  },
  {
    // Only while you're playing music (context.music; checked only for
    // characters with an activity that `needs` it).
    id: 'conduct',
    needs: 'music',
    menu: 'Conduct the music',
    doing: 'conducting the music {user} is playing',
    label: 'Conducting your music',
    stay: { duration: [12, 18] },
    effects: { boredom: -0.2 },
    whilePaused: true,
    score: ({ happy }, ctx = {}) => [ctx.music ? 0.5 + 0.5 * happy : 0, `${ctx.music || 'music'} is playing`],
    moods: { sad: { scale: 0.5 }, grumpy: { scale: 0.3 } },
  },
];

// His own extra states.
const states = {
  // After being thrown: he checks himself, checks his key, then: "That was unnecessary."
  checkSelf: {
    label: 'Checking himself after a throw',
    doing: 'checking yourself for damage after {user} threw you',
    endEvent: 'unnecessary',
  },
  // Gave up reaching his key: pointing at it, waiting for you. A click winds him.
  windAsk: {
    label: 'Waiting for you to wind him',
    doing: 'pointing at your key, waiting for {user} to wind it',
    tap: { effects: { hunger: -0.65, energy: 0.05 }, then: { state: 'happy', duration: 2 } },
  },
};

module.exports = {
  id: 'pip',
  name: 'Pip',
  pronoun: 'he',
  concept: 'A clever little clockwork bird who thinks he’s much smarter than everyone else.',
  personality,
  self,
  activities,
  states,
  // How he reacts once he's landed after a throw.
  afterThrow: { state: 'checkSelf', duration: 3 },
  // What he does on his own when nobody plays with him.
  soloPlay: 'cube',
  lines,
};
