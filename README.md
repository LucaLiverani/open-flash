# OpenFlash

A personal flashcard webapp for learning language vocabulary with spaced repetition. Built with Next.js 15, Cloudflare D1, and Gemini AI.

## How It Works

OpenFlash lets you create decks of vocabulary cards organized by language pair (e.g. English to Spanish). You can add cards manually or use AI to generate them.

**Cards** — Type a word in the language you're learning. Hit "AI Translate" to auto-fill the translation, an example sentence, and an emoji. Or use the Bulk Generator to create many cards at once from a topic (e.g. "food", "travel", "animals").

**Study** — Cards are scheduled using the [SM-2 spaced repetition algorithm](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm). When you review a card, you rate it Again / Hard / Good / Easy. The algorithm adjusts the interval before you see that card again — easy cards show up less often, hard cards more often.

**Practice** — When no cards are due, you can still practice. Cards are shuffled with harder ones shown first. Pick how many to review (10 / 20 / 30 / 50 / All). Practice mode doesn't affect your study schedule.

**Reset** — You can reset study progress on any deck from the dashboard or deck detail page. This sets all intervals and repetitions back to zero without deleting any cards.

## Tech Stack

- **Next.js 15** (App Router) — React framework
- **Cloudflare D1** — SQLite database at the edge
- **@opennextjs/cloudflare** — Deploys Next.js to Cloudflare Workers
- **Gemini 2.5 Flash** — AI translations and card generation
- **Tailwind CSS v4** — Styling with dark theme
- **TypeScript** — Type safety throughout

## Project Structure

```
app/
  page.tsx                    # Dashboard (stats, due cards, recent decks)
  decks/
    page.tsx                  # All decks grid
    new/page.tsx              # Create new deck
    [id]/
      page.tsx                # Deck detail (cards, editor, bulk generator)
      edit/page.tsx           # Edit/delete deck
      study/page.tsx          # Study session (due review + practice mode)
  api/
    decks/                    # CRUD for decks
    cards/                    # CRUD for cards
    ai/translate/             # Single word AI translation
    ai/bulk/                  # Bulk card generation
    review/                   # SM-2 review processing
    stats/                    # Dashboard statistics
components/
  FlashCard.tsx               # 3D flip card animation
  CardEditor.tsx              # Add card form with AI translate
  BulkGenerator.tsx           # Topic-based bulk card generation
  ReviewSession.tsx           # Study flow with keyboard shortcuts
  DeckCard.tsx                # Deck preview card for grids
  DeckDetailClient.tsx        # Deck detail page client wrapper
  Navigation.tsx              # Top navigation bar
lib/
  db.ts                       # Database helper + types
  sm2.ts                      # SM-2 spaced repetition algorithm
  gemini.ts                   # Gemini AI integration
migrations/
  0001_initial.sql            # Database schema
```

## Running Locally

### Prerequisites

- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/apikey)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Add your Gemini API key to `.dev.vars` and `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

3. Create the local database:

```bash
npm run db:migrate:local
```

4. Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Keyboard Shortcuts (Study Mode)

- **Space / Enter** — Flip card
- **1** — Again
- **2** — Hard
- **3** — Good
- **4** — Easy

## Deploying to Cloudflare

### First-time Setup

1. Create the D1 database:

```bash
npx wrangler d1 create openflash-db
```

This outputs a `database_id`. Update `wrangler.jsonc` with it:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "openflash-db",
    "database_id": "your-database-id-here"
  }
]
```

2. Run the migration on the remote database:

```bash
npm run db:migrate:remote
```

3. Set the Gemini API key as a secret:

```bash
npx wrangler secret put GEMINI_API_KEY
```

### Deploy

```bash
npm run build && npm run deploy
```

### Preview (Local Cloudflare Workers Runtime)

To test the production build locally before deploying:

```bash
npm run build && npm run preview
```
