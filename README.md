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
| **Right-click him** or click the **menu bar / tray icon** | Menu: *Come here*, *Do something…*, *Play*, *Take a nap / Wake up*, *Stay put*, *Remind me…*, *Wellbeing*, *Brain*, *Start at login*, *Quit* |

*Stay put* keeps him in one spot for 10 minutes (the menu shows how long is left), then he goes back to wandering and the tick clears itself. Sending him somewhere yourself (*Come here*, or a walking activity from *Do something…*) ends it early.

On his own he walks, runs, **visits your other screens**, **sits**, **blinks** and smiles, **jumps**, **talks**, **eats an apple**, **holds a flower**, **plays with his ball**, **goes on an adventure** with his backpack, turns around to watch your screen (**back view**), **sleeps** and gets **sad**. *Do something…* in the menu lets you ask him for any of these.

He walks along the very bottom of each screen (on the laptop, in front of the Dock).

## Games

Two games live in `src/main/games/`. Start one from *Play* in the menu, or wait for him to ask: when he's **getting bored** (but not yet properly bored) he comes over and asks you to play one of them. If you don't take him up on it within **2 minutes** (or you're away), he gives up ("Never mind…") and plays with his own ball instead. Mid-game, 2 minutes without a throw or a move ends the game too. A meeting reminder or a meeting starting puts the game away. *Play → Stop playing* ends it any time.

- **Fetch**: he holds out his Pokeball ("Play fetch?"). Grab it out of his hands and throw it. It flies, bounces off the screen edges (or on into the next screen) and rolls to a stop. Then he runs over, picks it up and brings it back to you: "Again?" You can also grab the ball again while it's rolling or lying on the floor.
- **Tic-tac-toe**: he asks "Tic-tac-toe?"; click him to play. A board appears next to him. Whoever starts plays X, and that alternates every game: sometimes you go first, sometimes he does. He thinks for a moment before each move. He plays well, but not perfectly, so you can beat him. *Play again* starts the next game, × stops.

Playing with him keeps him from getting bored and cheers him up.

## Looking after you

He nudges you now and then, only while you're at the computer: never while you're away or in a meeting (and not in the 5 minutes after one). He does it with **whatever mood he's in**: cheerful he's all smiles ("Water time! 💧"), but when he's sad or cross he still reminds you, just with a frown ("Drink. Water."). Clicking a nudge (or him) counts as a little attention, which he likes.

| Nudge | When | What he does | You |
| --- | --- | --- | --- |
| **Water** | every 45 min at the computer | Walks over with a glass of water | Click it (*Drank ✓*): he has a sip too, and counts your glasses today |
| **Stretch** | after 50 min without a break (5+ min away counts as a break) | Stretches, arms up | Click it (*Done ✓*) |
| **Eye rest** | every 20 min | Shades his eyes and looks far away for 20 seconds: look at something about 20 feet away with him | Nothing: it ends by itself |
| **Bedtime** | after the bedtime you pick (default 23:00), then every 30 min while you're still up | Yawns, sleepy-eyed: "Bedtime soon?" | Click it: "Night!", and he leaves you alone for the night |

Water and stretch wait about 2 minutes for a click; if you don't, he puts it down ("Later then…") and asks again 10 minutes later. Turn each one on or off (and choose the bedtime) under *Wellbeing* in his menu, which also shows how many glasses you've had today. The intervals are in `settings.json` under `nudges`.

**Remind me…** (in his menu): type what to remind you about and pick *in 10 min / 20 min / 30 min / 1 hour / 2 hours* or a time. At that time he brings it over on a sticky note and holds it up until you click it (if you're in a meeting he holds it up where he is; if you're away he shows it when you're back). The same window lists what's coming up, with ✕ to cancel. Notes are kept if you quit or restart.

## His brain

He doesn't pick what to do at random: he has needs and a mood, and notices what's going on around him.

| Need | Goes up / down | What he does about it |
| --- | --- | --- |
| **Energy** | Drains while he's active (faster when running or playing, on low battery, or late at night); refills while he sleeps | Sits more when tired, naps when exhausted |
| **Hunger** | Rises over time | Eats his apple (roughly every 40 min) |
| **Boredom** | Rises while he's sitting around | Plays with his ball or goes on an adventure |
| **Affection** | Fades slowly (about 90 min from loved to lonely); pats and hugs fill it | When lonely he walks over to your cursor and looks up at you, or gets sad. If you keep ignoring him he asks less often (4, 8, 16, 32 min apart); a pat or hug resets that |

His **mood** follows his needs over a few minutes: **content** when they're all fine, **meh** when one isn't (hungry, tired, bored or lonely), **sad** when several aren't or he's very lonely, and **cheerful** when he's been getting lots of affection. Only you change it directly: pats and hugs lift it, throws drop it, and throwing him also makes him **grumpy** for a few minutes. His own activities only help through his needs, so he can't simply cheer himself up.

You can see it on his face while he walks, stands and sits: a big smile when cheerful, a small smile when content, half-closed eyes and a flat mouth when meh, worried brows and a frown when sad (he also walks slower and takes it easy), cross brows when grumpy. When he's tired his eyes droop whatever his mood.

He takes his time: he sits for 12–30 s and hangs out for 6–15 s, and usually rests after a long walk, so he changes what he's doing about every 10–30 s rather than every few seconds.

**What he notices**, with no permissions needed:
- **Time of day:** sleepier at night (and sleeps through), "Good morning!" the first time he sees you each day.
- **Whether you're around:** after 3 minutes without mouse/keyboard, or when the screen locks or the Mac sleeps, he naps. When you come back he wakes up and runs over: "You're back!"
- **Battery:** below 20% he gets tired and slow, below 10% he lies down. Plugging in perks him up: "Yum, power!"

**Opt-in (macOS, off by default)**, under *Brain* in his menu:
- **Notice which app I'm using:** he keeps still only while you're actually in a meeting: as soon as you join one he stops where he is and sits quietly (sitting, resting, watching your screen or napping) until it's over. He hides while you present (Keynote, PowerPoint). Every 5 seconds it checks:
  - the app in front, by name and bundle ID (Zoom, including "Zoom Workplace", Teams, FaceTime, Webex, … is a meeting);
  - which apps have a window showing on **any** of your screens (owner names and positions only, never window contents or titles). A meeting app showing on another screen counts as a meeting **while a calendar event is on**, so a Zoom window left open all day doesn't mute him;
  - the web address of the tab showing in each visible browser window (Chrome, Arc, Brave, Edge, Safari). Google Meet, Zoom web, Whereby and Around tabs count as a meeting; Teams and Webex web count only while a calendar event is on.

  macOS asks once per browser to allow this under *Privacy & Security → Automation*. If you say no, browser meetings just aren't noticed. The app and address lists are in `settings.json`; what you add there is added to the built-in lists.
- **Read my calendar:** reads your next 12 hours of events from the Mac **Calendar** app, so add your Google account there first (*System Settings → Internet Accounts → Google → Calendars on*). **30 minutes** and **5 minutes** before an event he comes over and holds up a sign (**"Meeting in 30 min"**, **"Meeting in 5!"**). The sign stays up until you **click the sign or him** (the green *OK ✓*); if you haven't by the start time it changes to **"Meeting now!"**. If the event has a Zoom, Google Meet, Teams, Webex or Whereby link (in its URL, location or notes), the sign also has a blue **Join ▸** tag that opens the call. When the event is over he drops it, and if you were away he shows it when you come back (if the event's still on). He says "All done!" after. All-day and declined events are ignored. macOS asks once for Calendar access.

  If *Notice which app I'm using* is off he can't tell whether you're really in the meeting, so he keeps quiet for the whole calendar event.

Both only work in the packaged **Togepi.app** (see below): macOS only shows these permission prompts to an app that says why it needs them.

Nothing leaves your Mac: no internet, no accounts. His needs, mood, today's water count and your notes are remembered between runs (`brain.json`) and your choices are in `settings.json`, both in `~/Library/Application Support/Togepi/` (or `…/digital-companion/` when you run him with `npm start`). You can edit the meeting / presenting app lists in `settings.json`.

**Show his brain…** (under *Brain*) opens a small window with his needs, mood, what he's noticing and why he chose what he's doing. It also shows how the front app was classified and a *Meeting check* line saying why he is (or isn't) keeping quiet, when your next water / stretch / eye-rest nudges are due, and your pending notes. Problems (for example a declined permission) are shown there too. If you're in an event inside a longer one (a call during a focus block), he shows the call and lists the block under *Also in*.

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
- **Linux**: transparency needs a compositing window manager, which most modern desktops have. On X11 Electron can't reliably track the cursor while a window lets clicks through, so his small window (220×240) stays clickable.
- **Multiple monitors**: he knows how your screens are arranged. He stays on the screen he's on for a while (at least 5 minutes), then sometimes wanders over to another one on his own, always walking through the edge where they touch, never popping up in the middle. When you plug in a screen he stays where he is, and when you come back after a break he comes over to the screen you're on. The brain view (*Brain → Show his brain…*) shows which screens he can walk to. Side by side he walks across, drops down to a lower screen or hops up to a higher one; between stacked screens he drops through the shared edge or springs up through it. *Come here* on another screen makes him walk over the same way. Screens that don't touch can't be walked between (*Come here* then drops him in from above). You can also carry him anywhere. When thrown, he bounces off the edges of the monitor he's on.

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
  main/screens.js      screen layout: which screens touch and how to cross between them
  main/nudges.js       water / stretch / eye rest / bedtime timers, "remind me" notes, what he says
  main/games/          fetch (the ball's physics) and tic-tac-toe (rules and his moves)
  main/mac/            macOS-only: front app (lsappinfo), visible windows (CoreGraphics),
                       browser tabs (AppleScript) and calendar (EventKit)
  main/main.js         Electron main: transparent always-on-top window that follows him,
                       60 Hz loop, cursor polling for dragging, tray + menus, saving his brain
  preload.js           small IPC bridge (game-preload.js: the same for the ball and the board)
  renderer/            canvas drawing, animation, particles, mouse input, brain view
  renderer/games/      the thrown ball's window and the tic-tac-toe board
test/                  node:test tests for the simulation
```

The window is a small transparent square that moves with him. The main process runs the simulation and moves the window. The renderer draws him from the state it receives each frame and sends mouse input back.
