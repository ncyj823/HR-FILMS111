const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
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

app.post("/book", async (req, res) => {
  const { name, phone, seats, movie, paymentMethod, referenceNo } = req.body;

  console.log("Booking request received:", { name, phone, seats, movie, paymentMethod, referenceNo });

  try {
    const bookingId = "TKT" + Math.floor(100000 + Math.random() * 900000);

    const qrData = bookingId;
    const qrImage = await QRCode.toDataURL(qrData);

    // Send email notification (non-blocking)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "ncy1504@gmail.com",
        pass: "tdllgdfagbboqinb"
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email but don't wait for it or fail if it errors
    transporter.sendMail({
      from: process.env.SMTP_USER || "ncy1504@gmail.com",
      to: "imscoffialjfsm2025@gmail.com",
      subject: "New Movie Booking 🎬",
      html: `
        <h2>New Booking</h2>
        <p><b>ID:</b> ${bookingId}</p>
        <p><b>Name:</b> ${name}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Movie:</b> ${movie}</p>
        <p><b>Seats:</b> ${seats.join(", ")}</p>
        <p><b>Payment Method:</b> ${paymentMethod}</p>
        <p><b>Reference No:</b> ${referenceNo}</p>
        <img src="${qrImage}" />
      `
    }).catch(err => {
      console.error("Email send error (non-blocking):", err.message);
    });

    console.log("Booking completed:", bookingId);
    res.json({ bookingId, qrImage, success: true });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({
      error: "Booking failed",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));