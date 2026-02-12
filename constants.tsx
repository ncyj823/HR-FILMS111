
import { Movie, Seat } from './types';

export const FEATURED_MOVIE: Movie = {
  id: 'm1',
  title: 'BORDER 2',
  genre: ['Action', 'War', 'Drama'],
  duration: '2h 55m',
  rating: '9.8',
  description: 'The saga of courage continues. In the sequel to the legendary masterpiece, witness the untold stories of heroes who stood firm at the frontier. A cinematic tribute to the spirit of the soldiers who sacrificed everything for the nation.',
  director: 'Anurag Singh',
  cast: ['Sunny Deol', 'Varun Dhawan', 'Diljit Dosanjh'],
  posterUrl: 'https://share.google/G3uGpaagDNnZIeZgF',
  backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=2000&auto=format&fit=crop',
  trailerId: 'grY3uX1Yj8U',
  releaseDate: 'January 23, 2026'
};

export const SHOW_TIMES = ['10:00 AM', '01:30 PM', '05:00 PM', '08:30 PM', '11:55 PM'];

const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  rows.forEach((row, rowIndex) => {
    for (let i = 1; i <= 12; i++) {
      let type: 'standard' | 'premium' | 'vip' = 'standard';
      let price = 12.99;

      if (rowIndex >= 6) {
        type = 'vip';
        price = 24.99;
      } else if (rowIndex >= 4) {
        type = 'premium';
        price = 18.99;
      }

      seats.push({
        id: `${row}${i}`,
        row,
        number: i,
        type,
        price,
        isBooked: Math.random() < 0.15 // Randomly book some seats
      });
    }
  });
  return seats;
};

export const SEATS_DATA = generateSeats();
