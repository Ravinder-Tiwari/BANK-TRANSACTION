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


/**
 * - GET /api/accounts/:accountId/balance
 * - Get balance of a specific account
 * - Protected Route: Requires authentication and account ownership
 */

accountRouter.get("/:accountId/balance", authMiddleware.authMiddleware, accountController.getAccountBalance)    

module.exports = accountRouter