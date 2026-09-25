// One quick retry for read queries. Pooled Postgres connections can be
// closed by the server while idle; the first query after that fails with a
// connection error and the retry succeeds on a fresh connection.
export async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastError;
}
