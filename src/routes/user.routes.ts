import { Router } from "express";
import { getProfile, updateProfile, changePassword, deleteAccount } from "../controllers/user.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/me", verifyToken, getProfile);
router.patch("/me", verifyToken, updateProfile);
router.put("/me/password", verifyToken, changePassword);
router.delete("/me", verifyToken, deleteAccount);

export default router;