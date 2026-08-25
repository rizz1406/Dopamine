// SEO content pages — genuinely useful articles that link into the arcade.
export const SEO_PAGES = {
  'games-like-wordle': {
    title: '10 Free Games Like Wordle — Daily Puzzle Games (2026)',
    desc: 'Love Wordle? Discover 10 free daily puzzle games like Wordle — emoji movie quizzes, flag quizzes, memory games and more. No signup, play in your browser.'
  },
  'brain-games': {
    title: 'Free Brain Games — Train Memory, Reflexes & Logic Daily',
    desc: 'Free online brain games to train memory, reaction time and logic. Short daily challenges, a global leaderboard and streaks to keep you sharp. No signup.'
  }
};

export function renderSEO(page) {
  return (view) => {
    const inner = page === 'games-like-wordle' ? wordlePage() : brainPage();
    view.innerHTML = `
      <div class="game-head">
        <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
        <div class="game-title"><h2>DOPAMINE.</h2></div>
      </div>
      <section class="stage legal" style="text-align:left" data-test="seo-page">
        ${inner}
        <p style="margin-top:24px"><a class="btn" href="/" data-nav>🎮 Play the daily arcade</a></p>
      </section>`;
  };
}

function gameLink(href, emoji, name, desc) {
  return `<p><a class="btn ghost" style="margin:4px 0" href="${href}" data-nav>${emoji} ${name} →</a><br/><span style="color:var(--muted);font-size:.88rem">${desc}</span></p>`;
}

function wordlePage() {
  return `
    <h2 class="legal-h">🎮 10 Free Games Like Wordle</h2>
    <p>Wordle proved that a two-minute daily puzzle can become a worldwide ritual. If you're
    looking for <b>free games like Wordle</b> — short, smart, shareable, and refreshed every
    day — here are ten daily puzzle games you can play right now in your browser. No signup,
    no downloads, no app store.</p>
    <h3>1. REEL — guess the movie from emojis</h3>
    <p>Like Wordle but for movie fans: decode a film from four emojis in five tries. Everyone
    gets the identical puzzle each day, and your result grid (🟩🟥) is made for sharing.</p>
    <h3>2. Word Guess — the daily word challenge</h3>
    <p>A five-letter word, six attempts, color-coded hints. If you enjoy Wordle's green and
    yellow squares, this is the natural next stop — with streak tracking built in.</p>
    <h3>3. Flag Rush — geography under pressure</h3>
    <p>Ten flags, five seconds each. A fast-paced geography quiz that scratches the same
    "I know this... do I?" itch as Wordle.</p>
    <h3>4. Timeline — movie history, ordered</h3>
    <p>Arrange four movies from oldest to newest before your three strikes run out.</p>
    <h3>5. Higher or Lower — the internet's search habits</h3>
    <p>Guess whether one term is searched more than another. Simple, brutal, endless.</p>
    <h3>6. Memory — the pattern game</h3>
    <p>A Simon-style sequence challenge that grows one step at a time. Pure working-memory
    training.</p>
    <h3>7. Speed Rush — reflex racing</h3>
    <p>Dodge traffic at ever-increasing speed. Not a puzzle — pure adrenaline in 60-second
    runs.</p>
    <h3>8. Snake — the timeless classic</h3>
    <p>The Nokia legend, rebuilt for the browser with a modern leaderboard.</p>
    <h3>9. Reflex — human benchmark</h3>
    <p>Five clicks, one average reaction time. Are you faster than your friends?</p>
    <h3>10. The Daily Challenge itself</h3>
    <p>Every day at 00:00 UTC, a fresh set of puzzles unlocks for everyone on Earth. Complete
    them all, earn points, keep your streak — and compare with the whole world on the
    leaderboard.</p>
    <h3>Why daily puzzle games work</h3>
    <p>Psychologists call it the <i>Zeigarnik effect</i> — unfinished challenges stay in your
    head. A daily puzzle is designed to be left wanting one more round, and the shared
    puzzle gives friends something to compare without spoilers. That combination is why
    Wordle became a habit rather than a game — and why every game above is built around
    the same daily loop.</p>`;
}

function brainPage() {
  return `
    <h2 class="legal-h">🧠 Free Brain Games for Daily Training</h2>
    <p>Want to keep your memory sharp, your reactions fast, and your logic ticking — without
    paying for a subscription? These <b>free online brain games</b> take two to five minutes
    a day and cover the three pillars of cognitive fitness: memory, speed, and reasoning.</p>
    <h3>Memory</h3>
    ${gameLink('/memory', '🧠', 'Memory', 'Repeat growing light-and-sound patterns. Most people cap out around level 7 — how far can you go?')}
    <h3>Reaction speed</h3>
    ${gameLink('/reflex', '⚡', 'Reflex', 'A clean 5-round reaction time test with instant percentile-style verdicts.')}
    ${gameLink('/speed', '🏎️', 'Speed Rush', 'Decision speed under pressure: dodge traffic lanes as the world accelerates.')}
    <h3>Logic & knowledge</h3>
    ${gameLink('/timeline', '⏳', 'Timeline', 'Chronological reasoning: order movies by release year against the clock.')}
    ${gameLink('/flags', '🏳️', 'Flag Rush', 'Visual recall of 170+ countries under a 5-second timer.')}
    ${gameLink('/higher-lower', '⚖️', 'Higher or Lower', 'Intuitive statistics: compare real search volumes from the web.')}
    <h3>Does brain training actually work?</h3>
    <p>Research is clearest on this point: you get better at <i>what you practice</i>. Daily
    short sessions build pattern recognition and processing speed for the task at hand — and
    the competitive element (streaks, leaderboards) is what keeps you practicing. That's why
    every game here is built as a <b>two-minute daily habit</b> rather than a marathon.</p>
    <h3>The streak system</h3>
    <p>Complete the daily challenge to extend your streak. Miss a day and it resets — the
    gentle pressure that turns "I should train my brain" into an actual habit. All your stats
    stay private on your own device.</p>`;
}
