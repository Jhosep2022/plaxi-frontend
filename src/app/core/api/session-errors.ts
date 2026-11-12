import { HttpErrorResponse } from '@angular/common/http';

// A failure that says nothing about the session: no connection, a timeout, too many requests or a server error.
// With a weak signal at school these happen often, and they must never sign the person out.
export function isTemporaryFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

// Waits before each new refresh attempt: 1 s, then 3 s
export const REFRESH_RETRY_DELAYS_MS = [1_000, 3_000] as const;
