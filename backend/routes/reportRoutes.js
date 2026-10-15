
import { Router } from "express";
import {
  getReportOverview,
  getSalesTrend,
  getTopProducts,
  getPaymentBreakdown,
  getInventoryReport,
} from "../controllers/reportController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.use(authorize("owner", "manager"));

router.get("/overview", getReportOverview);
router.get("/sales-trend", getSalesTrend);
router.get("/top-products", getTopProducts);
router.get("/payments", getPaymentBreakdown);
router.get("/inventory", getInventoryReport);

export default router;
