// Pāli Human Voice Pronunciation, SuttaCentral Voice Stream & Shadowing Engine (Phase 2)
// 1. Connects to SuttaCentral Voice (api.sc-voice.net) segment audio & Ancient Buddhist Texts (Ven. Ānandajoti) MP3 catalog
// 2. Provides Pāli Mora/Mattā (Lahu ⏑ 1-beat / Garu — 2-beat) prosody analysis for authentic chanting rhythm
// 3. Synchronizes real-time word-by-word karaoke highlighting during sentence recitation
// 4. Includes pure-frontend Microphone Shadowing Recorder & A/B Comparison (原音 vs 我的跟读对比)

export type AudioChannelMode = 'auto' | 'sc-voice' | 'local-tts';

export interface SuttaAudioMeta {
  suttaId: string;
  scSuttaUid: string;
  scVoicePageUrl: string;
  abtPageUrl: string;
  abtChapterMp3Url: string;
  reciterName: string;
  reciterTradition: string;
  meterName: string; // e.g. Pathyāvaṭṭa (Anuṭṭhubha 8-syllable) or Vatta
  segments: Record<string, string>; // sentence.id -> SuttaCentral Bilara segment ID
}

export const SUTTA_AUDIO_CATALOG: Record<string, SuttaAudioMeta> = {
  'dhp-1': {
    suttaId: 'dhp-1',
    scSuttaUid: 'dhp1-20',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp1',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/01-Yamakavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/01-Yamakavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '根本说一切有部/上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节，长音 — 读两拍、短音 ⏑ 读一拍）',
    segments: {
      'dhp-1-1': 'dhp1:1.1',
      'dhp-1-2': 'dhp1:1.3',
    },
  },
  'dhp-2': {
    suttaId: 'dhp-2',
    scSuttaUid: 'dhp1-20',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp2',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/01-Yamakavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/01-Yamakavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节）',
    segments: {
      'dhp-2-1': 'dhp2:2.1',
      'dhp-2-2': 'dhp2:2.3',
    },
  },
  'dhp-3-4': {
    suttaId: 'dhp-3-4',
    scSuttaUid: 'dhp1-20',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp3',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/01-Yamakavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/01-Yamakavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节）',
    segments: {
      'dhp-3-1': 'dhp3:3.1',
      'dhp-3-2': 'dhp3:3.3',
    },
  },
  'dhp-5': {
    suttaId: 'dhp-5',
    scSuttaUid: 'dhp1-20',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp5',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/01-Yamakavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/01-Yamakavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节）',
    segments: {
      'dhp-5-1': 'dhp5:5.1',
      'dhp-5-2': 'dhp5:5.3',
    },
  },
  'dhp-21': {
    suttaId: 'dhp-21',
    scSuttaUid: 'dhp21-32',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp21',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/02-Appamadavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/02-Appamadavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节）',
    segments: {
      'dhp-21-1': 'dhp21:21.1',
      'dhp-21-2': 'dhp21:21.3',
    },
  },
  'dhp-35': {
    suttaId: 'dhp-35',
    scSuttaUid: 'dhp33-43',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp35',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/03-Cittavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/03-Cittavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节）',
    segments: {
      'dhp-35-1': 'dhp35:35.3',
    },
  },
  'dhp-183': {
    suttaId: 'dhp-183',
    scSuttaUid: 'dhp179-196',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp183',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/14-Buddhavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/14-Buddhavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统八音步诗律 (Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 偈颂体（每句 8 音节）',
    segments: {
      'dhp-183-1': 'dhp183:183.1',
      'dhp-183-2': 'dhp183:183.3',
    },
  },
  'dhp-277-279': {
    suttaId: 'dhp-277-279',
    scSuttaUid: 'dhp273-289',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=dhp277',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Dhammapada/20-Maggavaggo.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Dhammapada/20-Maggavaggo.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '上座部传统诗律 (Vatta)',
    meterName: 'Vatta 偈颂体（长短音分明）',
    segments: {
      'dhp-277-1': 'dhp277:277.1',
      'dhp-279-1': 'dhp279:279.1',
    },
  },
  'kp-1': {
    suttaId: 'kp-1',
    scSuttaUid: 'kp1',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=kp1',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Khuddakapatha/Khuddakapatha.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Khuddakapatha/Kp-01.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '南传日常课诵庄严体 (Paritta Chanting)',
    meterName: '散文归依诵体（重读长元音 ā 与鼻音 ṃ）',
    segments: {
      'kp-1-1': 'kp1:2.1',
    },
  },
  'kp-5': {
    suttaId: 'kp-5',
    scSuttaUid: 'kp5',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=kp5',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Khuddakapatha/Khuddakapatha.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Khuddakapatha/Kp-05.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '南传护卫经课诵体 (Paritta Pathyāvaṭṭa)',
    meterName: 'Pathyāvaṭṭa 护卫经诗律（每半偈 16 音节）',
    segments: {
      'kp-5-1': 'kp5:3.1',
    },
  },
  'kp-9': {
    suttaId: 'kp-9',
    scSuttaUid: 'kp9',
    scVoicePageUrl: 'https://voice.suttacentral.net/scv/index.html#/sutta?search=kp9',
    abtPageUrl: 'https://www.ancient-buddhist-texts.net/Texts-and-Translations/Khuddakapatha/Khuddakapatha.htm',
    abtChapterMp3Url: 'https://www.ancient-buddhist-texts.net/Audio/Khuddakapatha/Kp-09.mp3',
    reciterName: 'Bhikkhu Ānandajoti / SC-Voice Aditi',
    reciterTradition: '古阿黎耶音步诗律 (Old Āryā / Gīti Meter)',
    meterName: 'Āryā/Gīti 音拍律（按音拍 Mattā 轻重吟诵）',
    segments: {
      'kp-9-1': 'kp9:2.2',
      'kp-9-2': 'kp9:8.1',
    },
  },
};

export interface SyllableProsody {
  syllable: string;
  weight: 'lahu' | 'garu'; // lahu = ⏑ (1 beat), garu = — (2 beats)
  symbol: '⏑' | '—';
  beats: 1 | 2;
}

/**
 * Analyzes a Pāli word into traditional syllables and determines whether each syllable
 * is Lahu (⏑, light, 1 beat) or Garu (—, heavy, 2 beats):
 * - Long vowels (ā, ī, ū, e, o) are always Garu (—)
 * - Short vowels (a, i, u) followed by niggahīta (ṃ) or a consonant cluster (2+ consonants, where aspirated kh/gh/ch/jh/ṭh/ḍh/th/dh/ph/bh count as 1 single consonant) are Garu (—)
 * - Otherwise Lahu (⏑)
 */
export function analyzeWordProsody(surface: string): {
  syllables: SyllableProsody[];
  pattern: string;
  totalBeats: number;
} {
  const clean = surface.replace(/[.,;!?'"“”‘’—-]/g, '').trim();
  if (!clean) {
    return { syllables: [], pattern: '', totalBeats: 1 };
  }

  // Replace aspirated digraphs with single placeholders so consonant cluster detection is exact
  const tokenized = clean
    .toLowerCase()
    .replace(/kh/g, 'K')
    .replace(/gh/g, 'G')
    .replace(/ch/g, 'C')
    .replace(/jh/g, 'J')
    .replace(/ṭh/g, 'T')
    .replace(/ḍh/g, 'D')
    .replace(/th/g, 'H')
    .replace(/dh/g, 'Z')
    .replace(/ph/g, 'P')
    .replace(/bh/g, 'B')
    .replace(/ḷh/g, 'L')
    .replace(/ṇh/g, 'N')
    .replace(/ñh/g, 'Y')
    .replace(/mh/g, 'M')
    .replace(/vh/g, 'V');

  const isVowel = (ch: string) => /^[aiuāīūeo]$/.test(ch);
  const isLongVowel = (ch: string) => /^[āīūeo]$/.test(ch);

  const restoreDigraphs = (str: string) =>
    str
      .replace(/K/g, 'kh')
      .replace(/G/g, 'gh')
      .replace(/C/g, 'ch')
      .replace(/J/g, 'jh')
      .replace(/T/g, 'ṭh')
      .replace(/D/g, 'ḍh')
      .replace(/H/g, 'th')
      .replace(/Z/g, 'dh')
      .replace(/P/g, 'ph')
      .replace(/B/g, 'bh')
      .replace(/L/g, 'ḷh')
      .replace(/N/g, 'ṇh')
      .replace(/Y/g, 'ñh')
      .replace(/M/g, 'mh')
      .replace(/V/g, 'vh');

  const syllables: SyllableProsody[] = [];
  let i = 0;
  const n = tokenized.length;

  while (i < n) {
    let onset = '';
    while (i < n && !isVowel(tokenized[i])) {
      onset += tokenized[i];
      i++;
    }
    if (i >= n) {
      if (syllables.length > 0) {
        syllables[syllables.length - 1].syllable += restoreDigraphs(onset);
      }
      break;
    }

    const vowel = tokenized[i];
    i++;

    // Count following consonants before next vowel
    let codaAndNextOnset = '';
    let j = i;
    while (j < n && !isVowel(tokenized[j])) {
      codaAndNextOnset += tokenized[j];
      j++;
    }

    const hasNiggahita = codaAndNextOnset.includes('ṃ') || codaAndNextOnset.includes('ṁ');
    const consonantCount = codaAndNextOnset.length;

    // Determine how many consonants belong to this syllable's coda
    let coda = '';
    if (j >= n) {
      // End of word
      coda = codaAndNextOnset;
      i = j;
    } else if (consonantCount >= 2) {
      coda = codaAndNextOnset.slice(0, 1);
      i += 1;
    }

    const isHeavy = isLongVowel(vowel) || hasNiggahita || consonantCount >= 2;
    syllables.push({
      syllable: restoreDigraphs(onset + vowel + coda),
      weight: isHeavy ? 'garu' : 'lahu',
      symbol: isHeavy ? '—' : '⏑',
      beats: isHeavy ? 2 : 1,
    });
  }

  const totalBeats = Math.max(
    1,
    syllables.reduce((sum, s) => sum + s.beats, 0)
  );
  return {
    syllables,
    pattern: syllables.map((s) => s.symbol).join(' '),
    totalBeats,
  };
}

let htmlAudio: HTMLAudioElement | null = null;
let speakTimeout: number | null = null;
let tokenTimers: number[] = [];
let cachedVoices: SpeechSynthesisVoice[] = [];
const scSegmentUrlCache: Map<string, string> = new Map();
const currentListeners: Set<(playing: boolean, label?: string, sourceTag?: string) => void> =
  new Set();

let preferredVoiceURI: string | null = null;
let preferredChannel: AudioChannelMode = 'auto';

export function getPreferredAudioSettings() {
  return {
    channel: preferredChannel,
    voiceURI: preferredVoiceURI,
  };
}

export function setPreferredAudioSettings(settings: {
  channel?: AudioChannelMode;
  voiceURI?: string | null;
}) {
  if (settings.channel !== undefined) preferredChannel = settings.channel;
  if (settings.voiceURI !== undefined) preferredVoiceURI = settings.voiceURI;
}

export function getAvailableSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) cachedVoices = v;
  return cachedVoices;
}

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

export function subscribeAudioStatus(
  cb: (playing: boolean, label?: string, sourceTag?: string) => void
): () => void {
  currentListeners.add(cb);
  return () => {
    currentListeners.delete(cb);
  };
}

function notifyAudioStatus(playing: boolean, label?: string, sourceTag?: string) {
  currentListeners.forEach((cb) => cb(playing, label, sourceTag));
}

function clearTokenTimers() {
  tokenTimers.forEach((id) => window.clearTimeout(id));
  tokenTimers = [];
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
  if (preferredVoiceURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredVoiceURI);
    if (chosen) return chosen;
  }
  // Priority 1: Hindi / Sanskrit / Indonesian / Thai / Italian / Spanish (pure monophthong vowels closest to Pāli)
  const priorityLangs = [
    'hi-in',
    'sa-in',
    'id-id',
    'th-th',
    'it-it',
    'es-es',
    'en-in',
    'en-gb',
    'en-us',
  ];
  for (const langPrefix of priorityLangs) {
    const match = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix)
    );
    if (match) return match;
  }
  return voices.find((v) => v.default) ?? voices[0];
}

export function stopPaliAudio(): void {
  clearTokenTimers();
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

/**
 * Schedules word-by-word karaoke highlighting callbacks proportional to each Pāli word's Mora/Mattā beats.
 */
function scheduleMoraWordHighlighting(
  tokens: string[],
  totalDurationMs: number,
  onTokenIndexChange?: (tokenIdx: number | null) => void
) {
  clearTokenTimers();
  if (!onTokenIndexChange || tokens.length === 0) return;

  const weights = tokens.map((t) => analyzeWordProsody(t).totalBeats);
  const totalBeats = Math.max(
    1,
    weights.reduce((a, b) => a + b, 0)
  );

  let accumulatedBeats = 0;
  onTokenIndexChange(0);

  tokens.forEach((_, idx) => {
    if (idx === 0) return;
    const delayMs = Math.round((accumulatedBeats / totalBeats) * totalDurationMs);
    const timerId = window.setTimeout(() => {
      onTokenIndexChange(idx);
    }, delayMs);
    tokenTimers.push(timerId);
    accumulatedBeats += weights[idx];
  });
}

/**
 * Attempts to resolve a real SuttaCentral Voice MP3 stream URL for a given Bilara segment.
 */
async function resolveScVoiceSegmentAudioUrl(
  scSuttaUid: string,
  scSegmentId: string
): Promise<string | null> {
  const cacheKey = `${scSuttaUid}/${scSegmentId}`;
  if (scSegmentUrlCache.has(cacheKey)) {
    return scSegmentUrlCache.get(cacheKey)!;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1800);
    const metaUrl = `https://api.sc-voice.net/scv/play/segment/${encodeURIComponent(
      scSuttaUid
    )}/pli/ms/${encodeURIComponent(scSegmentId)}/aditi`;
    const res = await fetch(metaUrl, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = (await res.json()) as { audio?: { pali?: string } };
    const guid = data?.audio?.pali;
    if (guid) {
      const audioStreamUrl = `https://api.sc-voice.net/scv/audio/${encodeURIComponent(
        scSuttaUid
      )}/pli/ms/aditi/${encodeURIComponent(guid)}`;
      scSegmentUrlCache.set(cacheKey, audioStreamUrl);
      return audioStreamUrl;
    }
  } catch {
    // Offline or CORS blocked — smoothly fall back
  }
  return null;
}

export function speakPaliText(
  paliText: string,
  options?: {
    rate?: number;
    audioUrl?: string;
    suttaId?: string;
    sentenceId?: string;
    tokens?: string[];
    onTokenHighlight?: (tokenIdx: number | null) => void;
    onSourceResolved?: (sourceLabel: string) => void;
    onEnd?: () => void;
  }
): void {
  const rate = options?.rate ?? 1.0;
  stopPaliAudio();
  notifyAudioStatus(true, paliText);

  const tokens =
    options?.tokens ??
    paliText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

  // Estimate natural chanting duration from Pāli Mora/Mattā beats (~360ms per beat at 1.0x)
  const totalBeats = tokens.reduce((sum, t) => sum + analyzeWordProsody(t).totalBeats, 0);
  const estimatedDurationMs = Math.max(1600, Math.round((totalBeats * 340) / rate));

  const playHtmlStream = (url: string, sourceLabel: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.playbackRate = rate;
        htmlAudio = audio;

        audio.onloadedmetadata = () => {
          const actualMs =
            audio.duration && Number.isFinite(audio.duration)
              ? (audio.duration * 1000) / rate
              : estimatedDurationMs;
          scheduleMoraWordHighlighting(tokens, actualMs, options?.onTokenHighlight);
        };

        audio.onended = () => {
          clearTokenTimers();
          options?.onTokenHighlight?.(null);
          htmlAudio = null;
          notifyAudioStatus(false);
          options?.onEnd?.();
        };

        audio.onerror = () => {
          htmlAudio = null;
          resolve(false);
        };

        audio
          .play()
          .then(() => {
            options?.onSourceResolved?.(sourceLabel);
            notifyAudioStatus(true, paliText, sourceLabel);
            scheduleMoraWordHighlighting(tokens, estimatedDurationMs, options?.onTokenHighlight);
            resolve(true);
          })
          .catch(() => {
            htmlAudio = null;
            resolve(false);
          });
      } catch {
        resolve(false);
      }
    });
  };

  void (async () => {
    // 1. If explicit audioUrl is passed
    if (options?.audioUrl && preferredChannel !== 'local-tts') {
      const ok = await playHtmlStream(options.audioUrl, '真人诵经录音 MP3');
      if (ok) return;
    }

    // 2. If Sutta & Sentence have SuttaCentral Voice Bilara segment mapping and channel is 'auto' or 'sc-voice'
    if (
      options?.suttaId &&
      options?.sentenceId &&
      preferredChannel !== 'local-tts'
    ) {
      const meta = SUTTA_AUDIO_CATALOG[options.suttaId];
      const scSegmentId = meta?.segments[options.sentenceId];
      if (meta && scSegmentId) {
        const scAudioUrl = await resolveScVoiceSegmentAudioUrl(meta.scSuttaUid, scSegmentId);
        if (scAudioUrl) {
          const ok = await playHtmlStream(scAudioUrl, 'SuttaCentral Voice 原声');
          if (ok) return;
        }
      }
    }

    // 3. Local Offline Pāli Prosody Voice Engine with real-time Mora word highlighting
    speakTimeout = window.setTimeout(() => {
      speakTimeout = null;
      options?.onSourceResolved?.('本地巴利音律跟读引擎 (Mora 节拍同步)');
      scheduleMoraWordHighlighting(tokens, estimatedDurationMs, options?.onTokenHighlight);
      speakWithHumanTTS(paliText, rate, () => {
        clearTokenTimers();
        options?.onTokenHighlight?.(null);
        options?.onEnd?.();
      });
    }, 35);
  })();
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

    // Measured cadence for clear Pāli syllable articulation
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
    const estimatedMs = Math.max(2000, Math.round((paliText.length * 95) / Math.max(0.6, rate)));
    speakTimeout = window.setTimeout(finish, estimatedMs);
  } catch {
    notifyAudioStatus(false);
    onEnd?.();
  }
}
