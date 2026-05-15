// main.ts - clean and simple
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

const debugEnabled = new URLSearchParams(window.location.search).has('debug');
let debugPanel: HTMLPreElement | undefined;
const debugLines: string[] = [];

declare global {
  interface Window {
    matchboardDebug?: (message: string, detail?: unknown) => void;
  }
}

function appendDebugMessage(message: string, detail?: unknown): void {
  if (!debugEnabled) {
    return;
  }

  debugLines.push(`${new Date().toLocaleTimeString()} ${message}`);

  if (detail !== undefined) {
    const detailText = detail instanceof Error
      ? `${detail.name}: ${detail.message}\n${detail.stack ?? ''}`
      : typeof detail === 'string'
        ? detail
        : JSON.stringify(detail, null, 2);
    debugLines.push(detailText);
  }

  debugLines.push('');

  if (!debugPanel) {
    debugPanel = document.createElement('pre');
    debugPanel.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'margin:0',
      'padding:16px',
      'overflow:auto',
      'white-space:pre-wrap',
      'background:#111',
      'color:#f5f5f5',
      'font:14px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace'
    ].join(';');
    document.body.appendChild(debugPanel);
  }

  debugPanel.textContent = debugLines.join('\n');
}

function showDebugMessage(title: string, detail: unknown): void {
  if (!debugEnabled) {
    return;
  }

  const message = detail instanceof Error
    ? `${detail.name}: ${detail.message}\n${detail.stack ?? ''}`
    : String(detail);

  appendDebugMessage(title, message);
}

if (debugEnabled) {
  window.matchboardDebug = appendDebugMessage;
  appendDebugMessage('Debug mode enabled');

  window.addEventListener('error', (event) => {
    showDebugMessage('Unhandled browser error', event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    showDebugMessage('Unhandled promise rejection', event.reason);
  });
}

appendDebugMessage('Starting Angular bootstrap');

bootstrapApplication(App, appConfig).catch((err) => {
  console.error(err);
  showDebugMessage('Angular bootstrap failed', err);
});
