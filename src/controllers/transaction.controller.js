const accountModel = require("../models/account.model.js")
const transactionModel = require("../models/transaction.model.js")
const ledgerModel = require("../models/ledger.model.js")
const emailService = require("../services/email.service.js")
const mongoose = require("mongoose")

/**
 * This file contains the controller functions for handling transactions in the banking application.
 * - The 10 steps to process a transaction are as follows:
    * 1. Validate request
    * 2. validate idempotency key
    * 3. check account status
    * 4. derive sender balance from ledger
    * 5. create transaction with status PENDING
    * 6. create DEBIT ledger entry
    * 7. create CREDIT ledger entry
    * 8. Mark transaction as COMPLETED
    * 9. Commit MongoDB session
    * 10. Send notification emails to sender and receiver
 */

async function createTransaction(req, res) {

    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    /**
     * Step 1: Validate request
     */
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required to process transaction"
        })
    }


    const fromUserAccount = await accountModel.findById({
        _id: fromAccount,
    })

    const toUserAccount = await accountModel.findById({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "fromAccount or toAccount not found"
        })
    }

    /**
     * Step 2: Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {

        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "transaction has already been processed",
                transaction: isTransactionAlreadyExists
            })
        }
        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "transaction is being processed",
                transaction: isTransactionAlreadyExists
            })
        }
        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(200).json({
                message: "transaction has already been processed and failed",
                transaction: isTransactionAlreadyExists
            })
        }
        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(200).json({
                message: "transaction has already been processed and reversed",
                transaction: isTransactionAlreadyExists
            })
        }
    }

    /**
     * Step 3: Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "both sender and receiver accounts must be ACTIVE to process transaction"
        })
    }

    /**
     * Step 4: Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()
    console.log(balance)
    if (balance < amount) {
        return res.status(400).json({
            message: `insufficient balance. current balance is ${balance} ${fromUserAccount.currency}.Required balance is ${amount} ${fromUserAccount.currency}`
        })
    }


    /**
     * Step 5: Create transaction with status PENDING
     */

    const session = await mongoose.startSession()
    session.startTransaction()

    let transaction;
    try {
        transaction = (await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session }))[0]

        /**
         * Step 6: Create DEBIT ledger entry
         */

        const debitLedgerEntry = await ledgerModel.create([{
            account: fromAccount,
            transaction: transaction._id,
            type: "DEBIT",
            amount
        }], { session })

        /**
         * Step 7: Create CREDIT ledger entry
         */

        await (() => {
            return new Promise((resolve) =>
                setTimeout(resolve, 15 * 100))
        })()

        const creditLedgerEntry = await ledgerModel.create([{
            account: toAccount,
            transaction: transaction._id,
            type: "CREDIT",
            amount
        }], { session })

        /**
         * Step 8: Mark transaction as COMPLETED
         */

        transaction.status = "COMPLETED"
        await transaction.save({ session })



        /** 
         * 9. Commit MongoDB session
         */

        await session.commitTransaction()
        await session.endSession()


    }
    catch (err) {
        return res.status(400).json({
            message: "transaction is Pending due to some issues please try again after some time",
        })
    }
    /**
  * 10. Send notification emails to sender and receiver
  */

    const fromUserEmail = req.user.email
    const toUserEmail = toUserAccount.user.email

    await emailService.sendTransactionEmail(
        fromUserEmail,
        req.user.name,
        amount,
        toUserAccount._id,
    )

    res.status(201).json({
        message: "transaction processed successfully",
        transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required to process transaction"
        })
    }

    const toUserAccount = await accountModel.findById({
        _id: toAccount
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "toAccount not found"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "system account not found for the user"
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        transaction: transaction._id,
        amount: amount,
        type: "DEBIT",
        amount
    }], { session })

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        transaction: transaction._id,
        amount: amount,
        type: "CREDIT",
        amount
    }], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()

    session.endSession()

    res.status(201).json({
        message: "initial funds transaction processed successfully",
        transaction
    })

}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}