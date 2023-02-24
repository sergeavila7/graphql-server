const mongoose = require('mongoose');

const OrderSchema = mongoose.Schema({
  order: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  client: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
    ref: 'Client',
  },
  seller: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
    ref: 'User',
  },
  state: {
    type: String,
    default: 'PENDIENTE',
  },
  create: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model('Order', OrderSchema);
