// Robust global circuit breaker implementation for LLM requests.
// Prevents runaway failures and provides safety timeouts around external AI calls
// so that callers (e.g. HTACore) never hang indefinitely.

const FAILURE_THRESHOLD = 3;        // consecutive failures before opening the breaker
const COOLDOWN_MS = 2 * 60 * 1000;  // how long to keep the breaker open (2 minutes)
const DEFAULT_TIMEOUT_MS = 45 * 1000; // maximum time we will wait for an LLM response

let failureCount = 0;
let openUntil = 0; // timestamp in ms. 0 means not open.

function isOpen() {
  return Date.now() < openUntil;
}

function halfOpenReset() {
  // move to half-open after cooldown expires
  if (!isOpen() && failureCount > 0) {
    failureCount = 0;
  }
}

function recordSuccess() {
  halfOpenReset();
  failureCount = 0;
}

function recordFailure() {
  failureCount += 1;
  if (failureCount >= FAILURE_THRESHOLD) {
    openUntil = Date.now() + COOLDOWN_MS;
  }
}

function canExecute() {
  return !isOpen();
}

/**
 * Executes the provided asyncFn if the breaker is closed. Ensures a timeout so callers never hang.
 * @template T
 * @param {() => Promise<T>} asyncFn Function that returns a promise to execute.
 * @param {number} [timeoutMs=DEFAULT_TIMEOUT_MS] Optional timeout in milliseconds.
 * @returns {Promise<T>} The result of asyncFn.
 */
async function execute(asyncFn, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (isOpen()) {
    throw new Error('Circuit breaker is open – skipping external request');
  }

  const timeoutPromise = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Circuit breaker timeout after ${timeoutMs} ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([asyncFn(), timeoutPromise]);
    recordSuccess();
    return result;
  } catch (err) {
    recordFailure();
    throw err;
  }
}

export const globalCircuitBreaker = {
  isOpen,
  canExecute,
  execute,
  recordSuccess,
  recordFailure,
};
