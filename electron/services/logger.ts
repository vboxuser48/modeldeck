import fs from 'node:fs';
import path from 'node:path';
import { getModelDeckLogsDir } from './appPaths.js';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function logFilePath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(getModelDeckLogsDir(), `${date}.log`);
}

function toMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function write(level: LogLevel, scope: string, detail: unknown): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} [${level}] [${scope}] ${toMessage(detail)}\n`;

  try {
    fs.appendFileSync(logFilePath(), line, { encoding: 'utf8' });
  } catch {
    // Logging must never crash the app.
  }

  if (level === 'ERROR') {
    console.error(line.trim());
    return;
  }

  if (level === 'WARN') {
    console.warn(line.trim());
    return;
  }

  console.log(line.trim());
}

export function logInfo(scope: string, detail: unknown): void {
  write('INFO', scope, detail);
}

export function logWarn(scope: string, detail: unknown): void {
  write('WARN', scope, detail);
}

export function logError(scope: string, detail: unknown): void {
  write('ERROR', scope, detail);
}
