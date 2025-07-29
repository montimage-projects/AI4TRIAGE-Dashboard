const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const Incident = require('./models/Incident');  // MongoDB schema for incidents
const Alert = require('./models/Alert');  // MongoDB schema for alerts
const StixAlert = require('./models/StixAlert'); // MongoDB schema for stixalert
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client-1.1',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [require('fs').readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: require('fs').readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: require('fs').readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const consumer = kafka.consumer({ groupId: 'ai4cyber-ai4triage-1.1' });
const producer = kafka.producer();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ai4cyber', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'));

// Convert alert to STIX format
const convertToStix = (alert) => {
  return {
    type: 'indicator',
    id: `indicator--${uuidv4()}`,
    created: alert.flow_features.Timestamp,
    modified: alert.flow_features.Timestamp,
    name: 'Advanced Multi-Stage Attack on Wide Area Measurement System',
    description: 'This indicator represents a network flow pattern associated with a multi-stage APT targeting Wide Area Measurement Systems (WAMS) in smart grid infrastructure.',
    indicator_types: ['anomalous-activity', 'malicious-activity', 'network-traffic'],
    pattern: `[ipv4-addr:value = '${alert.flow_features["Src IP"]}'] AND [network-traffic:src_ref.value = '${alert.flow_features["Src IP"]}'] AND [network-traffic:dst_ref.value = '${alert.flow_features["Dst IP"]}'] AND [network-traffic:src_port = ${alert.flow_features["Src Port"]}] AND [network-traffic:dst_port = ${alert.flow_features["Dst Port"]}] AND [network-traffic:protocols[*] = '${alert.flow_features["Protocol"]}'] AND [network-traffic:bytes_sent > 0]`,
    valid_from: alert.flow_features.Timestamp,
    labels: ['advanced-multi-stage-apt', 'wams-attack'],
    external_references: [
      {
        source_name: 'mitre-attack',
        url: 'https://attack.mitre.org/techniques/T1071/',
        external_id: 'T1071',  // Use specific technique if known
      },
    ],
    custom: {
      'x-flow-features': {
        'Flow ID': alert.flow_features["Flow ID"],
        'Src IP': alert.flow_features["Src IP"],
        'Src Port': alert.flow_features["Src Port"],
        'Dst IP': alert.flow_features["Dst IP"],
        'Dst Port': alert.flow_features["Dst Port"],
        'Protocol': alert.flow_features["Protocol"],
        'Timestamp': alert.flow_features.Timestamp,
        'Flow Duration': alert.flow_features["Flow Duration"],
        'Total Fwd Packet': alert.flow_features["Total Fwd Packet"],
        'Total Bwd packets': alert.flow_features["Total Bwd packets"],
        'Total Length of Fwd Packet': alert.flow_features["Total Length of Fwd Packet"],
        'Total Length of Bwd Packet': alert.flow_features["Total Length of Bwd Packet"],
        'Fwd Packet Length Max': alert.flow_features["Fwd Packet Length Max"],
        'Fwd Packet Length Min': alert.flow_features["Fwd Packet Length Min"],
        'Fwd Packet Length Mean': alert.flow_features["Fwd Packet Length Mean"],
        'Fwd Packet Length Std': alert.flow_features["Fwd Packet Length Std"],
        'Bwd Packet Length Max': alert.flow_features["Bwd Packet Length Max"],
        'Bwd Packet Length Min': alert.flow_features["Bwd Packet Length Min"],
        'Bwd Packet Length Mean': alert.flow_features["Bwd Packet Length Mean"],
        'Bwd Packet Length Std': alert.flow_features["Bwd Packet Length Std"],
        'Flow Bytes/s': alert.flow_features["Flow Bytes/s"],
        'Flow Packets/s': alert.flow_features["Flow Packets/s"],
        'Flow IAT Mean': alert.flow_features["Flow IAT Mean"],
        'Flow IAT Std': alert.flow_features["Flow IAT Std"],
        'Flow IAT Max': alert.flow_features["Flow IAT Max"],
        'Flow IAT Min': alert.flow_features["Flow IAT Min"],
        'Fwd IAT Total': alert.flow_features["Fwd IAT Total"],
        'Fwd IAT Mean': alert.flow_features["Fwd IAT Mean"],
        'Fwd IAT Std': alert.flow_features["Fwd IAT Std"],
        'Fwd IAT Max': alert.flow_features["Fwd IAT Max"],
        'Fwd IAT Min': alert.flow_features["Fwd IAT Min"],
        'Bwd IAT Total': alert.flow_features["Bwd IAT Total"],
        'Bwd IAT Mean': alert.flow_features["Bwd IAT Mean"],
        'Bwd IAT Std': alert.flow_features["Bwd IAT Std"],
        'Bwd IAT Max': alert.flow_features["Bwd IAT Max"],
        'Bwd IAT Min': alert.flow_features["Bwd IAT Min"],
      },
      'x-attack-type': 'Advanced Multi-Stage attack against Wide Area Measurement System',
      'confidence': alert.confidence,
    }
  };
};

// Listen for messages from the Kafka topic
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'ai4fids.sc1.1.events', fromBeginning: true });

  // Consume the messages and process them
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      // Parse the Kafka message
      const messageValue = message.value.toString();
      const alert = JSON.parse(messageValue);
      // Log received alert
      console.log("Received alert:", alert);

      // Save the raw alert to the 'alerts' collection
      const alertData = {
        rawData: messageValue,
        flowID: alert.flow_features["Flow ID"],
      };
      const savedAlert = new Alert(alertData);
      await savedAlert.save();

      // Convert the alert to STIX format
      const stixData = convertToStix(alert);
      console.log("Stix alert:", stixData);
      // Save the STIX alert to the 'stixalert' collection
      const stixAlert = new StixAlert({
        stixData: stixData,
        flowID: alert.flow_features["Flow ID"],
        timestamp: alert.flow_features.Timestamp,
      });
      await stixAlert.save();
      console.log("Saved STIX alert for Flow ID:", alert.flow_features["Flow ID"]);
      // Also save to 'incidents' collection to make it visible in the dashboard
const incident = new Incident({
  id: `${alert.flow_features["Flow ID"]}-${Date.now()}`, 
  timestamp: alert.flow_features.Timestamp,
  description: 'Advanced Multi-Stage Attack on Wide Area Measurement System',
  ttp: 'https://attack.mitre.org/techniques/T1071/',
  rawData: JSON.stringify(alert),
});
await incident.save();
console.log("Saved incident for dashboard:", alert.flow_features["Flow ID"]);


      // Send the STIX alert to the 'ai4triage.sc1.1.stix_alerts' Kafka topic
      try {
        await producer.connect();
        await producer.send({
          topic: 'ai4triage.sc1.1.stix_alerts',
          messages: [
            {
              value: JSON.stringify(stixData),
            }
          ],
        });
        console.log("STIX alert sent to Kafka topic 'ai4triage.sc1.1.stix_alerts'");
      } catch (error) {
        console.error("Error sending STIX alert to Kafka:", error);
      }
    },
  });
};

run().catch(console.error);
