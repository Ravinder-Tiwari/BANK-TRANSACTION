const userModel = require("../models/user.model")
const accountModel = require("../models/account.model")
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlacklistModel = require("../models/blacklist.model")
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
}

async function userRegisterController(req, res) {

    const { email, password, name } = req.body

    const isExists = await userModel.findOne({
        email: email
    })

    if (isExists) {
        return res.status(422).json({
            message: "user already exits with email.",
            status: "failed"
        })
    }


    const user = await userModel.create({
        email, password, name
    })

    // Create default active bank account for the user
    const account = await accountModel.create({
        user: user._id,
        currency: "USD"
    })

    // Deposit $10,000 as initial sign-up bonus
    const systemAccountId = new mongoose.Types.ObjectId("000000000000000000000000");
    const crypto = require("crypto");
    const transaction = await transactionModel.create({
        fromAccount: systemAccountId,
        toAccount: account._id,
        amount: 10000,
        idempotencyKey: crypto.randomBytes(16).toString("hex"),
        status: "COMPLETED"
    })

    await ledgerModel.create({
        account: account._id,
        transaction: transaction._id,
        type: "CREDIT",
        amount: 10000
    })

    const token = jwt.sign({
        userId: user._id
    },
        process.env.JWT_SECRET,
    {
        expiresIn:"3d"
    })

    res.cookie("token",token,cookieOptions)

    res.status(201).json({
        message:"user registered successfully",
        user:{
            _id:user._id,
            email:user.email,
            name:user.name,
            accountId: account._id // include accountId in response
        },
        token
    })

    try {
        await emailService.sendRegisterEmail(user.email,user.name)
    } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr.message);
    }
}


async function userLoginController(req,res){
    const {email,password} = req.body
    const user = await userModel.findOne({email}).select("+password")
    console.log(user)
    
    if(!user){
        return res.status(401).json({
            message:"Email or Password is INVALID"
        })
    }

    const isValidPassword = await user.comparePassword(password)
    console.log(isValidPassword)
    if(!isValidPassword){
        return res.status(401).json({
            message:"Email or Password is INVALID"
        })
    }

    const token = jwt.sign({
        userId: user._id
    },
        process.env.JWT_SECRET,
    {
        expiresIn:"3d"
    })

    res.cookie("token",token,cookieOptions)
    res.status(200).json({ user })
}

async function userLogoutController(req,res){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(400).json({
            message:"token not found in request"
        })
    }
    
    res.clearCookie("token")
    
    await tokenBlacklistModel.create({
        token:token
    })
    res.status(200).json({
        message:"user logged out successfully"
    })
}

async function getMe(req, res) {
    try {
        if (!req.user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            user: {
                _id: req.user._id,
                email: req.user.email,
                name: req.user.name
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching user profile", error: err.message });
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    getMe
}