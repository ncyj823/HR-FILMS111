
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import { BookingStep, Movie, Seat, BookingDetails, User } from './types';
import { FEATURED_MOVIE, SHOW_TIMES, SEATS_DATA } from './constants';
import { getMovieInsights } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.MOVIE_INFO);
  const [selectedTime, setSelectedTime] = useState<string>(SHOW_TIMES[0]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingStepChange, setPendingStepChange] = useState<BookingStep | null>(null);

  // Ticket states
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Payment states
  const [paymentMode, setPaymentMode] = useState<'card' | 'personal'>('card');
  const [personalContact, setPersonalContact] = useState('');
  const [isNotifying, setIsNotifying] = useState(false);
  const [showOwnerAlert, setShowOwnerAlert] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      const data = await getMovieInsights(FEATURED_MOVIE.title);
      setInsights(data);
    };
    fetchInsights();
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
    if (pendingStepChange) {
      setStep(pendingStepChange);
      setPendingStepChange(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStep(BookingStep.MOVIE_INFO);
    setSelectedSeats([]);
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.isBooked) return;
    setSelectedSeats(prev => 
      prev.find(s => s.id === seat.id)
        ? prev.filter(s => s.id !== seat.id)
        : [...prev, seat]
    );
  };

  const totalAmount = selectedSeats.reduce((acc, seat) => acc + seat.price, 0);

  const handlePayment = () => {
    if (paymentMode === 'personal' && !personalContact) {
      alert("Please provide your contact info so the owner can reach you.");
      return;
    }

    if (paymentMode === 'personal') {
      setIsNotifying(true);
      // Simulate owner notification delay
      setTimeout(() => {
        setIsNotifying(false);
        setShowOwnerAlert(true);
        setTimeout(() => setShowOwnerAlert(false), 5000);
        completeBooking();
      }, 1500);
    } else {
      completeBooking();
    }
  };

  const completeBooking = () => {
    const details: BookingDetails = {
      movieId: FEATURED_MOVIE.id,
      selectedSeats,
      totalAmount,
      bookingDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      showTime: selectedTime,
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      paymentMethod: paymentMode,
      contactInfo: personalContact
    };
    setBookingDetails(details);
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
                  src={FEATURED_MOVIE.posterUrl} 
                  alt={FEATURED_MOVIE.title} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1000&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
            </div>
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-red-600 text-[10px] font-extrabold px-2 py-1 rounded tracking-widest uppercase">Now Booking</span>
                <span className="text-gray-400 text-sm">{FEATURED_MOVIE.rating} ★ Rating</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-oswald font-bold mb-6 tracking-tight leading-none uppercase italic">{FEATURED_MOVIE.title}</h1>
              <div className="flex flex-wrap gap-4 mb-8">
                {FEATURED_MOVIE.genre.map(g => (
                  <span key={g} className="text-xs text-white/60 border border-white/20 px-3 py-1 rounded-full">{g}</span>
                ))}
                <span className="text-xs text-white/60 border border-white/20 px-3 py-1 rounded-full">{FEATURED_MOVIE.duration}</span>
              </div>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-2xl">{FEATURED_MOVIE.description}</p>
              
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
                  {SHOW_TIMES.map(time => (
                    <button 
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all border ${
                        selectedTime === time ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/20 hover:border-white'
                      }`}
                    >
                      {time}
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
            </div>
          </div>
        )}

        {/* Step 2: Seat Selection */}
        {step === BookingStep.SEAT_SELECTION && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-oswald font-bold text-center mb-12 uppercase">Choose Your Vibe</h2>
            <div className="relative mb-16 px-10">
              <div className="h-2 w-full bg-white/20 rounded-t-full glow-white shadow-[0_-10px_30px_rgba(255,255,255,0.1)]"></div>
              <p className="text-center text-[10px] text-gray-600 font-bold tracking-[0.3em] mt-2 uppercase">Screen</p>
            </div>

            <div className="grid grid-cols-12 gap-3 mb-12">
              {SEATS_DATA.map((seat) => {
                const isSelected = selectedSeats.find(s => s.id === seat.id);
                return (
                  <button
                    key={seat.id}
                    disabled={seat.isBooked}
                    onClick={() => toggleSeat(seat)}
                    className={`aspect-square rounded-sm text-[8px] font-bold flex items-center justify-center transition-all ${
                      seat.isBooked ? 'bg-neutral-800 text-transparent cursor-not-allowed' :
                      isSelected ? 'bg-red-600 text-white scale-110 shadow-[0_0_10px_rgba(220,38,38,0.5)]' :
                      seat.type === 'vip' ? 'bg-amber-600/20 border border-amber-600/50 text-amber-600' :
                      seat.type === 'premium' ? 'bg-blue-600/20 border border-blue-600/50 text-blue-600' :
                      'bg-white/10 border border-white/10 text-white/40 hover:bg-white/20'
                    }`}
                  >
                    {seat.id}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-xs font-bold text-gray-500 mb-12 border-t border-white/5 pt-8">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-neutral-800"></div> Booked</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-white/10 border border-white/10"></div> Standard ($12.99)</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-blue-600/20 border border-blue-600/50"></div> Premium ($18.99)</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-amber-600/20 border border-amber-600/50"></div> VIP ($24.99)</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-red-600"></div> Selected</div>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 border border-white/10 shadow-2xl">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Seats Selection</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedSeats.length > 0 ? selectedSeats.map(s => (
                    <span key={s.id} className="text-white font-bold bg-white/10 px-2 py-1 rounded text-sm">{s.id}</span>
                  )) : <span className="text-gray-600 italic text-sm">No seats selected yet</span>}
                </div>
                <p className="text-2xl font-bold font-oswald">${totalAmount.toFixed(2)}</p>
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
                  <img src={FEATURED_MOVIE.posterUrl} className="w-20 h-28 object-cover rounded-lg border-2 border-red-600" alt="" />
                  <div>
                    <h4 className="font-bold text-lg mb-1">{FEATURED_MOVIE.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{selectedTime} • {FEATURED_MOVIE.duration}</p>
                    <p className="text-xs text-gray-500 italic">HR Cinema • Hall 4</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tickets ({selectedSeats.length})</span>
                    <span className="text-white font-bold">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service Fee</span>
                    <span className="text-white font-bold">$2.50</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="font-bold text-white">Total Pay</span>
                    <span className="text-2xl font-oswald font-bold text-red-500">${(totalAmount + 2.5).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-oswald font-bold mb-8 uppercase">Payment Details</h2>
              
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 mb-8">
                <button 
                  onClick={() => setPaymentMode('card')}
                  className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${paymentMode === 'card' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  <i className="fas fa-credit-card mr-2"></i> Digital Card
                </button>
                <button 
                  onClick={() => setPaymentMode('personal')}
                  className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${paymentMode === 'personal' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  <i className="fas fa-hand-holding-usd mr-2"></i> Personal Payment
                </button>
              </div>

              {paymentMode === 'card' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Card Number</label>
                    <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry</label>
                      <input type="text" placeholder="MM/YY" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">CVV</label>
                      <input type="password" placeholder="***" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-red-600 transition-colors" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-xl mb-6">
                    <p className="text-xs text-red-500 font-bold mb-1 uppercase tracking-widest">Personal Pay Flow</p>
                    <p className="text-[11px] text-gray-400">The owner will be notified to collect payment personally. Please provide your contact info below.</p>
                  </div>
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
              )}

              <div className="flex gap-4 pt-8">
                <button onClick={() => setStep(BookingStep.SEAT_SELECTION)} className="flex-1 py-4 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all">Back</button>
                <button 
                  onClick={handlePayment} 
                  disabled={isNotifying}
                  className="flex-[2] py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all glow-red disabled:opacity-50"
                >
                  {isNotifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-circle-notch animate-spin"></i> Alerting Owner...
                    </span>
                  ) : paymentMode === 'card' ? 'Pay Now' : 'Notify Owner & Book'}
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
                    <h3 className="text-2xl font-oswald font-bold leading-tight uppercase italic">{FEATURED_MOVIE.title}</h3>
                    <p className="text-[10px] text-red-500 font-bold tracking-[0.2em] uppercase mt-1">
                      {bookingDetails.paymentMethod === 'personal' ? 'Pending Payment Verification' : 'Confirmed Admission'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-40 uppercase">Transaction</p>
                    <p className="text-[10px] font-mono">{bookingDetails.transactionId}</p>
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
                  <div className="w-48 h-48 bg-black rounded flex items-center justify-center p-2">
                    <div className="grid grid-cols-5 gap-1 w-full h-full opacity-90">
                      {Array.from({length: 25}).map((_, i) => (
                        <div key={i} className={`rounded-[2px] ${Math.random() > 0.4 ? 'bg-white' : 'bg-transparent'}`}></div>
                      ))}
                    </div>
                  </div>
                  {bookingDetails.paymentMethod === 'personal' && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center pointer-events-none">
                      <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rotate-12 shadow-lg">UNVERIFIED</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">Show this QR at Entry</p>
                <div className="border-t border-dashed border-gray-200 pt-6 flex justify-between items-center text-left">
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Total Price</p>
                    <p className="text-xl font-oswald font-bold">${bookingDetails.totalAmount.toFixed(2)}</p>
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
