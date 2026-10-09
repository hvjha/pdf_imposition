import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 20,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 360000,
            connectTimeoutMS: 60000,
            family: 4
        });
        console.log(`[DATABASE] MongoDB connected: ${connection.connection.host}`);
        return connection;
    } catch (error) {
        console.error('[DATABASE] Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;