import express from "express";
import { generateCertificate } from "../controllers/certificateController.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/certificate", isAuth, generateCertificate);

export default router;
