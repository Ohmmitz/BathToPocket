import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Code
} from 'lucide-react';
import { DEFAULT_APPS_SCRIPT_CODE, DEFAULT_SPREADSHEET_URL, getStoredScriptUrl, setStoredScriptUrl, sendToGoogleSheet } from '../services/googleSheetService.ts';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncAll: () => Promise<void>;
  onFetchFromSheet?: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  onSyncAll,
  onFetchFromSheet,
  isSyncing,
}) => {
  const [scriptUrl, setScriptUrl] = useState(() => getStoredScriptUrl());
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'setup' | 'code'>('setup');

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(DEFAULT_APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveUrl = () => {
    setStoredScriptUrl(scriptUrl);
    setTestStatus('success');
    setTestMessage('บันทึก URL เรียบร้อยแล้ว');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleTestConnection = async () => {
    if (!scriptUrl.trim()) {
      setTestStatus('error');
      setTestMessage('กรุณาใส่ Google Apps Script Web App URL ก่อน');
      return;
    }

    setTestStatus('testing');
    setTestMessage('กำลังทดสอบการเชื่อมต่อ...');

    try {
      setStoredScriptUrl(scriptUrl);
      const res = await sendToGoogleSheet('ping', {});
      if (res.success) {
        setTestStatus('success');
        setTestMessage('เชื่อมต่อสำเร็จ! Google Sheet พร้อมรับข้อมูลแล้ว');
      } else {
        setTestStatus('error');
        setTestMessage(`ไม่สามารถเชื่อมต่อได้: ${res.message || 'โปรดตรวจสอบสิทธิ์ Anyone'}`);
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`เกิดข้อผิดพลาด: ${(err as Error).message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl glass-island rounded-3xl shadow-2xl border border-white/95 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gs-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-800 border border-emerald-300/40 shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 id="gs-modal-title" className="text-lg font-bold text-gray-900 leading-tight">
                เชื่อมต่อ Google Sheets (ไม่ต้องล็อกอิน)
              </h2>
              <p className="text-xs text-gray-500">
                ดึงและบันทึกข้อมูลแบบอัตโนมัติผ่าน Google Apps Script Web App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-xl transition-colors"
            aria-label="ปิดการตั้งค่า"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'setup'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            ขั้นตอนติดตั้ง (3 สเต็ปง่ายๆ)
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Code className="w-4 h-4" />
            โค้ด Apps Script พร้อมก๊อปปี้
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'setup' ? (
            <div className="space-y-5">
              {/* URL Input Box */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <label htmlFor="gs-url-input" className="block text-xs font-bold text-gray-800 mb-1.5">
                  วาง Web App URL ของคุณที่นี่:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="gs-url-input"
                    type="url"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-gray-800"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveUrl}
                      className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                      บันทึก URL
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                      className="px-3.5 py-2.5 text-xs font-medium border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testStatus === 'testing' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      ทดสอบ
                    </button>
                  </div>
                </div>

                {/* Feedback message */}
                {testMessage && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testStatus === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : testStatus === 'error'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
                    {testStatus === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>

              {/* Direct Link to Connected Google Sheet */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      Google Sheet สเปรดชีตของคุณ
                    </span>
                    <span className="text-[11px] text-gray-600">
                      เปิดดูตารางข้อมูล รายรับ-รายจ่าย งบประมาณ และเงินออมใน Google Drive
                    </span>
                  </div>
                </div>
                <a
                  href={DEFAULT_SPREADSHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
                >
                  เปิด Google Sheet <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Sync Actions (Push & Pull) */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block">
                      การซิงค์ข้อมูลกับ Google Sheets
                    </span>
                    <span className="text-[11px] text-gray-500">
                      ระบบบันทึกไปยัง Google Sheet อัตโนมัติทุกครั้งเมื่อมีการบันทึกหรือย้อนรายการ
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={onSyncAll}
                    disabled={isSyncing || !scriptUrl}
                    className="w-full sm:flex-1 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'กำลังซิงค์...' : 'ส่งข้อมูลทั้งหมดไปเขียนลงชีต (Push)'}
                  </button>

                  {onFetchFromSheet && (
                    <button
                      onClick={onFetchFromSheet}
                      disabled={isSyncing || !scriptUrl}
                      className="w-full sm:flex-1 px-4 py-2 border border-gray-300 hover:bg-white bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-700' : ''}`} />
                      {isSyncing ? 'กำลังโหลด...' : 'ดึงข้อมูลล่าสุดจากชีต (Pull)'}
                    </button>
                  )}
                </div>
              </div>

              {/* Step by step guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  วิธีทำใน Google Sheets (ใช้เวลา 1 นาที)
                </h4>

                <div className="space-y-3 text-xs text-gray-700">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 mb-0.5">
                        สร้าง Google Sheets ใหม่ & เปิด Apps Script
                      </p>
                      <p className="text-gray-600 mb-2">
                        สร้างชีตเปล่าที่ <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-medium">sheets.new <ExternalLink className="w-3 h-3" /></a> จากนั้นไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &rarr; <strong>Apps Script</strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div className="w-full">
                      <p className="font-semibold text-gray-900 mb-0.5">
                        วางโค้ดสคริปต์
                      </p>
                      <p className="text-gray-600 mb-2">
                        ลบโค้ดเดิมใน <code className="bg-gray-100 px-1 py-0.5 rounded">Code.gs</code> ออกทั้งหมด แล้วคัดลอกโค้ดจากปุ่มด้านล่างไปวางแทนที่:
                      </p>
                      <button
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'คัดลอกโค้ดเรียบร้อย!' : 'คลิกเพื่อคัดลอกโค้ด Apps Script ทั้งหมด'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 mb-0.5">
                        กด Deploy (การทำให้ใช้งานได้)
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 mt-1">
                        <li>กดปุ่มสีฟ้า <strong>การทำให้ใช้งานได้ (Deploy)</strong> &rarr; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
                        <li>กดรูปฟันเฟืองเลือกประเภท <strong>เว็บแอปพลิเคชัน (Web App)</strong></li>
                        <li>เรียกใช้งานในฐานะ: <strong>ฉัน (Me)</strong></li>
                        <li>ผู้ที่มีสิทธิ์เข้าถึง: <strong>ทุกคน (Anyone)</strong> <span className="text-rose-600 font-semibold">*จุดนี้สำคัญมาก* เพื่อให้บันทึกได้ไม่ต้องล็อกอิน</span></li>
                        <li>กด <strong>ทำให้ใช้งานได้ (Deploy)</strong> แล้วคัดลอก Web App URL (ลงท้ายด้วย <code className="bg-gray-100 px-1 rounded">/exec</code>) นำมาวางที่กล่องด้านบน</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  โค้ด Google Apps Script (รองรับอัตโนมัติ 3 ชีต: Transactions, Budgets, Savings)
                </span>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอกโค้ดทั้งหมด'}
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900 text-gray-100 text-xs font-mono">
                <pre className="p-4 max-h-[360px] overflow-x-auto overflow-y-auto leading-relaxed">
                  <code>{DEFAULT_APPS_SCRIPT_CODE}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-500">
            💡 แอปบันทึกลงในเครื่อง (Offline-first) เสมอ แม้ยังไม่ได้เชื่อมต่อ Sheet
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
