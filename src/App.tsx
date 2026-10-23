import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlignLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Volume2,
} from 'lucide-react';
import { FlashcardsView } from './components/FlashcardsView';
import { GrammarView } from './components/GrammarView';
import { InflectionModal } from './components/InflectionModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { SuttaReaderView } from './components/SuttaReaderView';
import { TodayView } from './components/TodayView';
import {
  CURRICULUM_COURSES,
  GRAMMAR_TOPICS,
  type DpdWordEntry,
} from './data/paliData';
import {
  checkBrowserPersistentStorage,
  db,
  ensureSeededDatabase,
  exportBackupJsonFile,
  getSavedSnapshots,
  importBackupJsonText,
  performSaveSnapshot,
  requestBrowserPersistentStorage,
  resetToZeroProgress,
  restoreFromSnapshotId,
  restoreSampleProgress,
  setManualStreakDays,
  syncStudyStreak,
  type FlashcardRecord,
  type GrammarAttemptRecord,
  type SavedSnapshotItem,
} from './db/database';
import { stopPaliAudio, subscribeAudioStatus } from './utils/paliAudio';

type ActiveTab = 'today' | 'cards' | 'grammar' | 'reader';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [grammarAttempts, setGrammarAttempts] = useState<GrammarAttemptRecord[]>([]);
  const [streakDays, setStreakDays] = useState<number>(1);
  const [studyDates, setStudyDates] = useState<string[]>([]);
  const [baseMasteredOffset, setBaseMasteredOffset] = useState<number>(37);
  // Progressive Course ID ('course-1' ... 'course-6') — easy to hard
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course-1');
  const [selectedGrammarTopicId, setSelectedGrammarTopicId] = useState<string>(
    GRAMMAR_TOPICS[0].id
  );
  const [dailyCardLimit, setDailyCardLimit] = useState<number>(8);
  const [taskStatus, setTaskStatus] = useState({
    cardsDone: true,
    grammarDone: false,
    audioDone: false,
    readingDone: false,
  });

  // Phase 3: Auto-Save & Manual Save State
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastSaveType, setLastSaveType] = useState<'auto' | 'manual'>('auto');
  const [savedSnapshots, setSavedSnapshots] = useState<SavedSnapshotItem[]>([]);
  const [isStoragePersisted, setIsStoragePersisted] = useState<boolean>(false);

  // Independent Sutta Reader ID (经文阅读独立于课程，默认按原典顺序从 Dhp 1 开始自由阅读)
  const [independentSuttaId, setIndependentSuttaId] = useState<string>('dhp-1');
  const [autoPlayAudioOnReader, setAutoPlayAudioOnReader] = useState<boolean>(false);
  const [activeAudioLabel, setActiveAudioLabel] = useState<string | null>(null);
  const [bottomNavCollapsed, setBottomNavCollapsed] = useState<boolean>(false);

  // Modal state for DPD inflection tables
  const [inflectionModalEntry, setInflectionModalEntry] = useState<DpdWordEntry | null>(null);
  const [inflectionHighlightForm, setInflectionHighlightForm] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    return subscribeAudioStatus((playing, label) => {
      setActiveAudioLabel(playing ? (label ?? '巴利语朗读中...') : null);
    });
  }, []);

  const loadAllFromIndexedDB = useCallback(async (triggerAutoSaveIfEnabled = false) => {
    await ensureSeededDatabase();
    const [allCards, allAttempts, metaRows] = await Promise.all([
      db.cards.toArray(),
      db.grammarAttempts.toArray(),
      db.meta.toArray(),
    ]);
    setCards(allCards);
    setGrammarAttempts(allAttempts);

    const metaMap = new Map(metaRows.map((m) => [m.key, m.value]));
    if (typeof metaMap.get('streakDays') === 'number') {
      setStreakDays(metaMap.get('streakDays') as number);
    }
    if (typeof metaMap.get('studyDatesJson') === 'string') {
      try {
        const parsed = JSON.parse(metaMap.get('studyDatesJson') as string);
        if (Array.isArray(parsed)) {
          setStudyDates(parsed.filter((d): d is string => typeof d === 'string'));
        }
      } catch {
        // Ignore
      }
    }
    if (typeof metaMap.get('baseMasteredOffset') === 'number') {
      setBaseMasteredOffset(metaMap.get('baseMasteredOffset') as number);
    }
    if (typeof metaMap.get('dailyCardLimit') === 'number') {
      setDailyCardLimit(metaMap.get('dailyCardLimit') as number);
    }
    const isAutoSaveOn =
      typeof metaMap.get('autoSaveEnabled') === 'boolean'
        ? (metaMap.get('autoSaveEnabled') as boolean)
        : true;
    setAutoSaveEnabled(isAutoSaveOn);

    if (typeof metaMap.get('lastSavedAt') === 'number') {
      setLastSavedAt(metaMap.get('lastSavedAt') as number);
    }
    if (metaMap.get('lastSaveType') === 'manual' || metaMap.get('lastSaveType') === 'auto') {
      setLastSaveType(metaMap.get('lastSaveType') as 'auto' | 'manual');
    }

    if (typeof metaMap.get('selectedCourseId') === 'string') {
      const savedCourseId = metaMap.get('selectedCourseId') as string;
      setSelectedCourseId(savedCourseId);
      const foundCourse = CURRICULUM_COURSES.find((c) => c.id === savedCourseId);
      if (foundCourse) {
        setSelectedGrammarTopicId(foundCourse.grammarTopicId);
      }
    }
    setTaskStatus({
      cardsDone: Boolean(metaMap.get('task_cards_done') ?? true),
      grammarDone: Boolean(metaMap.get('task_grammar_done') ?? false),
      audioDone: Boolean(metaMap.get('task_audio_done') ?? false),
      readingDone: Boolean(metaMap.get('task_reading_done') ?? false),
    });

    if (triggerAutoSaveIfEnabled && isAutoSaveOn) {
      const snap = await performSaveSnapshot('auto', '学习进度自动同步');
      setLastSavedAt(snap.timestamp);
      setLastSaveType('auto');
    }
    setSavedSnapshots(getSavedSnapshots());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeededDatabase();
      const persisted = await checkBrowserPersistentStorage();
      if (!persisted) {
        const req = await requestBrowserPersistentStorage();
        if (!cancelled) setIsStoragePersisted(req.persisted);
      } else if (!cancelled) {
        setIsStoragePersisted(true);
      }

      const [allCards, allAttempts, metaRows] = await Promise.all([
        db.cards.toArray(),
        db.grammarAttempts.toArray(),
        db.meta.toArray(),
      ]);
      if (cancelled) return;
      setCards(allCards);
      setGrammarAttempts(allAttempts);

      const metaMap = new Map(metaRows.map((m) => [m.key, m.value]));
      if (typeof metaMap.get('streakDays') === 'number') {
        setStreakDays(metaMap.get('streakDays') as number);
      }
      if (typeof metaMap.get('studyDatesJson') === 'string') {
        try {
          const parsed = JSON.parse(metaMap.get('studyDatesJson') as string);
          if (Array.isArray(parsed)) {
            setStudyDates(parsed.filter((d): d is string => typeof d === 'string'));
          }
        } catch {
          // Ignore
        }
      }
      if (typeof metaMap.get('baseMasteredOffset') === 'number') {
        setBaseMasteredOffset(metaMap.get('baseMasteredOffset') as number);
      }
      if (typeof metaMap.get('dailyCardLimit') === 'number') {
        setDailyCardLimit(metaMap.get('dailyCardLimit') as number);
      }
      const isAutoSaveOn =
        typeof metaMap.get('autoSaveEnabled') === 'boolean'
          ? (metaMap.get('autoSaveEnabled') as boolean)
          : true;
      setAutoSaveEnabled(isAutoSaveOn);
      if (typeof metaMap.get('lastSavedAt') === 'number') {
        setLastSavedAt(metaMap.get('lastSavedAt') as number);
      } else {
        setLastSavedAt(Date.now());
      }
      if (metaMap.get('lastSaveType') === 'manual' || metaMap.get('lastSaveType') === 'auto') {
        setLastSaveType(metaMap.get('lastSaveType') as 'auto' | 'manual');
      }

      if (typeof metaMap.get('selectedCourseId') === 'string') {
        const savedCourseId = metaMap.get('selectedCourseId') as string;
        setSelectedCourseId(savedCourseId);
        const foundCourse = CURRICULUM_COURSES.find((c) => c.id === savedCourseId);
        if (foundCourse) {
          setSelectedGrammarTopicId(foundCourse.grammarTopicId);
        }
      }
      setTaskStatus({
        cardsDone: Boolean(metaMap.get('task_cards_done') ?? true),
        grammarDone: Boolean(metaMap.get('task_grammar_done') ?? false),
        audioDone: Boolean(metaMap.get('task_audio_done') ?? false),
        readingDone: Boolean(metaMap.get('task_reading_done') ?? false),
      });
      setSavedSnapshots(getSavedSnapshots());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Also auto-save when visibility changes (e.g., user switches app / locks phone screen)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && autoSaveEnabled) {
        void performSaveSnapshot('auto', '切出页面自动备份').then((snap) => {
          setLastSavedAt(snap.timestamp);
          setLastSaveType('auto');
          setSavedSnapshots(getSavedSnapshots());
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoSaveEnabled]);

  const handleToggleAutoSave = async (enabled: boolean) => {
    await db.meta.put({ key: 'autoSaveEnabled', value: enabled });
    setAutoSaveEnabled(enabled);
    if (enabled) {
      const snap = await performSaveSnapshot('auto', '开启自动保存');
      setLastSavedAt(snap.timestamp);
      setLastSaveType('auto');
      setSavedSnapshots(getSavedSnapshots());
    }
  };

  const handleManualSave = async (customLabel?: string) => {
    const snap = await performSaveSnapshot('manual', customLabel ?? '手动保存存档');
    setLastSavedAt(snap.timestamp);
    setLastSaveType('manual');
    setSavedSnapshots(getSavedSnapshots());
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    await restoreFromSnapshotId(snapshotId);
    await loadAllFromIndexedDB(false);
  };

  const handleExportBackupFile = async (): Promise<string> => {
    const fileName = await exportBackupJsonFile();
    await loadAllFromIndexedDB(false);
    return fileName;
  };

  const handleImportBackupFile = async (jsonText: string) => {
    await importBackupJsonText(jsonText);
    await loadAllFromIndexedDB(false);
  };

  const handleRequestPersistStorage = async (): Promise<boolean> => {
    const res = await requestBrowserPersistentStorage();
    setIsStoragePersisted(res.persisted);
    return res.persisted;
  };

  // Selecting a progressive course updates the course & grammar topic, without locking the independent Sutta Reader
  const handleSelectCourse = async (courseId: string) => {
    const course = CURRICULUM_COURSES.find((c) => c.id === courseId) ?? CURRICULUM_COURSES[0];
    await db.meta.put({ key: 'selectedCourseId', value: course.id });
    setSelectedCourseId(course.id);
    setSelectedGrammarTopicId(course.grammarTopicId);
    await loadAllFromIndexedDB(true);
  };

  const handleChangeDailyCardLimit = async (limit: number) => {
    await db.meta.put({ key: 'dailyCardLimit', value: limit });
    setDailyCardLimit(limit);
    await loadAllFromIndexedDB(true);
  };

  const handleResetToZero = async () => {
    stopPaliAudio();
    await resetToZeroProgress(dailyCardLimit);
    setSelectedCourseId('course-1');
    setSelectedGrammarTopicId('grammar-lv1-basics');
    await loadAllFromIndexedDB(false);
  };

  const handleRestoreSample = async () => {
    stopPaliAudio();
    await restoreSampleProgress();
    await loadAllFromIndexedDB(false);
  };

  const handleToggleTaskDone = async (
    key: 'task_cards_done' | 'task_grammar_done' | 'task_audio_done' | 'task_reading_done'
  ) => {
    const currentVal =
      key === 'task_cards_done'
        ? taskStatus.cardsDone
        : key === 'task_grammar_done'
          ? taskStatus.grammarDone
          : key === 'task_audio_done'
            ? taskStatus.audioDone
            : taskStatus.readingDone;
    await db.meta.put({ key, value: !currentVal });
    await syncStudyStreak(true);
    await loadAllFromIndexedDB(true);
  };

  const handleMarkTaskCompleted = async (
    key: 'task_cards_done' | 'task_grammar_done' | 'task_audio_done' | 'task_reading_done'
  ) => {
    await db.meta.put({ key, value: true });
    await syncStudyStreak(true);
    await loadAllFromIndexedDB(true);
  };

  const handleSetManualStreakDays = async (days: number | null) => {
    if (days === null) {
      await db.meta.bulkPut([
        { key: 'manualStreakDate', value: '' },
        { key: 'manualStreakDays', value: -1 },
      ]);
      await syncStudyStreak(true);
    } else {
      await setManualStreakDays(days);
    }
    await loadAllFromIndexedDB(true);
  };

  const masteredCount = useMemo(() => {
    const masteredInDb = cards.filter((c) => c.status === 'mastered').length;
    return baseMasteredOffset + masteredInDb;
  }, [cards, baseMasteredOffset]);

  const suttaCoveragePct = useMemo(() => {
    const masteredInDb = cards.filter((c) => c.status === 'mastered').length;
    const reviewedInDb = cards.filter((c) => c.repetitions > 0 || c.status === 'mastered').length;
    if (baseMasteredOffset === 0 && masteredInDb === 0 && reviewedInDb === 0) {
      return 0;
    }
    if (baseMasteredOffset === 0) {
      return Math.min(100, Math.round((reviewedInDb / Math.max(1, cards.length)) * 100));
    }
    const inDeckCount = cards.filter((c) => c.inDeck || c.status === 'mastered').length;
    return Math.min(98, Math.max(82, Math.round(70 + inDeckCount * 0.75)));
  }, [cards, baseMasteredOffset]);

  const handleSwitchTab = (tab: ActiveTab) => {
    stopPaliAudio();
    setAutoPlayAudioOnReader(false);
    setActiveTab(tab);
  };

  const handleOpenInflection = (entry: DpdWordEntry, highlightForm?: string) => {
    setInflectionModalEntry(entry);
    setInflectionHighlightForm(highlightForm);
  };

  return (
    <div className="min-h-svh bg-[#F2F4F0] text-[#1E2A27] selection:bg-[#DCECE8]">
      <OfflineIndicator />

      {/* Live Audio Playing Indicator */}
      {activeAudioLabel && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#1F2E2B]/95 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-[#E5F0ED] shadow-md max-w-[90vw]">
          <Volume2 className="w-3.5 h-3.5 text-[#72D6CA] shrink-0" />
          <span className="truncate font-pali">正在朗读：{activeAudioLabel}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="w-full">
        {activeTab === 'today' && (
          <TodayView
            cards={cards}
            grammarAttempts={grammarAttempts}
            streakDays={streakDays}
            studyDates={studyDates}
            onSetManualStreakDays={handleSetManualStreakDays}
            masteredCount={masteredCount}
            suttaCoveragePct={suttaCoveragePct}
            selectedCourseId={selectedCourseId}
            dailyCardLimit={dailyCardLimit}
            onChangeDailyCardLimit={handleChangeDailyCardLimit}
            onSelectCourse={handleSelectCourse}
            onResetToZero={handleResetToZero}
            onRestoreSample={handleRestoreSample}
            autoSaveEnabled={autoSaveEnabled}
            lastSavedAt={lastSavedAt}
            lastSaveType={lastSaveType}
            savedSnapshots={savedSnapshots}
            isStoragePersisted={isStoragePersisted}
            onToggleAutoSave={handleToggleAutoSave}
            onManualSave={handleManualSave}
            onRestoreSnapshot={handleRestoreSnapshot}
            onExportBackupFile={handleExportBackupFile}
            onImportBackupFile={handleImportBackupFile}
            onRequestPersistStorage={handleRequestPersistStorage}
            taskStatus={taskStatus}
            onToggleTaskDone={handleToggleTaskDone}
            onStartFlashcardReview={() => handleSwitchTab('cards')}
            onStartGrammarTask={(grammarTopicId) => {
              setSelectedGrammarTopicId(grammarTopicId);
              handleSwitchTab('grammar');
            }}
            onStartAudioTask={(suttaId) => {
              setIndependentSuttaId(suttaId);
              setAutoPlayAudioOnReader(true);
              setActiveTab('reader');
            }}
            onStartReadingTask={(suttaId) => {
              setIndependentSuttaId(suttaId);
              setAutoPlayAudioOnReader(false);
              setActiveTab('reader');
            }}
          />
        )}

        {activeTab === 'cards' && (
          <FlashcardsView
            cards={cards}
            selectedCourseId={selectedCourseId}
            dailyCardLimit={dailyCardLimit}
            onChangeDailyCardLimit={handleChangeDailyCardLimit}
            onCardsUpdated={() => loadAllFromIndexedDB(true)}
            onMarkCardsDone={() => handleMarkTaskCompleted('task_cards_done')}
            onCloseReviewToToday={() => handleSwitchTab('today')}
            onOpenInflection={handleOpenInflection}
          />
        )}

        {activeTab === 'grammar' && (
          <GrammarView
            attempts={grammarAttempts}
            selectedTopicId={selectedGrammarTopicId}
            onSelectTopicId={setSelectedGrammarTopicId}
            onAttemptsUpdated={() => loadAllFromIndexedDB(true)}
            onMarkGrammarDone={() => handleMarkTaskCompleted('task_grammar_done')}
            onOpenInflection={handleOpenInflection}
          />
        )}

        {activeTab === 'reader' && (
          <SuttaReaderView
            cards={cards}
            selectedSuttaId={independentSuttaId}
            onSelectSuttaId={setIndependentSuttaId}
            onCardsUpdated={() => loadAllFromIndexedDB(true)}
            onOpenInflection={handleOpenInflection}
            onMarkTaskCompleted={handleMarkTaskCompleted}
            autoPlayOnMount={autoPlayAudioOnReader}
          />
        )}
      </main>

      {/* Collapsible Bottom Navigation Bar (Order: 今日 | 词卡 | 语法 | 阅读) */}
      {bottomNavCollapsed ? (
        <div className="fixed bottom-3 right-4 z-40">
          <button
            type="button"
            onClick={() => setBottomNavCollapsed(false)}
            aria-label="展开底部导航菜单"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#20302D]/90 backdrop-blur-md text-[#F4F7F5] px-3.5 py-2 text-xs font-medium shadow-md hover:bg-[#25635E] transition-colors cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>展开导航</span>
          </button>
        </div>
      ) : (
        <nav
          aria-label="主导航"
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAFBF9]/95 backdrop-blur-md border-t border-[#E2EAE6]"
        >
          <div className="max-w-lg mx-auto relative grid grid-cols-4 items-center h-16 px-2.5">
            {/* Collapse Toggle Handle */}
            <button
              type="button"
              onClick={() => setBottomNavCollapsed(true)}
              title="收起底部导航"
              aria-label="收起底部导航"
              className="absolute -top-3.5 right-3 w-7 h-3.5 rounded-t-lg bg-[#FAFBF9] border border-b-0 border-[#E2EAE6] text-[#7A8783] hover:text-[#1E2A27] flex items-center justify-center cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {(
              [
                { id: 'today', label: '今日', Icon: CheckCircle2 },
                { id: 'cards', label: '词卡', Icon: Layers },
                { id: 'grammar', label: '语法', Icon: AlignLeft },
                { id: 'reader', label: '阅读', Icon: BookOpen },
              ] as const
            ).map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSwitchTab(id)}
                  className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                    isActive ? 'text-[#25635E]' : 'text-[#687773] hover:text-[#1E2A27]'
                  }`}
                >
                  <div
                    className={`px-3.5 py-1 rounded-full transition-colors flex items-center justify-center ${
                      isActive ? 'bg-[#E7F1EE]' : 'bg-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`}
                    />
                  </div>
                  <span
                    className={`text-[11px] mt-0.5 ${
                      isActive ? 'font-bold text-[#25635E]' : 'font-medium'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* DPD Inflection Table Modal */}
      <InflectionModal
        entry={inflectionModalEntry}
        highlightForm={inflectionHighlightForm}
        onClose={() => setInflectionModalEntry(null)}
      />
    </div>
  );
}

export default App;
