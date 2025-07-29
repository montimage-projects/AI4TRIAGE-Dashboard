const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Alert = require('./models/Alert');
const StixAlert = require('./models/StixAlert');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client-3.3',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-3.3' });
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
    name: 'AI-powered Internal Penetration Testing Attack',
    description: 'This STIX indicator represents an AI-powered internal penetration testing attack. The AI system first scans the target for open ports, then selects known exploits from a historical database to attempt breaches. In aggressive mode, it performs exhaustive combinations of exploits and payloads to find vulnerabilities.',
    indicator_types: ['anomalous-activity', 'malicious-activity'],
    pattern: `[ipv4-addr:value = '${flow.src_ip}'] AND [network-traffic:src_ref.value = '${flow.src_ip}'] AND [network-traffic:dst_ref.value = '${flow.dst_ip}'] AND [network-traffic:src_port = ${flow.src_port}] AND [network-traffic:dst_port = ${flow.dst_port}] AND [network-traffic:protocols[*] = '${flow.protocol || 'tcp'}']`,
    valid_from: timestampISO,
    labels: ['ai-penetration-testing', 'automated-recon', 'exploit-database', 'exhaustive-fuzzing'],
    external_references: [
      {
        source_name: 'mitre-attack',
        external_id: 'T1595',
        url: 'https://attack.mitre.org/techniques/T1595/',
      },
      {
        source_name: 'mitre-attack',
        external_id: 'T1588.006',
        url: 'https://attack.mitre.org/techniques/T1588/006/',
      },
      {
        source_name: 'mitre-attack',
        external_id: 'T1210',
        url: 'https://attack.mitre.org/techniques/T1210/',
      },
      {
        source_name: 'mitre-attack',
        external_id: 'T1587.001',
        url: 'https://attack.mitre.org/techniques/T1587/001/',
      }
    ],
    custom: {
      'x-flow-features': flow,
      'x-attack-type': alert.attack_type || 'AI-Powered Penetration Testing',
      'confidence': alert.confidence || 0.9,
    }
  };
};

// Kafka consumer logic
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4fids.sc3.3.events', fromBeginning: true });

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
        description: 'AI-powered internal penetration testing leveraging known exploits and exhaustive fuzzing to compromise targets.',
        ttp: 'https://attack.mitre.org/techniques/T1595/',
        rawData: JSON.stringify(alert),
      });
      await incident.save();
      console.log("Saved incident for dashboard:", flowID);

      try {
        await producer.connect();
        await producer.send({
          topic: 'ai4triage.sc3.3.stix_alerts',
          messages: [{ value: JSON.stringify(stixData) }],
        });
        console.log(`[${new Date().toISOString()}] Sent STIX alert to Kafka topic 'ai4triage.sc3.3.stix_alerts' for Flow ID: ${flowID}`);
      } catch (error) {
        console.error("Error sending STIX alert to Kafka:", error);
      }
    },
  });
};

run().catch(console.error);
