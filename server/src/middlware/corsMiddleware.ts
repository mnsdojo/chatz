import cors from "cors";
import { config } from "../config";

export const corsMiddleware = cors({
  origin: config.corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
