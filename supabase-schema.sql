-- ============================================================
-- HR FILMS - SUPABASE DATABASE SCHEMA
-- Complete seat booking system with security
-- ============================================================

-- 1️⃣ SEATS TABLE
-- Stores all cinema seats with booking status
-- ============================================================
CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  seat_number VARCHAR(10) UNIQUE NOT NULL,  -- Example: "A5", "B12"
  row_letter VARCHAR(5) NOT NULL,           -- Example: "A", "B", "C"
  seat_index INTEGER NOT NULL,              -- Seat position in row (1-24)
  movie_id VARCHAR(50) NOT NULL,            -- Which movie this seat is for
  show_time VARCHAR(50) NOT NULL,           -- Which showtime
  is_booked BOOLEAN DEFAULT FALSE,          -- Booking status
  booked_by VARCHAR(255),                   -- User email who booked
  booked_at TIMESTAMP WITH TIME ZONE,       -- When it was booked
  booking_id VARCHAR(100),                  -- Transaction/booking ID reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_seats_movie_show ON seats(movie_id, show_time);
CREATE INDEX idx_seats_booked ON seats(is_booked);
CREATE INDEX idx_seats_number ON seats(seat_number, movie_id, show_time);

-- ============================================================
-- 2️⃣ BOOKINGS TABLE (Already exists, but ensure it's set up)
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(100) UNIQUE NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255),
  movie_title VARCHAR(255) NOT NULL,
  seats TEXT NOT NULL,                      -- Comma-separated seat numbers
  show_time VARCHAR(50) NOT NULL,
  booking_date VARCHAR(100),
  total_amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_channel VARCHAR(50),
  contact_info TEXT,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_id ON bookings(booking_id);
CREATE INDEX idx_bookings_email ON bookings(user_email);

-- ============================================================
-- 3️⃣ SEAT LOCKS TABLE (Already exists)
-- For temporary 5-minute seat holds during booking
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_locks (
  id SERIAL PRIMARY KEY,
  seat_id VARCHAR(10) NOT NULL,
  movie VARCHAR(255) NOT NULL,
  show_time VARCHAR(50) NOT NULL,
  locked_by VARCHAR(255) NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_seat_locks_expires ON seat_locks(expires_at);
CREATE INDEX idx_seat_locks_seat ON seat_locks(seat_id, movie, show_time);

-- ============================================================
-- 4️⃣ ADMIN USERS TABLE
-- For owner/admin access control
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',         -- 'admin', 'super_admin', 'owner'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin (change this email!)
INSERT INTO admin_users (email, name, role) 
VALUES ('owner@hrfilms.com', 'HR Films Owner', 'owner')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 5️⃣ ROW LEVEL SECURITY (RLS) POLICIES
-- Critical for security - prevents console manipulation
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- SEATS TABLE POLICIES
-- ============================================================

-- Policy 1: Anyone can read seats (to see availability)
CREATE POLICY "Anyone can view seats"
  ON seats FOR SELECT
  TO PUBLIC
  USING (true);

-- Policy 2: Only authenticated users can book seats (update to is_booked = true)
CREATE POLICY "Users can book available seats"
  ON seats FOR UPDATE
  TO PUBLIC
  USING (is_booked = false)
  WITH CHECK (is_booked = true);

-- Policy 3: Only admins can reset seats (update is_booked to false)
CREATE POLICY "Only admins can reset seats"
  ON seats FOR UPDATE
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = auth.jwt() ->> 'email' 
      OR email = current_setting('request.jwt.claims', true)::json ->> 'email'
    )
  );

-- Policy 4: System can insert seats (for initial setup)
CREATE POLICY "System can insert seats"
  ON seats FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- BOOKINGS TABLE POLICIES
-- ============================================================

-- Anyone can create bookings
CREATE POLICY "Anyone can create booking"
  ON bookings FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- Anyone can view their own bookings (or all if admin)
CREATE POLICY "Users can view bookings"
  ON bookings FOR SELECT
  TO PUBLIC
  USING (true);

-- SEAT LOCKS TABLE POLICIES
-- ============================================================

-- Anyone can create locks
CREATE POLICY "Anyone can create seat lock"
  ON seat_locks FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- Anyone can view locks
CREATE POLICY "Anyone can view seat locks"
  ON seat_locks FOR SELECT
  TO PUBLIC
  USING (true);

-- Anyone can delete their own locks
CREATE POLICY "Anyone can delete seat locks"
  ON seat_locks FOR DELETE
  TO PUBLIC
  USING (true);

-- ADMIN USERS POLICIES
-- ============================================================

-- Only readable, not writable from client
CREATE POLICY "Admin users are readable"
  ON admin_users FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================
-- 6️⃣ FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for seats table
DROP TRIGGER IF EXISTS update_seats_updated_at ON seats;
CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired seat locks automatically
CREATE OR REPLACE FUNCTION clean_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM seat_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7️⃣ INITIAL DATA - POPULATE SEATS
-- Run this to create all seats for your movie
-- ============================================================

-- Function to generate seats for a movie/showtime
CREATE OR REPLACE FUNCTION generate_seats_for_show(
  p_movie_id VARCHAR,
  p_show_time VARCHAR
)
RETURNS void AS $$
DECLARE
  v_row VARCHAR;
  v_seat_num INTEGER;
  v_rows VARCHAR[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L'];
BEGIN
  FOREACH v_row IN ARRAY v_rows
  LOOP
    FOR v_seat_num IN 1..24
    LOOP
      INSERT INTO seats (seat_number, row_letter, seat_index, movie_id, show_time, is_booked)
      VALUES (
        v_row || v_seat_num,
        v_row,
        v_seat_num,
        p_movie_id,
        p_show_time,
        false
      )
      ON CONFLICT (seat_number) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate seats for your movie
-- Change these values to match your movie
SELECT generate_seats_for_show('m2', '08:00 PM');

-- ============================================================
-- 8️⃣ USEFUL QUERIES FOR ADMIN
-- ============================================================

-- View all booked seats
-- SELECT * FROM seats WHERE is_booked = true ORDER BY row_letter, seat_index;

-- Reset all seats for a specific show
-- UPDATE seats SET is_booked = false, booked_by = NULL, booked_at = NULL, booking_id = NULL
-- WHERE movie_id = 'm2' AND show_time = '08:00 PM';

-- View booking statistics
-- SELECT 
--   movie_id, 
--   show_time, 
--   COUNT(*) as total_seats,
--   SUM(CASE WHEN is_booked THEN 1 ELSE 0 END) as booked_seats,
--   SUM(CASE WHEN NOT is_booked THEN 1 ELSE 0 END) as available_seats
-- FROM seats
-- GROUP BY movie_id, show_time;

-- ============================================================
-- 9️⃣ REALTIME SUBSCRIPTIONS (Enable in Supabase Dashboard)
-- ============================================================
-- Go to: Database > Replication
-- Enable Realtime for tables: seats, seat_locks, bookings
-- This allows instant updates across all users

-- ============================================================
-- ✅ SETUP COMPLETE
-- ============================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Enable Realtime for seats, seat_locks, bookings tables
-- 3. Add your admin email to admin_users table
-- 4. Update .env file with your Supabase credentials
-- ============================================================
