// import express from "express";
// import cors from 'cors';
// import pdfRoutes from './routes/pdf.routes.js';
// import impositionRoutes from "./routes/imposition.routes.js";
// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use('/api/pdfs', pdfRoutes);
// app.use('/api/pdfs',impositionRoutes);
// app.get("/api/health", (req, res) => {
//     res.status(200).json({ success:true,message: "Welcome to the application." });
// });

// app.use((error,req,res,next)=>{
//     console.error('Error:',error);

//     return res.status(400).json({
//         success:false,
//         message:error.message || "An error occurred while processing the request."
//     })
// })

// export default app;




import express from "express";
import cors from "cors";

import pdfRoutes from "./routes/pdf.routes.js";
import impositionRoutes from "./routes/imposition.routes.js";
import outputRoutes from "./routes/output.routes.js";

const app = express();

app.use(cors());


// --------------------------------------------------
// DEBUG REQUEST
// --------------------------------------------------

app.use((req, res, next) => {

    console.log(
        "\n[REQUEST]",
        req.method,
        req.originalUrl
    );

    console.log(
        "[CONTENT-TYPE]",
        req.headers["content-type"]
    );

    next();
});


// --------------------------------------------------
// JSON parser
// Only parse actual JSON requests
// --------------------------------------------------

app.use(
    express.json({
        limit: "10mb",
        type: "application/json"
    })
);


// --------------------------------------------------
// URL encoded parser
// --------------------------------------------------

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
        type: "application/x-www-form-urlencoded"
    })
);


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

            message:
                "Welcome to the application."
        });
    }
);


// --------------------------------------------------
// Error Handler
// --------------------------------------------------

app.use(
    (error, req, res, next) => {

        console.error(
            "\n[ERROR]",
            error
        );

        if (
            error.code === "LIMIT_FILE_SIZE"
        ) {

            return res.status(413).json({

                success: false,

                message:
                    "PDF file is too large. Maximum allowed size is 2 GB."
            });
        }


        return res.status(
            error.statusCode || 400
        ).json({

            success: false,

            message:
                error.message ||
                "An error occurred while processing the request."
        });
    }
);


export default app;