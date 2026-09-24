import { Request, Response } from 'express';
import { Resend } from 'resend';
import { isResendEnabled } from '../services/resend';
import EmailEvent from '../models/EmailEvent';

export const resendWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!isResendEnabled()) { res.status(404).json({ message: 'Email integration is disabled' }); return; }
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET) {
      res.status(503).json({ message: 'Resend webhook is not configured' }); return;
    }
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) { res.status(400).json({ message: 'Raw webhook body is missing' }); return; }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const event: any = resend.webhooks.verify({
      payload: raw.toString('utf8'),
      headers: {
        id: req.get('svix-id') || '',
        timestamp: req.get('svix-timestamp') || '',
        signature: req.get('svix-signature') || '',
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
    const eventId = req.get('svix-id') || event?.data?.email_id || `${event.type}:${event.created_at}`;
    if (!(await EmailEvent.findOne({ eventId }))) await EmailEvent.create({ eventId, type: event.type, data: event.data, receivedAt: new Date() });
    res.sendStatus(200);
  } catch (error) {
    console.error('Invalid Resend webhook:', error);
    res.status(400).json({ message: 'Invalid webhook signature' });
  }
};
