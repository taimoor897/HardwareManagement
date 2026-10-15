
import { Router } from "express";
import {
  createProduct,
  bulkImportProducts,
  listProducts,
  getProduct,
  updateProduct,
  archiveProduct,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/", listProducts);

// Keep this route before router.get("/:id").
router.post(
  "/bulk-import",
  authorize("owner", "manager", "inventory"),
  bulkImportProducts
);

router.get("/:id", getProduct);

router.post(
  "/",
  authorize("owner", "manager", "inventory"),
  createProduct
);

router.patch(
  "/:id",
  authorize("owner", "manager", "inventory"),
  updateProduct
);

router.patch(
  "/:id/archive",
  authorize("owner", "manager"),
  archiveProduct
);

export default router;
