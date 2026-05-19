const {Router} = require("express")
const authController = require("../controllers/auth.controller")
const { authMiddleware } = require("../middleware/auth.middleware")

const authRouter = Router()

authRouter.post("/register",authController.userRegisterController)
authRouter.post("/login",authController.userLoginController)

/**
 * - POST /api/auth/logout
 */
authRouter.post("/logout", authController.userLogoutController)

/**
 * - GET /api/auth/me
 */
authRouter.get("/me", authMiddleware, authController.getMe)

module.exports = authRouter