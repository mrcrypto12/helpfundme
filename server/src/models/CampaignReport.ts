import { createModel } from '../db/model';
export default createModel<any>('campaign_reports', { defaults: { status: 'open', adminNotes: '' }, references: { post: { collection: 'posts' }, reporter: { collection: 'users' }, handledBy: { collection: 'users' } } });
