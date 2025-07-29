const mongoose = require('mongoose');

const stixAlertSchema = new mongoose.Schema({
  stixData: { type: Object, required: true }, // The STIX data in the format we generate
  flowID: { type: String, required: true },   // The Flow ID of the alert
  timestamp: { type: String, required: true }, // Timestamp of when the alert was created
});

const StixAlert = mongoose.model('StixAlert', stixAlertSchema);

module.exports = StixAlert;  // Ensure StixAlert is exported
