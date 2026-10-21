import React from 'react';
import { Volume2, X } from 'lucide-react';
import type { DpdWordEntry } from '../data/paliData';
import { speakPaliText } from '../utils/paliAudio';

interface InflectionModalProps {
  entry: DpdWordEntry | null;
  highlightForm?: string;
  onClose: () => void;
}

export const InflectionModal: React.FC<InflectionModalProps> = ({
  entry,
  highlightForm,
  onClose,
}) => {
  if (!entry) return null;

  const cleanHighlight = highlightForm?.toLowerCase().replace(/[.,;!?]/g, '');

  const isCellHighlighted = (cellText: string) => {
    if (!cleanHighlight) return false;
    return cellText
      .toLowerCase()
      .split('/')
      .map((s) => s.trim())
      .some((form) => form === cleanHighlight || cleanHighlight.startsWith(form));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-[#E6EBE8] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EEF2F0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-pali text-2xl font-semibold text-[#141D1B]">
                {entry.lemma}
              </h3>
              <button
                type="button"
                onClick={() => speakPaliText(entry.lemma)}
                aria-label="播放发音"
                className="w-9 h-9 rounded-full bg-[#EBF3F1] text-[#1E625E] flex items-center justify-center hover:bg-[#DDF0ED] transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#64706D]">
              {entry.pos} · {entry.inflectionTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-[#64706D] hover:bg-[#F5F6F4] hover:text-[#141D1B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DPD Root & Construction */}
        <div className="mt-4 rounded-2xl bg-[#F5F6F4] px-4 py-3 text-xs space-y-1 text-[#394441]">
          <div className="flex items-center justify-between">
            <span className="text-[#64706D]">DPD 词根与构词：</span>
            <span className="font-mono-num text-[#1E625E] font-medium">{entry.root}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64706D]">构词式：</span>
            <span className="font-pali text-[#141D1B]">{entry.construction}</span>
          </div>
        </div>

        {/* Inflection Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#E6EBE8]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#F5F6F4] text-[#52605C] text-xs border-b border-[#E6EBE8]">
                <th className="py-2.5 px-3.5 font-medium">格位 / 人称</th>
                <th className="py-2.5 px-3.5 font-medium">单数 (Ekavacana)</th>
                <th className="py-2.5 px-3.5 font-medium">复数 (Bahuvacana)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F0]">
              {entry.inflectionTable.map((row) => {
                const sgMatch = isCellHighlighted(row.singular);
                const plMatch = isCellHighlighted(row.plural);
                return (
                  <tr key={row.caseName} className="hover:bg-[#FAFBF9]">
                    <td className="py-2.5 px-3.5">
                      <div className="font-medium text-[#141D1B] text-xs">{row.caseName}</div>
                      <div className="text-[11px] text-[#7A8783] font-pali">{row.casePali}</div>
                    </td>
                    <td
                      onClick={() => speakPaliText(row.singular.split('/')[0].trim())}
                      className={`py-2.5 px-3.5 font-pali text-base cursor-pointer transition-colors ${
                        sgMatch
                          ? 'bg-[#DDF0ED] text-[#1E625E] font-semibold'
                          : 'text-[#141D1B] hover:text-[#1E625E]'
                      }`}
                    >
                      {row.singular}
                    </td>
                    <td
                      onClick={() =>
                        row.plural !== '—' && speakPaliText(row.plural.split('/')[0].trim())
                      }
                      className={`py-2.5 px-3.5 font-pali text-base cursor-pointer transition-colors ${
                        plMatch
                          ? 'bg-[#DDF0ED] text-[#1E625E] font-semibold'
                          : 'text-[#141D1B] hover:text-[#1E625E]'
                      }`}
                    >
                      {row.plural}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-[#7A8783] text-center">
          点击表格中任意巴利语词形即可试听发音 · 数据来源：Digital Pāli Dictionary (DPD)
        </p>
      </div>
    </div>
  );
};
