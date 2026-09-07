const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define enums to match C# versions
const Condition = Object.freeze({
  New: 1,
  Used: 2,
  Refurbished: 3
});

const Currency = Object.freeze({
  YER_Sanaa: 1,
  YER_Aden: 2,
  USD: 3,
  SAR: 4,
  EUR: 5
});

const productSchema = new Schema({
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: Number,
    enum: Object.values(Currency),
    default: Currency.YER_Sanaa
  },
  condition: {
    type: Number,
    enum: Object.values(Condition),
    default: Condition.New
  },
  stockQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  mainImageUrl: {
    type: String
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for product's category (populated when needed)
productSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// Virtual for product's seller (populated when needed)
productSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true
});

// Set toJSON to include virtuals
productSchema.set('toObject', { virtuals: true });
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
module.exports.Condition = Condition;
module.exports.Currency = Currency;