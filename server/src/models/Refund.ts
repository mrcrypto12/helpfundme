import { createModel } from '../db/model';
export default createModel<any>('refunds', { defaults: { status: 'pending', adminNotes: '' }, references: { donation: { collection: 'donations' }, requestedBy: { collection: 'users' }, processedBy: { collection: 'users' } } });
