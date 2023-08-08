import cors from "cors";
import { create } from "domain";
import express, { Router } from "express";
import { createGiftRouter } from "./Gift/index";
import * as AWSXRay from "aws-xray-sdk";

export const rootRouter = () => {
  const router = Router();
  router.use(express.json());
  router.use(cors());

  router.use("/gift", createGiftRouter());

  return router;
};
