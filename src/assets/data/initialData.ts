import { CategoryBudget, Transaction, SavingGoal, EXPENSE_CATEGORIES } from '../utils/finance.ts';

const today = new Date().toISOString().split('T')[0];
const yesterdayDate = new Date();
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterday = yesterdayDate.toISOString().split('T')[0];

const fiveDaysAgoDate = new Date();
fiveDaysAgoDate.setDate(fiveDaysAgoDate.getDate() - 5);
const fiveDaysAgo = fiveDaysAgoDate.toISOString().split('T')[0];

export const INITIAL_BUDGETS: CategoryBudget[] = [
  {
    category: 'อาหารและเครื่องดื่ม',
    items: [
      { id: 'b1-1', name: 'มื้ออาหารประจำวัน (3 มื้อ)', amount: 6500 },
      { id: 'b1-2', name: 'กาแฟและเครื่องดื่ม', amount: 1500 },
      { id: 'b1-3', name: 'ทานข้าวนอกบ้าน/สังสรรค์', amount: 2000 },
    ],
    totalPlanned: 10000,
  },
  {
    category: 'การเดินทาง',
    items: [
      { id: 'b2-1', name: 'ค่าน้ำมันรถยนต์/มอเตอร์ไซค์', amount: 2500 },
      { id: 'b2-2', name: 'รถไฟฟ้า BTS / MRT', amount: 1200 },
      { id: 'b2-3', name: 'ค่าทางด่วน / ที่จอดรถ', amount: 800 },
    ],
    totalPlanned: 4500,
  },
  {
    category: 'บิลและค่าใช้จ่ายประจำ',
    items: [
      { id: 'b3-1', name: 'ค่าห้อง / ค่าส่วนกลาง', amount: 7500 },
      { id: 'b3-2', name: 'ค่าน้ำ ค่าไฟ', amount: 1800 },
      { id: 'b3-3', name: 'ค่าอินเทอร์เน็ต & โทรศัพท์', amount: 890 },
      { id: 'b3-4', name: 'สตรีมมิ่ง & ซับสคริปชัน', amount: 450 },
    ],
    totalPlanned: 10640,
  },
  {
    category: 'ความบันเทิงและพักผ่อน',
    items: [
      { id: 'b4-1', name: 'ดูหนัง ฟังเพลง คอนเสิร์ต', amount: 1000 },
      { id: 'b4-2', name: 'เกม & กิจกรรมสันทนาการ', amount: 1000 },
    ],
    totalPlanned: 2000,
  },
  {
    category: 'สุขภาพและยา',
    items: [
      { id: 'b5-1', name: 'วิตามินและอาหารเสริม', amount: 800 },
      { id: 'b5-2', name: 'ค่ายาและตรวจสุขภาพ', amount: 1200 },
    ],
    totalPlanned: 2000,
  },
  {
    category: 'ของใช้และช็อปปิ้ง',
    items: [
      { id: 'b6-1', name: 'ของใช้ในบ้านและของใช้ส่วนตัว', amount: 1500 },
      { id: 'b6-2', name: 'เสื้อผ้าและเครื่องประดับ', amount: 1500 },
    ],
    totalPlanned: 3000,
  },
  {
    category: 'เงินออม',
    items: [
      { id: 'b7-1', name: 'เงินสำรองฉุกเฉินประจำเดือน', amount: 4000 },
      { id: 'b7-2', name: 'กองทุนเพื่อการลงทุน', amount: 3000 },
    ],
    totalPlanned: 7000,
  },
  {
    category: 'ค่าใช้จ่ายอื่นๆ',
    items: [
      { id: 'b8-1', name: 'เงินสำรองเผื่อฉุกเฉินยิบย่อย', amount: 1500 },
    ],
    totalPlanned: 1500,
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-seed-1',
    type: 'income',
    category: 'เงินเดือน / ค่าจ้าง',
    title: 'เงินเดือนประจำเดือน',
    amount: 45000,
    date: today,
    time: '08:00',
    note: 'โอนเข้าบัญชีหลัก',
    createdAt: Date.now() - 3600000 * 8,
  },
  {
    id: 'tx-seed-2',
    type: 'expense',
    category: 'อาหารและเครื่องดื่ม',
    title: 'ข้าวกะเพราหมูกรอบไข่ดาว + ชานม',
    amount: 115,
    date: today,
    time: '12:15',
    note: 'มื้อเที่ยงแถวออฟฟิศ',
    createdAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'tx-seed-3',
    type: 'expense',
    category: 'การเดินทาง',
    title: 'เติมน้ำมัน ปตท.',
    amount: 1200,
    date: today,
    time: '14:30',
    note: 'E20 เต็มถัง',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'tx-seed-4',
    type: 'expense',
    category: 'อาหารและเครื่องดื่ม',
    title: 'กาแฟอเมริกาโน่เย็น ไม่หวาน',
    amount: 75,
    date: yesterday,
    time: '09:00',
    note: 'ร้านประจำ',
    createdAt: Date.now() - 3600000 * 26,
  },
  {
    id: 'tx-seed-5',
    type: 'expense',
    category: 'บิลและค่าใช้จ่ายประจำ',
    title: 'ค่าไฟฟ้านครหลวง',
    amount: 1450,
    date: yesterday,
    time: '15:20',
    note: 'จ่ายผ่านแอปธนาคาร',
    createdAt: Date.now() - 3600000 * 20,
  },
  {
    id: 'tx-seed-6',
    type: 'expense',
    category: 'ของใช้และช็อปปิ้ง',
    title: 'ซื้อของซูเปอร์มาร์เก็ตเข้าบ้าน',
    amount: 890,
    date: fiveDaysAgo,
    time: '18:40',
    note: 'ทิชชู่ ผงซักฟอก ยาสระผม',
    createdAt: Date.now() - 3600000 * 120,
  },
];

export const INITIAL_SAVINGS: SavingGoal[] = [
  {
    id: 'save-1',
    title: 'เงินสำรองฉุกเฉิน 6 เดือน',
    targetAmount: 100000,
    currentAmount: 48000,
    monthlyPlan: 5000,
    notes: 'เก็บไว้ในบัญชีดิจิทัลดอกเบี้ยสูง',
    history: [
      { id: 'sh-1', amount: 5000, date: today, note: 'ออมประจำเดือนนี้', createdAt: Date.now() - 100000 },
      { id: 'sh-2', amount: 5000, date: '2026-10-01', note: 'ออมเดือนที่แล้ว', createdAt: Date.now() - 2500000 },
    ],
  },
  {
    id: 'save-2',
    title: 'ทริปท่องเที่ยวประเทศญี่ปุ่น',
    targetAmount: 50000,
    currentAmount: 22000,
    monthlyPlan: 4000,
    notes: 'แผนเที่ยวฤดูหนาวปลายปี',
    history: [
      { id: 'sh-3', amount: 4000, date: today, note: 'หยอดกระปุกทริปเที่ยว', createdAt: Date.now() - 80000 },
    ],
  },
];
