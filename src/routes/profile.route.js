import { Router } from "express";
import {getMyProfile,updateMyProfile,changeMyPassword} from "../controllers/profile.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {updateProfileSchema,changePasswordSchema,} from "../validators/profile.validator.js";

const router = Router();

router.use(verifyToken);

router.get("/me", getMyProfile);
router.put("/me", validate(updateProfileSchema), updateMyProfile);
router.put("/change-password", validate(changePasswordSchema), changeMyPassword);

export default router;