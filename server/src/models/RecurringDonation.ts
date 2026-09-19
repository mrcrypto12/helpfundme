import { createModel } from '../db/model';
export default createModel<any>('recurring_donations', { defaults: { post: null, frequency: 'monthly', paystackPlanCode: '', paystackSubscriptionCode: '', paystackEmailToken: '', status: 'active', totalCharged: 0, chargeCount: 0 }, references: { donor: { collection: 'users' }, post: { collection: 'posts' } } });
