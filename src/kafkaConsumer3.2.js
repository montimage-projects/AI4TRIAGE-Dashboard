const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Alert = require('./models/Alert');
const StixAlert = require('./models/StixAlert');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client-3.2',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-3.2' });
const producer = kafka.producer();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ai4cyber')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error("MongoDB connection error:", err));

// Normalize flow features keys
const normalizeFlowFeatures = (features) => {
  const normalized = {};
  for (const key in features) {
    normalized[key.toLowerCase().replace(/\s+/g, '_')] = features[key];
  }
  return normalized;
};

// Convert alert to STIX format
const convertToStix = (alert, timestampISO) => {
  const flow = normalizeFlowFeatures(alert.flow_features || {});

  return {
    type: 'indicator',
    id: `indicator--${uuidv4()}`,
    created: timestampISO,
    modified: timestampISO,
    name: 'Smart Fuzzing Attack on Medical Imaging Systems',
    description: 'This STIX indicator represents a smart fuzzing attack targeting Digital Imaging and Communications in Medicine (DICOM) modalities and PACS. The attacker uses advanced fuzzing techniques, including AFL and GAN-based fuzzers, to send malformed or mutated DICOM messages. These messages attempt to trigger crashes, memory corruption, or unexpected behaviors in medical imaging systems by exploiting parsing and protocol-handling vulnerabilities.',
    indicator_types: ['anomalous-activity', 'malicious-activity'],
    pattern: `[ipv4-addr:value = '${flow.src_ip}'] AND [network-traffic:src_ref.value = '${flow.src_ip}'] AND [network-traffic:dst_ref.value = '${flow.dst_ip}'] AND [network-traffic:src_port = ${flow.src_port}] AND [network-traffic:dst_port = ${flow.dst_port}] AND [network-traffic:protocols[*] = '${flow.protocol || 'tcp'}']`,
    valid_from: timestampISO,
    labels: ['smart-fuzzing', 'dicom', 'medical-targeting', 'gan-fuzzer', 'protocol-fuzzing'],
    external_references: [
      {
        source_name: 'mitre-attack',
        external_id: 'T1203',
        url: 'https://attack.mitre.org/techniques/T1203/',
      },
      {
        source_name: 'mitre-attack',
        external_id: 'T1499',
        url: 'https://attack.mitre.org/techniques/T1499/',
      },
      {
        source_name: 'mitre-attack',
        external_id: 'T1609',
        url: 'https://attack.mitre.org/techniques/T1609/',
      },
      {
        source_name: 'mitre-attack',
        external_id: 'T1204.002',
        url: 'https://attack.mitre.org/techniques/T1204/002/',
      }
    ],
    custom: {
      'x-flow-features': flow,
      'x-attack-type': alert.attack_type || 'Smart Fuzzing Attack',
      'confidence': alert.confidence || 0.8,
    }
  };
};

// Kafka consumer logic
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4fids.sc3.2.events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = message.value.toString();
      let alert;
      try {
        alert = JSON.parse(messageValue);
      } catch (err) {
        console.error("Invalid JSON received:", err);
        return;
      }

      const flowRaw = alert?.flow_features;
      if (!flowRaw) {
        console.warn("Message ignored: Missing flow_features");
        return;
      }

      const flow = normalizeFlowFeatures(flowRaw);
      const rawFlowID = flow.flow_id || `${flow.src_ip}-${flow.dst_ip}-${flow.dst_port}-${flow.src_port}-${flow.protocol}`;
      if (!rawFlowID) {
        console.warn("Message ignored: Could not generate flow_id");
        return;
      }

      const timestamp = new Date();
      const timestampISO = timestamp.toISOString();
      const timestampSuffix = timestampISO.replace(/T|:|\..+$/g, "-");
      const flowID = `${rawFlowID}-${timestampSuffix}`;

      console.log("Received alert with flowID:", flowID);

      const alertData = {
        rawData: messageValue,
        flowID: flowID,
      };
      const savedAlert = new Alert(alertData);
      await savedAlert.save();

      const stixData = convertToStix(alert, timestampISO);
      console.log("Stix alert:", stixData);

      const stixAlert = new StixAlert({
        stixData: stixData,
        flowID: flowID,
        timestamp: timestampISO,
      });
      await stixAlert.save();
      console.log("Saved STIX alert for Flow ID:", flowID);

      const incident = new Incident({
        id: flowID,
        timestamp: timestampISO,
        description: 'Smart fuzzing attack targeting medical imaging systems using AFL and GAN-based network fuzzers.',
        ttp: 'https://attack.mitre.org/techniques/T1203/',
        rawData: JSON.stringify(alert),
      });
      await incident.save();
      console.log("Saved incident for dashboard:", flowID);

      try {
        await producer.connect();
        await producer.send({
          topic: 'ai4triage.sc3.2.stix_alerts',
          messages: [{ value: JSON.stringify(stixData) }],
        });
        console.log(`[${new Date().toISOString()}] Sent STIX alert to Kafka topic 'ai4triage.sc3.2.stix_alerts' for Flow ID: ${flowID}`);
      } catch (error) {
        console.error("Error sending STIX alert to Kafka:", error);
      }
    },
  });
};

run().catch(console.error);
