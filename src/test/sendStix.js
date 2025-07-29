const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const StixAlert = require('./models/StixAlert'); // MongoDB schema for stixalert
const fs = require('fs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b', // Update passphrase if required
  },
});

const producer = kafka.producer();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ai4cyber', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Function to send all STIX alerts to Kafka
const sendStixAlerts = async () => {
  try {
    // Fetch all STIX alerts from the 'stixalert' collection
    const stixAlerts = await StixAlert.find();

    if (stixAlerts.length === 0) {
      console.log('No STIX alerts found in the collection.');
      return;
    }

    console.log(`Found ${stixAlerts.length} STIX alerts. Sending to Kafka...`);

    // Connect to the producer
    await producer.connect();

    // Loop through each STIX alert and send it to the Kafka topic
    for (const stixAlert of stixAlerts) {
      const stixData = stixAlert.stixData; // Get the STIX data from the alert

      // Send the STIX alert to the 'ai4triage.sc1.1.stix_alerts' Kafka topic
      await producer.send({
        topic: 'ai4triage.sc1.1.stix_alerts',
        messages: [
          {
            value: JSON.stringify(stixData), // Convert STIX data to string before sending
          }
        ],
      });

      console.log(`STIX alert for Flow ID ${stixAlert.flowID} sent to Kafka.`);
    }

    console.log('All STIX alerts sent successfully.');
  } catch (error) {
    console.error('Error sending STIX alerts to Kafka:', error);
  } finally {
    // Disconnect the producer after sending the messages
    await producer.disconnect();
  }
};

// Run the function to send the STIX alerts
sendStixAlerts();
