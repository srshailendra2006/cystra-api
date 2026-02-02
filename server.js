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
// 🏁 Start the Server (Fixed Port Only - No Auto-Selection)
// ======================================================
const server = app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log(`🚀 Cystra API Server Started Successfully`);
  console.log('═'.repeat(60));
  console.log(`📍 Port:           ${PORT}`);
  console.log(`🌍 Environment:    ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL:   http://localhost:${PORT}/api/v1`);
  console.log(`📊 Swagger Docs:   http://localhost:${PORT}/api-docs`);
  console.log(`💚 Health Check:   http://localhost:${PORT}/health`);
  console.log('═'.repeat(60) + '\n');
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error('\n' + '═'.repeat(60));
    console.error(`❌ ERROR: Port ${PORT} is already in use!`);
    console.error('═'.repeat(60));
    console.error('\n💡 Solutions:');
    console.error(`   1. Kill the process using port ${PORT}:`);
    console.error(`      lsof -i :${PORT} | grep LISTEN`);
    console.error(`      kill -9 <PID>`);
    console.error(`   2. Change PORT in .env file to a different port`);
    console.error(`   3. Stop other applications using port ${PORT}\n`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
    process.exit(1);
  }
});

module.exports = app;

