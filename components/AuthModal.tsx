
import React, { useState } from 'react';
import { User } from '../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const accounts = JSON.parse(localStorage.getItem('hrfilm_accounts') || '[]');
      const trimmedEmail = formData.email.trim().toLowerCase();

      if (!isLogin) {
        // Sign up - create new account
        const newPassword = formData.password.trim();
        
        // Check if email already exists
        const emailExists = accounts.some((acc: any) => acc.email.toLowerCase() === trimmedEmail);
        if (emailExists) {
          setError('Email already registered. Please sign in instead.');
          setIsLoading(false);
          return;
        }

        // Validate form data
        if (!formData.name.trim() || !trimmedEmail || !newPassword) {
          setError('Please fill in all fields.');
          setIsLoading(false);
          return;
        }

        if (newPassword.length < 6) {
          setError('Password kam se kam 6 characters ka hona chahiye.');
          setIsLoading(false);
          return;
        }
        
        // Store account data
        const newAccount = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name.trim(),
          email: trimmedEmail,
          password: newPassword,
          bookingHistory: []
        };
        
        accounts.push(newAccount);
        localStorage.setItem('hrfilm_accounts', JSON.stringify(accounts));
        console.log('Account created:', newAccount);

        const user: User = {
          id: newAccount.id,
          name: newAccount.name,
          email: trimmedEmail
        };

        localStorage.setItem('hrfilm_currentUser', JSON.stringify(user));
        onLogin(user);
        onClose();
        setIsLoading(false);
        return;
      }

      const trimmedPassword = formData.password.trim();

      // Sign in - validate credentials
      console.log('Sign in attempt with email:', trimmedEmail);
      console.log('Stored accounts:', accounts);
      
      const account = accounts.find((acc: any) => acc.email.toLowerCase() === trimmedEmail);

      if (!account) {
        setError('Email not found. Please create an account first.');
        setIsLoading(false);
        return;
      }

      if (account.password !== trimmedPassword) {
        setError('Incorrect password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Successful login
      const user: User = {
        id: account.id,
        name: account.name,
        email: account.email
      };

      // Store current user in localStorage
      localStorage.setItem('hrfilm_currentUser', JSON.stringify(user));

      onLogin(user);
      onClose();
      setIsLoading(false);
    }, 500);
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
