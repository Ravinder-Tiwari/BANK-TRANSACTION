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

async function getUserAccounts(req, res) {
    const accounts = await accountModel.find({
        user: req.user._id
    })
    res.status(200).json({
        message: "accounts fetched successfully",
        accounts
    })
}


async function getAccountBalance(req, res) {
    const accountId = req.params.accountId

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    }) 
    
    console.log(account)

    if (!account) {
        return res.status(404).json({
            message: "account not found for the user"
        })
    }

    const balance = await account.getBalance();
    
    res.status(200).json({
        accountId : account._id,
        balance : balance
    })

}

module.exports = {
    createAccount,
    getUserAccounts,
    getAccountBalance
}