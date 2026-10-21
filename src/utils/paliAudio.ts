// Pāli Audio & Recitation Engine
// Supports Web Speech API phonetic synthesis + Web Audio API resonant chanting cadence fallback for 100% offline reliability

let activeTimer: number | null = null;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Convert IAST Pāli diacritics to phonetic approximation for speech synthesis
function paliToPhonetic(pali: string): string {
  return pali
    .toLowerCase()
    .replace(/ṅ/g, 'ng')
    .replace(/ñ/g, 'ny')
    .replace(/ṭh/g, 'th')
    .replace(/ṭ/g, 't')
    .replace(/ḍh/g, 'dh')
    .replace(/ḍ/g, 'd')
    .replace(/ṇ/g, 'n')
    .replace(/ḷ/g, 'l')
    .replace(/ṃ/g, 'ng')
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ū/g, 'uu')
    .replace(/c/g, 'ch');
}

// Play a subtle, warm resonant syllable chime (monastic chanting cadence) using Web Audio API
function playSyllableCadence(text: string, rate = 1.0, onEnd?: () => void) {
  const ctx = getAudioContext();
  const clean = text.replace(/[.,;!?]/g, '').trim();
  const syllables = clean.match(/[aeiouāīū]+/gi) || ['a', 'a'];
  const stepMs = Math.max(110, Math.round(190 / rate));

  if (ctx) {
    // Traditional Pāli chanting uses a calm tonic + major second / minor third cadence (e.g. D3 / E3 / F3)
    const freqs = [293.66, 329.63, 349.23, 329.63]; // D4, E4, F4, E4
    syllables.slice(0, 18).forEach((syl, idx) => {
      const startTime = ctx.currentTime + (idx * stepMs) / 1000;
      const isLong = /[āīū]/i.test(syl);
      const duration = ((isLong ? stepMs * 1.45 : stepMs * 0.9) / 1000);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[idx % freqs.length], startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.06, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });
  }

  const totalMs = Math.min(18, syllables.length) * stepMs + 150;
  if (activeTimer) window.clearTimeout(activeTimer);
  activeTimer = window.setTimeout(() => {
    activeTimer = null;
    onEnd?.();
  }, totalMs);
}

export function stopPaliAudio(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }
}

export function speakPaliText(
  paliText: string,
  options?: {
    rate?: number;
    onEnd?: () => void;
  }
): void {
  const rate = options?.rate ?? 0.9;
  stopPaliAudio();

  // Always play gentle acoustic cadence so user gets immediate tactile audio feedback even if OS TTS is muted/unavailable
  const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

  if (hasSpeech) {
    try {
      const voices = window.speechSynthesis.getVoices();
      const utterance = new SpeechSynthesisUtterance(paliToPhonetic(paliText));
      // Prefer South/Southeast Asian or clear English/Italian/Spanish phonetic voice
      const preferredVoice =
        voices.find((v) => /hi-IN|id-ID|th-TH|it-IT|es-ES|en-GB/i.test(v.lang)) || voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = 'it-IT'; // Pure vowels close to Pāli
      }
      utterance.rate = Math.max(0.6, Math.min(1.5, rate * 0.85));
      utterance.pitch = 0.95;

      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          options?.onEnd?.();
        }
      };

      utterance.onend = done;
      utterance.onerror = () => {
        playSyllableCadence(paliText, rate, done);
      };

      // Also play subtle harmonic tone alongside speech or fallback if speech doesn't fire within 4s
      playSyllableCadence(paliText, rate, () => {
        if (!window.speechSynthesis.speaking) {
          done();
        }
      });
      window.speechSynthesis.speak(utterance);
      return;
    } catch {
      // Fallback to Web Audio cadence
    }
  }

  playSyllableCadence(paliText, rate, options?.onEnd);
}
