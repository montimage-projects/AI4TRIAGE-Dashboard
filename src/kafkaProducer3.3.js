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

// Get current timestamp
const now = new Date();
const nowISO = now.toISOString();
const timestampSuffix = now.toISOString().replace(/T|:|\..+$/g, "-");

// Define alert
const alertData = {
  flow_features: {
    "Src IP": "192.168.61.51",
    "Src Port": 44428,
    "Dst IP": "192.168.61.64",
    "Dst Port": 80,
    "Protocol": 6,
    "Timestamp": nowISO,
    "Flow Duration": 9474,
    "Total Fwd Packet": 7,
    "Total Bwd packets": 7,
    "Total Length of Fwd Packet": 212.0,
    "Total Length of Bwd Packet": 318.0,
    "Fwd Packet Length Max": 212.0,
    "Fwd Packet Length Min": 0.0,
    "Fwd Packet Length Mean": 30.28571428571428,
    "Fwd Packet Length Std": 80.12846827795616,
    "Bwd Packet Length Max": 206.0,
    "Bwd Packet Length Min": 0.0,
    "Bwd Packet Length Mean": 45.42857142857143,
    "Bwd Packet Length Std": 76.27113290285988,
    "Flow Bytes/s": 55942.57969178805,
    "Flow Packets/s": 1477.728520160439,
    "Flow IAT Mean": 728.7692307692306,
    "Flow IAT Std": 1908.484396663408,
    "Flow IAT Max": 7041.0,
    "Flow IAT Min": 5.0,
    "Fwd IAT Total": 9335.0,
    "Fwd IAT Mean": 1555.8333333333333,
    "Fwd IAT Std": 2702.045922383013,
    "Fwd IAT Max": 7041.0,
    "Fwd IAT Min": 254.0,
    "Bwd IAT Total": 9324.0,
    "Bwd IAT Mean": 1554.0,
    "Bwd IAT Std": 2837.092737292879,
    "Bwd IAT Max": 7327.0,
    "Bwd IAT Min": 242.0,
    "Fwd PSH Flags": 1,
    "Bwd PSH Flags": 4,
    "Fwd URG Flags": 0,
    "Bwd URG Flags": 0,
    "Fwd RST Flags": 0,
    "Bwd RST Flags": 0,
    "Fwd Header Length": 232,
    "Bwd Header Length": 232,
    "Fwd Packets/s": 738.8642600802195,
    "Bwd Packets/s": 738.8642600802195,
    "Packet Length Min": 0.0,
    "Packet Length Max": 212.0,
    "Packet Length Mean": 37.85714285714285,
    "Packet Length Std": 75.56439652361436,
    "Packet Length Variance": 5709.978021978021,
    "FIN Flag Count": 2,
    "SYN Flag Count": 2,
    "RST Flag Count": 0,
    "PSH Flag Count": 5,
    "ACK Flag Count": 13,
    "URG Flag Count": 0,
    "CWR Flag Count": 0,
    "ECE Flag Count": 0,
    "Down/Up Ratio": 1.0,
    "Average Packet Size": 37.85714285714285,
    "Fwd Segment Size Avg": 30.285714285714285,
    "Bwd Segment Size Avg": 45.42857142857143,
    "Fwd Bytes/Bulk Avg": 0.0,
    "Fwd Packet/Bulk Avg": 0.0,
    "Fwd Bulk Rate Avg": 0.0,
    "Bwd Bytes/Bulk Avg": 318.0,
    "Bwd Packet/Bulk Avg": 4.0,
    "Bwd Bulk Rate Avg": 392592.59259259264,
    "Subflow Fwd Packets": 0.0,
    "Subflow Fwd Bytes": 0.0,
    "Subflow Bwd Packets": 0.0,
    "Subflow Bwd Bytes": 0.0,
    "FWD Init Win Bytes": 64240,
    "Bwd Init Win Bytes": 65160,
    "Fwd Act Data Pkts": 1,
    "Bwd Act Data Pkts": 4,
    "Fwd Seg Size Min": 32,
    "Bwd Seg Size Min": 0,
    "Active Mean": 0.0,
    "Active Std": 0.0,
    "Active Max": 0.0,
    "Active Min": 0.0,
    "Idle Mean": 0.0,
    "Idle Std": 0.0,
    "Idle Max": 0.0,
    "Idle Min": 0.0,
    "ICMP Code": -1,
    "ICMP Type": -1,
    "Fwd TCP Retrans. Count": 0,
    "Bwd TCP Retrans. Count": 0,
    "Total TCP Retrans. Count": 0,
    "Total Connection Flow Time": 9474,
  },
  attack_type: "Malicious",
  confidence: 1.0
};

// Add flow_id with timestamp suffix
const flowId = `${alertData.flow_features["Src IP"]}-${alertData.flow_features["Dst IP"]}-${alertData.flow_features["Dst Port"]}-${alertData.flow_features["Src Port"]}-${alertData.flow_features["Protocol"]}-${timestampSuffix}`;
alertData.flow_features["Flow ID"] = flowId;

// Send to Kafka
const sendMessage = async () => {
  try {
    await producer.connect();

    await producer.send({
      topic: 'ai4fids.sc3.3.events',
      messages: [
        { value: JSON.stringify(alertData) },
      ],
    });

    console.log(`[${nowISO}] ✅ Message sent to 'ai4fids.sc3.3.events'`);
    console.log("Payload:\n", JSON.stringify(alertData, null, 2));
  } catch (error) {
    console.error("❌ Error sending message to Kafka:", error);
  } finally {
    await producer.disconnect();
  }
};

sendMessage();
