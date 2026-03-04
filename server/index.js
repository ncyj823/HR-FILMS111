const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const QRCode = require("qrcode");
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://hr-films-111.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Server is working", timestamp: new Date() });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ status: "Backend connected successfully" });
});

// Keep-alive ping to prevent Render cold starts
app.get("/ping", (req, res) => {
  res.json({ pong: true, timestamp: new Date() });
});

app.post("/book", async (req, res) => {
  const { name, phone, email, seats, movie, paymentMethod, referenceNo } = req.body;

  console.log("Booking request received:", { name, phone, email, seats, movie, paymentMethod, referenceNo });

  if (!seats || seats.length === 0) {
    return res.status(400).json({ error: "No seats selected" });
  }
  if (!movie) {
    return res.status(400).json({ error: "Movie is required" });
  }

  try {
    const bookingId = "TKT" + Math.floor(100000 + Math.random() * 900000);
    const qrImage = await QRCode.toDataURL(bookingId);

    const { error: dbError } = await supabase
      .from('bookings')
      .insert({
        booking_id: bookingId,
        name,
        phone: phone || '',
        email: email || '',
        seats,
        movie,
        payment_method: paymentMethod || 'personal',
        reference_no: referenceNo || '',
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      family: 4, // Force IPv4 (Render free tier blocks IPv6 for Gmail)
      auth: {
        user: process.env.SMTP_USER || "ncy1504@gmail.com",
        pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "iedbqivmxnkxvsdb"
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email notification to owner
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER || "ncy1504@gmail.com",
        to: "hriturajs33@gmail.com",
        subject: `New Booking 🎬 ${bookingId}`,
        html: `
          <h2>New Booking Request</h2>
          <p><b>Booking ID:</b> ${bookingId}</p>
          <p><b>Name:</b> ${name}</p>
          <p><b>Phone:</b> ${phone || 'N/A'}</p>
          <p><b>Email:</b> ${email || 'Not provided'}</p>
          <p><b>Movie:</b> ${movie}</p>
          <p><b>Seats:</b> ${Array.isArray(seats) ? seats.join(", ") : seats}</p>
          <p><b>Payment Method:</b> ${paymentMethod || 'N/A'}</p>
          <p><b>Reference No:</b> ${referenceNo || 'N/A'}</p>
          <br/>
          <img src="${qrImage}" alt="QR Code" />
        `
      });
      console.log("✅ Email sent successfully to owner for booking:", bookingId);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError.message);
      console.error("Full error:", emailError);
      // Email fails but booking still succeeds
    }

    console.log("Booking completed:", bookingId);
    res.json({ bookingId, qrImage, success: true });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: "Booking failed. Please try again." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));