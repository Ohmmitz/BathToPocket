import { Transaction, CategoryBudget, SavingGoal, EXPENSE_CATEGORIES } from '../utils/finance.ts';

export const APPS_SCRIPT_STORAGE_KEY = 'app_expenses_google_script_url';
export const LAST_SYNCED_KEY = 'app_expenses_last_synced';

export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZjYZoAlBL--vF3nAfS8en0bKnZjG2xY7UaUhpr8ZbxbUkg4KXV-M1I-9Nm2sd8vo/exec';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1qaoFpMvTKGcMcBbprvypRVXh2HsgqIMgelmhMawWdP0/edit';

export const DEFAULT_APPS_SCRIPT_CODE = `/**
 * Google Apps Script สำหรับระบบบันทึกรายรับ-รายจ่าย & วางแผนงบประมาณ
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheets ใหม่ -> ไปที่เมนู "ส่วนขยาย" (Extensions) -> "Apps Script"
 * 2. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดนี้ลงไป
 * 3. กด "การทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 4. เลือกประเภท: "เว็บแอปพลิเคชัน" (Web App)
 * 5. ตั้งค่า: "เรียกใช้งานในฐานะ" (Execute as): "ฉัน (Me)"
 * 6. ตั้งค่า: "ผู้ที่มีสิทธิ์เข้าถึง" (Who has access): "ทุกคน (Anyone)" **สำคัญมาก**
 * 7. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก Web App URL (ลงท้ายด้วย /exec) มาวางในเว็บแอพ
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);
  
  var result = {
    status: 'success',
    spreadsheetUrl: ss.getUrl(),
    transactions: readTransactions(ss),
    budgets: readBudgets(ss),
    budgetItems: readBudgetItems(ss),
    savings: readSavings(ss)
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(ss);
    
    var action = data.action || 'syncAll';
    
    if (action === 'syncAll' || action === 'sync') {
      if (data.transactions) {
        var txRows = data.transactions.map(function(t) {
          return [t.id, t.date, t.time || '', t.type === 'income' ? 'รายรับ' : 'รายจ่าย', t.category, t.title, Number(t.amount) || 0, t.note || '', t.createdAt || ''];
        });
        overwriteSheet(ss, 'Transactions', ['รหัส (ID)', 'วันที่', 'เวลา', 'ประเภท', 'หมวดหมู่', 'รายการ', 'จำนวนเงิน (บาท)', 'หมายเหตุ', 'เวลาที่บันทึก'], txRows);
      }
      
      if (data.budgets) {
        var bRows = data.budgets.map(function(b) {
          return [b.category, Number(b.totalPlanned) || 0, JSON.stringify(b.items || [])];
        });
        overwriteSheet(ss, 'Budgets', ['หมวดหมู่', 'งบประมาณที่วางแผน (บาท)', 'รายการย่อย (JSON)'], bRows);
      }
      
      if (data.savings) {
        var sRows = data.savings.map(function(s) {
          return [s.id, s.title, Number(s.targetAmount) || 0, Number(s.currentAmount) || 0, Number(s.monthlyPlan) || 0, s.notes || '', JSON.stringify(s.history || [])];
        });
        overwriteSheet(ss, 'Savings', ['รหัสเป้าหมาย', 'ชื่อเป้าหมาย', 'เป้าหมายรวม (บาท)', 'ยอดสะสมปัจจุบัน (บาท)', 'แผนออมต่อเดือน (บาท)', 'หมายเหตุ', 'ประวัติการฝาก (JSON)'], sRows);
      }
      return createResponse({ status: 'success', message: 'ซิงค์ข้อมูลทั้งหมดสำเร็จ' });
    }
    
    return createResponse({ status: 'success', message: 'ดำเนินการสำเร็จ' });
  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

function ensureSheets(ss) {
  var names = ['Transactions', 'Budgets', 'Savings'];
  names.forEach(function(name) {
    var s = ss.getSheetByName(name);
    if (!s) {
      s = ss.insertSheet(name);
      if (name === 'Transactions') {
        s.appendRow(['รหัส (ID)', 'วันที่', 'เวลา', 'ประเภท', 'หมวดหมู่', 'รายการ', 'จำนวนเงิน (บาท)', 'หมายเหตุ', 'เวลาที่บันทึก']);
      } else if (name === 'Budgets') {
        s.appendRow(['หมวดหมู่', 'งบประมาณที่วางแผน (บาท)', 'รายการย่อย (JSON)']);
      } else if (name === 'Savings') {
        s.appendRow(['รหัสเป้าหมาย', 'ชื่อเป้าหมาย', 'เป้าหมายรวม (บาท)', 'ยอดสะสมปัจจุบัน (บาท)', 'แผนออมต่อเดือน (บาท)', 'หมายเหตุ', 'ประวัติการฝาก (JSON)']);
      }
      s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold').setBackground('#E8F5E9');
    }
  });
}

function overwriteSheet(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8F5E9');
  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function readTransactions(ss) {
  var sheet = ss.getSheetByName('Transactions');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  return rows.map(function(r) {
    return {
      id: String(r[0]),
      date: String(r[1]),
      time: String(r[2]),
      type: r[3] === 'รายรับ' ? 'income' : 'expense',
      category: String(r[4]),
      title: String(r[5]),
      amount: Number(r[6]) || 0,
      note: String(r[7] || ''),
      createdAt: Number(r[8]) || new Date().getTime()
    };
  });
}

function readBudgets(ss) {
  var sheet = ss.getSheetByName('Budgets');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  return rows.map(function(r) {
    var items = [];
    try { items = JSON.parse(r[2]); } catch (e) {}
    return {
      category: String(r[0]),
      totalPlanned: Number(r[1]) || 0,
      items: items
    };
  });
}

function readBudgetItems(ss) {
  var sheet = ss.getSheetByName('Budgets');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var allItems = [];
  rows.forEach(function(r) {
    try {
      var items = JSON.parse(r[2]);
      if (Array.isArray(items)) {
        items.forEach(function(i) {
          allItems.push({
            id: i.id,
            category: String(r[0]),
            name: i.name,
            amount: Number(i.amount) || 0
          });
        });
      }
    } catch(e) {}
  });
  return allItems;
}

function readSavings(ss) {
  var sheet = ss.getSheetByName('Savings');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return rows.map(function(r) {
    var history = [];
    try { history = JSON.parse(r[6]); } catch (e) {}
    return {
      id: String(r[0]),
      title: String(r[1]),
      targetAmount: Number(r[2]) || 0,
      currentAmount: Number(r[3]) || 0,
      monthlyPlan: Number(r[4]) || 0,
      notes: String(r[5] || ''),
      history: history
    };
  });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export interface SyncStatus {
  isConfigured: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
  error: string | null;
}

export function getStoredScriptUrl(): string {
  try {
    const saved = localStorage.getItem(APPS_SCRIPT_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
    return DEFAULT_SCRIPT_URL;
  } catch {
    return DEFAULT_SCRIPT_URL;
  }
}

export function setStoredScriptUrl(url: string): void {
  try {
    localStorage.setItem(APPS_SCRIPT_STORAGE_KEY, url.trim());
  } catch (err) {
    console.error('Failed to save script URL to localStorage', err);
  }
}

export function getStoredLastSynced(): string | null {
  try {
    return localStorage.getItem(LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

export function setStoredLastSynced(timeStr: string): void {
  try {
    localStorage.setItem(LAST_SYNCED_KEY, timeStr);
  } catch {}
}

/**
 * Helper to normalize date strings from Google Sheet (e.g., "Sun Nov 08 2026 ...") to YYYY-MM-DD
 */
export function normalizeSheetDate(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;

  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch {}
  return String(rawDate).substring(0, 10);
}

/**
 * Helper to normalize time strings from Google Sheet
 */
export function normalizeSheetTime(rawTime: string): string {
  if (!rawTime) return '';
  if (/^\d{2}:\d{2}$/.test(rawTime)) return rawTime;

  try {
    const d = new Date(rawTime);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
  } catch {}
  return String(rawTime).substring(0, 5);
}

/**
 * Send payload to Google Apps Script.
 * Uses text/plain to avoid CORS preflight triggers.
 */
export async function sendToGoogleSheet(
  action: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; message?: string }> {
  const url = getStoredScriptUrl();
  if (!url) {
    return { success: false, message: 'ยังไม่ได้ตั้งค่า Google Apps Script Web App URL' };
  }

  try {
    const body = JSON.stringify({ action, ...payload });
    
    // We send with text/plain
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body,
    });

    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    setStoredLastSynced(now);

    return { success: true, message: 'ส่งข้อมูลไปยัง Google Sheets สำเร็จ' };
  } catch (error) {
    console.error('Failed to sync to Google Sheet:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Fetch data from Google Apps Script if URL is configured
 */
export async function fetchFromGoogleSheet(): Promise<{
  success: boolean;
  data?: {
    spreadsheetUrl?: string;
    transactions: Transaction[];
    budgets: CategoryBudget[];
    savings: SavingGoal[];
  };
  message?: string;
}> {
  const url = getStoredScriptUrl();
  if (!url) {
    return { success: false, message: 'ไม่มี URL' };
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    const json = await res.json();
    if (json.status === 'success') {
      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setStoredLastSynced(now);

      // Parse and normalize transactions
      const rawTxList = Array.isArray(json.transactions) ? json.transactions : [];
      const parsedTransactions: Transaction[] = rawTxList.map((t: any) => ({
        id: String(t.id || `tx-${Date.now()}`),
        date: normalizeSheetDate(String(t.date || '')),
        time: normalizeSheetTime(String(t.time || '')),
        type: t.type === 'income' || t.type === 'รายรับ' ? 'income' : 'expense',
        category: String(t.category || 'ค่าใช้จ่ายอื่นๆ'),
        title: String(t.title || 'รายการ'),
        amount: Number(t.amount) || 0,
        note: t.note ? String(t.note) : undefined,
        createdAt: Number(t.createdAt) || Date.now(),
      }));

      // Parse budgets: either from json.budgets or json.budgetItems
      let parsedBudgets: CategoryBudget[] = [];
      if (Array.isArray(json.budgets) && json.budgets.length > 0) {
        parsedBudgets = json.budgets.map((b: any) => {
          let items = Array.isArray(b.items) ? b.items : [];
          return {
            category: b.category,
            totalPlanned: Number(b.totalPlanned) || 0,
            items: items.map((i: any) => ({
              id: String(i.id || `bi-${Date.now()}`),
              name: String(i.name || ''),
              amount: Number(i.amount) || 0,
            })),
          };
        });
      } else if (Array.isArray(json.budgetItems) && json.budgetItems.length > 0) {
        // Group budgetItems by category
        const groupMap: Record<string, any[]> = {};
        for (const item of json.budgetItems) {
          const cat = item.category || 'ค่าใช้จ่ายอื่นๆ';
          if (!groupMap[cat]) groupMap[cat] = [];
          groupMap[cat].push({
            id: String(item.id || `bi-${Date.now()}`),
            name: String(item.name || ''),
            amount: Number(item.amount) || 0,
          });
        }
        parsedBudgets = EXPENSE_CATEGORIES.map((cat) => {
          const items = groupMap[cat] || [];
          const totalPlanned = items.reduce((sum: number, it: any) => sum + it.amount, 0);
          return {
            category: cat,
            items,
            totalPlanned,
          };
        });
      }

      // Parse savings if present
      const rawSavings = Array.isArray(json.savings) ? json.savings : [];
      const parsedSavings: SavingGoal[] = rawSavings.map((s: any) => ({
        id: String(s.id || `goal-${Date.now()}`),
        title: String(s.title || 'เป้าหมายเงินออม'),
        targetAmount: Number(s.targetAmount) || 0,
        currentAmount: Number(s.currentAmount) || 0,
        monthlyPlan: Number(s.monthlyPlan) || 0,
        notes: s.notes ? String(s.notes) : undefined,
        history: Array.isArray(s.history) ? s.history : [],
      }));

      return {
        success: true,
        data: {
          spreadsheetUrl: json.spreadsheetUrl,
          transactions: parsedTransactions,
          budgets: parsedBudgets,
          savings: parsedSavings,
        },
      };
    }
    return { success: false, message: 'ข้อมูลตอบกลับไม่ถูกต้อง' };
  } catch (err) {
    console.warn('Cannot fetch directly from Google Sheet:', err);
    return { success: false, message: (err as Error).message };
  }
}
