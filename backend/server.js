const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Enable CORS for React app
app.use(cors({
  origin: 'http://192.168.126.87:3000',
  methods: 'GET, POST, PUT, DELETE',
  allowedHeaders: 'Content-Type, Authorization'
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ai4cyber', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Incident collection schema
const IncidentSchema = new mongoose.Schema({
  timestamp: Date,
  description: String,
  ttp: String,
  xaiLink: String,
  rawData: String,
});

const Incident = mongoose.model('Incident', IncidentSchema);

// STIX Alert collection schema
const StixAlertSchema = new mongoose.Schema({}, { strict: false });
const StixAlert = mongoose.model('StixAlert', StixAlertSchema, 'stixalerts');

// Endpoint to fetch the last 20 incidents (most recent first)
app.get('/api/incidents', async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ timestamp: -1 }).limit(20);
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Endpoint to fetch a specific STIX alert by ID
app.get('/api/stixalerts/:id', async (req, res) => {
  try {
    const alert = await StixAlert.findOne({ flowID: req.params.id }); 
    // console.log(req.params.id, alert);
    if (!alert) {
      return res.status(404).json({ message: 'STIX alert not found' });
    }
    res.json(alert.stixData); // optionally return only the STIX data if you want a cleaner output
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start the backend server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});