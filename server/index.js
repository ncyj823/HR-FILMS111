const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/",(req,res)=>{
    res.send("Server is working");
});

app.post("/book", async (req, res) => {
  const { name, phone, seats, movie } = req.body;

  const bookingId = "TKT" + Math.floor(100000 + Math.random() * 900000);

  const qrData = bookingId;
  const qrImage = await QRCode.toDataURL(qrData);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "ncy1504@gmail.com",
      pass: "tdllgdfagbboqinb"
    }
  });

  await transporter.sendMail({
    from: "ncy1504@gmail.com",
    to: "hriturajs33@gmail.com",
    subject: "New Movie Booking 🎬",
    html: `
      <h2>New Booking</h2>
      <p><b>ID:</b> ${bookingId}</p>
      <p><b>Name:</b> ${name}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Movie:</b> ${movie}</p>
      <p><b>Seats:</b> ${seats.join(", ")}</p>
      <img src="${qrImage}" />
    `
  });

  res.json({ bookingId, qrImage });
});

app.listen(5000, () => console.log("Server running on port 5000"));