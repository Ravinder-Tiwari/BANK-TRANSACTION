const mongoose = require("mongoose")


const transactionSchema = new mongoose.Schema({
    fromAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "transaction must have a source account"],
        index: true
    },
    toAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "transaction must have a destination account"],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: ["PENDING", "COMPLETED", "FAILED","REVERSED"],
            message: "status can only be PENDING, COMPLETED , FAILED or REVERSED"
        },
        default: "PENDING",
    },
    amount: {
        type: Number,
        required: [true, "transaction amount is required"],
        min: [0, "transaction amount cannot be negative"],
        index: true
    },
    idempotencyKey: {
        type: String,
        required: [true, "idempotency key is required for processing transaction"],
        unique: true
    }
}, {
    timestamps: true
})


const transactionModel = mongoose.model("transaction", transactionSchema)

module.exports = transactionModel