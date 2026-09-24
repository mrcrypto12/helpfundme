const RESEND_API = 'https://api.resend.com';

// Production-ready integration switch. Keep false until a sending domain is
// available, then enable it using the variables in RESEND_SETUP.md.
export const isResendEnabled = (): boolean => process.env.RESEND_ENABLED === 'true';

const request = async (path: string, body: unknown) => {
  if (!isResendEnabled()) throw new Error('Resend email is disabled');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');
  const response = await fetch(`${RESEND_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.message || `Resend request failed (${response.status})`);
  return data;
};

export const sendTransactionalEmail = async (options: { to: string; subject: string; html: string; text?: string }) =>
  request('/emails', { from: process.env.RESEND_FROM_EMAIL || 'HelpFundMe <onboarding@resend.dev>', ...options });

export const sendVerificationEmail = async (email: string, name: string, code: string) => sendTransactionalEmail({
  to: email,
  subject: `${code} is your HelpFundMe verification code`,
  text: `Hello ${name}, your HelpFundMe verification code is ${code}. It expires in 10 minutes.`,
  html: `<div style="background:#0B0E14;padding:32px;font-family:Arial,sans-serif;color:#F0F2F5"><div style="max-width:520px;margin:auto;background:#161B27;border:1px solid #232A3B;border-radius:16px;padding:32px"><img src="${process.env.CLIENT_URL}/logos.png" alt="HelpFundMe" width="56" height="56" style="border-radius:12px"><h1 style="font-size:24px">Verify your email</h1><p style="color:#9CA3B4">Hello ${name}, enter this one-time code to finish creating your account.</p><div style="font-size:36px;letter-spacing:10px;font-weight:700;color:#2EAD3E;padding:22px 0">${code}</div><p style="color:#9CA3B4">This code expires in 10 minutes. If you did not create this account, you can ignore this email.</p><p style="font-size:12px;color:#5C6478">Forgex Company Limited · HelpFundMe</p></div></div>`,
});

export const addAudienceContact = async (email: string, firstName: string) => {
  if (!process.env.RESEND_AUDIENCE_ID || !process.env.RESEND_API_KEY) return;
  await request(`/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, { email, first_name: firstName, unsubscribed: false });
};
