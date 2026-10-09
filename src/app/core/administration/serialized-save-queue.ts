/**
 * Serializes full-document administration PUTs in invocation order.
 * A rejected mutation cannot poison subsequent queue operations.
 * The caller supplies a snapshot and a precondition version at execution time.
 */
export class SerializedSaveQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}
