const {Router} = require("express")
const authController = require("../controllers/auth.controller")

const authRouter = Router()

authRouter.post("/register",authController.userRegisterController)
authRouter.post("/login",authController.userLoginController)

/**
 * - POST /api/auth/logout
 */

authRouter.post("/logout", authController.userLogoutController)

module.exports = authRouter