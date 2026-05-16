const accountModel = require("../models/account.model")


async function createAccount(req, res) {

    try {

        const user = req.user
        const account = await accountModel.create({
            user: user._id
        })

        res.status(201).json({
            message: "account created successfully",
            account
        })
    }
    catch (err) {
        res.status(500).json({
            message: "something went wrong while creating account",
            error: err.message
        })
    }
}


module.exports = {
    createAccount
}