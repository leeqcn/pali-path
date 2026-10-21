import React, { useMemo, useState } from 'react';
import { Check, Layers, Plus, RotateCcw, Search, Sparkles, Table2, Volume2, X } from 'lucide-react';
import { DPD_DICTIONARY, type DpdWordEntry } from '../data/paliData';
import {
  getNextIntervalPreview,
  rateFlashcard,
  type CardRating,
  type FlashcardRecord,
} from '../db/database';
import { speakPaliText } from '../utils/paliAudio';

interface FlashcardsViewProps {
  cards: FlashcardRecord[];
  onCardsUpdated: () => Promise<void>;
  onCloseReviewToToday?: () => void;
  onOpenInflection: (entry: DpdWordEntry, highlightForm?: string) => void;
  initialMode?: 'review' | 'browse';
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  cards,
  onCardsUpdated,
  onCloseReviewToToday,
  onOpenInflection,
  initialMode = 'review',
}) => {
  const [mode, setMode] = useState<'review' | 'browse'>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'mastered' | 'highfreq'>('all');

  // Build ordered review session queue (8 cards matching Reference Image 1, with manopubbaṅgama at #3)
  const reviewQueue = useMemo(() => {
    const preferredOrder = [
      'dhamma',
      'manas',
      'manopubbaṅgama',
      'manoseṭṭha',
      'manomaya',
      'paduṭṭha',
      'bhāsati',
      'karoti',
    ];
    const inDeckCards = cards.filter((c) => c.inDeck);
    const ordered: FlashcardRecord[] = [];

    preferredOrder.forEach((lemma) => {
      const found = inDeckCards.find((c) => c.lemma === lemma);
      if (found) ordered.push(found);
    });

    inDeckCards.forEach((c) => {
      if (!ordered.some((o) => o.lemma === c.lemma) && ordered.length < 12) {
        ordered.push(c);
      }
    });

    return ordered.length > 0 ? ordered.slice(0, 8) : cards.slice(0, 8);
  }, [cards]);

  // Default to index 2 (3 / 8 -> manopubbaṅgama) so it opens directly to the iconic card from Reference Image 1
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const manoIdx = reviewQueue.findIndex((c) => c.lemma === 'manopubbaṅgama');
    return manoIdx >= 0 ? manoIdx : 0;
  });
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  const activeCard = reviewQueue[currentIndex] ?? reviewQueue[0];
  const activeEntry = activeCard ? DPD_DICTIONARY[activeCard.lemma] : DPD_DICTIONARY.manopubbaṅgama;
  const intervalPreview = activeCard
    ? getNextIntervalPreview(activeCard)
    : { again: '10 分钟', hard: '1 天', good: '3 天', easy: '7 天' };

  const handleRate = async (rating: CardRating) => {
    if (!activeCard) return;
    await rateFlashcard(activeCard.lemma, rating);
    await onCardsUpdated();
    setSessionCompletedCount((prev) => prev + 1);

    if (currentIndex + 1 < reviewQueue.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSessionSummary(true);
    }
  };

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

  // Filtered vocabulary list sorted by Sutta frequency
  const browsableEntries = useMemo(() => {
    const all = Object.values(DPD_DICTIONARY).sort((a, b) => a.frequencyRank - b.frequencyRank);
    return all.filter((entry) => {
      const card = cards.find((c) => c.lemma === entry.lemma);
      if (statusFilter === 'due' && !(card?.inDeck && card.status !== 'mastered')) return false;
      if (statusFilter === 'mastered' && card?.status !== 'mastered') return false;
      if (statusFilter === 'highfreq' && entry.suttaOccurrences < 500) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.lemma.toLowerCase().includes(q) ||
        entry.meaningZh.includes(q) ||
        entry.meaningEn.toLowerCase().includes(q) ||
        entry.root.toLowerCase().includes(q)
      );
    });
  }, [cards, searchQuery, statusFilter]);

  // Render Example Sentence with highlighted headword
  const renderHighlightedExample = (pali: string, highlight: string) => {
    const idx = pali.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return <span>{pali}</span>;
    const before = pali.slice(0, idx);
    const match = pali.slice(idx, idx + highlight.length);
    const after = pali.slice(idx + highlight.length);
    return (
      <>
        {before}
        <span className="bg-[#D5EAE6] text-[#141D1B] px-2 py-0.5 rounded-md font-medium">
          {match}
        </span>
        {after}
      </>
    );
  };

  if (mode === 'browse') {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#141D1B]">DPD 巴利语高频词表</h1>
            <p className="text-xs text-[#64706D] mt-0.5">
              按三藏经文出现频率排序 · 支持 FSRS / SM-2 间隔重复记忆
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSessionSummary(false);
              setMode('review');
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1E625E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#174E4A] transition-colors whitespace-nowrap shrink-0"
          >
            <Layers className="w-4 h-4" />
            <span>进入词卡复习 ({reviewQueue.length})</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A8783] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索巴利词头、词根、中文或英文释义..."
              className="w-full rounded-2xl bg-white border border-[#E2E8E5] pl-10 pr-4 py-2.5 text-sm text-[#141D1B] placeholder:text-[#8C9894] focus:outline-none focus:border-[#1E625E]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#E7ECE9] p-1 rounded-2xl">
            {(
              [
                { id: 'all', label: '全部词频' },
                { id: 'due', label: '学习中' },
                { id: 'mastered', label: '已掌握' },
                { id: 'highfreq', label: '核心高频' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#141D1B] shadow-2xs'
                    : 'text-[#52605C] hover:text-[#141D1B]'
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
                className="rounded-2xl bg-white p-4 border border-[#E6EBE8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono-num text-xs text-[#7A8783]">
                      #{entry.frequencyRank}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const qIdx = reviewQueue.findIndex((c) => c.lemma === entry.lemma);
                        if (qIdx >= 0) setCurrentIndex(qIdx);
                        setMode('review');
                      }}
                      className="font-pali text-xl font-semibold text-[#141D1B] hover:text-[#1E625E] text-left"
                    >
                      {entry.lemma}
                    </button>
                    <button
                      type="button"
                      onClick={() => speakPaliText(entry.lemma)}
                      className="w-7 h-7 rounded-full bg-[#EBF3F1] text-[#1E625E] flex items-center justify-center hover:bg-[#DDF0ED]"
                      aria-label={`朗读 ${entry.lemma}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-[#64706D]">
                      {entry.pos} · 经文出现 {entry.suttaOccurrences.toLocaleString()} 次
                      {card?.status === 'mastered' ? ' · 已掌握' : ''}
                      {card && card.intervalDays > 0 ? ` · 间隔 ${card.intervalDays} 天` : ''}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#141D1B]">{entry.meaningZh}</p>
                  <p className="text-xs text-[#64706D]">{entry.meaningEn}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenInflection(entry)}
                    className="px-3 py-2 rounded-xl border border-[#CEDAD7] text-xs font-medium text-[#1E625E] hover:bg-[#EBF3F1] transition-colors whitespace-nowrap"
                  >
                    词形表
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleDeck(entry.lemma, inDeck)}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                      inDeck
                        ? 'bg-[#EBF3F1] text-[#1E625E]'
                        : 'bg-[#1E625E] text-white hover:bg-[#174E4A]'
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
    <div className="max-w-lg mx-auto px-4 pt-3 pb-28">
      {/* Top Bar matching Reference Image 1 */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
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
            className="min-w-[40px] min-h-[40px] -ml-2 rounded-full flex items-center justify-center text-[#141D1B] hover:bg-black/5 transition-colors"
          >
            <X className="w-6 h-6 stroke-[2]" />
          </button>
          <h1 className="text-xl font-bold text-[#141D1B] tracking-tight">词卡复习</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode('browse')}
            className="text-xs font-medium text-[#1E625E] hover:underline whitespace-nowrap"
          >
            高频词表 ({Object.keys(DPD_DICTIONARY).length})
          </button>
          <span className="font-mono-num text-base font-semibold text-[#52605C]">
            {currentIndex + 1} / {reviewQueue.length}
          </span>
        </div>
      </div>

      {/* Progress Bar under Top Bar */}
      <div className="mt-1.5 h-1 w-full rounded-full bg-[#DCE4E1] overflow-hidden">
        <div
          className="h-full bg-[#1E625E] transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / Math.max(1, reviewQueue.length)) * 100}%` }}
        />
      </div>

      {showSessionSummary ? (
        <div className="mt-6 rounded-3xl bg-white p-8 border border-[#E6EBE8] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#EBF3F1] text-[#1E625E] flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#141D1B]">今日词卡复习已完成</h2>
          <p className="text-sm text-[#52605C]">
            本次共复习 <span className="font-semibold text-[#1E625E]">{sessionCompletedCount}</span> 个巴利语词汇，间隔重复进度已保存至浏览器 IndexedDB。
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setShowSessionSummary(false);
                setCurrentIndex(0);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#CEDAD7] px-5 py-3 text-sm font-semibold text-[#1E625E] hover:bg-[#EBF3F1] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>再复习一轮</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('browse')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E625E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#174E4A] transition-colors"
            >
              <span>浏览高频词库</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Flashcard Container matching Reference Image 1 */}
          <div className="mt-4 rounded-3xl bg-white px-6 py-8 sm:px-8 sm:py-9 shadow-2xs border border-[#E8ECEA]">
            {/* Word & POS */}
            <div className="text-center">
              <h2 className="font-pali text-[36px] sm:text-[42px] leading-tight font-semibold text-[#141D1B] tracking-tight break-words">
                {activeEntry.lemma}
              </h2>
              <p className="mt-2 text-base text-[#64706D]">{activeEntry.pos}</p>
            </div>

            {/* Circular Speaker Button */}
            <div className="my-6 flex justify-center">
              <button
                type="button"
                onClick={() => speakPaliText(activeEntry.lemma)}
                aria-label="播放单词发音"
                className="w-16 h-16 rounded-full bg-[#EBF3F1] text-[#1E625E] flex items-center justify-center hover:bg-[#DDF0ED] active:scale-95 transition-all cursor-pointer"
              >
                <Volume2 className="w-7 h-7 stroke-[2]" />
              </button>
            </div>

            <div className="border-t border-[#EEF2F0] my-6" />

            {/* Meanings: 中 & EN */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-md bg-[#E0EFEA] px-2 py-0.5 text-xs font-bold text-[#1E625E] shrink-0">
                  中
                </span>
                <span className="text-2xl font-bold text-[#141D1B] tracking-tight">
                  {activeEntry.meaningZh}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center rounded-md bg-[#E0EFEA] px-1.5 py-0.5 text-xs font-bold text-[#1E625E] shrink-0 mt-1">
                  EN
                </span>
                <span className="text-lg text-[#2C3735] leading-snug">
                  {activeEntry.meaningEn}
                </span>
              </div>
            </div>

            {/* Compound / Root Breakdown Chips */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {activeEntry.components.map((comp, idx) => (
                  <React.Fragment key={comp.form}>
                    {idx > 0 && <span className="text-[#7A8783] text-sm font-medium">+</span>}
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#EFF2F0] px-3.5 py-1.5 text-sm text-[#2C3735]">
                      <span className="font-pali font-medium">{comp.form}</span>
                      <span>{comp.gloss}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onOpenInflection(activeEntry)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1E625E] hover:underline py-1"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>词形表</span>
              </button>
            </div>

            {/* Sutta Example Box */}
            <div
              onClick={() => speakPaliText(activeEntry.example.pali)}
              className="mt-6 rounded-2xl bg-[#EEF3F1] p-4 sm:p-5 cursor-pointer hover:bg-[#E5EEEB] transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-[#64706D]">
                <span>例句 · {activeEntry.example.ref}</span>
                <span className="text-[11px] text-[#1E625E]">点击朗读例句</span>
              </div>
              <p className="mt-2 font-pali text-xl sm:text-[22px] text-[#141D1B] leading-relaxed">
                {renderHighlightedExample(activeEntry.example.pali, activeEntry.example.highlight)}
              </p>
              <p className="mt-1.5 text-sm text-[#52605C]">{activeEntry.example.zh}</p>
            </div>
          </div>

          {/* 4 Spaced Repetition Buttons matching Reference Image 1 */}
          <div className="mt-5 grid grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => handleRate('again')}
              className="rounded-2xl bg-white border border-[#DCE4E1] py-3.5 px-2 flex flex-col items-center justify-center hover:bg-[#FAFBF9] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="text-base font-bold text-[#141D1B]">重来</span>
              <span className="mt-0.5 text-xs text-[#64706D]">{intervalPreview.again}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRate('hard')}
              className="rounded-2xl bg-white border border-[#DCE4E1] py-3.5 px-2 flex flex-col items-center justify-center hover:bg-[#FAFBF9] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="text-base font-bold text-[#141D1B]">困难</span>
              <span className="mt-0.5 text-xs text-[#64706D]">{intervalPreview.hard}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRate('good')}
              className="rounded-2xl bg-[#1E625E] border border-[#1E625E] py-3.5 px-2 flex flex-col items-center justify-center text-white shadow-xs hover:bg-[#174E4A] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="text-base font-bold">记得</span>
              <span className="mt-0.5 text-xs text-[#D5EAE6]">{intervalPreview.good}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRate('easy')}
              className="rounded-2xl bg-white border border-[#DCE4E1] py-3.5 px-2 flex flex-col items-center justify-center hover:bg-[#FAFBF9] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="text-base font-bold text-[#141D1B]">轻松</span>
              <span className="mt-0.5 text-xs text-[#64706D]">{intervalPreview.easy}</span>
            </button>
          </div>

          {/* Quick Card Selector Dots */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {reviewQueue.map((c, idx) => (
              <button
                key={c.lemma}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`切换到第 ${idx + 1} 张词卡`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-[#1E625E]' : 'w-2 bg-[#CBD6D2] hover:bg-[#9EB0AA]'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
