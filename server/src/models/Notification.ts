import { createModel } from '../db/model';
export default createModel<any>('notifications', { defaults: { relatedPost: null, relatedDonation: null, relatedUser: null, isRead: false }, references: { recipient: { collection: 'users' }, relatedPost: { collection: 'posts' }, relatedDonation: { collection: 'donations' }, relatedUser: { collection: 'users' } } });
