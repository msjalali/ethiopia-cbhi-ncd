// Logs anonymous usage snapshots (lever settings + which "Intermediate Outcomes"
// graphs are selected) to a Google Sheet, via a Google Apps Script Web App
// endpoint, so we can see how people are actually using the dashboard.
const LOG_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzK1PMoZ8SpYTn2XCl-2pITZTJ9MP7TPIitbk3Zp1CyH2eDlOkT5vxLc7K0TNzh6I87/exec'

const DEBOUNCE_MS = 2000
const SESSION_STORAGE_KEY = 'ethiopia-cbhi-ncd-session-id'

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let lastSentJson: string | undefined
let isFirstSnapshot = true

/**
 * Schedule a usage-log row for the given snapshot of dashboard state (lever
 * values, selected "Intermediate Outcomes" graphs, calendar mode, etc). Debounces
 * by `DEBOUNCE_MS` so a burst of slider drags collapses into a single row,
 * skips the very first (unmodified, on-load) snapshot, and skips re-sending a
 * snapshot identical to the last one actually sent (e.g. if a slider is moved
 * back to where it started).
 */
export function scheduleUsageSnapshot(snapshot: Record<string, unknown>): void {
  if (isFirstSnapshot) {
    // Don't log the initial, unmodified state on page load -- only log once
    // the user has actually changed something.
    isFirstSnapshot = false
    lastSentJson = JSON.stringify(snapshot)
    return
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    const json = JSON.stringify(snapshot)
    if (json !== lastSentJson) {
      lastSentJson = json
      sendRow(snapshot)
    }
  }, DEBOUNCE_MS)
}

function sendRow(snapshot: Record<string, unknown>): void {
  const row = {
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    ...snapshot
  }

  // Use 'no-cors' since we don't need to read the response, and posting as
  // text/plain avoids a CORS preflight request that Apps Script doesn't handle.
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(row)
  }).catch(() => {
    // Best-effort usage logging; ignore network failures.
  })
}
