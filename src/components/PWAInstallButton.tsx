import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4E2DF] bg-[#EBF3F1] px-3 py-2 text-xs font-medium text-[#1E625E] hover:bg-[#DDF0ED] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isIOS ? '安装到手机' : '离线安装 PWA'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl border border-[#E6EBE8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#1E625E]">
                <Smartphone className="w-5 h-5" />
                <h3 className="text-base font-semibold text-[#141D1B]">安装到手机主屏幕</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-2 text-[#64706D] hover:text-[#141D1B] rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-[#4A5552] leading-relaxed">
              <p>
                本应用为纯前端 <strong>PWA（渐进式网页应用）</strong>，词典、经文与学习进度均保存在本地 <strong>IndexedDB</strong> 中，安装后可完全离线使用：
              </p>
              <div className="rounded-2xl bg-[#F5F6F4] p-3.5 text-xs space-y-1.5 text-[#2C3735]">
                <p>1. <strong>iOS Safari</strong>：点击底部工具栏的「分享」按钮，选择「添加到主屏幕」。</p>
                <p>2. <strong>Android / Chrome / Edge</strong>：点击浏览器地址栏右侧的安装图标或菜单中的「安装应用」。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#1E625E] py-2.5 text-sm font-medium text-white hover:bg-[#174E4A] transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-xl bg-[#16211F] px-3.5 py-2 text-xs font-medium text-[#E2EFED] shadow-lg">
      <span>离线模式 · 正在使用本地 IndexedDB 词库与进度</span>
    </div>
  );
};
