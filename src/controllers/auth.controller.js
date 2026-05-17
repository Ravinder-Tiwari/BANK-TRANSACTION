const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")

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

    const token = jwt.sign({
        userId: user._id
    },
        process.env.JWT_SECRET,
    {
        expiresIn:"3d"
    })

    res.cookie("token",token)

    res.status(201).json({
        message:"user registered successfully",
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },
        token
    })

    await emailService.sendRegisterEmail(user.email,user.name)
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

    res.cookie("token",token)

    res.status(200).json({
        message:"user logged in successfully",
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },
        token
    })

}

module.exports = {
    userRegisterController,
    userLoginController
}