import express from "express";
import { login } from "../controllers/auth.controller.js";
import { validateLogin } from "../middleware/validateLogin.js";

const router = express.Router();

router.post("/login", validateLogin, login);

export default router;