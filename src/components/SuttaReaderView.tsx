import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  Headphones,
  Pause,
  Play,
  Plus,
  Repeat,
  Volume2,
} from 'lucide-react';
import {
  DPD_DICTIONARY,
  SUTTAS,
  type DpdWordEntry,
  type SuttaItem,
  type SuttaToken,
} from '../data/paliData';
import { db, type FlashcardRecord } from '../db/database';
import { speakPaliText, stopPaliAudio } from '../utils/paliAudio';

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

  const [activeSentenceIdx, setActiveSentenceIdx] = useState(0);
  // First sentence translation visible by default (matching Image 3), second sentence toggleable via "显示译文"
  const [visibleTranslations, setVisibleTranslations] = useState<Record<string, boolean>>({
    'dhp-1-1': true,
    'dhp-2-1': true,
    'dhp-5-1': true,
    'dhp-21-1': true,
  });

  // Default selected word is Manopubbaṅgamā in Dhp 1.1 (matching Image 3)
  const [selectedToken, setSelectedToken] = useState<SuttaToken>(
    currentSutta.sentences[0]?.tokens[0]
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [loopAudio, setLoopAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const handlePlaySentence = async (sentenceIdx: number, suttaOverride?: SuttaItem) => {
    const targetSutta = suttaOverride ?? currentSutta;
    const sentence = targetSutta.sentences[sentenceIdx];
    if (!sentence) return;

    if (isPlayingAudio && activeSentenceIdx === sentenceIdx && !suttaOverride) {
      stopPaliAudio();
      setIsPlayingAudio(false);
      return;
    }

    setActiveSentenceIdx(sentenceIdx);
    setIsPlayingAudio(true);
    await onMarkTaskCompleted('task_audio_done');
    await onMarkTaskCompleted('task_reading_done');

    speakPaliText(sentence.paliText, {
      rate: playbackSpeed,
      onEnd: () => {
        if (loopAudio) {
          speakPaliText(sentence.paliText, {
            rate: playbackSpeed,
            onEnd: () => setIsPlayingAudio(false),
          });
        } else {
          setIsPlayingAudio(false);
        }
      },
    });
  };

  useEffect(() => {
    if (autoPlayOnMount && currentSutta.sentences[0]) {
      const timer = window.setTimeout(() => {
        void handlePlaySentence(0, currentSutta);
      }, 50);
      return () => {
        window.clearTimeout(timer);
        stopPaliAudio();
      };
    }
    return () => {
      stopPaliAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayOnMount, currentSutta]);

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

  const isSelectedWordInDeck = useMemo(() => {
    const found = cards.find((c) => c.lemma === activeEntry.lemma);
    return Boolean(found?.inDeck);
  }, [cards, activeEntry.lemma]);

  const handleTokenClick = async (token: SuttaToken, sentenceIdx: number) => {
    setSelectedToken(token);
    setActiveSentenceIdx(sentenceIdx);
    speakPaliText(token.surface.replace(/[.,;!?]/g, ''), { rate: playbackSpeed });
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
    return (
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#141D1B]">巴利经典文库</h1>
            <p className="text-xs text-[#64706D] mt-0.5">
              数据源：SuttaCentral (bilara-data) 与 Chaṭṭha Saṅgāyana Tipiṭaka (CST)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSuttaList(false)}
            className="rounded-xl bg-[#EBF3F1] px-3.5 py-2 text-xs font-semibold text-[#1E625E] hover:bg-[#DDF0ED]"
          >
            返回当前经文
          </button>
        </div>

        <div className="space-y-3">
          {SUTTAS.map((sutta) => {
            const isCurrent = sutta.id === currentSutta.id;
            return (
              <div
                key={sutta.id}
                onClick={() => {
                  onSelectSuttaId(sutta.id);
                  setActiveSentenceIdx(0);
                  if (sutta.sentences[0]?.tokens[0]) {
                    setSelectedToken(sutta.sentences[0].tokens[0]);
                  }
                  setShowSuttaList(false);
                }}
                className={`rounded-3xl p-5 bg-white border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-[1.5px] border-[#1E625E] shadow-xs'
                    : 'border-[#E6EBE8] hover:border-[#B8CCC8]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#141D1B]">{sutta.titleZh}</span>
                      <span className="text-xs text-[#64706D]">· {sutta.code}</span>
                    </div>
                    <p className="font-pali text-sm text-[#52605C] mt-0.5">{sutta.titlePali}</p>
                    <p className="text-xs text-[#64706D] mt-2">{sutta.chapterZh}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3F1] px-3 py-1 text-xs font-semibold text-[#1E625E] shrink-0">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>含吟诵音频</span>
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
    <div className="max-w-lg mx-auto px-4 pt-3 pb-40">
      {/* Top Header matching Reference Image 3 */}
      <div className="flex items-center justify-between py-1.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSuttaList(true)}
            aria-label="选择其他经文"
            className="min-w-[40px] min-h-[40px] -ml-2 rounded-full flex items-center justify-center text-[#141D1B] hover:bg-black/5 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2]" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#141D1B] leading-tight">
              {currentSutta.titleZh}
            </h1>
            <p className="text-xs text-[#64706D] mt-0.5">
              {currentSutta.code} · 第 {activeSentenceIdx + 1} / {currentSutta.sentences.length} 句
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSuttaList(true)}
            className="inline-flex items-center gap-1 rounded-full bg-[#DCECE9] px-3.5 py-1.5 text-xs font-bold text-[#1E625E] hover:bg-[#CBE3DF] transition-colors"
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

      {/* Sutta Sentence Cards matching Reference Image 3 */}
      <div className="mt-4 space-y-3.5">
        {currentSutta.sentences.map((sentence, sIdx) => {
          const isSentenceActive = sIdx === activeSentenceIdx;
          const isThisPlaying = isSentenceActive && isPlayingAudio;
          const showTranslation = Boolean(visibleTranslations[sentence.id]);

          return (
            <div
              key={sentence.id}
              onClick={() => setActiveSentenceIdx(sIdx)}
              className={`rounded-3xl bg-white p-5 transition-all ${
                isSentenceActive
                  ? 'border-[1.5px] border-[#1E625E] shadow-2xs'
                  : 'border border-[#E6EBE8]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Circular Play / Pause Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySentence(sIdx);
                  }}
                  aria-label={isThisPlaying ? '暂停朗读' : '朗读此句'}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isSentenceActive
                      ? 'bg-[#1E625E] text-white hover:bg-[#174E4A]'
                      : 'bg-[#EBF3F1] text-[#1E625E] hover:bg-[#DDF0ED]'
                  }`}
                >
                  {isThisPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Clickable Word-by-Word Pāli Text */}
                <div className="flex-1 font-pali text-[24px] sm:text-[26px] leading-[1.5] text-[#141D1B]">
                  {sentence.tokens.map((token, tIdx) => {
                    const isTokenSelected =
                      selectedToken?.surface === token.surface && isSentenceActive;
                    return (
                      <React.Fragment key={`${sentence.id}-${tIdx}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTokenClick(token, sIdx);
                          }}
                          className={`inline font-pali text-left rounded-lg px-1 py-0.5 -mx-0.5 transition-colors cursor-pointer ${
                            isTokenSelected
                              ? 'bg-[#D8ECE8] text-[#141D1B]'
                              : 'hover:bg-[#EBF3F1]'
                          } ${token.dottedUnderline && !isTokenSelected ? 'pali-word-dotted' : ''}`}
                        >
                          {token.surface}
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

              {/* Translation Section or Toggle Button */}
              {showTranslation ? (
                <div className="mt-4 pt-3.5 border-t border-[#EEF2F0] space-y-1">
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
                      className="text-xs text-[#7A8783] hover:text-[#1E625E] shrink-0"
                    >
                      收起
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#64706D] leading-relaxed">
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
                    className="text-sm font-semibold text-[#1E625E] hover:underline cursor-pointer"
                  >
                    显示译文
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DPD Word Lookup & Grammar Analysis Card (matching bottom sheet of Reference Image 3) */}
      <div className="mt-5 rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-[#E2EAE7]">
        {/* Grab handle bar */}
        <div className="w-11 h-1.5 rounded-full bg-[#CBD5D2] mx-auto mb-3" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-pali text-[28px] sm:text-3xl font-semibold text-[#141D1B] leading-tight">
              {activeEntry.lemma}
            </h2>
            <p className="mt-1 text-sm text-[#64706D]">
              {selectedToken?.contextGrammar || `${activeEntry.pos} · DPD 词形还原`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => speakPaliText(activeEntry.lemma, { rate: playbackSpeed })}
            aria-label="播放单词发音"
            className="w-12 h-12 rounded-full bg-[#EBF3F1] text-[#1E625E] flex items-center justify-center hover:bg-[#DDF0ED] active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Volume2 className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Compound / Root Breakdown Chips */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {activeEntry.components.map((comp, idx) => (
            <React.Fragment key={comp.form}>
              {idx > 0 && <span className="text-[#7A8783] text-sm font-medium">+</span>}
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#EFF2F0] px-3 py-1 text-xs sm:text-sm text-[#2C3735]">
                <span className="font-pali font-medium">{comp.form}</span>
                <span>{comp.gloss}</span>
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Meanings: 中 & EN */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center rounded-md bg-[#E0EFEA] px-2 py-0.5 text-xs font-bold text-[#1E625E] shrink-0">
              中
            </span>
            <span className="text-lg font-bold text-[#141D1B]">{activeEntry.meaningZh}</span>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center rounded-md bg-[#E0EFEA] px-1.5 py-0.5 text-xs font-bold text-[#1E625E] shrink-0 mt-0.5">
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
                ? 'bg-[#EBF3F1] text-[#1E625E] border border-[#1E625E]/30'
                : 'bg-[#1E625E] text-white hover:bg-[#174E4A]'
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
            className="rounded-2xl border border-[#2C6E6A] bg-white px-5 py-3.5 text-base font-semibold text-[#1E625E] hover:bg-[#EBF3F1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            词形表
          </button>
        </div>
      </div>

      {/* Sutta Switcher Bar */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#64706D] px-1">
        <span>诵读音频：{currentSutta.audioSource}</span>
        <button
          type="button"
          onClick={() => setShowSuttaList(true)}
          className="inline-flex items-center gap-1 font-semibold text-[#1E625E] hover:underline"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>切换经文 ({SUTTAS.length} 部)</span>
        </button>
      </div>

      {/* Fixed Dark Audio Player Bar above Bottom Nav (matching Reference Image 3) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-[#16211F] text-white border-t border-white/10">
        <div className="max-w-lg mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePlaySentence(activeSentenceIdx)}
              aria-label={isPlayingAudio ? '暂停' : '播放'}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
            <span className="text-sm font-medium tracking-wide">
              {currentSentence.verseRef} · 第 {currentSentence.sentenceIndex} 句
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLoopAudio((prev) => !prev)}
              aria-label="循环播放此句"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                loopAudio ? 'bg-[#1E625E] text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              className="font-mono-num text-sm font-semibold text-white/90 hover:text-white min-w-[42px] text-right cursor-pointer"
            >
              {playbackSpeed.toFixed(1)}×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
