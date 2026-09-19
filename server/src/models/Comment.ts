import { createModel } from '../db/model';
export default createModel<any>('comments', { defaults: { likes: [], likesCount: 0 }, references: { author: { collection: 'users' }, post: { collection: 'posts' } } });
