import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import {
  DPD_DICTIONARY,
  GRAMMAR_TOPICS,
  type DpdWordEntry,
  type GrammarTopic,
} from '../data/paliData';
import { db, type GrammarAttemptRecord } from '../db/database';
import { speakPaliText } from '../utils/paliAudio';

interface GrammarViewProps {
  attempts: GrammarAttemptRecord[];
  selectedTopicId: string;
  onSelectTopicId: (id: string) => void;
  onAttemptsUpdated: () => Promise<void>;
  onMarkGrammarDone?: () => Promise<void>;
  onOpenInflection: (entry: DpdWordEntry) => void;
}

export const GrammarView: React.FC<GrammarViewProps> = ({
  attempts,
  selectedTopicId,
  onSelectTopicId,
  onAttemptsUpdated,
  onMarkGrammarDone,
  onOpenInflection,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [showMistakesOnly, setShowMistakesOnly] = useState(false);

  const activeTopic: GrammarTopic =
    GRAMMAR_TOPICS.find((t) => t.id === selectedTopicId) ?? GRAMMAR_TOPICS[0];

  const totalExercisesCount = GRAMMAR_TOPICS.reduce((sum, t) => sum + t.exercises.length, 0);

  const wrongQuestionIds = new Set(
    attempts.filter((a) => !a.isCorrect).map((a) => a.questionId)
  );

  const handleSelectOption = async (questionId: string, optionIdx: number, correctIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setSubmittedQuestions((prev) => ({ ...prev, [questionId]: true }));

    const nowTs = Number(new Date());
    await db.grammarAttempts.add({
      topicId: activeTopic.id,
      questionId,
      isCorrect: optionIdx === correctIdx,
      selectedOption: optionIdx,
      timestamp: nowTs,
    });
    if (onMarkGrammarDone) {
      await onMarkGrammarDone();
    }
    await onAttemptsUpdated();
  };

  const handleResetQuiz = () => {
    const nextAnswers = { ...selectedAnswers };
    const nextSubmitted = { ...submittedQuestions };
    activeTopic.exercises.forEach((ex) => {
      delete nextAnswers[ex.id];
      delete nextSubmitted[ex.id];
    });
    setSelectedAnswers(nextAnswers);
    setSubmittedQuestions(nextSubmitted);
  };

  const displayedExercises = showMistakesOnly
    ? activeTopic.exercises.filter((q) => wrongQuestionIds.has(q.id))
    : activeTopic.exercises;

  const completedInTopic = activeTopic.exercises.filter((q) => submittedQuestions[q.id]).length;
  const correctInTopic = activeTopic.exercises.filter(
    (q) => submittedQuestions[q.id] && selectedAnswers[q.id] === q.correctIndex
  ).length;

  const activeTopicIndex = Math.max(
    0,
    GRAMMAR_TOPICS.findIndex((t) => t.id === activeTopic.id)
  );
  const nextTopic =
    activeTopicIndex + 1 < GRAMMAR_TOPICS.length
      ? GRAMMAR_TOPICS[activeTopicIndex + 1]
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-3 pb-28">
      {/* Compact single-line horizontal lesson switcher bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          {GRAMMAR_TOPICS.map((topic) => {
            const isSelected = topic.id === activeTopic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  onSelectTopicId(topic.id);
                  setShowMistakesOnly(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#25635E] text-white shadow-xs'
                    : 'bg-[#FAFBF9] border border-[#E3EAE6] text-[#566561] hover:text-[#1E2A27]'
                }`}
              >
                第 {topic.number} 讲
              </button>
            );
          })}
        </div>

        {wrongQuestionIds.size > 0 && (
          <button
            type="button"
            onClick={() => setShowMistakesOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              showMistakesOnly
                ? 'bg-[#25635E] text-white'
                : 'bg-[#EAF2EF] text-[#25635E] hover:bg-[#DCECE7]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{showMistakesOnly ? '全部题目' : `错题 (${wrongQuestionIds.size})`}</span>
          </button>
        )}
      </div>

      {/* Directly visible Grammar Lesson Card at top of screen (matching user screenshot) */}
      <div className="rounded-3xl bg-[#FAFBF9] p-5 sm:p-6 border border-[#E3EAE6] shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)] space-y-5">
        <div className="border-b border-[#E8EEEB] pb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[#25635E]">
              第 {activeTopic.number} 讲 / 共 {GRAMMAR_TOPICS.length} 讲 · 预计学习 {activeTopic.readingMinutes} 分钟 · {totalExercisesCount} 道总练习
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-[#1E2A27]">
              {activeTopic.titleZh}
            </h1>
            <p className="mt-1 text-sm text-[#566561] leading-relaxed">{activeTopic.summary}</p>
          </div>
          {onMarkGrammarDone && (
            <button
              type="button"
              onClick={() => void onMarkGrammarDone()}
              className="rounded-xl bg-[#EAF2EF] px-3.5 py-2 text-xs font-semibold text-[#25635E] hover:bg-[#DCECE7] shrink-0 cursor-pointer"
            >
              标记今日语法已读
            </button>
          )}
        </div>

        {activeTopic.sections.map((sec) => (
          <div key={sec.heading} className="space-y-3">
            <h3 className="text-base font-bold text-[#1E2A27]">{sec.heading}</h3>
            <div className="text-sm text-[#394441] leading-relaxed whitespace-pre-line">
              {sec.body}
            </div>

            {sec.table && (
              <div className="overflow-x-auto rounded-2xl border border-[#E3EAE6]">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F2F5F1] text-[#566561] border-b border-[#E3EAE6]">
                      {sec.table.headers.map((h) => (
                        <th key={h} className="py-2.5 px-3.5 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEFEA]">
                    {sec.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#F5F8F5]">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2.5 px-3.5 ${
                              cIdx >= 1 ? 'font-pali text-[#1E2A27]' : 'font-medium text-[#2C3735]'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Grammar Quiz Section */}
      <div className="mt-6 rounded-3xl bg-[#FAFBF9] p-6 border border-[#E3EAE6] shadow-[0_4px_20px_-4px_rgba(30,44,41,0.035)]">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E8EEEB]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#25635E]" />
            <h3 className="text-lg font-bold text-[#1E2A27]">
              随堂互动小练习（{completedInTopic} / {activeTopic.exercises.length} 已作答
              {completedInTopic > 0 ? ` · 正确 ${correctInTopic} 题` : ''}）
            </h3>
          </div>
          {completedInTopic > 0 && (
            <button
              type="button"
              onClick={handleResetQuiz}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#25635E] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重做本节练习</span>
            </button>
          )}
        </div>

        {displayedExercises.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#657470]">
            当前章节暂无错题记录，点击上方「显示全部题目」可查看所有练习。
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {displayedExercises.map((q, qIdx) => {
              const selected = selectedAnswers[q.id];
              const isSubmitted = Boolean(submittedQuestions[q.id]);
              const relatedEntry = q.relatedLemma ? DPD_DICTIONARY[q.relatedLemma] : undefined;

              return (
                <div
                  key={q.id}
                  className="rounded-2xl bg-[#F3F6F3] p-4 sm:p-5 border border-[#E2EAE6] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-mono-num text-xs font-semibold text-[#1E625E]">
                        练习 {qIdx + 1}
                      </span>
                      <p className="text-base font-semibold text-[#141D1B]">{q.prompt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakPaliText(q.paliFocus)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#EBF3F1] px-3 py-1.5 text-xs font-pali font-semibold text-[#1E625E] hover:bg-[#DDF0ED] shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{q.paliFocus}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isChosen = selected === optIdx;
                      const isCorrectOption = optIdx === q.correctIndex;

                      let btnStyle =
                        'bg-white border-[#DCE4E1] text-[#141D1B] hover:border-[#1E625E]';
                      if (isSubmitted) {
                        if (isCorrectOption) {
                          btnStyle = 'bg-[#E2F2EE] border-[#1E625E] text-[#143D3A] font-semibold';
                        } else if (isChosen && !isCorrectOption) {
                          btnStyle = 'bg-[#FCEAEA] border-[#C84B4B] text-[#7A2222]';
                        } else {
                          btnStyle = 'bg-white/60 border-[#E6EBE8] text-[#7A8783]';
                        }
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIdx, q.correctIndex)}
                          className={`rounded-xl border px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isSubmitted && isCorrectOption && (
                            <CheckCircle2 className="w-4 h-4 text-[#1E625E] shrink-0" />
                          )}
                          {isSubmitted && isChosen && !isCorrectOption && (
                            <AlertCircle className="w-4 h-4 text-[#C84B4B] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isSubmitted && (
                    <div className="mt-2 rounded-xl bg-white p-3.5 border border-[#E2EAE7] text-xs sm:text-sm text-[#394441] space-y-2">
                      <p className="leading-relaxed">
                        <strong className="text-[#1E625E]">解析：</strong>
                        {q.explanation}
                      </p>
                      {relatedEntry && (
                        <button
                          type="button"
                          onClick={() => onOpenInflection(relatedEntry)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E625E] hover:underline cursor-pointer"
                        >
                          <span>查看「{relatedEntry.lemma}」完整 DPD 变格表</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {nextTopic && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTopicId(nextTopic.id);
                    setShowMistakesOnly(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-[#25635E] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#1E524E] transition-colors cursor-pointer"
                >
                  <span>进入下一讲：第 {nextTopic.number} 讲 · {nextTopic.titleZh}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
