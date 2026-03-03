import { useState } from 'react';
import { signIn } from '../lib/auth.js';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0D0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#18181B',
        border: '1px solid #2A2A2E',
        borderRadius: '12px',
        padding: '40px',
        width: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <h1 style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '20px',
          fontWeight: 700,
          color: '#E5E5EA',
          margin: '0 0 8px 0',
          letterSpacing: '-0.5px',
          textAlign: 'center',
        }}>
          ⬡ WORKPLAN
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            background: '#0D0D0F',
            border: '1px solid #2A2A2E',
            borderRadius: '6px',
            padding: '10px 12px',
            color: '#E5E5EA',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            background: '#0D0D0F',
            border: '1px solid #2A2A2E',
            borderRadius: '6px',
            padding: '10px 12px',
            color: '#E5E5EA',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
          }}
        />

        {error && (
          <div style={{
            color: '#E85D4A',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '8px 12px',
            background: 'rgba(232, 93, 74, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(232, 93, 74, 0.2)',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#2A2A2E',
            border: '1px solid #3A3A3E',
            borderRadius: '6px',
            padding: '10px',
            color: '#E5E5EA',
            fontSize: '13px',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            marginTop: '4px',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
