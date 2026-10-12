import type { Transaction } from '../types/finance';

export interface ParsedItem {
  type: 'income' | 'expense';
  amount: number;
  note: string;
}

export type SmartParseAction =
  | {
      action: 'delete';
      targetId: string;
      deletedTx: Transaction;
      message: string;
    }
  | {
      action: 'update';
      targetId: string;
      updatedFields: Partial<Transaction>;
      originalTx: Transaction;
      message: string;
    }
  | {
      action: 'add';
      items: ParsedItem[];
      message: string;
    };

/**
 * Intelligent financial text processor that understands:
 * 1. Adding: "i spent 30$", "made 185 on delivery, spent 42 on gas"
 * 2. Updating: "i spent that 30$ on food", "that 30 was for food", "change that 30 to 40", "that was for lunch"
 * 3. Deleting: "delete that 30$", "remove that 30", "delete last", "undo", "remove gas"
 */
export function processSmartInput(
  rawText: string,
  existingTransactions: Transaction[] = []
): SmartParseAction {
  const text = rawText.trim();
  if (!text) {
    return { action: 'add', items: [], message: 'Empty input.' };
  }

  const cleanNote = (str: string): string => {
    let cleaned = str
      .replace(/\b(was|is|on|for|at|dollars?|bucks?|instead\s+of|actually|that|the|it)\b/gi, ' ')
      .replace(/[.,;!?]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return 'Expense';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  // ============================================================
  // 1. DELETE / REMOVE / UNDO INTENT
  // ============================================================
  const isDeleteIntent = /\b(delete|remove|cancel|undo|erase|drop|scrap)\b/i.test(text);
  if (isDeleteIntent) {
    // Check if an amount is mentioned (e.g. "delete that 30$", "remove 30", "delete the 30$ expense")
    const amountMatch = text.match(/\$?([0-9]+(?:\.[0-9]{1,2})?)/);
    if (amountMatch) {
      const targetAmount = parseFloat(amountMatch[1]);
      const matched = existingTransactions.find(
        (t) => Math.abs(t.amount - targetAmount) < 0.01
      );
      if (matched) {
        return {
          action: 'delete',
          targetId: matched.id,
          deletedTx: matched,
          message: `Deleted: ${matched.type === 'income' ? '+$' : '-$'}${matched.amount} (${matched.note})`,
        };
      }
    }

    // Check if a keyword description is mentioned (e.g. "delete gas", "remove coffee")
    const words = text
      .replace(/\b(delete|remove|cancel|undo|erase|the|that|last|one|transaction|entry)\b/gi, ' ')
      .trim();
    if (words) {
      const matchedByNote = existingTransactions.find((t) =>
        t.note.toLowerCase().includes(words.toLowerCase())
      );
      if (matchedByNote) {
        return {
          action: 'delete',
          targetId: matchedByNote.id,
          deletedTx: matchedByNote,
          message: `Deleted: ${matchedByNote.type === 'income' ? '+$' : '-$'}${matchedByNote.amount} (${matchedByNote.note})`,
        };
      }
    }

    // Default delete: "delete that", "delete last", "undo" -> delete most recent
    if (existingTransactions.length > 0) {
      const lastTx = existingTransactions[0];
      return {
        action: 'delete',
        targetId: lastTx.id,
        deletedTx: lastTx,
        message: `Deleted last entry: ${lastTx.type === 'income' ? '+$' : '-$'}${lastTx.amount} (${lastTx.note})`,
      };
    }

    return {
      action: 'add',
      items: [],
      message: 'No transaction found to delete.',
    };
  }

  // ============================================================
  // 2. EDIT / UPDATE INTENT
  // ============================================================

  // 2A. "change that/the 30 to 45" or "change 30 to 45 on food"
  const changeAmountMatch = text.match(
    /change\s+(?:that|the)?\s*\$?([0-9]+(?:\.[0-9]{1,2})?)\s+(?:to|into)\s+\$?([0-9]+(?:\.[0-9]{1,2})?)(?:\s+(?:on|for)\s+(.+))?/i
  );
  if (changeAmountMatch) {
    const oldAmt = parseFloat(changeAmountMatch[1]);
    const newAmt = parseFloat(changeAmountMatch[2]);
    const optionalNote = changeAmountMatch[3] ? cleanNote(changeAmountMatch[3]) : null;

    const matched = existingTransactions.find((t) => Math.abs(t.amount - oldAmt) < 0.01);
    if (matched) {
      const updatedFields: Partial<Transaction> = { amount: newAmt };
      if (optionalNote) updatedFields.note = optionalNote;
      return {
        action: 'update',
        targetId: matched.id,
        originalTx: matched,
        updatedFields,
        message: `Updated: Changed $${oldAmt} to $${newAmt}${optionalNote ? ` (${optionalNote})` : ''}`,
      };
    }
  }

  // 2B. "i spent that 30$ on food", "that 30$ was on food", "that 30 was for lunch", "the 30 was food"
  // Patterns like: (that|the) <amount> (was on|was for|on|for|was) <note>
  const updateNoteWithAmountMatch = text.match(
    /(?:(?:i\s+)?(?:spent|made|paid|put)\s+that|that|the)\s+\$?([0-9]+(?:\.[0-9]{1,2})?)\$?\s+(?:was\s+)?(?:on|for|at|towards)?\s+(.+)/i
  );
  if (updateNoteWithAmountMatch) {
    const targetAmount = parseFloat(updateNoteWithAmountMatch[1]);
    const rawNote = updateNoteWithAmountMatch[2];
    const newNote = cleanNote(rawNote);

    const matched = existingTransactions.find(
      (t) => Math.abs(t.amount - targetAmount) < 0.01
    );
    if (matched) {
      return {
        action: 'update',
        targetId: matched.id,
        originalTx: matched,
        updatedFields: { note: newNote },
        message: `Updated note on $${targetAmount} to '${newNote}'`,
      };
    } else {
      // If no existing transaction was found with that amount, create it cleanly!
      return {
        action: 'add',
        items: [
          {
            type: 'expense',
            amount: targetAmount,
            note: newNote,
          },
        ],
        message: `Added: -$${targetAmount} (${newNote})`,
      };
    }
  }

  // 2C. "that was for food", "that was on lunch", "it was for dinner", "actually it was groceries"
  const updateLastNoteMatch = text.match(
    /^(?:that|it|the\s+last\s+one|actually\s+that|actually\s+it)\s+(?:was\s+)?(?:on|for|at)?\s+(.+)$/i
  );
  if (updateLastNoteMatch && existingTransactions.length > 0) {
    const newNote = cleanNote(updateLastNoteMatch[1]);
    const lastTx = existingTransactions[0];
    return {
      action: 'update',
      targetId: lastTx.id,
      originalTx: lastTx,
      updatedFields: { note: newNote },
      message: `Updated note on last entry ($${lastTx.amount}) to '${newNote}'`,
    };
  }

  // 2D. "actually it was 40", "make that 45", "actually 45 instead of 30"
  const updateLastAmountMatch = text.match(
    /(?:actually\s+(?:it\s+was|was)|make\s+that)\s+\$?([0-9]+(?:\.[0-9]{1,2})?)/i
  );
  if (updateLastAmountMatch && existingTransactions.length > 0) {
    const newAmount = parseFloat(updateLastAmountMatch[1]);
    const lastTx = existingTransactions[0];
    return {
      action: 'update',
      targetId: lastTx.id,
      originalTx: lastTx,
      updatedFields: { amount: newAmount },
      message: `Updated amount on last entry from $${lastTx.amount} to $${newAmount}`,
    };
  }

  // ============================================================
  // 3. ADD NEW TRANSACTIONS
  // ============================================================
  const addedItems = parseNaturalLanguageInput(text);
  if (addedItems.length > 0) {
    const summary = addedItems
      .map((it) => `${it.type === 'income' ? '+$' : '-$'}${it.amount} (${it.note})`)
      .join(', ');
    return {
      action: 'add',
      items: addedItems,
      message: `Added: ${summary}`,
    };
  }

  return {
    action: 'add',
    items: [],
    message: "Could not understand. Try: 'spent 30 on food', 'that 30 was for lunch', or 'delete that 30'",
  };
}

/**
 * Standard clause-by-clause parser for new entries
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
