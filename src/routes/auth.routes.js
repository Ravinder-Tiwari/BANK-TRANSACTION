const {Router} = require("express")
const authController = require("../controllers/auth.controller")

const authRouter = Router()

authRouter.post("/register",authController.userRegisterController)
authRouter.post("/login",authController.userLoginController)

module.exports = authRouter