const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  iconUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for products in this category
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'categoryId'
});

// Set toJSON to include virtuals
categorySchema.set('toObject', { virtuals: true });
categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);