const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Set toJSON to include virtuals
orderItemSchema.set('toObject', { virtuals: true });
orderItemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);