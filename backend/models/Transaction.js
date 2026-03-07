const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'purchase', 'sale', 'refund', 'commission', 'freeze', 'unfreeze'],
    required: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USDT' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: { type: String },
  deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },

  // Crypto bot data
  cryptoBotInvoiceId: { type: String },
  cryptoBotPayUrl: { type: String },
  cryptoBotWithdrawId: { type: String },
  cryptoAddress: { type: String },

  // Balance snapshot
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
