// Robust global circuit breaker implementation for LLM requests.
// Prevents runaway failures and provides safety timeouts around external AI calls
// so that callers (e.g. HTACore) never hang indefinitely.

const FAILURE_THRESHOLD = 3;        // consecutive failures before opening the breaker
const COOLDOWN_MS = 2 * 60 * 1000;  // how long to keep the breaker open (2 minutes)
const DEFAULT_TIMEOUT_MS = process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS) : 30 * 1000; // default 30s, configurable

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
 * @param {string} [operationName='unnamed'] Name of the operation for logging.
 * @returns {Promise<T>} The result of asyncFn.
 */
async function execute(asyncFn, timeoutMs = DEFAULT_TIMEOUT_MS, operationName = 'unnamed') {
  if (isOpen()) {
    console.warn(`[CircuitBreaker] OPEN - skipping ${operationName} (will retry in ${Math.round((openUntil - Date.now()) / 1000)}s)`);
    throw new Error('Circuit breaker is open – skipping external request');
  }

  console.log(`[CircuitBreaker] Executing ${operationName} with ${timeoutMs}ms timeout`);
  const startTime = Date.now();
  
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error(`[CircuitBreaker] TIMEOUT - ${operationName} exceeded ${timeoutMs}ms`);
      reject(new Error(`Circuit breaker timeout after ${timeoutMs} ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([asyncFn(), timeoutPromise]);
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    console.log(`[CircuitBreaker] SUCCESS - ${operationName} completed in ${elapsed}ms`);
    recordSuccess();
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    console.error(`[CircuitBreaker] FAILURE - ${operationName} failed after ${elapsed}ms:`, err.message);
    recordFailure();
    throw err;
  }
}

// Backward compatible call method
async function call(asyncFn, fallbackFn, operationName = 'unnamed', timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    return await execute(asyncFn, timeoutMs, operationName);
  } catch (err) {
    console.warn(`[CircuitBreaker] Using fallback for ${operationName}:`, err.message);
    if (fallbackFn) {
      return await fallbackFn();
    }
    throw err;
  }
}

export const globalCircuitBreaker = {
  isOpen,
  canExecute,
  execute,
  call,
  recordSuccess,
  recordFailure,
};
