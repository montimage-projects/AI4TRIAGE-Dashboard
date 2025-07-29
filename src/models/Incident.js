const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  id: { type: String, required: true },  // Flow ID
  timestamp: { type: String, required: true },
  description: { type: String, required: true },
  ttp: { type: String, required: true },
  xaiLink: { type: String, default: 'http://192.168.126.91/app/dashboard' },
  rawData: { type: String, required: true },
});

const Incident = mongoose.model('Incident', incidentSchema);

module.exports = Incident;
