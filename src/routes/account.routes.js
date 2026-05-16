const {Router} = require('express');
const authMiddleware = require("../middleware/auth.middleware.js")
const accountController = require("../controllers/account.controller.js")

const accountRouter = Router()

accountRouter.post("/createAccount",authMiddleware.authMiddleware,accountController.createAccount)


module.exports = accountRouter