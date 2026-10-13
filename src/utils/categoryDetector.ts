export interface CategorySummary {
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface QuickTag {
  label: string;
  icon: string;
  type: 'income' | 'expense';
}

export const COMMON_EXPENSE_TAGS: QuickTag[] = [
  { label: 'Gas', icon: '⛽', type: 'expense' },
  { label: 'Food', icon: '🍔', type: 'expense' },
  { label: 'Groceries', icon: '🛒', type: 'expense' },
  { label: 'Coffee', icon: '☕', type: 'expense' },
  { label: 'Parking', icon: '🅿️', type: 'expense' },
  { label: 'Phone Bill', icon: '📱', type: 'expense' },
  { label: 'Car Repair', icon: '🔧', type: 'expense' },
];

export const COMMON_INCOME_TAGS: QuickTag[] = [
  { label: 'Delivery Shift', icon: '🚗', type: 'income' },
  { label: 'Wages', icon: '💼', type: 'income' },
  { label: 'Tips', icon: '💵', type: 'income' },
  { label: 'Courier', icon: '📦', type: 'income' },
  { label: 'Client Work', icon: '💻', type: 'income' },
  { label: 'Online Sale', icon: '📈', type: 'income' },
];

export function detectExpenseCategory(note: string): { name: string; icon: string; color: string } {
  const lower = note.toLowerCase();

  if (/\b(gas|fuel|diesel|petrol|shell|esso|chevron|mobil|petro)\b/i.test(lower)) {
    return { name: 'Fuel & Gas', icon: '⛽', color: '#f59e0b' }; // amber
  }
  if (/\b(food|lunch|dinner|breakfast|burger|pizza|mcdonald|subway|tacos|restaurant|snack|dining)\b/i.test(lower)) {
    return { name: 'Food & Dining', icon: '🍔', color: '#f43f5e' }; // rose
  }
  if (/\b(grocer|groceries|supermarket|walmart|costco|market|food basics|no frills|loblaws)\b/i.test(lower)) {
    return { name: 'Groceries', icon: '🛒', color: '#10b981' }; // emerald
  }
  if (/\b(coffee|starbucks|tim\s*hortons|latte|espresso|cafe|tea|drink)\b/i.test(lower)) {
    return { name: 'Coffee & Drinks', icon: '☕', color: '#8b5cf6' }; // violet
  }
  if (/\b(parking|toll|meter|uber|lyft|transit|bus|train|subway)\b/i.test(lower)) {
    return { name: 'Transit & Parking', icon: '🅿️', color: '#06b6d4' }; // cyan
  }
  if (/\b(phone|bill|rent|utility|utilities|wifi|internet|insurance|electric|water|subscription)\b/i.test(lower)) {
    return { name: 'Bills & Utilities', icon: '📱', color: '#3b82f6' }; // blue
  }
  if (/\b(car|repair|mechanic|oil|tire|maintenance|auto|wash)\b/i.test(lower)) {
    return { name: 'Auto & Repair', icon: '🔧', color: '#eab308' }; // yellow
  }

  return { name: 'Other Expenses', icon: '🛍️', color: '#94a3b8' }; // slate
}

export function computeCategoryBreakdown(transactions: { type: string; amount: number; note: string }[]): CategorySummary[] {
  const expenseTx = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
  if (totalExpense <= 0) return [];

  const map = new Map<string, { icon: string; color: string; amount: number; count: number }>();

  for (const tx of expenseTx) {
    const cat = detectExpenseCategory(tx.note || '');
    const existing = map.get(cat.name) || { icon: cat.icon, color: cat.color, amount: 0, count: 0 };
    existing.amount += tx.amount;
    existing.count += 1;
    map.set(cat.name, existing);
  }

  const results: CategorySummary[] = [];
  map.forEach((val, key) => {
    results.push({
      name: key,
      icon: val.icon,
      color: val.color,
      amount: Math.round(val.amount),
      percentage: Math.round((val.amount / totalExpense) * 100),
      count: val.count,
    });
  });

  return results.sort((a, b) => b.amount - a.amount);
}
