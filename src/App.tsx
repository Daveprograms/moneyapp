import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  Calendar, 
  BarChart2, 
  Target, 
  Camera, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  Edit2,
  Smartphone,
  WifiOff,
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Transaction, Goal } from './types/finance';
import { 
  getToday, 
  getCurrentTime, 
  getDayOfWeek, 
  getFullFormattedDate, 
  getCurrentTime24, 
  formatTime24to12 
} from './utils/simpleDates';
import { processSmartInput, type ParsedItem } from './utils/nlpParser';
import { scanScreenshot } from './utils/ocrScanner';

export function App() {
  const todayStr = getToday();

  // Dark / Bright Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_mode');
      return saved ? saved === 'dark' : false; // Default to bright mode matching screenshots
    } catch {
      return false;
    }
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'goal'>('today');

  // Transactions state - starts 100% clean with NO dummy data
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('real_transactions_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Savings goal state - starts at 0 saved
  const [goal, setGoal] = useState<Goal>(() => {
    try {
      const saved = localStorage.getItem('real_goal_v4');
      return saved ? JSON.parse(saved) : { id: 'g1', name: 'Emergency Fund', target: 1000, saved: 0 };
    } catch {
      return { id: 'g1', name: 'Emergency Fund', target: 1000, saved: 0 };
    }
  });

  // Natural Language text message state
  const [naturalText, setNaturalText] = useState('');

  // Quick Add Modal state
  const [quickAddType, setQuickAddType] = useState<'income' | 'expense' | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickDate, setQuickDate] = useState<string>(todayStr);
  const [quickTime, setQuickTime] = useState<string>(getCurrentTime24());

  // Activity filter ('today' vs 'all')
  const [activityFilter, setActivityFilter] = useState<'today' | 'all'>('today');

  // Expanded day in Day-by-day views
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const openQuickAdd = (type: 'income' | 'expense') => {
    setQuickAddType(type);
    setQuickDate(todayStr);
    setQuickTime(getCurrentTime24());
    setQuickAmount('');
    setQuickNote('');
  };

  // Feedback / Notification banner
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'delete';
  } | null>(null);

  // Auto-dismiss feedback message after 4.5s
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  // Edit Transaction Modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditAmount(String(tx.amount));
    setEditNote(tx.note);
    setEditType(tx.type);
    setEditDate(tx.date);

    let time24 = '12:00';
    if (tx.time && tx.time.includes(':')) {
      const isPM = /PM/i.test(tx.time);
      const isAM = /AM/i.test(tx.time);
      const match = tx.time.match(/([0-9]{1,2}):([0-9]{2})/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        time24 = `${String(h).padStart(2, '0')}:${m}`;
      }
    }
    setEditTime(time24);
  };

  const handleSaveTransactionEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) return;

    const chosenDate = editDate.trim() || todayStr;
    const formattedTime = formatTime24to12(editTime);
    const dayName = getDayOfWeek(chosenDate);

    const updatedTx: Transaction = {
      ...editingTransaction,
      type: editType,
      amount: amt,
      note: editNote.trim() || (editType === 'income' ? 'Income' : 'Expense'),
      date: chosenDate,
      time: formattedTime,
      day: dayName,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === editingTransaction.id ? updatedTx : t))
    );
    setFeedbackMessage({ text: `Updated ${updatedTx.note} ($${amt})`, type: 'success' });
    setEditingTransaction(null);
  };

  // Screenshot OCR Scan state
  const [isScanningModalOpen, setIsScanningModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedItems, setScannedItems] = useState<ParsedItem[]>([]);
  const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Goal Deposit & Edit state
  const [isDepositingGoal, setIsDepositingGoal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalNameInput, setGoalNameInput] = useState(goal.name);
  const [goalTargetInput, setGoalTargetInput] = useState(String(goal.target));

  // Phone install modal state
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Data management & backup modal state
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Online / Offline tracking
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync to localStorage permanently
  useEffect(() => {
    localStorage.setItem('theme_mode', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('real_transactions_v4', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('real_goal_v4', JSON.stringify(goal));
  }, [goal]);

  // Export Data as JSON file
  const handleExportJSON = () => {
    const data = {
      appName: 'Daily Profit',
      exportDate: new Date().toISOString(),
      transactions,
      goal,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_profit_backup_${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Data as CSV spreadsheet
  const handleExportCSV = () => {
    const headers = ['Date', 'Day', 'Time', 'Type', 'Amount', 'Note', 'Timestamp'];
    const rows = transactions.map((t) => [
      t.date,
      t.day || getDayOfWeek(t.date),
      t.time || '',
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.timestamp || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_profit_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore Data from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
          if (parsed.goal) {
            setGoal(parsed.goal);
          }
          alert('Backup restored successfully!');
          setIsDataModalOpen(false);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not read JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Clear All Data
  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to delete ALL data and start completely at $0?')) {
      setTransactions([]);
      setGoal({ id: 'g1', name: 'Emergency Fund', target: 1000, saved: 0 });
      setIsDataModalOpen(false);
    }
  };

  // Today calculations
  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const todayMade = todayTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const todaySpent = todayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayProfit = todayMade - todaySpent;

  // Week calculations (last 7 calendar days)
  const getPastDays = (numDays: number) => {
    const list: string[] = [];
    const base = new Date(todayStr + 'T00:00:00');
    for (let i = 0; i < numDays; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      list.push(`${y}-${m}-${day}`);
    }
    return list;
  };

  const weekDayStrings = getPastDays(7);
  const weekTransactions = transactions.filter((t) => weekDayStrings.includes(t.date));
  const weekMade = weekTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const weekSpent = weekTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const weekProfit = weekMade - weekSpent;
  const weekPerDay = Math.round(weekProfit / 7);
  const weekKeptPercent = weekMade > 0 ? Math.round((weekProfit / weekMade) * 100) : 0;

  // Compute daily summaries for the past 7 days (Monday - Sunday order)
  const weekDailySummaries = weekDayStrings.map((dateStr) => {
    const dayTx = transactions.filter((t) => t.date === dateStr);
    const made = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const spent = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const profit = made - spent;
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const isToday = dateStr === todayStr;
    const label = isToday
      ? 'Today'
      : `${dayName} ${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    return { date: dateStr, dayName, label, made, spent, profit, isToday };
  });

  const bestDayInWeek = Math.max(...weekDailySummaries.map((d) => d.profit), 0);

  // Month calculations (last 30 calendar days)
  const monthDayStrings = getPastDays(30);
  const monthTransactions = transactions.filter((t) => monthDayStrings.includes(t.date));
  const monthMade = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthSpent = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthProfit = monthMade - monthSpent;
  const monthPerDay = Math.round(monthProfit / 30);
  const monthKeptPercent = monthMade > 0 ? Math.round((monthProfit / monthMade) * 100) : 0;

  const monthDailySummaries = monthDayStrings.map((dateStr) => {
    const dayTx = transactions.filter((t) => t.date === dateStr);
    const made = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const spent = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const profit = made - spent;
    const dateObj = new Date(dateStr + 'T00:00:00');
    const isToday = dateStr === todayStr;
    const label = isToday
      ? 'Today'
      : `${dateObj.toLocaleDateString('en-US', { weekday: 'short' })} ${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    return { date: dateStr, label, made, spent, profit, isToday, dayNum: dateObj.getDate() };
  });

  const bestDayInMonth = Math.max(...monthDailySummaries.map((d) => d.profit), 0);

  // Action: Smart AI text message handler (Add, Edit, Update, or Delete)
  const handleAddNaturalMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalText.trim()) return;

    const result = processSmartInput(naturalText, transactions);

    if (result.action === 'delete') {
      setTransactions((prev) => prev.filter((t) => t.id !== result.targetId));
      setFeedbackMessage({ text: result.message, type: 'delete' });
      setNaturalText('');
      return;
    }

    if (result.action === 'update') {
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.id === result.targetId) {
            const updated = { ...t, ...result.updatedFields };
            if (result.updatedFields.date) {
              updated.day = getDayOfWeek(result.updatedFields.date);
            }
            return updated;
          }
          return t;
        })
      );
      setFeedbackMessage({ text: result.message, type: 'success' });
      setNaturalText('');
      return;
    }

    if (result.action === 'add') {
      if (result.items.length === 0) {
        setFeedbackMessage({ text: result.message, type: 'info' });
        return;
      }

      const now = new Date();
      const formattedTime = getCurrentTime();
      const dayName = getDayOfWeek(todayStr);

      const newEntries: Transaction[] = result.items.map((item, idx) => ({
        id: `${Date.now()}-${idx}`,
        type: item.type,
        amount: item.amount,
        note: item.note,
        date: todayStr,
        time: formattedTime,
        day: dayName,
        timestamp: now.toISOString(),
      }));

      setTransactions((prev) => [...newEntries, ...prev]);
      setFeedbackMessage({ text: result.message, type: 'success' });
      setNaturalText('');
    }
  };

  // Action: Add simple income or expense
  const handleAddQuickEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickAmount);
    if (isNaN(amt) || amt <= 0 || !quickAddType) return;

    const chosenDate = quickDate.trim() || todayStr;
    const formattedTime = formatTime24to12(quickTime);
    const dayName = getDayOfWeek(chosenDate);
    const isoTimestamp = new Date(
      `${chosenDate}T${quickTime ? (quickTime.length === 5 ? quickTime + ':00' : quickTime) : '12:00:00'}`
    ).toISOString();

    const newTx: Transaction = {
      id: Date.now().toString(),
      type: quickAddType,
      amount: amt,
      note: quickNote.trim() || (quickAddType === 'income' ? 'Income' : 'Expense'),
      date: chosenDate,
      time: formattedTime,
      day: dayName,
      timestamp: isNaN(new Date(isoTimestamp).getTime()) ? new Date().toISOString() : isoTimestamp,
    };

    setTransactions([newTx, ...transactions]);
    setQuickAmount('');
    setQuickNote('');
    setQuickAddType(null);
  };

  // Action: Delete transaction
  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setFeedbackMessage({
      text: `Deleted: ${target.type === 'income' ? '+$' : '-$'}${target.amount} (${target.note})`,
      type: 'delete',
    });
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  // Action: Handle File Upload for Screenshot Scanning
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setScannedPreviewUrl(previewUrl);
    setIsScanning(true);
    setScanProgress(10);
    setIsScanningModalOpen(true);

    try {
      const result = await scanScreenshot(file, (p) => setScanProgress(p));
      setScannedItems(result.items);
    } catch (err) {
      console.error(err);
      alert('Could not scan the image. Please try a clearer screenshot.');
    } finally {
      setIsScanning(false);
    }
  };

  // Action: Confirm Scanned Items
  const handleConfirmScannedItems = () => {
    if (scannedItems.length === 0) return;

    const now = new Date();
    const formattedTime = getCurrentTime();
    const dayName = getDayOfWeek(todayStr);

    const newTxList: Transaction[] = scannedItems.map((item, idx) => ({
      id: `scan-${Date.now()}-${idx}`,
      type: item.type,
      amount: item.amount,
      note: item.note,
      date: todayStr,
      time: formattedTime,
      day: dayName,
      timestamp: now.toISOString(),
    }));

    setTransactions([...newTxList, ...transactions]);
    setIsScanningModalOpen(false);
    setScannedItems([]);
    setScannedPreviewUrl(null);
  };

  // Action: Deposit to Goal
  const handleDepositToGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setGoal((prev) => ({
      ...prev,
      saved: Math.min(prev.target, prev.saved + amt),
    }));
    setDepositAmount('');
    setIsDepositingGoal(false);
  };

  // Action: Edit Goal
  const handleSaveGoalEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const tgt = parseFloat(goalTargetInput);
    if (isNaN(tgt) || tgt <= 0) return;

    setGoal((prev) => ({
      ...prev,
      name: goalNameInput.trim() || 'My Goal',
      target: tgt,
    }));
    setIsEditingGoal(false);
  };

  // Format currency: e.g. $185 or +$129 or -$56
  const formatAmt = (num: number, signed = false) => {
    const abs = Math.abs(Math.round(num)).toLocaleString();
    if (signed) {
      return num >= 0 ? `+$${abs}` : `-$${abs}`;
    }
    return `$${abs}`;
  };

  const todayDateObj = new Date(todayStr + 'T00:00:00');
  const todayFormatted = todayDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const goalPercent = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

  // Split bar calculation for Today
  const totalVolume = todayMade + todaySpent;
  const greenBarPercent = totalVolume > 0 ? Math.round((todayMade / totalVolume) * 100) : 100;
  const redBarPercent = 100 - greenBarPercent;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#f0f4f8] text-[#1e293b]'} font-sans pb-28 antialiased selection:bg-teal-500/20`}>
      {/* Hidden file input for screenshot scan */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleScreenshotUpload}
        className="hidden"
      />

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {/* Top Header with Theme Switcher */}
        <div className="flex items-start justify-between pt-2 pb-1">
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none">
              {activeTab === 'today' && 'Today'}
              {activeTab === 'week' && 'This week'}
              {activeTab === 'month' && 'This month'}
              {activeTab === 'goal' && 'Savings Goal'}
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === 'today' && todayFormatted}
              {activeTab === 'week' && 'Last 7 days'}
              {activeTab === 'month' && 'Last 30 days'}
              {activeTab === 'goal' && 'Save money towards what matters'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Install on Phone button */}
            <button
              onClick={() => setIsPhoneModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-teal-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Install on your phone"
            >
              <Smartphone size={14} />
              <span>Phone</span>
            </button>

            {/* Data & Backup button */}
            <button
              onClick={() => setIsDataModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-teal-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Save, Backup & Manage Data"
            >
              <Database size={14} />
              <span>Save & Backup</span>
            </button>

            {/* Bright Mode / Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition shadow-sm ${
                isDarkMode
                  ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle Bright / Dark mode"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isDarkMode ? 'Bright' : 'Dark'}</span>
            </button>
          </div>
        </div>

        {/* Offline Status Badge */}
        {!isOnline && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/10 border border-amber-500/25 text-amber-500 dark:text-amber-400 rounded-full text-[11px] font-bold text-center">
            <WifiOff size={13} />
            <span>Offline Mode — All entries are saved locally on your phone</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: TODAY VIEW (Matches Screenshot 1) */}
        {/* ============================================================ */}
        {activeTab === 'today' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Big Hero Card: Profit so far */}
            <div className={`p-6 rounded-[28px] border shadow-sm ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Profit so far
              </span>

              <div className="text-5xl font-black text-[#0d9488] dark:text-[#2dd4bf] tracking-tight mb-4">
                {formatAmt(todayProfit, true)}
              </div>

              {/* Green / Red Ratio Bar */}
              <div className="w-full h-3 rounded-full flex overflow-hidden mb-3.5 bg-slate-100 dark:bg-slate-800">
                <div
                  className="bg-[#0d9488] dark:bg-[#14b8a6] h-full transition-all duration-300"
                  style={{ width: `${greenBarPercent}%` }}
                />
                <div
                  className="bg-[#e11d48] dark:bg-[#f43f5e] h-full transition-all duration-300"
                  style={{ width: `${redBarPercent}%` }}
                />
              </div>

              {/* Made & Spent values */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Made</span>
                  <span className="text-xl font-black text-[#0d9488] dark:text-[#2dd4bf]">
                    {formatAmt(todayMade)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Spent</span>
                  <span className="text-xl font-black text-[#e11d48] dark:text-[#f43f5e]">
                    {formatAmt(todaySpent)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Add Income, Add Expense, Scan Screenshot */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => openQuickAdd('income')}
                  className="py-3 px-4 rounded-2xl font-bold text-sm text-white bg-[#0d9488] hover:bg-[#0f766e] transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus size={16} className="stroke-[3]" />
                  <span>Add income</span>
                </button>

                <button
                  onClick={() => openQuickAdd('expense')}
                  className="py-3 px-4 rounded-2xl font-bold text-sm text-white bg-[#e11d48] hover:bg-[#be123c] transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Minus size={16} className="stroke-[3]" />
                  <span>Add expense</span>
                </button>
              </div>

              {/* Scan Screenshot button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs border transition flex items-center justify-center gap-2 active:scale-95 shadow-sm ${
                  isDarkMode
                    ? 'bg-slate-800/90 text-teal-300 border-teal-500/30 hover:bg-slate-800'
                    : 'bg-white text-teal-700 border-teal-500/30 hover:bg-teal-50/50'
                }`}
              >
                <Camera size={15} />
                <span>Scan Screenshot / Receipt</span>
              </button>
            </div>

            {/* "Just tell me what happened" Card */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-3 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <div>
                <h3 className="font-extrabold text-base leading-snug">
                  Just tell me what happened
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Type it like a text message. I'll sort it into income and expenses.
                </p>
              </div>

              <form onSubmit={handleAddNaturalMessage} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Type naturally: 'i spent 30$', 'that 30 was for food', 'change 30 to 45', or 'delete that 30'"
                    value={naturalText}
                    onChange={(e) => setNaturalText(e.target.value)}
                    className={`w-full p-3.5 rounded-2xl text-xs sm:text-sm font-medium border resize-none focus:outline-none transition ${
                      isDarkMode
                        ? 'bg-[#0b0f19] border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-teal-500'
                        : 'bg-[#f8fafc] border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-teal-500'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!naturalText.trim()}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-[#131c2e] dark:bg-[#1e293b] hover:bg-[#1f2d4a] transition shadow-md disabled:opacity-40 active:scale-98"
                >
                  Send to Assistant
                </button>
              </form>

              {/* Feedback toast / smart AI response */}
              {feedbackMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 ${
                    feedbackMessage.type === 'delete'
                      ? 'bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400'
                      : feedbackMessage.type === 'success'
                      ? 'bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400'
                      : 'bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <span className="flex-1">✨ {feedbackMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setFeedbackMessage(null)}
                    className="p-1 rounded-md opacity-60 hover:opacity-100 ml-2"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                Everything stays on this page. No bank login needed.
              </p>
            </div>

            {/* "Activity" List with Day, Time, and Date tracking */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-3.5 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base">Activity</h3>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
                    <button
                      onClick={() => setActivityFilter('today')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        activityFilter === 'today'
                          ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Today ({todayTransactions.length})
                    </button>
                    <button
                      onClick={() => setActivityFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        activityFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      All Records ({transactions.length})
                    </button>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {(activityFilter === 'today' ? todayTransactions : transactions).length} items
                </span>
              </div>

              {(activityFilter === 'today' ? todayTransactions : transactions).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  {activityFilter === 'today'
                    ? 'No activity logged yet today.'
                    : 'No transactions recorded yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {(activityFilter === 'today' ? todayTransactions : transactions).map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between first:pt-1 last:pb-1 group"
                      >
                        <div
                          onClick={() => handleOpenEditModal(tx)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                        >
                          {/* Round Square Icon */}
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isIncome
                                ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '–'}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-sm block leading-tight truncate">
                              {tx.note}
                            </span>
                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                {tx.day || getDayOfWeek(tx.date)}
                              </span>
                              <span>•</span>
                              <span>🕒 {tx.time || getCurrentTime()}</span>
                              <span>•</span>
                              <span>📅 {tx.date === todayStr ? 'Today' : getFullFormattedDate(tx.date)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span
                            className={`font-black text-sm sm:text-base mr-0.5 ${
                              isIncome
                                ? 'text-[#0d9488] dark:text-[#2dd4bf]'
                                : 'text-[#e11d48] dark:text-[#f43f5e]'
                            }`}
                          >
                            {isIncome ? `+$${tx.amount}` : `-$${tx.amount}`}
                          </span>

                          {/* Edit button */}
                          <button
                            onClick={() => handleOpenEditModal(tx)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-90"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition active:scale-90"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: THIS WEEK VIEW (Matches Screenshot 2) */}
        {/* ============================================================ */}
        {activeTab === 'week' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Big Hero Card */}
            <div className={`p-6 rounded-[28px] border shadow-sm ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Total profit
              </span>

              <div className="text-5xl font-black text-[#0d9488] dark:text-[#2dd4bf] tracking-tight mb-4">
                {formatAmt(weekProfit, true)}
              </div>

              <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Made</span>
                  <span className="text-xl font-black text-[#0d9488] dark:text-[#2dd4bf]">
                    {formatAmt(weekMade)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Spent</span>
                  <span className="text-xl font-black text-[#e11d48] dark:text-[#f43f5e]">
                    {formatAmt(weekSpent)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Mini Stat Pills */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className={`p-3.5 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60 shadow-sm'
              }`}>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Per day</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {formatAmt(weekPerDay, true)}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60 shadow-sm'
              }`}>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Best day</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  +{formatAmt(bestDayInWeek)}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60 shadow-sm'
              }`}>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Kept</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {weekKeptPercent}%
                </span>
              </div>
            </div>

            {/* Profit by day - Clean Bar Chart */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <h3 className="font-extrabold text-base">Profit by day</h3>

              {/* 7-Day Bar Chart: green up, red down */}
              <div className="h-44 flex items-center justify-between gap-2 pt-2 pb-6 relative">
                {/* Center Baseline line */}
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-200 dark:bg-slate-700 pointer-events-none" />

                {weekDailySummaries.slice().reverse().map((d) => {
                  const maxAbs = Math.max(...weekDailySummaries.map((x) => Math.abs(x.profit)), 100);
                  const heightPct = Math.min(85, Math.max(12, Math.round((Math.abs(d.profit) / maxAbs) * 85)));
                  const isPositive = d.profit >= 0;

                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center h-full justify-center relative">
                      {/* Bar above baseline (Positive) */}
                      <div className="h-1/2 w-full flex items-end justify-center pb-[1px]">
                        {isPositive && (
                          <div
                            className="w-full max-w-[26px] bg-[#0d9488] dark:bg-[#14b8a6] rounded-t-md transition-all duration-300"
                            style={{ height: `${heightPct}%` }}
                            title={`${d.label}: +$${d.profit}`}
                          />
                        )}
                      </div>

                      {/* Bar below baseline (Negative) */}
                      <div className="h-1/2 w-full flex items-start justify-center pt-[1px]">
                        {!isPositive && (
                          <div
                            className="w-full max-w-[26px] bg-[#e11d48] dark:bg-[#f43f5e] rounded-b-md transition-all duration-300"
                            style={{ height: `${heightPct}%` }}
                            title={`${d.label}: -$${Math.abs(d.profit)}`}
                          />
                        )}
                      </div>

                      {/* Day Label at bottom */}
                      <span className="absolute -bottom-5 text-[11px] font-semibold text-slate-400">
                        {d.dayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day by day List */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-3.5 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <h3 className="font-extrabold text-base">Day by day</h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {weekDailySummaries.map((d) => {
                  const dayTx = transactions.filter((t) => t.date === d.date);
                  const isExpanded = expandedDate === d.date;
                  return (
                    <div key={d.date} className="py-3 first:pt-1 last:pb-1">
                      <div
                        onClick={() => setExpandedDate(isExpanded ? null : d.date)}
                        className="flex items-center justify-between cursor-pointer select-none group"
                      >
                        <div>
                          <span className="font-bold text-sm block leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                            {d.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            Made ${d.made} • Spent ${d.spent} ({dayTx.length} items)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm sm:text-base ${
                              d.profit >= 0 ? 'text-[#0d9488] dark:text-[#2dd4bf]' : 'text-[#e11d48] dark:text-[#f43f5e]'
                            }`}
                          >
                            {formatAmt(d.profit, true)}
                          </span>
                          {dayTx.length > 0 && (
                            <span className="text-slate-400">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable list of transactions for this day */}
                      {isExpanded && dayTx.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                          {dayTx.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    tx.type === 'income' ? 'bg-[#0d9488]' : 'bg-[#e11d48]'
                                  }`}
                                />
                                <span className="font-semibold truncate">{tx.note}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">🕒 {tx.time || '12:00 PM'}</span>
                              </div>
                              <span
                                className={`font-bold shrink-0 ml-2 ${
                                  tx.type === 'income' ? 'text-[#0d9488]' : 'text-[#e11d48]'
                                }`}
                              >
                                {tx.type === 'income' ? `+$${tx.amount}` : `-$${tx.amount}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: THIS MONTH VIEW (Matches Screenshot 3) */}
        {/* ============================================================ */}
        {activeTab === 'month' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Big Hero Card */}
            <div className={`p-6 rounded-[28px] border shadow-sm ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Total profit
              </span>

              <div className="text-5xl font-black text-[#0d9488] dark:text-[#2dd4bf] tracking-tight mb-4">
                {formatAmt(monthProfit, true)}
              </div>

              <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Made</span>
                  <span className="text-xl font-black text-[#0d9488] dark:text-[#2dd4bf]">
                    {formatAmt(monthMade)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Spent</span>
                  <span className="text-xl font-black text-[#e11d48] dark:text-[#f43f5e]">
                    {formatAmt(monthSpent)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Mini Stat Pills */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className={`p-3.5 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60 shadow-sm'
              }`}>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Per day</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {formatAmt(monthPerDay, true)}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60 shadow-sm'
              }`}>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Best day</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  +{formatAmt(bestDayInMonth)}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border text-center ${
                isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60 shadow-sm'
              }`}>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Kept</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {monthKeptPercent}%
                </span>
              </div>
            </div>

            {/* 30-Day Bar Chart */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <h3 className="font-extrabold text-base">Profit by day</h3>

              <div className="h-44 flex items-center justify-between gap-1 pt-2 pb-6 relative overflow-x-auto">
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-200 dark:bg-slate-700 pointer-events-none" />

                {monthDailySummaries.slice().reverse().map((d) => {
                  const maxAbs = Math.max(...monthDailySummaries.map((x) => Math.abs(x.profit)), 100);
                  const heightPct = Math.min(85, Math.max(10, Math.round((Math.abs(d.profit) / maxAbs) * 85)));
                  const isPositive = d.profit >= 0;

                  return (
                    <div key={d.date} className="flex-1 min-w-[7px] flex flex-col items-center h-full justify-center relative">
                      <div className="h-1/2 w-full flex items-end justify-center pb-[1px]">
                        {isPositive && (
                          <div
                            className="w-full max-w-[8px] bg-[#0d9488] dark:bg-[#14b8a6] rounded-t-sm"
                            style={{ height: `${heightPct}%` }}
                            title={`${d.label}: +$${d.profit}`}
                          />
                        )}
                      </div>

                      <div className="h-1/2 w-full flex items-start justify-center pt-[1px]">
                        {!isPositive && (
                          <div
                            className="w-full max-w-[8px] bg-[#e11d48] dark:bg-[#f43f5e] rounded-b-sm"
                            style={{ height: `${heightPct}%` }}
                            title={`${d.label}: -$${Math.abs(d.profit)}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-semibold px-1">
                <span>30 days ago</span>
                <span>15 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Day by day List */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-3.5 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <h3 className="font-extrabold text-base">Day by day</h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthDailySummaries.slice(0, 15).map((d) => {
                  const dayTx = transactions.filter((t) => t.date === d.date);
                  const isExpanded = expandedDate === d.date;
                  return (
                    <div key={d.date} className="py-3 first:pt-1 last:pb-1">
                      <div
                        onClick={() => setExpandedDate(isExpanded ? null : d.date)}
                        className="flex items-center justify-between cursor-pointer select-none group"
                      >
                        <div>
                          <span className="font-bold text-sm block leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                            {d.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            Made ${d.made} • Spent ${d.spent} ({dayTx.length} items)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm sm:text-base ${
                              d.profit >= 0 ? 'text-[#0d9488] dark:text-[#2dd4bf]' : 'text-[#e11d48] dark:text-[#f43f5e]'
                            }`}
                          >
                            {formatAmt(d.profit, true)}
                          </span>
                          {dayTx.length > 0 && (
                            <span className="text-slate-400">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable list of transactions for this day */}
                      {isExpanded && dayTx.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                          {dayTx.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    tx.type === 'income' ? 'bg-[#0d9488]' : 'bg-[#e11d48]'
                                  }`}
                                />
                                <span className="font-semibold truncate">{tx.note}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">🕒 {tx.time || '12:00 PM'}</span>
                              </div>
                              <span
                                className={`font-bold shrink-0 ml-2 ${
                                  tx.type === 'income' ? 'text-[#0d9488]' : 'text-[#e11d48]'
                                }`}
                              >
                                {tx.type === 'income' ? `+$${tx.amount}` : `-$${tx.amount}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: SAVINGS GOAL VIEW */}
        {/* ============================================================ */}
        {activeTab === 'goal' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Goal Card */}
            <div className={`p-6 rounded-[28px] border shadow-sm space-y-4 ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800/80' : 'bg-white border-slate-200/60'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-0.5">My Savings Goal</span>
                  <h2 className="text-2xl font-black">{goal.name}</h2>
                </div>

                <button
                  onClick={() => {
                    setGoalNameInput(goal.name);
                    setGoalTargetInput(String(goal.target));
                    setIsEditingGoal(!isEditingGoal);
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition"
                  title="Edit Goal"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              {/* Edit Goal Drawer */}
              {isEditingGoal && (
                <form onSubmit={handleSaveGoalEdit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Goal Name</label>
                    <input
                      type="text"
                      value={goalNameInput}
                      onChange={(e) => setGoalNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Target Amount ($)</label>
                    <input
                      type="number"
                      step="1"
                      value={goalTargetInput}
                      onChange={(e) => setGoalTargetInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0d9488] text-white"
                    >
                      Save Goal
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGoal(false)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Progress Numbers & Bar */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-black text-[#0d9488] dark:text-[#2dd4bf]">
                    ${goal.saved.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-slate-400">
                    of ${goal.target.toLocaleString()} ({goalPercent}%)
                  </span>
                </div>

                <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-[#0d9488] rounded-full transition-all duration-500"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  ${Math.max(0, goal.target - goal.saved).toLocaleString()} left to reach your goal.
                </p>
              </div>

              {/* Deposit Action */}
              {!isDepositingGoal ? (
                <button
                  onClick={() => setIsDepositingGoal(true)}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-[#0d9488] hover:bg-[#0f766e] transition shadow-sm active:scale-98 flex items-center justify-center gap-2"
                >
                  <Plus size={16} className="stroke-[3]" />
                  <span>Deposit towards goal</span>
                </button>
              ) : (
                <form onSubmit={handleDepositToGoal} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    How much would you like to put in?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      autoFocus
                      required
                      placeholder="$ Amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl font-bold text-xs bg-[#0d9488] text-white"
                    >
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDepositingGoal(false)}
                      className="px-3 py-2 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-800"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* EDIT TRANSACTION MODAL */}
      {/* ============================================================ */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-[28px] p-6 border shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Edit2 size={18} className="text-[#0d9488]" />
                <span>Edit Transaction</span>
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransactionEdit} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditType('income')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    editType === 'income'
                      ? 'bg-[#0d9488] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('expense')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    editType === 'expense'
                      ? 'bg-[#e11d48] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Minus size={14} className="stroke-[3]" />
                  <span>Expense</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-3xl font-black border focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  What was it for?
                </label>
                <input
                  type="text"
                  required
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-medium border focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Date & Time fields */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Calendar size={11} className="text-[#0d9488]" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Clock size={11} className="text-[#0d9488]" />
                      <span>Time</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Day of week pill */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
                  <span>🗓️ Day: <strong className="text-teal-600 dark:text-teal-400">{getDayOfWeek(editDate)}</strong></span>
                  <span>🕒 {formatTime24to12(editTime)}</span>
                </div>
              </div>

              {/* Save & Delete Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={!editAmount || parseFloat(editAmount) <= 0}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-[#0d9488] hover:bg-[#0f766e] transition shadow-md disabled:opacity-40 active:scale-98"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTransaction(editingTransaction.id)}
                  className="w-full py-2.5 rounded-2xl font-bold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Delete this transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUICK ADD MODAL (+ Add income or - Add expense) */}
      {/* ============================================================ */}
      {quickAddType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-[28px] p-6 border shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${quickAddType === 'income' ? 'bg-[#0d9488]' : 'bg-[#e11d48]'}`} />
                <span>{quickAddType === 'income' ? 'Add Income' : 'Add Expense'}</span>
              </h3>
              <button
                onClick={() => setQuickAddType(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddQuickEntry} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl text-3xl font-black border focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  What was it for?
                </label>
                <input
                  type="text"
                  placeholder={quickAddType === 'income' ? 'e.g. Delivery shift, Wages' : 'e.g. Lunch, Gas, Coffee'}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-medium border focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Exact Date & Time Tracking */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider text-[11px]">When did this happen?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickDate(todayStr)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                        quickDate === todayStr
                          ? 'bg-[#0d9488] text-white border-[#0d9488]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        setQuickDate(y.toISOString().split('T')[0]);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                        quickDate !== todayStr
                          ? 'bg-[#0d9488] text-white border-[#0d9488]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickTime(getCurrentTime24())}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Now
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Calendar size={11} className="text-[#0d9488]" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Clock size={11} className="text-[#0d9488]" />
                      <span>Time</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={quickTime}
                      onChange={(e) => setQuickTime(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#0b0f19] border-slate-800 text-slate-100'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Day of Week & Formatted Date Preview Pill */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold">
                  <span>🗓️ Day: <strong className="text-teal-600 dark:text-teal-400">{getDayOfWeek(quickDate)}</strong></span>
                  <span>🕒 {formatTime24to12(quickTime)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!quickAmount || parseFloat(quickAmount) <= 0}
                className={`w-full py-3 rounded-2xl font-bold text-sm text-white transition shadow-md disabled:opacity-40 active:scale-98 ${
                  quickAddType === 'income'
                    ? 'bg-[#0d9488] hover:bg-[#0f766e]'
                    : 'bg-[#e11d48] hover:bg-[#be123c]'
                }`}
              >
                Save {quickAddType === 'income' ? 'Income' : 'Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SCREENSHOT OCR SCANNING MODAL */}
      {/* ============================================================ */}
      {isScanningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-[28px] p-6 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Camera size={18} className="text-teal-500" />
                <span>Screenshot Scanner</span>
              </h3>
              <button
                onClick={() => {
                  setIsScanningModalOpen(false);
                  setScannedItems([]);
                }}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thumbnail preview if available */}
            {scannedPreviewUrl && (
              <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <img src={scannedPreviewUrl} alt="Screenshot preview" className="h-full object-contain" />
              </div>
            )}

            {isScanning ? (
              <div className="py-6 text-center space-y-3">
                <Loader2 size={32} className="animate-spin text-teal-500 mx-auto" />
                <p className="text-xs font-bold text-slate-500">
                  Scanning image & reading amounts ({scanProgress}%)...
                </p>
              </div>
            ) : scannedItems.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-sm font-bold text-slate-500">No clear amounts found.</p>
                <p className="text-xs text-slate-400">
                  Make sure numbers with dollar signs or words like "Earnings" / "Total" are clearly visible.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Found in screenshot:
                </div>

                <div className="space-y-2">
                  {scannedItems.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl border flex items-center justify-between text-xs font-bold bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.type === 'income' ? 'bg-[#0d9488]' : 'bg-[#e11d48]'}`} />
                        <span>{item.note}</span>
                      </div>
                      <span className={item.type === 'income' ? 'text-[#0d9488]' : 'text-[#e11d48]'}>
                        {item.type === 'income' ? `+$${item.amount}` : `-$${item.amount}`}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConfirmScannedItems}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-[#0d9488] hover:bg-[#0f766e] transition shadow-md active:scale-98 flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>Confirm & Add to Today</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INSTALL ON PHONE MODAL */}
      {/* ============================================================ */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-[28px] p-6 border shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Smartphone size={18} className="text-[#0d9488]" />
                <span>Install on Your Phone</span>
              </h3>
              <button
                onClick={() => setIsPhoneModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=http://192.168.2.167:5173/`}
                alt="Scan to open on phone"
                className="w-40 h-40 rounded-xl"
              />
              <span className="text-[11px] font-bold text-slate-500 mt-2">
                Scan with your phone's camera
              </span>
            </div>

            {/* Direct Link */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Wi-Fi Network Address
              </span>
              <div className="flex items-center gap-2 p-2 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <code className="text-xs font-bold text-teal-600 dark:text-teal-400 truncate flex-1">
                  http://192.168.2.167:5173/
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('http://192.168.2.167:5173/');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#0d9488] text-white hover:bg-[#0f766e] transition"
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                (Make sure your phone is connected to the same Wi-Fi)
              </p>
            </div>

            {/* 2-Step Install Guide */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  🍏 iPhone (Safari):
                </span>
                <ol className="list-decimal list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                  <li>Open the link in <strong>Safari</strong></li>
                  <li>Tap the <strong>Share</strong> button (box with arrow ↑)</li>
                  <li>Tap <strong>"Add to Home Screen"</strong></li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  🤖 Android (Chrome):
                </span>
                <ol className="list-decimal list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                  <li>Open the link in <strong>Chrome</strong></li>
                  <li>Tap the <strong>three dots (⋮)</strong> top right</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DATA MANAGEMENT & BACKUP MODAL */}
      {/* ============================================================ */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-[28px] p-6 border shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#141d2e] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Hidden file input for backup restore */}
            <input
              type="file"
              ref={backupFileInputRef}
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />

            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Database size={18} className="text-[#0d9488]" />
                <span>Save, Backup & Data</span>
              </h3>
              <button
                onClick={() => setIsDataModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Storage Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Saved Transactions:</span>
                <span className="text-teal-600 dark:text-teal-400">{transactions.length} records</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Goal Saved:</span>
                <span className="text-slate-800 dark:text-slate-200">${goal.saved} of ${goal.target}</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                All data is saved in real-time directly on your phone's storage.
              </p>
            </div>

            {/* Export & Backup actions */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Export / Download
              </span>

              <button
                onClick={handleExportJSON}
                className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 transition active:scale-98 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Download size={14} className="text-teal-500" />
                <span>Download Full Backup (JSON)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 transition active:scale-98 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet size={14} className="text-teal-500" />
                <span>Export to Spreadsheet (CSV)</span>
              </button>
            </div>

            {/* Restore / Import */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Restore
              </span>

              <button
                onClick={() => backupFileInputRef.current?.click()}
                className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 transition active:scale-98 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Upload size={14} className="text-indigo-400" />
                <span>Restore from Backup File (.json)</span>
              </button>
            </div>

            {/* Reset Option */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleClearAllData}
                className="w-full py-2.5 px-3 rounded-2xl font-bold text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-500/20 transition active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Reset Everything to $0</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BOTTOM NAVIGATION BAR (Matches Screenshots) */}
      {/* ============================================================ */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t ${
        isDarkMode
          ? 'bg-[#141d2e]/95 border-slate-800/80 backdrop-blur-md'
          : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        <div className="max-w-md mx-auto px-6 h-18 flex items-center justify-between">
          {/* Today Button */}
          <button
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'today'
                ? isDarkMode ? 'text-teal-400 bg-slate-800' : 'text-[#0d9488] bg-teal-50'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Sun size={20} className={activeTab === 'today' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[11px] font-bold mt-1">Today</span>
          </button>

          {/* Week Button */}
          <button
            onClick={() => setActiveTab('week')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'week'
                ? isDarkMode ? 'text-teal-400 bg-slate-800' : 'text-[#0d9488] bg-teal-50'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={20} className={activeTab === 'week' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[11px] font-bold mt-1">Week</span>
          </button>

          {/* Month Button */}
          <button
            onClick={() => setActiveTab('month')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'month'
                ? isDarkMode ? 'text-teal-400 bg-slate-800' : 'text-[#0d9488] bg-teal-50'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 size={20} className={activeTab === 'month' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[11px] font-bold mt-1">Month</span>
          </button>

          {/* Goal Button */}
          <button
            onClick={() => setActiveTab('goal')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'goal'
                ? isDarkMode ? 'text-teal-400 bg-slate-800' : 'text-[#0d9488] bg-teal-50'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Target size={20} className={activeTab === 'goal' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            <span className="text-[11px] font-bold mt-1">Goal</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
