import express from "express";
import cors from 'cors';
import pdfRoutes from './routes/pdf.routes.js';
import impositionRoutes from "./routes/imposition.routes.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/pdfs', pdfRoutes);
app.use('/api/pdfs',impositionRoutes);
app.get("/api/health", (req, res) => {
    res.status(200).json({ success:true,message: "Welcome to the application." });
});

app.use((error,req,res,next)=>{
    console.error('Error:',error);

    return res.status(400).json({
        success:false,
        message:error.message || "An error occurred while processing the request."
    })
})

export default app;