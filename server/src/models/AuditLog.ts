import { createModel } from '../db/model';
export default createModel<any>('audit_logs', { defaults: { metadata: {} }, references: { actor: { collection: 'users' } } });
