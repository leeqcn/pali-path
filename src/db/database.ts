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

export async function saveSuttaSentenceProgress(
  suttaId: string,
  sentenceId: string,
  sentenceIdx: number,
  mode: 'read' | 'listen'
): Promise<string[]> {
  const existing = await db.suttaProgress.get(suttaId);
  const nextRead = new Set(existing?.readSentenceIds ?? []);
  const nextListened = new Set(existing?.listenedSentenceIds ?? []);
  nextRead.add(sentenceId);
  if (mode === 'listen') {
    nextListened.add(sentenceId);
  }
  const nextReadArr = Array.from(nextRead);
  await db.suttaProgress.put({
    suttaId,
    readSentenceIds: nextReadArr,
    listenedSentenceIds: Array.from(nextListened),
    lastSentenceIdx: sentenceIdx,
    updatedAt: Date.now(),
  });
  return nextReadArr;
}

export interface PaliBackupPayload {
  version: 1;
  app: 'PaliPathPWA';
  exportedAt: number;
  exportedAtIso: string;
  saveType: 'auto' | 'manual' | 'file';
  label: string;
  summary: {
    totalCards: number;
    inDeckCount: number;
    masteredCount: number;
    grammarAttemptsCount: number;
    suttaProgressCount: number;
    selectedCourseId: string;
    streakDays: number;
  };
  data: {
    cards: FlashcardRecord[];
    suttaProgress: SuttaProgressRecord[];
    grammarAttempts: GrammarAttemptRecord[];
    meta: StudyMetaRecord[];
  };
}

export interface SavedSnapshotItem {
  id: string;
  timestamp: number;
  saveType: 'auto' | 'manual';
  label: string;
  summary: PaliBackupPayload['summary'];
  payload: PaliBackupPayload;
}

const MIRROR_STORAGE_KEY = 'pali_path_autosave_mirror_v1';
const SNAPSHOTS_STORAGE_KEY = 'pali_path_snapshots_v1';
const MAX_SAVED_SNAPSHOTS = 8;

export async function checkBrowserPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
  } catch {
    // Ignore in unsupported environments
  }
  return false;
}

export async function requestBrowserPersistentStorage(): Promise<{
  persisted: boolean;
  supported: boolean;
}> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      return { persisted, supported: true };
    }
  } catch {
    // Ignore in unsupported environments
  }
  return { persisted: false, supported: false };
}

export async function createBackupPayload(
  saveType: 'auto' | 'manual' | 'file' = 'manual',
  label = '手动保存存档'
): Promise<PaliBackupPayload> {
  const [cards, suttaProgress, grammarAttempts, meta] = await Promise.all([
    db.cards.toArray(),
    db.suttaProgress.toArray(),
    db.grammarAttempts.toArray(),
    db.meta.toArray(),
  ]);

  const metaMap = new Map(meta.map((m) => [m.key, m.value]));
  const baseOffset =
    typeof metaMap.get('baseMasteredOffset') === 'number'
      ? (metaMap.get('baseMasteredOffset') as number)
      : 0;
  const masteredInDb = cards.filter((c) => c.status === 'mastered').length;
  const inDeckCount = cards.filter((c) => c.inDeck).length;
  const selectedCourseId =
    typeof metaMap.get('selectedCourseId') === 'string'
      ? (metaMap.get('selectedCourseId') as string)
      : 'course-1';
  const streakDays =
    typeof metaMap.get('streakDays') === 'number' ? (metaMap.get('streakDays') as number) : 0;

  const now = Date.now();
  return {
    version: 1,
    app: 'PaliPathPWA',
    exportedAt: now,
    exportedAtIso: new Date(now).toISOString(),
    saveType,
    label,
    summary: {
      totalCards: cards.length,
      inDeckCount,
      masteredCount: baseOffset + masteredInDb,
      grammarAttemptsCount: grammarAttempts.length,
      suttaProgressCount: suttaProgress.length,
      selectedCourseId,
      streakDays,
    },
    data: {
      cards,
      suttaProgress,
      grammarAttempts,
      meta,
    },
  };
}

export function getSavedSnapshots(): SavedSnapshotItem[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSnapshotItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function performSaveSnapshot(
  saveType: 'auto' | 'manual',
  customLabel?: string
): Promise<SavedSnapshotItem> {
  const now = Date.now();
  const label =
    customLabel ?? (saveType === 'manual' ? '手动保存快照' : '学习进度自动备份');

  await db.meta.bulkPut([
    { key: 'lastSavedAt', value: now },
    { key: 'lastSaveType', value: saveType },
  ]);

  const payload = await createBackupPayload(saveType, label);
  const snapshot: SavedSnapshotItem = {
    id: `${saveType}-${now}`,
    timestamp: now,
    saveType,
    label,
    summary: payload.summary,
    payload,
  };

  try {
    // 1. Always update the primary self-healing mirror in localStorage
    localStorage.setItem(MIRROR_STORAGE_KEY, JSON.stringify(payload));

    // 2. Maintain snapshot history list (keep manual snapshots + latest auto snapshot)
    const existing = getSavedSnapshots();
    let nextList: SavedSnapshotItem[];
    if (saveType === 'auto') {
      // Replace older auto-saves so manual checkpoints aren't pushed out
      const manualsOnly = existing.filter((s) => s.saveType === 'manual');
      nextList = [snapshot, ...manualsOnly].slice(0, MAX_SAVED_SNAPSHOTS);
    } else {
      nextList = [snapshot, ...existing].slice(0, MAX_SAVED_SNAPSHOTS);
    }
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // Ignore storage quota errors
  }

  return snapshot;
}

export async function applyBackupPayload(payload: PaliBackupPayload): Promise<void> {
  if (!payload || !payload.data || !Array.isArray(payload.data.cards)) {
    throw new Error('无效的备份数据格式');
  }

  const now = Date.now();
  await db.transaction('rw', db.cards, db.suttaProgress, db.grammarAttempts, db.meta, async () => {
    await db.cards.clear();
    await db.cards.bulkPut(payload.data.cards);

    await db.suttaProgress.clear();
    if (Array.isArray(payload.data.suttaProgress) && payload.data.suttaProgress.length > 0) {
      await db.suttaProgress.bulkPut(payload.data.suttaProgress);
    }

    await db.grammarAttempts.clear();
    if (Array.isArray(payload.data.grammarAttempts) && payload.data.grammarAttempts.length > 0) {
      await db.grammarAttempts.bulkPut(payload.data.grammarAttempts);
    }

    await db.meta.clear();
    if (Array.isArray(payload.data.meta) && payload.data.meta.length > 0) {
      await db.meta.bulkPut(payload.data.meta);
    }
    await db.meta.bulkPut([
      { key: 'initialized_v1', value: true },
      { key: 'lastSavedAt', value: now },
      { key: 'lastSaveType', value: 'manual' },
    ]);
  });

  // Also ensure any newer DPD lemmas exist
  const existingLemmas = new Set(await db.cards.toCollection().primaryKeys());
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
}

export async function restoreFromSnapshotId(snapshotId: string): Promise<SavedSnapshotItem> {
  const list = getSavedSnapshots();
  const target = list.find((s) => s.id === snapshotId);
  if (!target) {
    throw new Error('未找到指定的历史快照');
  }
  await applyBackupPayload(target.payload);
  return target;
}

export async function exportBackupJsonFile(): Promise<string> {
  const payload = await createBackupPayload('file', '导出 JSON 备份文件');
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `pali-study-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  await performSaveSnapshot('manual', `导出 JSON 备份 (${dateStr})`);
  return fileName;
}

export async function importBackupJsonText(jsonText: string): Promise<PaliBackupPayload> {
  let parsed: PaliBackupPayload;
  try {
    parsed = JSON.parse(jsonText) as PaliBackupPayload;
  } catch {
    throw new Error('备份文件不是有效的 JSON 格式');
  }

  if (!parsed || !parsed.data || !Array.isArray(parsed.data.cards)) {
    throw new Error('备份文件缺少巴利词卡核心数据，请确认文件是否正确');
  }

  await applyBackupPayload(parsed);
  await performSaveSnapshot('manual', '从外部 JSON 文件导入恢复');
  return parsed;
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

  // Self-Healing Anti-Loss Check: If IndexedDB was cleared, check if localStorage mirror exists!
  try {
    const mirrorRaw = localStorage.getItem(MIRROR_STORAGE_KEY);
    if (mirrorRaw) {
      const mirrorPayload = JSON.parse(mirrorRaw) as PaliBackupPayload;
      if (mirrorPayload?.data?.cards?.length) {
        await applyBackupPayload(mirrorPayload);
        return;
      }
    }
  } catch {
    // Ignore mirror parse failure and fall back to sample seed
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
    { key: 'autoSaveEnabled', value: true },
    { key: 'lastSavedAt', value: now },
    { key: 'lastSaveType', value: 'auto' },
    { key: 'task_cards_done', value: true },
    { key: 'task_grammar_done', value: false },
    { key: 'task_audio_done', value: false },
    { key: 'task_reading_done', value: false },
  ]);

  await performSaveSnapshot('auto', '初始 12 天示例学习存档');
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
    { key: 'autoSaveEnabled', value: true },
    { key: 'lastSavedAt', value: now },
    { key: 'lastSaveType', value: 'manual' },
    { key: 'task_cards_done', value: false },
    { key: 'task_grammar_done', value: false },
    { key: 'task_audio_done', value: false },
    { key: 'task_reading_done', value: false },
  ]);

  await performSaveSnapshot('manual', '重置为从 0 开始学习存档');
}

