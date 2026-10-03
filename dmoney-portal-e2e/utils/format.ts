import * as fs from 'node:fs';
import * as path from 'node:path';

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD in the machine's local time (not UTC, so the file name matches the calendar day the tester sees). */
export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const money = (n: number) => n.toFixed(2);

const escapeCell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n') + '\n';
}

/** Minimal RFC-4180 parser, enough to read back what toCsv wrote. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function saveSelfStatementCsv(headers: string[], rows: string[][]): string {
  const dir = path.resolve(__dirname, '..', 'output');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `self_statement_${localDate()}.csv`);
  fs.writeFileSync(file, toCsv(headers, rows), 'utf8');
  return file;
}
