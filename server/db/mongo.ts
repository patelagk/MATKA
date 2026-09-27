import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface BaseDocument {
  _id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
}

export function generateObjectId(): string {
  return crypto.randomBytes(12).toString('hex');
}

export class InMemoryCollection<T extends BaseDocument> {
  private name: string;
  private items: Map<string, T> = new Map();
  private onMutate?: () => void;

  constructor(name: string, onMutate?: () => void) {
    this.name = name;
    this.onMutate = onMutate;
  }

  loadData(items: T[]) {
    this.items.clear();
    for (const item of items) {
      if (!item._id) {
        item._id = generateObjectId();
      }
      this.items.set(String(item._id), { ...item });
    }
  }

  getAll(): T[] {
    return Array.from(this.items.values()).map(item => ({ ...item }));
  }

  private matchFilter(item: T, filter: Record<string, any>): boolean {
    for (const key of Object.keys(filter)) {
      const filterVal = filter[key];

      // Support special operator: $in
      if (filterVal && typeof filterVal === 'object' && '$in' in filterVal) {
        if (!Array.isArray(filterVal.$in)) return false;
        if (!filterVal.$in.includes(item[key])) return false;
        continue;
      }

      // Support special operator: $ne
      if (filterVal && typeof filterVal === 'object' && '$ne' in filterVal) {
        if (item[key] === filterVal.$ne) return false;
        continue;
      }

      // Support special operator: $gte, $lte
      if (filterVal && typeof filterVal === 'object' && ('$gte' in filterVal || '$lte' in filterVal)) {
        const val = item[key];
        if ('$gte' in filterVal && val < filterVal.$gte) return false;
        if ('$lte' in filterVal && val > filterVal.$lte) return false;
        continue;
      }

      // Direct match
      if (item[key] !== filterVal) {
        return false;
      }
    }
    return true;
  }

  async findOne(filter: Record<string, any>): Promise<T | null> {
    for (const item of this.items.values()) {
      if (this.matchFilter(item, filter)) {
        return { ...item };
      }
    }
    return null;
  }

  async find(filter: Record<string, any> = {}, options: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number } = {}): Promise<T[]> {
    let result = Array.from(this.items.values()).filter(item => this.matchFilter(item, filter));

    if (options.sort) {
      const sortKeys = Object.keys(options.sort);
      result.sort((a, b) => {
        for (const key of sortKeys) {
          const dir = options.sort![key];
          const valA = a[key];
          const valB = b[key];
          if (valA < valB) return dir === 1 ? -1 : 1;
          if (valA > valB) return dir === 1 ? 1 : -1;
        }
        return 0;
      });
    }

    if (options.skip) {
      result = result.slice(options.skip);
    }

    if (options.limit && options.limit > 0) {
      result = result.slice(0, options.limit);
    }

    return result.map(item => ({ ...item }));
  }

  async insertOne(doc: Omit<T, '_id'> & { _id?: string }): Promise<T> {
    const id = doc._id || generateObjectId();
    const now = new Date().toISOString();
    const newDoc = {
      ...doc,
      _id: id,
      createdAt: (doc as any).createdAt || now,
      updatedAt: (doc as any).updatedAt || now
    } as T;

    this.items.set(id, newDoc);
    this.onMutate?.();
    return { ...newDoc };
  }

  async insertMany(docs: Array<Omit<T, '_id'> & { _id?: string }>): Promise<T[]> {
    const inserted: T[] = [];
    for (const doc of docs) {
      const res = await this.insertOne(doc);
      inserted.push(res);
    }
    return inserted;
  }

  async updateOne(filter: Record<string, any>, update: { $set?: Record<string, any>; $inc?: Record<string, number> }): Promise<{ matchedCount: number; modifiedCount: number }> {
    for (const [id, item] of this.items.entries()) {
      if (this.matchFilter(item, filter)) {
        const updated: any = { ...item };
        if (update.$set) {
          for (const key of Object.keys(update.$set)) {
            updated[key] = update.$set[key];
          }
        }
        if (update.$inc) {
          for (const key of Object.keys(update.$inc)) {
            const current = (updated[key] as number) || 0;
            updated[key] = current + update.$inc[key];
          }
        }
        updated.updatedAt = new Date().toISOString();
        this.items.set(id, updated as T);
        this.onMutate?.();
        return { matchedCount: 1, modifiedCount: 1 };
      }
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async updateMany(filter: Record<string, any>, update: { $set?: Record<string, any>; $inc?: Record<string, number> }): Promise<{ matchedCount: number; modifiedCount: number }> {
    let matched = 0;
    let modified = 0;
    for (const [id, item] of this.items.entries()) {
      if (this.matchFilter(item, filter)) {
        matched++;
        const updated: any = { ...item };
        if (update.$set) {
          for (const key of Object.keys(update.$set)) {
            updated[key] = update.$set[key];
          }
        }
        if (update.$inc) {
          for (const key of Object.keys(update.$inc)) {
            const current = (updated[key] as number) || 0;
            updated[key] = current + update.$inc[key];
          }
        }
        updated.updatedAt = new Date().toISOString();
        this.items.set(id, updated as T);
        modified++;
      }
    }
    if (modified > 0) {
      this.onMutate?.();
    }
    return { matchedCount: matched, modifiedCount: modified };
  }

  async deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }> {
    for (const [id, item] of this.items.entries()) {
      if (this.matchFilter(item, filter)) {
        this.items.delete(id);
        this.onMutate?.();
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (this.matchFilter(item, filter)) {
        count++;
      }
    }
    return count;
  }
}

class DatabaseManager {
  private dataDir: string;
  private dataFilePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  public users: InMemoryCollection<any>;
  public markets: InMemoryCollection<any>;
  public entries: InMemoryCollection<any>;
  public walletTransactions: InMemoryCollection<any>;
  public results: InMemoryCollection<any>;
  public auditLogs: InMemoryCollection<any>;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.dataFilePath = path.join(this.dataDir, 'mongodb_store.json');

    const triggerSave = () => this.scheduleSave();

    this.users = new InMemoryCollection('users', triggerSave);
    this.markets = new InMemoryCollection('markets', triggerSave);
    this.entries = new InMemoryCollection('entries', triggerSave);
    this.walletTransactions = new InMemoryCollection('wallet_transactions', triggerSave);
    this.results = new InMemoryCollection('results', triggerSave);
    this.auditLogs = new InMemoryCollection('audit_logs', triggerSave);

    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users) this.users.loadData(data.users);
        if (data.markets) this.markets.loadData(data.markets);
        if (data.entries) this.entries.loadData(data.entries);
        if (data.walletTransactions) this.walletTransactions.loadData(data.walletTransactions);
        if (data.results) this.results.loadData(data.results);
        if (data.auditLogs) this.auditLogs.loadData(data.auditLogs);
      }
    } catch (err) {
      console.warn('Failed to load database from disk, starting fresh:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 100);
  }

  public saveToDisk() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const data = {
        users: this.users.getAll(),
        markets: this.markets.getAll(),
        entries: this.entries.getAll(),
        walletTransactions: this.walletTransactions.getAll(),
        results: this.results.getAll(),
        auditLogs: this.auditLogs.getAll()
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database to disk:', err);
    }
  }
}

export const db = new DatabaseManager();
