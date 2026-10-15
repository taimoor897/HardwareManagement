
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Shop from "../models/Shop.js";

export async function protect(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      !mongoose.isValidObjectId(decoded.sub) ||
      !mongoose.isValidObjectId(decoded.shopId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const user = await User.findOne({
      _id: decoded.sub,
      shop: decoded.shopId,
      isActive: true,
    }).select("_id name email role shop isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive or no longer exists",
      });
    }

    const shop = await Shop.findOne({
      _id: user.shop,
      isActive: true,
    }).select("_id name currency timezone");

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "Shop is inactive or unavailable",
      });
    }

    req.user = user;
    req.shop = shop;

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }

    next(error);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
}
