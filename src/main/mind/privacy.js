'use strict';

// What Togepi's mind is never allowed to see. Checked before anything about
// your screen reaches his memory or the language model:
// - private / incognito browser windows
// - password managers
// - payments, checkout, banking and money apps
// - sign-in and password pages
// - medical records
// - anything on your own blocklist (apps, websites, words), from settings.json
// A blocked observation is kept only as "something private" with no details.
// No Electron imports, so it can be unit tested.

const PASSWORD_APPS = [
  '1password', 'bitwarden', 'lastpass', 'dashlane', 'keepassxc', 'keepass', 'keeper', 'enpass',
  'nordpass', 'roboform', 'proton pass', 'keychain access', 'passwords',
];
const PASSWORD_BUNDLES = ['com.1password.', 'com.bitwarden.', 'com.lastpass.', 'com.dashlane.', 'org.keepassxc.', 'com.apple.passwords', 'com.apple.keychainaccess'];

const MONEY_APPS = ['wallet', 'robinhood', 'coinbase', 'venmo', 'cash app', 'paypal', 'quicken', 'mint', 'ynab'];

// Matched against the page address (host and path).
const SENSITIVE_URL = [
  /(^|[./])(checkout|pay|payments?|billing|wallet)[./]/,
  /\/(checkout|payment|payments|billing|pay|cart\/checkout|buy\/spc|purchase|order\/confirm)(\/|\?|$)/,
  /(^|\.)(paypal|stripe|venmo|cash\.app|zelle|wise|revolut|klarna|affirm|afterpay|square|plaid)\.(com|me|co)/,
  /(^|\.)(chase|bankofamerica|wellsfargo|citi|citibank|capitalone|usbank|pnc|tdbank|ally|discover|americanexpress|amex|schwab|fidelity|vanguard|robinhood|coinbase|sofi|chime|hsbc|barclays|santander)\.com/,
  /(^|[./])(bank|banking|onlinebanking|secure|login|signin|auth|accounts?)\./,
  /\/(login|signin|sign-in|log-in|auth|oauth|sso|password|reset-password|2fa|mfa|verify)(\/|\?|$)/,
  /(^|\.)(mychart|patient|healthportal|followmyhealth)\./,
  /accounts\.google\.com|login\.microsoftonline\.com|appleid\.apple\.com|id\.apple\.com/,
];

// Matched against window and tab titles.
const SENSITIVE_TITLE = [
  /\b(checkout|payment|pay now|place (your )?order|billing|invoice|credit card|card details|bank(ing)?|wire transfer|transfer money|account balance|routing number|wallet)\b/i,
  /\b(sign in|log in|login|sign-in|password|passcode|verification code|two-factor|2fa|one-time code)\b/i,
  /\b(private browsing|incognito|inprivate)\b/i,
  /\b(test results|lab results|medical record|patient portal|prescription|diagnosis)\b/i,
  /\b(tax return|social security|ssn|passport number|1040|w-2)\b/i,
];

function lower(s) {
  return String(s || '').toLowerCase();
}

/** The host and path of a URL, lowercased ('' for none). */
function urlKey(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return lower(url);
  }
}

/** Just the site, e.g. "jobright.ai" (no path, no "www."). */
function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Is this observation off limits?
 * @param {object} o { app, bundle, title, url, private }
 * @param {object} [block] your blocklist: { apps: [], sites: [], words: [] }
 * @returns {{ blocked: boolean, reason: string|null }}
 */
function check(o, block = {}) {
  const app = lower(o.app);
  const bundle = lower(o.bundle);
  const title = String(o.title || '');
  const url = urlKey(o.url);
  const has = (list, s) => (list || []).some((x) => x && s.includes(lower(x)));

  if (o.private) return { blocked: true, reason: 'private window' };
  if (has(block.apps, app)) return { blocked: true, reason: 'blocked app' };
  if (url && has(block.sites, url)) return { blocked: true, reason: 'blocked site' };
  if (has(block.words, lower(title)) || (url && has(block.words, url))) return { blocked: true, reason: 'blocked word' };
  if (PASSWORD_BUNDLES.some((b) => bundle.startsWith(b)) || PASSWORD_APPS.some((a) => app === a || app.startsWith(`${a} `))) {
    return { blocked: true, reason: 'password manager' };
  }
  if (MONEY_APPS.some((a) => app === a)) return { blocked: true, reason: 'money app' };
  if (url && SENSITIVE_URL.some((r) => r.test(url))) return { blocked: true, reason: 'sensitive page' };
  if (title && SENSITIVE_TITLE.some((r) => r.test(title))) return { blocked: true, reason: 'sensitive page' };
  return { blocked: false, reason: null };
}

/** The question the decision model is asked for anything the rules let through. */
const MODEL_QUESTION = {
  type: 'choice',
  instructions: 'Is this window about money, payments, banking, passwords, logins or medical records?',
  criteria: {
    A: 'yes: payment, checkout, banking, money, password, login or medical',
    B: 'no: ordinary work, coding, browsing, reading, media or chatting',
  },
};

module.exports = { check, domainOf, urlKey, MODEL_QUESTION };
