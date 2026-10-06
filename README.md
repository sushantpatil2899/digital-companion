# Desktop Companion

A little desktop pet that lives on your screen. Meet **Mochi**, a round orange cat-blob who walks around the bottom of your screen, naps, and reacts when you play with him.

## Playing with him

| Do this | He does |
| --- | --- |
| **Click and drag** | Gets picked up and dangles from your cursor, swinging as you move him around |
| **Let go** | Drops to the ground and lands with a squish |
| **Fling him** (drag fast, then let go) | Flies off ("Wheee!"), bounces off the screen edges, and gets dizzy after a hard landing |
| **Click him** | A pat on the head: he gets happy and shows a heart. Wakes him up if he's asleep |
| **Click and hold** (without moving) | Petting: he gets happy and keeps giving off hearts while you hold |
| **Right-click him** or click the **menu bar / tray icon** | Menu: *Come here*, *Take a nap / Wake up*, *Stay put*, *Start at login*, *Quit* |

When you leave him alone he wanders, runs, sits, looks around, hops now and then, and dozes off (Zzz) after a while. He watches your cursor when it's nearby.

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

- `src/main/companion.js`: `TUNING` sets speeds, gravity, bounciness and how soon he gets sleepy. `chooseNext()` sets how often he does each thing on his own.
- `src/renderer/character.js`: `PALETTE` sets his colours. The drawing functions set his shape and expressions.
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
