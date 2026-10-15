
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Shop from "../models/Shop.js";

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      shopId: user.shop._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      algorithm: "HS256",
    }
  );
}

export async function register(req, res, next) {
  let createdShop = null;

  try {
    const shopName = String(req.body.shopName || "").trim();
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    // Validate shop name
    if (!shopName || shopName.length > 150) {
      return res.status(400).json({
        success: false,
        message:
          "Shop name is required and must be 150 characters or fewer.",
      });
    }

    // Validate owner name
    if (!name || name.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Your name is required and must be 100 characters or fewer.",
      });
    }

    // Validate email
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    // Validate password
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    // Email addresses must be unique across all accounts.
    const existingUser = await User.exists({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists. Please log in.",
      });
    }

    // Create a separate shop for this new registration.
    createdShop = await Shop.create({
      name: shopName,
      currency: "PKR",
      timezone: "Asia/Karachi",
    });

    // Hash the owner's password.
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the shop owner.
    const user = await User.create({
      shop: createdShop._id,
      name,
      email,
      password: hashedPassword,
      role: "owner",
    });

    // Populate the shop reference for JWT creation.
    user.shop = createdShop;

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Shop and owner account created successfully.",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          shopId: createdShop._id,
        },
      },
    });
  } catch (error) {
    // Clean up the new shop if owner creation fails.
    if (createdShop) {
      try {
        await User.deleteMany({
          shop: createdShop._id,
        });

        await Shop.findByIdAndDelete(createdShop._id);
      } catch (cleanupError) {
        console.error(
          "Registration cleanup failed:",
          cleanupError
        );
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This email may already be registered. Try logging in.",
      });
    }

    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = req.body.password;

    if (
      !email ||
      email.length > 254 ||
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and password",
      });
    }

    const user = await User.findOne({ email })
      .select("+password")
      .populate("shop", "_id isActive");

    if (!user || !user.isActive || !user.shop?.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          shopId: user.shop._id,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req, res) {
  const shop = await Shop.findById(req.shop._id).select(
    "name logoUrl phone address currency timezone invoicePrefix taxEnabled taxRate"
  );

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      shop,
    },
  });
}