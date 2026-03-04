import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, userEmail }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!userEmail) return;
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (data && !error) {
        setIsAdmin(true);
      }
    };

    checkAdminStatus();
  }, [userEmail]);

  // Load statistics
  const loadStats = async () => {
    const { data: seatData } = await supabase
      .from('seats')
      .select('is_booked, movie_id, show_time');

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('total_amount');

    if (seatData) {
      const totalSeats = seatData.length;
      const bookedSeats = seatData.filter(s => s.is_booked).length;
      const totalRevenue = bookingData?.reduce((acc, b) => acc + Number(b.total_amount || 0), 0) || 0;

      setStats({
        totalSeats,
        bookedSeats,
        availableSeats: totalSeats - bookedSeats,
        totalRevenue,
        bookingCount: bookingData?.length || 0
      });
    }
  };

  // Reset all seats
  const resetAllSeats = async () => {
    if (!window.confirm('⚠️ Are you sure you want to RESET ALL SEATS? This will unbook all seats!')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('seats')
        .update({ 
          is_booked: false, 
          booked_by: null, 
          booked_at: null,
          booking_id: null
        })
        .neq('seat_number', ''); // Update all seats

      if (error) {
        alert('Error resetting seats: ' + error.message);
      } else {
        alert('✅ All seats have been reset successfully!');
        loadStats();
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // Clear expired locks
  const clearExpiredLocks = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('seat_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        alert('Error clearing locks: ' + error.message);
      } else {
        alert('✅ Expired locks cleared!');
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    // Simple password check (in production, use proper authentication)
    if (adminPassword === import.meta.env.VITE_ADMIN_PASSWORD || adminPassword === 'hrfilms2026') {
      setIsAuthenticated(true);
      loadStats();
    } else {
      alert('Invalid admin password');
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin && isAuthenticated) {
      loadStats();
    }
  }, [isOpen, isAdmin, isAuthenticated]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl max-w-2xl w-full p-8 border-2 border-red-600 shadow-2xl shadow-red-600/20">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-all"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-red-600 text-2xl"></i>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">
            Admin Control Panel
          </h2>
          <p className="text-gray-400 text-sm">Owner Dashboard - HR Films</p>
        </div>

        {!isAuthenticated ? (
          /* Password Login */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter admin password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600"
              />
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
            >
              Login as Admin
            </button>
            <p className="text-xs text-gray-500 text-center">
              Default password: hrfilms2026 (change in production)
            </p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
                  <p className="text-xs text-green-400 uppercase font-bold mb-1">Total Revenue</p>
                  <p className="text-2xl font-black text-green-400">₱{stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                  <p className="text-xs text-blue-400 uppercase font-bold mb-1">Total Bookings</p>
                  <p className="text-2xl font-black text-blue-400">{stats.bookingCount}</p>
                </div>
                <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                  <p className="text-xs text-purple-400 uppercase font-bold mb-1">Booked Seats</p>
                  <p className="text-2xl font-black text-purple-400">{stats.bookedSeats} / {stats.totalSeats}</p>
                </div>
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
                  <p className="text-xs text-yellow-400 uppercase font-bold mb-1">Available Seats</p>
                  <p className="text-2xl font-black text-yellow-400">{stats.availableSeats}</p>
                </div>
              </div>
            )}

            {/* Admin Actions */}
            <div className="space-y-4">
              <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4 mb-4">
                <p className="text-xs text-red-400 font-bold mb-1">⚠️ WARNING</p>
                <p className="text-sm text-gray-400">These actions are permanent and cannot be undone!</p>
              </div>

              <button
                onClick={resetAllSeats}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><i className="fas fa-circle-notch animate-spin"></i> Processing...</>
                ) : (
                  <><i className="fas fa-undo"></i> RESET ALL SEATS</>
                )}
              </button>

              <button
                onClick={clearExpiredLocks}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash"></i> Clear Expired Locks
              </button>

              <button
                onClick={loadStats}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-sync"></i> Refresh Stats
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400 mb-2">
                <strong>Owner Email:</strong> {userEmail || 'Not logged in'}
              </p>
              <p className="text-xs text-gray-400">
                <strong>Access Level:</strong> {isAdmin ? '✅ Full Admin Access' : '❌ No Admin Access'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
