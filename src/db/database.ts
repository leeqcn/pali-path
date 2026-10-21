import Dexie, { type Table } from 'dexie';
import { DPD_DICTIONARY } from '../data/paliData';

export type CardRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardRecord {
  lemma: string; // Primary key matching DPD_DICTIONARY key
  status: 'new' | 'learning' | 'review' | 'mastered';
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  dueTimestamp: number;
  lastReviewedAt?: number;
  inDeck: boolean; // Whether added to user's active study deck
  addedAt: number;
}

export interface SuttaProgressRecord {
  suttaId: string;
  readSentenceIds: string[];
  listenedSentenceIds: string[];
  lastSentenceIdx: number;
  updatedAt: number;
}

export interface GrammarAttemptRecord {
  id?: number;
  topicId: string;
  questionId: string;
  isCorrect: boolean;
  selectedOption: number;
  timestamp: number;
}

export interface StudyMetaRecord {
  key: string;
  value: string | number | boolean;
}

export class PaliPathDatabase extends Dexie {
  cards!: Table<FlashcardRecord, string>;
  suttaProgress!: Table<SuttaProgressRecord, string>;
  grammarAttempts!: Table<GrammarAttemptRecord, number>;
  meta!: Table<StudyMetaRecord, string>;

  constructor() {
    super('PaliPathLocalDB');
    this.version(1).stores({
      cards: 'lemma, status, dueTimestamp, inDeck',
      suttaProgress: 'suttaId, updatedAt',
      grammarAttempts: '++id, topicId, questionId, isCorrect, timestamp',
      meta: 'key',
    });
  }
}

export const db = new PaliPathDatabase();

// FSRS / SM-2 hybrid scheduler matching the 4 buttons in Reference Image 1:
// 重来 (10 分钟) | 困难 (1 天) | 记得 (3 天) | 轻松 (7 天)
export function getNextIntervalPreview(card: FlashcardRecord): Record<CardRating, string> {
  if (card.repetitions <= 1) {
    return {
      again: '10 分钟',
      hard: '1 天',
      good: '3 天',
      easy: '7 天',
    };
  }
  const hardDays = Math.max(1, Math.round(card.intervalDays * 1.2));
  const goodDays = Math.max(3, Math.round(card.intervalDays * card.easeFactor));
  const easyDays = Math.max(7, Math.round(card.intervalDays * card.easeFactor * 1.35));
  return {
    again: '10 分钟',
    hard: `${hardDays} 天`,
    good: `${goodDays} 天`,
    easy: `${easyDays} 天`,
  };
}

export async function rateFlashcard(lemma: string, rating: CardRating): Promise<FlashcardRecord> {
  const now = Date.now();
  const existing = await db.cards.get(lemma);
  const card: FlashcardRecord = existing ?? {
    lemma,
    status: 'learning',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueTimestamp: now,
    inDeck: true,
    addedAt: now,
  };

  let nextIntervalDays = card.intervalDays;
  let nextEase = card.easeFactor;
  let nextReps = card.repetitions;
  let nextLapses = card.lapses;
  let nextStatus: FlashcardRecord['status'] = card.status;
  let nextDue = now;

  if (rating === 'again') {
    nextIntervalDays = 0;
    nextReps = 0;
    nextLapses += 1;
    nextEase = Math.max(1.3, card.easeFactor - 0.2);
    nextStatus = 'learning';
    nextDue = now + 10 * 60 * 1000; // 10 minutes
  } else if (rating === 'hard') {
    nextIntervalDays = card.repetitions <= 1 ? 1 : Math.max(1, Math.round(card.intervalDays * 1.2));
    nextReps += 1;
    nextEase = Math.max(1.3, card.easeFactor - 0.15);
    nextStatus = nextIntervalDays >= 7 ? 'mastered' : 'review';
    nextDue = now + nextIntervalDays * 24 * 60 * 60 * 1000;
  } else if (rating === 'good') {
    nextIntervalDays = card.repetitions <= 1 ? 3 : Math.max(3, Math.round(card.intervalDays * card.easeFactor));
    nextReps += 1;
    nextStatus = nextIntervalDays >= 7 ? 'mastered' : 'review';
    nextDue = now + nextIntervalDays * 24 * 60 * 60 * 1000;
  } else if (rating === 'easy') {
    nextIntervalDays = card.repetitions <= 1 ? 7 : Math.max(7, Math.round(card.intervalDays * card.easeFactor * 1.35));
    nextReps += 1;
    nextEase = Math.min(3.0, card.easeFactor + 0.15);
    nextStatus = 'mastered';
    nextDue = now + nextIntervalDays * 24 * 60 * 60 * 1000;
  }

  const updated: FlashcardRecord = {
    ...card,
    intervalDays: nextIntervalDays,
    easeFactor: nextEase,
    repetitions: nextReps,
    lapses: nextLapses,
    status: nextStatus,
    dueTimestamp: nextDue,
    lastReviewedAt: now,
    inDeck: true,
  };

  await db.cards.put(updated);
  return updated;
}

export async function ensureSeededDatabase(): Promise<void> {
  const seeded = await db.meta.get('initialized_v1');
  if (seeded) {
    // Sync any newly added Phase 1 DPD lemmas into IndexedDB without touching existing progress
    const existingLemmas = new Set(await db.cards.toCollection().primaryKeys());
    const now = Date.now();
    const missingCards: FlashcardRecord[] = Object.keys(DPD_DICTIONARY)
      .filter((lemma) => !existingLemmas.has(lemma))
      .map((lemma, idx) => ({
        lemma,
        status: 'new',
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueTimestamp: now,
        inDeck: false,
        addedAt: now - idx * 1000,
      }));
    if (missingCards.length > 0) {
      await db.cards.bulkPut(missingCards);
    }
    return;
  }
  await restoreSampleProgress();
}

export async function restoreSampleProgress(): Promise<void> {
  const now = Date.now();
  const allLemmas = Object.keys(DPD_DICTIONARY);

  const sortedLemmas = [...allLemmas].sort(
    (a, b) =>
      DPD_DICTIONARY[a].difficultyLevel - DPD_DICTIONARY[b].difficultyLevel ||
      DPD_DICTIONARY[a].frequencyRank - DPD_DICTIONARY[b].frequencyRank
  );

  const initialDueLemmas = [
    'buddha',
    'dhamma',
    'saṅgha',
    'saraṇa',
    'gacchati',
    'ahaṃ',
    'namo',
    'bhagavant',
    'manopubbaṅgama',
    'manas',
  ];

  const cardsToInsert: FlashcardRecord[] = sortedLemmas.map((lemma, idx) => {
    const isDue = initialDueLemmas.includes(lemma);
    const isMastered = !isDue && idx < 16;
    return {
      lemma,
      status: isDue ? 'review' : isMastered ? 'mastered' : 'new',
      intervalDays: isDue ? 1 : isMastered ? 14 : 0,
      easeFactor: 2.5,
      repetitions: isDue ? 1 : isMastered ? 3 : 0,
      lapses: lemma === 'paduṭṭha' ? 1 : 0,
      dueTimestamp: isDue ? now - (10 - idx) * 60000 : isMastered ? now + 7 * 86400000 : now,
      inDeck: isDue || isMastered,
      addedAt: now - idx * 3600000,
    };
  });

  await db.cards.clear();
  await db.cards.bulkPut(cardsToInsert);

  await db.suttaProgress.clear();
  await db.suttaProgress.put({
    suttaId: 'dhp-1',
    readSentenceIds: ['dhp-1-1'],
    listenedSentenceIds: ['dhp-1-1'],
    lastSentenceIdx: 0,
    updatedAt: now,
  });

  await db.meta.bulkPut([
    { key: 'initialized_v1', value: true },
    { key: 'streakDays', value: 12 },
    { key: 'baseMasteredOffset', value: 37 },
    { key: 'selectedCourseId', value: 'course-1' },
    { key: 'selectedLessonId', value: 'kp-1' },
    { key: 'dailyCardLimit', value: 8 },
    { key: 'task_cards_done', value: true },
    { key: 'task_grammar_done', value: false },
    { key: 'task_audio_done', value: false },
    { key: 'task_reading_done', value: false },
  ]);
}

// Reset all progress to 0 so the user can study from scratch (从 0 开始学 · 第 1 阶零基础入门课)
export async function resetToZeroProgress(dailyLimit = 5): Promise<void> {
  const now = Date.now();
  const allLemmas = Object.keys(DPD_DICTIONARY);

  const sortedLemmas = [...allLemmas].sort(
    (a, b) =>
      DPD_DICTIONARY[a].difficultyLevel - DPD_DICTIONARY[b].difficultyLevel ||
      DPD_DICTIONARY[a].frequencyRank - DPD_DICTIONARY[b].frequencyRank
  );

  // Put the simplest, most common Level 1 words into today's initial learning queue
  const course1Lemmas = [
    'buddha',
    'dhamma',
    'saṅgha',
    'saraṇa',
    'gacchati',
    'ahaṃ',
    'namo',
    'bhagavant',
    'ca',
    'na',
    'vā',
    'ce',
    'sādhu',
    'bhikkhu',
  ].slice(0, dailyLimit);

  const freshCards: FlashcardRecord[] = sortedLemmas.map((lemma, idx) => {
    const isFirstBatch = course1Lemmas.includes(lemma);
    return {
      lemma,
      status: isFirstBatch ? 'learning' : 'new',
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueTimestamp: now,
      inDeck: isFirstBatch,
      addedAt: now - idx * 1000,
    };
  });

  await db.cards.clear();
  await db.cards.bulkPut(freshCards);
  await db.suttaProgress.clear();
  await db.grammarAttempts.clear();

  await db.meta.bulkPut([
    { key: 'initialized_v1', value: true },
    { key: 'streakDays', value: 0 },
    { key: 'baseMasteredOffset', value: 0 },
    { key: 'selectedCourseId', value: 'course-1' },
    { key: 'selectedLessonId', value: 'kp-1' },
    { key: 'dailyCardLimit', value: dailyLimit },
    { key: 'task_cards_done', value: false },
    { key: 'task_grammar_done', value: false },
    { key: 'task_audio_done', value: false },
    { key: 'task_reading_done', value: false },
  ]);
}
