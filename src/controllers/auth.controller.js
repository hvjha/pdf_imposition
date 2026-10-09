// ============================================================
// AUTHENTICATION CONTROLLER
// Prepress Studio Access Control
// ============================================================

const VALID_CREDENTIALS = {
    username: process.env.ADMIN_USER || "prepressimposition",
    password: process.env.ADMIN_PASS || "impositionpdfautomation"
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }

        const trimmedUser = String(username).trim();
        const trimmedPass = String(password).trim();

        if (
            trimmedUser !== VALID_CREDENTIALS.username ||
            trimmedPass !== VALID_CREDENTIALS.password
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid Login ID or Password. Please check your credentials."
            });
        }

        // Return authenticated session
        return res.status(200).json({
            success: true,
            message: "Authentication successful.",
            token: "prepress-auth-token-" + Buffer.from(trimmedUser).toString("base64"),
            user: {
                username: VALID_CREDENTIALS.username,
                name: "Prepress Production Operator",
                role: "Lead Imposition Engineer",
                department: "Prepress & Digital Print Workflow"
            }
        });

    } catch (error) {
        console.error("[AUTH] Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during authentication."
        });
    }
};

const getMe = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Session expired or missing token."
        });
    }

    return res.status(200).json({
        success: true,
        user: {
            username: VALID_CREDENTIALS.username,
            name: "Prepress Production Operator",
            role: "Lead Imposition Engineer",
            department: "Prepress & Digital Print Workflow"
        }
    });
};

export {
    login,
    getMe
};
