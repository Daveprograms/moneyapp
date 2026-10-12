import type { Transaction } from '../types/finance';
import { getToday, getDayOfWeek } from './simpleDates';

export function getInitialDemoTransactions(): Transaction[] {
  const todayStr = getToday();
  const today = new Date(todayStr + 'T00:00:00');

  const shiftDay = (daysDelta: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysDelta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const createItem = (
    id: string,
    type: 'income' | 'expense',
    amount: number,
    note: string,
    date: string,
    time: string
  ): Transaction => ({
    id,
    type,
    amount,
    note,
    date,
    time,
    day: getDayOfWeek(date),
    timestamp: new Date(`${date}T12:00:00`).toISOString(),
  });

  return [
    // Today (Sunday) -> Made $185, Spent $56 -> +$129
    createItem('t1', 'expense', 14, 'Lunch', todayStr, '12:30 PM'),
    createItem('t2', 'expense', 42, 'Gas', todayStr, '11:15 AM'),
    createItem('t3', 'income', 185, 'Delivery shift', todayStr, '09:00 AM'),

    // Yesterday (Saturday) -> Made $95, Spent $151 -> -$56
    createItem('t4', 'income', 95, 'Weekend shift', shiftDay(-1), '02:00 PM'),
    createItem('t5', 'expense', 151, 'Groceries & supplies', shiftDay(-1), '04:30 PM'),

    // Friday -> Made $114, Spent $156 -> -$42
    createItem('t6', 'income', 114, 'Food courier delivery', shiftDay(-2), '06:00 PM'),
    createItem('t7', 'expense', 156, 'Phone bill & dinner', shiftDay(-2), '07:30 PM'),

    // Thursday -> Made $180, Spent $90 -> +$90
    createItem('t8', 'income', 180, 'Client consulting', shiftDay(-3), '01:00 PM'),
    createItem('t9', 'expense', 90, 'Gas & car wash', shiftDay(-3), '03:15 PM'),

    // Wednesday -> Made $210, Spent $85 -> +$125
    createItem('t10', 'income', 210, 'Full day shift', shiftDay(-4), '05:00 PM'),
    createItem('t11', 'expense', 85, 'Parts & supplies', shiftDay(-4), '02:00 PM'),

    // Tuesday -> Made $265, Spent $42 -> +$223 (Best day)
    createItem('t12', 'income', 265, 'Peak hours delivery', shiftDay(-5), '08:00 PM'),
    createItem('t13', 'expense', 42, 'Fuel', shiftDay(-5), '10:00 AM'),

    // Monday -> Made $65, Spent $88 -> -$23
    createItem('t14', 'income', 65, 'Morning run', shiftDay(-6), '11:00 AM'),
    createItem('t15', 'expense', 88, 'Weekly tools & coffee', shiftDay(-6), '09:00 AM'),

    // Older days for Month view (20 more days)
    createItem('t16', 'income', 195, 'Contract earnings', shiftDay(-7), '05:00 PM'),
    createItem('t17', 'expense', 65, 'Groceries', shiftDay(-7), '06:00 PM'),
    createItem('t18', 'income', 220, 'Delivery shift', shiftDay(-8), '04:00 PM'),
    createItem('t19', 'expense', 110, 'Utilities', shiftDay(-8), '01:00 PM'),
    createItem('t20', 'income', 175, 'Deliveries', shiftDay(-9), '06:00 PM'),
    createItem('t21', 'expense', 50, 'Gas', shiftDay(-9), '08:00 AM'),
    createItem('t22', 'income', 140, 'Freelance work', shiftDay(-10), '02:00 PM'),
    createItem('t23', 'expense', 180, 'Car maintenance', shiftDay(-10), '11:00 AM'),
    createItem('t24', 'income', 240, 'Full shift', shiftDay(-11), '07:00 PM'),
    createItem('t25', 'expense', 45, 'Meals', shiftDay(-11), '01:00 PM'),
    createItem('t26', 'income', 160, 'Online sales', shiftDay(-12), '03:00 PM'),
    createItem('t27', 'expense', 35, 'Subscriptions', shiftDay(-12), '09:00 AM'),
    createItem('t28', 'income', 280, 'Weekend bonus', shiftDay(-13), '08:00 PM'),
    createItem('t29', 'expense', 75, 'Dining out', shiftDay(-13), '07:00 PM'),
    createItem('t30', 'income', 130, 'Courier shift', shiftDay(-14), '04:00 PM'),
    createItem('t31', 'expense', 190, 'Insurance installment', shiftDay(-14), '10:00 AM'),
  ];
}
