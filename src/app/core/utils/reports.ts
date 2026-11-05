import { addDays } from './attendance';

// Download an Excel-compatible CSV using a semicolon separator and UTF-8 BOM.
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]): void {
  const escapeCell = (v: string | number | null) => {
    const text = v === null ? '' : String(v);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...rows].map((f) => f.map(escapeCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Return inclusive YYYY-MM-DD dates between the bounds.
export function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let f = start; f <= end && dates.length < 400; f = addDays(f, 1)) dates.push(f);
  return dates;
}

export const calculatePercentage = (part: number, total: number): number => (total ? Math.round((part / total) * 100) : 0);
