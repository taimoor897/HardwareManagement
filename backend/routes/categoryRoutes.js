
import { Router } from "express";
import {
  listCategories,
  createCategory,
  updateCategory,
  archiveCategory,
} from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/", listCategories);

router.post(
  "/",
  authorize("owner", "manager", "inventory"),
  createCategory
);

router.patch(
  "/:id",
  authorize("owner", "manager"),
  updateCategory
);

router.patch(
  "/:id/archive",
  authorize("owner", "manager"),
  archiveCategory
);

export default router;
