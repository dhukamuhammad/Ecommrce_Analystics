const express = require("express");
const cors = require("cors");
require("dotenv").config();

const uploadRoutes = require("./routes/upload/upload");
const db = require("./config/db");

const app = express();

app.use(cors());

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", uploadRoutes);

app.get("/", (req, res) => {
    res.send("Crasome API Running...");
});

// ============================================================
// AUTO MIGRATION: Server start pe order_type column add karo
// ============================================================
// const runMigrations = async () => {
//     try {
//         // sales_orders table mein order_type column add karo (agar nahi hai toh)
//         await db.query(`
//             ALTER TABLE sales_orders 
//             ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'Sales'
//         `);
//         console.log("✅ Migration: order_type column ready in sales_orders");
//     } catch (error) {
//         // Column already exist karta hai ya koi aur error — ignore karo silently
//         console.log("ℹ️  Migration skipped (column may already exist):", error.code || error.message);
//     }
// };

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.log(`Server Running On Port ${PORT}`);
    // await runMigrations();
});
