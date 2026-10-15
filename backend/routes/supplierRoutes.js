
import { Router } from "express";
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  archiveSupplier,
} from "../controllers/supplierController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/", listSuppliers);
router.get("/:id", getSupplier);

router.post(
  "/",
  authorize("owner", "manager", "inventory"),
  createSupplier
);

router.patch(
  "/:id",
  authorize("owner", "manager", "inventory"),
  updateSupplier
);

router.patch(
  "/:id/archive",
  authorize("owner", "manager"),
  archiveSupplier
);

export default router;
