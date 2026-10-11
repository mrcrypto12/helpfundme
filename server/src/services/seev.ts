import crypto, { randomUUID } from 'crypto';
import { pool } from '../config/db';
import type { PoolClient } from 'pg';
import Donation from '../models/Donation';

const endpoint = 'https://api.seevplus.com/api/v1/developer/payments';

type SeevSession = {
  id?: string;
  env?: string;
  reference: string;
  status: string;
  amount: number;
  final_amount?: number;
  currency: string;
  checkout_url?: string;
};

export const createSeevCheckout = async (donation: any, donor: any): Promise<SeevSession> => {
  const amount = Math.round(Number(donation.amount) * 100);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SEEV_CHECKOUT_API_KEY}`,
      'Idempotency-Key': `hfg-donation-${donation._id}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'checkout',
      amount,
      currency: 'GHS',
      recipient: { name: donor.name, email: donor.email },
      redirect_url: `${process.env.CLIENT_URL}/donations`,
      meta: { donationId: donation._id },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json() as { data?: SeevSession; error?: string };
  if (response.status !== 201 || !body.data?.reference || !body.data.checkout_url ||
      body.data.amount !== amount || body.data.currency !== 'GHS' || body.data.env !== process.env.SEEV_ENV) {
    throw new Error(body.error || 'Seev checkout creation failed');
  }
  const checkout = new URL(body.data.checkout_url);
  if (checkout.protocol !== 'https:' || checkout.hostname !== 'pay.seevplus.com') {
    throw new Error('Unexpected Seev checkout destination');
  }
  return body.data;
};

export const verifySeevSession = async (reference: string): Promise<SeevSession> => {
  const response = await fetch(`${endpoint}/${encodeURIComponent(reference)}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Seev verification temporarily unavailable (${response.status})`);
  const body = await response.json() as { data?: SeevSession };
  if (!body.data || body.data.reference !== reference) throw new Error('Seev reference mismatch');
  return body.data;
};

export const validSeevWebhook = (rawBody: Buffer | undefined, timestamp: string, signature: string): boolean => {
  const secret = process.env.SEEV_WEBHOOK_SECRET;
  if (!rawBody || !secret || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = `v1=${crypto.createHmac('sha256', secret).update(timestamp).update('.').update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const addNotification = async (client: PoolClient, recipient: string, type: string, title: string, message: string, relatedPost?: string, relatedDonation?: string) => {
  await client.query("INSERT INTO app_records(collection,id,data) VALUES('notifications',$1,$2::jsonb)", [
    randomUUID(), JSON.stringify({ recipient, type, title, message, relatedPost: relatedPost || null, relatedDonation: relatedDonation || null, isRead: false }),
  ]);
};

// All financial counters change in one PostgreSQL transaction. The donation row
// lock makes browser verification and webhook replay safe to run concurrently.
export const settleSeevDonation = async (session: SeevSession): Promise<any> => {
  if (!['completed', 'success'].includes(session.status)) throw new Error('Payment is not confirmed');
  const client = await pool.connect();
  let donationId: string;
  try {
    await client.query('BEGIN');
    const found = await client.query(
      "SELECT id, data FROM app_records WHERE collection='donations' AND data->>'paymentRef'=$1 FOR UPDATE",
      [session.reference]
    );
    if (!found.rows.length) throw new Error('Donation not found');
    const { id, data } = found.rows[0];
    donationId = id;
    if (data.paymentProvider !== 'seev' || data.currency !== session.currency ||
        Math.round(Number(data.amount) * 100) !== session.final_amount) {
      throw new Error('Payment amount, currency, or provider mismatch');
    }
    if (data.paymentStatus !== 'success') {
      let post: any;
      const newMilestones: number[] = [];
      if (data.type === 'post') {
        const postResult = await client.query("SELECT id, data FROM app_records WHERE collection='posts' AND id=$1 FOR UPDATE", [data.post]);
        if (!postResult.rows.length) throw new Error('Campaign not found');
        post = postResult.rows[0].data;
        post.amountRaised = Number(post.amountRaised || 0) + Number(data.amount);
        post.donorsCount = Number(post.donorsCount || 0) + 1;
        const progress = Number(post.targetAmount) > 0 ? Math.round(post.amountRaised / Number(post.targetAmount) * 100) : 0;
        post.milestonesReached = post.milestonesReached || [];
        for (const milestone of [25, 50, 75, 100]) {
          if (progress >= milestone && !post.milestonesReached.includes(milestone)) {
            post.milestonesReached.push(milestone);
            newMilestones.push(milestone);
          }
        }
        if (post.amountRaised >= Number(post.targetAmount) && post.status === 'approved') post.status = 'completed';
        await client.query("UPDATE app_records SET data=$2::jsonb, updated_at=NOW() WHERE collection='posts' AND id=$1", [data.post, JSON.stringify(post)]);
      } else if (data.type === 'platform') {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('helpfundme_platform_fund'))");
        const fundResult = await client.query("SELECT id, data FROM app_records WHERE collection='platform_funds' ORDER BY created_at LIMIT 1 FOR UPDATE");
        const fund = fundResult.rows[0]?.data || { totalBalance: 0, totalReceived: 0, totalAllocated: 0, allocations: [] };
        fund.totalBalance = Number(fund.totalBalance || 0) + Number(data.amount);
        fund.totalReceived = Number(fund.totalReceived || 0) + Number(data.amount);
        if (fundResult.rows.length) {
          await client.query("UPDATE app_records SET data=$2::jsonb, updated_at=NOW() WHERE collection='platform_funds' AND id=$1", [fundResult.rows[0].id, JSON.stringify(fund)]);
        } else {
          await client.query("INSERT INTO app_records(collection,id,data) VALUES('platform_funds',$1,$2::jsonb)", [randomUUID(), JSON.stringify(fund)]);
        }
      }
      const userResult = await client.query("SELECT data FROM app_records WHERE collection='users' AND id=$1 FOR UPDATE", [data.donor]);
      if (userResult.rows.length) {
        const user = userResult.rows[0].data;
        user.totalDonated = Number(user.totalDonated || 0) + Number(data.amount);
        if (data.type === 'post') {
          const prior = await client.query("SELECT 1 FROM app_records WHERE collection='donations' AND id<>$1 AND data->>'donor'=$2 AND data->>'post'=$3 AND data->>'paymentStatus'='success' LIMIT 1", [id, data.donor, data.post]);
          if (!prior.rows.length) user.campaignsSupported = Number(user.campaignsSupported || 0) + 1;
        }
        user.badges = user.badges || [];
        for (const [badge, earned] of [
          ['first_supporter', user.totalDonated > 0],
          ['community_helper', Number(user.campaignsSupported || 0) >= 5],
          ['angel_supporter', user.totalDonated >= 1000],
          ['campaign_booster', Number(user.campaignsSupported || 0) >= 10],
        ] as [string, boolean][]) {
          if (earned && !user.badges.includes(badge)) {
            user.badges.push(badge);
            await addNotification(client, data.donor, 'system', 'New badge earned!', `You earned the ${badge.replace(/_/g, ' ')} badge. Thank you for your generosity!`);
          }
        }
        await client.query("UPDATE app_records SET data=$2::jsonb, updated_at=NOW() WHERE collection='users' AND id=$1", [data.donor, JSON.stringify(user)]);
      }
      if (post) {
        await addNotification(client, post.author, 'donation_received', 'New donation received', `Your fundraiser received a GHS ${Number(data.amount).toLocaleString()} donation.`, data.post, id);
        for (const milestone of newMilestones) {
          const completed = milestone === 100;
          const title = completed ? `Your fundraiser reached its goal!` : `Your fundraiser is ${milestone}% funded!`;
          const message = completed ? `The fundraiser reached its target of GHS ${Number(post.targetAmount).toLocaleString()}.` : `The campaign reached ${milestone}% of its goal.`;
          await addNotification(client, post.author, completed ? 'campaign_completed' : 'campaign_milestone', title, message, data.post);
          const donors = await client.query("SELECT DISTINCT data->>'donor' AS id FROM app_records WHERE collection='donations' AND data->>'post'=$1 AND data->>'paymentStatus'='success'", [data.post]);
          const donorIds = new Set<string>(donors.rows.map((row: { id: string }) => row.id));
          donorIds.add(data.donor);
          for (const donorId of donorIds) await addNotification(client, donorId, completed ? 'campaign_completed' : 'campaign_milestone', completed ? `\"${post.title}\" reached its goal!` : `\"${post.title}\" is ${milestone}% funded!`, message, data.post);
          await client.query("INSERT INTO app_records(collection,id,data) VALUES('campaign_updates',$1,$2::jsonb)", [randomUUID(), JSON.stringify({ post: data.post, author: post.author, content: completed ? `Campaign goal reached! GHS ${post.amountRaised.toLocaleString()} raised from ${post.donorsCount} donors.` : `${milestone}% milestone reached! GHS ${post.amountRaised.toLocaleString()} raised so far.`, type: completed ? 'completion' : 'milestone', images: [], videoUrl: '' })]);
        }
      }
      data.paymentStatus = 'success';
      data.transactionId = session.id || session.reference;
      await client.query("UPDATE app_records SET data=$2::jsonb, updated_at=NOW() WHERE collection='donations' AND id=$1", [id, JSON.stringify(data)]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return Donation.findById(donationId!);
};
