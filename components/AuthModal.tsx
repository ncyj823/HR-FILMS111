
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name || formData.email.split('@')[0],
      email: formData.email
    };
    onLogin(user);
    onClose();
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

            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all glow-red">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => setIsLogin(!isLogin)}
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
