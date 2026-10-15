
import { Router } from "express";
import {
  listExpenses,
  getProfitSummary,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/summary", authorize("owner", "manager"), getProfitSummary);
router.get("/", authorize("owner", "manager"), listExpenses);

router.post("/", authorize("owner", "manager"), createExpense);
router.patch("/:id", authorize("owner", "manager"), updateExpense);
router.delete("/:id", authorize("owner", "manager"), deleteExpense);

export default router;
