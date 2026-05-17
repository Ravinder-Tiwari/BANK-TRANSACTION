const {Router} = require('express');
const authMiddleware = require("../middleware/auth.middleware.js")
const accountController = require("../controllers/account.controller.js")

const accountRouter = Router()

accountRouter.post("/createAccount",authMiddleware.authMiddleware,accountController.createAccount)

/**
 * - GET /api/accounts/
 * - Get all accounts of the authenticated user
 * - Protected Route: Requires authentication
 */

accountRouter.get("/", authMiddleware.authMiddleware, accountController.getUserAccounts)
module.exports = accountRouter