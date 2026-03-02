import { Movie, Seat, ShowTimeSlot } from './types';

export const FEATURED_MOVIES: Movie[] = [
  
  {
    id: 'm2',
    title: 'Toxic: A Fairy Tale for Grown-ups',
    genre: ['Action', 'Thriller', 'Period Gangster Drama'],
    duration: '150–160m (Estimated)',
    rating: 'Pending',
    description: 'A high-stakes period gangster drama set between the 1950s and 1970s. The story revolves around the inner workings of a powerful drug cartel in Goa, exploring a web of power, morality, and betrayal as diverse lives entwine within the cartel\'s deadly grip.',
    director: 'Geetu Mohandas',
    cast: ['Yash (as Raya)', 'Nayanthara (as Ganga)', 'Kiara Advani (as Nadia)', 'Huma Qureshi (as Elizabeth)', 'Tara Sutaria (as Rebecca)', 'Rukmini Vasanth (as Mellisa)', 'Akshay Oberoi', 'Sudev Nair'],
    posterUrl: 'https://dmsypezifjzqiugoyciq.supabase.co/storage/v1/object/public/Toxic/Gemini_Generated_Image_b8gvxzb8gvxzb8gv.png',
    backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=2000&auto=format&fit=crop',
    trailerId: 'aF08WVSvCok',
    releaseDate: 'March 20, 2026'
  }
];

export const FEATURED_MOVIE: Movie = FEATURED_MOVIES[0];

export const SHOW_TIMES_DATA: ShowTimeSlot[] = [
  { date: 'March 20, 2026', time: '08:00 PM', location: 'Vista mall Laspinas' }
]
  

export const SHOW_TIMES = SHOW_TIMES_DATA.map(st => st.time);

export const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rows = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  rows.forEach((row) => {
    for (let i = 1; i <= 24; i++) {
      seats.push({
        id: `${row}${i}`,
        row,
        number: i,
        type: 'standard',
        price: 500,
        isBooked: false
      });
    }
  });

  return seats;
};


export const SEATS_DATA = generateSeats();
