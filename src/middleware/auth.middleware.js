const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")


async function authMiddleware(req,res,next){

    try {
        const token = req.cookies.token || req.headers.Authorization?.split(" ")[1] 

        if(!token){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET)

        const user = await userModel.findById(decoded.userId)

        req.user = user

    } catch (error) {
        return res.status(401).json({
            message:"Unauthorized acccess, invalid token"
        })
    }

    return next()
}

module.exports = {
    authMiddleware
}