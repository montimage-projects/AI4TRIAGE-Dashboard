const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  flowID: { type: String, required: true }, // Flow ID from the alert
  rawData: { type: String, required: true }, // Raw alert data
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
