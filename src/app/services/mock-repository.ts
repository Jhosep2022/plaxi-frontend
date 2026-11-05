import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_DELAY } from '../mocks/mock-data';

// Simulate repository operations with latency and return copies to callers.
export class MockRepository<T extends { id: number }> {
  constructor(private readonly items: T[]) {}

  list(filter: (item: T) => boolean = () => true): Observable<T[]> {
    return this.respond(this.items.filter(filter).map((item) => structuredClone(item)));
  }

  save(item: Omit<T, 'id'> & { id?: number }): Observable<T> {
    const index = item.id ? this.items.findIndex((entry) => entry.id === item.id) : -1;
    const saved = { ...structuredClone(item), id: item.id || this.nextId() } as T;
    if (index >= 0) this.items[index] = saved;
    else this.items.push(saved);
    return this.respond(structuredClone(saved));
  }

  delete(id: number): Observable<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) this.items.splice(index, 1);
    return this.respond(undefined);
  }

  // Synchronous reads support mock validation and internal rules.
  readNow(filter: (item: T) => boolean = () => true): T[] {
    return this.items.filter(filter);
  }

  private nextId(): number {
    return this.items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  private respond<R>(value: R): Observable<R> {
    return of(value).pipe(delay(MOCK_DELAY));
  }
}
