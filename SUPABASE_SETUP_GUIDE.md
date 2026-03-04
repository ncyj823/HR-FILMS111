# 🎬 HR FILMS - SUPABASE SETUP GUIDE

Complete guide to set up professional seat booking system with real-time updates and security.

---

## 📋 STEP 1: CREATE SUPABASE PROJECT

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in/Create account
3. Click "New Project"
4. Fill in:
   - **Name:** HR Films
   - **Database Password:** (save this!)
   - **Region:** Choose closest to your users
5. Wait for project to be created (~2 minutes)

---

## 🔑 STEP 2: GET YOUR CREDENTIALS

1. In your Supabase project dashboard
2. Click **Settings** (gear icon) → **API**
3. Copy these values:
   - **Project URL** (e.g., `https://abc123xyz.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

## 📝 STEP 3: CREATE .env FILE

1. In your project root, create a file named `.env`
2. Paste this content (replace with YOUR values):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_ADMIN_PASSWORD=hrfilms2026
```

**⚠️ IMPORTANT:** 
- Replace `YOUR_PROJECT_ID` with your actual Supabase project ID
- Replace `your_actual_anon_key_here` with your actual anon key
- Change `hrfilms2026` to your own admin password
- **NEVER commit .env to GitHub!** (already in .gitignore)

---

## 🗄️ STEP 4: RUN SQL SCHEMA

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase-schema.sql` from your project
4. Copy ALL the SQL code
5. Paste it into the SQL Editor
6. Click **RUN** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

**What this does:**
- ✅ Creates `seats` table (for permanent seat bookings)
- ✅ Creates `bookings` table (for ticket records)
- ✅ Creates `seat_locks` table (for temporary 5-min holds)
- ✅ Creates `admin_users` table (for admin access)
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Generates all 288 seats (A1-L24) for your movie
- ✅ Adds triggers and functions

---

## 🔐 STEP 5: ENABLE REALTIME

1. In Supabase dashboard, go to **Database** → **Replication**
2. Find these tables and enable Realtime:
   - ✅ **seats** → Toggle ON
   - ✅ **seat_locks** → Toggle ON
   - ✅ **bookings** → Toggle ON

**Why?** This allows instant updates when someone books a seat!

---

## 👤 STEP 6: ADD YOURSELF AS ADMIN

1. Go to **SQL Editor**
2. Run this query (replace with your email):

```sql
INSERT INTO admin_users (email, name, role) 
VALUES ('your-email@example.com', 'Your Name', 'owner');
```

3. Sign in to your app with this email
4. You'll now see "Admin Panel" button in your profile menu

---

## 🧪 STEP 7: TEST THE SYSTEM

### Test Seat Booking:

1. Start your app: `npm run dev`
2. Go to seat selection page
3. Select a seat (e.g., A5)
4. Complete the booking
5. Check Supabase:
   - Go to **Table Editor** → **seats**
   - Find seat A5
   - `is_booked` should be `true` ✅

### Test Real-Time Updates:

1. Open your app in **two browser windows**
2. In Window 1: Select seat B10
3. In Window 2: You should see B10 become "locked" (orange) immediately!
4. In Window 1: Complete the booking
5. In Window 2: B10 should now be "booked" (dark gray)

### Test Admin Panel:

1. Sign in with your admin email
2. Click your profile → **Admin Panel**
3. Enter admin password (default: `hrfilms2026`)
4. You should see:
   - Total Revenue
   - Booked/Available seats
   - Reset buttons

---

## 🔒 STEP 8: VERIFY SECURITY (IMPORTANT!)

### Test RLS (Row Level Security):

1. Open browser console (F12)
2. Try to reset seats manually:

```javascript
// This should FAIL for non-admin users
await supabase
  .from('seats')
  .update({ is_booked: false })
  .eq('seat_number', 'A5')
```

**Expected Result:** ❌ Error - only admins can reset seats!

### Test Normal User Booking:

```javascript
// This should WORK for normal users
await supabase
  .from('seats')
  .update({ is_booked: true })
  .eq('seat_number', 'A5')
```

**Expected Result:** ✅ Success - users can book available seats

---

## 📊 STEP 9: VIEW YOUR DATA

### Check Booked Seats:

```sql
SELECT seat_number, booked_by, booked_at 
FROM seats 
WHERE is_booked = true 
ORDER BY row_letter, seat_index;
```

### Check All Bookings:

```sql
SELECT 
  booking_id, 
  user_name, 
  seats, 
  total_amount, 
  created_at 
FROM bookings 
ORDER BY created_at DESC;
```

### Check Seat Statistics:

```sql
SELECT 
  COUNT(*) as total_seats,
  SUM(CASE WHEN is_booked THEN 1 ELSE 0 END) as booked,
  SUM(CASE WHEN NOT is_booked THEN 1 ELSE 0 END) as available
FROM seats;
```

---

## 🔄 STEP 10: RESET SEATS (ADMIN ONLY)

### Via Admin Panel (Recommended):

1. Sign in as admin
2. Open Admin Panel
3. Click "RESET ALL SEATS"
4. Confirm the action
5. All seats will be unbooked ✅

### Via SQL (Manual):

```sql
UPDATE seats 
SET 
  is_booked = false, 
  booked_by = NULL, 
  booked_at = NULL,
  booking_id = NULL
WHERE movie_id = 'm2' AND show_time = '08:00 PM';
```

---

## 🚀 ADVANCED: ADD MORE SHOWTIMES

To add seats for a new showtime:

```sql
-- Generate seats for new show
SELECT generate_seats_for_show('m2', '11:00 AM');
SELECT generate_seats_for_show('m2', '02:00 PM');
SELECT generate_seats_for_show('m2', '05:00 PM');
```

Then update `constants.tsx`:

```typescript
export const SHOW_TIMES_DATA: ShowTimeSlot[] = [
  { date: 'March 20, 2026', time: '11:00 AM', location: 'Vista mall Laspinas' },
  { date: 'March 20, 2026', time: '02:00 PM', location: 'Vista mall Laspinas' },
  { date: 'March 20, 2026', time: '05:00 PM', location: 'Vista mall Laspinas' },
  { date: 'March 20, 2026', time: '08:00 PM', location: 'Vista mall Laspinas' }
]
```

---

## 🐛 TROUBLESHOOTING

### ❌ Seats not loading?

**Check:**
1. Is `.env` file created with correct credentials?
2. Did you run the SQL schema?
3. Is Realtime enabled for `seats` table?
4. Open browser console - any errors?

**Fix:**
```javascript
// Check connection
console.log(import.meta.env.VITE_SUPABASE_URL);
// Should print your Supabase URL
```

### ❌ "No seats found in database"?

**Fix:** Run this in SQL Editor:

```sql
SELECT generate_seats_for_show('m2', '08:00 PM');
```

Then refresh your app.

### ❌ Can't reset seats?

**Check:**
1. Are you signed in with admin email?
2. Is your email in `admin_users` table?
3. Check SQL Editor:

```sql
SELECT * FROM admin_users WHERE email = 'your-email@example.com';
```

### ❌ Real-time not working?

**Check:**
1. Supabase → Database → Replication
2. Enable Realtime for: `seats`, `seat_locks`, `bookings`
3. Refresh your app

---

## 📱 PRODUCTION DEPLOYMENT

### Environment Variables:

When deploying to Vercel/Netlify:

1. Add these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSWORD`

### Security Checklist:

- ✅ RLS enabled on all tables
- ✅ Admin password changed from default
- ✅ `.env` file in `.gitignore`
- ✅ No sensitive data in code
- ✅ CORS configured in Supabase

---

## ✅ WHAT YOU'VE BUILT

🎉 **Congratulations!** You now have:

- ✅ **Professional seat booking system** (like BookMyShow)
- ✅ **Real-time updates** across all users
- ✅ **Persistent database** (no more localStorage!)
- ✅ **Secure admin panel** for owner
- ✅ **Row Level Security** (RLS) protection
- ✅ **5-minute seat locks** during checkout
- ✅ **Digital QR tickets** with database tracking
- ✅ **Revenue tracking** and statistics
- ✅ **Console-proof** (users can't hack from browser!)

---

## 🆘 NEED HELP?

**Common Commands:**

```bash
# View Supabase connection status
npm run dev

# Check environment variables
echo $VITE_SUPABASE_URL

# Reset seats via admin panel
# Just sign in as admin and use the UI!
```

**Resources:**
- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

---

## 🎬 YOU'RE ALL SET!

Your HR FILMS booking system is now production-ready! 🚀

**Next Steps:**
1. Test thoroughly with multiple browsers
2. Add your admin email
3. Deploy to production
4. Share with users!

**Pro Tip:** Monitor your Supabase dashboard to see bookings in real-time! 📊
