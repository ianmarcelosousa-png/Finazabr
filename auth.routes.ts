import { Router } from "express";
import {
  changeMyPassword,
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPasswordHandler,
  updateMe,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, asyncHandler(register));
authRouter.post("/login", authRateLimiter, asyncHandler(login));
authRouter.post("/logout", asyncHandler(logout));
authRouter.post("/forgot-password", authRateLimiter, asyncHandler(forgotPassword));
authRouter.post("/reset-password", authRateLimiter, asyncHandler(resetPasswordHandler));

authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.patch("/me", requireAuth, asyncHandler(updateMe));
authRouter.post("/change-password", requireAuth, asyncHandler(changeMyPassword));
