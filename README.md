# Shadow Quest

A tiny browser puzzle game built together by a dad and his 12-year-old daughter.

A girl explores a shadowy dungeon, solves three logical puzzles to earn three coins, then visits the Summoning Altar to choose a companion — a **cat** or a **dog** — who follows her on her adventure. Visual style inspired by *Solo Leveling*.

## How to play

- **Move:** Arrow keys or `WASD`
- **Interact:** `SPACE` or `ENTER` when near a glowing object
- Solve the three puzzles (blue glowing circles):
  1. **Rune Sequence** — memorize and repeat the order.
  2. **Arcane Lock** — decipher a 3-digit code from riddles.
  3. **Shadow Pairs** — match three pairs of shadow symbols.
- Once you have 3 coins, the purple altar awakens — walk to it and choose a pet.
- Keep running around the dungeon with your new companion!

## Run locally

Just open `index.html` in any modern browser. No build step, no server needed.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, pick the main branch and `/` (root).
4. Save. Your game will be live at `https://<username>.github.io/<repo>/`.

## Files

- `index.html` — page and puzzle UI
- `style.css` — dark blue/purple "System" theme
- `game.js` — world, movement, puzzles, shop, pet following
