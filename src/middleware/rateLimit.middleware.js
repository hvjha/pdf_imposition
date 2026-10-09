import rateLimit from "express-rate-limit";

// General API rate limiter for regular traffic
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP address. Please try again after 15 minutes."
    }
});

// Stricter rate limiter for authentication endpoint (protects against brute-force attacks)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 login attempts per 15 mins per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

// Heavy-operation rate limiter for uploads and imposition execution
export const heavyOpsLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100, // 100 heavy jobs per 10 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Heavy prepress operation quota reached. Please wait a few minutes before submitting new jobs."
    }
});
