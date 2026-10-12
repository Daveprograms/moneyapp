export interface ParsedItem {
  type: 'income' | 'expense';
  amount: number;
  note: string;
}

/**
 * Parses natural language input like:
 * "made 185 on delivery, spent 42 on gas and 14 on lunch"
 * "earned 200 freelancing, bought groceries for 65"
 * "spent 15 at Tim Hortons"
 */
export function parseNaturalLanguageInput(text: string): ParsedItem[] {
  const results: ParsedItem[] = [];
  if (!text || !text.trim()) return results;

  // Split clauses by commas, semicolons, or " and "
  const rawClauses = text
    .split(/[,;]|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let currentContextType: 'income' | 'expense' = 'expense';

  for (const clause of rawClauses) {
    // Check if clause indicates income or expense
    const hasIncomeWord = /\b(made|earned|got|received|income|tipped|sold|payout|paycheck|won)\b/i.test(clause);
    const hasExpenseWord = /\b(spent|paid|bought|cost|expense|fee|ordered|gas|lunch|dinner|breakfast|food|groceries|uber|coffee|rent)\b/i.test(clause);

    if (hasIncomeWord) {
      currentContextType = 'income';
    } else if (hasExpenseWord) {
      currentContextType = 'expense';
    }

    // Extract amount
    const amountMatch = clause.match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    if (!amountMatch) continue;

    const amount = parseFloat(amountMatch[1]);
    if (isNaN(amount) || amount <= 0) continue;

    // Clean note description
    let note = clause
      .replace(/\$?\s*[0-9]+(?:\.[0-9]{1,2})?/, '')
      .replace(/\b(made|earned|got|received|spent|paid|bought|cost|on|for|at|dollars?|bucks?)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!note) {
      note = currentContextType === 'income' ? 'Income' : 'Expense';
    } else {
      // Capitalize first letter
      note = note.charAt(0).toUpperCase() + note.slice(1);
    }

    results.push({
      type: currentContextType,
      amount,
      note,
    });
  }

  return results;
}
