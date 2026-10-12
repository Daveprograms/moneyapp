import { createWorker } from 'tesseract.js';
import type { ParsedItem } from './nlpParser';

export interface ScannedResult {
  rawText: string;
  items: ParsedItem[];
  confidence: number;
}

export async function scanScreenshot(
  imageFile: File | Blob | string,
  onProgress?: (percent: number) => void
): Promise<ScannedResult> {
  const worker = await createWorker('eng');

  if (onProgress) {
    onProgress(30);
  }

  const ret = await worker.recognize(imageFile);
  const text = ret.data.text || '';
  const confidence = ret.data.confidence || 0;

  if (onProgress) {
    onProgress(85);
  }

  await worker.terminate();

  const items = parseTextFromScreenshot(text);

  if (onProgress) {
    onProgress(100);
  }

  return {
    rawText: text,
    items,
    confidence,
  };
}

/**
 * Intelligently parse extracted OCR text to find amounts and whether it was income or expense.
 */
export function parseTextFromScreenshot(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const lowerText = text.toLowerCase();

  // Detect platform or merchant
  let merchant = '';
  if (/uber/i.test(lowerText)) merchant = 'Uber';
  else if (/doordash|dasher/i.test(lowerText)) merchant = 'DoorDash';
  else if (/instacart/i.test(lowerText)) merchant = 'Instacart';
  else if (/skip\s*the\s*dishes/i.test(lowerText)) merchant = 'SkipTheDishes';
  else if (/lyft/i.test(lowerText)) merchant = 'Lyft';
  else if (/amazon/i.test(lowerText)) merchant = 'Amazon';
  else if (/walmart/i.test(lowerText)) merchant = 'Walmart';
  else if (/tim\s*horton/i.test(lowerText)) merchant = 'Tim Hortons';
  else if (/starbucks/i.test(lowerText)) merchant = 'Starbucks';
  else if (/costco/i.test(lowerText)) merchant = 'Costco';
  else if (/loblaws|metro|sobeys/i.test(lowerText)) merchant = 'Groceries';
  else if (/shell|esso|petro/i.test(lowerText)) merchant = 'Gas';

  // Check if screenshot is predominantly income (gig app, payout, e-transfer)
  const isGigOrIncome =
    /earnings|payout|net fare|trip earnings|delivered|interac e-transfer|received|deposit|credit|pay period|gross pay/i.test(
      lowerText
    );

  // Look for prominent lines with dollar amounts
  const amountRegex = /\$?\s*([0-9]{1,4}(?:[.,][0-9]{2}))\b/;

  // Look for total line
  let foundTotal: number | null = null;
  let totalLabel = '';

  for (const line of lines) {
    const isTotalLine = /total|net\s*fare|earnings|amount\s*paid|grand\s*total|balance/i.test(line);
    const match = line.match(amountRegex);

    if (match) {
      const parsedNum = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 100000) {
        if (isTotalLine && (!foundTotal || parsedNum > foundTotal)) {
          foundTotal = parsedNum;
          totalLabel = line.replace(match[0], '').trim();
        }
      }
    }
  }

  // If we found a prominent total:
  if (foundTotal !== null) {
    const isIncome = isGigOrIncome && !/total\s*due|amount\s*paid|payment\s*due/i.test(totalLabel);
    items.push({
      type: isIncome ? 'income' : 'expense',
      amount: foundTotal,
      note: merchant ? `${merchant} ${isIncome ? 'Earnings' : 'Expense'}` : totalLabel || (isIncome ? 'Scanned Income' : 'Scanned Expense'),
    });
    return items;
  }

  // Fallback: search for any dollar amounts in lines
  for (const line of lines) {
    const match = line.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0 && val < 50000) {
        const isIncome = isGigOrIncome || /received|earned|deposit/i.test(line);
        items.push({
          type: isIncome ? 'income' : 'expense',
          amount: val,
          note: merchant || line.replace(match[0], '').trim() || (isIncome ? 'Scanned Income' : 'Receipt Purchase'),
        });
        if (items.length >= 3) break; // Limit to top 3 items
      }
    }
  }

  return items;
}
