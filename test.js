require("dotenv").config({ path: "./backend/.env" });
const mongoose = require("mongoose");
const accountModel = require("./backend/src/models/account.model");
const userModel = require("./backend/src/models/user.model");
const transactionModel = require("./backend/src/models/transaction.model");
const ledgerModel = require("./backend/src/models/ledger.model");

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const users = await userModel.find();
        console.log("Users:", users.length);
        if (users.length < 2) {
            console.log("Not enough users to test transfer");
            return;
        }

        const fromUser = users[0];
        const toUser = users[1];

        const fromAccountDoc = await accountModel.findOne({ user: fromUser._id, status: "ACTIVE" });
        const toAccountDoc = await accountModel.findOne({ user: toUser._id, status: "ACTIVE" });

        if (!fromAccountDoc || !toAccountDoc) {
            console.log("Accounts not found");
            return;
        }

        console.log("From Account Balance:", await fromAccountDoc.getBalance());

        const numericAmount = 1;
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
            console.log("Transaction committed successfully");
        } catch (err) {
            console.error("Transaction Error:", err.message);
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    } catch (e) {
        console.error("Global error:", e.message);
    } finally {
        mongoose.disconnect();
    }
}
run();
