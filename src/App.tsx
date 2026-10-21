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
  db,
  ensureSeededDatabase,
  resetToZeroProgress,
  restoreSampleProgress,
  type FlashcardRecord,
  type GrammarAttemptRecord,
} from './db/database';
import { stopPaliAudio, subscribeAudioStatus } from './utils/paliAudio';

type ActiveTab = 'today' | 'cards' | 'grammar' | 'reader';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [grammarAttempts, setGrammarAttempts] = useState<GrammarAttemptRecord[]>([]);
  const [streakDays, setStreakDays] = useState<number>(12);
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

  const loadAllFromIndexedDB = useCallback(async () => {
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
    if (typeof metaMap.get('baseMasteredOffset') === 'number') {
      setBaseMasteredOffset(metaMap.get('baseMasteredOffset') as number);
    }
    if (typeof metaMap.get('dailyCardLimit') === 'number') {
      setDailyCardLimit(metaMap.get('dailyCardLimit') as number);
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSeededDatabase();
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
      if (typeof metaMap.get('baseMasteredOffset') === 'number') {
        setBaseMasteredOffset(metaMap.get('baseMasteredOffset') as number);
      }
      if (typeof metaMap.get('dailyCardLimit') === 'number') {
        setDailyCardLimit(metaMap.get('dailyCardLimit') as number);
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Selecting a progressive course updates the course & grammar topic, without locking the independent Sutta Reader
  const handleSelectCourse = async (courseId: string) => {
    const course = CURRICULUM_COURSES.find((c) => c.id === courseId) ?? CURRICULUM_COURSES[0];
    await db.meta.put({ key: 'selectedCourseId', value: course.id });
    setSelectedCourseId(course.id);
    setSelectedGrammarTopicId(course.grammarTopicId);
    await loadAllFromIndexedDB();
  };

  const handleChangeDailyCardLimit = async (limit: number) => {
    await db.meta.put({ key: 'dailyCardLimit', value: limit });
    setDailyCardLimit(limit);
    await loadAllFromIndexedDB();
  };

  const handleResetToZero = async () => {
    stopPaliAudio();
    await resetToZeroProgress(dailyCardLimit);
    setSelectedCourseId('course-1');
    setSelectedGrammarTopicId('grammar-lv1-basics');
    await loadAllFromIndexedDB();
  };

  const handleRestoreSample = async () => {
    stopPaliAudio();
    await restoreSampleProgress();
    await loadAllFromIndexedDB();
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
    await loadAllFromIndexedDB();
  };

  const handleMarkTaskCompleted = async (
    key: 'task_cards_done' | 'task_grammar_done' | 'task_audio_done' | 'task_reading_done'
  ) => {
    await db.meta.put({ key, value: true });
    await loadAllFromIndexedDB();
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
    <div className="min-h-svh bg-[#F5F6F4] text-[#141D1B] selection:bg-[#DDF0ED]">
      <OfflineIndicator />

      {/* Live Audio Playing Indicator */}
      {activeAudioLabel && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#16211F] px-4 py-1.5 text-xs font-medium text-[#E2EFED] shadow-lg max-w-[90vw]">
          <Volume2 className="w-3.5 h-3.5 text-[#5ED4C8] shrink-0" />
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
            masteredCount={masteredCount}
            suttaCoveragePct={suttaCoveragePct}
            selectedCourseId={selectedCourseId}
            dailyCardLimit={dailyCardLimit}
            onChangeDailyCardLimit={handleChangeDailyCardLimit}
            onSelectCourse={handleSelectCourse}
            onResetToZero={handleResetToZero}
            onRestoreSample={handleRestoreSample}
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
            onCardsUpdated={loadAllFromIndexedDB}
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
            onAttemptsUpdated={loadAllFromIndexedDB}
            onMarkGrammarDone={() => handleMarkTaskCompleted('task_grammar_done')}
            onOpenInflection={handleOpenInflection}
          />
        )}

        {activeTab === 'reader' && (
          <SuttaReaderView
            cards={cards}
            selectedSuttaId={independentSuttaId}
            onSelectSuttaId={setIndependentSuttaId}
            onCardsUpdated={loadAllFromIndexedDB}
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
            className="inline-flex items-center gap-1.5 rounded-full bg-[#16211F]/90 backdrop-blur-md text-white px-3.5 py-2 text-xs font-medium shadow-lg hover:bg-[#1E625E] transition-colors cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>展开菜单</span>
          </button>
        </div>
      ) : (
        <nav
          aria-label="主导航"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6EBE8]"
        >
          <div className="max-w-lg mx-auto relative grid grid-cols-4 items-center h-16 px-2">
            {/* Collapse Toggle Handle */}
            <button
              type="button"
              onClick={() => setBottomNavCollapsed(true)}
              title="收起底部菜单"
              aria-label="收起底部菜单"
              className="absolute -top-3.5 right-3 w-7 h-3.5 rounded-t-lg bg-white border border-b-0 border-[#E6EBE8] text-[#7A8783] hover:text-[#141D1B] flex items-center justify-center cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('today')}
              className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                activeTab === 'today' ? 'text-[#1E625E]' : 'text-[#64706D] hover:text-[#141D1B]'
              }`}
            >
              <CheckCircle2
                className={`w-6 h-6 ${activeTab === 'today' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`}
              />
              <span
                className={`text-xs mt-1 ${
                  activeTab === 'today' ? 'font-bold' : 'font-medium'
                }`}
              >
                今日
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('cards')}
              className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                activeTab === 'cards' ? 'text-[#1E625E]' : 'text-[#64706D] hover:text-[#141D1B]'
              }`}
            >
              <Layers
                className={`w-6 h-6 ${activeTab === 'cards' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`}
              />
              <span
                className={`text-xs mt-1 ${
                  activeTab === 'cards' ? 'font-bold' : 'font-medium'
                }`}
              >
                词卡
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('grammar')}
              className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                activeTab === 'grammar' ? 'text-[#1E625E]' : 'text-[#64706D] hover:text-[#141D1B]'
              }`}
            >
              <AlignLeft
                className={`w-6 h-6 ${activeTab === 'grammar' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`}
              />
              <span
                className={`text-xs mt-1 ${
                  activeTab === 'grammar' ? 'font-bold' : 'font-medium'
                }`}
              >
                语法
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('reader')}
              className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                activeTab === 'reader' ? 'text-[#1E625E]' : 'text-[#64706D] hover:text-[#141D1B]'
              }`}
            >
              <BookOpen
                className={`w-6 h-6 ${activeTab === 'reader' ? 'stroke-[2.2]' : 'stroke-[1.75]'}`}
              />
              <span
                className={`text-xs mt-1 ${
                  activeTab === 'reader' ? 'font-bold' : 'font-medium'
                }`}
              >
                阅读
              </span>
            </button>
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
