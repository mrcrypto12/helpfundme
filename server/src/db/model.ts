import { randomUUID } from 'crypto';
import { pool } from '../config/db';

type Obj = Record<string, any>;
type PopulateSpec = { path: string; select?: string; populate?: PopulateSpec };
export interface RecordDocument extends Obj { _id: string; id: string; createdAt: Date; updatedAt: Date; save(): Promise<this>; populate(path: string | PopulateSpec, select?: string): Promise<this>; toObject(): Obj; toJSON(): Obj; }
interface ModelOptions { defaults?: Obj; references?: Record<string, { collection: string }>; beforeSave?: (doc: Obj, previous?: Obj) => Promise<void> | void; hidden?: string[]; virtuals?: (doc: Obj) => Obj; }
const clone = (v: any) => v === undefined ? undefined : structuredClone(v);
const getPath = (o: any, p: string) => p.split('.').reduce((v, k) => v?.[k], o);
const setPath = (o: any, p: string, v: any) => { const a = p.split('.'); const last = a.pop()!; a.reduce((x, k) => (x[k] ??= {}), o)[last] = v; };
const revive = (v: any, key = ''): any => {
  if (Array.isArray(v)) return v.map(item => revive(item));
  if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) v[k] = revive(x, k); return v; }
  if (typeof v === 'string' && (key.endsWith('At') || ['lastViewed', 'date', 'nextChargeDate'].includes(key))) { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  return v;
};
const matches = (r: Obj, f: Obj = {}) => Object.entries(f).every(([k, e]: [string, any]) => {
  if (k === '$text') return `${r.title || ''} ${r.description || ''}`.toLowerCase().includes(String(e.$search || '').toLowerCase());
  const a = k === '_id' ? r._id : getPath(r, k);
  if (e && typeof e === 'object' && !Array.isArray(e) && !(e instanceof Date)) { if ('$in' in e) return e.$in.map(String).includes(String(a)); if ('$ne' in e) return String(a) !== String(e.$ne); }
  return String(a) === String(e);
});
const project = (v: Obj, s?: string) => { if (!s) return v; const out: Obj = { _id: v._id }; s.split(/\s+/).forEach(k => { if (k && !k.startsWith('-') && v[k] !== undefined) out[k] = v[k]; }); return out; };

class Query<T> implements PromiseLike<T> {
  private pops: Array<{ path: string | PopulateSpec; select?: string }> = []; private order?: Obj; private offset = 0; private max?: number;
  constructor(private run: () => Promise<any>, private model: DocumentModel<any>) {}
  populate(path: string | PopulateSpec, select?: string) { this.pops.push({ path, select }); return this; }
  sort(v: Obj) { this.order = v; return this; } skip(v: number) { this.offset = v; return this; } limit(v: number) { this.max = v; return this; }
  select(_v: string) { return this; } lean() { return this; }
  private async exec() { let result = await this.run(); if (Array.isArray(result)) { if (this.order) result.sort((a, b) => { for (const [f, d] of Object.entries(this.order!)) { const av = getPath(a, f), bv = getPath(b, f); if (av !== bv) return (av > bv ? 1 : -1) * Number(d); } return 0; }); result = result.slice(this.offset, this.max === undefined ? undefined : this.offset + this.max); for (const p of this.pops) for (const x of result) await this.model.populateDocument(x, p.path, p.select); } else if (result) for (const p of this.pops) await this.model.populateDocument(result, p.path, p.select); return result; }
  then<A = T, B = never>(ok?: ((v: T) => A | PromiseLike<A>) | null, fail?: ((e: any) => B | PromiseLike<B>) | null) { return this.exec().then(ok, fail); }
}

export class DocumentModel<T extends RecordDocument = RecordDocument> {
  constructor(public collection: string, private options: ModelOptions = {}) {}
  private hydrate(row: any): T { const raw = revive({ ...row.data, _id: row.id, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at }); if (this.options.virtuals) Object.assign(raw, this.options.virtuals(raw)); Object.defineProperties(raw, { save: { enumerable: false, value: async () => { await this.saveDocument(raw); return raw; } }, populate: { enumerable: false, value: async (p: any, s?: string) => { await this.populateDocument(raw, p, s); return raw; } }, toObject: { enumerable: false, value: () => this.serialize(raw, false) }, toJSON: { enumerable: false, value: () => this.serialize(raw, true) } }); return raw; }
  private serialize(d: Obj, hide: boolean) { const out: Obj = {}; for (const [k, v] of Object.entries(d)) if (k !== 'id') out[k] = clone(v); if (hide) for (const k of this.options.hidden || []) delete out[k]; return out; }
  private persisted(d: Obj) {
    const out: Obj = {};
    for (const [k, v] of Object.entries(d)) if (!['_id', 'id', 'createdAt', 'updatedAt'].includes(k) && typeof v !== 'function') out[k] = v;
    // A populated relation is an object in API responses, but PostgreSQL stores
    // its stable UUID. This mirrors Mongoose's depopulation behavior on save.
    for (const path of Object.keys(this.options.references || {})) {
      if (path.includes('.')) {
        const [arrayKey, childKey] = path.split('.');
        if (Array.isArray(out[arrayKey])) out[arrayKey] = out[arrayKey].map((item: Obj) => ({ ...item, [childKey]: item?.[childKey]?._id || item?.[childKey] }));
      } else if (out[path] && typeof out[path] === 'object') out[path] = out[path]._id || out[path].id;
    }
    return out;
  }
  private async all() { return (await pool.query('SELECT * FROM app_records WHERE collection=$1', [this.collection])).rows.map(r => this.hydrate(r)); }
  private async filtered(f: Obj = {}) { return (await this.all()).filter(r => matches(r, f)); }
  find(f: Obj = {}) { return new Query<T[]>(() => this.filtered(f), this); }
  findOne(f: Obj = {}) { return new Query<T | null>(async () => (await this.filtered(f))[0] || null, this); }
  findById(id: any) { return new Query<T | null>(async () => { const value = String(id || ''); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return null; const q = await pool.query('SELECT * FROM app_records WHERE collection=$1 AND id=$2', [this.collection, value]); return q.rows[0] ? this.hydrate(q.rows[0]) : null; }, this); }
  async create(v: Obj): Promise<T> { const now = new Date(), d: Obj = { ...clone(this.options.defaults || {}), ...clone(v), _id: randomUUID(), createdAt: now, updatedAt: now }; await this.options.beforeSave?.(d); await pool.query('INSERT INTO app_records(collection,id,data,created_at,updated_at) VALUES($1,$2,$3::jsonb,$4,$4)', [this.collection, d._id, JSON.stringify(this.persisted(d)), now]); return (await this.findById(d._id))!; }
  async saveDocument(d: Obj) { const old = await this.findById(d._id); await this.options.beforeSave?.(d, old?.toObject()); d.updatedAt = new Date(); await pool.query('UPDATE app_records SET data=$3::jsonb,updated_at=$4 WHERE collection=$1 AND id=$2', [this.collection, d._id, JSON.stringify(this.persisted(d)), d.updatedAt]); }
  private update(d: Obj, u: Obj) { if (u.$inc) for (const [k, n] of Object.entries(u.$inc)) setPath(d, k, Number(getPath(d, k) || 0) + Number(n)); for (const [k, v] of Object.entries(u)) if (!k.startsWith('$')) setPath(d, k, v); }
  findByIdAndUpdate(id: any, u: Obj, _o: Obj = {}) { return new Query<T | null>(async () => { const d = await this.findById(id); if (!d) return null; this.update(d, u); await d.save(); return d; }, this); }
  findOneAndUpdate(f: Obj, u: Obj, o: Obj = {}) { return new Query<T | null>(async () => { let d = await this.findOne(f); if (!d && o.upsert) d = await this.create({ ...f, ...(o.setOnInsert || {}) }); if (!d) return null; this.update(d, u); await d.save(); return d; }, this); }
  async findByIdAndDelete(id: any) { const d = await this.findById(id); await pool.query('DELETE FROM app_records WHERE collection=$1 AND id=$2', [this.collection, String(id)]); return d; }
  async findOneAndDelete(f: Obj) { const d = await this.findOne(f); if (d) await this.findByIdAndDelete(d._id); return d; }
  async deleteMany(f: Obj = {}) { const a = await this.filtered(f); for (const d of a) await this.findByIdAndDelete(d._id); return { deletedCount: a.length }; }
  async updateMany(f: Obj, u: Obj) { const a = await this.filtered(f); for (const d of a) { this.update(d, u); await d.save(); } return { modifiedCount: a.length }; }
  async countDocuments(f: Obj = {}) { return (await this.filtered(f)).length; }
  async distinct(field: string, filter: Obj = {}) { return [...new Set((await this.filtered(filter)).map(row => getPath(row, field)).filter(value => value !== undefined && value !== null))]; }
  async insertMany(values: Obj[]) { const created: T[] = []; for (const value of values) created.push(await this.create(value)); return created; }
  async populateDocument(d: Obj, p: string | PopulateSpec, select?: string) { const spec = typeof p === 'string' ? { path: p, select } : p, ref = this.options.references?.[spec.path], target = ref && registry.get(ref.collection); if (!target) return d; if (spec.path.includes('.')) { const [a, k] = spec.path.split('.'); for (const item of d[a] || []) if (item[k]) { const id = item[k]?._id || item[k]; item[k] = project((await target.findById(id))?.toObject() || {}, spec.select); } } else if (d[spec.path]) { const id = d[spec.path]?._id || d[spec.path], found = await target.findById(id); d[spec.path] = found ? project(found.toObject(), spec.select) : null; if (found && spec.populate) await target.populateDocument(d[spec.path], spec.populate, spec.populate.select); } return d; }
  async aggregate(pipe: Obj[]) { let rows: Obj[] = await this.filtered(); for (const s of pipe) { if (s.$match) rows = rows.filter(r => matches(r, s.$match)); if (s.$group) { const groups = new Map<string, Obj[]>(); for (const r of rows) { const x = s.$group._id, key = x === null ? null : getPath(r, String(x).slice(1)), list = groups.get(String(key)) || []; list.push(r); groups.set(String(key), list); } rows = [...groups.entries()].map(([key, list]) => { const out: Obj = { _id: s.$group._id === null ? null : key }; for (const [name, exp] of Object.entries<any>(s.$group)) { if (name === '_id') continue; if (exp.$sum !== undefined) out[name] = list.reduce((sum, r) => { if (typeof exp.$sum === 'number') return sum + exp.$sum; if (typeof exp.$sum === 'string') return sum + Number(getPath(r, exp.$sum.slice(1)) || 0); const [condition, yes, no] = exp.$sum.$cond, [left, right] = condition.$eq; return sum + (getPath(r, left.slice(1)) === right ? (typeof yes === 'string' ? Number(getPath(r, yes.slice(1))) : yes) : no); }, 0); if (exp.$addToSet) out[name] = [...new Set(list.map(r => getPath(r, exp.$addToSet.slice(1))))]; } return out; }); } if (s.$project) rows = rows.map(r => { const o = { ...r }; for (const [n, e] of Object.entries<any>(s.$project)) if (e?.$size) o[n] = getPath(r, e.$size.slice(1))?.length || 0; return o; }); if (s.$sort) rows.sort((a, b) => { const [f, n] = Object.entries(s.$sort)[0] as [string, any]; return (getPath(a, f) > getPath(b, f) ? 1 : -1) * n; }); } return rows; }
}
const registry = new Map<string, DocumentModel<any>>();
export const createModel = <T extends RecordDocument = RecordDocument>(collection: string, options: ModelOptions = {}) => { const m = new DocumentModel<T>(collection, options); registry.set(collection, m); return m; };
