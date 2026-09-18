// Global type augmentation: merges our IUser into Express's own User interface
// (declared by @types/passport as an empty interface). Once merged, every
// req.user across the app — whether typed as Request or AuthRequest — refers
// to the same shape, so no more "not assignable" overload errors.
import { IUser } from '../models/User';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends IUser {}
  }
}

export {};