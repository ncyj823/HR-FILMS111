
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../src/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password.trim();

    try {
      if (!isLogin) {
        if (!formData.name.trim() || !trimmedEmail || !trimmedPassword) {
          setError('Please fill in all fields.');
          setIsLoading(false);
          return;
        }
        if (trimmedPassword.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }

        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', trimmedEmail)
          .single();

        if (existing) {
          setError('Email already registered. Please sign in instead.');
          setIsLoading(false);
          return;
        }

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            name: formData.name.trim(),
            email: trimmedEmail,
            password: trimmedPassword
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const user: User = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        };

        localStorage.setItem('hrfilm_currentUser', JSON.stringify(user));
        onLogin(user);
        onClose();
      } else {
        const { data: account, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', trimmedEmail)
          .single();

        if (fetchError || !account) {
          setError('Email not found. Please create an account first.');
          setIsLoading(false);
          return;
        }

        if (account.password !== trimmedPassword) {
          setError('Incorrect password. Please try again.');
          setIsLoading(false);
          return;
        }

        const user: User = {
          id: account.id,
          name: account.name,
          email: account.email
        };

        localStorage.setItem('hrfilm_currentUser', JSON.stringify(user));
        onLogin(user);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-oswald font-bold uppercase tracking-tighter">
              {isLogin ? 'Welcome Back' : 'Join HRFILM'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl">
                <p className="text-xs text-red-500 font-bold">Error: {error}</p>
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="email@example.com"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all glow-red disabled:opacity-50">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-circle-notch animate-spin"></i> Processing...
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({ name: '', email: '', password: '' });
                  setIsLoading(false);
                }}
                className="ml-2 text-white font-bold hover:text-red-500 transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
