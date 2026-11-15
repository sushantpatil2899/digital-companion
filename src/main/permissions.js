'use strict';

// What macOS actually allows, next to what you switched on (2026-10-24).
// The Brain menu used to tick a switch as soon as you turned it on, even if
// macOS had never allowed it; now a switch that's on but not working says so
// and opens the right page of System Settings. Also: how the app is signed
// (ad hoc builds lose their permissions with every rebuild; see
// scripts/make-signing-cert.sh).

/** The certificate `npm run make-cert` makes once on your Mac (scripts/sign.js uses it). */
const SIGNING_IDENTITY = 'Companion Local Signing';

// System Settings → Privacy & Security pages.
const PANES = {
  screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  calendar: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars',
  apps: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation',
};

/**
 * Switches that are on but don't work, from what you switched on
 * (`settings`), Screen Recording's status (`screen`: granted | denied |
 * not-determined | restricted | unknown) and the problems the app and
 * calendar watchers reported (`notes`). Each: { key, kind, text }.
 */
function permissionProblems({ settings = {}, screen = 'unknown', notes = {} } = {}) {
  const out = [];
  if (settings.watchApps && notes.apps) out.push({ key: 'watchApps', kind: 'apps', text: notes.apps });
  if (settings.readScreen && screen !== 'granted') {
    out.push({
      key: 'readScreen',
      kind: 'screen',
      text: screen === 'not-determined' ? 'macOS hasn’t asked about Screen Recording yet.' : 'macOS hasn’t allowed Screen Recording.',
    });
  }
  if (settings.readCalendar && notes.calendar) out.push({ key: 'readCalendar', kind: 'calendar', text: notes.calendar });
  return out;
}

/**
 * How an app is signed, from `codesign -dv --verbose=2` (it prints to
 * stderr): { kind: 'adhoc' | 'local' | 'developer' | 'unsigned' | 'unknown', name? }.
 */
function parseSigning(output) {
  const text = String(output || '');
  if (/code object is not signed/i.test(text)) return { kind: 'unsigned' };
  if (/Signature=adhoc/i.test(text)) return { kind: 'adhoc' };
  const m = /^Authority=(.+)$/m.exec(text);
  if (!m) return { kind: 'unknown' };
  const name = m[1].trim();
  return { kind: name === SIGNING_IDENTITY ? 'local' : 'developer', name };
}

/** One line about the signature, for the brain view and the report. */
function signingNote(s) {
  if (!s) return null;
  switch (s.kind) {
    case 'adhoc':
      return 'This build is signed ad hoc, so macOS forgets its permissions (Screen Recording, Calendar, Automation) with every rebuild. Run npm run make-cert once on this Mac, then rebuild (see the README).';
    case 'unsigned':
      return 'This build isn’t signed, so macOS may not keep its permissions.';
    default:
      return null;
  }
}

module.exports = { SIGNING_IDENTITY, PANES, permissionProblems, parseSigning, signingNote };
