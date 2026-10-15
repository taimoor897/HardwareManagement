
import { Router } from "express";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
} from "../controllers/customerController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.post(
  "/",
  authorize("owner", "manager", "cashier"),
  createCustomer
);
router.patch(
  "/:id",
  authorize("owner", "manager", "cashier"),
  updateCustomer
);
router.patch(
  "/:id/archive",
  authorize("owner", "manager"),
  archiveCustomer
);

export default router;
