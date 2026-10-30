# 🌙 The Auklet Moon

A kid-friendly 3D Warrior Cats game you play in a web browser, made by Emmy (with help from her dad and Claude).

This first version lets you be an **OceanClan** cat and explore your home by the sea.

## What you can do right now

- 🐾 **Pick a pelt** (8 to choose from, including *Lavender Moon*, based on Emmy's drawing).
- 🏕️ **Explore OceanClan camp**: sandy ground right against the ocean, the **Highrock** in the middle, soft **meeting moss** around it, and the **Warriors' Den, Apprentices' Den, Nursery and Elders' Den** (you can walk inside them!).
- 🪨 **Jump up the stepping stones** to stand on top of the Highrock, where the leader calls Clan meetings.
- 🕳️ **Find the secret tunnel** in front of the Highrock and walk down into the **Leader's Cave**, the only underground den. It's lit by glowing crystals.
- 🌊 **Swim in the ocean**, visit the **tide pools** and the **sea caves**, and watch the crabs run away from you.
- 🌅 **Day and night**: one whole day takes 20 minutes. The sun rises over the ocean and sets inland, and the moon and stars come out at night.
- 🎵 **Sounds**: soft music, waves (loud in the day, gentle at night), seabirds and cats chatting in the day, and crickets at night. Underground, everything gets quiet and you hear water dripping.
- 🌙 Click the **moon button** for Moonfur's Guide.

## Controls

| Key | What it does |
| --- | --- |
| `W A S D` or arrow keys | Walk |
| `Shift` | Run |
| `Space` | Jump |
| Drag the mouse | Look around |
| Mouse wheel | Zoom in and out |
| `Q` / `E` | Turn the camera |
| `M` | Meow! |
| Hold `T` | Make time go faster (to see sunset and night) |
| `H` | Hide or show the help box |

On a tablet, drag on the left side of the screen to walk, drag on the right to look around, and use the buttons for jump and meow.

## How to run it on your computer

You need [Node.js](https://nodejs.org) (version 20 or newer).

```bash
npm install     # only the first time
npm run dev     # starts the game
```

Then open the link it prints (usually http://localhost:5173) in Chrome, Edge, Firefox or Safari.
It also prints a "Network" link you can open on another computer or tablet on the same Wi-Fi.

Other commands:

```bash
npm test        # checks that walking, swimming, the tunnel and jumping still work
npm run build   # makes a finished version in the dist/ folder
```

### Play from a link (GitHub Pages)

The repo has a workflow that puts the game online every time `main` changes.
To turn it on once: on GitHub go to **Settings → Pages → Source** and pick **GitHub Actions**.
After the next push to `main`, the game will be at `https://tehtrav.github.io/the-auklet-moon/`.

## Where things live (for grown-up helpers)

| File | What's in it |
| --- | --- |
| `src/config.js` | Easy settings: day length, walking speed, jump height, world edges |
| `src/world/layout.js` | Where the Highrock, tunnel and cave are |
| `src/world/camp.js` | Builds the camp: Highrock, stepping stones, dens, tunnel, cave, fresh-kill pile |
| `src/world/terrain.js` | The sand, grass and sea floor |
| `src/world/nature.js` | Ocean, waves, trees, grass, shells, tide pools, sea caves, seabirds, crabs, fireflies, clouds |
| `src/world/sky.js` | Sun, moon, stars, sky colors and lighting through the day |
| `src/cat.js` | The cat model and the pelt list (`PELTS`) |
| `src/npcs.js` | The OceanClan cats in camp (leader, queen, kits, elder, warrior, apprentice) |
| `src/audio.js` | All the sounds and music (made with code, so there are no sound files yet) |
| `src/physics.js` | Walking, jumping, swimming and bumping into things |
| `src/controls.js` | Keyboard, mouse and touch |

Built with [Three.js](https://threejs.org) and [Vite](https://vite.dev). Everything is plain JavaScript.

## What's next

- Emmy's art for the cats (Moonfur first!) and names for the OceanClan cats.
- The start flow: choose a Clan, then a pelt, then Moonfur's quick tutorial.
- MoonClan and SunClan territories (the borders are already marked).
- **Multiplayer** so friends can play together. The plan is a small realtime server
  (for example Supabase Realtime or a tiny Node server on DigitalOcean) that shares each
  cat's position, direction and pelt. The `player` object in `src/main.js` already holds
  exactly that, and the world is the same for everyone because it's built from a fixed seed.
- Chat with a kind-words filter, hunting, accessories, trading and gifting.
