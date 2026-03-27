import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function AuthModal({ mode, onClose, onSwitch }) {
  const { signup, signin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (isSignup && (!name || !confirm))) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (isSignup && confirm !== password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signup({ name, email, password });
      } else {
        await signin({ email, password });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose}>{'\u2715'}</button>
        <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="auth-subtitle">
          {isSignup ? 'Join Fantasy League to manage your teams and trades.' : 'Sign in to your Fantasy League account.'}
        </p>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="auth-input-group">
              <label>Full Name</label>
              <input className="auth-input" type="text" placeholder="Marcus Johnson" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="auth-input-group">
            <label>Email Address</label>
            <input className="auth-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="auth-input-group">
            <label>Password</label>
            <input className="auth-input" type="password" placeholder={isSignup ? 'Min. 6 characters' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {isSignup && (
            <div className="auth-input-group">
              <label>Confirm Password</label>
              <input className="auth-input" type="password" placeholder="Re-enter your password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className={`auth-btn ${isSignup ? 'auth-btn-secondary' : 'auth-btn-primary'}`} disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <div className="auth-switch">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={onSwitch}>{isSignup ? 'Sign In' : 'Create one'}</button>
        </div>
      </div>
    </div>
  );
}
