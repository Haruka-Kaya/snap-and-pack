import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust exactly ONE proxy hop (the Replit proxy in front of this server).
// req.ip then resolves to the rightmost X-Forwarded-For entry — the address
// the trusted proxy saw — so entries prepended by a spoofing client are
// ignored. Client-identity limits stay best-effort regardless; the hard,
// spoof-proof spend ceiling is the global server-key budget in routes/vision.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Base64 photo payloads (≤3 belongings shots @~4MB b64 + bounded refs)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
