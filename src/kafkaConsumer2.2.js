const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const StixAlert = require('./models/StixAlert');
const fs = require('fs');

// Kafka config (no auth, local)
const kafka = new Kafka({
  clientId: 'ai4cyber-client-2.2',
  brokers: ['localhost:9093'],
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-2.2' });

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ai4cyber')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Kafka consumer logic
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4triage.sc2.2.stix_alerts', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = message.value.toString();
      let stixAlertData;
      try {
        stixAlertData = JSON.parse(messageValue);
      } catch (err) {
        console.error("❌ Invalid JSON received:", err);
        return;
      }

      const flowID = stixAlertData?.custom?.['x-flow-features']?.flow_id || stixAlertData?.id || `unknown-${Date.now()}`;
      const timestampISO = new Date().toISOString();

      // Save to StixAlert collection
      try {
        const stixAlert = new StixAlert({
          stixData: stixAlertData,
          flowID,
          timestamp: timestampISO,
        });
        await stixAlert.save();
        console.log(`✅ Saved STIX alert [Flow ID: ${flowID}]`);
      } catch (err) {
        console.error("❌ Error saving STIX alert:", err);
        return;
      }

      // Save to Incident collection (based on STIX alert as-is)
      try {
        const incident = new Incident({
          id: flowID,
          timestamp: timestampISO,
          description: stixAlertData.description || 'No description',
          ttp: stixAlertData?.external_references?.[0]?.url || '',
          rawData: JSON.stringify(stixAlertData),
        });
        await incident.save();
        console.log(`✅ Saved incident for Flow ID: ${flowID}`);
      } catch (err) {
        console.error("❌ Error saving incident:", err);
      }
    },
  });
};

run().catch(console.error);
