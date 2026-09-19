import { createModel } from '../db/model';
export default createModel<any>('donations', { defaults: { post: null, currency: 'GHS', paymentStatus: 'pending', transactionId: '', message: '', isAnonymous: false }, references: { donor: { collection: 'users' }, post: { collection: 'posts' } } });
