// Legal + info pages — real content for AdSense readiness and user trust.
const YEAR = new Date().getFullYear();

const PAGES = {
  about: {
    title: 'About DOPAMINE',
    h: '👋 About DOPAMINE.',
    body: `
      <p><b>DOPAMINE.</b> is a free daily arcade: a small collection of original mini-games
      where everyone gets the <b>same challenges every day</b> — new puzzles land at
      <b>00:00 UTC</b>.</p>
      <p>No accounts. No downloads. No paywalls. Open the site, play a two-minute game,
      keep your streak alive, compare scores on the global leaderboard.</p>
      <h3>Why daily?</h3>
      <p>Shared daily puzzles turn solo games into a conversation — you and your friends
      play the same REEL puzzle, get the same Word Guess word, and argue about who got
      luckier. Share your result grid, not spoilers.</p>
      <h3>How it's built</h3>
      <p>A dependency-free vanilla JS frontend, a tiny Node/Cloudflare Worker API, and a lot
      of canvas. Deterministic seeded randomness guarantees everyone sees the identical
      daily challenge, anywhere on Earth.</p>`
  },
  privacy: {
    title: 'Privacy Policy',
    h: '🔒 Privacy Policy',
    body: `
      <p><i>Last updated: August 2026</i></p>
      <h3>What we store</h3>
      <p><b>On your device (localStorage):</b> your game streaks, scores, best results, display
      name (if you choose one) and achievement progress. This data never leaves your browser
      except the score you explicitly submit to the leaderboard.</p>
      <p><b>On our server:</b> only what you submit to a leaderboard — a display name, a game
      score, and a date. No emails, no passwords, no accounts, no personal identifiers.</p>
      <h3>Analytics & ads</h3>
      <p>We use privacy-friendly, aggregate analytics to understand which games are popular.
      If advertising is enabled, ad partners may set cookies subject to your consent where
      required by law. A consent notice will appear before any non-essential tracking is
      activated.</p>
      <h3>Data deletion</h3>
      <p>Clearing your browser data removes everything stored locally. To remove a leaderboard
      entry, contact us with the name and date and we'll delete it.</p>
      <h3>Contact</h3>
      <p>Questions about this policy? Use the contact link in the footer.</p>`
  },
  terms: {
    title: 'Terms of Service',
    h: '📜 Terms of Service',
    body: `
      <p><i>Last updated: August 2026</i></p>
      <h3>The short version</h3>
      <p>Play for free. Be nice on the leaderboard. Don't cheat, scrape, or attack the service.</p>
      <h3>Details</h3>
      <p>1. The service is provided "as is", without warranties of any kind.<br/>
      2. Leaderboard entries may be removed if they violate fair play (automated scoring,
      impersonation, offensive names).<br/>
      3. Game content (puzzles, word lists, code) belongs to DOPAMINE and may not be
      republished without permission.<br/>
      4. We may modify or discontinue features at any time.<br/>
      5. You must be old enough to use the internet legally in your country, or have a
      guardian's permission.</p>`
  },
  contact: {
    title: 'Contact',
    h: '📬 Contact',
    body: `
      <p>Found a bug? Want a new game? Scoreboard dispute?</p>
      <p>Reach us at <b>hello@dopamine.games</b> or on X <b>@dopaminegames</b>.</p>
      <p>We read everything. Bug reports with your browser + device get fixed fastest. 🐛</p>`
  }
};

export function renderLegal(page) {
  return (view) => {
    const p = PAGES[page];
    view.innerHTML = `
      <div class="game-head">
        <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
        <div class="game-title"><h2>${p.h.split(' ').slice(1).join(' ') || p.h}</h2></div>
      </div>
      <section class="stage legal" style="text-align:left" data-test="legal-page">
        <h2 class="legal-h">${p.h}</h2>
        ${p.body}
      </section>`;
  };
}

export function legalMeta(page) {
  return { title: `${PAGES[page].title} — DOPAMINE`, desc: PAGES[page].title };
}
