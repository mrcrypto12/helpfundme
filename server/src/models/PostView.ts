import { createModel } from '../db/model';
export default createModel<any>('post_views', { defaults: { lastViewed: new Date() }, references: { user: { collection: 'users' }, post: { collection: 'posts' } } });
