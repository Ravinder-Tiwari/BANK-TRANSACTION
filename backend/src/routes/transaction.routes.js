const {Router} = require('express');
const  authMiddleware  = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transaction.controller');


const transactionRouter = Router()

/**
 * @route POST /api/transactions/
 * @desc Create a new transaction between two accounts
 */
transactionRouter.post("/",authMiddleware.authMiddleware,transactionController.createTransaction)

/**
 * @route POST /api/transactions/transfer
 * @desc Transfer funds to another account ID or email address
 */
transactionRouter.post("/transfer",authMiddleware.authMiddleware,transactionController.transferFunds)

/**
 * @route GET /api/transactions/
 * @desc Get transaction history for user's accounts
 */
transactionRouter.get("/",authMiddleware.authMiddleware,transactionController.getUserTransactions)

/**
 *  - POST /api/transactions/initial-funds
 *  - Create initial funds transaction for a user from system account to user's account
 */

transactionRouter.post("/system/initial-funds",authMiddleware.authSystemUserMiddleware,transactionController.createInitialFundsTransaction)

module.exports = transactionRouter