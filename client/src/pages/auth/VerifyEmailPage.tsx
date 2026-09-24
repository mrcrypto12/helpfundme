import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to="/dashboard" replace />;

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1); const next = [...digits]; next[index] = digit; setDigits(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };
  const verify = async () => {
    const code = digits.join(''); if (code.length !== 6) { toast.error('Enter all six digits'); return; }
    setLoading(true);
    try { const { data } = await api.post('/auth/email/verify', { code }); updateUser(data.user); toast.success(data.message); navigate('/dashboard'); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Verification failed'); }
    finally { setLoading(false); }
  };
  const resend = async () => { try { const { data } = await api.post('/auth/email/resend'); toast.success(data.message); } catch (error: any) { toast.error(error.response?.data?.message || 'Unable to resend code'); } };

  return <div className="auth-page"><div className="auth-container"><div className="auth-card"><div className="auth-header"><img className="auth-logo" src="/logos.png" alt="HelpFundMe logo" /><h1>Verify your email</h1><p>Enter the six-digit code sent to {user.email}</p></div><div className="otp-grid">{digits.map((digit, index) => <input key={index} ref={(el) => { refs.current[index] = el; }} className="form-input otp-input" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => setDigit(index, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !digit && index > 0) refs.current[index - 1]?.focus(); }} />)}</div><button className="btn btn-primary btn-block btn-lg" disabled={loading} onClick={verify}>{loading ? 'Verifying...' : 'Verify email'}</button><button className="btn btn-ghost btn-block" onClick={resend}>Send a new code</button><p className="form-helper" style={{ textAlign: 'center', marginTop: 12 }}>Codes expire after 10 minutes. In offline development without Resend, check the server terminal.</p></div></div></div>;
};
export default VerifyEmailPage;
