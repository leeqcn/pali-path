// Pāli Human Voice Pronunciation & Recitation Engine
// 1. Supports real MP3 audio recordings (<audio>) when an audioUrl is configured
// 2. Uses Browser Web Speech API (speechSynthesis) with Indic/Pure-Vowel human voice selection and accurate IAST Pāli phonetic mapping
// 3. Fixes Chrome/Safari speechSynthesis.cancel() race condition and preloads voices on voiceschanged

let htmlAudio: HTMLAudioElement | null = null;
let speakTimeout: number | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
const currentListeners: Set<(playing: boolean, label?: string) => void> = new Set();

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      cachedVoices = v;
    }
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function subscribeAudioStatus(cb: (playing: boolean, label?: string) => void): () => void {
  currentListeners.add(cb);
  return () => {
    currentListeners.delete(cb);
  };
}

function notifyAudioStatus(playing: boolean, label?: string) {
  currentListeners.forEach((cb) => cb(playing, label));
}

// Convert IAST Pāli text into natural phonetic syllables for human TTS engines
export function paliToPhonetic(pali: string): string {
  return pali
    .toLowerCase()
    // Preserve natural Pāli phrasing pauses
    .replace(/;/g, ', ')
    // Palatal & retroflex stops/nasals
    .replace(/ṅg/g, 'ng-g')
    .replace(/ṅk/g, 'ng-k')
    .replace(/ṅ/g, 'ng')
    .replace(/ñc/g, 'ny-ch')
    .replace(/ñj/g, 'ny-j')
    .replace(/ññ/g, 'n-ny')
    .replace(/ñ/g, 'ny')
    .replace(/ṭṭh/g, 't-th')
    .replace(/ṭh/g, 'th')
    .replace(/ṭ/g, 't')
    .replace(/ḍḍh/g, 'd-dh')
    .replace(/ḍh/g, 'dh')
    .replace(/ḍ/g, 'd')
    .replace(/ṇh/g, 'nh')
    .replace(/ṇ/g, 'n')
    .replace(/ḷh/g, 'lh')
    .replace(/ḷ/g, 'l')
    .replace(/ṃ/g, 'ng')
    // Pāli 'c' is always unaspirated palatal affricate [tʃ] (like 'ch' in church)
    .replace(/cc/g, 't-ch')
    .replace(/ch/g, 'chh')
    .replace(/c/g, 'ch')
    // Long vowels
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ee')
    .replace(/ū/g, 'oo');
}

function pickBestPaliVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices || voices.length === 0) return undefined;
  // Priority 1: Hindi / Sanskrit / Indonesian / Thai / Italian / Spanish (pure monophthong vowels closest to Pāli)
  const priorityLangs = ['hi-in', 'sa-in', 'id-id', 'th-th', 'it-it', 'es-es', 'en-in', 'en-gb', 'en-us'];
  for (const langPrefix of priorityLangs) {
    const match = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix));
    if (match) return match;
  }
  // Priority 2: Any non-local default or first available voice
  return voices.find((v) => v.default) ?? voices[0];
}

export function stopPaliAudio(): void {
  if (speakTimeout !== null) {
    window.clearTimeout(speakTimeout);
    speakTimeout = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  }
  if (htmlAudio) {
    htmlAudio.pause();
    htmlAudio.currentTime = 0;
    htmlAudio = null;
  }
  notifyAudioStatus(false);
}

export function speakPaliText(
  paliText: string,
  options?: {
    rate?: number;
    audioUrl?: string;
    onEnd?: () => void;
  }
): void {
  const rate = options?.rate ?? 1.0;
  stopPaliAudio();
  notifyAudioStatus(true, paliText);

  // 1. If a real recorded MP3 URL is provided, play it via HTML5 Audio
  if (options?.audioUrl) {
    try {
      const audio = new Audio(options.audioUrl);
      audio.playbackRate = rate;
      htmlAudio = audio;
      audio.onended = () => {
        htmlAudio = null;
        notifyAudioStatus(false);
        options?.onEnd?.();
      };
      audio.onerror = () => {
        htmlAudio = null;
        speakWithHumanTTS(paliText, rate, options?.onEnd);
      };
      audio.play().catch(() => {
        htmlAudio = null;
        speakWithHumanTTS(paliText, rate, options?.onEnd);
      });
      return;
    } catch {
      // Fallback to speechSynthesis
    }
  }

  // 2. Speak using human TTS voice (with 40ms delay after cancel() to avoid Chrome bug)
  speakTimeout = window.setTimeout(() => {
    speakTimeout = null;
    speakWithHumanTTS(paliText, rate, options?.onEnd);
  }, 40);
}

function speakWithHumanTTS(paliText: string, rate: number, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    notifyAudioStatus(false);
    onEnd?.();
    return;
  }

  try {
    const voices =
      cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const phoneticText = paliToPhonetic(paliText);
    const utterance = new SpeechSynthesisUtterance(phoneticText);

    const bestVoice = pickBestPaliVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'en-GB';
    }

    // Slightly measured cadence for clear Pāli syllable articulation
    utterance.rate = Math.max(0.55, Math.min(1.4, rate * 0.82));
    utterance.pitch = 0.96;
    utterance.volume = 1.0;

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        notifyAudioStatus(false);
        onEnd?.();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);

    // Safety fallback timer in case browser TTS doesn't fire onend
    const estimatedMs = Math.max(1800, paliText.length * 95);
    speakTimeout = window.setTimeout(finish, estimatedMs);
  } catch {
    notifyAudioStatus(false);
    onEnd?.();
  }
}
