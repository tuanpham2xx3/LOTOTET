import type { Ticket } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a ticket against all invariants
 */
export function validateTicket(ticket: Ticket): ValidationResult {
  const errors: string[] = [];
  const ROWS = 9;
  const COLS = 9;

  // Check grid dimensions
  if (ticket.length !== ROWS) {
    errors.push(`Expected ${ROWS} rows, got ${ticket.length}`);
    return { valid: false, errors };
  }

  for (let row = 0; row < ROWS; row++) {
    if (ticket[row].length !== COLS) {
      errors.push(`Row ${row}: Expected ${COLS} cols, got ${ticket[row].length}`);
    }
  }

  // Check each row has exactly 5 numbers
  for (let row = 0; row < ROWS; row++) {
    const count = ticket[row].filter(n => n !== null).length;
    if (count !== 5) {
      errors.push(`Row ${row}: Expected 5 numbers, got ${count}`);
    }
  }

  // Check each column has 3-6 numbers
  for (let col = 0; col < COLS; col++) {
    const count = ticket.filter(row => row[col] !== null).length;
    if (count < 3 || count > 6) {
      errors.push(`Column ${col}: Expected 3-6 numbers, got ${count}`);
    }
  }

  // Check number ranges per column
  for (let col = 0; col < COLS; col++) {
    const [min, max] = getColumnBounds(col);
    for (let row = 0; row < ROWS; row++) {
      const num = ticket[row][col];
      if (num !== null && (num < min || num > max)) {
        errors.push(`Cell [${row}][${col}]: ${num} out of range [${min}-${max}]`);
      }
    }
  }

  // Check numbers are sorted within each column
  for (let col = 0; col < COLS; col++) {
    const nums = ticket.map(row => row[col]).filter((n): n is number => n !== null);
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] <= nums[i - 1]) {
        errors.push(`Column ${col}: Numbers not sorted (${nums[i - 1]} >= ${nums[i]})`);
      }
    }
  }

  // Check no duplicate numbers
  const allNumbers = ticket.flat().filter((n): n is number => n !== null);
  const uniqueNumbers = new Set(allNumbers);
  if (uniqueNumbers.size !== allNumbers.length) {
    errors.push(`Ticket contains duplicate numbers`);
  }

  return { valid: errors.length === 0, errors };
}

function getColumnBounds(col: number): [number, number] {
  if (col === 0) return [1, 9];
  if (col === 8) return [80, 90];
  return [col * 10, col * 10 + 9];
}