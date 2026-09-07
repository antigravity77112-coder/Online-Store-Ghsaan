const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define enums to match C# versions
const OrderStatus = Object.freeze({
  Pending: 1,
  Processing: 2,
  Shipped: 3,
  Delivered: 4,
  Cancelled: 5
});

const PaymentMethod = Object.freeze({
  COD: 1,
  BankTransfer: 2,
  CreditCard: 3,
  CashOnDelivery: 4
});

const Currency = Object.freeze({
  YER_Sanaa: 1,
  YER_Aden: 2,
  USD: 3,
  SAR: 4,
  EUR: 5
});

const orderSchema = new Schema({
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: Number,
    enum: Object.values(Currency),
    default: Currency.YER_Sanaa
  },
  status: {
    type: Number,
    enum: Object.values(OrderStatus),
    default: OrderStatus.Pending
  },
  shippingAddress: {
    type: String,
    required: true,
    trim: true
  },
  paymentMethod: {
    type: Number,
    enum: Object.values(PaymentMethod),
    default: PaymentMethod.COD
  },
  orderDate: {
    type: Date,
    default: Date.now
  }
});

// Virtual for order items
orderSchema.virtual('orderItems', {
  ref: 'OrderItem',
  localField: '_id',
  foreignField: 'orderId'
});

// Set toJSON to include virtuals
orderSchema.set('toObject', { virtuals: true });
orderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
module.exports.OrderStatus = OrderStatus;
module.exports.PaymentMethod = PaymentMethod;