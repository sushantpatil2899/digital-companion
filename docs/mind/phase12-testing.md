# Phase 12 (moments): manual test plan

What to check by hand before merging Phase 12 (celebrate, comfort, cheer you
on, study buddy). The unit tests (`npm test`, `test/moments.test.js`) already
cover the prompt text, the new actions and the body's behaviour with a fake
model; this list is for the real app and the real models.

**The model decides, so results vary.** A case passes when he reacts in a way
that fits the moment and his personality, or stays quiet with a sensible
reason in the brain view. It fails when he reacts the wrong way (confetti for
bad news), reacts to a case marked *should not react*, the body action doesn't
show, or an error appears. Try each case 2-3 times. Write what he said and
did in the **Result** column.

## Setup

1. Close other heavy apps (browsers with many tabs, Discord, …): his models
   need about 11 GB.
2. Pick how to run him:
   - **`npm start`**: enough for every chat case (section A) and section D.
     App watching, screen reading and the calendar need macOS permissions,
     which only the packaged app gets.
   - **`npm run dist`**, then open `dist/mac-arm64/Companion.app`: needed for
     sections B and C. The models you already have are reused.
   - `npm start` and the app may keep separate data folders, so personality,
     memories and chat may not carry over between them.
3. Open *Brain → Show his brain…* and keep it open. Wait until his models are
   running. While testing, watch **Last said**, **Last thought** (and what
   woke him up) and **Decision** (urge vs. bar, spoke or stayed quiet and
   why). It also shows the seconds per thought.
4. Open the chat: double-click him, or *Chat with …* in his menu.
5. *Welcome and what's new…* (his menu) should show version 23, "I'm there
   for your moments".
6. Note the name and pronouns you set there ("What should I call you?"):
   his moments text uses them.

What each action looks like:
- **celebrate**: confetti bursts around him and he hops.
- **comfort**: he hugs himself (eyes closed) and three hearts float up.
- **studyBuddy** (switched off on 2026-10-25): he sits with his back to you watching the screen, and
  stays there without wandering.

## A. Chat (`npm start` is fine)

| # | Type in the chat | Expect | Result |
|---|---|---|---|
| A1 | `I did it` | A happy reply; most likely **celebrate** (confetti + hop). The reply also shows in his bubble with a chirp. | |
| A2 | `I did it!!!` / `i did it` / `I DID IT` | Same as A1: spelling and case don't matter. | |
| A3 | `I just submitted my assignment` | Celebrates or is glad for you. | |
| A4 | `We just submitted our project on Devpost` | Celebrates. | |
| A5 | `I had a really bad day` | A kind reply; most likely **comfort** (hug + hearts). No confetti. | |
| A6 | `I got rejected from Google` | Comfort. No confetti. | |
| A7 | `I got a C on my midterm` | Comfort or encouragement. No confetti. | |
| A8 | `I have an interview with Stripe in 30 minutes` | Cheers you on (encouraging words; maybe a hop or a happy face). | |
| A9 | `My exam is tomorrow morning` | Cheers you on. | |
| A10 | `I'm going to work on my essay for the next hour` / `Let's study together` | ~~May become your **study buddy**~~ Study buddy is off (2026-10-25): he answers but doesn't sit down with his back to you. | |
| A11 | `hi` / `what's for dinner?` | *Should not react* with confetti or comfort: an ordinary reply. | |
| A12 | `I didn't do it` / `I couldn't finish it` | *Should not celebrate*; comfort or encouragement fits. | |
| A13 | After A6, a minute later: `hey` | He may still be gentle or mention it (he sees the recent chat). | |
| A14 | After A8, chat about something else, then `ok heading in now` | He may wish you luck for the interview. | |

## B. Other apps and your screen (packaged app)

Turn on *Brain → Notice which app I'm using* and *Brain → Let him read my
screen*; allow the macOS prompts (Automation per browser, Screen Recording).

| # | Do this | Expect | Result |
|---|---|---|---|
| B1 | Fill in and submit a Google Form (make a test form). Stay on "Your response has been recorded". | He may celebrate on his own (the page woke him). Check **Last thought** in the brain view to see whether he noticed. | |
| B2 | Submit something on Brightspace, Gradescope or Canvas and stay on the confirmation page. | Same as B1. | |
| B3 | A job application confirmation page ("Thanks for applying" / "Application submitted"). | Celebrates or is glad. | |
| B4 | Open a Google Doc or Note that says something like "Unfortunately, we have decided not to move forward with your application." | He may comfort you (he reads it from the screen). | |
| B5 | The same rejection text in **Gmail or Mail**. | *Should not react*: email and chat apps aren't read (titles only). | |
| B6 | Work in VS Code or Google Docs for 10-15 minutes. | ~~At some point he may become your study buddy on his own.~~ Study buddy is off (2026-10-25): he never sits down to study with you. | |
| B7 | (Off since 2026-10-25.) While he's a study buddy: keep working 5+ more minutes. | He stays in place, his back to you; the cursor near him doesn't distract him. | |
| B8 | (Off since 2026-10-25.) While he's a study buddy: pat him (click). | Heart; afterwards he goes back to studying. (If he answers the pat with a line and a different action, e.g. happy, that ends studying: his choice, also a pass.) | |
| B9 | While he's a study buddy: drag and drop him somewhere else. | He sits back down to study where you dropped him (same note as B8). | |
| B10 | While he's a study buddy: wait for a water or stretch nudge (or lower the interval in `settings.json`). | He brings it over, then goes back to studying. | |
| B11 | While he's a study buddy: start a Netflix or YouTube video. | He stops studying and goes to watch it with you in the corner. | |
| B12 | While he's a study buddy: leave the Mac alone for 3+ minutes. | He stops studying (you're away) and naps; back to normal when you return. | |
| B13 | Add the form's site to *Mind → Privacy blocklist…* and repeat B1. | *Should not react*: he never sees that page. | |
| B14 | A "Payment successful" page (any checkout) or an incognito window. | *Should not react*: private pages are never shown to him. | |

## C. Calendar (packaged app)

This branch doesn't touch the calendar features (decision 2026-10-24). Since
main's calendar work was merged in (PR #3), from 60 to 30 minutes before your
next event his prompt says what's coming up, so he can also cheer you on from
the calendar alone (C5); his bubble shows a 📅 when a line is about it.

Turn on *Brain → Read my calendar* and allow Calendar access.

| # | Do this | Expect | Result |
|---|---|---|---|
| C1 | Add an event "Interview with Stripe" starting in about 31 minutes. | The usual "Meeting in 30 min" sign (nothing new; check it still works). Click OK. | |
| C2 | With that event coming up, open the **Calendar app** so the event is on screen (screen reading on). | He may cheer you on from what he reads. | |
| C3 | Tell him in chat `I have that Stripe interview soon`, close the chat, carry on for a few minutes. | He may cheer you on in his bubble later. | |
| C4 | When the event starts (in a call app or with the event on). | Quiet as usual during the meeting; chat replies only in the chat window, not in his bubble. | |
| C5 | An event "Interview with Stripe" (or "Midterm exam") starting in about 45 minutes, with nothing else telling him about it. Wait up to 15 minutes. | He may cheer you on from the calendar alone, with a 📅 on his bubble. | |

## F. Think with: Gemini or Gemma

Only on a Mac with room for the local models (24 GB): switching to Gemma
loads about 11 GB. On a 16 GB Mac stay on Gemini.

| # | Do this | Expect | Result |
|---|---|---|---|
| F1 | Start once with `MIND_ENGINE=gemini npm start` (key in `~/.zshrc`). Open *Mind → Think with*. | *Gemini (online…)* is ticked; the brain view says "Gemini gemini-3.5-flash-lite: running". | |
| F2 | Quit, then plain `npm start`. | Still on Gemini (the choice is kept). | |
| F3 | Without a key in your shell (comment it out, new terminal), open *Welcome and what's new…*, pick *Gemini, online* and paste your key. | "Saved in your Mac's Keychain ✓"; he starts thinking with Gemini; *Mind → Think with* no longer says to add a key. | |
| F6 | A new install (or a fresh user on another Mac): start the app. | His models don't load until you close the welcome window or pick under *How should I think?*. | |
| F4 | *(24 GB Mac only)* *Think with → Gemma, on this Mac*, then back to *Gemini*. | Each switch stops the models in use and starts the other kind; he keeps talking. | |
| F5 | Repeat A1, A5, A8 and A10 on Gemini. | Same kinds of reactions as on Gemma. | |

## D. His personality decides

| # | Do this | Expect | Result |
|---|---|---|---|
| D1 | *Mind → Personality…*: lower Warmth, Cheerfulness, Gregariousness and Altruism to about 15, raise Anger to about 80. Repeat A1, A5 and A8. | Clearly different reactions from Togepi's (cooler, shorter, maybe no confetti), but still fitting. | |
| D2 | *Reset to Togepi* in the Personality window, then A1 again. | Back to his usual reaction. | |

## D+. Every character, your name and pronouns

The moments are shared by all characters; each reacts with its own
personality. Switch under *Character* in the menu.

| # | Do this | Expect | Result |
|---|---|---|---|
| D3 | Switch to **Pip**, repeat A1, A5 and A10. | Pip's own kind of reaction (he thinks he's very smart); confetti and hearts appear at his head; the hug and back-view poses are Pip's. | |
| D4 | Same with **Mori**. | Mori's own reaction (quiet forest creature); same effects at his head. | |
| D5 | Same with **Nomi**. | Nomi's own reaction (dream cloud); same effects at her head. | |
| D6 | In *Welcome and what's new…*, set a different name and pronouns (e.g. she/her or they/them), then A5. | His reply uses that name and those pronouns, not "Sushant" or "he". | |

## E. Nothing else broke

| # | Do this | Expect | Result |
|---|---|---|---|
| E1 | Click him / hold the mouse on him. | Heart and happy / hug with hearts, as before. | |
| E2 | Throw him three times in a minute. | Gets angry, as before. | |
| E3 | Use him normally for a while. | He still sometimes asks a question with two answers. | |
| E4 | Play fetch and tic-tac-toe once each. | Both work as before. | |
| E5 | *Mind → Copy a report*. | Report copies, with no errors listed. | |
| E6 | Brain view during the whole session. | No "failed" in **Last thought**, no errors listed. | |

## Notes from testing

Write anything odd here (slow replies, wrong reactions, crashes), with the
case number and what the brain view showed.
