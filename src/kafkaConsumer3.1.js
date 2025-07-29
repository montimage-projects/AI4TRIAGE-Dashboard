const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Alert = require('./models/Alert');
const StixAlert = require('./models/StixAlert');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client-3.1',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-3.1'});
const producer = kafka.producer();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ai4cyber')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error("MongoDB connection error:", err));

// Normalize keys in flow_features
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
    name: 'Advanced Attack for Sensitive Data Manipulation',
    description: 'This STIX indicator represents a complex intrusion by the Wizard Spider group, where initial access is achieved via Emotet and Trickbot, leading to lateral movement, credential dumping (Mimikatz, Rubeus), backup disabling, and ultimately deployment of Ryuk ransomware.',
    indicator_types: ['malicious-activity', 'anomalous-activity', 'compromise'],
    pattern: `[ipv4-addr:value = '${flow.src_ip}'] AND [network-traffic:src_ref.value = '${flow.src_ip}'] AND [network-traffic:dst_ref.value = '${flow.dst_ip}'] AND [network-traffic:src_port = ${flow.src_port}] AND [network-traffic:dst_port = ${flow.dst_port}] AND [network-traffic:protocols[*] = '${flow.protocol || 'tcp'}']`,
    valid_from: timestampISO,
    labels: ['wizard-spider', 'emotet', 'trickbot', 'ryuk', 'data-exfiltration', 'credential-access', 'ransomware'],
    external_references: [
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/groups/G0102/',
        external_id: 'G0102', // Wizard Spider
      },
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/software/S0366/',
        external_id: 'S0366', // Emotet
      },
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/software/S0266/',
        external_id: 'S0266', // Trickbot
      },
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/software/S0446/',
        external_id: 'S0446', // Ryuk
      },
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/techniques/T1003/',
        external_id: 'T1003', // Credential Dumping
      },
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/techniques/T1486/',
        external_id: 'T1486', // Data Encrypted for Impact
      },
    ],
    custom: {
      'x-flow-features': flow,
      'x-attack-type': alert.attack_type || 'Unknown',
      'confidence': alert.confidence || 0.0,
    }
  };
};

// Kafka consumer logic
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4fids.sc3.1.events', fromBeginning: true });

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

      const timestampMicros = flow.flow_start_timestamp;
      const timestamp = new Date();
      //const timestamp = flow.timestamp ? new Date(flow.timestamp) : new Date();
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
        description: 'Sensitive data exfiltration and ransomware activity by Wizard Spider using Emotet, Trickbot, and Ryuk.',
        ttp: 'https://attack.mitre.org/groups/G0102/',
        rawData: JSON.stringify(alert),
      });
      await incident.save();
      console.log("Saved incident for dashboard:", flowID);

      try {
        await producer.connect();
        await producer.send({
          topic: 'ai4triage.sc3.1.stix_alerts',
          messages: [{ value: JSON.stringify(stixData) }],
        });
        console.log(`[${new Date().toISOString()}] Sent STIX alert to Kafka topic 'ai4triage.sc3.1.stix_alerts' for Flow ID: ${flowID}`);
      } catch (error) {
        console.error("Error sending STIX alert to Kafka:", error);
      }
    },
  });
};

run().catch(console.error);
