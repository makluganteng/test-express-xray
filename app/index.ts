import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { rootRouter } from "./routes";
// import { createDbConnection } from "./services/db";
import * as AWSXRay from "aws-xray-sdk";
dotenv.config();

AWSXRay.captureHTTPsGlobal(require("http"));
AWSXRay.captureHTTPsGlobal(require("https"));
AWSXRay.capturePromise();

const app: Express = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 8000;
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://ddacfrontend-env.eba-bnwpnydi.us-east-1.elasticbeanstalk.com",
  ],
};

app.use(express.json()).use(cors(corsOptions)).use("/api", rootRouter());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server is running test test test");
});

app.listen(port, async () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
