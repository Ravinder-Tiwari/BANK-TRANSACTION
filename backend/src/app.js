const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

/*
    Importing Routes
*/
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRouter = require("./routes/transaction.routes");
const analyticsRouter = require("./routes/analytics.routes");

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

/*
    In CommonJS:
    __dirname and __filename are already available
    so no need for fileURLToPath(import.meta.url)
*/

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "../public")));

/**
 * Test Route
 */

// app.get("/", (req, res) => {
//     res.status(200).json({
//         message: "API is working fine",
//     });
// });

/*
    All Routes will be registered here
*/
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/analytics", analyticsRouter);

// React frontend support
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});

module.exports = app;