const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');  // MongoDB schema for incidents
const Alert = require('./models/Alert');        // MongoDB schema for alerts
const StixAlert = require('./models/StixAlert'); // MongoDB schema for stixalert
const { v4: uuidv4 } = require('uuid');         // For generating unique IDs
const fs = require('fs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client-1.3',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-1.3' });
const producer = kafka.producer();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ai4cyber')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error("MongoDB connection error:", err));

// Convert alert to STIX format
const convertToStix = (alert, timestampISO) => {
  const flow = alert.flow_features;
  return {
    type: 'indicator',
    id: `indicator--${uuidv4()}`,
    created: timestampISO,
    modified: timestampISO,
    name: 'Adversarial Evasion of IDS during OCPP DoS Attack',
    description: 'This STIX indicator represents an adversarial machine learning attack designed to evade an intrusion detection system while performing a Denial of Service (DoS) attack targeting the Open Charge Point Protocol (OCPP) in electric vehicle charging infrastructure.',
    indicator_types: ['anomalous-activity', 'evasion', 'malicious-activity', 'network-traffic'],
    pattern: `[ipv4-addr:value = '${flow.src_ip}'] AND [network-traffic:src_ref.value = '${flow.src_ip}'] AND [network-traffic:dst_ref.value = '${flow.dst_ip}'] AND [network-traffic:src_port = ${flow.src_port}] AND [network-traffic:dst_port = ${flow.dst_port}] AND [network-traffic:protocols[*] = '${flow.Protocol || 'tcp'}'] AND [network-traffic:bytes_sent > 0]`,
    valid_from: timestampISO,
    labels: ['adversarial-evasion', 'ocpp-dos', 'ids-bypass'],
    external_references: [
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/techniques/T1562/',
        external_id: 'T1562',
      },
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/techniques/T1499/',
        external_id: 'T1499',
      },
    ],
    custom: {
      'x-flow-features': alert.flow_features,
      'x-attack-type': alert.attack_type || 'Unknown',
      'confidence': alert.confidence || 0.0,
    }
  };
};

// Listen for messages from the Kafka topic
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4fids.sc1.3.events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = message.value.toString();

      let alert;
      try {
        alert = JSON.parse(messageValue);
      } catch (err) {
        console.error("Invalid JSON received:", err);
        return; // Skip malformed message
      }

      const flow = alert?.flow_features || {};
      const rawFlowID = flow.flow_id;
      if (!rawFlowID) {
        console.warn("Message ignored: Missing flow_id");
        return;
      }

      const timestampMicros = flow.flow_start_timestamp;
      const timestampISO = timestampMicros ? new Date(Math.floor(timestampMicros / 1000)).toISOString() : new Date().toISOString();
      const timestampSuffix = timestampISO.replace(/T|:|\..+$/g, "-");
      const flowID = `${rawFlowID}-${timestampSuffix}`;

      console.log("Received alert with flowID:", flowID);

      // Save the raw alert to the 'alerts' collection
      const alertData = {
        rawData: messageValue,
        flowID: flowID,
      };
      const savedAlert = new Alert(alertData);
      await savedAlert.save();

      // Convert to STIX
      const stixData = convertToStix(alert, timestampISO);
      console.log("Stix alert:", stixData);

      // Save to 'stixalert' collection
      const stixAlert = new StixAlert({
        stixData: stixData,
        flowID: flowID,
        timestamp: timestampISO,
      });
      await stixAlert.save();
      console.log("Saved STIX alert for Flow ID:", flowID);

      // Save to 'incidents' collection
      const incident = new Incident({
        id: flowID,
        timestamp: timestampISO,
        description: 'Adversarial Evasion of IDS during OCPP DoS Attack',
        ttp: 'https://attack.mitre.org/techniques/T1562/',
        rawData: JSON.stringify(alert),
      });
      await incident.save();
      console.log("Saved incident for dashboard:", flowID);

      // Send STIX alert to Kafka topic
      try {
        await producer.connect();
        await producer.send({
          topic: 'ai4triage.sc1.3.stix_alerts',
          messages: [{ value: JSON.stringify(stixData) }],
        });
        console.log(`[${new Date().toISOString()}] Sent STIX alert to Kafka topic 'ai4triage.sc1.3.stix_alerts' for Flow ID: ${flowID}`);
      } catch (error) {
        console.error("Error sending STIX alert to Kafka:", error);
      }
    },
  });
};

run().catch(console.error);
