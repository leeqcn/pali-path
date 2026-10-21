import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import {
  DATA_SOURCES_AND_LICENSES,
  DPD_DICTIONARY,
  GRAMMAR_TOPICS,
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
  taskStatus: {
    cardsDone: boolean;
    audioDone: boolean;
    readingDone: boolean;
  };
  onToggleTaskDone: (key: 'task_cards_done' | 'task_audio_done' | 'task_reading_done') => Promise<void>;
  onStartFlashcardReview: () => void;
  onStartAudioTask: () => void;
  onStartReadingTask: () => void;
  onStartGrammarTask: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  cards,
  grammarAttempts,
  streakDays,
  masteredCount,
  suttaCoveragePct,
  taskStatus,
  onToggleTaskDone,
  onStartFlashcardReview,
  onStartAudioTask,
  onStartReadingTask,
  onStartGrammarTask,
}) => {
  const [showDataAndStats, setShowDataAndStats] = useState(false);

  const completedTasksCount =
    (taskStatus.cardsDone ? 1 : 0) +
    (taskStatus.audioDone ? 1 : 0) +
    (taskStatus.readingDone ? 1 : 0);

  // SVG Ring calculation (radius 30, circumference ~ 188.5)
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completedTasksCount / 3) * circumference;

  // Identify difficult words & grammar mistakes for adaptive review
  const difficultCards = cards.filter((c) => c.lapses > 0 || (c.inDeck && c.easeFactor < 2.3));
  const wrongAttempts = grammarAttempts.filter((a) => !a.isCorrect);

  const handlePrimaryStartClick = () => {
    if (!taskStatus.cardsDone) {
      onStartFlashcardReview();
    } else if (!taskStatus.audioDone) {
      onStartAudioTask();
    } else if (!taskStatus.readingDone) {
      onStartReadingTask();
    } else {
      onStartFlashcardReview();
    }
  };

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 pb-28 flex flex-col min-h-[calc(100svh-4rem)]">
      {/* Header matching Reference Image 2 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[36px] leading-tight font-bold text-[#141D1B] tracking-tight">
            今日
          </h1>
          <p className="mt-1 text-base text-[#64706D]">10 月 19 日 · 周一</p>
        </div>
        <div className="pt-1">
          <PWAInstallButton />
        </div>
      </div>

      {/* Top Summary Card with Ring & 3 Metrics (matching Reference Image 2) */}
      <div className="mt-5 rounded-3xl bg-white px-5 py-6 shadow-2xs border border-[#E8ECEA] flex items-center justify-between gap-3">
        {/* Progress Ring 1/3 */}
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
            {completedTasksCount}/3
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

      {/* 今日任务 Section */}
      <div className="mt-7">
        <h2 className="text-sm font-bold text-[#52605C] mb-3">今日任务</h2>

        <div className="rounded-3xl bg-white border border-[#E8ECEA] shadow-2xs divide-y divide-[#EEF2F0] overflow-hidden">
          {/* Task 1: 词卡复习 */}
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
                className="text-left flex-1 min-w-0 cursor-pointer"
              >
                <div
                  className={`text-lg font-semibold leading-snug ${
                    taskStatus.cardsDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                  }`}
                >
                  词卡复习
                </div>
                <div className="mt-0.5 text-sm text-[#64706D]">
                  8 个词 · {taskStatus.cardsDone ? '已完成' : '待复习'}
                </div>
              </button>
            </div>
          </div>

          {/* Task 2: 听一段音频 */}
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
                onClick={onStartAudioTask}
                className="text-left flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div>
                  <div
                    className={`text-lg font-semibold leading-snug ${
                      taskStatus.audioDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                    }`}
                  >
                    听一段音频
                  </div>
                  <div className="mt-0.5 text-sm text-[#64706D]">
                    《法句经》偈 2 · 约 10 分钟
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#64706D] shrink-0" />
              </button>
            </div>
          </div>

          {/* Task 3: 读一段经文 */}
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
                onClick={onStartReadingTask}
                className="text-left flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div>
                  <div
                    className={`text-lg font-semibold leading-snug ${
                      taskStatus.readingDone ? 'text-[#52605C]' : 'text-[#141D1B]'
                    }`}
                  >
                    读一段经文
                  </div>
                  <div className="mt-0.5 text-sm text-[#64706D]">
                    继续《法句经》第 2 章 · 第 5 偈
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#64706D] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Adaptive Review & Open Source Data Licensing Panel */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowDataAndStats((prev) => !prev)}
          className="w-full rounded-2xl bg-white/80 border border-[#E6EBE8] px-4 py-3 text-xs font-medium text-[#52605C] flex items-center justify-between hover:bg-white transition-colors cursor-pointer"
        >
          <span>
            智能复习调整 · 难点词 ({difficultCards.length}) · 语法错题 ({wrongAttempts.length}) · 开源数据授权
          </span>
          {showDataAndStats ? (
            <ChevronUp className="w-4 h-4 text-[#64706D]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64706D]" />
          )}
        </button>

        {showDataAndStats && (
          <div className="mt-3 rounded-3xl bg-white p-5 border border-[#E6EBE8] space-y-5 text-xs">
            {/* Adaptive Focus Words */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#141D1B] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#1E625E]" />
                  <span>根据学习结果重点强化词汇</span>
                </span>
                <button
                  type="button"
                  onClick={onStartGrammarTask}
                  className="text-[#1E625E] font-semibold hover:underline"
                >
                  前往语法练习 ({GRAMMAR_TOPICS.length} 讲)
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(difficultCards.length > 0
                  ? difficultCards
                  : cards.slice(0, 4)
                ).map((c) => {
                  const entry = DPD_DICTIONARY[c.lemma];
                  if (!entry) return null;
                  return (
                    <button
                      key={c.lemma}
                      type="button"
                      onClick={() => speakPaliText(c.lemma)}
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

      {/* Spacer to push primary CTA down matching Reference Image 2 */}
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
    </div>
  );
};
