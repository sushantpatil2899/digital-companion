// JavaScript for Automation (run with `osascript -l JavaScript`): whether
// Spotify or Apple Music is playing right now, as JSON:
// {"Spotify":"playing","Music":"paused"}. Apps that aren't running are left
// out (asking never starts them). The first time, macOS asks whether
// Filo may control each app (Privacy & Security → Automation).

function run() {
  const out = {};
  for (const name of ['Spotify', 'Music']) {
    try {
      const app = Application(name);
      if (app.running()) out[name] = String(app.playerState());
    } catch (e) {
      out[name] = 'unknown';
    }
  }
  return JSON.stringify(out);
}
