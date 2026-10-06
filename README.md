# Desktop Companion

A little desktop pet that lives on your screen: **Togepi**, drawn in code from a reference sheet of 20 poses. He walks around the bottom of your screen, keeps himself busy, naps, and reacts when you play with him.

> Togepi and the Poké Ball are © Nintendo / Creatures / GAME FREAK / The Pokémon Company. This is a personal fan project: keep it on your own computer and don't publish or distribute builds of it.

## Playing with him

| Do this | He does |
| --- | --- |
| **Click and drag** | Gets picked up and dangles from your cursor, swinging as you move him around |
| **Let go** | Drops to the ground and lands with a squish |
| **Fling him** (drag fast, then let go) | Flies off ("Wheee!") and bounces off the screen edges. A hard landing leaves him **confused** |
| **Throw him 3 times within a minute** | He gets **angry** and stomps off. A pat makes up for it |
| **Click him** | A pat on the head: he's **happy** and shows a heart. Wakes him (**surprised**) if he's asleep |
| **Click and hold** (without moving) | **Getting a hug**: eyes closed, arms around himself, hearts while you hold |
| **Leave the cursor resting on him** | He gets **shy**: blushes, with a sweat drop |
| **Leave the cursor near him** | He gets **curious**: "?" |
| **Come back after being away** | He **waves** at you (he also waves when he starts up and wakes up) |
| **Right-click him** or click the **menu bar / tray icon** | Menu: *Come here*, *Do something…*, *Take a nap / Wake up*, *Stay put*, *Brain*, *Start at login*, *Quit* |

*Stay put* keeps him in one spot for 10 minutes (the menu shows how long is left), then he goes back to wandering and the tick clears itself. Sending him somewhere yourself (*Come here*, or a walking activity from *Do something…*) ends it early.

On his own he walks, runs, **sits**, **blinks** and smiles, **jumps**, **talks**, **eats an apple**, **holds a flower**, **plays with his ball**, **goes on an adventure** with his backpack, turns around to watch your screen (**back view**), **sleeps** and gets **sad**. *Do something…* in the menu lets you ask him for any of these.

## His brain

He doesn't pick what to do at random: he has needs and a mood, and notices what's going on around him.

| Need | Goes up / down | What he does about it |
| --- | --- | --- |
| **Energy** | Drains while he's active (faster when running or playing, on low battery, or late at night); refills while he sleeps | Sits more when tired, naps when exhausted |
| **Hunger** | Rises over time | Eats his apple (roughly every 40 min) |
| **Boredom** | Rises while he's sitting around | Plays with his ball or goes on an adventure |
| **Affection** | Fades slowly (about 90 min from loved to lonely); pats and hugs fill it | When lonely he walks over to your cursor and looks up at you, or gets sad. If you keep ignoring him he asks less often (4, 8, 16, 32 min apart); a pat or hug resets that |

His **mood** (grumpy … cheerful) follows his needs, goes up when you pat or hug him and down when you throw him around.

**What he notices**, with no permissions needed:
- **Time of day:** sleepier at night (and sleeps through), "Good morning!" the first time he sees you each day.
- **Whether you're around:** after 3 minutes without mouse/keyboard, or when the screen locks or the Mac sleeps, he naps. When you come back he wakes up and runs over: "You're back!"
- **Battery:** below 20% he gets tired and slow, below 10% he lies down. Plugging in perks him up: "Yum, power!"

**Opt-in (macOS, off by default)**, under *Brain* in his menu:
- **Notice which app I'm using:** in a meeting app (Zoom, Teams, FaceTime, Webex, …) he keeps still and quiet; while you present (Keynote, PowerPoint) he hides. It checks only the *name* of the app in front, every few seconds. macOS may ask once to allow this under *Privacy & Security → Automation*.
- **Read my calendar:** reads your next 12 hours of events from the Mac **Calendar** app, so add your Google account there first (*System Settings → Internet Accounts → Google → Calendars on*). About 5 minutes before an event he comes over and holds up a **"Meeting in 5!"** sign, keeps quiet during it, and says "All done!" after. All-day and declined events are ignored. macOS asks once for Calendar access.

Both only work in the packaged **Togepi.app** (see below): macOS only shows these permission prompts to an app that says why it needs them.

Nothing leaves your Mac: no internet, no accounts. His needs and mood are remembered between runs (`brain.json`) and your choices are in `settings.json`, both in `~/Library/Application Support/Togepi/` (or `…/digital-companion/` when you run him with `npm start`). You can edit the meeting / presenting app lists in `settings.json`.

**Show his brain…** (under *Brain*) opens a small window with his needs, mood, what he's noticing and why he chose what he's doing. Problems (for example a declined permission) are shown there too.

## Running

You need [Node.js](https://nodejs.org/) 18 or newer.

```sh
npm install
npm start
```

He drops onto the bottom of the screen your cursor is on. Choose *Come here* from the menu bar (tray) icon and he runs over to below your cursor.

Run the simulation tests with `npm test`.

### Making Togepi.app (macOS)

```sh
npm install
npm run dist
```

This builds `dist/mac-arm64/Togepi.app` (or `dist/mac/` on Intel). Drag it into **Applications** and open it. It's a personal build that isn't notarized, so the first time macOS may say it can't verify it: **right-click Togepi.app → Open → Open**. After that it opens normally.

Then, from his menu: turn on *Start at login*, and under *Brain* turn on the features you want. Rebuilding the app may make macOS ask for the permissions again.

## Platform notes

- **Windows / macOS**: clicks pass straight through the empty space around him, so only his body catches the mouse.
- **Linux**: transparency needs a compositing window manager, which most modern desktops have. On X11 Electron can't reliably track the cursor while a window lets clicks through, so his small window (220×220) stays clickable.
- **Multiple monitors**: you can carry him to another screen. When thrown, he bounces off the edges of the monitor he's on.

## Making him your own

- `src/main/brain.js`: `NEEDS` sets how fast his needs change, `EFFECTS` what each activity does to them, and `scoreActivities()` how much he wants to do each thing.
- `src/main/companion.js`: `TUNING` sets speeds, gravity, bounciness and how soon he gets curious, shy or angry.
- `src/renderer/character.js`: `PALETTE` sets his colours. `FRONT_SPIKES` / `BACK_SPIKES`, `zigzag()` and `MARKS_FRONT` set his head spikes, shell edge and shell markings. The drawing functions set his expressions and props.
- `src/renderer/renderer.js`: `computePose()` maps each state to a pose and expression, and also has the particle effects.

## How it works

```
src/
  main/companion.js    behaviour state machine + physics (plain JS, unit-tested)
  main/brain.js        needs, mood and how he scores what to do next
  main/context.js      turns idle time, battery, clock, front app and calendar into context
  main/settings.js     opt-in settings (settings.json)
  main/mac/            macOS-only: front app (lsappinfo / AppleScript) and calendar (EventKit)
  main/main.js         Electron main: transparent always-on-top window that follows him,
                       60 Hz loop, cursor polling for dragging, tray + menus, saving his brain
  preload.js           small IPC bridge
  renderer/            canvas drawing, animation, particles, mouse input, brain view
test/                  node:test tests for the simulation
```

The window is a small transparent square that moves with him. The main process runs the simulation and moves the window. The renderer draws him from the state it receives each frame and sends mouse input back.
