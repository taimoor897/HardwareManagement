
import { Router } from "express";
import {
  checkout,
  listSales,
  getSale,
  markSaleAsPaid,
   recordSalePayment,
} from "../controllers/posController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.post(
  "/sales/:id/payments",
  authorize("owner", "manager", "cashier"),
  recordSalePayment
);

router.post(
  "/checkout",
  authorize("owner", "manager", "cashier"),
  checkout
);

router.get(
  "/sales",
  authorize("owner", "manager", "cashier"),
  listSales
);

router.get(
  "/sales/:id",
  authorize("owner", "manager", "cashier"),
  getSale
);

// Mark an existing sale as fully paid.
router.patch(
  "/sales/:id/payment-status",
  authorize("owner", "manager", "cashier"),
  markSaleAsPaid
);

export default router;
