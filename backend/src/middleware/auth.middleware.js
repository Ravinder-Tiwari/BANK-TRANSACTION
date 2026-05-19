const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authMiddleware(req, res, next) {

    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

         const isBlacklisted = await tokenBlacklistModel.findOne({
            token: token
        })

        if (isBlacklisted) {
            return res.status(401).json({
                message: "Unauthorized, token is blacklisted"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await userModel.findById(decoded.userId)

        req.user = user

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized acccess, invalid token"
        })
    }

    return next()
}


async function authSystemUserMiddleware(req, res, next) {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const isBlacklisted = await tokenBlacklistModel.findOne({
            token: token
        })

        if (isBlacklisted) {
            return res.status(401).json({
                message: "Unauthorized, token is blacklisted"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await userModel.findById(decoded.userId).select("+systemUser")

        if (!user.systemUser) {
            return res.status(403).json({
                message: "Forbidden, only system users are allowed to access this resource"
            })
        }
        req.user = user
        return next()
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized acccess, invalid token"
        })
    }

}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
}