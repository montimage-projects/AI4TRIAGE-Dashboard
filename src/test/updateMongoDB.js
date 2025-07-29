const mongoose = require('mongoose');
const Alert = require('./models/Alert');  // MongoDB schema for alerts
const StixAlert = require('./models/StixAlert'); // MongoDB schema for stixalert
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ai4cyber', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Convert alert to STIX format
const convertToStix = (alert) => {
  // For simplicity, we will convert it to a basic STIX format
  return {
    type: 'bundle',
    id: `bundle--${uuidv4()}`,
    spec_version: '2.0',
    objects: [
      {
        type: 'indicator',
        id: `indicator--${uuidv4()}`,
        name: `Flow ID: ${alert.flowID}`,
        description: alert.attack_type,
        pattern: `[ipv4-addr:value = '${alert.flow_features["Src IP"]}']`, // Example pattern for flow source IP
        valid_from: alert.flow_features.Timestamp,
        created: alert.flow_features.Timestamp,
        modified: alert.flow_features.Timestamp,
      },
      {
        type: 'attack-pattern',
        id: `attack-pattern--${uuidv4()}`,
        name: alert.attack_type,
        description: 'Attack Pattern Description',
        external_references: [
          {
            source_name: 'mitre-attack',
            external_id: 'T1234', // Use the appropriate TTP code from MITRE ATT&CK
          }
        ]
      }
    ]
  };
};

// Fetch alerts from the 'alerts' collection and convert to STIX format
const updateAlerts = async () => {
  try {
    // Retrieve all alerts from the 'alerts' collection
    const alerts = await Alert.find();

    console.log(`Found ${alerts.length} alerts`);

    // Iterate over each alert, convert to STIX, and save to 'stixalert'
    for (let alert of alerts) {
      const stixData = convertToStix(alert); // Convert alert to STIX format

      const stixAlert = new StixAlert({
        stixData: stixData,
        flowID: alert.flowID,
        timestamp: alert.timestamp,
      });

      // Save the STIX alert to the 'stixalert' collection
      await stixAlert.save();
      console.log(`Saved STIX alert for Flow ID: ${alert.flowID}`);
    }

    console.log('Update completed successfully.');
  } catch (error) {
    console.error('Error during update:', error);
  }
};

// Run the update process
updateAlerts();
