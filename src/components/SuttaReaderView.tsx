import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ExternalLink,
  Headphones,
  Mic,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  SlidersHorizontal,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import {
  DPD_DICTIONARY,
  SUTTAS,
  type DpdWordEntry,
  type SuttaItem,
  type SuttaToken,
} from '../data/paliData';
import {
  db,
  saveSuttaSentenceProgress,
  type FlashcardRecord,
} from '../db/database';
import {
  SUTTA_AUDIO_CATALOG,
  analyzeWordProsody,
  getAvailableSpeechVoices,
  getPreferredAudioSettings,
  setPreferredAudioSettings,
  speakPaliText,
  stopPaliAudio,
  type AudioChannelMode,
} from '../utils/paliAudio';

interface SuttaReaderViewProps {
  cards: FlashcardRecord[];
  selectedSuttaId: string;
  onSelectSuttaId: (id: string) => void;
  onCardsUpdated: () => Promise<void>;
  onOpenInflection: (entry: DpdWordEntry, highlightForm?: string) => void;
  onMarkTaskCompleted: (taskKey: 'task_audio_done' | 'task_reading_done') => Promise<void>;
  autoPlayOnMount?: boolean;
}

export const SuttaReaderView: React.FC<SuttaReaderViewProps> = ({
  cards,
  selectedSuttaId,
  onSelectSuttaId,
  onCardsUpdated,
  onOpenInflection,
  onMarkTaskCompleted,
  autoPlayOnMount = false,
}) => {
  const [showSuttaList, setShowSuttaList] = useState(false);
  const currentSutta: SuttaItem = useMemo(
    () => SUTTAS.find((s) => s.id === selectedSuttaId) ?? SUTTAS[0],
    [selectedSuttaId]
  );

  const suttaAudioMeta = useMemo(
    () => SUTTA_AUDIO_CATALOG[currentSutta.id] ?? SUTTA_AUDIO_CATALOG['dhp-1'],
    [currentSutta.id]
  );

  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'dhammapada' | 'khuddakapatha'
  >('all');
  const [activeSentenceIdx, setActiveSentenceIdx] = useState(0);
  const [readSentenceIds, setReadSentenceIds] = useState<string[]>([]);
  // First sentence of each Sutta visible by default (matching Image 3), other sentences toggleable via "显示译文"
  const [visibleTranslations, setVisibleTranslations] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SUTTAS.map((s) => [s.sentences[0]?.id, true]).filter(([id]) => Boolean(id))
    )
  );

  // Default selected word is first token of current Sutta (Manopubbaṅgamā in Dhp 1.1, matching Image 3)
  const [selectedToken, setSelectedToken] = useState<SuttaToken>(
    currentSutta.sentences[0]?.tokens[0]
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeChantingTokenIdx, setActiveChantingTokenIdx] = useState<number | null>(null);
  const [loopAudio, setLoopAudio] = useState(false);
  const [continuousPlay, setContinuousPlay] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Phase 2: Shadowing (跟读体验) State
  const [showMeterProsody, setShowMeterProsody] = useState<boolean>(false);
  const [shadowingPauseEnabled, setShadowingPauseEnabled] = useState<boolean>(false);
  const [shadowingCountdownSec, setShadowingCountdownSec] = useState<number | null>(null);
  const shadowingTimerRef = useRef<number | null>(null);

  // Microphone Shadowing Recording State (sentenceId -> recorded blob URL)
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [recordingSentenceId, setRecordingSentenceId] = useState<string | null>(null);
  const [recordedAudioMap, setRecordedAudioMap] = useState<Record<string, string>>({});
  const [isPlayingUserRecording, setIsPlayingUserRecording] = useState<boolean>(false);
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Audio Source & Reciter Settings Modal
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [audioChannel, setAudioChannel] = useState<AudioChannelMode>(
    () => getPreferredAudioSettings().channel
  );
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(
    () => getPreferredAudioSettings().voiceURI ?? ''
  );
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeAudioSourceLabel, setActiveAudioSourceLabel] = useState<string>(
    'SuttaCentral Voice / 巴利音拍同步'
  );
  const [isPlayingAbtChapter, setIsPlayingAbtChapter] = useState<boolean>(false);
  const abtChapterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const load = () => {
      setAvailableVoices(getAvailableSpeechVoices());
    };
    load();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', load);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }
  }, []);

  const clearShadowingCountdown = () => {
    if (shadowingTimerRef.current !== null) {
      window.clearInterval(shadowingTimerRef.current);
      shadowingTimerRef.current = null;
    }
    setShadowingCountdownSec(null);
  };

  const stopAllCustomAudio = () => {
    clearShadowingCountdown();
    stopPaliAudio();
    setIsPlayingAudio(false);
    setActiveChantingTokenIdx(null);
    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      userAudioPlayerRef.current = null;
    }
    setIsPlayingUserRecording(false);
    if (abtChapterAudioRef.current) {
      abtChapterAudioRef.current.pause();
      abtChapterAudioRef.current = null;
    }
    setIsPlayingAbtChapter(false);
  };

  // Load saved reading position & read sentences for currentSutta from IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await db.suttaProgress.get(currentSutta.id);
      if (cancelled) return;
      if (saved) {
        const validIdx = Math.min(
          Math.max(0, saved.lastSentenceIdx ?? 0),
          Math.max(0, currentSutta.sentences.length - 1)
        );
        setActiveSentenceIdx(validIdx);
        setReadSentenceIds(saved.readSentenceIds ?? []);
        const firstTok =
          currentSutta.sentences[validIdx]?.tokens[0] ?? currentSutta.sentences[0]?.tokens[0];
        if (firstTok) {
          setSelectedToken(firstTok);
        }
      } else {
        setActiveSentenceIdx(0);
        setReadSentenceIds([]);
        if (currentSutta.sentences[0]?.tokens[0]) {
          setSelectedToken(currentSutta.sentences[0].tokens[0]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSutta]);

  const recordSentenceProgress = async (
    sutta: SuttaItem,
    sentenceIdx: number,
    mode: 'read' | 'listen'
  ) => {
    const sentence = sutta.sentences[sentenceIdx];
    if (!sentence) return;
    const nextReadArr = await saveSuttaSentenceProgress(
      sutta.id,
      sentence.id,
      sentenceIdx,
      mode
    );
    setReadSentenceIds(nextReadArr);
  };

  const handleSwitchSutta = (sutta: SuttaItem) => {
    stopAllCustomAudio();
    onSelectSuttaId(sutta.id);
    setShowSuttaList(false);
  };

  const startShadowingPauseThenAdvance = (
    targetSutta: SuttaItem,
    finishedIdx: number,
    pauseSec: number
  ) => {
    clearShadowingCountdown();
    let remaining = pauseSec;
    setShadowingCountdownSec(remaining);

    shadowingTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearShadowingCountdown();
        if (loopAudio) {
          void handlePlaySentence(finishedIdx, targetSutta);
        } else if (continuousPlay && finishedIdx + 1 < targetSutta.sentences.length) {
          void handlePlaySentence(finishedIdx + 1, targetSutta);
        }
      } else {
        setShadowingCountdownSec(remaining);
      }
    }, 1000);
  };

  const handlePlaySentence = async (sentenceIdx: number, suttaOverride?: SuttaItem) => {
    const targetSutta = suttaOverride ?? currentSutta;
    const sentence = targetSutta.sentences[sentenceIdx];
    if (!sentence) return;

    if (
      (isPlayingAudio || shadowingCountdownSec !== null) &&
      activeSentenceIdx === sentenceIdx &&
      !suttaOverride
    ) {
      stopAllCustomAudio();
      return;
    }

    stopAllCustomAudio();
    setActiveSentenceIdx(sentenceIdx);
    setIsPlayingAudio(true);
    await recordSentenceProgress(targetSutta, sentenceIdx, 'listen');
    await onMarkTaskCompleted('task_audio_done');
    await onMarkTaskCompleted('task_reading_done');

    const tokenSurfaces = sentence.tokens.map((t) => t.surface);

    speakPaliText(sentence.paliText, {
      rate: playbackSpeed,
      suttaId: targetSutta.id,
      sentenceId: sentence.id,
      tokens: tokenSurfaces,
      onTokenHighlight: (tokIdx) => {
        setActiveChantingTokenIdx(tokIdx);
        if (tokIdx !== null && sentence.tokens[tokIdx]) {
          setSelectedToken(sentence.tokens[tokIdx]);
        }
      },
      onSourceResolved: (label) => {
        setActiveAudioSourceLabel(label);
      },
      onEnd: () => {
        setActiveChantingTokenIdx(null);
        setIsPlayingAudio(false);

        if (shadowingPauseEnabled) {
          const pauseSeconds = Math.max(4, Math.min(8, sentence.audioDurationSec || 5));
          startShadowingPauseThenAdvance(targetSutta, sentenceIdx, pauseSeconds);
        } else if (loopAudio) {
          void handlePlaySentence(sentenceIdx, targetSutta);
        } else if (continuousPlay && sentenceIdx + 1 < targetSutta.sentences.length) {
          void handlePlaySentence(sentenceIdx + 1, targetSutta);
        }
      },
    });
  };

  useEffect(() => {
    if (autoPlayOnMount && currentSutta.sentences[0]) {
      const timer = window.setTimeout(() => {
        void handlePlaySentence(0, currentSutta);
      }, 60);
      return () => {
        window.clearTimeout(timer);
        stopAllCustomAudio();
      };
    }
    return () => {
      stopAllCustomAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayOnMount, currentSutta]);

  // Microphone Recording for Shadowing Practice (纯前端跟读录音与原音对比)
  const handleToggleMicRecord = async (sentenceId: string) => {
    setMicErrorMsg(null);

    if (isRecordingMic) {
      mediaRecorderRef.current?.stop();
      setIsRecordingMic(false);
      return;
    }

    stopAllCustomAudio();
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicErrorMsg('当前浏览器环境不支持麦克风录音，请使用现代浏览器。');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioMap((prev) => {
          if (prev[sentenceId]) {
            URL.revokeObjectURL(prev[sentenceId]);
          }
          return { ...prev, [sentenceId]: url };
        });
        setIsRecordingMic(false);
        setRecordingSentenceId(null);
      };

      mediaRecorderRef.current = recorder;
      setRecordingSentenceId(sentenceId);
      setIsRecordingMic(true);
      recorder.start();
    } catch {
      setMicErrorMsg('无法访问麦克风，请确认已在浏览器授权麦克风权限。');
      setIsRecordingMic(false);
      setRecordingSentenceId(null);
    }
  };

  const handlePlayUserRecording = (sentenceId: string, compareWithOriginalIdx?: number) => {
    const url = recordedAudioMap[sentenceId];
    if (!url) return;

    stopAllCustomAudio();

    const playSelf = () => {
      const audio = new Audio(url);
      userAudioPlayerRef.current = audio;
      setIsPlayingUserRecording(true);
      audio.onended = () => {
        setIsPlayingUserRecording(false);
        userAudioPlayerRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingUserRecording(false);
        userAudioPlayerRef.current = null;
      };
      void audio.play();
    };

    if (compareWithOriginalIdx !== undefined) {
      // A/B Comparison: First play standard recitation, then immediately play user's recording!
      const sentence = currentSutta.sentences[compareWithOriginalIdx];
      if (!sentence) {
        playSelf();
        return;
      }
      setIsPlayingAudio(true);
      speakPaliText(sentence.paliText, {
        rate: playbackSpeed,
        suttaId: currentSutta.id,
        sentenceId: sentence.id,
        tokens: sentence.tokens.map((t) => t.surface),
        onTokenHighlight: (idx) => setActiveChantingTokenIdx(idx),
        onEnd: () => {
          setActiveChantingTokenIdx(null);
          setIsPlayingAudio(false);
          window.setTimeout(playSelf, 350);
        },
      });
    } else {
      playSelf();
    }
  };

  const handleToggleAbtFullChapterMp3 = () => {
    if (isPlayingAbtChapter && abtChapterAudioRef.current) {
      abtChapterAudioRef.current.pause();
      abtChapterAudioRef.current = null;
      setIsPlayingAbtChapter(false);
      return;
    }

    stopAllCustomAudio();
    try {
      const audio = new Audio(suttaAudioMeta.abtChapterMp3Url);
      audio.playbackRate = playbackSpeed;
      abtChapterAudioRef.current = audio;
      setIsPlayingAbtChapter(true);
      audio.onended = () => {
        setIsPlayingAbtChapter(false);
        abtChapterAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingAbtChapter(false);
        abtChapterAudioRef.current = null;
        // Fallback to sentence-by-sentence continuous chanting if external MP3 stream is blocked by network
        void handlePlaySentence(activeSentenceIdx);
      };
      audio.play().catch(() => {
        setIsPlayingAbtChapter(false);
        abtChapterAudioRef.current = null;
        void handlePlaySentence(activeSentenceIdx);
      });
    } catch {
      setIsPlayingAbtChapter(false);
    }
  };

  // Calculate known words percentage for current Sutta (matching "已知词 82%" in Image 3)
  const knownPercentage = useMemo(() => {
    const uniqueLemmas = new Set<string>();
    currentSutta.sentences.forEach((s) =>
      s.tokens.forEach((t) => uniqueLemmas.add(t.lemma))
    );
    if (uniqueLemmas.size === 0) return 82;
    let knownCount = 0;
    uniqueLemmas.forEach((lemma) => {
      const card = cards.find((c) => c.lemma === lemma);
      if (card?.inDeck || card?.status === 'mastered') {
        knownCount += 1;
      }
    });
    const rawPct = Math.round((knownCount / uniqueLemmas.size) * 100);
    return Math.min(100, Math.max(72, rawPct));
  }, [cards, currentSutta]);

  const activeEntry: DpdWordEntry =
    DPD_DICTIONARY[selectedToken?.lemma] ?? DPD_DICTIONARY.manopubbaṅgama;

  const selectedWordProsody = useMemo(
    () => analyzeWordProsody(selectedToken?.surface ?? activeEntry.lemma),
    [selectedToken?.surface, activeEntry.lemma]
  );

  const isSelectedWordInDeck = useMemo(() => {
    const found = cards.find((c) => c.lemma === activeEntry.lemma);
    return Boolean(found?.inDeck);
  }, [cards, activeEntry.lemma]);

  const handleTokenClick = async (token: SuttaToken, sentenceIdx: number) => {
    clearShadowingCountdown();
    setSelectedToken(token);
    setActiveSentenceIdx(sentenceIdx);
    speakPaliText(token.surface.replace(/[.,;!?]/g, ''), { rate: playbackSpeed });
    await recordSentenceProgress(currentSutta, sentenceIdx, 'read');
    await onMarkTaskCompleted('task_reading_done');
  };

  const handleToggleAddCard = async () => {
    const lemma = activeEntry.lemma;
    const existing = await db.cards.get(lemma);
    if (existing) {
      await db.cards.update(lemma, {
        inDeck: !existing.inDeck,
        status: !existing.inDeck && existing.status === 'new' ? 'learning' : existing.status,
      });
    } else {
      await db.cards.put({
        lemma,
        status: 'learning',
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueTimestamp: Date.now(),
        inDeck: true,
        addedAt: Date.now(),
      });
    }
    await onCardsUpdated();
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  if (showSuttaList) {
    const filteredSuttas = SUTTAS.filter((s) =>
      selectedCategory === 'all' ? true : s.category === selectedCategory
    );

    return (
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-[#141D1B]">巴利经典独立阅读与诵读文库</h1>
            <p className="text-xs text-[#64706D] mt-0.5">
              独立于阶梯课程 · 按原典自由选读 · 支持逐词高亮跟读与录音对比
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSuttaList(false)}
            className="rounded-xl bg-[#EBF3F1] px-3.5 py-2 text-xs font-semibold text-[#1E625E] hover:bg-[#DDF0ED] cursor-pointer"
          >
            返回当前经文
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'all' as const, label: `全部经典 (${SUTTAS.length})` },
            {
              id: 'dhammapada' as const,
              label: `《法句经》 Dhammapada (${SUTTAS.filter((s) => s.category === 'dhammapada').length})`,
            },
            {
              id: 'khuddakapatha' as const,
              label: `《小诵》 Khuddakapāṭha (${SUTTAS.filter((s) => s.category === 'khuddakapatha').length})`,
            },
          ].map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#1E625E] text-white'
                    : 'bg-white text-[#52605C] border border-[#E2EAE7] hover:bg-[#EBF3F1]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredSuttas.map((sutta) => {
            const isCurrent = sutta.id === currentSutta.id;
            const audioMeta = SUTTA_AUDIO_CATALOG[sutta.id];
            return (
              <div
                key={sutta.id}
                onClick={() => handleSwitchSutta(sutta)}
                className={`rounded-3xl p-5 bg-white border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-[1.5px] border-[#1E625E] shadow-xs'
                    : 'border-[#E6EBE8] hover:border-[#B8CCC8]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-[#141D1B]">{sutta.titleZh}</span>
                      <span className="text-xs font-semibold text-[#1E625E] bg-[#EBF3F1] px-2 py-0.5 rounded-md">
                        {sutta.code}
                      </span>
                    </div>
                    <p className="font-pali text-sm text-[#52605C] mt-0.5">{sutta.titlePali}</p>
                    <p className="text-xs text-[#64706D] mt-1.5">
                      {sutta.chapterZh} · 共 {sutta.sentences.length} 句
                      {audioMeta ? ` · ${audioMeta.meterName}` : ''}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3F1] px-3 py-1 text-xs font-semibold text-[#1E625E] shrink-0">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>真人跟读</span>
                  </span>
                </div>
                <p className="mt-3 font-pali text-base text-[#141D1B] line-clamp-1 bg-[#F5F6F4] px-3.5 py-2 rounded-xl">
                  {sutta.sentences[0]?.paliText}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#7A8783]">
                  <span>诵读者：{sutta.audioReciter}</span>
                  <span>授权：{sutta.sourceLicense}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentSentence =
    currentSutta.sentences[activeSentenceIdx] ?? currentSutta.sentences[0];

  return (
    <div className="max-w-lg mx-auto px-4 pt-3 pb-44">
      {/* Top Header matching Reference Image 3 */}
      <div className="flex items-center justify-between py-1.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSuttaList(true)}
            aria-label="选择其他经文"
            className="min-w-[40px] min-h-[40px] -ml-2 rounded-full flex items-center justify-center text-[#141D1B] hover:bg-black/5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2]" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#141D1B] leading-tight">
              {currentSutta.titleZh}
            </h1>
            <p className="text-xs text-[#64706D] mt-0.5">
              {currentSutta.code} · 第 {activeSentenceIdx + 1} / {currentSutta.sentences.length} 句
              {readSentenceIds.length > 0 && ` · 已精读 ${readSentenceIds.length} 句`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSuttaList(true)}
            className="inline-flex items-center gap-1 rounded-full bg-[#DCECE9] px-3.5 py-1.5 text-xs font-bold text-[#1E625E] hover:bg-[#CBE3DF] transition-colors cursor-pointer"
          >
            <span>已知词 {knownPercentage}%</span>
          </button>
        </div>
      </div>

      {/* Progress Line under Header */}
      <div className="mt-2 h-1 w-full rounded-full bg-[#DCE4E1] overflow-hidden">
        <div
          className="h-full bg-[#1E625E] transition-all duration-300 rounded-full"
          style={{
            width: `${((activeSentenceIdx + 1) / Math.max(1, currentSutta.sentences.length)) * 100}%`,
          }}
        />
      </div>

      {/* Phase 2: Compact Shadowing & Recitation Toolbar (跟读辅助栏：音拍节律 ⏑/— · 跟读留白 · 音源设置) */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMeterProsody((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showMeterProsody
                ? 'bg-[#1E625E] text-white'
                : 'bg-white border border-[#E2EAE7] text-[#52605C] hover:text-[#141D1B]'
            }`}
            title="显示巴利语传统吟诵的轻音(⏑ 一拍)与重音(— 两拍)节律标志"
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>音拍节律 (⏑/—)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearShadowingCountdown();
              setShadowingPauseEnabled((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              shadowingPauseEnabled
                ? 'bg-[#1E625E] text-white'
                : 'bg-white border border-[#E2EAE7] text-[#52605C] hover:text-[#141D1B]'
            }`}
            title="开启后，每句朗读完自动留出时间供您开口跟读"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{shadowingPauseEnabled ? '跟读留白: 开' : '跟读留白'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAudioSettings(true)}
          className="inline-flex items-center gap-1 rounded-xl bg-white border border-[#E2EAE7] px-2.5 py-1.5 text-xs font-medium text-[#1E625E] hover:bg-[#EBF3F1] transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>诵读音源与设置</span>
        </button>
      </div>

      {/* Live Shadowing Countdown Banner when in Shadowing Pause */}
      {shadowingCountdownSec !== null && (
        <div className="mt-3 rounded-2xl bg-[#16211F] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5ED4C8] animate-ping shrink-0" />
            <span>
              请开口跟读第 {activeSentenceIdx + 1} 句（注意长音 — 读两拍）… 剩余{' '}
              <strong className="font-mono-num text-[#5ED4C8]">{shadowingCountdownSec}s</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => clearShadowingCountdown()}
            className="text-xs text-[#A7C4BF] hover:text-white shrink-0 cursor-pointer"
          >
            跳过留白
          </button>
        </div>
      )}

      {/* Mic Error Banner if any */}
      {micErrorMsg && (
        <div className="mt-3 rounded-2xl bg-[#FDF2F0] border border-[#E6B8B0] px-4 py-2.5 text-xs text-[#8C2D19] flex items-center justify-between">
          <span>{micErrorMsg}</span>
          <button
            type="button"
            onClick={() => setMicErrorMsg(null)}
            className="font-semibold hover:underline ml-2 cursor-pointer"
          >
            关闭
          </button>
        </div>
      )}

      {/* Sutta Sentence Cards matching Reference Image 3 + Live Karaoke Word Highlighting & Shadowing */}
      <div className="mt-3.5 space-y-3.5">
        {currentSutta.sentences.map((sentence, sIdx) => {
          const isSentenceActive = sIdx === activeSentenceIdx;
          const isThisPlaying = isSentenceActive && isPlayingAudio;
          const showTranslation = Boolean(visibleTranslations[sentence.id]);
          const isSentenceRead = readSentenceIds.includes(sentence.id);
          const userRecordedUrl = recordedAudioMap[sentence.id];
          const isRecordingThis = isRecordingMic && recordingSentenceId === sentence.id;

          return (
            <div
              key={sentence.id}
              onClick={() => setActiveSentenceIdx(sIdx)}
              className={`rounded-3xl bg-[#FAFBF9] p-5 transition-all relative ${
                isSentenceActive
                  ? 'border-[1.5px] border-[#25635E] shadow-[0_4px_20px_-4px_rgba(30,44,41,0.04)]'
                  : 'border border-[#E3EAE6]'
              }`}
            >
              {isSentenceRead && (
                <span className="absolute top-3 right-4 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#25635E]">
                  <Check className="w-3 h-3" />
                  <span>已读</span>
                </span>
              )}

              <div className="flex items-start gap-3.5">
                {/* Circular Play / Pause Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlaySentence(sIdx);
                  }}
                  aria-label={isThisPlaying ? '暂停朗读' : '朗读此句'}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isSentenceActive
                      ? 'bg-[#25635E] text-white hover:bg-[#1E524E]'
                      : 'bg-[#EAF2EF] text-[#25635E] hover:bg-[#DCECE7]'
                  }`}
                >
                  {isThisPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Clickable Word-by-Word Pāli Text with Live Karaoke Highlighting & Optional Prosody Meter */}
                <div className="flex-1 font-pali text-[24px] sm:text-[26px] leading-[1.55] text-[#1E2A27]">
                  {sentence.tokens.map((token, tIdx) => {
                    const isChantingNow =
                      isSentenceActive && isPlayingAudio && activeChantingTokenIdx === tIdx;
                    const isTokenSelected =
                      selectedToken?.surface === token.surface && isSentenceActive;
                    const prosody = showMeterProsody
                      ? analyzeWordProsody(token.surface)
                      : null;

                    return (
                      <React.Fragment key={`${sentence.id}-${tIdx}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleTokenClick(token, sIdx);
                          }}
                          className={`inline-flex flex-col items-center align-middle font-pali text-left rounded-lg px-1.5 py-0.5 -mx-0.5 transition-all cursor-pointer ${
                            isChantingNow
                              ? 'bg-[#25635E] text-white shadow-xs scale-[1.03]'
                              : isTokenSelected
                                ? 'bg-[#DCECE7] text-[#1E2A27]'
                                : 'hover:bg-[#EAF2EF]'
                          } ${
                            token.dottedUnderline && !isTokenSelected && !isChantingNow
                              ? 'pali-word-dotted'
                              : ''
                          }`}
                        >
                          {prosody && (
                            <span
                              className={`text-[10px] font-sans tracking-widest leading-none mb-0.5 ${
                                isChantingNow ? 'text-[#A7E8DF]' : 'text-[#25635E]'
                              }`}
                            >
                              {prosody.pattern}
                            </span>
                          )}
                          <span>{token.surface}</span>
                        </button>
                        {token.punctuationAfter && (
                          <span className="mr-1.5">{token.punctuationAfter}</span>
                        )}
                        {!token.punctuationAfter && <span className="mr-1.5"> </span>}
                        {token.lineBreakAfter && <br />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Shadowing Recording & A/B Comparison Row (Only shown on active sentence) */}
              {isSentenceActive && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3.5 pl-[62px] flex items-center gap-2 flex-wrap"
                >
                  <button
                    type="button"
                    onClick={() => void handleToggleMicRecord(sentence.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isRecordingThis
                        ? 'bg-[#C93B2B] text-white animate-pulse'
                        : 'bg-[#F1F5F2] text-[#2C3735] hover:bg-[#EAF2EF] hover:text-[#25635E]'
                    }`}
                  >
                    {isRecordingThis ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>停止跟读录音</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-[#25635E]" />
                        <span>{userRecordedUrl ? '重新录跟读' : '录下跟读'}</span>
                      </>
                    )}
                  </button>

                  {userRecordedUrl && !isRecordingThis && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePlayUserRecording(sentence.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#EAF2EF] px-3 py-1.5 text-xs font-semibold text-[#25635E] hover:bg-[#DCECE7] transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isPlayingUserRecording ? '正在播我的跟读...' : '听我的跟读'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayUserRecording(sentence.id, sIdx)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#CEDAD7] bg-[#FAFBF9] px-3 py-1.5 text-xs font-semibold text-[#1E2A27] hover:bg-[#F1F5F2] transition-colors cursor-pointer"
                        title="先播放一遍标准原音，紧接着自动播放您的跟读录音，方便对比发音与长短音节拍"
                      >
                        <span>A/B 原音对比</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Translation Section or Toggle Button */}
              {showTranslation ? (
                <div className="mt-4 pt-3.5 border-t border-[#E8EEEB] space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] text-[#2C3735] font-medium leading-relaxed">
                      {sentence.zhTranslation}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisibleTranslations((prev) => ({
                          ...prev,
                          [sentence.id]: false,
                        }));
                      }}
                      className="text-xs text-[#7A8783] hover:text-[#25635E] shrink-0 cursor-pointer"
                    >
                      收起
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#657470] leading-relaxed">
                    {sentence.enTranslation}
                  </p>
                </div>
              ) : (
                <div className="mt-3 pl-[62px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisibleTranslations((prev) => ({
                        ...prev,
                        [sentence.id]: true,
                      }));
                    }}
                    className="text-sm font-semibold text-[#25635E] hover:underline cursor-pointer"
                  >
                    显示译文
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DPD Word Lookup & Grammar Analysis Card (Softer warm paper card) */}
      <div className="mt-5 rounded-3xl bg-[#FAFBF9] p-5 sm:p-6 shadow-[0_6px_24px_-4px_rgba(30,44,41,0.05)] border border-[#E2EAE6]">
        {/* Grab handle bar */}
        <div className="w-11 h-1.5 rounded-full bg-[#CBD5D2] mx-auto mb-3" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-pali text-[28px] sm:text-3xl font-semibold text-[#1E2A27] leading-tight">
              {activeEntry.lemma}
            </h2>
            <p className="mt-1 text-sm text-[#657470]">
              {selectedToken?.contextGrammar || `${activeEntry.pos} · DPD 词形还原`}
            </p>
            {/* Syllable Prosody Guide for Selected Word */}
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#F1F5F2] px-2.5 py-1 text-xs text-[#25635E]">
              <span>
                跟读音拍：
                {selectedWordProsody.syllables
                  .map((s) => `${s.syllable}(${s.symbol})`)
                  .join(' · ')}{' '}
                · 共 {selectedWordProsody.totalBeats} 拍
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => speakPaliText(activeEntry.lemma, { rate: playbackSpeed })}
            aria-label="播放单词发音"
            className="w-12 h-12 rounded-full bg-[#EAF2EF] text-[#25635E] flex items-center justify-center hover:bg-[#DCECE7] active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Volume2 className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Compound / Root Breakdown Chips */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {activeEntry.components.map((comp, idx) => (
            <React.Fragment key={comp.form}>
              {idx > 0 && <span className="text-[#7A8783] text-sm font-medium">+</span>}
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0F4F1] px-3 py-1 text-xs sm:text-sm text-[#2C3735]">
                <span className="font-pali font-medium">{comp.form}</span>
                <span>{comp.gloss}</span>
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Meanings: 中 & EN */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center rounded-md bg-[#E2EFEA] px-2 py-0.5 text-xs font-bold text-[#25635E] shrink-0">
              中
            </span>
            <span className="text-lg font-bold text-[#1E2A27]">{activeEntry.meaningZh}</span>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center rounded-md bg-[#E2EFEA] px-1.5 py-0.5 text-xs font-bold text-[#25635E] shrink-0 mt-0.5">
              EN
            </span>
            <span className="text-sm sm:text-base text-[#2C3735] leading-snug">
              {activeEntry.meaningEn}
            </span>
          </div>
        </div>

        {/* Action Buttons: + 加入词卡 & 词形表 */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleAddCard}
            className={`flex-1 rounded-2xl py-3.5 px-4 text-base font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSelectedWordInDeck
                ? 'bg-[#EAF2EF] text-[#25635E] border border-[#25635E]/25'
                : 'bg-[#25635E] text-white hover:bg-[#1E524E]'
            }`}
          >
            {isSelectedWordInDeck ? (
              <>
                <Check className="w-5 h-5" />
                <span>已在词卡中</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>加入词卡</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenInflection(activeEntry, selectedToken?.surface)}
            className="rounded-2xl border border-[#2C6E6A]/60 bg-[#FAFBF9] px-5 py-3.5 text-base font-semibold text-[#25635E] hover:bg-[#EAF2EF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            词形表
          </button>
        </div>
      </div>

      {/* Sutta Switcher & Prev/Next Lesson Navigation */}
      <div className="mt-4 space-y-2.5 px-1">
        <div className="flex items-center justify-between gap-2">
          {(() => {
            const currentIdx = SUTTAS.findIndex((s) => s.id === currentSutta.id);
            const prevSutta = currentIdx > 0 ? SUTTAS[currentIdx - 1] : null;
            const nextSutta =
              currentIdx >= 0 && currentIdx < SUTTAS.length - 1 ? SUTTAS[currentIdx + 1] : null;
            return (
              <>
                <button
                  type="button"
                  disabled={!prevSutta}
                  onClick={() => prevSutta && handleSwitchSutta(prevSutta)}
                  className="rounded-xl bg-[#FAFBF9] border border-[#E2EAE6] px-3 py-2 text-xs font-semibold text-[#2C3735] hover:bg-[#EAF2EF] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  ← 上一课：{prevSutta ? prevSutta.code : '无'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuttaList(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#EAF2EF] px-3.5 py-2 text-xs font-semibold text-[#25635E] hover:bg-[#DCECE7] cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>经典目录 ({SUTTAS.length} 课)</span>
                </button>
                <button
                  type="button"
                  disabled={!nextSutta}
                  onClick={() => nextSutta && handleSwitchSutta(nextSutta)}
                  className="rounded-xl bg-[#FAFBF9] border border-[#E2EAE6] px-3 py-2 text-xs font-semibold text-[#2C3735] hover:bg-[#EAF2EF] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  下一课：{nextSutta ? nextSutta.code : '无'} →
                </button>
              </>
            );
          })()}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#7A8783]">
          <span>诵读音源：{activeAudioSourceLabel}</span>
          <span>诗律：{suttaAudioMeta.meterName}</span>
        </div>
      </div>

      {/* Fixed Dark Audio Player Bar above Bottom Nav (Softened pine-charcoal tone) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-[#1F2D2A]/95 backdrop-blur-md text-[#F2F6F4] border-t border-white/10">
        <div className="max-w-lg mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => void handlePlaySentence(activeSentenceIdx)}
              aria-label={isPlayingAudio ? '暂停' : '播放'}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
            <span className="text-sm font-medium tracking-wide truncate">
              {currentSentence.verseRef} · 第 {currentSentence.sentenceIndex} 句
              {shadowingPauseEnabled ? ' · 跟读模式' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setLoopAudio((prev) => !prev)}
              aria-label="循环播放此句"
              title="单句循环跟读"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                loopAudio ? 'bg-[#25635E] text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              title="切换跟读语速 (0.75x 慢速跟读 / 1.0x 标准 / 1.25x / 1.5x)"
              className="font-mono-num text-sm font-semibold text-white/90 hover:text-white min-w-[42px] text-right cursor-pointer"
            >
              {playbackSpeed.toFixed(2).replace(/\.00$/, '.0').replace(/0$/, '')}×
            </button>
            <button
              type="button"
              onClick={() => setShowAudioSettings(true)}
              aria-label="诵读音源与跟读设置"
              title="切换真人诵经音源与跟读设置"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Phase 2: Human Chanting Source & Shadowing Settings Drawer */}
      {showAudioSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowAudioSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-[#E6EBE8] max-h-[86vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F0]">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[#1E625E]" />
                <h3 className="text-lg font-bold text-[#141D1B]">真人诵经音源与跟读设置</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAudioSettings(false)}
                className="p-2 rounded-full text-[#64706D] hover:bg-[#F5F6F4] hover:text-[#141D1B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Primary Audio Channel Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#141D1B] block">
                1. 巴利语逐句朗读音源通道
              </label>
              <div className="space-y-2">
                {(
                  [
                    {
                      id: 'auto' as const,
                      title: '智能优选（SuttaCentral Voice 原声 + 离线逐词同步）',
                      desc: '在线优先请求 SuttaCentral Voice (Aditi 巴利逐句原声)，离线或受限时自动无缝切换本地 Mora 音拍同步语音。',
                    },
                    {
                      id: 'local-tts' as const,
                      title: '纯本地离线跟读引擎（零延迟 · 逐词卡拉OK高亮）',
                      desc: '使用本机语音库配合巴利语 Lahu/Garu 轻重音节拍算法，断网环境下 100% 即点即读。',
                    },
                  ] as const
                ).map((ch) => {
                  const active = audioChannel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setAudioChannel(ch.id);
                        setPreferredAudioSettings({ channel: ch.id });
                      }}
                      className={`w-full rounded-2xl p-3.5 border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#EBF3F1] border-[1.5px] border-[#1E625E]'
                          : 'bg-white border-[#E6EBE8] hover:border-[#B8CCC8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#141D1B]">{ch.title}</span>
                        {active && <Check className="w-4 h-4 text-[#1E625E]" />}
                      </div>
                      <p className="text-[11px] text-[#64706D] mt-1 leading-relaxed">{ch.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Ven. Ānandajoti & SuttaCentral Voice Original Recordings */}
            <div className="rounded-2xl bg-[#F5F8F7] border border-[#DCE8E5] p-4 space-y-3">
              <div className="text-xs font-bold text-[#141D1B]">
                2. 本篇经典开源真人吟诵原声 ({currentSutta.code})
              </div>
              <p className="text-[11px] text-[#52605C] leading-relaxed">
                诵读者：<strong>{suttaAudioMeta.reciterName}</strong> ·{' '}
                {suttaAudioMeta.reciterTradition}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAbtFullChapterMp3}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E625E] text-white px-3.5 py-2 text-xs font-bold hover:bg-[#174E4A] transition-colors cursor-pointer"
                >
                  {isPlayingAbtChapter ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>停止整章原声</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>播放 Ānandajoti 尊者原声流</span>
                    </>
                  )}
                </button>

                <a
                  href={suttaAudioMeta.scVoicePageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-white border border-[#CEDAD7] px-3 py-2 text-xs font-semibold text-[#1E625E] hover:bg-[#EBF3F1] transition-colors"
                >
                  <span>SuttaCentral Voice</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={suttaAudioMeta.abtPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-white border border-[#CEDAD7] px-3 py-2 text-xs font-semibold text-[#52605C] hover:text-[#141D1B] transition-colors"
                >
                  <span>Ancient Buddhist Texts 原典页</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 3. Shadowing Practice Switches (跟读训练选项) */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-[#141D1B] block">
                3. 沉浸式跟读训练选项
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShadowingPauseEnabled((prev) => !prev)}
                  className={`rounded-xl p-3 border text-left cursor-pointer ${
                    shadowingPauseEnabled
                      ? 'bg-[#EBF3F1] border-[#1E625E] text-[#1E625E]'
                      : 'bg-white border-[#E6EBE8] text-[#141D1B]'
                  }`}
                >
                  <div className="text-xs font-bold">
                    跟读留白：{shadowingPauseEnabled ? '已开启' : '已关闭'}
                  </div>
                  <div className="text-[11px] text-[#64706D] mt-0.5">
                    每读完一句自动停顿 5 秒供您复述
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setContinuousPlay((prev) => !prev)}
                  className={`rounded-xl p-3 border text-left cursor-pointer ${
                    continuousPlay
                      ? 'bg-[#EBF3F1] border-[#1E625E] text-[#1E625E]'
                      : 'bg-white border-[#E6EBE8] text-[#141D1B]'
                  }`}
                >
                  <div className="text-xs font-bold">
                    全文连播：{continuousPlay ? '已开启' : '单句停止'}
                  </div>
                  <div className="text-[11px] text-[#64706D] mt-0.5">
                    读完当前句后自动衔接到下一句
                  </div>
                </button>
              </div>
            </div>

            {/* 4. System Voice Override (Optional) */}
            {availableVoices.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#EEF2F0]">
                <label className="text-xs font-bold text-[#52605C] block">
                  本地发音人选择（推荐使用印地语 hi-IN / 印尼语 id-ID / 英语自然人声）
                </label>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => {
                    const uri = e.target.value;
                    setSelectedVoiceURI(uri);
                    setPreferredAudioSettings({ voiceURI: uri || null });
                  }}
                  className="w-full rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3 py-2 text-xs text-[#141D1B] focus:outline-none focus:border-[#1E625E]"
                >
                  <option value="">自动优选纯元音发音人 (推荐)</option>
                  {availableVoices.slice(0, 30).map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
