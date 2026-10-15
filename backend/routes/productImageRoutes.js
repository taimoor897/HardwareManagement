import express from "express";
import { protect } from "../middleware/auth.js";
import { searchProductImages } from "../controllers/productImageController.js";

const router = express.Router();

router.get("/search", protect, searchProductImages);

export default router;