import "./db"; // ensures schema is created on boot
import express from "express";
import cors from "cors";
import { commitmentsRouter } from "./routes/commitments";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", network: process.env.ARC_NETWORK || "testnet" });
});

app.use("/api/commitments", commitmentsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`ARCLOCK FLOW backend listening on http://localhost:${PORT}`);
});
