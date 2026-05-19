const { Router } = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const analyticsController = require("../controllers/analytics.controller");

const analyticsRouter = Router();

analyticsRouter.get("/dashboard", authMiddleware, analyticsController.getDashboardStats);
analyticsRouter.get("/detailed", authMiddleware, analyticsController.getDetailedAnalytics);

module.exports = analyticsRouter;
