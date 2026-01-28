/**
 * Utility function to merge class names conditionally
 * Similar to clsx/classnames but simpler
 */
export function cn(
    ...classes: (string | boolean | null | undefined | (string | boolean | null | undefined)[])[]
): string {
    return classes
        .flat()
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
        .join(' ');
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('vi-VN');
}

/**
 * Generate a random ID
 */
export function generateId(prefix = ''): string {
    const random = Math.random().toString(36).substring(2, 10);
    return prefix ? `${prefix}_${random}` : random;
}

/**
 * Delay utility for async operations
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if running on mobile device
 */
export function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
}

/**
 * Vibrate device (for haptic feedback on mobile)
 */
export function vibrate(pattern: number | number[] = 50): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}
