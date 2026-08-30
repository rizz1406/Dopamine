// Hugging Face Inference API integration for DOPAMINE
// All features use free tier — no credit card needed

const HF_TOKEN = ''; // Optional: set for higher rate limits
const HF_BASE = 'https://api-inference.huggingface.co/models';

// Generic inference call
async function hfInference(model, inputs, params = {}) {
  const res = await fetch(`${HF_BASE}/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {})
    },
    body: JSON.stringify({ inputs, parameters: params })
  });
  if (!res.ok) throw new Error(`HF ${model}: ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  if (ct.includes('audio')) return { audio: await res.blob() };
  if (ct.includes('image')) return { image: await res.blob() };
  return res.text();
}

// ── TEXT GENERATION ──
export async function generateHint(word, difficulty = 'medium') {
  const prompt = `Give a ${difficulty} hint for a 5-letter word in a word game. Do NOT reveal the word. Hint:`;
  const data = await hfInference('meta-llama/Llama-3.1-8B-Instruct', prompt, { max_new_tokens: 80, temperature: 0.7 });
  return Array.isArray(data) ? data[0].generated_text : data.generated_text || data;
}

export async function generateRecap(stats) {
  const prompt = `Write a fun 2-sentence daily gaming recap. Score: ${stats.points} pts, Games: ${stats.gamesPlayed}, Best streak: ${stats.bestStreak}. Be encouraging and funny.`;
  const data = await hfInference('meta-llama/Llama-3.1-8B-Instruct', prompt, { max_new_tokens: 100 });
  return Array.isArray(data) ? data[0].generated_text : data.generated_text || data;
}

// ── TRANSLATION ──
export async function translate(text, targetLang = 'es') {
  const langMap = { es: 'es', fr: 'fr', de: 'de', pt: 'pt', ja: 'ja', ko: 'ko', zh: 'zh', ar: 'ar', hi: 'hi', ru: 'ru', it: 'it', nl: 'nl', pl: 'pl', tr: 'tr', vi: 'vi' };
  const lang = langMap[targetLang] || 'es';
  const data = await hfInference(`Helsinki-NLP/opus-mt-en-${lang}`, text, { max_new_tokens: 512 });
  return Array.isArray(data) ? data[0].translation_text : data.translation_text || data;
}

// ── SENTIMENT ANALYSIS ──
export async function analyzeSentiment(text) {
  const data = await hfInference('distilbert-base-uncased-finetuned-sst-2-english', text);
  return Array.isArray(data) ? data[0] : data;
}

// ── TOXIC CLASSIFICATION ──
export async function isToxic(text) {
  const data = await hfInference('unitary/toxic-bert', text);
  const toxic = Array.isArray(data) ? data.find(d => d.label === 'toxic') : data;
  return toxic ? toxic.score > 0.7 : false;
}

// ── TEXT-TO-SPEECH ──
export async function textToSpeech(text) {
  const data = await hfInference('facebook/mms-tts-eng', text);
  if (data.audio) {
    const url = URL.createObjectURL(data.audio);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    return audio;
  }
  return null;
}

// ── BACKGROUND REMOVAL ──
export async function removeBackground(imageBlob) {
  const res = await fetch(`${HF_BASE}/briaai/RMBG-2.0`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: imageBlob
  });
  return res.ok ? res.blob() : null;
}

// ── IMAGE UPSCALING ──
export async function upscaleImage(imageBlob) {
  const res = await fetch(`${HF_BASE}/nightmareai/real-esrgan`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: imageBlob
  });
  return res.ok ? res.blob() : null;
}

// ── AI BACKGROUND GENERATION ──
export async function generateBackground(theme = 'neon arcade') {
  const data = await hfInference('black-forest-labs/FLUX.1-schnell', `Abstract ${theme} background, dark, colorful, 4k, game UI, no text`, { width: 1024, height: 576, num_inference_steps: 4 });
  return data.image || null;
}

// ── STYLE TRANSFER ──
export async function styleTransfer(imageBlob, style = 'cartoon') {
  const res = await fetch(`${HF_BASE}/black-forest-labs/FLUX.1-schnell`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: JSON.stringify({ inputs: `Transform this image into ${style} style`, image: imageBlob })
  });
  return res.ok ? res.blob() : null;
}

// ── SOUND EFFECT GENERATION ──
export async function generateSoundEffect(description = 'arcade coin collect') {
  const data = await hfInference('facebook/audioldm-2-text2audio-small', description, { audio_length: 2 });
  return data.audio || null;
}

// ── MUSIC GENERATION ──
export async function generateMusic(description = 'upbeat retro arcade chiptune', duration = 10) {
  const data = await hfInference('facebook/musicgen-small', description, { max_new_tokens: duration * 50 });
  return data.audio || null;
}

// ── SUMMARY ──
export async function summarize(text) {
  const data = await hfInference('facebook/bart-large-cnn', text, { max_length: 100, min_length: 30 });
  return Array.isArray(data) ? data[0].summary_text : data.summary_text || data;
}

// ── AVATAR GENERATION (from selfie) ──
export async function generateAvatar(imageBlob, style = 'pixel art') {
  const prompt = `Convert this photo into a ${style} game avatar, keep face recognizable, colorful, 512x512`;
  const res = await fetch(`${HF_BASE}/black-forest-labs/FLUX.1-schnell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {}) },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.image || null;
}

// ── ZERO-SHOT CLASSIFICATION ──
export async function classifyImage(imageBlob, labels = ['cat', 'dog', 'bird', 'fish', 'car']) {
  const res = await fetch(`${HF_BASE}/openai/clip-vit-base-patch32`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: JSON.stringify({ inputs: { image: imageBlob, text: labels } })
  });
  return res.ok ? res.json() : null;
}

// ── OBJECT DETECTION ──
export async function detectObjects(imageBlob) {
  const res = await fetch(`${HF_BASE}/facebook/detr-resnet-50`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: imageBlob
  });
  return res.ok ? res.json() : null;
}

// ── DEPTH ESTIMATION ──
export async function estimateDepth(imageBlob) {
  const res = await fetch(`${HF_BASE}/depth-anything/Depth-Anything-V2-Small-hf`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: imageBlob
  });
  return res.ok ? res.blob() : null;
}

// ── COLOR DETECTION ──
export async function detectColors(imageBlob) {
  const res = await fetch(`${HF_BASE}/openai/clip-vit-base-patch32`, {
    method: 'POST',
    headers: HF_TOKEN ? { 'Authorization': `Bearer ${HF_TOKEN}` } : {},
    body: JSON.stringify({ inputs: { image: imageBlob, text: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black'] } })
  });
  return res.ok ? res.json() : null;
}

// ── PIXEL ART GENERATION ──
export async function generatePixelArt(description) {
  const data = await hfInference('black-forest-labs/FLUX.1-schnell', `${description}, pixel art style, 32x32, retro game sprite`, { width: 512, height: 512, num_inference_steps: 4 });
  return data.image || null;
}

export default {
  generateHint, generateRecap, translate, analyzeSentiment, isToxic,
  textToSpeech, removeBackground, upscaleImage, generateBackground,
  styleTransfer, generateSoundEffect, generateMusic, summarize,
  generateAvatar, classifyImage, detectObjects, estimateDepth,
  detectColors, generatePixelArt
};
