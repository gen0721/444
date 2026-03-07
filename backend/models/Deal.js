const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

  amount: { type: Number, required: true }, // total amount
  sellerAmount: { type: Number, required: true }, // after 5% commission
  commission: { type: Number, required: true }, // 5% to admin

  status: {
    type: String,
    enum: ['pending', 'paid', 'frozen', 'completed', 'disputed', 'cancelled', 'refunded'],
    default: 'pending'
  },

  // Chat messages between buyer and seller
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // Admin actions
  adminNote: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },

  // Delivery info (hidden data from seller)
  deliveryData: { type: String },
  deliveredAt: { type: Date },

  // Confirmation
  buyerConfirmed: { type: Boolean, default: false },
  sellerConfirmed: { type: Boolean, default: false },
  autoCompleteAt: { type: Date }, // auto complete after 72h

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deal', dealSchema);
