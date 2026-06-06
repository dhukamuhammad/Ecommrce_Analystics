const express = require("express");
const cors = require("cors");
require("dotenv").config();

const uploadRoutes = require("./routes/upload/upload");

const app = express();

app.use(cors());

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", uploadRoutes);

app.get("/", (req, res) => {
    res.send("Crasome API Running...");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server Running On Port ${PORT}`);
});
