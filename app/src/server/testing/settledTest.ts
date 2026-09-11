/** Test-only deadlines must not abandon an asynchronous database writer at cleanup time. */
export function createSettledTestLifecycle() {
  const pending = new Set<Promise<unknown>>()
  return {
    async run<T>(body: () => Promise<T>, budgetMs: number): Promise<T> {
      if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('A positive test deadline is required')
      const started = performance.now()
      let expired = false
      const timer = setTimeout(() => { expired = true }, budgetMs)
      const operation = Promise.resolve().then(body)
      pending.add(operation)
      let result: T | undefined
      let failure: unknown
      let failed = false
      try { result = await operation } catch (error) { failed = true; failure = error }
      finally { clearTimeout(timer); pending.delete(operation) }
      // Check elapsed time too: synchronous hashing can prevent the timer from firing promptly.
      if (expired || performance.now() - started >= budgetMs) {
        const deadline = new Error(`Test exceeded its ${budgetMs} ms deadline; asynchronous body settled before cleanup`)
        if (failed) throw new AggregateError([deadline, failure], deadline.message)
        throw deadline
      }
      if (failed) throw failure
      return result as T
    },
    async settle() {
      while (pending.size) await Promise.allSettled([...pending])
    },
  }
}
