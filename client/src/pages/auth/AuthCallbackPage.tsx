import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      // The AuthContext will pick up the token and fetch user
      setTimeout(() => navigate('/dashboard'), 500);
    } else {
      navigate('/login?error=auth_failed');
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="auth-page">
      <div style={{ textAlign: 'center' }}>
        <div className="loader" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
