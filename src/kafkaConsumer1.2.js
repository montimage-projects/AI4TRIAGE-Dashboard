const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const Alert = require('./models/Alert');
const StixAlert = require('./models/StixAlert');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const kafka = new Kafka({
  clientId: 'ai4cyber-client-1.2',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-1.2' });
const producer = kafka.producer();

mongoose.connect('mongodb://localhost:27017/ai4cyber', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err));

// Convert alert to STIX format
const convertToStix = (alert) => {
  const features = alert.flow_features;
  return {
    type: 'indicator',
    id: `indicator--${uuidv4()}`,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    name: 'Smart Fuzzing Attack on KNX-based Building Automation System',
    description: 'This indicator corresponds to a smart fuzzing cyberattack targeting the KNX protocol within Building Automation Systems (BAS).',
    indicator_types: ['anomalous-activity', 'malicious-activity', 'network-traffic'],
    pattern: `[ipv4-addr:value = '${features.ip_src}'] AND [network-traffic:src_ref.value = '${features.ip_src}'] AND [network-traffic:dst_ref.value = '${features.ip_dst}'] AND [network-traffic:src_port = ${features.udp_sport}] AND [network-traffic:dst_port = ${features.udp_dport}] AND [network-traffic:protocols[*] = 'udp'] AND [network-traffic:bytes_sent > 0]`,
    valid_from: new Date().toISOString(),
    labels: ['smart-fuzzing', 'knx-bas-attack'],
    external_references: [
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/techniques/T1203/',
        external_id: 'T1203',
      },
    ],
    custom: {
      'x-flow-features': features,
      'x-attack-type': alert.attack_type || 'Unknown',
      'confidence': alert.confidence ?? 0.5,
    }
  };
};

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4fids.sc1.2.events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const raw = message.value.toString();
      const timestampReceived = new Date().toISOString();
      console.log(`[${timestampReceived}] Received raw alert from topic '${topic}':`, raw);

      let alert;
      try {
        alert = JSON.parse(raw);
      } catch (err) {
        console.warn(`[${timestampReceived}] Ignoring malformed JSON alert.`);
        return;
      }

      const features = alert.flow_features;
      if (!features || !features.flow_id) {
        console.warn(`[${timestampReceived}] Ignoring alert: missing 'flow_features.flow_id'`);
        return;
      }

      const timestampSuffix = new Date().toISOString().replace(/T|:|\..+$/g, "-");
      const flowID = `${features.flow_id}-${timestampSuffix}`;
      console.log(`[${timestampReceived}] Processing alert with Flow ID: ${flowID}`);

      try {
        await new Alert({ rawData: raw, flowID }).save();
        console.log(`[${timestampReceived}] Raw alert saved to DB`);
      } catch (err) {
        console.error("Error saving raw alert to DB:", err);
      }

      const stixData = convertToStix(alert);
      console.log(`[${timestampReceived}] Converted alert to STIX`);

      try {
        await new StixAlert({
          stixData,
          flowID,
          timestamp: new Date().toISOString(),
        }).save();
        console.log(`[${timestampReceived}] STIX alert saved to DB`);
      } catch (err) {
        console.error("Error saving STIX alert to DB:", err);
      }

      try {
        await new Incident({
          id: flowID,
          timestamp: new Date().toISOString(),
          description: 'Smart Fuzzing Attack on KNX-based Building Automation System',
          ttp: 'https://attack.mitre.org/techniques/T1203/',
          rawData: JSON.stringify(alert),
        }).save();
        console.log(`[${timestampReceived}] Incident saved to DB`);
      } catch (err) {
        console.error("Error saving incident to DB:", err);
      }

      try {
        await producer.connect();
        await producer.send({
          topic: 'ai4triage.sc1.2.stix_alerts',
          messages: [{ value: JSON.stringify(stixData) }],
        });
        console.log(`[${timestampReceived}] STIX alert sent to Kafka topic 'ai4triage.sc1.2.stix_alerts'`);
      } catch (error) {
        console.error("Error sending STIX alert to Kafka:", error);
      }
    },
  });
};

run().catch(err => console.error("Fatal consumer error:", err));
