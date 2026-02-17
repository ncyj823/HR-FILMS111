
export enum BookingStep {
  MOVIE_INFO = 'MOVIE_INFO',
  SEAT_SELECTION = 'SEAT_SELECTION',
  PAYMENT = 'PAYMENT',
  TICKET = 'TICKET'
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Movie {
  id: string;
  title: string;
  genre: string[];
  duration: string;
  rating: string;
  description: string;
  director: string;
  cast: string[];
  posterUrl: string;
  backdropUrl: string;
  trailerId: string;
  releaseDate: string;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  type: 'standard' | 'premium' | 'vip';
  price: number;
  isBooked: boolean;
}

export interface BookingDetails {
  movieId: string;
  selectedSeats: Seat[];
  totalAmount: number;
  bookingDate: string;
  showTime: string;
  transactionId: string;
  paymentMethod: 'card' | 'personal';
  paymentChannel: 'gcash' | 'phonepe';
  contactInfo?: string;
}
