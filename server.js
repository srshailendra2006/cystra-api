// ======================================================
// 🚀 Cystra API Backend Server
// ======================================================

// --- Load Environment Variables First ---
require("dotenv").config(); // ✅ Make sure this is at the very top

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

// --- Initialize Express App ---
const app = express();

// --- Middleware ---
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Load PORT from .env or default ---
const PORT = process.env.PORT || 8080;

// ======================================================
// 📘 Swagger API Documentation Setup
// ======================================================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cystra API",
      version: "1.0.0",
      description: "API documentation for Cystra backend system",
      contact: {
        name: "Cystra Technologies",
        email: "support@cystra.com"
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server"
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ["./server.js", "./routes/*.js", "./controllers/*.js"], // <-- include all route files
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// --- Test Database Connection (non-blocking) ---
const db = require('./db');
db.testConnection()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.log('⚠️ Database connection failed:', err.message || 'Unable to connect');
    console.log('⚠️ Server will continue without database connection');
  });

// ======================================================
// 🔍 Health Check Route
// ======================================================
app.get("/", (req, res) => {
  res.send("✅ Cystra API is running successfully");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Cystra API is running',
    timestamp: new Date().toISOString()
  });
});

// ======================================================
// 🧩 API Routes
// ======================================================
const ApiRoutes = require('./contracts/ApiRoutes');
app.use('/api', ApiRoutes);

// ======================================================
// 🚫 404 Handler
// ======================================================
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// ======================================================
// ❌ Error Handler
// ======================================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// ======================================================
// 🏁 Start the Server (with dynamic port handling)
// ======================================================
function startServer(port) {
  const server = app.listen(port);

  server.on("listening", () => {
    const actualPort = server.address().port;
    console.log(`🚀 Server running successfully on http://localhost:${actualPort}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ API URL: http://localhost:${actualPort}/api/v1`);
    console.log(`✅ Health Check: http://localhost:${actualPort}/health`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} is busy, trying a different one...`);
      startServer(0); // 0 = auto-select an available port
    } else {
      console.error("❌ Server error:", err);
    }
  });
}

startServer(PORT);

module.exports = app;

