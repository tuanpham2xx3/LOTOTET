/**
 * Generate a valid ticket for the game
 * @returns A valid ticket
 */
import type { Ticket } from "./types";

/**
 * Column number ranges
 * Column 0: 1-9, Column 1: 10-19, ..., Column 8: 80-90
 */
function getColumnRange(col: number): number[] {
    if (col === 0) {
        return Array.from({ length: 9 }, (_, i) => i + 1); // 1-9
    }
    if (col === 8) {
        return Array.from({ length: 11 }, (_, i) => i + 80); // 80-90
    }
    const start = col * 10;
    return Array.from({ length: 10 }, (_, i) => i + start); // e.g
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Generate a valid 9x9 ticket
 * Invariants:
 * - Each row has exactly 5 numbers
 * - Each column has 3-6 numbers
 * - Numbers are sorted within each column
 */
export function generateTicket(): Ticket {
    const ROWS = 9;
    const COLS = 9;
    const NUMBERS_PER_ROW = 5;
    const MIN_PER_COL = 3;
    const MAX_PER_COL = 6;
    const TOTAL_NUMBERS = ROWS * NUMBERS_PER_ROW; // 45

    // step 1 decide how many number per column 3-6 each, sum 45
    let colCounts: number[] = [];
    let attemps = 0

    while (attemps < 1000) {
        colCounts = Array(COLS).fill(MIN_PER_COL); // start with 3 each 27
        let remaining = TOTAL_NUMBERS - 27; // need 18 more

        // remaining randomly
        while (remaining > 0) {
            const col = Math.floor(Math.random() * COLS);
            if (colCounts[col] < MAX_PER_COL) {
                colCounts[col]++;
                remaining--;
            }
        }

        if (colCounts.reduce((a, b) => a + b, 0) === TOTAL_NUMBERS) {
            break;
        }
        attemps++;
    }

    // step 2 get random numnbers for each col
    const columnNumbers: (number | null)[][] = [];
    for (let col = 0; col < COLS; col++) {
        const range = getColumnRange(col);
        const selected = shuffle(range).slice(0, colCounts[col]); // Không sort - giữ thứ tự ngẫu nhiên
        columnNumbers.push(selected);
    }

    // step 3 build the grid with backtracking
    const grid: (number | null)[][] = Array.from({
        length: ROWS
    }, () => Array(COLS).fill(null)
    );
    // track with column indices we've placed per col
    const colIndices = Array(COLS).fill(0);
    // assign numbers to rows ensuring each row has exactly 5
    // user greedy algorithm
    for (let row = 0; row < ROWS; row++) {
        const availableCols: number[] = [];

        for (let col = 0; col < COLS; col++) {
            const remainingInCol = colCounts[col] - colIndices[col];
            const remainingRows = ROWS - row;

            // must place if we need all remaining rows for this column
            if (remainingInCol >= remainingRows) {
                grid[row][col] = columnNumbers[col][colIndices[col]];
                colIndices[col]++;
            } else if (remainingInCol > 0) {
                availableCols.push(col);
            }
        }

        // count how many already placed in this row
        const placedInRow = grid[row].filter(n => n !== null).length;
        const needed = NUMBERS_PER_ROW - placedInRow;

        // pick random column from availableCols
        const selected = shuffle(availableCols).slice(0, needed);
        for (const col of selected) {
            grid[row][col] = columnNumbers[col][colIndices[col]];
            colIndices[col]++;
        }
    }
    return grid;
}