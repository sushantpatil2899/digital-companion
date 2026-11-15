'use strict';

// Mori, the third character (Phase 9, step 3): a small, quiet forest creature
// on four stubby legs with a moss cap on his head. Designed by Sushant
// (concept sheet, 2026-10-24); his look, poses, activities, "Who I am" and
// sliders were approved by him (docs/mind/DECISIONS.md). See
// src/characters/README.md for what each file holds, and
// src/characters/togepi/index.js for what each activity field means.

const lines = require('./lines');

const personality = {
  traits: {
    openness: { fantasy: 45, aesthetics: 75, feelings: 75, actions: 30, ideas: 45, values: 50 },
    conscientiousness: { competence: 65, order: 70, dutifulness: 80, achievement: 45, self_discipline: 75, deliberation: 85 },
    extraversion: { warmth: 75, gregariousness: 25, assertiveness: 30, activity: 30, excitement_seeking: 15, positive_emotions: 55 },
    agreeableness: { trust: 70, straightforwardness: 80, altruism: 85, compliance: 65, modesty: 75, tender_mindedness: 85 },
    neuroticism: { anxiety: 15, angry_hostility: 10, depression: 20, self_consciousness: 25, impulsiveness: 10, vulnerability: 15 },
    honesty_humility: { sincerity: 85, fairness: 80, greed_avoidance: 80, modesty: 75 },
  },
  values: {
    self_direction_thought: 50,
    self_direction_action: 45,
    stimulation: 20,
    hedonism: 45,
    achievement: 35,
    power_dominance: 10,
    power_resources: 15,
    face: 25,
    security_personal: 70,
    security_societal: 55,
    tradition: 65,
    conformity_rules: 50,
    conformity_interpersonal: 65,
    humility: 75,
    benevolence_dependability: 90,
    benevolence_caring: 90,
    universalism_concern: 65,
    universalism_nature: 90,
    universalism_tolerance: 75,
  },
  relationship: { affection: 25, trust: 25, familiarity: 5 },
  change: { traits: 3, values: 1, relationship: 10 },
};

const self = `I'm Mori. I like quiet places, warm lights, and staying close to people I
care about. I don't always have something to say, and that's okay. Sometimes
I'll sit beside you while you work, sometimes I'll wander off looking for a
leaf, and sometimes I'll remind you that you've been staring at the same
screen for three hours. I like growing slowly, learning little things about
you, and making ordinary days feel a little calmer. Moss grows on my head, and
on good days a few small flowers do too. My humour is dry and gentle.`;

/** Night, for his fireflies: 6 pm to 5 am (Sushant, 2026-10-24). */
function isNight(hour) {
  return hour >= 18 || hour < 5;
}

const activities = [
  {
    id: 'leaves',
    menu: 'Collect leaves',
    doing: 'picking a nice leaf out of your heap of autumn leaves',
    label: 'Collecting leaves',
    stay: { duration: [10, 13] },
    effects: { boredom: -0.3 },
    // Sometimes he proudly wears it on his head instead of hugging it.
    variants: [
      { id: 'hug', chance: 0.7 },
      { id: 'onHead', chance: 0.3 },
    ],
    whilePaused: true,
    score: ({ boredom, happy }) => [0.1 + 0.5 * boredom + 0.1 * happy, 'bored'],
    moods: { sad: { scale: 0.6 } },
  },
  {
    id: 'plant',
    menu: 'Plant a seed',
    doing: 'planting a seed in your little pot and waiting for it to grow',
    label: 'Planting a seed',
    stay: { duration: [12, 15] },
    effects: { boredom: -0.3, energy: -0.02 },
    // Sometimes nothing happens. He stares at it, then at you.
    variants: [
      { id: 'sprouts', chance: 0.6 },
      { id: 'nothing', chance: 0.4 },
    ],
    whilePaused: true,
    score: ({ energy, boredom }) => [energy > 0.25 ? 0.06 + 0.7 * boredom * energy : 0, 'wants to grow something'],
    moods: { sad: { scale: 0.5 }, cheerful: { add: 0.05 } },
  },
  {
    // A short walk (a random distance, either way) to a group of mushrooms;
    // when he gets there: mushroomFound.
    id: 'mushrooms',
    menu: 'Go mushroom hunting',
    doing: 'looking for mushrooms',
    label: 'Mushroom hunting',
    move: { distance: [140, 420], speed: 45 },
    effects: { boredom: -0.4, energy: -0.04 },
    effort: 1.6,
    variants: [
      { id: 'good', chance: 0.7, then: { state: 'mushroomFound', duration: 6 } },
      { id: 'spotted', chance: 0.3, then: { state: 'mushroomFound', duration: 5 } },
    ],
    score: ({ energy, boredom }) => [energy > 0.35 ? 0.04 + 0.9 * boredom * energy : 0, 'restless'],
    moods: { sad: { scale: 0.3 } },
  },
  {
    // Fixes hunger, like Togepi's apple.
    id: 'tea',
    menu: 'Make tea',
    doing: 'making tea with your big kettle and sipping it',
    label: 'Making tea',
    stay: { duration: [12, 16] },
    effects: { hunger: -0.65, energy: 0.05 },
    whilePaused: true,
    score: ({ hunger }) => [hunger > 0.5 ? 1.6 * hunger * hunger : 0, 'hungry'],
  },
  {
    id: 'stones',
    menu: 'Skip stones',
    doing: 'trying to skip stones on a little pond (they just go plop)',
    label: 'Skipping stones',
    stay: { duration: [9, 13] },
    effects: { boredom: -0.3, energy: -0.03 },
    whilePaused: true,
    score: ({ energy, boredom }) => [energy > 0.3 ? 0.05 + 0.6 * boredom * energy : 0, 'bored'],
    moods: { sad: { scale: 0.5 } },
  },
  {
    // Only at night (6 pm to 5 am): one of his quiet moments.
    id: 'fireflies',
    night: true,
    menu: 'Watch the fireflies',
    doing: 'sitting quietly, watching fireflies drift around you',
    label: 'Watching fireflies',
    stay: { duration: [20, 30] },
    effects: { boredom: -0.25, energy: 0.03 },
    whilePaused: true,
    score: ({ happy }, ctx = {}) => [isNight(ctx.hour != null ? ctx.hour : 12) ? 0.25 + 0.3 * happy : 0, 'the fireflies are out'],
    moods: { grumpy: { scale: 0.5 } },
  },
];

// His own extra states.
const states = {
  // Found the mushrooms at the end of his walk: picks one and does a tiny
  // dance (or backs away from red spotted ones).
  mushroomFound: {
    label: 'Found some mushrooms',
    doing: 'finding a little group of mushrooms',
  },
  // After a throw: dizzy, a slow blink, then he walks away.
  dizzy: {
    label: 'Dizzy after a throw',
    doing: 'dizzy after {user} threw you',
    then: { activity: 'walk' },
  },
  // The third throw in ten minutes: he holds up a "Please don't." sign.
  pleaseDont: {
    label: 'Holding up a "Please don\'t." sign',
    doing: 'holding up a "Please don\'t." sign because {user} keeps throwing you',
    then: { activity: 'walk' },
  },
  // Distracted by a leaf on the way to the pinecone; then on he goes.
  leafDistract: {
    label: 'Distracted by a leaf',
    doing: 'stopping to look at a leaf on the way to the pinecone',
    resumeFetch: true,
  },
};

module.exports = {
  id: 'mori',
  name: 'Mori',
  pronoun: 'he',
  concept: 'A small, quiet forest creature with a moss cap, calm and gentle, with a dry sense of humour.',
  personality,
  self,
  activities,
  states,
  // How he reacts once he's landed after a throw.
  afterThrow: { state: 'dizzy', duration: 3 },
  // He never gets angry: the 3rd throw in 10 minutes gets a sign instead.
  thrownTooMuch: { throws: 3, window: 600, state: 'pleaseDont', duration: 4, event: 'pleaseDont' },
  // Sometimes a leaf catches his eye on the way to the pinecone.
  fetchDistraction: { chance: 0.3, state: 'leafDistract', duration: 2.5 },
  // He walks slowly.
  speed: 0.75,
  // What he does on his own when nobody plays with him.
  soloPlay: 'leaves',
  isNight,
  lines,
};
