const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const panditRoutes = require("./routes/panditRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["*"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith("panditoo.in") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhookRoutes);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "Pandit Booking API is running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/pandits", panditRoutes);
app.use("/api", publicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
