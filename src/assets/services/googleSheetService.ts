import { Transaction, CategoryBudget, SavingGoal, EXPENSE_CATEGORIES } from '../utils/finance.ts';

export const APPS_SCRIPT_STORAGE_KEY = 'app_expenses_google_script_url';
export const LAST_SYNCED_KEY = 'app_expenses_last_synced';

export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZjYZoAlBL--vF3nAfS8en0bKnZjG2xY7UaUhpr8ZbxbUkg4KXV-M1I-9Nm2sd8vo/exec';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1qaoFpMvTKGcMcBbprvypRVXh2HsgqIMgelmhMawWdP0/edit';

export const DEFAULT_APPS_SCRIPT_CODE = `/**
 * Google Apps Script สำหรับระบบบันทึกรายรับ-รายจ่ายและแผนงบประมาณ
 * ข้อมูล BudgetItem จะถูกเก็บทั้งแบบคอลัมน์สำหรับอ่านง่าย และ JSON เต็มในคอลัมน์สุดท้าย
 * เพื่อเก็บ icon, planType, planMonth และ planAmounts ได้ครบ
 *
 * วิธีติดตั้ง: วางโค้ดนี้ใน Apps Script แล้ว Deploy เป็น Web app
 * Execute as: Me | Who has access: Anyone
 */

var TRANSACTIONS_SHEET = 'Transactions';
var BUDGETS_SHEET = 'BudgetPlans';
var SAVINGS_SHEET = 'Savings';
var TRANSACTION_HEADERS = ['รหัส (ID)', 'วันที่', 'เวลา', 'ประเภท', 'หมวดหมู่', 'รายการ', 'จำนวนเงิน (บาท)', 'หมายเหตุ', 'เวลาที่บันทึก'];
var BUDGET_HEADERS = ['ID', 'หมวดหมู่', 'ชื่อรายการ', 'จำนวนเงิน (บาท)', 'เวลาอัปเดต', 'ข้อมูลรายการ (JSON)'];
var SAVINGS_HEADERS = ['รหัสเป้าหมาย', 'ชื่อเป้าหมาย', 'เป้าหมายรวม (บาท)', 'ยอดสะสมปัจจุบัน (บาท)', 'แผนออมต่อเดือน (บาท)', 'หมายเหตุ', 'ประวัติ (JSON)'];

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);
    var items = readBudgetItems_(ss);
    return jsonOutput_({
      status: 'success',
      spreadsheetUrl: ss.getUrl(),
      transactions: readTransactions_(ss),
      budgets: groupBudgets_(items),
      budgetItems: items,
      savings: readSavings_(ss)
    });
  } catch (error) {
    return jsonOutput_({ status: 'error', message: String(error) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var data = JSON.parse(e && e.postData && e.postData.contents || '{}');
    var action = data.action || 'syncAll';
    if (action !== 'syncAll' && action !== 'sync') throw new Error('Unsupported action');

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);
    if (Array.isArray(data.transactions)) writeRows_(ss.getSheetByName(TRANSACTIONS_SHEET), TRANSACTION_HEADERS,
      data.transactions.map(function(t) {
        return [t.id || '', t.date || '', t.time || '', t.type === 'income' ? 'รายรับ' : 'รายจ่าย', t.category || '', t.title || '', Number(t.amount) || 0, t.note || '', t.createdAt || ''];
      })
    );

    var budgetItems = [];
    if (Array.isArray(data.budgets)) {
      data.budgets.forEach(function(budget) {
        (budget.items || []).forEach(function(item) {
          budgetItems.push(Object.assign({}, item, { category: budget.category }));
        });
      });
    } else if (Array.isArray(data.budgetItems)) {
      budgetItems = data.budgetItems;
    }
    if (Array.isArray(data.budgets) || Array.isArray(data.budgetItems)) writeBudgetItems_(ss, budgetItems);

    if (Array.isArray(data.savings)) writeRows_(ss.getSheetByName(SAVINGS_SHEET), SAVINGS_HEADERS,
      data.savings.map(function(goal) {
        return [goal.id || '', goal.title || '', Number(goal.targetAmount) || 0, Number(goal.currentAmount) || 0, Number(goal.monthlyPlan) || 0, goal.notes || '', JSON.stringify(goal.history || [])];
      })
    );

    return jsonOutput_({ status: 'success', message: 'ซิงค์ข้อมูลทั้งหมดสำเร็จ' });
  } catch (error) {
    return jsonOutput_({ status: 'error', message: String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function ensureSheets_(ss) {
  ensureSheet_(ss, TRANSACTIONS_SHEET, TRANSACTION_HEADERS);
  ensureSheet_(ss, BUDGETS_SHEET, BUDGET_HEADERS);
  ensureSheet_(ss, SAVINGS_SHEET, SAVINGS_HEADERS);
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (name === BUDGETS_SHEET && sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function writeRows_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function writeBudgetItems_(ss, items) {
  var sheet = ss.getSheetByName(BUDGETS_SHEET);
  var now = new Date().toISOString();
  var rows = items.map(function(item) {
    var fullItem = Object.assign({}, item, {
      id: item.id || '',
      name: item.name || '',
      amount: Number(item.amount) || 0,
      category: item.category || '',
      updatedAt: item.updatedAt || now
    });
    return [fullItem.id, fullItem.category, fullItem.name, fullItem.amount, fullItem.updatedAt, JSON.stringify(fullItem)];
  });
  writeRows_(sheet, BUDGET_HEADERS, rows);

  // Clear the old category-level sheet after its data has been replaced by the JSON-capable sheet.
  var legacySheet = ss.getSheetByName('Budgets');
  if (legacySheet) legacySheet.clearContents();
}

function readTransactions_(ss) {
  var sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues()
    .filter(function(row) { return row[0] !== '' && row[0] !== null; })
    .map(function(row) {
      return {
        id: String(row[0]), date: normalizeDate_(row[1]), time: String(row[2] || ''),
        type: row[3] === 'รายรับ' || row[3] === 'income' ? 'income' : 'expense',
        category: String(row[4] || '') === 'เงินออม' ? 'หนี้สิน' : String(row[4] || ''),
        title: String(row[5] || ''), amount: Number(row[6]) || 0,
        note: String(row[7] || ''), createdAt: Number(row[8]) || ''
      };
    });
}

function readBudgetItems_(ss) {
  var sheet = ss.getSheetByName(BUDGETS_SHEET);
  if (sheet && sheet.getLastRow() >= 2) {
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, BUDGET_HEADERS.length).getValues();
    return rows.filter(function(row) { return row[0] !== '' && row[0] !== null; }).map(function(row) {
      var item = {};
      try { item = JSON.parse(row[5] || '{}'); } catch (error) {}
      return Object.assign({}, item, {
        id: item.id || String(row[0]),
        category: String(row[1] || item.category || '') === 'เงินออม' ? 'หนี้สิน' : String(row[1] || item.category || ''),
        name: item.name || String(row[2] || ''),
        amount: Number(item.amount !== undefined ? item.amount : row[3]) || 0,
        updatedAt: item.updatedAt || String(row[4] || '')
      });
    });
  }

  // Backward compatibility: read old Budgets rows containing a JSON array of items.
  var legacySheet = ss.getSheetByName('Budgets');
  if (!legacySheet || legacySheet.getLastRow() < 2) return [];
  var legacyRows = legacySheet.getRange(2, 1, legacySheet.getLastRow() - 1, 3).getValues();
  var items = [];
  legacyRows.forEach(function(row) {
    try {
      JSON.parse(row[2] || '[]').forEach(function(item) {
        items.push(Object.assign({}, item, { category: row[0] }));
      });
    } catch (error) {}
  });
  return items;
}

function groupBudgets_(items) {
  var groups = {};
  items.forEach(function(item) {
    var category = item.category || 'ค่าใช้จ่ายอื่นๆ';
    if (category === 'เงินออม') category = 'หนี้สิน';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  });
  return Object.keys(groups).map(function(category) {
    var categoryItems = groups[category];
    return {
      category: category,
      items: categoryItems,
      totalPlanned: categoryItems.reduce(function(total, item) { return total + (Number(item.amount) || 0); }, 0)
    };
  });
}

function readSavings_(ss) {
  var sheet = ss.getSheetByName(SAVINGS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues()
    .filter(function(row) { return row[0] !== '' && row[0] !== null; })
    .map(function(row) {
      var history = [];
      try { history = JSON.parse(row[6] || '[]'); } catch (error) {}
      return {
        id: String(row[0]), title: String(row[1] || ''), targetAmount: Number(row[2]) || 0,
        currentAmount: Number(row[3]) || 0, monthlyPlan: Number(row[4]) || 0,
        notes: String(row[5] || ''), history: history
      };
    });
}

function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var text = String(value || '');
  return /^\\d{4}-\\d{2}-\\d{2}$/.test(text) ? text : text.substring(0, 10);
}

function jsonOutput_(data) {
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
        category: String(t.category || 'ค่าใช้จ่ายอื่นๆ') === 'เงินออม' ? 'หนี้สิน' : String(t.category || 'ค่าใช้จ่ายอื่นๆ'),
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
          category: b.category === 'เงินออม' ? 'หนี้สิน' : b.category,
            totalPlanned: Number(b.totalPlanned) || 0,
            items: items.map((i: any) => ({
              ...i,
              id: String(i.id || `bi-${Date.now()}`),
              name: String(i.name || ''),
              amount: Number(i.amount) || 0,
              icon: i.icon ? String(i.icon) : undefined,
              planType: i.planType,
              planMonth: i.planMonth,
              planAmounts: i.planAmounts && typeof i.planAmounts === 'object' ? i.planAmounts : undefined,
            })),
          };
        });
      } else if (Array.isArray(json.budgetItems) && json.budgetItems.length > 0) {
        // Group budgetItems by category
        const groupMap: Record<string, any[]> = {};
        for (const item of json.budgetItems) {
          const cat = item.category === 'เงินออม' ? 'หนี้สิน' : item.category || 'ค่าใช้จ่ายอื่นๆ';
          if (!groupMap[cat]) groupMap[cat] = [];
          groupMap[cat].push({
            ...item,
            id: String(item.id || `bi-${Date.now()}`),
            name: String(item.name || ''),
            amount: Number(item.amount) || 0,
            icon: item.icon ? String(item.icon) : undefined,
            planType: item.planType,
            planMonth: item.planMonth,
            planAmounts: item.planAmounts && typeof item.planAmounts === 'object' ? item.planAmounts : undefined,
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
