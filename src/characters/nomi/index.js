'use strict';

// Nomi, the fourth character (Phase 9, step 4): a little floating dream
// cloud who turns ordinary things into tiny dreams. Designed by Sushant
// (concept sheet, 2026-10-24); her look, poses, activities and answers are in
// docs/mind/DECISIONS.md. See src/characters/README.md for what each file
// holds, and src/characters/togepi/index.js for what each activity field
// means. New with Nomi:
//   activity `fly` ({ speed, climb }): spends its `stay` time up near the top
//            of the screen, drifting about, then floats back down
//   activity `tap` ({ effects, then }): what a pat does during it
//   `float` ({ gravity, drag, returning }): falls gently; a good throw
//            carries her off the screen, then she floats back (`returning`
//            names her own state for that, with `returning: true`)
//   `neverAngry`, `fetchPop` ({ chance, event }), `soloVariant` (the
//            variant of `soloPlay` she uses on her own)

const lines = require('./lines');

const personality = {
  traits: {
    openness: { fantasy: 95, aesthetics: 85, feelings: 90, actions: 60, ideas: 75, values: 70 },
    conscientiousness: { competence: 45, order: 30, dutifulness: 55, achievement: 25, self_discipline: 35, deliberation: 45 },
    extraversion: { warmth: 85, gregariousness: 50, assertiveness: 25, activity: 45, excitement_seeking: 35, positive_emotions: 70 },
    agreeableness: { trust: 80, straightforwardness: 70, altruism: 85, compliance: 70, modesty: 70, tender_mindedness: 95 },
    neuroticism: { anxiety: 35, angry_hostility: 5, depression: 30, self_consciousness: 35, impulsiveness: 45, vulnerability: 40 },
    honesty_humility: { sincerity: 85, fairness: 80, greed_avoidance: 85, modesty: 70 },
  },
  values: {
    self_direction_thought: 75,
    self_direction_action: 60,
    stimulation: 45,
    hedonism: 55,
    achievement: 15,
    power_dominance: 5,
    power_resources: 10,
    face: 20,
    security_personal: 45,
    security_societal: 40,
    tradition: 35,
    conformity_rules: 30,
    conformity_interpersonal: 55,
    humility: 70,
    benevolence_dependability: 80,
    benevolence_caring: 95,
    universalism_concern: 80,
    universalism_nature: 75,
    universalism_tolerance: 90,
  },
  relationship: { affection: 25, trust: 25, familiarity: 5 },
  change: { traits: 3, values: 1, relationship: 10 },
};

const self = `I'm Nomi. I live somewhere between a thought and a dream. I like listening
to people, collecting little moments, and turning ordinary things into
stories. Sometimes I'm quiet because I'm thinking. Sometimes I get distracted
by an idea and float away. I don't need you to be happy all the time. Sad
days, tired days, confusing days... they're all part of being you. I'll just
stay nearby. My humour is soft and a little whimsical.`;

/** Night, for moon watching: 6 pm to 5 am (Sushant, 2026-10-24). */
function isNight(hour) {
  return hour >= 18 || hour < 5;
}

const activities = [
  {
    // Fixes hunger, like Togepi's apple.
    id: 'stars',
    menu: 'Catch stars',
    doing: 'catching little falling stars and putting them in your jar',
    label: 'Catching stars',
    stay: { duration: [10, 13] },
    effects: { hunger: -0.65, energy: 0.05 },
    whilePaused: true,
    score: ({ hunger }) => [hunger > 0.5 ? 1.6 * hunger * hunger : 0, 'hungry'],
  },
  {
    id: 'bubbles',
    menu: 'Blow dream bubbles',
    doing: 'blowing dream bubbles with tiny dreams inside',
    label: 'Blowing dream bubbles',
    stay: { duration: [12, 17] },
    effects: { boredom: -0.35 },
    // 3 in 10: sillier and sillier dreams (a tree, a frog, a frog in a spaceship…).
    variants: [
      { id: 'dreams', chance: 0.7 },
      { id: 'silly', chance: 0.3 },
    ],
    whilePaused: true,
    score: ({ boredom, happy }) => [0.1 + 0.5 * boredom + 0.1 * happy, 'dreaming'],
  },
  {
    // Mostly when she's sad. A pat stops the rain: a rainbow (rainbowAfterRain).
    id: 'rain',
    menu: 'Make rain',
    doing: 'sitting under a tiny rain cloud of your own',
    label: 'Making rain',
    stay: { duration: [8, 12] },
    effects: { boredom: -0.1 },
    whilePaused: true,
    score: ({ happy }) => [happy < 0.35 ? 0.2 + 1.2 * (0.35 - happy) * 3 : 0, 'feeling a little grey'],
    moods: { cheerful: { scale: 0 }, content: { scale: 0.3 } },
  },
  {
    id: 'paint',
    menu: 'Paint a rainbow',
    doing: 'painting a rainbow in the air and walking across it',
    label: 'Painting a rainbow',
    stay: { duration: [12, 15] },
    effects: { boredom: -0.4, energy: -0.04 },
    effort: 1.4,
    score: ({ energy, boredom, happy }) => [energy > 0.35 ? 0.04 + 0.8 * boredom * energy + 0.1 * happy : 0, 'feeling creative'],
    moods: { sad: { scale: 0.3 }, cheerful: { add: 0.1 } },
  },
  {
    id: 'read',
    menu: 'Read a book',
    doing: 'reading a book much bigger than you',
    label: 'Reading a book',
    stay: { duration: [12, 18] },
    effects: { boredom: -0.3 },
    whilePaused: true,
    score: ({ boredom }) => [0.08 + 0.45 * boredom, 'wants a story'],
  },
  {
    // Only at night (6 pm to 5 am).
    id: 'moon',
    night: true,
    menu: 'Watch the moon',
    doing: 'watching the moon through your tiny telescope',
    label: 'Moon watching',
    stay: { duration: [18, 26] },
    effects: { boredom: -0.25, energy: 0.03 },
    whilePaused: true,
    score: ({ happy }, ctx = {}) => [isNight(ctx.hour != null ? ctx.hour : 12) ? 0.25 + 0.3 * happy : 0, 'the moon is out'],
  },
  {
    // Up to the top of the screen, legs tucked in, drifting about like a
    // cloud for 30–60 s, then back down.
    id: 'sky',
    menu: 'Wander the sky',
    doing: 'drifting about at the top of the screen like a cloud',
    label: 'Wandering the sky',
    stay: { duration: [30, 60] },
    fly: { speed: 35, climb: 70 }, // up there instead of on the spot
    effects: { boredom: -0.45, energy: -0.03 },
    energetic: true,
    score: ({ energy, boredom }) => [energy > 0.45 ? 0.03 + 0.7 * boredom * energy : 0, 'restless'],
    moods: { sad: { scale: 0.3 } },
  },
];

// Her own extra states.
const states = {
  // You patted her while it rained: the rain stops and a rainbow appears.
  rainbowAfterRain: {
    label: 'A rainbow after the rain',
    doing: 'smiling under a rainbow after {user} cheered you up',
  },
  // Carried off the screen by a throw: a moment out of sight, then floating back.
  floatingBack: {
    label: 'Floating back after a throw',
    doing: 'floating back after {user} threw you off the screen',
    returning: true,
  },
  // After a throw: dizzy, her cloud a little stormy; she forgives quickly.
  dizzy: {
    label: 'Dizzy and a little stormy',
    doing: 'dizzy and a little stormy after {user} threw you',
  },
};
// A pat while it rains: the rain stops and a rainbow appears (it counts as attention).
const rainTap = { effects: { affection: 0.1 }, then: { state: 'rainbowAfterRain', duration: 3 } };
activities.find((a) => a.id === 'rain').tap = rainTap;

module.exports = {
  id: 'nomi',
  name: 'Nomi',
  pronoun: 'she',
  concept: 'A little floating dream cloud who turns ordinary things into tiny dreams.',
  personality,
  self,
  activities,
  states,
  // She floats: falls gently, and a good throw carries her off the screen.
  float: { gravity: 0.3, drag: 3, returning: 'floatingBack' },
  afterThrow: { state: 'dizzy', duration: 3 },
  // However often you throw her.
  neverAngry: true,
  // Her dream bubble (the fetch toy) sometimes pops.
  fetchPop: { chance: 0.2, event: 'bubblePop' },
  // What she does on her own when nobody plays with her: silly bubbles.
  soloPlay: 'bubbles',
  soloVariant: 'silly',
  isNight,
  lines,
};
