const { Kafka } = require('kafkajs');
const fs = require('fs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'ai4cyber-client',
  brokers: ['ai4-vm-01.kafka.com:9093'],
  ssl: {
    ca: [fs.readFileSync('/home/user/kafka_certs/ai4soar_CARoot.pem')],
    cert: fs.readFileSync('/home/user/kafka_certs/ai4soar_certificate.pem'),
    key: fs.readFileSync('/home/user/kafka_certs/ai4soar_RSAkey.pem'),
    passphrase: '4XpUglfq9x5b',
  },
});

const producer = kafka.producer();

// Normalize flow_feature keys
const normalizeKeys = (obj) => {
  const normalized = {};
  for (const key in obj) {
    const normKey = key.toLowerCase().replace(/\s+/g, '_');
    normalized[normKey] = obj[key];
  }
  return normalized;
};

// Original alert (unnormalized keys)
const rawAlertData = {
  flow_features: {
    'Flow ID': '192.168.62.53-192.168.126.20-139-57082-6',
    'Src IP': '192.168.126.20',
    'Src Port': 57082,
    'Dst IP': '192.168.62.53',
    'Dst Port': 139,
    'Protocol': 6,
    'Timestamp': '2025-07-15 08:41:21',
    'Flow Duration': 16964,
    'Tot Fwd Pkts': 1,
    'Tot Bwd Pkts': 2,
    'TotLen Fwd Pkts': 0.0,
    'TotLen Bwd Pkts': 0.0,
    'Fwd Pkt Len Max': 0.0,
    'Fwd Pkt Len Min': 0.0,
    'Fwd Pkt Len Mean': 0.0,
    'Fwd Pkt Len Std': 0.0,
    'Bwd Pkt Len Max': 0.0,
    'Bwd Pkt Len Min': 0.0,
    'Bwd Pkt Len Mean': 0.0,
    'Bwd Pkt Len Std': 0.0,
    'Flow Byts/s': 0.0,
    'Flow Pkts/s': 176.84508370667297,
    'Flow IAT Mean': 8482.0,
    'Flow IAT Std': 11545.639523213948,
    'Flow IAT Max': 16646.0,
    'Flow IAT Min': 318.0,
    'Fwd IAT Tot': 0.0,
    'Fwd IAT Mean': 0.0,
    'Fwd IAT Std': 0.0,
    'Fwd IAT Max': 0.0,
    'Fwd IAT Min': 0.0,
    'Bwd IAT Tot': 318.0,
    'Bwd IAT Mean': 318.0,
    'Bwd IAT Std': 0.0,
    'Bwd IAT Max': 318.0,
    'Bwd IAT Min': 318.0,
    'Fwd PSH Flags': 0,
    'Bwd PSH Flags': 0,
    'Fwd URG Flags': 0,
    'Bwd URG Flags': 0,
    'Fwd Header Len': 20,
    'Bwd Header Len': 72,
    'Fwd Pkts/s': 58.94836123555765,
    'Bwd Pkts/s': 117.8967224711153,
    'Pkt Len Min': 0.0,
    'Pkt Len Max': 0.0,
    'Pkt Len Mean': 0.0,
    'Pkt Len Std': 0.0,
    'Pkt Len Var': 0.0,
    'FIN Flag Cnt': 0,
    'SYN Flag Cnt': 1,
    'RST Flag Cnt': 0,
    'PSH Flag Cnt': 0,
    'ACK Flag Cnt': 0,
    'URG Flag Cnt': 0,
    'CWE Flag Count': 0,
    'ECE Flag Cnt': 0,
    'Down/Up Ratio': 2.0,
    'Pkt Size Avg': 0.0,
    'Fwd Seg Size Avg': 0.0,
    'Bwd Seg Size Avg': 0.0,
    'Fwd Byts/b Avg': 0,
    'Fwd Pkts/b Avg': 0,
    'Fwd Blk Rate Avg': 0,
    'Bwd Byts/b Avg': 0,
    'Bwd Pkts/b Avg': 0,
    'Bwd Blk Rate Avg': 0,
    'Subflow Fwd Pkts': 1,
    'Subflow Fwd Byts': 0,
    'Subflow Bwd Pkts': 2,
    'Subflow Bwd Byts': 0,
    'Init Fwd Win Byts': -1,
    'Init Bwd Win Byts': 8192,
    'Fwd Act Data Pkts': 0,
    'Fwd Seg Size Min': 0,
    'Active Mean': 0.0,
    'Active Std': 0.0,
    'Active Max': 0.0,
    'Active Min': 0.0,
    'Idle Mean': 0.0,
    'Idle Std': 0.0,
    'Idle Max': 0.0,
    'Idle Min': 0.0
  },
  attack_type: 'Malicious',
  confidence: 1.0
};

// Normalize keys
const alertData = {
  flow_features: normalizeKeys(rawAlertData.flow_features),
  attack_type: rawAlertData.attack_type,
  confidence: rawAlertData.confidence,
};

// Add timestamp suffix to flow_id
const timestampNow = Math.floor(Date.now() / 1000);
if (alertData.flow_features.flow_id) {
  alertData.flow_features.flow_id += `-${timestampNow}`;
} else {
  // fallback: synthesize flow_id
  alertData.flow_features.flow_id = `${alertData.flow_features.src_ip}-${alertData.flow_features.dst_ip}-${alertData.flow_features.dst_port}-${alertData.flow_features.src_port}-${timestampNow}`;
}

// Send to Kafka
const sendMessage = async () => {
  try {
    await producer.connect();

    await producer.send({
      topic: 'ai4fids.sc3.1.events',
      messages: [
        { value: JSON.stringify(alertData) }
      ],
    });

    console.log(`[${new Date().toISOString()}] ✅ Message sent to 'ai4fids.sc3.1.events'`);
    console.log("Payload:\n", JSON.stringify(alertData, null, 2));
  } catch (error) {
    console.error("❌ Error sending message to Kafka:", error);
  } finally {
    await producer.disconnect();
  }
};

sendMessage();
