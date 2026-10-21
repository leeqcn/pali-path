import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlignLeft, BookOpen, CheckCircle2, Layers } from 'lucide-react';
import { FlashcardsView } from './components/FlashcardsView';
import { GrammarView } from './components/GrammarView';
import { InflectionModal } from './components/InflectionModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { SuttaReaderView } from './components/SuttaReaderView';
import { TodayView } from './components/TodayView';
import type { DpdWordEntry } from './data/paliData';
import {
  db,
  ensureSeededDatabase,
  type FlashcardRecord,
  type GrammarAttemptRecord,
} from './db/database';
import { stopPaliAudio } from './utils/paliAudio';

type ActiveTab = 'today' | 'cards' | 'reader' | 'grammar';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [cards, setCards] = useState<FlashcardRecord[]>([]);
  const [grammarAttempts, setGrammarAttempts] = useState<GrammarAttemptRecord[]>([]);
  const [streakDays, setStreakDays] = useState<number>(12);
  const [baseMasteredOffset, setBaseMasteredOffset] = useState<number>(37);
  const [taskStatus, setTaskStatus] = useState({
    cardsDone: true,
    audioDone: false,
    readingDone: false,
  });

  const [selectedSuttaId, setSelectedSuttaId] = useState<string>('dhp-1');
  const [autoPlayAudioOnReader, setAutoPlayAudioOnReader] = useState<boolean>(false);

  // Modal state for DPD inflection tables
  const [inflectionModalEntry, setInflectionModalEntry] = useState<DpdWordEntry | null>(null);
  const [inflectionHighlightForm, setInflectionHighlightForm] = useState<string | undefined>(
    undefined
  );

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
    setTaskStatus({
      cardsDone: Boolean(metaMap.get('task_cards_done') ?? true),
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
      setTaskStatus({
        cardsDone: Boolean(metaMap.get('task_cards_done') ?? true),
        audioDone: Boolean(metaMap.get('task_audio_done') ?? false),
        readingDone: Boolean(metaMap.get('task_reading_done') ?? false),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleTaskDone = async (
    key: 'task_cards_done' | 'task_audio_done' | 'task_reading_done'
  ) => {
    const currentVal =
      key === 'task_cards_done'
        ? taskStatus.cardsDone
        : key === 'task_audio_done'
          ? taskStatus.audioDone
          : taskStatus.readingDone;
    await db.meta.put({ key, value: !currentVal });
    await loadAllFromIndexedDB();
  };

  const handleMarkTaskCompleted = async (
    key: 'task_audio_done' | 'task_reading_done'
  ) => {
    await db.meta.put({ key, value: true });
    await loadAllFromIndexedDB();
  };

  const masteredCount = useMemo(() => {
    const masteredInDb = cards.filter((c) => c.status === 'mastered').length;
    return baseMasteredOffset + masteredInDb;
  }, [cards, baseMasteredOffset]);

  const suttaCoveragePct = useMemo(() => {
    const inDeckCount = cards.filter((c) => c.inDeck || c.status === 'mastered').length;
    return Math.min(98, Math.max(82, Math.round(70 + inDeckCount * 0.75)));
  }, [cards]);

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

      {/* Main Content Area */}
      <main className="w-full">
        {activeTab === 'today' && (
          <TodayView
            cards={cards}
            grammarAttempts={grammarAttempts}
            streakDays={streakDays}
            masteredCount={masteredCount}
            suttaCoveragePct={suttaCoveragePct}
            taskStatus={taskStatus}
            onToggleTaskDone={handleToggleTaskDone}
            onStartFlashcardReview={() => handleSwitchTab('cards')}
            onStartAudioTask={() => {
              setSelectedSuttaId('dhp-2');
              setAutoPlayAudioOnReader(true);
              setActiveTab('reader');
            }}
            onStartReadingTask={() => {
              setSelectedSuttaId('dhp-1');
              setAutoPlayAudioOnReader(false);
              setActiveTab('reader');
            }}
            onStartGrammarTask={() => handleSwitchTab('grammar')}
          />
        )}

        {activeTab === 'cards' && (
          <FlashcardsView
            cards={cards}
            onCardsUpdated={loadAllFromIndexedDB}
            onCloseReviewToToday={() => handleSwitchTab('today')}
            onOpenInflection={handleOpenInflection}
          />
        )}

        {activeTab === 'reader' && (
          <SuttaReaderView
            cards={cards}
            selectedSuttaId={selectedSuttaId}
            onSelectSuttaId={setSelectedSuttaId}
            onCardsUpdated={loadAllFromIndexedDB}
            onOpenInflection={handleOpenInflection}
            onMarkTaskCompleted={handleMarkTaskCompleted}
            autoPlayOnMount={autoPlayAudioOnReader}
          />
        )}

        {activeTab === 'grammar' && (
          <GrammarView
            attempts={grammarAttempts}
            onAttemptsUpdated={loadAllFromIndexedDB}
            onOpenInflection={handleOpenInflection}
          />
        )}
      </main>

      {/* Bottom Navigation Bar matching Reference Images 2 & 3 */}
      <nav
        aria-label="主导航"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6EBE8]"
      >
        <div className="max-w-lg mx-auto grid grid-cols-4 items-center h-16 px-2">
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
        </div>
      </nav>

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
