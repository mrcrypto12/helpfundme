import { createModel } from '../db/model';
export default createModel<any>('platform_funds', { defaults: { totalBalance: 0, totalReceived: 0, totalAllocated: 0, allocations: [] }, references: { 'allocations.post': { collection: 'posts' }, 'allocations.allocatedBy': { collection: 'users' } } });
