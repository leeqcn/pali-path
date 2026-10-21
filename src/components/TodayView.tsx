import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  ExternalLink,
  Menu,
  RotateCcw,
  SlidersHorizontal,
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
import type { FlashcardRecord, GrammarAttemptRecord } from '../db/database';
import { speakPaliText } from '../utils/paliAudio';
import { PWAInstallButton } from './PWAInstallButton';

interface TodayViewProps {
  cards: FlashcardRecord[];
  grammarAttempts: GrammarAttemptRecord[];
  streakDays: number;
  masteredCount: number;
  suttaCoveragePct: number;
  selectedCourseId: string;
  dailyCardLimit: number;
  onChangeDailyCardLimit: (limit: number) => Promise<void>;
  onSelectCourse: (courseId: string) => Promise<void>;
  onResetToZero: () => Promise<void>;
  onRestoreSample: () => Promise<void>;
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

export const TodayView: React.FC<TodayViewProps> = ({
  cards,
  grammarAttempts,
  streakDays,
  masteredCount,
  suttaCoveragePct,
  selectedCourseId,
  dailyCardLimit,
  onChangeDailyCardLimit,
  onSelectCourse,
  onResetToZero,
  onRestoreSample,
  taskStatus,
  onToggleTaskDone,
  onStartFlashcardReview,
  onStartGrammarTask,
  onStartAudioTask,
  onStartReadingTask,
}) => {
  const [showDataAndStats, setShowDataAndStats] = useState(false);
  // Collapsible Menu Drawer (平时收起，点击右上角图标展开)
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

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

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-28 flex flex-col min-h-[calc(100svh-4rem)]">
      {/* Header matching Reference Image 2 with a single collapsed menu button on the right */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[36px] leading-tight font-bold text-[#141D1B] tracking-tight">
            今日
          </h1>
          <p className="mt-1 text-base text-[#64706D]">
            {currentCourse.levelBadge} · {currentCourse.titleZh}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setConfirmResetStep(false);
            setShowMenuDrawer(true);
          }}
          aria-label="打开选课与学习设置菜单"
          className="w-11 h-11 rounded-2xl bg-white border border-[#E6EBE8] text-[#141D1B] flex items-center justify-center hover:bg-[#EBF3F1] hover:text-[#1E625E] transition-colors cursor-pointer shrink-0 shadow-2xs"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Feedback Banner */}
      {bannerMsg && (
        <div className="mt-3 rounded-2xl bg-[#E2F2EE] border border-[#1E625E]/30 px-4 py-2.5 text-xs font-medium text-[#143D3A] flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-[#1E625E] hover:underline ml-2 cursor-pointer"
          >
            关闭
          </button>
        </div>
      )}

      {/* Top Summary Card with Ring & 3 Metrics (matching Reference Image 2) */}
      <div className="mt-5 rounded-3xl bg-white px-5 py-6 shadow-2xs border border-[#E8ECEA] flex items-center justify-between gap-3">
        {/* Progress Ring */}
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 76 76">
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="#E2EAE7"
              strokeWidth="6.5"
            />
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="#1E625E"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute font-mono-num text-base font-bold text-[#141D1B]">
            {completedTasksCount}/4
          </span>
        </div>

        {/* 3 Metrics */}
        <div className="flex-1 grid grid-cols-3 gap-2 text-left pl-2">
          <div>
            <div className="text-2xl sm:text-[26px] font-bold text-[#141D1B] tabular-nums leading-tight">
              {streakDays} 天
            </div>
            <div className="mt-1 text-xs text-[#64706D]">连续学习</div>
          </div>

          <div>
            <div className="text-2xl sm:text-[26px] font-bold text-[#141D1B] tabular-nums leading-tight">
              {suttaCoveragePct}%
            </div>
            <div className="mt-1 text-xs text-[#64706D]">经文覆盖率</div>
          </div>

          <div>
            <div className="text-2xl sm:text-[26px] font-bold text-[#141D1B] tabular-nums leading-tight">
              {masteredCount}
            </div>
            <div className="mt-1 text-xs text-[#64706D]">已掌握词</div>
          </div>
        </div>
      </div>

      {/* 今日任务 Section (包含：1.词卡复习  2.语法学习  3.听一段音频  4.课程配套经文) */}
      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#52605C]">今日任务（从易到难 · 阶梯式学习）</h2>
          <button
            type="button"
            onClick={() => {
              setConfirmResetStep(false);
              setShowMenuDrawer(true);
            }}
            className="text-xs font-semibold text-[#1E625E] hover:underline cursor-pointer"
          >
            切换阶梯课程 · 每日 {dailyCardLimit} 词
          </button>
        </div>

        <div className="rounded-3xl bg-white border border-[#E8ECEA] shadow-2xs divide-y divide-[#EEF2F0] overflow-hidden">
          {/* Task 1: 词卡复习（先学本课最简单常用的基础词） */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#FAFBF9] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_cards_done')}
                aria-label="切换词卡复习完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.cardsDone
                    ? 'bg-[#1E625E] text-white'
                    : 'border-[1.8px] border-[#8C9894] bg-white'
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
                      taskStatus.cardsDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                    }`}
                  >
                    词卡复习
                  </div>
                  <div className="mt-0.5 text-sm text-[#64706D] truncate">
                    {dailyCardLimit} 个词 · 优先学习 Lv.{currentCourse.level} 简单高频词（{currentCourse.coreLemmas.slice(0, 3).join(', ')}…）
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#64706D] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 2: 语法学习（新增！与当前课程阶梯绑定） */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#FAFBF9] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_grammar_done')}
                aria-label="切换语法学习完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.grammarDone
                    ? 'bg-[#1E625E] text-white'
                    : 'border-[1.8px] border-[#8C9894] bg-white'
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
                      taskStatus.grammarDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                    }`}
                  >
                    语法学习
                  </div>
                  <div className="mt-0.5 text-sm text-[#64706D] truncate">
                    {currentCourse.grammarTitleZh} · 含随堂练习
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#64706D] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 3: 听一段音频 */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#FAFBF9] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_audio_done')}
                aria-label="切换音频任务完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.audioDone
                    ? 'bg-[#1E625E] text-white'
                    : 'border-[1.8px] border-[#8C9894] bg-white'
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
                      taskStatus.audioDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                    }`}
                  >
                    听一段音频
                  </div>
                  <div className="mt-0.5 text-sm text-[#64706D] truncate">
                    本课配套发音：《{courseSutta.titleZh}》
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#64706D] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 4: 读一段经文（服务于本课语法，不一定按经文原书顺序） */}
          <div className="p-5 flex items-center justify-between gap-4 hover:bg-[#FAFBF9] transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleTaskDone('task_reading_done')}
                aria-label="切换阅读经文完成状态"
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  taskStatus.readingDone
                    ? 'bg-[#1E625E] text-white'
                    : 'border-[1.8px] border-[#8C9894] bg-white'
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
                      taskStatus.readingDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                    }`}
                  >
                    读一段经文
                  </div>
                  <div className="mt-0.5 text-sm text-[#64706D] truncate">
                    本课实战：《{courseSutta.titleZh}》（为本课语法服务）
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#64706D] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Curriculum Stats, Adaptive Review & Open Source Data Licensing Panel */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowDataAndStats((prev) => !prev)}
          className="w-full rounded-2xl bg-white/80 border border-[#E6EBE8] px-4 py-3 text-xs font-medium text-[#52605C] flex items-center justify-between hover:bg-white transition-colors cursor-pointer"
        >
          <span>
            词库 ({totalVocabCount} 词) · 语法 ({GRAMMAR_TOPICS.length} 讲/{totalGrammarExercises} 题) · 难点词 ({difficultCards.length}) · 错题 ({wrongAttempts.length})
          </span>
          {showDataAndStats ? (
            <ChevronUp className="w-4 h-4 text-[#64706D]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64706D]" />
          )}
        </button>

        {showDataAndStats && (
          <div className="mt-3 rounded-3xl bg-white p-5 border border-[#E6EBE8] space-y-5 text-xs">
            {/* Course Design Note */}
            <div className="rounded-2xl bg-[#F5F6F4] p-3.5 space-y-1.5">
              <div className="font-bold text-[#141D1B]">
                当前课程设计：{currentCourse.levelBadge} · {currentCourse.titleZh}
              </div>
              <p className="text-[#52605C] leading-relaxed">{currentCourse.subtitleZh}</p>
              <p className="text-[11px] text-[#64706D] leading-relaxed">
                课程体系设计：{currentCourse.pedagogyRef}
              </p>
              <p className="text-[#1E625E] font-medium leading-relaxed">
                {currentCourse.suttaPurposeZh}（底部「阅读」模块可随时独立自由阅读全部 {SUTTAS.length} 篇经典）
              </p>
            </div>

            {/* Adaptive Focus Words */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#141D1B] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#1E625E]" />
                  <span>本课核心词与重点强化词（点击试听）</span>
                </span>
                <button
                  type="button"
                  onClick={() => onStartGrammarTask(currentCourse.grammarTopicId)}
                  className="text-[#1E625E] font-semibold hover:underline cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5F6F4] px-3 py-1.5 text-xs text-[#141D1B] hover:bg-[#EBF3F1] cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-[#1E625E]" />
                      <span className="font-pali font-semibold">{entry.lemma}</span>
                      <span className="text-[#64706D]">{entry.meaningZh}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Open Source Data Sources & Copyright Notice */}
            <div className="pt-3 border-t border-[#EEF2F0]">
              <div className="font-bold text-[#141D1B] flex items-center gap-1.5 mb-2.5">
                <Database className="w-3.5 h-3.5 text-[#1E625E]" />
                <span>数据来源与开源授权声明 (Offline IndexedDB)</span>
              </div>
              <div className="space-y-2">
                {DATA_SOURCES_AND_LICENSES.map((src) => (
                  <div
                    key={src.name}
                    className="rounded-xl bg-[#F8FAF9] p-2.5 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-[#141D1B]">{src.name}</div>
                      <div className="text-[#64706D] mt-0.5">{src.role}</div>
                      <div className="text-[11px] text-[#1E625E] mt-0.5">{src.license}</div>
                    </div>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#64706D] hover:text-[#1E625E] shrink-0"
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
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-8" />

      {/* Bottom Primary CTA Button matching Reference Image 2 */}
      <div className="pt-6">
        <button
          type="button"
          onClick={handlePrimaryStartClick}
          className="w-full rounded-2xl bg-[#1E625E] py-4 px-6 text-lg font-bold text-white shadow-sm hover:bg-[#174E4A] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <BookOpen className="w-5 h-5 hidden sm:inline" />
          <span>开始今日学习</span>
        </button>
      </div>

      {/* Collapsible Hidden Menu Drawer (平时收起，点击右上角图标唤出) */}
      {showMenuDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowMenuDrawer(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-[#E6EBE8] max-h-[88vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F0]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#1E625E]" />
                <h3 className="text-lg font-bold text-[#141D1B]">学习设置与阶梯选课菜单</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMenuDrawer(false)}
                className="p-2 rounded-full text-[#64706D] hover:bg-[#F5F6F4] hover:text-[#141D1B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Daily Card Count Setting */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#141D1B]">每日词卡数量</label>
                <span className="text-xs text-[#64706D]">建议每天 5–8 词，轻松无压力</span>
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
                          ? 'bg-[#1E625E] border-[#1E625E] text-white'
                          : 'bg-[#F8FAF9] border-[#DCE4E1] text-[#141D1B] hover:border-[#1E625E]'
                      }`}
                    >
                      <div className="text-sm font-bold">{item.count} 词</div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          active ? 'text-[#D5EAE6]' : 'text-[#64706D]'
                        }`}
                      >
                        {item.tag}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Progressive Course Selection (从易到难 6 阶课程，经文为课程服务) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#141D1B]">阶梯课程选择（从易到难）</label>
                <span className="text-xs text-[#64706D]">先学简单常用词 · 经文服务于课程</span>
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
                          ? 'bg-[#EBF3F1] border-[1.5px] border-[#1E625E]'
                          : 'bg-white border-[#E6EBE8] hover:border-[#B8CCC8]'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-md bg-[#1E625E] text-white text-[11px] font-bold px-2 py-0.5 shrink-0">
                            {course.levelBadge}
                          </span>
                          <span className="text-sm font-bold text-[#141D1B] truncate">
                            {course.titleZh}
                          </span>
                        </div>
                        <p className="text-xs text-[#52605C] line-clamp-1">
                          词汇：{course.coreLemmas.slice(0, 5).join(', ')} 等 {course.coreLemmas.length} 词
                        </p>
                        <p className="text-[11px] text-[#1E625E]">
                          语法：{course.grammarTitleZh} · 配套经文：{sutta?.code ?? course.suttaId}
                        </p>
                        <p className="text-[10px] text-[#7A8783] line-clamp-1">
                          {course.pedagogyRef}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#1E625E] shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Reset Progress / Restore Sample + PWA Install */}
            <div className="pt-3 border-t border-[#EEF2F0] space-y-2.5">
              <label className="text-sm font-bold text-[#141D1B] block">进度管理与应用安装</label>

              {!confirmResetStep ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResetStep(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE4E1] bg-[#F8FAF9] px-3.5 py-2 text-xs font-semibold text-[#141D1B] hover:bg-[#EEF2F0] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#1E625E]" />
                    <span>从 0 开始学（重置进度）</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onRestoreSample();
                      setShowMenuDrawer(false);
                      setBannerMsg('已恢复 12 天示例学习进度。');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE4E1] bg-white px-3.5 py-2 text-xs font-medium text-[#52605C] hover:text-[#141D1B] transition-colors cursor-pointer"
                  >
                    <span>恢复 12 天示例数据</span>
                  </button>

                  <PWAInstallButton />
                </div>
              ) : (
                <div className="rounded-2xl bg-[#F5F6F4] p-3.5 space-y-2.5">
                  <p className="text-xs text-[#2C3735]">
                    确定将连续天数、已掌握词数归零，并从<strong>第 1 阶零基础入门课（三宝与归依 · 最简高频词）</strong>重新开始吗？
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await onResetToZero();
                        setConfirmResetStep(false);
                        setShowMenuDrawer(false);
                        setBannerMsg('已重置为从 0 开始！现在从第 1 阶最简单的日常高频词开始学习。');
                      }}
                      className="rounded-xl bg-[#1E625E] px-4 py-2 text-xs font-bold text-white hover:bg-[#174E4A] cursor-pointer"
                    >
                      确认从 0 开始
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetStep(false)}
                      className="rounded-xl bg-white border border-[#DCE4E1] px-4 py-2 text-xs font-medium text-[#52605C] cursor-pointer"
                    >
                      取消
                    </button>
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
