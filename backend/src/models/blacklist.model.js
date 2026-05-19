const mongoose = require("mongoose")
const { create } = require("./user.model")


const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to blacklist"],
        unique: true
    }
}, {
    timestamps: true
})

tokenBlacklistSchema.index(
    {
        createdAt: 1
    }, {
        expires: 60 * 60 * 24 * 3 // 3 days
})


const tokenBlacklistModel = mongoose.model("tokenBlacklist", tokenBlacklistSchema)

module.exports = tokenBlacklistModel