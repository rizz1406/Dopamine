// i18n.js — Multi-language support via HuggingFace Translation API
// Game content stays English; chrome, hub, buttons and shared UI translate.

import { translate, isToxic, textToSpeech, generateHint } from './hf-api.js';

const LANG_KEY = 'dopamine:lang';

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
];

const BASE_EN = {
  tagline: 'is live — same challenge for everyone, new at midnight UTC',
  challenge: "Today's Challenge",
  pointsToday: 'points today',
  complete: 'complete',
  challengeDone: '✅ Challenge complete',
  seeStats: 'see stats',
  continueChallenge: "▶ Continue Today's Challenge",
  arcade: '🕹️ Daily Arcade',
  bestStreak: 'best daily streak',
  todaysLeaderboard: "Today's leaderboard",
  yourStats: 'Your stats',
  howItWorks: '❓ How it works',
  hiw1: 'Play the daily games',
  hiw1p: 'REEL and Word Guess refresh every day at 00:00 UTC — identical for every player on Earth.',
  hiw2: 'Build your streak',
  hiw2p: 'Finish a daily game to keep the fire alive. Miss a day, and it resets to zero. Brutal. Fair.',
  hiw3: 'Share & compete',
  hiw3p: 'Post your result grid (no spoilers), climb the global daily leaderboard, come back tomorrow.',
  play: 'play',
  streak: 'streak',
  today: 'today',
  share: '📤 Share',
  again: '↻ Again',
  hub: '🏠 Hub',
  copyResult: '📋 Copy Result',
  shareImage: '📸 Share as Image',
  close: 'Close',
  moreApps: '📱 More apps...',
  nameTitle: '🏆 You made the board!',
  nameSub: 'Pick a name for the global daily leaderboard',
  nameSave: 'Save & Join',
  nameSkip: 'Skip, stay anonymous',
  lbTitle: 'LEADERBOARD',
  lbSub: 'Global rankings · daily board resets at 00:00 UTC',
  statsTitle: 'YOUR STATS',
  statsSub: 'Everything stays on this device — no account needed',
  bestDailyStreak: 'best daily streak',
  gamesPlayed: 'games played',
  achievements: 'ACHIEVEMENTS',
  byGame: 'BY GAME',
  played: 'played',
  best: 'best',
  hint: '💡 Hint',
  loadingHint: 'Getting AI hint...',
  scoreAnnounce: 'Score!',
  gameOver: 'Game Over',
  aiHint: 'AI Hint',
  getHint: 'Get Hint'
};

const HI = {
  tagline: 'लाइव है — सबके लिए एक जैसा चैलेंज, हर दिन रात 12 बजे UTC पर नया',
  challenge: 'आज का चैलेंज',
  pointsToday: 'पॉइंट आज',
  complete: 'पूरे',
  challengeDone: '✅ चैलेंज पूरा!',
  seeStats: 'स्टैट्स देखो',
  continueChallenge: '▶ आज का चैलेंज खेलो',
  arcade: '🕹️ डेली आर्केड',
  bestStreak: 'बेस्ट डेली स्ट्रीक',
  todaysLeaderboard: 'आज का लीडरबोर्ड',
  yourStats: 'आपके स्टैट्स',
  howItWorks: '❓ कैसे खेलें',
  hiw1: 'रोज़ के गेम खेलो',
  hiw1p: 'REEL और Word Guess हर दिन रात 12 बजे UTC पर बदलते हैं — दुनिया भर के सब खिलाड़ियों के लिए एक जैसे।',
  hiw2: 'स्ट्रीक बनाओ',
  hiw2p: 'रोज़ का गेम पूरा करो तो आग जलती रहेगी। एक दिन छोड़ा तो ज़ीरो से शुरुआत। सख्त, पर सही।',
  hiw3: 'शेयर करो और जीतो',
  hiw3p: 'अपना रिज़ल्ट ग्रिड पोस्ट करो (स्पॉइलर नहीं), ग्लोबल लीडरबोर्ड पर चढ़ो, और कल फिर आओ।',
  play: 'खेलो',
  streak: 'स्ट्रीक',
  today: 'आज',
  share: '📤 शेयर',
  again: '↻ फिर से',
  hub: '🏠 होम',
  copyResult: '📋 रिज़ल्ट कॉपी करो',
  shareImage: '📸 इमेज शेयर करो',
  close: 'बंद करो',
  moreApps: '📱 और ऐप्स...',
  nameTitle: '🏆 आप लीडरबोर्ड पर आ गए!',
  nameSub: 'ग्लोबल लीडरबोर्ड के लिए नाम चुनो',
  nameSave: 'सेव करो',
  nameSkip: 'छोड़ो, अनाम रहो',
  lbTitle: 'LEADERBOARD',
  lbSub: 'ग्लोबल रैंकिंग · डेली बोर्ड रात 12 बजे UTC पर रीसेट',
  statsTitle: 'आपके S्टैट्स',
  statsSub: 'सब कुछ इसी डिवाइस पर सेव रहता है — अकाउंट की ज़रूरत नहीं',
  bestDailyStreak: 'बेस्ट डेली स्ट्रीक',
  gamesPlayed: 'गेम खेले',
  achievements: 'उपलब्धियां',
  byGame: 'गेम के हिसाब से',
  played: 'खेले',
  best: 'बेस्ट',
  hint: '💡 हिंट',
  loadingHint: 'AI हिंट लोड हो रहा है...',
  scoreAnnounce: 'स्कोर!',
  gameOver: 'गेम ओवर',
  aiHint: 'AI हिंट',
  getHint: 'हिंट लो'
};

// Cache for translated strings
const translationCache = {};

export function getLang() {
  try { return localStorage.getItem(LANG_KEY) || 'en'; } catch { return 'en'; }
}

export function setLang(lang) {
  const valid = LANGUAGES.find(l => l.code === lang) ? lang : 'en';
  try { localStorage.setItem(LANG_KEY, valid); } catch {}
}

export function t(key) {
  const lang = getLang();
  if (translationCache[lang] && translationCache[lang][key]) return translationCache[lang][key];
  if (lang === 'hi' && HI[key]) return HI[key];
  return (BASE_EN[key]) ?? key;
}

// Dynamic translation via HuggingFace API
async function translateString(text, targetLang) {
  if (targetLang === 'en') return text;
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache[targetLang]?.[cacheKey]) return translationCache[targetLang][cacheKey];
  try {
    const result = await translate(text, targetLang);
    if (!translationCache[targetLang]) translationCache[targetLang] = {};
    translationCache[targetLang][cacheKey] = result;
    return result;
  } catch { return text; }
}

// Translate all UI strings for a language
export async function translateAll(lang) {
  if (lang === 'en' || lang === 'hi') return;
  setLang(lang);
  if (!translationCache[lang]) translationCache[lang] = {};
  const keys = Object.keys(BASE_EN);
  const results = await Promise.allSettled(keys.map(k => translateString(BASE_EN[k], lang)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') translationCache[lang][keys[i]] = r.value;
  });
}

// AI-powered game hints
export async function getAIHint(word, difficulty = 'medium') {
  try {
    const hint = await generateHint(word, difficulty);
    return hint;
  } catch { return t('loadingHint'); }
}

// Text-to-speech for score announcements
export async function announceScore(score) {
  try {
    const audio = await textToSpeech(`You scored ${score}!`);
    if (audio) audio.play();
  } catch {}
}

// Toxic username filter
export async function checkUsername(name) {
  try {
    const toxic = await isToxic(name);
    return { ok: !toxic, reason: toxic ? 'Inappropriate name' : '' };
  } catch { return { ok: true, reason: '' }; }
}
