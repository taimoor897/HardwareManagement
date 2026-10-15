
import { Router } from "express";
import {
  applyStockMovement,
  getInventorySummary,
  listStockMovements,
} from "../controllers/inventoryController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/summary", getInventorySummary);
router.get("/movements", listStockMovements);

router.post(
  "/products/:productId/movements",
  authorize("owner", "manager", "inventory"),
  applyStockMovement
);

export default router;
