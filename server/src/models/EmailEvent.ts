import { createModel } from '../db/model';
export default createModel<any>('email_events', { defaults: { processed: true } });
