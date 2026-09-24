import { Router } from 'express';
import { resendWebhook } from '../controllers/resendController';
const router = Router();
router.post('/webhook', resendWebhook);
export default router;
