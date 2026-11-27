import { useState } from 'react';
import { supabase } from './supabase';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) throw result.error;

      if (result.data.session) {
        onLogin(result.data.session.user);
      } else {
        alert('Registration successful! Check your email to confirm your account.');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      alert('Please enter your email address first.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      alert('Password reset email sent! Please check your inbox.');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>MauzoMate</h1>
        <p>{isLogin ? 'Welcome back!' : 'Create your business account'}</p>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          type="password"
          placeholder="Password (at least 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={8}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
        />

        {isLogin && (
          <button
            type="button"
            className="forgot-password-btn"
            onClick={handlePasswordReset}
            disabled={loading}
          >
            Forgot Password?
          </button>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <p>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="auth-toggle"
            onClick={() => setIsLogin(value => !value)}
            disabled={loading}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>
      </form>
    </div>
  );
}

export default Auth;
