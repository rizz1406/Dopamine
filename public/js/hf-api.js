// HuggingFace Inference API — with retry, timeout, and local fallbacks

const HF_TOKEN = '';
const HF_BASE = 'https://api-inference.huggingface.co/models';

async function hfInference(model, inputs, params = {}) {
  const body = JSON.stringify({ inputs, parameters: params });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${HF_BASE}/${model}`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {})
        },
        body
      });
      clearTimeout(tid);
      if (!res.ok) { if (attempt === 0 && res.status === 503) { await new Promise(r => setTimeout(r, 2000)); continue; } throw new Error(res.status); }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('json')) return res.json();
      if (ct.includes('audio')) return { audio: await res.blob() };
      if (ct.includes('image')) return { image: await res.blob() };
      return res.text();
    } catch (e) { if (attempt === 1) throw e; }
  }
}

// ── WORD HINT (AI with local fallback) ──
const HINT_MAP = {
  '': 'Think about common 5-letter words you use every day',
  a: 'Words starting with A: about, after, again, above, acne...',
  b: 'Words starting with B: beach, black, bread, bring, break...',
  c: 'Words starting with C: catch, chair, claim, clean, close...',
  d: 'Words starting with D: dance, death, delay, dirty, doubt...',
  e: 'Words starting with E: earth, eight, enjoy, enter, equal...',
  f: 'Words starting with F: fair, fight, flame, float, focus...',
  g: 'Words starting with G: gate, giant, given, glass, grain...',
  h: 'Words starting with H: happy, heart, heavy, honey, horse...',
  i: 'Words starting with I: image, indoor, inner, issue, ivory...',
  j: 'Words starting with J: joke, jolly, judge, juice, jumbo...',
  k: 'Words starting with K: kebab, karma, kayak, knack, knelt...',
  l: 'Words starting with L: label, large, laser, later, laugh...',
  m: 'Words starting with M: magic, major, mango, maple, march...',
  n: 'Words starting with N: naive, nerve, night, noble, noise...',
  o: 'Words starting with O: ocean, offer, olive, onset, opera...',
  p: 'Words starting with P: paint, panel, paper, party, pause...',
  q: 'Words starting with Q: quake, quest, queue, quick, quiet...',
  r: 'Words starting with R: raise, range, rapid, realm, right...',
  s: 'Words starting with S: safety, salad, scale, scene, score...',
  t: 'Words starting with T: table, taste, teach, theme, thick...',
  u: 'Words starting with U: ultra, uncle, under, union, unity...',
  v: 'Words starting with V: valid, value, video, virus, visit...',
  w: 'Words starting with W: waste, watch, water, wheel, where...',
  x: 'Words starting with X: xenon, xerox...',
  y: 'Words starting with Y: yacht, yearn, yield, young, youth...',
  z: 'Words starting with Z: zebra, zesty, zingy...'
};

export async function generateHint(word, difficulty = 'medium') {
  try {
    const prompt = `Give a ${difficulty} hint for a 5-letter word in a word game. Do NOT reveal the word. Hint:`;
    const data = await hfInference('meta-llama/Llama-3.1-8B-Instruct', prompt, { max_new_tokens: 80, temperature: 0.7 });
    const text = Array.isArray(data) ? data[0].generated_text : data.generated_text || data;
    if (text && text.length > 5) return text;
  } catch {}
  return HINT_MAP[word?.[0]?.toLowerCase()] || 'Try common vowels and consonants. Think about everyday words!';
}

export async function generateRecap(stats) {
  try {
    const prompt = `Write a fun 2-sentence daily gaming recap. Score: ${stats.points} pts, Games: ${stats.gamesPlayed}, Best streak: ${stats.bestStreak}. Be encouraging and funny.`;
    const data = await hfInference('meta-llama/Llama-3.1-8B-Instruct', prompt, { max_new_tokens: 100 });
    return Array.isArray(data) ? data[0].generated_text : data.generated_text || data;
  } catch {
    return `You scored ${stats.points} points across ${stats.gamesPlayed} games today. ${stats.bestStreak > 0 ? `Best streak: ${stats.bestStreak} — keep it up!` : 'Come back tomorrow and try to beat your best!'}`;
  }
}

// ── TOXIC FILTER (always returns safe on failure) ──
export async function isToxic(text) {
  try {
    const data = await hfInference('unitary/toxic-bert', text);
    const toxic = Array.isArray(data) ? data.find(d => d.label === 'toxic') : data;
    return toxic ? toxic.score > 0.7 : false;
  } catch { return false; }
}

// ── TTS (graceful failure) ──
export async function textToSpeech(text) {
  try {
    const data = await hfInference('facebook/mms-tts-eng', text);
    if (data.audio) {
      const url = URL.createObjectURL(data.audio);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      return audio;
    }
  } catch {}
  return null;
}

// ── TRANSLATION ──
export async function translate(text, targetLang = 'es') {
  try {
    const langMap = { es:'es', fr:'fr', de:'de', pt:'pt', ja:'ja', ko:'ko', zh:'zh', ar:'ar', hi:'hi', ru:'ru', it:'it', nl:'nl', pl:'pl', tr:'tr', vi:'vi' };
    const lang = langMap[targetLang] || 'es';
    const data = await hfInference(`Helsinki-NLP/opus-mt-en-${lang}`, text, { max_new_tokens: 512 });
    return Array.isArray(data) ? data[0].translation_text : data.translation_text || data;
  } catch { return text; }
}

// ── IMAGE TASKS ──
async function hfImage(model, blob, headers = {}) {
  const res = await fetch(`${HF_BASE}/${model}`, {
    method: 'POST',
    headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}`, ...headers } : headers,
    body: blob
  });
  return res.ok ? res.blob() : null;
}

export async function removeBackground(imageBlob) { return hfImage('briaai/RMBG-2.0', imageBlob); }
export async function upscaleImage(imageBlob) { return hfImage('nightmareai/real-esrgan', imageBlob); }
export async function detectObjects(imageBlob) { try { const r = await hfImage('facebook/detr-resnet-50', imageBlob); return r ? r.json() : null; } catch { return null; } }

// ── GENERATIVE ──
export async function generateBackground(theme = 'neon arcade') {
  try {
    const data = await hfInference('black-forest-labs/FLUX.1-schnell', `Abstract ${theme} background, dark, colorful, 4k, game UI, no text`, { width: 1024, height: 576, num_inference_steps: 4 });
    return data.image || null;
  } catch { return null; }
}

export async function styleTransfer(imageBlob, style = 'cartoon') {
  try {
    const res = await fetch(`${HF_BASE}/black-forest-labs/FLUX.1-schnell`, {
      method: 'POST',
      headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
      body: JSON.stringify({ inputs: `Transform this image into ${style} style`, image: imageBlob })
    });
    return res.ok ? res.blob() : null;
  } catch { return null; }
}

export async function generateSoundEffect(desc = 'arcade coin collect') {
  try { const d = await hfInference('facebook/audioldm-2-text2audio-small', desc, { audio_length: 2 }); return d.audio || null; } catch { return null; }
}

export async function generateMusic(desc = 'upbeat retro arcade', dur = 10) {
  try { const d = await hfInference('facebook/musicgen-small', desc, { max_new_tokens: dur * 50 }); return d.audio || null; } catch { return null; }
}

export async function summarize(text) {
  try { const d = await hfInference('facebook/bart-large-cnn', text, { max_length: 100, min_length: 30 }); return Array.isArray(d) ? d[0].summary_text : d.summary_text || d; } catch { return text.slice(0, 150) + '...'; }
}

export async function generatePixelArt(desc) {
  try { const d = await hfInference('black-forest-labs/FLUX.1-schnell', `${desc}, pixel art style, 32x32, retro game sprite`, { width: 512, height: 512, num_inference_steps: 4 }); return d.image || null; } catch { return null; }
}

export async function analyzeSentiment(text) {
  try { const d = await hfInference('distilbert-base-uncased-finetuned-sst-2-english', text); return Array.isArray(d) ? d[0] : d; } catch { return { label: 'POSITIVE', score: 0.8 }; }
}

export default {
  generateHint, generateRecap, translate, analyzeSentiment, isToxic,
  textToSpeech, removeBackground, upscaleImage, generateBackground,
  styleTransfer, generateSoundEffect, generateMusic, summarize,
  generatePixelArt, detectObjects
};
