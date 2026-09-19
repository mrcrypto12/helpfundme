import { createModel } from '../db/model';
export default createModel<any>('campaign_updates', { defaults: { images: [], videoUrl: '', type: 'update' }, references: { post: { collection: 'posts' }, author: { collection: 'users' } } });
