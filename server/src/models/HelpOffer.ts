import { createModel } from '../db/model';
export default createModel<any>('help_offers', { defaults: { message: '', status: 'offered' }, references: { user: { collection: 'users' }, post: { collection: 'posts' } } });
