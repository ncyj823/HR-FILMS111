import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import { BookingStep, Seat, BookingDetails, User } from './types';
import { FEATURED_MOVIES, SHOW_TIMES, SEATS_DATA } from './constants';
import { getMovieInsights } from './services/geminiService';
import { SHOW_TIMES_DATA } from './constants';
import BeautifulQR from './src/lib/qr';
import { supabase } from './src/supabaseClient';

const App: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.MOVIE_INFO);
  const [selectedTime, setSelectedTime] = useState<string>(SHOW_TIMES[0]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  const [bookingId, setBookingId] = useState('');

  const [selectedMovieId, setSelectedMovieId] = useState<string>(FEATURED_MOVIES[0].id);
  const selectedMovie = FEATURED_MOVIES.find(m => m.id === selectedMovieId) ?? FEATURED_MOVIES[0];
  const selectedShowDetails = SHOW_TIMES_DATA.find(show => show.time === selectedTime) ?? SHOW_TIMES_DATA[0];
  const showTimeValue = selectedShowDetails?.time ?? selectedTime;
  const showScheduleLabel = selectedShowDetails?.date
    ? `${selectedShowDetails.date} • ${showTimeValue}`
    : `${selectedMovie.releaseDate} • ${showTimeValue}`;

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingStepChange, setPendingStepChange] = useState<BookingStep | null>(null);

  // Ticket states
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const [personalContact, setPersonalContact] = useState<string>('');

  // Payment states
  const [paymentChannel, setPaymentChannel] = useState<'gcash' | 'phonepe'>('gcash');
  const [gcashRefNo, setGcashRefNo] = useState('');
  const [phonepeUtrNo, setPhonepeUtrNo] = useState('');
  const [isNotifying, setIsNotifying] = useState(false);
  const [showOwnerAlert, setShowOwnerAlert] = useState(false);
  const currencySymbol = paymentChannel === 'gcash' ? '₱' : '₹';

  const fetchLockedSeats = useCallback(async () => {
    const { data, error } = await supabase
      .from('seat_locks')
      .select('seat_id')
      .eq('movie', selectedMovie.title)
      .eq('show_time', selectedTime)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching locked seats:', error);
      return;
    }

    setLockedSeats(data?.map(entry => entry.seat_id) || []);
  }, [selectedMovie.title, selectedTime]);

  const getSeatPrice = (row: string) => {
    // GCash prices are in PHP, PhonePe prices are in INR
    if (paymentChannel === 'gcash') {
      // Conversion: 800 INR = 500 PHP, 950 INR = 650 PHP, 1100 INR = 700 PHP
      if (row === 'A' || row === 'B'|| row ==='C') return 450;
      if (row === 'D' || row === 'E' || row === 'F' || row === 'G') return 550;
      return 650; // G to L
    } else {
      // PhonePe prices in INR
      if (row === 'A' || row === 'B'|| row ==='C') return 662;
      if (row === 'D' || row === 'E' || row === 'F' || row === 'G') return 809;
      return 956; // G to L
    }
  };

  const lockSeat = async (seatId: string) => {
    try {
      await supabase.from('seat_locks').upsert({
        seat_id: seatId,
        movie: selectedMovie.title,
        show_time: selectedTime,
        locked_by: currentUser?.email || 'guest',
        locked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Error locking seat:', error);
    }
  };

  const unlockSeat = async (seatId: string) => {
    try {
      await supabase
        .from('seat_locks')
        .delete()
        .eq('seat_id', seatId)
        .eq('locked_by', currentUser?.email || 'guest');
    } catch (error) {
      console.error('Error unlocking seat:', error);
    }
  };

  useEffect(() => {
    // Load user data from localStorage on app load
    const storedUser = localStorage.getItem('hrfilm_currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
    
    // Fetch movie insights
    const fetchInsights = async () => {
      const data = await getMovieInsights(selectedMovie.title);
      setInsights(data);
    };
    fetchInsights();
  }, [selectedMovie.title]);

  useEffect(() => {
    const storedSeats = localStorage.getItem('hrfilm_bookedSeats');
    if (storedSeats) {
      try {
        setBookedSeats(JSON.parse(storedSeats));
      } catch (error) {
        console.error('Error parsing booked seats:', error);
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'hrfilm_bookedSeats' && event.newValue) {
        try {
          setBookedSeats(JSON.parse(event.newValue));
        } catch (error) {
          console.error('Error syncing booked seats:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    fetchLockedSeats();

    const channel = supabase
      .channel(`seat_locks_${selectedMovie.id}_${selectedTime}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seat_locks' },
        () => fetchLockedSeats()
      )
      .subscribe();

    const pollInterval = setInterval(fetchLockedSeats, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [selectedMovie.id, selectedTime, fetchLockedSeats]);

  useEffect(() => {
    fetch('https://hr-films111-1.onrender.com/ping').catch(() => {});

    const keepAlive = setInterval(() => {
      fetch('https://hr-films111-1.onrender.com/ping').catch(() => {});
    }, 10 * 60 * 1000);

    return () => clearInterval(keepAlive);
  }, []);

  const handleBookingStart = () => {
    if (!currentUser) {
      setPendingStepChange(BookingStep.SEAT_SELECTION);
      setIsAuthModalOpen(true);
    } else {
      setStep(BookingStep.SEAT_SELECTION);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    
    // Load user's booking history from account
    const accounts = JSON.parse(localStorage.getItem('hrfilm_accounts') || '[]');
    const userAccount = accounts.find((acc: any) => acc.email === user.email);
    
    if (userAccount && userAccount.bookingHistory && userAccount.bookingHistory.length > 0) {
      // User has previous bookings - you can display them as needed
      console.log('User has booking history:', userAccount.bookingHistory);
    }
    
    if (pendingStepChange) {
      setStep(pendingStepChange);
      setPendingStepChange(null);
    }
  };

  const handleLogout = () => {
    // Save current booking details to user's account history before logout
    if (currentUser && bookingDetails) {
      const accounts = JSON.parse(localStorage.getItem('hrfilm_accounts') || '[]');
      const userIndex = accounts.findIndex((acc: any) => acc.email === currentUser.email);
      
      if (userIndex !== -1) {
        if (!accounts[userIndex].bookingHistory) {
          accounts[userIndex].bookingHistory = [];
        }
        accounts[userIndex].bookingHistory.push({
          ...bookingDetails,
          bookingDate: new Date().toISOString()
        });
        localStorage.setItem('hrfilm_accounts', JSON.stringify(accounts));
      }
    }
    
    localStorage.removeItem('hrfilm_currentUser');
    setCurrentUser(null);
    setStep(BookingStep.MOVIE_INFO);
    setSelectedSeats([]);
  };

  const resetSeatSelection = async () => {
    // Unlock all currently selected seats
    for (const seat of selectedSeats) {
      await unlockSeat(seat.id);
    }
    // Clear the selected seats
    setSelectedSeats([]);
  };

  const clearBookedSeats = () => {
    // Owner function to clear all booked seats from localStorage
    localStorage.removeItem('hrfilm_bookedSeats');
    setBookedSeats([]);
    alert('All booked seats have been cleared from storage. You can now rebook seats.');
  };

  const toggleSeat = async (seat: Seat) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const isBookedSeat = seat.isBooked || bookedSeats.includes(seat.id);
    const isLockedByOther = lockedSeats.includes(seat.id) && !isSelected;

    if (isBookedSeat || isLockedByOther) return;

    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      await unlockSeat(seat.id);
    } else {
      setSelectedSeats(prev => ([
        ...prev,
        {
          ...seat,
          price: getSeatPrice(seat.row)
        }
      ]));
      await lockSeat(seat.id);
    }
  };

  const totalAmount = selectedSeats.reduce((acc, seat) => {
    const currentPrice = getSeatPrice(seat.row);
    return acc + currentPrice;
  }, 0);

  const handleBooking = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://hr-films111-1.onrender.com/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          name: currentUser?.name || 'Guest',
          email: currentUser?.email || '',
          phone: personalContact,
          seats: selectedSeats.map(seat => seat.id),
          movie: selectedMovie.title,
          paymentMethod: paymentChannel,
          referenceNo: paymentChannel === 'gcash' ? gcashRefNo : phonepeUtrNo
        })
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Booking failed');

      setBookingId(data.bookingId);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert('Server took too long to respond. Please try again in 30 seconds.');
      } else {
        alert(error instanceof Error ? error.message : 'Booking failed');
      }
      return false;
    }
  };

  const handleManualPayment = async () => {
    const referenceNo = paymentChannel === 'gcash' ? gcashRefNo : phonepeUtrNo;

    if (!referenceNo) {
      alert(`Please enter your ${paymentChannel === 'gcash' ? 'GCash Reference Number' : 'PhonePe UTR Number'}`);
      return;
    }

    if (!personalContact) {
      alert("Please provide your contact info so the owner can reach you.");
      return;
    }

    setIsNotifying(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://hr-films111-1.onrender.com/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          name: currentUser?.name || 'Guest',
          email: currentUser?.email || '',
          phone: personalContact,
          seats: selectedSeats.map(seat => seat.id),
          movie: selectedMovie.title,
          paymentMethod: paymentChannel,
          referenceNo
        })
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || 'Booking failed');

      setBookingId(data.bookingId);
      setIsNotifying(false);
      setShowOwnerAlert(true);
      setTimeout(() => setShowOwnerAlert(false), 5000);
      completeBooking('personal');
    } catch (error: any) {
      setIsNotifying(false);
      if (error.name === 'AbortError') {
        alert('Server is waking up, please try again in 30 seconds.');
      } else {
        alert(error instanceof Error ? error.message : 'Booking failed');
      }
    }
  };

  const handlePayment = async () => {
    if (!personalContact) {
      alert("Please provide your contact info so the owner can reach you.");
      return;
    }

    setIsNotifying(true);
    const bookingOk = await handleBooking();
    if (!bookingOk) {
      setIsNotifying(false);
      return;
    }
    // Simulate owner notification delay
    setTimeout(() => {
      setIsNotifying(false);
      setShowOwnerAlert(true);
      setTimeout(() => setShowOwnerAlert(false), 5000);
      completeBooking('card');
    }, 1500);
  };

  const completeBooking = (method: BookingDetails['paymentMethod']) => {
    const details: BookingDetails = {
      movieId: selectedMovie.id,
      selectedSeats,
      totalAmount,
      bookingDate: selectedMovie.releaseDate,
      showTime: selectedTime,
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      paymentMethod: method,
      paymentChannel,
      contactInfo: personalContact
    };
    
    setBookingDetails(details);

    const newlyBookedSeatIds = selectedSeats.map(seat => seat.id);
    if (newlyBookedSeatIds.length > 0) {
      const updatedSeatSet = Array.from(new Set([...bookedSeats, ...newlyBookedSeatIds]));
      setBookedSeats(updatedSeatSet);
      localStorage.setItem('hrfilm_bookedSeats', JSON.stringify(updatedSeatSet));
    }
    
    // Save booking to user's account
    if (currentUser) {
      const accounts = JSON.parse(localStorage.getItem('hrfilm_accounts') || '[]');
      const userIndex = accounts.findIndex((acc: any) => acc.email === currentUser.email);
      
      if (userIndex !== -1) {
        if (!accounts[userIndex].bookingHistory) {
          accounts[userIndex].bookingHistory = [];
        }
        accounts[userIndex].bookingHistory.push({
          ...details,
          bookingId: bookingId,
          bookingDateTime: new Date().toISOString()
        });
        localStorage.setItem('hrfilm_accounts', JSON.stringify(accounts));
      }
    }
    
    setStep(BookingStep.TICKET);
  };

  const downloadQRCode = () => {
    if (!bookingDetails) return;
    
    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'black';
    const padding = 20;
    const moduleSize = (size - padding * 2) / 10;
    
    let seed = 0;
    for (let i = 0; i < bookingDetails.transactionId.length; i++) {
        seed += bookingDetails.transactionId.charCodeAt(i);
    }
    const seededRandom = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const isCorner = (i < 3 && j < 3) || (i > 6 && j < 3) || (i < 3 && j > 6);
        if (isCorner) {
            ctx.fillRect(padding + i * moduleSize, padding + j * moduleSize, moduleSize, moduleSize);
        } else if (seededRandom() > 0.4) {
            ctx.fillRect(padding + i * moduleSize, padding + j * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `HRFILM-QR-${bookingDetails.transactionId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleResendTicket = () => {
    setIsResending(true);
    setResendSuccess(false);
    setTimeout(() => {
      setIsResending(false);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    }, 2000);
  };

  return (
    <Layout 
      user={currentUser} 
      onAuthClick={() => setIsAuthModalOpen(true)} 
      onLogout={handleLogout}
    >
      {/* Simulated Owner Notification Toast */}
      {showOwnerAlert && (
        <div className="fixed bottom-10 right-10 z-[200] animate-bounce">
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Owner Dashboard Alert</p>
              <p className="text-sm font-bold">New Ticket Request via {bookingDetails?.contactInfo || 'Contact'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Step Indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            {[BookingStep.MOVIE_INFO, BookingStep.SEAT_SELECTION, BookingStep.PAYMENT, BookingStep.TICKET].map((s, idx) => {
              const order = [BookingStep.MOVIE_INFO, BookingStep.SEAT_SELECTION, BookingStep.PAYMENT, BookingStep.TICKET];
              const currentIdx = order.indexOf(step);
              const stepIdx = order.indexOf(s);
              
              return (
                <React.Fragment key={s}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    step === s ? 'bg-red-600 border-red-600 scale-125' : 
                    currentIdx > stepIdx ? 'bg-white border-white text-black' : 'border-white/20 text-white/20'
                  }`}>
                    {currentIdx > stepIdx ? <i className="fas fa-check text-xs"></i> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  {idx < 3 && <div className={`w-12 h-0.5 ${currentIdx > stepIdx ? 'bg-white' : 'bg-white/10'}`}></div>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step 1: Movie Info */}
        {step === BookingStep.MOVIE_INFO && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 relative overflow-hidden rounded-2xl shadow-2xl shadow-black border-4 border-red-600 glow-red">
              <div className="aspect-[2/3] w-full bg-neutral-900">
                <img 
                  src={selectedMovie.posterUrl} 
                  alt={selectedMovie.title} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://dmsypezifjzqiugoyciq.supabase.co/storage/v1/object/public/poster/Gemini_Generated_Image_b8gvxzb8gvxzb8gv.png';
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
            </div>
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-red-600 text-[10px] font-extrabold px-2 py-1 rounded tracking-widest uppercase">Now Booking</span>
                <span className="text-gray-400 text-sm">{selectedMovie.rating} ★ Rating</span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase">Featured Movie</label>
                <select
                  className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm"
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                >
                  {FEATURED_MOVIES.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <h1 className="text-5xl md:text-7xl font-oswald font-bold mb-6 tracking-tight leading-none uppercase italic">{selectedMovie.title}</h1>
              <div className="flex flex-wrap gap-4 mb-8">
                {selectedMovie.genre.map(g => (
                  <span key={g} className="text-xs text-white/60 border border-white/20 px-3 py-1 rounded-full">{g}</span>
                ))}
                <span className="text-xs text-white/60 border border-white/20 px-3 py-1 rounded-full">{selectedMovie.duration}</span>
              </div>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-2xl">{selectedMovie.description}</p>
              
              <div className="mb-10">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fas fa-sparkles"></i> AI Exclusive Insights
                </h3>
                <ul className="space-y-3">
                  {insights.length > 0 ? insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                      {insight}
                    </li>
                  )) : (
                    <li className="text-gray-500 animate-pulse text-sm">Syncing with cinematic database...</li>
                  )}
                </ul>
              </div>

              <div className="mb-10">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Select Show Time</h3>
                <div className="flex flex-wrap gap-3">
                  {SHOW_TIMES_DATA.map(showTime => (
                    <button 
                      key={showTime.time}
                      onClick={() => setSelectedTime(showTime.time)}
                      className={`px-5 py-3 rounded-lg text-sm font-bold transition-all border flex flex-col items-start ${
                        selectedTime === showTime.time ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-white border-white/20 hover:border-white'
                      }`}
                    >
                      <span>{showTime.time}</span>
                        {showTime.date && (
                          <span className="text-[10px] font-semibold opacity-80">{showTime.date}</span>
                        )}
                        <span className="text-[10px] font-bold opacity-75">{showTime.location}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleBookingStart}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-xl text-lg transition-all glow-red"
              >
                {currentUser ? 'Book Your Seats' : 'Sign In to Book'}
              </button>
              
              {currentUser?.role === 'owner' && (
                <button 
                  onClick={clearBookedSeats}
                  className="w-full md:w-auto ml-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-12 rounded-xl text-lg transition-all"
                >
                  Clear Booked Seats
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Seat Selection */}
        {step === BookingStep.SEAT_SELECTION && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-oswald font-bold text-center mb-12 uppercase">Choose Your Vibe</h2>
            
            {/* Screen */}
            <div className="relative mb-16 px-10">
              <div className="h-3 w-full bg-gradient-to-b from-white/30 to-white/10 rounded-t-full glow-white shadow-[0_-10px_30px_rgba(255,255,255,0.2)]"></div>
              <p className="text-center text-[10px] text-gray-400 font-bold tracking-[0.4em] mt-3 uppercase">Screen</p>
            </div>

            {/* Seating Layout */}
            <div className="seating-wrapper mb-12 overflow-x-auto pb-4">
              <div className="min-w-max mx-auto px-6">
                {(() => {
                const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
                const seats = SEATS_DATA;

                const renderSeat = (seat: Seat) => {
                  const isAlreadyBooked = seat.isBooked || bookedSeats.includes(seat.id);
                  const isSelected = selectedSeats.some(s => s.id === seat.id);
                  const isLocked = lockedSeats.includes(seat.id);
                  const isLockedByOther = isLocked && !isSelected;
                  return (
                    <button
                      key={seat.id}
                      disabled={isAlreadyBooked || isLockedByOther}
                      onClick={() => toggleSeat(seat)}
                      className={`w-8 h-8 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                        isAlreadyBooked ? 'bg-neutral-800 text-neutral-700 cursor-not-allowed' :
                        isLockedByOther ? 'bg-orange-500 text-white cursor-not-allowed' :
                        isSelected ? 'bg-red-600 text-white scale-110 shadow-[0_0_15px_rgba(220,38,38,0.6)]' :
                        'bg-white/10 border border-white/20 text-white/50 hover:bg-white/20 hover:border-white/40'
                      }`}
                    >
                      {seat.id}
                    </button>
                  );
                };

                return (
                  <div className="seating-container space-y-3 min-w-[680px]">
                    {rows.map((row) => {
                      const rowSeats = seats.filter(seat => seat.row === row);
                      const left = rowSeats.filter(seat => seat.number <= 6);
                      const center = rowSeats.filter(seat => seat.number >= 7 && seat.number <= 18);
                      const right = rowSeats.filter(seat => seat.number >= 19);

                      return (
                        <div key={row} className="flex items-center justify-center gap-4 md:gap-8">
                          {/* Left Block */}
                          <div className="flex gap-1 md:gap-2">
                            {left.map(seat => renderSeat(seat))}
                          </div>

                          {/* Center Block */}
                          <div className="flex gap-1 md:gap-2 px-2 md:px-4">
                            {center.map(seat => renderSeat(seat))}
                          </div>

                          {/* Right Block */}
                          <div className="flex gap-1 md:gap-2">
                            {right.map(seat => renderSeat(seat))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
                })()}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-8 text-xs font-bold text-gray-500 mb-12 border-t border-white/5 pt-8">
              <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-neutral-800"></div> Booked</div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-white/10 border border-white/20"></div> Available</div>
              <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-600"></div> Selected</div>
            </div>

            {/* Summary Panel */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 border border-white/10 shadow-2xl">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Seats Selection</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedSeats.length > 0 ? selectedSeats.map(s => (
                    <span key={s.id} className="text-white font-bold bg-white/10 px-2 py-1 rounded text-sm">{s.id}</span>
                  )) : <span className="text-gray-600 italic text-sm">No seats selected yet</span>}
                </div>
                <p className="text-2xl font-bold font-oswald">{currencySymbol}{totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(BookingStep.MOVIE_INFO)} className="px-8 py-3 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all">Back</button>
                <button 
                  disabled={selectedSeats.length === 0}
                  onClick={() => setStep(BookingStep.PAYMENT)}
                  className={`px-12 py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedSeats.length > 0 ? 'bg-red-600 text-white hover:bg-red-700 glow-red' : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Confirm Seats
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === BookingStep.PAYMENT && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-oswald font-bold mb-8 uppercase">Order Summary</h2>
              <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
                <div className="p-6 border-b border-white/5 flex gap-4">
                  <img src={selectedMovie.posterUrl} className="w-20 h-28 object-cover rounded-lg border-2 border-red-600" alt="" />
                  <div>
                    <h4 className="font-bold text-lg mb-1">{selectedMovie.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{showScheduleLabel} • {selectedMovie.duration}</p>
                    <p className="text-xs text-gray-500 italic">HR Cinema • Vista mall Laspinas </p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="font-bold text-white">Total Pay</span>
                    <span className="text-2xl font-oswald font-bold text-red-500">{currencySymbol}{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-oswald font-bold mb-8 uppercase">Payment Details</h2>
              
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-xl mb-6">
                  <p className="text-xs text-red-500 font-bold mb-1 uppercase tracking-widest">Personal Pay Flow</p>
                  <p className="text-[11px] text-gray-400">The owner will be notified to collect payment personally. Please provide your contact info below.</p>
                </div>
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setPaymentChannel('gcash')}
                    className={`flex-1 px-6 py-3 rounded-xl border transition-all ${
                      paymentChannel === 'gcash'
                        ? "border-green-500 bg-green-500/10"
                        : "border-white/20"
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    onClick={() => setPaymentChannel('phonepe')}
                    className={`flex-1 px-6 py-3 rounded-xl border transition-all ${
                      paymentChannel === 'phonepe'
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/20"
                    }`}
                  >
                    PhonePe
                  </button>
                </div>
                
                {paymentChannel === 'gcash' ? (
                  <div className="bg-white/5 p-4 rounded-xl mb-6">
                    <p className="text-sm mb-2">
                      Pay {currencySymbol}{totalAmount} to GCash:
                    </p>
                    <p className="text-lg font-bold">
                      09616899687
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/5 p-4 rounded-xl mb-6">
                    <p className="text-sm mb-2">
                      Pay {currencySymbol}{totalAmount} to PhonePe:
                    </p>
                    <p className="text-lg font-bold">
                      +918160744501
                    </p>
                  </div>
                )}

                {paymentChannel === 'gcash' ? (
                  <input
                    type="text"
                    placeholder="Enter GCash Reference Number"
                    value={gcashRefNo}
                    onChange={(e) => setGcashRefNo(e.target.value)}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 mb-6"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Enter PhonePe UTR Number"
                    value={phonepeUtrNo}
                    onChange={(e) => setPhonepeUtrNo(e.target.value)}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 mb-6"
                  />
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contact Phone or Email</label>
                  <input 
                    type="text" 
                    placeholder="+1 234 567 8900 or mail@domain.com" 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors"
                    value={personalContact}
                    onChange={(e) => setPersonalContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button onClick={() => setStep(BookingStep.SEAT_SELECTION)} className="flex-1 py-4 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all">Back</button>
                <button
                  onClick={handleManualPayment}
                  disabled={isNotifying}
                  className="flex-[2] py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all glow-red disabled:opacity-50"
                >
                  {isNotifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-circle-notch animate-spin"></i> Processing...
                    </span>
                  ) : 'Submit Payment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Digital Ticket */}
        {step === BookingStep.TICKET && bookingDetails && (
          <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <i className="fas fa-check text-2xl text-white"></i>
              </div>
              <h2 className="text-3xl font-oswald font-bold uppercase mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 text-sm">
                {bookingDetails.paymentMethod === 'personal' 
                  ? `Owner notified via ${bookingDetails.contactInfo}. Please settle payment personally.`
                  : `Hi ${currentUser?.name}, your digital pass is ready.`}
              </p>
            </div>

            <div className="bg-white text-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/20 mb-8">
              <div className="p-8 bg-black text-white relative border-b-2 border-dashed border-white/20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-oswald font-bold leading-tight uppercase italic">{selectedMovie.title}</h3>
                    <p className="text-[10px] text-red-500 font-bold tracking-[0.2em] uppercase mt-1">
                      {bookingDetails.paymentMethod === 'personal' ? 'Pending Payment Verification' : 'Confirmed Admission'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-40 uppercase">Booking ID</p>
                    <p className="text-[10px] font-mono">{bookingId || bookingDetails.transactionId}</p>
                    <p className="mt-2 text-[10px] font-bold opacity-40 uppercase">Movie</p>
                    <p className="text-[10px] font-mono">{selectedMovie.title}</p>
                  </div>
                </div>

                <div className="mb-6 pt-4 border-t border-white/10">
                  <p className="text-[10px] uppercase opacity-40 font-bold">Ticket Holder</p>
                  <p className="text-lg font-oswald font-bold uppercase tracking-wide">{currentUser?.name || 'Guest User'}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-[10px] uppercase opacity-40 font-bold">Showtime</p>
                    <p className="text-sm font-bold">{bookingDetails.showTime}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-40 font-bold">Hall</p>
                    <p className="text-sm font-bold">Imax Hall 4</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] uppercase opacity-40 font-bold">Date</p>
                    <p className="text-sm font-bold">{bookingDetails.bookingDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-40 font-bold">Seats</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {bookingDetails.selectedSeats.map(s => (
                        <span key={s.id} className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold border border-white/5">
                          {s.id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#050505] rounded-full"></div>
                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#050505] rounded-full"></div>
              </div>

              <div className="p-10 text-center bg-white" ref={qrRef}>
                <div className="bg-white p-4 inline-block border-2 border-black rounded-2xl mb-6 relative">
                  <BeautifulQR value={bookingId || bookingDetails.transactionId} />
                  {bookingDetails.paymentMethod === 'personal' && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center pointer-events-none">
                      <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rotate-12 shadow-lg">...</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">Show this QR at Entry</p>
                <div className="border-t border-dashed border-gray-200 pt-6 flex justify-between items-center text-left">
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Total Price</p>
                    <p className="text-xl font-oswald font-bold">{bookingDetails.paymentChannel === 'gcash' ? '₱' : '₹'}{bookingDetails.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={downloadQRCode}
                      className="bg-black text-white p-2.5 rounded-lg hover:bg-neutral-800 transition-all flex items-center justify-center"
                      title="Download QR"
                    >
                      <i className="fas fa-download text-xs"></i>
                    </button>
                    <button className="bg-black text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-neutral-800 transition-all">
                      SAVE PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={handleResendTicket}
                disabled={isResending}
                className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                  resendSuccess 
                    ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {isResending ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-circle-notch animate-spin"></i> Sending...
                  </span>
                ) : resendSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-check"></i> Sent to Email
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-paper-plane"></i> Resend Ticket to Email
                  </span>
                )}
              </button>

              <button 
                onClick={() => { setStep(BookingStep.MOVIE_INFO); setSelectedSeats([]); setPersonalContact(''); }}
                className="w-full py-4 text-sm font-bold text-white/40 hover:text-white transition-all uppercase tracking-widest"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLogin={handleLogin}
      />
    </Layout>
  );
};

export default App;
