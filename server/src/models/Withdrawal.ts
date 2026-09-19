import { createModel } from '../db/model';
export default createModel<any>('withdrawals', { defaults: { bankInfo: { bank: '', accountNumber: '', accountName: '' }, mobileMoneyInfo: { provider: '', phone: '', name: '' }, status: 'pending', adminNotes: '' }, references: { post: { collection: 'posts' }, requestedBy: { collection: 'users' }, processedBy: { collection: 'users' } } });
