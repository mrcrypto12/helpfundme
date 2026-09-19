import bcrypt from 'bcryptjs';
import { createModel, RecordDocument } from '../db/model';

export interface IUser extends RecordDocument {
  name: string; email: string; password?: string; avatar: string; googleId?: string;
  role: 'user' | 'admin'; isVerified: boolean; totalDonated: number; bio: string;
  phone: string; location: string; refreshToken?: string; badges: string[];
  campaignsSupported: number; peopleHelped: number;
  verification: { identity: boolean; phone: boolean; documents: boolean };
  comparePassword(candidate: string): Promise<boolean>;
}

const User = createModel<IUser>('users', {
  defaults: { avatar: '', role: 'user', isVerified: false, totalDonated: 0, bio: '', phone: '', location: '', badges: [], campaignsSupported: 0, peopleHelped: 0, verification: { identity: false, phone: false, documents: false } },
  hidden: ['password', 'refreshToken'],
  beforeSave: async (doc, previous) => {
    doc.email = String(doc.email || '').trim().toLowerCase();
    if (doc.password && doc.password !== previous?.password && !String(doc.password).startsWith('$2')) doc.password = await bcrypt.hash(doc.password, 12);
  },
});

const originalCreate = User.create.bind(User);
User.create = async (values: any) => attach(await originalCreate(values));
const attach = (user: any) => {
  if (user) Object.defineProperty(user, 'comparePassword', {
    enumerable: false,
    configurable: true,
    value: async (candidate: string) => Boolean(user.password) && bcrypt.compare(candidate, user.password),
  });
  return user;
};
const originalFindById = User.findById.bind(User); User.findById = ((id: any) => { const q: any = originalFindById(id); const then = q.then.bind(q); q.then = (ok: any, fail: any) => then((u: any) => ok ? ok(attach(u)) : attach(u), fail); return q; }) as any;
const originalFindOne = User.findOne.bind(User); User.findOne = ((filter: any) => { const q: any = originalFindOne(filter); const then = q.then.bind(q); q.then = (ok: any, fail: any) => then((u: any) => ok ? ok(attach(u)) : attach(u), fail); return q; }) as any;

export default User;
