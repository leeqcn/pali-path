import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
  Volume2,
  X,
} from 'lucide-react';
import {
  CURRICULUM_COURSES,
  DPD_DICTIONARY,
  type DpdWordEntry,
} from '../data/paliData';
import {
  getNextIntervalPreview,
  isCardDueNow,
  rateFlashcard,
  type CardRating,
  type FlashcardRecord,
} from '../db/database';
import { speakPaliText } from '../utils/paliAudio';
import {
  PALI_DIACRITIC_CHARS,
  convertVelthuisToPali,
  matchesPaliQuery,
} from '../utils/paliInput';

interface FlashcardsViewProps {
  cards: FlashcardRecord[];
  selectedCourseId?: string;
  dailyCardLimit: number;
  onChangeDailyCardLimit: (limit: number) => Promise<void>;
  onCardsUpdated: () => Promise<void>;
  onMarkCardsDone?: () => Promise<void>;
  onCloseReviewToToday?: () => void;
  onOpenInflection: (entry: DpdWordEntry, highlightForm?: string) => void;
  initialMode?: 'review' | 'browse';
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Lv.1 零基础入门',
  2: 'Lv.2 基础常用',
  3: 'Lv.3 核心动词',
  4: 'Lv.4 格位进阶',
  5: 'Lv.5 分词过去时',
  6: 'Lv.6 复合词高阶',
};

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  cards,
  selectedCourseId = 'course-1',
  dailyCardLimit,
  onChangeDailyCardLimit,
  onCardsUpdated,
  onMarkCardsDone,
  onCloseReviewToToday,
  onOpenInflection,
  initialMode = 'review',
}) => {
  const [mode, setMode] = useState<'review' | 'browse'>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [velthuisEnabled, setVelthuisEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'lv1_2' | 'lv3_4' | 'lv5_6' | 'due' | 'mastered'
  >('all');

  // Front/Back flip state: false = Front (only Pāli word), true = Back (full details)
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  // Auto-pronounce when flipping card to back
  const [autoSpeakOnFlip, setAutoSpeakOnFlip] = useState<boolean>(true);
  // Batch index so users can study the next group of words after finishing a group
  const [batchIndex, setBatchIndex] = useState<number>(0);
  // Intra-session requeue list for words rated "重来" (again) — they repeat until rated Hard/Good/Easy
  const [againQueueLemmas, setAgainQueueLemmas] = useState<string[]>([]);

  const currentCourse = useMemo(
    () => CURRICULUM_COURSES.find((c) => c.id === selectedCourseId) ?? CURRICULUM_COURSES[0],
    [selectedCourseId]
  );

  // Full 80-word ordered curriculum list (100% deterministic order so rating a card never shifts queue indices)
  const fullOrderedCards = useMemo(() => {
    const ordered: FlashcardRecord[] = [];

    // 1. First prioritize the active course's core lemmas in exact curriculum order
    currentCourse.coreLemmas.forEach((lemma) => {
      const found = cards.find((c) => c.lemma === lemma);
      if (found && !ordered.some((o) => o.lemma === found.lemma)) {
        ordered.push(found);
      }
    });

    // 2. Then all remaining words sorted deterministically by difficultyLevel (1 -> 6) and frequencyRank
    const allSortedEasyFirst = [...cards].sort((a, b) => {
      const ea = DPD_DICTIONARY[a.lemma];
      const eb = DPD_DICTIONARY[b.lemma];
      return (
        (ea?.difficultyLevel ?? 3) - (eb?.difficultyLevel ?? 3) ||
        (ea?.frequencyRank ?? 99) - (eb?.frequencyRank ?? 99) ||
        a.lemma.localeCompare(b.lemma)
      );
    });

    allSortedEasyFirst.forEach((c) => {
      if (!ordered.some((o) => o.lemma === c.lemma)) {
        ordered.push(c);
      }
    });

    return ordered;
  }, [cards, currentCourse]);

  const totalBatches = Math.max(1, Math.ceil(fullOrderedCards.length / dailyCardLimit));
  const safeBatchIndex = Math.min(batchIndex, totalBatches - 1);

  // Base batch of words for this session + any 1/3/7-day due review cards appended right after today's words
  const baseBatchQueue = useMemo(() => {
    const start = safeBatchIndex * dailyCardLimit;
    const slice = fullOrderedCards.slice(start, start + dailyCardLimit);
    const initialBatch = slice.length > 0 ? [...slice] : fullOrderedCards.slice(0, dailyCardLimit);

    // For Today's primary batch (batch 0), automatically append any previously learned cards (1/3/7 days ago) that are due now
    if (safeBatchIndex === 0) {
      const dueReviewCards = fullOrderedCards.filter(
        (c) => isCardDueNow(c) && !initialBatch.some((b) => b.lemma === c.lemma)
      );
      return [...initialBatch, ...dueReviewCards];
    }

    return initialBatch;
  }, [fullOrderedCards, safeBatchIndex, dailyCardLimit]);

  // Complete session queue = baseBatchQueue + any cards rated "重来" (again) during this session
  const reviewQueue = useMemo(() => {
    const requeuedCards = againQueueLemmas
      .map((lemma) => cards.find((c) => c.lemma === lemma))
      .filter((c): c is FlashcardRecord => Boolean(c));
    return [...baseBatchQueue, ...requeuedCards];
  }, [baseBatchQueue, againQueueLemmas, cards]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  const safeIndex = Math.min(currentIndex, Math.max(0, reviewQueue.length - 1));
  const activeCard = reviewQueue[safeIndex] ?? reviewQueue[0];
  const isCurrentRequeuedAgain = safeIndex >= baseBatchQueue.length;
  const activeEntry = activeCard
    ? DPD_DICTIONARY[activeCard.lemma]
    : DPD_DICTIONARY.buddha;
  const intervalPreview = activeCard
    ? getNextIntervalPreview(activeCard)
    : { again: '10 分钟', hard: '1 天', good: '3 天', easy: '7 天' };

  const handleFlipToBack = useCallback(() => {
    setIsFlipped(true);
    if (autoSpeakOnFlip && activeEntry) {
      speakPaliText(activeEntry.lemma);
    }
  }, [autoSpeakOnFlip, activeEntry]);

  // Direct Previous / Next word navigation
  const handleGoPrevCard = useCallback(() => {
    if (safeIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(safeIndex - 1);
    }
  }, [safeIndex]);

  const handleGoNextCard = useCallback(async () => {
    setIsFlipped(false);
    if (safeIndex + 1 < reviewQueue.length) {
      setCurrentIndex(safeIndex + 1);
    } else {
      if (onMarkCardsDone) {
        await onMarkCardsDone();
      }
      setShowSessionSummary(true);
    }
  }, [safeIndex, reviewQueue.length, onMarkCardsDone]);

  const handleStartNextBatch = useCallback(() => {
    const nextBatch = (safeBatchIndex + 1) % totalBatches;
    setBatchIndex(nextBatch);
    setAgainQueueLemmas([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSessionSummary(false);
  }, [safeBatchIndex, totalBatches]);

  const handleRate = useCallback(
    async (rating: CardRating) => {
      if (!activeCard) return;
      await rateFlashcard(activeCard.lemma, rating);
      await onCardsUpdated();
      setIsFlipped(false); // Reset to Front side for the next card

      if (rating === 'again') {
        // Re-append this word to the end of the current session queue so it repeats until rated Hard/Good/Easy!
        setAgainQueueLemmas((prev) => [...prev, activeCard.lemma]);
        setCurrentIndex(safeIndex + 1);
        return;
      }

      setSessionCompletedCount((prev) => prev + 1);

      if (safeIndex + 1 < reviewQueue.length) {
        setCurrentIndex(safeIndex + 1);
      } else {
        if (onMarkCardsDone) {
          await onMarkCardsDone();
        }
        setShowSessionSummary(true);
      }
    },
    [activeCard, onCardsUpdated, safeIndex, reviewQueue.length, onMarkCardsDone]
  );

  // Keyboard shortcuts for smooth study experience:
  // Space / Enter: flip card (or rate 'good' if already flipped) | 1/2/3/4: rate card | Left/Right: prev/next card | v/r: play audio
  useEffect(() => {
    if (mode !== 'review' || showSessionSummary) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) {
          handleFlipToBack();
        } else {
          void handleRate('good');
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoPrevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        void handleGoNextCard();
      } else if (isFlipped && e.key === '1') {
        e.preventDefault();
        void handleRate('again');
      } else if (isFlipped && e.key === '2') {
        e.preventDefault();
        void handleRate('hard');
      } else if (isFlipped && e.key === '3') {
        e.preventDefault();
        void handleRate('good');
      } else if (isFlipped && e.key === '4') {
        e.preventDefault();
        void handleRate('easy');
      } else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        speakPaliText(activeEntry.lemma);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    mode,
    showSessionSummary,
    isFlipped,
    handleFlipToBack,
    handleRate,
    handleGoPrevCard,
    handleGoNextCard,
    activeEntry,
  ]);

  const handleToggleDeck = async (lemma: string, currentlyInDeck: boolean) => {
    const { db } = await import('../db/database');
    const existing = await db.cards.get(lemma);
    if (existing) {
      await db.cards.update(lemma, {
        inDeck: !currentlyInDeck,
        status: !currentlyInDeck && existing.status === 'new' ? 'learning' : existing.status,
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

  const browsableEntries = useMemo(() => {
    const all = Object.values(DPD_DICTIONARY).sort(
      (a, b) =>
        a.difficultyLevel - b.difficultyLevel || b.suttaOccurrences - a.suttaOccurrences
    );
    return all.filter((entry) => {
      const card = cards.find((c) => c.lemma === entry.lemma);
      if (statusFilter === 'lv1_2' && entry.difficultyLevel > 2) return false;
      if (statusFilter === 'lv3_4' && (entry.difficultyLevel < 3 || entry.difficultyLevel > 4))
        return false;
      if (statusFilter === 'lv5_6' && entry.difficultyLevel < 5) return false;
      if (statusFilter === 'due' && !(card?.inDeck && card.status !== 'mastered')) return false;
      if (statusFilter === 'mastered' && card?.status !== 'mastered') return false;

      if (!searchQuery.trim()) return true;
      return (
        matchesPaliQuery(entry.lemma, searchQuery) ||
        matchesPaliQuery(entry.meaningZh, searchQuery) ||
        matchesPaliQuery(entry.meaningEn, searchQuery) ||
        matchesPaliQuery(entry.root, searchQuery)
      );
    });
  }, [cards, searchQuery, statusFilter]);

  const renderHighlightedExample = (pali: string, highlight: string) => {
    const idx = pali.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return <span>{pali}</span>;
    const before = pali.slice(0, idx);
    const match = pali.slice(idx, idx + highlight.length);
    const after = pali.slice(idx + highlight.length);
    return (
      <>
        {before}
        <span className="bg-[#D5EAE6] text-[#1E2A27] px-2 py-0.5 rounded-md font-medium">
          {match}
        </span>
        {after}
      </>
    );
  };

  const totalDictCount = Object.keys(DPD_DICTIONARY).length;

  if (mode === 'browse') {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1E2A27]">
              DPD 巴利语阶梯词库（共 {totalDictCount} 词）
            </h1>
            <p className="text-xs text-[#657470] mt-0.5">
              按 Lv.1 零基础简单高频词 → Lv.6 复合词由易到难排列 · 点击任意单词即可进入词卡学习
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSessionSummary(false);
              setIsFlipped(false);
              setMode('review');
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#25635E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E524E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>返回词卡复习 ({reviewQueue.length} 词)</span>
          </button>
        </div>

        {/* Daily Limit Quick Selector */}
        <div className="mt-4 rounded-2xl bg-[#FAFBF9] p-3.5 border border-[#E3EAE6] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#566561]">
            当前学习：{currentCourse.levelBadge}（{currentCourse.titleZh}）· 每日新词量：
          </span>
          <div className="flex items-center gap-1.5">
            {[5, 8, 12, 16].map((limit) => (
              <button
                key={limit}
                type="button"
                onClick={() => {
                  setBatchIndex(0);
                  setAgainQueueLemmas([]);
                  setCurrentIndex(0);
                  void onChangeDailyCardLimit(limit);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  dailyCardLimit === limit
                    ? 'bg-[#25635E] text-white'
                    : 'bg-[#F2F5F1] text-[#566561] hover:text-[#1E2A27]'
                }`}
              >
                {limit} 词/天
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Controls with Pāli Diacritic Bar & Velthuis Input */}
        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7A8783] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const raw = e.target.value;
                setSearchQuery(velthuisEnabled ? convertVelthuisToPali(raw) : raw);
              }}
              placeholder="搜索巴利词头(支持无音标如 panna/sangha，或 aa→ā, .m→ṃ)、中文或词根..."
              className="w-full rounded-2xl bg-[#FAFBF9] border border-[#E2E8E5] pl-10 pr-9 py-2.5 text-sm text-[#1E2A27] placeholder:text-[#8C9894] focus:outline-none focus:border-[#25635E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8783] hover:text-[#1E2A27] cursor-pointer"
                aria-label="清空搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick-insert Pāli Diacritic Chips + Velthuis Toggle */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-[#FAFBF9]/90 rounded-xl px-3 py-1.5 border border-[#E3EAE6]">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[#657470] mr-1">巴利音标输入：</span>
              {PALI_DIACRITIC_CHARS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setSearchQuery((prev) => prev + ch)}
                  className="w-6 h-6 rounded-lg bg-[#F2F5F1] hover:bg-[#EAF2EF] text-xs font-pali font-semibold text-[#1E2A27] hover:text-[#25635E] flex items-center justify-center transition-colors cursor-pointer"
                >
                  {ch}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setVelthuisEnabled((prev) => !prev)}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                velthuisEnabled
                  ? 'bg-[#EAF2EF] text-[#25635E]'
                  : 'bg-[#F2F5F1] text-[#657470]'
              }`}
              title="开启后输入 aa 自动转 ā，.m 转 ṃ，~n 转 ñ，.t 转 ṭ"
            >
              {velthuisEnabled ? 'Velthuis 转写: 开 (aa→ā)' : 'Velthuis 转写: 关'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: 'all', label: `全部词库 (${totalDictCount})` },
                { id: 'lv1_2', label: 'Lv.1–2 简单常用 (28)' },
                { id: 'lv3_4', label: 'Lv.3–4 进阶核心 (26)' },
                { id: 'lv5_6', label: 'Lv.5–6 分词与复合词 (26)' },
                { id: 'due', label: '学习中' },
                { id: 'mastered', label: '已掌握' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#25635E] text-white'
                    : 'bg-[#FAFBF9] border border-[#E2EAE7] text-[#566561] hover:text-[#1E2A27]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Word Cards List */}
        <div className="mt-4 space-y-2.5">
          {browsableEntries.map((entry) => {
            const card = cards.find((c) => c.lemma === entry.lemma);
            const inDeck = Boolean(card?.inDeck);
            return (
              <div
                key={entry.lemma}
                className="rounded-2xl bg-[#FAFBF9] p-4 border border-[#E3EAE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-md bg-[#EAF2EF] text-[#25635E] px-2 py-0.5 text-[11px] font-bold">
                      {LEVEL_LABELS[entry.difficultyLevel]}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const globalIdx = fullOrderedCards.findIndex(
                          (c) => c.lemma === entry.lemma
                        );
                        if (globalIdx >= 0) {
                          const targetBatch = Math.floor(globalIdx / dailyCardLimit);
                          const targetIdxInBatch = globalIdx % dailyCardLimit;
                          setBatchIndex(targetBatch);
                          setAgainQueueLemmas([]);
                          setCurrentIndex(targetIdxInBatch);
                        }
                        setShowSessionSummary(false);
                        setIsFlipped(false);
                        setMode('review');
                      }}
                      className="font-pali text-xl font-semibold text-[#1E2A27] hover:text-[#25635E] text-left cursor-pointer"
                    >
                      {entry.lemma}
                    </button>
                    <button
                      type="button"
                      onClick={() => speakPaliText(entry.lemma)}
                      className="w-7 h-7 rounded-full bg-[#EAF2EF] text-[#25635E] flex items-center justify-center hover:bg-[#DCECE7] cursor-pointer"
                      aria-label={`朗读 ${entry.lemma}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-[#657470]">
                      {entry.pos} · 圣典出现 {entry.suttaOccurrences.toLocaleString()} 次
                      {card?.status === 'mastered' ? ' · 已掌握' : ''}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#1E2A27]">{entry.meaningZh}</p>
                  <p className="text-xs text-[#657470]">{entry.meaningEn}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenInflection(entry)}
                    className="px-3 py-2 rounded-xl border border-[#CEDAD7] text-xs font-medium text-[#25635E] hover:bg-[#EAF2EF] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    词形表
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleDeck(entry.lemma, inDeck)}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      inDeck
                        ? 'bg-[#EAF2EF] text-[#25635E]'
                        : 'bg-[#25635E] text-white hover:bg-[#1E524E]'
                    }`}
                  >
                    {inDeck ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>已在词卡</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>加入词卡</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3.5 pt-1.5 pb-20">
      {/* Compact Top Bar */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onCloseReviewToToday) {
                onCloseReviewToToday();
              } else {
                setMode('browse');
              }
            }}
            aria-label="退出词卡复习"
            className="min-w-[34px] min-h-[34px] -ml-1.5 rounded-full flex items-center justify-center text-[#1E2A27] hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#1E2A27] tracking-tight leading-tight">
              词卡复习
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#657470] leading-tight">
              {currentCourse.levelBadge} · 先学简单高频词
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoSpeakOnFlip((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
              autoSpeakOnFlip
                ? 'bg-[#EAF2EF] text-[#25635E]'
                : 'bg-[#EAEFEA] text-[#657470]'
            }`}
            title="翻转词卡时自动朗读巴利语发音"
          >
            {autoSpeakOnFlip ? '翻转朗读: 开' : '翻转朗读: 关'}
          </button>
          <button
            type="button"
            onClick={() => setMode('browse')}
            className="text-xs font-semibold text-[#25635E] hover:underline whitespace-nowrap cursor-pointer"
          >
            词库 ({totalDictCount}词)
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={handleGoPrevCard}
              aria-label="上一词"
              title="上一词"
              className="p-1 rounded-lg text-[#566561] hover:bg-[#EAF2EF] hover:text-[#25635E] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono-num text-xs sm:text-sm font-semibold text-[#566561]">
              {safeIndex + 1} / {reviewQueue.length}
            </span>
            <button
              type="button"
              onClick={() => void handleGoNextCard()}
              aria-label="下一词"
              title="下一词"
              className="p-1 rounded-lg text-[#566561] hover:bg-[#EAF2EF] hover:text-[#25635E] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar under Top Bar */}
      <div className="mt-1 h-1 w-full rounded-full bg-[#DCE5E1] overflow-hidden">
        <div
          className="h-full bg-[#25635E] transition-all duration-300 rounded-full"
          style={{ width: `${((safeIndex + 1) / Math.max(1, reviewQueue.length)) * 100}%` }}
        />
      </div>

      {showSessionSummary ? (
        <div className="mt-4 rounded-3xl bg-[#FAFBF9] p-7 border border-[#E3EAE6] shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#EAF2EF] text-[#25635E] flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E2A27]">今日词卡复习已完成</h2>
          <p className="text-sm text-[#566561]">
            本次共完成 <span className="font-semibold text-[#25635E]">{sessionCompletedCount}</span> 个巴利语词汇，间隔重复进度已保存至浏览器 IndexedDB。
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleStartNextBatch}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25635E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1E524E] transition-colors cursor-pointer"
            >
              <span>继续学下一组 ({dailyCardLimit} 词)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSessionSummary(false);
                setAgainQueueLemmas([]);
                setIsFlipped(false);
                setCurrentIndex(0);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#CEDAD7] bg-[#FAFBF9] px-5 py-3 text-sm font-semibold text-[#25635E] hover:bg-[#EAF2EF] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>再复习一轮</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('browse')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DCE5E1] bg-[#FAFBF9] px-4 py-3 text-sm font-medium text-[#566561] hover:text-[#1E2A27] transition-colors cursor-pointer"
            >
              <span>查看 80 词词库</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Interactive Front / Back Flashcard */}
          {!isFlipped ? (
            /* FRONT SIDE (正面：只有巴利单词与发音喇叭，点击卡片翻转) */
            <div
              onClick={handleFlipToBack}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFlipToBack();
                }
              }}
              className="mt-2.5 rounded-3xl bg-[#FAFBF9] px-6 py-10 sm:px-8 sm:py-14 shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)] border border-[#E3EAE6] min-h-[300px] sm:min-h-[360px] flex flex-col items-center justify-between cursor-pointer hover:border-[#C2D6D2] transition-all select-none"
            >
              <span className="text-xs font-medium text-[#7F8E8A] tracking-wide">
                {LEVEL_LABELS[activeEntry.difficultyLevel]}
                {isCurrentRequeuedAgain ? ' · 重来强化' : ' · 词卡正面（点击翻转）'}
              </span>

              <div className="my-auto text-center space-y-6">
                <h2 className="font-pali text-[34px] sm:text-[42px] leading-tight font-semibold text-[#1E2A27] tracking-tight break-words">
                  {activeEntry.lemma}
                </h2>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakPaliText(activeEntry.lemma);
                    }}
                    aria-label="播放单词发音"
                    className="w-14 h-14 rounded-full bg-[#EAF2EF] text-[#25635E] flex items-center justify-center hover:bg-[#DCECE7] active:scale-95 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-6 h-6 stroke-[2]" />
                  </button>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F4F1] px-4 py-1.5 text-xs font-medium text-[#566561]">
                <span>点击卡片任意位置翻转查看背面释义</span>
              </div>
            </div>
          ) : (
            /* BACK SIDE (反面：一屏完整显示单词、发音、释义、词根、例句与底部4按钮，无需下拉) */
            <div className="mt-2.5 rounded-3xl bg-[#FAFBF9] px-5 py-4 sm:px-7 sm:py-5 shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)] border border-[#E3EAE6] transition-all">
              {/* Word & POS */}
              <div className="text-center">
                <span className="inline-block rounded-md bg-[#EAF2EF] text-[#25635E] px-2.5 py-0.5 text-[11px] font-bold mb-1">
                  {LEVEL_LABELS[activeEntry.difficultyLevel]}
                  {isCurrentRequeuedAgain ? ' · 重来巩固' : ''}
                </span>
                <h2 className="font-pali text-[30px] sm:text-[36px] leading-tight font-semibold text-[#1E2A27] tracking-tight break-words">
                  {activeEntry.lemma}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-[#657470]">{activeEntry.pos}</p>
              </div>

              {/* Circular Speaker Button */}
              <div className="my-2.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => speakPaliText(activeEntry.lemma)}
                  aria-label="播放单词发音"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#EAF2EF] text-[#25635E] flex items-center justify-center hover:bg-[#DCECE7] active:scale-95 transition-all cursor-pointer"
                >
                  <Volume2 className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              <div className="border-t border-[#E8EEEB] my-2.5" />

              {/* Meanings: 中 & EN */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center rounded-md bg-[#E2EFEA] px-2 py-0.5 text-[11px] font-bold text-[#25635E] shrink-0">
                    中
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-[#1E2A27] tracking-tight leading-snug">
                    {activeEntry.meaningZh}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center rounded-md bg-[#E2EFEA] px-1.5 py-0.5 text-[11px] font-bold text-[#25635E] shrink-0 mt-0.5">
                    EN
                  </span>
                  <span className="text-sm sm:text-base text-[#2C3735] leading-snug">
                    {activeEntry.meaningEn}
                  </span>
                </div>
              </div>

              {/* Compound / Root Breakdown Chips */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeEntry.components.map((comp, idx) => (
                    <React.Fragment key={comp.form}>
                      {idx > 0 && <span className="text-[#7A8783] text-xs font-medium">+</span>}
                      <span className="inline-flex items-center gap-1 rounded-xl bg-[#F0F4F1] px-2.5 py-1 text-xs sm:text-sm text-[#2C3735]">
                        <span className="font-pali font-medium">{comp.form}</span>
                        <span>{comp.gloss}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenInflection(activeEntry)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#25635E] hover:underline py-0.5 cursor-pointer"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>词形表</span>
                </button>
              </div>

              {/* Sutta Example Box */}
              <div
                onClick={() => speakPaliText(activeEntry.example.pali)}
                className="mt-2.5 rounded-2xl bg-[#EEF3F0] px-3.5 py-2.5 sm:p-4 cursor-pointer hover:bg-[#E5EEE9] transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#657470]">
                  <span>例句 · {activeEntry.example.ref}</span>
                  <span className="text-[11px] text-[#25635E]">点击朗读例句</span>
                </div>
                <p className="mt-1 font-pali text-base sm:text-lg text-[#1E2A27] leading-snug">
                  {renderHighlightedExample(activeEntry.example.pali, activeEntry.example.highlight)}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-[#566561]">{activeEntry.example.zh}</p>
              </div>
            </div>
          )}

          {/* Bottom Area: Flip Button when on Front, or Clean 4 SRS Rating Buttons when on Back */}
          {!isFlipped ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleFlipToBack}
                className="w-full rounded-2xl bg-[#25635E] py-3.5 px-6 text-base font-bold text-white shadow-xs hover:bg-[#1E524E] active:scale-[0.99] transition-all cursor-pointer"
              >
                显示答案（翻转词卡）
              </button>
            </div>
          ) : (
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => void handleRate('again')}
                className="rounded-2xl bg-[#FAFBF9] border border-[#DCE5E1] py-2.5 px-1.5 flex flex-col items-center justify-center hover:bg-[#F1F5F2] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold text-[#1E2A27]">重来</span>
                <span className="mt-0.5 text-[11px] sm:text-xs text-[#657470]">{intervalPreview.again}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRate('hard')}
                className="rounded-2xl bg-[#FAFBF9] border border-[#DCE5E1] py-2.5 px-1.5 flex flex-col items-center justify-center hover:bg-[#F1F5F2] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold text-[#1E2A27]">困难</span>
                <span className="mt-0.5 text-[11px] sm:text-xs text-[#657470]">{intervalPreview.hard}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRate('good')}
                className="rounded-2xl bg-[#25635E] border border-[#25635E] py-2.5 px-1.5 flex flex-col items-center justify-center text-white shadow-xs hover:bg-[#1E524E] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold">记得</span>
                <span className="mt-0.5 text-[11px] sm:text-xs text-[#D6EBE7]">{intervalPreview.good}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRate('easy')}
                className="rounded-2xl bg-[#FAFBF9] border border-[#DCE5E1] py-2.5 px-1.5 flex flex-col items-center justify-center hover:bg-[#F1F5F2] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold text-[#1E2A27]">轻松</span>
                <span className="mt-0.5 text-[11px] sm:text-xs text-[#657470]">{intervalPreview.easy}</span>
              </button>
            </div>
          )}

          {/* Quick Card Selector Dots & Subtle Keyboard Shortcut Hint */}
          <div className="mt-2.5 flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {reviewQueue.map((c, idx) => (
                <button
                  key={`${c.lemma}-${idx}`}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                  }}
                  aria-label={`切换到第 ${idx + 1} 张词卡`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === safeIndex ? 'w-6 bg-[#25635E]' : 'w-2 bg-[#CBD6D2] hover:bg-[#9EB0AA]'
                  }`}
                />
              ))}
            </div>
            <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#7A8783]">
              <Keyboard className="w-3.5 h-3.5" />
              <span>快捷键：空格/回车 翻转词卡 · 数字键 1–4 评分进下一词 · V 键播放发音</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
