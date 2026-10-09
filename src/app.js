import express from "express";
import cors from "cors";

import pdfRoutes from "./routes/pdf.routes.js";
import impositionRoutes from "./routes/imposition.routes.js";
import outputRoutes from "./routes/output.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { apiLimiter, authLimiter, heavyOpsLimiter } from "./middleware/rateLimit.middleware.js";

const app = express();

// Security: Disable x-powered-by to prevent server finger-printing
app.disable("x-powered-by");

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"]
}));

// Apply general API rate limiter
app.use("/api/", apiLimiter);

// --------------------------------------------------
// DEBUG REQUEST LOGGER (Dev / Diagnostic)
// --------------------------------------------------
app.use((req, res, next) => {
    // Skip logging for health check pings to keep console clean
    if (req.originalUrl === "/api/health") {
        return next();
    }

    if (process.env.NODE_ENV !== "test") {
        console.log(`\n[REQUEST] ${req.method} ${req.originalUrl}`);
    }

    next();
});

// --------------------------------------------------
// Body parsers
// --------------------------------------------------
app.use(
    express.json({
        limit: "15mb",
        type: "application/json"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "15mb",
        type: "application/x-www-form-urlencoded"
    })
);

// --------------------------------------------------
// Auth routes (with dedicated brute-force rate limiter)
// --------------------------------------------------
app.use(
    "/api/auth",
    authLimiter,
    authRoutes
);

// --------------------------------------------------
// Heavy operations rate limiter on upload & imposition
// --------------------------------------------------
app.use("/api/pdfs/upload", heavyOpsLimiter);
app.use("/api/pdfs/impose", heavyOpsLimiter);

// --------------------------------------------------
// PDF routes
// --------------------------------------------------
app.use(
    "/api/pdfs",
    pdfRoutes
);

// --------------------------------------------------
// Imposition routes
// --------------------------------------------------
app.use(
    "/api/pdfs",
    impositionRoutes
);

app.use(
    "/api/pdfs/output",
    outputRoutes
);

// --------------------------------------------------
// Health
// --------------------------------------------------
app.get(
    "/api/health",
    (req, res) => {
        return res.status(200).json({
            success: true,
            message: "Prepress Studio backend is online.",
            timestamp: new Date().toISOString()
        });
    }
);

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------
app.use(
    (error, req, res, next) => {
        console.error("\n[SERVER ERROR]", error.message || error);

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                message: "PDF file is too large. Maximum allowed size is 2 GB."
            });
        }

        return res.status(
            error.statusCode || 400
        ).json({
            success: false,
            message: error.message || "An error occurred while processing the request."
        });
    }
);

export default app;