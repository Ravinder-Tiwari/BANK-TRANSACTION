const accountModel = require("../models/account.model.js")
const userModel = require("../models/user.model.js")
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


    const fromUserAccount = await accountModel.findById(fromAccount)
    const toUserAccount = await accountModel.findById(toAccount).populate("user")

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "fromAccount or toAccount not found"
        })
    }

    if (fromUserAccount.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            message: "Unauthorized: You can only transfer funds from your own accounts"
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

    const fromUserEmail = req.user.email;
    const toUserEmail = toUserAccount.user?.email;

    try {
        // Send DEBIT email to sender
        await emailService.sendTransactionEmail(
            fromUserEmail,
            req.user.name,
            amount,
            "DEBIT"
        );

        // Send CREDIT email to receiver
        if (toUserEmail && toUserAccount.user?.name) {
            await emailService.sendTransactionEmail(
                toUserEmail,
                toUserAccount.user.name,
                amount,
                "CREDIT"
            );
        }
    } catch (emailErr) {
        console.error("Failed to send transaction notification emails:", emailErr.message);
    }

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

async function getUserTransactions(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id });
        const accountIds = userAccounts.map(acc => acc._id);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const typeFilter = req.query.type || 'all'; // 'all', 'credit', 'debit'

        let query = {
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        };

        if (typeFilter === 'credit') {
            query = { toAccount: { $in: accountIds } };
        } else if (typeFilter === 'debit') {
            query = { fromAccount: { $in: accountIds } };
        }

        const total = await transactionModel.countDocuments(query);
        const transactions = await transactionModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'fromAccount',
                populate: { path: 'user', select: 'name email' }
            })
            .populate({
                path: 'toAccount',
                populate: { path: 'user', select: 'name email' }
            });

        const formattedTransactions = transactions.map(tx => {
            const isCredit = accountIds.some(id => id.toString() === tx.toAccount._id.toString());
            const partnerAccount = isCredit ? tx.fromAccount : tx.toAccount;
            const partnerName = partnerAccount?.user?.name || "External Account";

            return {
                _id: tx._id,
                id: tx._id,
                date: tx.createdAt,
                description: isCredit ? `Received from ${partnerName}` : `Sent to ${partnerName}`,
                type: isCredit ? 'credit' : 'debit',
                amount: tx.amount,
                status: tx.status,
                account: isCredit ? tx.toAccount._id : tx.fromAccount._id
            };
        });

        res.status(200).json({
            transactions: formattedTransactions,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({
            message: "Something went wrong while fetching transactions",
            error: err.message
        });
    }
}

async function transferFunds(req, res) {
    const { toAccountId, amount } = req.body;

    if (!toAccountId || !amount) {
        return res.status(400).json({
            message: "Receiver account (ID or Email) and amount are required"
        });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number greater than zero"
        });
    }

    try {
        const fromAccountDoc = await accountModel.findOne({ user: req.user._id, status: "ACTIVE" });
        if (!fromAccountDoc) {
            return res.status(400).json({
                message: "No active account found for sender"
            });
        }

        let toAccountDoc;
        const isEmail = /^\S+@\S+\.\S+$/.test(toAccountId);
        if (isEmail) {
            const receiverUser = await userModel.findOne({ email: toAccountId.toLowerCase() });
            if (!receiverUser) {
                return res.status(404).json({
                    message: "No user found with the provided email address"
                });
            }
            toAccountDoc = await accountModel.findOne({ user: receiverUser._id, status: "ACTIVE" }).populate("user");
        } else {
            if (!mongoose.Types.ObjectId.isValid(toAccountId)) {
                return res.status(400).json({
                    message: "Invalid Account ID format"
                });
            }
            toAccountDoc = await accountModel.findOne({ _id: toAccountId, status: "ACTIVE" }).populate("user");
        }

        if (!toAccountDoc) {
            return res.status(404).json({
                message: "Receiver account not found or is not ACTIVE"
            });
        }

        if (fromAccountDoc._id.toString() === toAccountDoc._id.toString()) {
            return res.status(400).json({
                message: "Cannot transfer money to the same account"
            });
        }

        const balance = await fromAccountDoc.getBalance();
        if (balance < numericAmount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is $${balance}. Required is $${numericAmount}.`
            });
        }

        const crypto = require("crypto");
        const idempotencyKey = crypto.randomBytes(16).toString("hex");

        const session = await mongoose.startSession();
        session.startTransaction();

        let transaction;
        try {
            transaction = (await transactionModel.create([{
                fromAccount: fromAccountDoc._id,
                toAccount: toAccountDoc._id,
                amount: numericAmount,
                idempotencyKey,
                status: "PENDING"
            }], { session }))[0];

            await ledgerModel.create([{
                account: fromAccountDoc._id,
                transaction: transaction._id,
                type: "DEBIT",
                amount: numericAmount
            }], { session });

            await ledgerModel.create([{
                account: toAccountDoc._id,
                transaction: transaction._id,
                type: "CREDIT",
                amount: numericAmount
            }], { session });

            transaction.status = "COMPLETED";
            await transaction.save({ session });

            await session.commitTransaction();
            session.endSession();
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }

        try {
            await emailService.sendTransactionEmail(
                req.user.email,
                req.user.name,
                numericAmount,
                "DEBIT"
            );

            if (toAccountDoc.user?.email) {
                await emailService.sendTransactionEmail(
                    toAccountDoc.user.email,
                    toAccountDoc.user.name,
                    numericAmount,
                    "CREDIT"
                );
            }
        } catch (emailErr) {
            console.error("Failed to send transaction notification emails:", emailErr.message);
        }

        res.status(200).json({
            message: "Transfer processed successfully",
            transaction
        });

    } catch (err) {
        res.status(500).json({
            message: "An error occurred during transfer",
            error: err.message
        });
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getUserTransactions,
    transferFunds
}