const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");

async function getDashboardStats(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id });
        if (userAccounts.length === 0) {
            return res.status(200).json({
                balance: 0,
                totalCredits: 0,
                totalDebits: 0,
                recentTransactions: []
            });
        }

        const accountIds = userAccounts.map(acc => acc._id);

        // Calculate balance
        let balance = 0;
        for (const account of userAccounts) {
            const accBal = await account.getBalance();
            balance += accBal;
        }

        // Calculate total credits and debits from transactions
        const transactions = await transactionModel.find({
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ],
            status: "COMPLETED"
        });

        let totalCredits = 0;
        let totalDebits = 0;

        transactions.forEach(tx => {
            const isToUser = accountIds.some(id => id.toString() === tx.toAccount.toString());
            const isFromUser = accountIds.some(id => id.toString() === tx.fromAccount.toString());
            
            if (isToUser && isFromUser) {
                // Internal transfer, doesn't change overall balance but we could count it
            } else if (isToUser) {
                totalCredits += tx.amount;
            } else if (isFromUser) {
                totalDebits += tx.amount;
            }
        });

        // Get 5 most recent transactions
        const recentTxList = await transactionModel.find({
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
            path: 'fromAccount',
            populate: { path: 'user', select: 'name' }
        })
        .populate({
            path: 'toAccount',
            populate: { path: 'user', select: 'name' }
        });

        const recentTransactions = recentTxList.map(tx => {
            const isCredit = accountIds.some(id => id.toString() === tx.toAccount._id.toString());
            const partnerAccount = isCredit ? tx.fromAccount : tx.toAccount;
            const partnerName = partnerAccount?.user?.name || "External Account";
            
            return {
                id: tx._id,
                date: tx.createdAt.toISOString().split('T')[0],
                description: isCredit ? `Received from ${partnerName}` : `Sent to ${partnerName}`,
                type: isCredit ? 'credit' : 'debit',
                amount: tx.amount,
                status: tx.status.toLowerCase(),
            };
        });

        res.status(200).json({
            accountId: accountIds[0],
            balance,
            totalCredits,
            totalDebits,
            recentTransactions
        });
    } catch (err) {
        res.status(500).json({
            message: "Something went wrong while fetching dashboard statistics",
            error: err.message
        });
    }
}

async function getDetailedAnalytics(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id });
        if (userAccounts.length === 0) {
            return res.status(200).json({
                balanceData: [],
                categoryData: [],
                cashflowData: [],
                totalSpent: 0
            });
        }

        const accountIds = userAccounts.map(acc => acc._id);

        const transactions = await transactionModel.find({
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ],
            status: "COMPLETED"
        }).sort({ createdAt: 1 });

        let currentBalance = 0;
        for (const account of userAccounts) {
            const accBal = await account.getBalance();
            currentBalance += accBal;
        }

        const balanceData = [];
        const dateObjects = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(23, 59, 59, 999);
            dateObjects.push(d);
        }

        let runningBalance = currentBalance;
        const descTransactions = [...transactions].reverse();

        for (let i = dateObjects.length - 1; i >= 0; i--) {
            const currentDate = dateObjects[i];
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });

            while (descTransactions.length > 0 && descTransactions[0].createdAt > currentDate) {
                const tx = descTransactions.shift();
                const isToUser = accountIds.some(id => id.toString() === tx.toAccount.toString());
                const isFromUser = accountIds.some(id => id.toString() === tx.fromAccount.toString());

                if (isToUser && isFromUser) {
                    // Internal
                } else if (isToUser) {
                    runningBalance -= tx.amount;
                } else if (isFromUser) {
                    runningBalance += tx.amount;
                }
            }

            balanceData.unshift({
                name: dayName,
                balance: runningBalance
            });
        }

        let transfers = 0, shopping = 0, bills = 0, other = 0;
        transactions.forEach(tx => {
            const isFromUser = accountIds.some(id => id.toString() === tx.fromAccount.toString());
            const isToUser = accountIds.some(id => id.toString() === tx.toAccount.toString());

            if (isFromUser && !isToUser) {
                if (tx.amount > 5000) {
                    transfers += tx.amount;
                } else if (tx.amount > 1000) {
                    bills += tx.amount;
                } else if (tx.amount > 200) {
                    shopping += tx.amount;
                } else {
                    other += tx.amount;
                }
            }
        });

        const totalSpent = transfers + shopping + bills + other;
        const categoryData = [
            { name: 'Transfers', value: transfers, color: '#4F46E5' },
            { name: 'Shopping', value: shopping, color: '#10B981' },
            { name: 'Bills', value: bills, color: '#F43F5E' },
            { name: 'Other', value: other, color: '#F59E0B' },
        ];

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const cashflowData = [];

        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthLabel = monthNames[month];

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

            let income = 0;
            let expenses = 0;

            transactions.forEach(tx => {
                if (tx.createdAt >= startOfMonth && tx.createdAt <= endOfMonth) {
                    const isToUser = accountIds.some(id => id.toString() === tx.toAccount.toString());
                    const isFromUser = accountIds.some(id => id.toString() === tx.fromAccount.toString());

                    if (isToUser && !isFromUser) {
                        income += tx.amount;
                    } else if (isFromUser && !isToUser) {
                        expenses += tx.amount;
                    }
                }
            });

            cashflowData.push({
                month: monthLabel,
                income,
                expenses
            });
        }

        res.status(200).json({
            balanceData,
            categoryData,
            cashflowData,
            totalSpent
        });

    } catch (err) {
        res.status(500).json({
            message: "Something went wrong while fetching detailed analytics",
            error: err.message
        });
    }
}

module.exports = {
    getDashboardStats,
    getDetailedAnalytics
};
