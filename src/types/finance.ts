export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. 04:45 PM
  day: string; // e.g. Sunday, Monday
  timestamp: string; // ISO string
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
}
