import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/database.js";
import { initializeGridFS } from "./services/gridfs.service.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const PORT = process.env.PORT || 8080;

const startServer = async () => {

    try {

        await connectDB();

        initializeGridFS();

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );
        });

    } catch (error) {

        console.error(
            `Server startup failed: ${error.message}`
        );

        process.exit(1);
    }
};

startServer();
