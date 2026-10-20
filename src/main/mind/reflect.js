'use strict';

// Togepi's weekly reflection (Phase 4): the language model reads the week's
// diary, what he learned about Sushant and what they did together, and
// proposes a few small personality changes with a reason each, plus a few
// insights about Sushant. growth.js clamps and applies them.
// No Electron imports, so it can be unit tested.

const P = require('./personality');
const T = require('./thinker');
const { dayString, dayStart } = require('./memory');
const { GROWTH } = require('./growth');

const DAY = 24 * 3600 * 1000;

function schema() {
  const paths = P.sliders()
    .map(([p]) => p)
    .filter((p) => !p.startsWith('relationship.'));
  return {
    type: 'object',
    properties: {
      changes: {
        type: 'array',
        maxItems: GROWTH.maxChanges,
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', enum: paths },
            delta: { type: 'integer', minimum: -GROWTH.stepCap.traits, maximum: GROWTH.stepCap.traits },
            reason: { type: 'string', maxLength: 100 },
          },
          required: ['path', 'delta', 'reason'],
        },
      },
      insights: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 100 } },
    },
    required: ['changes', 'insights'],
  };
}

/** The week's diary days (the last 7 days up to `now`): [{ day, lines }]. */
function weekDiary(memory, now) {
  const from = dayString(now - 7 * DAY);
  return Object.keys(memory.journal)
    .filter((d) => d > from && d <= dayString(now))
    .sort()
    .map((day) => ({ day, lines: memory.journal[day].lines.map((l) => l.text) }));
}

function userPrompt(personality, diary, memory, together) {
  const scores = P.sliders()
    .filter(([p]) => !p.startsWith('relationship.'))
    .map(([p, label]) => `${p} (${label}) = ${P.getPath(personality, p)}`);
  return [
    "It's the end of the week. Look back on it and notice how it changed you, a little.",
    '',
    'Your diary this week:',
    ...diary.map((d) => `- ${d.day}: ${d.lines.join(' ')}`),
    '',
    together ? `You and Sushant this week: ${together}` : '',
    memory.facts.length ? `What you know about Sushant:\n${memory.facts.slice(-15).map((f) => `- ${f.text}`).join('\n')}` : '',
    '',
    'Your personality now (0-100, 50 = average):',
    ...scores,
    '',
    'Answer in JSON:',
    `- changes: 0 to ${GROWTH.maxChanges} small changes this week's experiences really explain, each with a short reason. Traits by -${GROWTH.stepCap.traits}..${GROWTH.stepCap.traits}, values (paths starting with "values.") by -${GROWTH.stepCap.values}..${GROWTH.stepCap.values}. Most weeks only 1-3 changes. Stay Togepi.`,
    '- insights: up to 3 new things you understood about Sushant this week (plain, specific).',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/**
 * Run the reflection. Returns { changes, insights } (unclamped), or null if
 * there isn't enough diary this week or the model gave nothing usable.
 */
async function reflect(engine, personality, memory, { now = Date.now(), together = '' } = {}) {
  const diary = weekDiary(memory, now);
  if (diary.length < GROWTH.minDiaryDays) return null;
  const raw = await engine.think({
    system: `${T.systemPrompt(personality, memory.notes)}\n\nRight now you are quietly reflecting on your week, not talking to Sushant.`,
    user: userPrompt(personality, diary, memory, together),
    schema: schema(),
  });
  let o;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  const changes = (Array.isArray(o.changes) ? o.changes : []).filter((c) => c && typeof c.path === 'string');
  const insights = (Array.isArray(o.insights) ? o.insights : []).filter((s) => typeof s === 'string' && s.trim() && !/@|https?:/.test(s)).map((s) => s.trim());
  return { changes, insights };
}

module.exports = { reflect, weekDiary, schema, dayStart };
