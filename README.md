# Case prep · Anki-style flashcards

Local-first flashcard drill app for McKinsey case interview prep. Anki-flavored UI, basic + cloze cards, **spaced repetition**, and a **per-card AI tutor** powered by Claude.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The flashcards work offline. The AI tutor needs an Anthropic API key (see below).

## Per-card AI tutor

Press **⌘K** (or click "Ask the tutor" under any card during a drill) to open a chat panel scoped to the current card. Ask anything — *why this bucket, what's the alternative, what would change for a hospital?* The tutor has the full card content (prompt + model answer + hint, or the cloze text) in context.

History is per-card and clears when you advance.

To enable it, create `mck-prep/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-…
```

Restart the dev server after adding the key.

The tutor uses **Claude Opus 4.7** with adaptive thinking and prompt caching on the system prompt + card context — follow-up questions on the same card are cheap.

If the env var is missing, the chat will return a 500 explaining what to do; the rest of the app works fine.

## Spaced repetition

The app implements an SM-2-lite scheduler. Each grade you give updates the card's:

- **interval** — how long until the card resurfaces
- **ease** — multiplier on each successful review
- **state** — `new`, `learning`, or `review`

Grade button intervals reflect the *real* prediction for the current card:

| Grade | Effect on a `review`-state card |
|---|---|
| **1 · Again** | Resets to ~1m, ease −0.20, +1 lapse |
| **2 · Hard** | Interval × 1.2, ease −0.15 |
| **3 · Good** | Interval × ease |
| **4 · Easy** | Interval × ease × 1.3, ease +0.15 |

The home screen shows Anki-style counts per deck:

- **Blue** new — never seen
- **Red** learning — graded `Again` recently, due in minutes
- **Green** due — review-state cards whose interval has elapsed

"Study now" pulls from due → learning → up to 20 new per session, mixed and shuffled. "Cram everything" ignores the schedule and shows everything.

State persists in `localStorage` under `mck-prep-state`. Schema is versioned and migrates on load.

## Anki-style review

- **Front side first**, then press **Space** (or **Enter**) to flip and reveal.
- **Four grades** with predicted intervals on each button.
- Keyboard: **1 / 2 / 3 / 4** grade · **Space** show / good · **⌘K** open tutor · **Esc** exit drill.
- Top bar shows running counts: remaining, again-this-session, reviewed-this-session.

## Cloze syntax

Anki-style: `{{c1::content}}` or `{{c1::content::hint}}`. One source text becomes one review card per unique cloze number.

In the editor, **Cloze selection** wraps your highlighted text in the next available cloze number. Each cloze tracks its own SR schedule.

## Manage cards

Click **Manage cards** on the home screen. From there:

- Add a **Basic** or **Cloze** card to any deck
- Edit or delete existing cards
- Create new decks
- **Export** all cards as JSON
- **Import** a JSON file (replaces decks + cards)
- **Factory reset** restores the seeded defaults — and clears scheduling

## Stack

Next.js 14 (App Router), TypeScript strict, Tailwind, shadcn-style components, lucide-react, Anthropic TypeScript SDK (`claude-opus-4-7`, adaptive thinking, prompt caching, streaming). Single-user, single-device. No backend except the local `/api/ask` route that proxies to Anthropic.
