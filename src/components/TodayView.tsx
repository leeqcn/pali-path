import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Database,
  Download,
  ExternalLink,
  HelpCircle,
  History,
  Layers,
  Menu,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import {
  CURRICULUM_COURSES,
  DATA_SOURCES_AND_LICENSES,
  DPD_DICTIONARY,
  GRAMMAR_TOPICS,
  SUTTAS,
  type CurriculumCourse,
  type SuttaItem,
} from '../data/paliData';
import type {
  FlashcardRecord,
  GrammarAttemptRecord,
  SavedSnapshotItem,
} from '../db/database';
import { speakPaliText } from '../utils/paliAudio';
import { PWAInstallButton } from './PWAInstallButton';

interface TodayViewProps {
  cards: FlashcardRecord[];
  grammarAttempts: GrammarAttemptRecord[];
  streakDays: number;
  studyDates: string[];
  onSetManualStreakDays: (days: number | null) => Promise<void>;
  masteredCount: number;
  suttaCoveragePct: number;
  selectedCourseId: string;
  dailyCardLimit: number;
  onChangeDailyCardLimit: (limit: number) => Promise<void>;
  onSelectCourse: (courseId: string) => Promise<void>;
  onResetToZero: () => Promise<void>;
  onRestoreSample: () => Promise<void>;
  // Phase 3: Auto-Save & Manual Save & Backup Props
  autoSaveEnabled: boolean;
  lastSavedAt: number | null;
  lastSaveType: 'auto' | 'manual';
  savedSnapshots: SavedSnapshotItem[];
  isStoragePersisted: boolean;
  onToggleAutoSave: (enabled: boolean) => Promise<void>;
  onManualSave: (customLabel?: string) => Promise<void>;
  onRestoreSnapshot: (snapshotId: string) => Promise<void>;
  onExportBackupFile: () => Promise<string>;
  onImportBackupFile: (jsonText: string) => Promise<void>;
  onRequestPersistStorage: () => Promise<boolean>;
  taskStatus: {
    cardsDone: boolean;
    grammarDone: boolean;
    audioDone: boolean;
    readingDone: boolean;
  };
  onToggleTaskDone: (
    key: 'task_cards_done' | 'task_grammar_done' | 'task_audio_done' | 'task_reading_done'
  ) => Promise<void>;
  onStartFlashcardReview: () => void;
  onStartGrammarTask: (grammarTopicId: string) => void;
  onStartAudioTask: (suttaId: string) => void;
  onStartReadingTask: (suttaId: string) => void;
}

type DrawerTab = 'plan' | 'guide' | 'backup';

function formatSaveTime(ts: number | null): string {
  if (!ts) return '尚未保存';
  const date = new Date(ts);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export const TodayView: React.FC<TodayViewProps> = ({
  cards,
  grammarAttempts,
  streakDays,
  studyDates,
  onSetManualStreakDays,
  masteredCount,
  suttaCoveragePct,
  selectedCourseId,
  dailyCardLimit,
  onChangeDailyCardLimit,
  onSelectCourse,
  onResetToZero,
  onRestoreSample,
  autoSaveEnabled,
  lastSavedAt,
  lastSaveType,
  savedSnapshots,
  isStoragePersisted,
  onToggleAutoSave,
  onManualSave,
  onRestoreSnapshot,
  onExportBackupFile,
  onImportBackupFile,
  onRequestPersistStorage,
  taskStatus,
  onToggleTaskDone,
  onStartFlashcardReview,
  onStartGrammarTask,
  onStartAudioTask,
  onStartReadingTask,
}) => {
  const [showDataAndStats, setShowDataAndStats] = useState(false);
  const [showStreakDetail, setShowStreakDetail] = useState(false);
  // Collapsible Menu Drawer (平时收起，点击右上角图标展开)
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('plan');
  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentCourse: CurriculumCourse = useMemo(
    () => CURRICULUM_COURSES.find((c) => c.id === selectedCourseId) ?? CURRICULUM_COURSES[0],
    [selectedCourseId]
  );

  const courseSutta: SuttaItem = useMemo(
    () => SUTTAS.find((s) => s.id === currentCourse.suttaId) ?? SUTTAS[0],
    [currentCourse.suttaId]
  );

  const totalVocabCount = Object.keys(DPD_DICTIONARY).length;
  const totalGrammarExercises = useMemo(
    () => GRAMMAR_TOPICS.reduce((sum, t) => sum + t.exercises.length, 0),
    []
  );

  const completedTasksCount =
    (taskStatus.cardsDone ? 1 : 0) +
    (taskStatus.grammarDone ? 1 : 0) +
    (taskStatus.audioDone ? 1 : 0) +
    (taskStatus.readingDone ? 1 : 0);

  // SVG Ring calculation (radius 30, circumference ~ 188.5)
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completedTasksCount / 4) * circumference;

  const difficultCards = cards.filter((c) => c.lapses > 0 || (c.inDeck && c.easeFactor < 2.3));
  const wrongAttempts = grammarAttempts.filter((a) => !a.isCorrect);

  const handlePrimaryStartClick = () => {
    if (!taskStatus.cardsDone) {
      onStartFlashcardReview();
    } else if (!taskStatus.grammarDone) {
      onStartGrammarTask(currentCourse.grammarTopicId);
    } else if (!taskStatus.audioDone) {
      onStartAudioTask(courseSutta.id);
    } else if (!taskStatus.readingDone) {
      onStartReadingTask(courseSutta.id);
    } else {
      onStartFlashcardReview();
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await onImportBackupFile(text);
      setShowMenuDrawer(false);
      setBannerMsg(`已成功从备份文件「${file.name}」恢复学习进度！`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入备份文件失败';
      setBannerMsg(`导入失败：${msg}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openMenuAtTab = (tab: DrawerTab) => {
    setConfirmResetStep(false);
    setDrawerTab(tab);
    setShowMenuDrawer(true);
  };

  const currentCourseIdx = Math.max(
    0,
    CURRICULUM_COURSES.findIndex((c) => c.id === currentCourse.id)
  );
  const prevCourse = currentCourseIdx > 0 ? CURRICULUM_COURSES[currentCourseIdx - 1] : null;
  const nextCourse =
    currentCourseIdx + 1 < CURRICULUM_COURSES.length
      ? CURRICULUM_COURSES[currentCourseIdx + 1]
      : null;

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-28 flex flex-col min-h-[calc(100svh-4rem)]">
      {/* Header matching Reference Image 2 with a single collapsed menu button on the right */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[34px] sm:text-[36px] leading-tight font-bold text-[#1E2A27] tracking-tight">
            今日
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-[#4E5E5A]">
              {currentCourse.levelBadge} · {currentCourse.titleZh}
            </p>
            <div className="inline-flex items-center gap-1 rounded-xl bg-[#E8F0ED] px-2 py-0.5 text-xs font-semibold text-[#25635E]">
              {prevCourse && (
                <button
                  type="button"
                  onClick={() => void onSelectCourse(prevCourse.id)}
                  className="hover:underline px-1 cursor-pointer"
                  title={`切换到上一课：${prevCourse.levelBadge}`}
                >
                  上一课
                </button>
              )}
              {prevCourse && nextCourse && <span className="text-[#9AB0AA]">|</span>}
              {nextCourse && (
                <button
                  type="button"
                  onClick={() => void onSelectCourse(nextCourse.id)}
                  className="hover:underline px-1 cursor-pointer"
                  title={`切换到下一课：${nextCourse.levelBadge}`}
                >
                  下一课 →
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openMenuAtTab('plan')}
          aria-label="打开菜单（课程设置、学习说明与数据备份）"
          title="打开菜单（课程计划 · 学习说明 · 数据备份）"
          className="w-11 h-11 rounded-2xl bg-[#FAFBF9] border border-[#E2EAE6] text-[#283532] flex items-center justify-center hover:bg-[#EAF2EF] hover:text-[#25635E] transition-colors cursor-pointer shrink-0 shadow-[0_2px_10px_rgba(30,44,41,0.03)]"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Feedback Banner */}
      {bannerMsg && (
        <div className="mt-3 rounded-2xl bg-[#E6F2EE] border border-[#25635E]/25 px-4 py-2.5 text-xs font-medium text-[#1C4642] flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-[#25635E] hover:underline ml-2 cursor-pointer"
          >
            关闭
          </button>
        </div>
      )}

      {/* Top Summary Card with Ring & 3 Metrics (Softer warm paper surface) */}
      <div className="mt-5 rounded-3xl bg-[#FAFBF9] px-5 py-6 shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)] border border-[#E3EAE6] flex items-center justify-between gap-3">
        {/* Progress Ring */}
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 76 76">
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="#E3ECE8"
              strokeWidth="6.5"
            />
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="#25635E"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute font-mono-num text-base font-bold text-[#1E2A27]">
            {completedTasksCount}/4
          </span>
        </div>

        {/* 3 Metrics */}
        <div className="flex-1 grid grid-cols-3 gap-2 text-left pl-2">
          <button
            type="button"
            onClick={() => setShowStreakDetail((prev) => !prev)}
            title="点击查看打卡日期记录或校准连续学习天数"
            className="text-left rounded-xl hover:bg-[#EEF4F1] p-1 -m-1 transition-colors cursor-pointer"
          >
            <div className="text-2xl sm:text-[26px] font-bold text-[#1E2A27] tabular-nums leading-tight">
              {streakDays} 天
            </div>
            <div className="mt-1 text-xs text-[#657470] flex items-center gap-0.5">
              <span>连续学习</span>
              <ChevronDown className="w-3 h-3 text-[#8AA09A]" />
            </div>
          </button>

          <div>
            <div className="text-2xl sm:text-[26px] font-bold text-[#1E2A27] tabular-nums leading-tight">
              {suttaCoveragePct}%
            </div>
            <div className="mt-1 text-xs text-[#657470]">经文覆盖率</div>
          </div>

          <div>
            <div className="text-2xl sm:text-[26px] font-bold text-[#1E2A27] tabular-nums leading-tight">
              {masteredCount}
            </div>
            <div className="mt-1 text-xs text-[#657470]">已掌握词</div>
          </div>
        </div>
      </div>

      {/* Expandable Streak Details & Manual Calibration Bar */}
      {showStreakDetail && (
        <div className="mt-2.5 rounded-2xl bg-[#FAFBF9] border border-[#DCE6E1] px-4 py-3 text-xs text-[#3D4D49] shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#1E2A27]">打卡日期统计：</span>
              <span>
                {studyDates.length > 0
                  ? `累计打卡 ${studyDates.length} 天（${studyDates.slice(-5).map((d) => d.slice(5)).join('、')}）`
                  : '今日尚未记录打卡'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowStreakDetail(false)}
              className="text-[#687773] hover:text-[#1E2A27] cursor-pointer"
            >
              收起
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8EFEA]">
            <span className="text-[#657470]">手动校准连续学习天数：</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void onSetManualStreakDays(Math.max(0, streakDays - 1))}
                className="px-2.5 py-1 rounded-lg bg-[#EDF3F0] hover:bg-[#DCEAE4] text-[#1E2A27] font-semibold cursor-pointer"
              >
                -1 天
              </button>
              <button
                type="button"
                onClick={() => void onSetManualStreakDays(streakDays + 1)}
                className="px-2.5 py-1 rounded-lg bg-[#EDF3F0] hover:bg-[#DCEAE4] text-[#1E2A27] font-semibold cursor-pointer"
              >
                +1 天
              </button>
              <button
                type="button"
                onClick={() => void onSetManualStreakDays(null)}
                className="px-2.5 py-1 rounded-lg bg-[#E4F0EC] hover:bg-[#D2E6DF] text-[#25635E] font-semibold cursor-pointer"
              >
                按打卡记录重算
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 今日任务 Section (包含：1.词卡复习  2.语法学习  3.听一段音频  4.课程配套经文) */}
      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#566561]">今日任务（从易到难 · 阶梯式学习）</h2>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openMenuAtTab('guide')}
              className="text-xs font-medium text-[#5E6D69] hover:text-[#25635E] cursor-pointer"
            >
              学习说明
            </button>
            <span className="text-[#CBD6D2]">·</span>
            <button
              type="button"
              onClick={() => openMenuAtTab('plan')}
              className="text-xs font-semibold text-[#25635E] hover:underline cursor-pointer"
            >
              切换课程 · 每日 {dailyCardLimit} 词
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-[#FAFBF9] border border-[#E3EAE6] shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)] divide-y divide-[#EAEFEA] overflow-hidden">
          {/* Task 1: 词卡复习（先学本课最简单常用的基础词） */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#F4F7F4] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_cards_done')}
                aria-label="切换词卡复习完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.cardsDone
                    ? 'bg-[#25635E] text-white'
                    : 'border-[1.8px] border-[#95A39F] bg-[#FAFBF9]'
                }`}
              >
                {taskStatus.cardsDone && <Check className="w-4 h-4 stroke-[2.5]" />}
              </button>

              <button
                type="button"
                onClick={onStartFlashcardReview}
                className="text-left flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div
                    className={`text-lg font-semibold leading-snug ${
                      taskStatus.cardsDone ? 'text-[#5A6965]' : 'text-[#1E2A27]'
                    }`}
                  >
                    词卡复习
                  </div>
                  <div className="mt-0.5 text-sm text-[#657470] truncate">
                    {dailyCardLimit} 个词 · 优先学习 Lv.{currentCourse.level} 简单高频词（{currentCourse.coreLemmas.slice(0, 3).join(', ')}…）
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#788783] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 2: 语法学习（与当前课程阶梯绑定） */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#F4F7F4] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_grammar_done')}
                aria-label="切换语法学习完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.grammarDone
                    ? 'bg-[#25635E] text-white'
                    : 'border-[1.8px] border-[#95A39F] bg-[#FAFBF9]'
                }`}
              >
                {taskStatus.grammarDone && <Check className="w-4 h-4 stroke-[2.5]" />}
              </button>

              <button
                type="button"
                onClick={() => onStartGrammarTask(currentCourse.grammarTopicId)}
                className="text-left flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div
                    className={`text-lg font-semibold leading-snug ${
                      taskStatus.grammarDone ? 'text-[#5A6965]' : 'text-[#1E2A27]'
                    }`}
                  >
                    语法学习
                  </div>
                  <div className="mt-0.5 text-sm text-[#657470] truncate">
                    {currentCourse.grammarTitleZh} · 含随堂练习
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#788783] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 3: 听一段音频 */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#F4F7F4] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_audio_done')}
                aria-label="切换音频任务完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.audioDone
                    ? 'bg-[#25635E] text-white'
                    : 'border-[1.8px] border-[#95A39F] bg-[#FAFBF9]'
                }`}
              >
                {taskStatus.audioDone && <Check className="w-4 h-4 stroke-[2.5]" />}
              </button>

              <button
                type="button"
                onClick={() => onStartAudioTask(courseSutta.id)}
                className="text-left flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div
                    className={`text-lg font-semibold leading-snug ${
                      taskStatus.audioDone ? 'text-[#5A6965]' : 'text-[#1E2A27]'
                    }`}
                  >
                    听一段音频
                  </div>
                  <div className="mt-0.5 text-sm text-[#657470] truncate">
                    真人诵经与音拍跟读：《{courseSutta.titleZh}》
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#788783] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 4: 读一段经文（服务于本课语法，不一定按经文原书顺序） */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#F4F7F4] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_reading_done')}
                aria-label="切换阅读经文完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.readingDone
                    ? 'bg-[#25635E] text-white'
                    : 'border-[1.8px] border-[#95A39F] bg-[#FAFBF9]'
                }`}
              >
                {taskStatus.readingDone && <Check className="w-4 h-4 stroke-[2.5]" />}
              </button>

              <button
                type="button"
                onClick={() => onStartReadingTask(courseSutta.id)}
                className="text-left flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div
                    className={`text-lg font-semibold leading-snug ${
                      taskStatus.readingDone ? 'text-[#5A6965]' : 'text-[#1E2A27]'
                    }`}
                  >
                    读一段经文
                  </div>
                  <div className="mt-0.5 text-sm text-[#657470] truncate">
                    本课实战：《{courseSutta.titleZh}》（为本课语法服务）
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#788783] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Curriculum Stats & Focus Words Panel */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowDataAndStats((prev) => !prev)}
          className="w-full rounded-2xl bg-[#FAFBF9]/90 border border-[#E3EAE6] px-4 py-3 text-xs font-medium text-[#566561] flex items-center justify-between hover:bg-[#FAFBF9] transition-colors cursor-pointer"
        >
          <span>
            词库 ({totalVocabCount} 词) · 语法 ({GRAMMAR_TOPICS.length} 讲/{totalGrammarExercises} 题) · 难点词 ({difficultCards.length}) · 错题 ({wrongAttempts.length})
          </span>
          {showDataAndStats ? (
            <ChevronUp className="w-4 h-4 text-[#657470]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#657470]" />
          )}
        </button>

        {showDataAndStats && (
          <div className="mt-3 rounded-3xl bg-[#FAFBF9] p-5 border border-[#E3EAE6] space-y-5 text-xs">
            {/* Course Design Note */}
            <div className="rounded-2xl bg-[#F2F5F1] p-3.5 space-y-1.5">
              <div className="font-bold text-[#1E2A27]">
                当前课程设计：{currentCourse.levelBadge} · {currentCourse.titleZh}
              </div>
              <p className="text-[#566561] leading-relaxed">{currentCourse.subtitleZh}</p>
              <p className="text-[11px] text-[#657470] leading-relaxed">
                课程体系设计：{currentCourse.pedagogyRef}
              </p>
              <p className="text-[#25635E] font-medium leading-relaxed">
                {currentCourse.suttaPurposeZh}（底部「阅读」模块可随时独立自由阅读全部 {SUTTAS.length} 篇经典）
              </p>
            </div>

            {/* Adaptive Focus Words */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#1E2A27] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#25635E]" />
                  <span>本课核心词与重点强化词（点击试听）</span>
                </span>
                <button
                  type="button"
                  onClick={() => onStartGrammarTask(currentCourse.grammarTopicId)}
                  className="text-[#25635E] font-semibold hover:underline cursor-pointer"
                >
                  前往本课语法 ({GRAMMAR_TOPICS.length} 讲)
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentCourse.coreLemmas.slice(0, 8).map((lemma) => {
                  const entry = DPD_DICTIONARY[lemma];
                  if (!entry) return null;
                  return (
                    <button
                      key={lemma}
                      type="button"
                      onClick={() => speakPaliText(lemma)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F2F5F1] px-3 py-1.5 text-xs text-[#1E2A27] hover:bg-[#E7F0ED] cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-[#25635E]" />
                      <span className="font-pali font-semibold">{entry.lemma}</span>
                      <span className="text-[#657470]">{entry.meaningZh}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-8" />

      {/* Bottom Primary CTA Button */}
      <div className="pt-6">
        <button
          type="button"
          onClick={handlePrimaryStartClick}
          className="w-full rounded-2xl bg-[#25635E] py-4 px-6 text-lg font-bold text-white shadow-xs hover:bg-[#1E524E] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <BookOpen className="w-5 h-5 hidden sm:inline" />
          <span>开始今日学习</span>
        </button>
      </div>

      {/* Collapsible Hidden Menu Drawer (平时收起，点击右上角 ☰ 唤出；结构化三页签：课程计划 · 学习说明 · 数据备份) */}
      {showMenuDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#141E1C]/40 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowMenuDrawer(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#FAFBF9] shadow-2xl border border-[#E2EAE6] max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Header + Structured 3-Tab Switcher */}
            <div className="px-6 pt-5 pb-3.5 bg-[#FAFBF9] border-b border-[#E6ECE9] shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#25635E]" />
                  <h3 className="text-base sm:text-lg font-bold text-[#1E2A27]">
                    课程计划 · 学习指南 · 数据备份
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMenuDrawer(false)}
                  aria-label="关闭菜单"
                  className="p-1.5 rounded-full text-[#657470] hover:bg-[#EEF2EE] hover:text-[#1E2A27] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented 3-Tab Navigation inside Hidden Menu */}
              <div className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#EEF2EE] p-1">
                <button
                  type="button"
                  onClick={() => setDrawerTab('plan')}
                  className={`rounded-xl py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    drawerTab === 'plan'
                      ? 'bg-[#FAFBF9] text-[#25635E] shadow-2xs'
                      : 'text-[#5E6D69] hover:text-[#1E2A27]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>课程与计划</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('guide')}
                  className={`rounded-xl py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    drawerTab === 'guide'
                      ? 'bg-[#FAFBF9] text-[#25635E] shadow-2xs'
                      : 'text-[#5E6D69] hover:text-[#1E2A27]'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>学习说明</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('backup')}
                  className={`rounded-xl py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    drawerTab === 'backup'
                      ? 'bg-[#FAFBF9] text-[#25635E] shadow-2xs'
                      : 'text-[#5E6D69] hover:text-[#1E2A27]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>数据与备份</span>
                </button>
              </div>
            </div>

            {/* Scrollable Tab Content Area */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* ==================== TAB 1: 课程与计划 ==================== */}
              {drawerTab === 'plan' && (
                <>
                  {/* Current Progress Summary Strip */}
                  <div className="rounded-2xl bg-[#F1F5F2] border border-[#E0EAE5] p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#1E2A27]">
                        当前阶段：{currentCourse.levelBadge} · {currentCourse.titleZh}
                      </div>
                      <div className="text-[11px] text-[#5E6D69] mt-0.5">
                        已掌握 {masteredCount} 词 · 连续学习 {streakDays} 天 · 每日 {dailyCardLimit} 词
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerTab('guide')}
                      className="rounded-xl bg-[#FAFBF9] border border-[#D5E2DD] px-2.5 py-1.5 text-[11px] font-semibold text-[#25635E] hover:bg-[#EAF2EF] shrink-0 cursor-pointer"
                    >
                      查看使用说明 →
                    </button>
                  </div>

                  {/* 1. Daily Card Count Setting */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-[#1E2A27]">每日词卡数量</label>
                      <span className="text-xs text-[#657470]">建议每天 5–8 词，轻松易坚持</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { count: 5, tag: '轻松' },
                        { count: 8, tag: '推荐' },
                        { count: 12, tag: '进阶' },
                        { count: 16, tag: '强化' },
                      ].map((item) => {
                        const active = dailyCardLimit === item.count;
                        return (
                          <button
                            key={item.count}
                            type="button"
                            onClick={async () => {
                              await onChangeDailyCardLimit(item.count);
                              setBannerMsg(`已将每日词量调整为 ${item.count} 个词/天。`);
                            }}
                            className={`rounded-2xl py-2.5 px-2 border text-center transition-all cursor-pointer ${
                              active
                                ? 'bg-[#25635E] border-[#25635E] text-white'
                                : 'bg-[#F3F6F3] border-[#DCE5E1] text-[#1E2A27] hover:border-[#25635E]'
                            }`}
                          >
                            <div className="text-sm font-bold">{item.count} 词</div>
                            <div
                              className={`text-[11px] mt-0.5 ${
                                active ? 'text-[#D6EBE7]' : 'text-[#657470]'
                              }`}
                            >
                              {item.tag}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Progressive Course Selection (从易到难 6 阶课程) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-[#1E2A27]">
                        六阶课程选择（从易到难）
                      </label>
                      <span className="text-xs text-[#657470]">经文为当课语法服务</span>
                    </div>
                    <div className="space-y-2">
                      {CURRICULUM_COURSES.map((course) => {
                        const isSelected = course.id === currentCourse.id;
                        const sutta = SUTTAS.find((s) => s.id === course.suttaId);
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={async () => {
                              await onSelectCourse(course.id);
                              setShowMenuDrawer(false);
                              setBannerMsg(`已切换至「${course.levelBadge}：${course.titleZh}」`);
                            }}
                            className={`w-full rounded-2xl p-3.5 border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-[#EAF2EF] border-[1.5px] border-[#25635E]'
                                : 'bg-white/80 border-[#E2EAE6] hover:border-[#B8CCC8]'
                            }`}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`rounded-md text-[11px] font-bold px-2 py-0.5 shrink-0 ${
                                    isSelected
                                      ? 'bg-[#25635E] text-white'
                                      : 'bg-[#E6EFEA] text-[#25635E]'
                                  }`}
                                >
                                  {course.levelBadge}
                                </span>
                                <span className="text-sm font-bold text-[#1E2A27] truncate">
                                  {course.titleZh}
                                </span>
                              </div>
                              <p className="text-xs text-[#566561] line-clamp-1">
                                核心词：{course.coreLemmas.slice(0, 5).join(', ')} 等{' '}
                                {course.coreLemmas.length} 词
                              </p>
                              <p className="text-[11px] text-[#25635E]">
                                语法：{course.grammarTitleZh} · 配套经文：{sutta?.code ?? course.suttaId}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#25635E] shrink-0 stroke-[2.5]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Reset Progress / Restore Sample + PWA Install */}
                  <div className="pt-3 border-t border-[#E6ECE9] space-y-2.5">
                    <label className="text-sm font-bold text-[#1E2A27] block">
                      进度重置与离线安装
                    </label>

                    {!confirmResetStep ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmResetStep(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE5E1] bg-[#F3F6F3] px-3.5 py-2 text-xs font-semibold text-[#1E2A27] hover:bg-[#E7EFEA] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#25635E]" />
                          <span>从 0 开始学（重置进度）</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await onRestoreSample();
                            setShowMenuDrawer(false);
                            setBannerMsg('已恢复 12 天示例学习进度。');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#566561] hover:text-[#1E2A27] transition-colors cursor-pointer"
                        >
                          <span>恢复 12 天示例数据</span>
                        </button>

                        <PWAInstallButton />
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#F2F5F1] p-3.5 space-y-2.5">
                        <p className="text-xs text-[#2C3735]">
                          确定将连续天数、已掌握词数归零，并从
                          <strong>第 1 阶零基础入门课（三宝与归依 · 最简高频词）</strong>
                          重新开始吗？
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await onResetToZero();
                              setConfirmResetStep(false);
                              setShowMenuDrawer(false);
                              setBannerMsg(
                                '已重置为从 0 开始！现在从第 1 阶最简单的日常高频词开始学习。'
                              );
                            }}
                            className="rounded-xl bg-[#25635E] px-4 py-2 text-xs font-bold text-white hover:bg-[#1E524E] cursor-pointer"
                          >
                            确认从 0 开始
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmResetStep(false)}
                            className="rounded-xl bg-white border border-[#DCE5E1] px-4 py-2 text-xs font-medium text-[#566561] cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ==================== TAB 2: 学习说明 (使用方法 · 注意事项 · 预期学习结果) ==================== */}
              {drawerTab === 'guide' && (
                <div className="space-y-4">
                  {/* Section 1: 使用方法 & 词卡记忆曲线说明 */}
                  <div className="rounded-2xl bg-[#F2F5F2] border border-[#DFEAE4] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#25635E] text-white flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <h4 className="text-sm font-bold text-[#1E2A27]">
                        使用方法（如何背单词、切换下一词与四步闭环）
                      </h4>
                    </div>

                    <div className="space-y-2.5 text-xs text-[#384642] leading-relaxed">
                      <div className="rounded-xl bg-[#FAFBF9] p-3 border border-[#DFEAE4] space-y-1.5">
                        <div className="font-bold text-[#1E2A27]">
                          ① 如何学单词与进入下一词（SM-2 / FSRS 混合记忆曲线算法）：
                        </div>
                        <p>
                          • <strong>第 1 步（看正面回想）：</strong>正面仅显示巴利语原词与发音按钮，先在心里回想词义，然后<strong>点击卡片任意位置</strong>（或点下方「显示答案」）翻到背面。
                        </p>
                        <p>
                          • <strong>第 2 步（点四档评分 → 自动进入下一词）：</strong>看完背面释义、词根拆解与例句后，直接点击底部的 <strong>「重来 / 困难 / 记得 / 轻松」</strong> 任一按钮，系统即<strong>自动进入下一个单词</strong>（也可点右上角 <code>&lt; &gt;</code> 箭头或按键盘空格/方向键切换）。
                        </p>
                        <p>
                          • <strong>「重来」当轮循环强化：</strong>如果您点了<strong>「重来」</strong>，该词会自动排入<strong>本组队列末尾重复出现</strong>，直到您真正记住并选择了「困难 / 记得 / 轻松」才会结束本轮。
                        </p>
                        <p>
                          • <strong>1 / 3 / 7 天后到期自动复习：</strong>选了「困难 (1天)」「记得 (3天)」「轻松 (7天)」的词，系统会按 <strong>SM-2 / FSRS 间隔重复算法</strong>记录到期时间与难度因子（Ease Factor，初始 2.5）。当 1 / 3 / 7 天到期后，这些旧词会<strong>自动排在当天新词之后出现</strong>供您复习；连续记住后间隔会按指数级拉长（如 <code>3天 → 8天 → 20天 → 50天</code>）。
                        </p>
                      </div>

                      <p>
                        <strong className="text-[#1E2A27]">② 语法学习（阶梯精讲 · 随堂测验）：</strong>
                        每课聚焦 1 个核心语法点（配完整变格/变位对照表与 4 道经文实题）。做错的题目会自动收入「只看错题」方便针对性强化。
                      </p>
                      <p>
                        <strong className="text-[#1E2A27]">③ 听音与跟读（音拍节律 · 录音对比）：</strong>
                        在经文阅读页可开启<strong>「音拍节律 (⏑/—)」</strong>查看传统吟诵轻重音拍，开启<strong>「跟读留白」</strong>每句读完自动停顿 5 秒供您复述，还可点击<strong>「录下跟读」</strong>与原声进行 A/B 连续对比。
                      </p>
                      <p>
                        <strong className="text-[#1E2A27]">④ 经文逐词点读与独立文库：</strong>
                        课程中的经文专门为当课语法服务（不拘泥于原典卷次）；而底部<strong>「阅读」</strong>模块完全独立，您可随时按《法句经》《小诵》原典顺序自由选读，点任意单词即查 DPD 词根与完整八格词形表。
                      </p>
                    </div>
                  </div>

                  {/* Section 2: 注意事项 */}
                  <div className="rounded-2xl bg-[#FAF6EE] border border-[#E8DEC8] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#8C6226] text-white flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <h4 className="text-sm font-bold text-[#2B2418]">
                        注意事项（少走弯路的 4 个关键）
                      </h4>
                    </div>

                    <ul className="space-y-2 text-xs text-[#4A3F2D] leading-relaxed list-disc pl-4">
                      <li>
                        <strong>看词尾辨格位，切勿按中文字序硬猜：</strong>
                        巴利语是高度屈折语（常见主-宾-谓 SOV 语序）。谁是主语、谁是宾语、谁是工具或处所，完全取决于<strong>词尾格位</strong>（如主格 <code>-o</code>、宾格 <code>-aṃ</code>、工具格 <code>-ena</code>、与/属格 <code>-assa</code>、处格 <code>-e/-smiṃ</code>）。
                      </li>
                      <li>
                        <strong>发音严分「长短元音」与「送气/不送气」：</strong>
                        短元音（<code>a, i, u</code>）读 1 拍（<code>⏑</code>），长元音（<code>ā, ī, ū, e, o</code>）及含空点鼻音 <code>ṃ</code> 或双辅音前的闭音节必须饱满读足 2 拍（<code>—</code>），长短音不同词义往往不同。
                      </li>
                      <li>
                        <strong>贵在每日少量持续，切忌一次贪多：</strong>
                        成人业余学习建议将每日词量设为 <strong>5 或 8 词/天</strong>，每天 15–20 分钟完成 4 个微任务即可，依靠 FSRS 间隔重复对抗遗忘。
                      </li>
                      <li>
                        <strong>定期导出 JSON 备份文件：</strong>
                        本软件为 100% 纯离线隐私设计，数据存储在您的浏览器本地。更换设备或清理浏览器缓存前，请在「数据与备份」页签点击<strong>「导出备份 .json」</strong>妥善保存。
                      </li>
                    </ul>
                  </div>

                  {/* Section 3: 预期学习结果 */}
                  <div className="rounded-2xl bg-[#EEF5F2] border border-[#D4E4DD] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#25635E] text-white flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        <h4 className="text-sm font-bold text-[#1E2A27]">
                          预期学习结果（完成 6 阶课程后达到什么水平？）
                        </h4>
                      </div>
                      <span className="rounded-md bg-[#25635E]/15 text-[#25635E] px-2 py-0.5 text-[11px] font-bold shrink-0">
                        巴利语 A2 文献直读
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs text-[#344440] leading-relaxed">
                      <div className="rounded-xl bg-[#FAFBF9] p-3 border border-[#DFEAE4]">
                        <div className="font-bold text-[#1E2A27] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#25635E]" />
                          <span>1. 词汇与词形覆盖：80 核心词根 × 15 套变格表 ≈ 1,000+ 经藏实词</span>
                        </div>
                        <p className="mt-1 text-[#566561]">
                          巴利语日常经藏遵循二八定律。熟练掌握本课程精选的 80 个最高频圣典词根及其八格/时态曲折后，可直接识别经典中超过 <strong>1,000 个实际屈折词形</strong>，覆盖短篇经偈 <strong>55%–65%</strong> 的核心骨架词汇。
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#FAFBF9] p-3 border border-[#DFEAE4]">
                        <div className="font-bold text-[#1E2A27] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#25635E]" />
                          <span>2. 语法体系：掌握 85% 巴利三藏核心语法</span>
                        </div>
                        <p className="mt-1 text-[#566561]">
                          学完 Lv.1–Lv.6 后，您将完整掌握：三性八格名词变格、现在时/过去时（Aorist）/命令式/愿求式动词变位、过去被动分词（PPP <code>-ta/-na</code>）、连续体（<code>-tvā</code>）、绝对处格句型（如 <em>Evaṃ me sutaṃ</em>），以及连声规则（Sandhi）和六大复合词（依主释、持业释、多财释等）的拆解方法。
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#FAFBF9] p-3 border border-[#DFEAE4]">
                        <div className="font-bold text-[#1E2A27] flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#25635E]" />
                          <span>3. 经典原典实读能力（告别纯靠白话译文）</span>
                        </div>
                        <p className="mt-1 text-[#566561]">
                          • <strong>脱离译文直接读懂 80%–90%：</strong>《三归依》《五戒》《吉祥经》《慈经》《三宝经》及《法句经》常见品偈颂，能边吟诵边直接理解巴利原文结构。
                          <br />• <strong>具备独立查词精读长经的能力：</strong>面对《长部》《中部》《相应部》（如《大念处经》《转法轮经》）时，能够自己切分长复合词、剥离格位词尾还原出 DPD 词干，正式进入原典精读阶段。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Open Source Data Sources & Copyright Notice */}
                  <div className="rounded-2xl bg-[#F4F7F5] border border-[#E2EAE6] p-4 space-y-2.5">
                    <div className="font-bold text-[#1E2A27] flex items-center gap-1.5 text-xs">
                      <Database className="w-3.5 h-3.5 text-[#25635E]" />
                      <span>开源学术词典与圣典授权声明</span>
                    </div>
                    <div className="space-y-1.5">
                      {DATA_SOURCES_AND_LICENSES.map((src) => (
                        <div
                          key={src.name}
                          className="rounded-xl bg-[#FAFBF9] p-2.5 border border-[#E6ECE9] flex items-start justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-[#1E2A27]">{src.name}</div>
                            <div className="text-[#657470] text-[11px] mt-0.5">{src.role}</div>
                            <div className="text-[10px] text-[#25635E] mt-0.5">{src.license}</div>
                          </div>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-[#657470] hover:text-[#25635E] shrink-0"
                            aria-label={`访问 ${src.name}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== TAB 3: 数据与备份 ==================== */}
              {drawerTab === 'backup' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#F2F6F4] border border-[#DCE8E4] p-4 space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#25635E]" />
                        <span className="text-sm font-bold text-[#1E2A27]">
                          防丢数据保护（自动保存 & 手动保存）
                        </span>
                      </div>
                      <span className="text-[11px] text-[#25635E] font-medium">
                        上次{lastSaveType === 'manual' ? '手动' : '自动'}：{formatSaveTime(lastSavedAt)}
                      </span>
                    </div>

                    {/* Auto-Save Toggle Row */}
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FAFBF9] p-3.5 border border-[#E2EAE6]">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1E2A27]">
                          自动保存学习进度（IndexedDB + LocalStorage 双层镜像）
                        </div>
                        <p className="text-[11px] text-[#657470] mt-0.5 leading-snug">
                          开启后，每次词卡评分、语法练习、阅读经文或切换课程时自动同步至本地防丢镜像
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoSaveEnabled}
                        onClick={async () => {
                          const nextVal = !autoSaveEnabled;
                          await onToggleAutoSave(nextVal);
                          setBannerMsg(
                            nextVal
                              ? '已开启自动保存：学习进度将实时自动备份。'
                              : '已切换为手动保存模式：您可随时点击「立即手动保存」备份进度。'
                          );
                        }}
                        className={`w-12 h-7 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                          autoSaveEnabled ? 'bg-[#25635E]' : 'bg-[#CBD5D2]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                            autoSaveEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Manual Save & Export / Import JSON Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onManualSave('手动保存存档点');
                          setBannerMsg('已手动创建本地存档快照！');
                        }}
                        className="rounded-xl bg-[#25635E] text-white py-2.5 px-2 text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-[#1E524E] transition-colors cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>立即手动保存</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const fileName = await onExportBackupFile();
                          setBannerMsg(`已导出备份文件：${fileName}`);
                        }}
                        className="rounded-xl bg-[#FAFBF9] border border-[#CEDAD7] text-[#25635E] py-2.5 px-2 text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-[#EAF2EF] transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>导出备份 .json</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl bg-[#FAFBF9] border border-[#CEDAD7] text-[#1E2A27] py-2.5 px-2 text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-[#EAF2EF] transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-[#25635E]" />
                        <span>导入恢复 .json</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportFileChange}
                        className="hidden"
                      />
                    </div>

                    {/* Browser Persistent Storage Protection Status */}
                    <div className="flex items-center justify-between text-[11px] text-[#566561] pt-1">
                      <span>
                        浏览器防清理保护：
                        {isStoragePersisted
                          ? '已开启持久化存储 (Persistent Storage)'
                          : '标准本地存储 + 双层镜像已启用'}
                      </span>
                      {!isStoragePersisted && (
                        <button
                          type="button"
                          onClick={async () => {
                            const granted = await onRequestPersistStorage();
                            setBannerMsg(
                              granted
                                ? '浏览器已授予持久化存储保护，离线词库与进度不会被系统自动清理。'
                                : '已启用 IndexedDB + LocalStorage 双层防丢镜像保护。'
                            );
                          }}
                          className="text-[#25635E] font-semibold hover:underline cursor-pointer"
                        >
                          申请持久化权限
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Saved Snapshots History (One-Click Rollback) */}
                  <div className="rounded-2xl bg-[#F4F7F5] border border-[#E2EAE6] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E2A27]">
                        <History className="w-3.5 h-3.5 text-[#25635E]" />
                        <span>最近保存的本地快照（可随时一键恢复）</span>
                      </div>
                      <span className="text-[11px] text-[#657470]">
                        共 {savedSnapshots.length} 个快照
                      </span>
                    </div>

                    {savedSnapshots.length === 0 ? (
                      <p className="text-xs text-[#657470] py-3 text-center">
                        暂无本地快照，点击上方「立即手动保存」即可创建存档点。
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                        {savedSnapshots.slice(0, 6).map((snap) => (
                          <div
                            key={snap.id}
                            className="rounded-xl bg-[#FAFBF9] px-3.5 py-2.5 border border-[#E2EAE6] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    snap.saveType === 'manual'
                                      ? 'bg-[#25635E] text-white'
                                      : 'bg-[#EAF2EF] text-[#25635E]'
                                  }`}
                                >
                                  {snap.saveType === 'manual' ? '手动' : '自动'}
                                </span>
                                <span className="font-semibold text-[#1E2A27] truncate">
                                  {snap.label}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#657470] mt-0.5">
                                {formatSaveTime(snap.timestamp)} · 掌握 {snap.summary.masteredCount} 词 · 连续 {snap.summary.streakDays} 天
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await onRestoreSnapshot(snap.id);
                                setShowMenuDrawer(false);
                                setBannerMsg(
                                  `已恢复至存档快照：「${snap.label}」(${formatSaveTime(snap.timestamp)})`
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#EAF2EF] text-[#25635E] text-[11px] font-bold hover:bg-[#DCECE7] shrink-0 cursor-pointer"
                            >
                              恢复此存档
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
