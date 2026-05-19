const mongoose = require("mongoose")

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "account must be associated with a user"],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FROZEN", "CLOSED"],
            message: "status can only be ACTIVE, FROZEN or CLOSED"
        },
        default: "ACTIVE",
    },
    currency: {
        type: String,
        required: [true, "currency is required for creating an account"],
        default: "INR"
    }
}, {
    timestamps: true
})

accountSchema.index({ user: 1,status: 1 })

accountSchema.methods.getBalance = async function () {
    const Transaction = mongoose.model("transaction");

    const balanceData = await Transaction.aggregate([
        {
            $match: {
                $or: [
                    { fromAccount: this._id },
                    { toAccount: this._id }
                ]
            }
        },
        {
            $group: {
                _id: null,

                totalDebits: {
                    $sum: {
                        $cond: [
                            { $eq: ["$fromAccount", this._id] },
                            "$amount",
                            0
                        ]
                    }
                },

                totalCredits: {
                    $sum: {
                        $cond: [
                            { $eq: ["$toAccount", this._id] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalDebits: 1,
                totalCredits: 1,
                balance: {
                    $subtract: ["$totalCredits", "$totalDebits"]
                }
            }
        }
    ]);

    if (!balanceData.length) {
        return {
            totalDebits: 0,
            totalCredits: 0,
            balance: 0
        };
    }

    return balanceData[0].balance;
};


const accountModel = mongoose.model("account", accountSchema)

module.exports = accountModel