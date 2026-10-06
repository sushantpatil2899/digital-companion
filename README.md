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
| **Right-click him** or click the **menu bar / tray icon** | Menu: *Come here*, *Do something…*, *Take a nap / Wake up*, *Stay put*, *Start at login*, *Quit* |

*Stay put* keeps him in one spot for 10 minutes (the menu shows how long is left), then he goes back to wandering and the tick clears itself. Sending him somewhere yourself (*Come here*, or a walking activity from *Do something…*) ends it early.

On his own he walks, runs, **sits**, **blinks** and smiles, **jumps**, **talks**, **eats an apple**, **holds a flower**, **plays with his ball**, **goes on an adventure** with his backpack, turns around to watch your screen (**back view**), falls **asleep** after a while, and gets **sad** if you ignore him for a long time. *Do something…* in the menu lets you ask him for any of these.

## Running

You need [Node.js](https://nodejs.org/) 18 or newer.

```sh
npm install
npm start
```

He drops onto the bottom of the screen your cursor is on. Choose *Come here* from the menu bar (tray) icon and he runs over to below your cursor.

Run the simulation tests with `npm test`.

### Making a standalone app

```sh
npx electron-builder --win    # or --mac / --linux
```

The installer goes in `dist/`. Once he's installed, turn on *Start at login* from his menu (Windows and macOS).

## Platform notes

- **Windows / macOS**: clicks pass straight through the empty space around him, so only his body catches the mouse.
- **Linux**: transparency needs a compositing window manager, which most modern desktops have. On X11 Electron can't reliably track the cursor while a window lets clicks through, so his small window (220×220) stays clickable.
- **Multiple monitors**: you can carry him to another screen. When thrown, he bounces off the edges of the monitor he's on.

## Making him your own

- `src/main/companion.js`: `TUNING` sets speeds, gravity, bounciness and how soon he gets sleepy, sad, curious, shy or angry. `ACTIVITIES` sets how often he does each thing on his own.
- `src/renderer/character.js`: `PALETTE` sets his colours. `FRONT_SPIKES` / `BACK_SPIKES`, `zigzag()` and `MARKS_FRONT` set his head spikes, shell edge and shell markings. The drawing functions set his expressions and props.
- `src/renderer/renderer.js`: `computePose()` maps each state to a pose and expression, and also has the particle effects.

## How it works

```
src/
  main/companion.js    behaviour state machine + physics (plain JS, unit-tested)
  main/main.js         Electron main: transparent always-on-top window that follows him,
                       60 Hz loop, cursor polling for dragging, tray + menus
  preload.js           small IPC bridge
  renderer/            canvas drawing, animation, particles, mouse input
test/                  node:test tests for the simulation
```

The window is a small transparent square that moves with him. The main process runs the simulation and moves the window. The renderer draws him from the state it receives each frame and sends mouse input back.
