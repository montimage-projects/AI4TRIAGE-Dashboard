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
    passphrase: '4XpUglfq9x5b', // Update passphrase if required
  },
});

const producer = kafka.producer();

// Example alert data to be sent to Kafka
const alertData = {
  flow_features: {
    "Flow ID": "192.168.21.97-192.168.0.5-52496-1502-46",
    "Src IP": "192.168.21.97",
    "Src Port": 52496,
    "Dst IP": "192.168.0.5",
    "Dst Port": 1502,
    "Protocol": 6,
    "Timestamp": "2025-06-05 07:59:33.879480",
    "Flow Duration": 6000215,
    "Total Fwd Packet": 2,
    "Total Bwd packets": 0,
    "Total Length of Fwd Packet": 0.0,
    "Total Length of Bwd Packet": 0.0,
    "Fwd Packet Length Max": 0.0,
    "Fwd Packet Length Min": 0.0,
    "Fwd Packet Length Mean": 0.0,
    "Fwd Packet Length Std": 0.0,
    "Bwd Packet Length Max": 0.0,
    "Bwd Packet Length Min": 0.0,
    "Bwd Packet Length Mean": 0.0,
    "Bwd Packet Length Std": 0.0,
    "Flow Bytes/s": 0.0,
    "Flow Packets/s": 0.3333213893168828,
    "Flow IAT Mean": 6000215.0,
    "Flow IAT Std": 0.0,
    "Flow IAT Max": 6000215.0,
    "Flow IAT Min": 6000215.0,
    "Fwd IAT Total": 6000215.0,
    "Fwd IAT Mean": 6000215.0,
    "Fwd IAT Std": 0.0,
    "Fwd IAT Max": 6000215.0,
    "Fwd IAT Min": 6000215.0,
    "Bwd IAT Total": 0.0,
    "Bwd IAT Mean": 0.0,
    "Bwd IAT Std": 0.0,
    "Bwd IAT Max": 0.0,
    "Bwd IAT Min": 0.0,
    "Fwd PSH Flags": 0,
    "Bwd PSH Flags": 0,
    "Fwd URG Flags": 0,
    "Bwd URG Flags": 0,
    "Fwd RST Flags": 0,
    "Bwd RST Flags": 0,
    "Fwd Header Length": 48,
    "Bwd Header Length": 0,
    "Fwd Packets/s": 0.3333213893168828,
    "Bwd Packets/s": 0.0,
    "Packet Length Min": 0.0,
    "Packet Length Max": 0.0,
    "Packet Length Mean": 0.0,
    "Packet Length Std": 0.0,
    "Packet Length Variance": 0.0,
    "FIN Flag Count": 0,
    "SYN Flag Count": 2,
    "RST Flag Count": 0,
    "PSH Flag Count": 0,
    "ACK Flag Count": 0,
    "URG Flag Count": 0,
    "CWR Flag Count": 0,
    "ECE Flag Count": 0,
    "Down/Up Ratio": 0.0,
    "Average Packet Size": 0.0,
    "Fwd Segment Size Avg": 0.0,
    "Bwd Segment Size Avg": 0.0,
    "Fwd Bytes/Bulk Avg": 0.0,
    "Fwd Packet/Bulk Avg": 0.0,
    "Fwd Bulk Rate Avg": 0.0,
    "Bwd Bytes/Bulk Avg": 0.0,
    "Bwd Packet/Bulk Avg": 0.0,
    "Bwd Bulk Rate Avg": 0.0,
    "Subflow Fwd Packets": 2.0,
    "Subflow Fwd Bytes": 0.0,
    "Subflow Bwd Packets": 0.0,
    "Subflow Bwd Bytes": 0.0,
    "FWD Init Win Bytes": 8192,
    "Bwd Init Win Bytes": 0,
    "Fwd Act Data Pkts": 0,
    "Bwd Act Data Pkts": 0,
    "Fwd Seg Size Min": 24,
    "Bwd Seg Size Min": 0,
    "Active Mean": 0.0,
    "Active Std": 0.0,
    "Active Max": 0.0,
    "Active Min": 0.0,
    "Idle Mean": 6000215.0,
    "Idle Std": 0.0,
    "Idle Max": 6000215.0,
    "Idle Min": 6000215.0,
    "ICMP Code": -1,
    "ICMP Type": -1,
    "Fwd TCP Retrans. Count": 0,
    "Bwd TCP Retrans. Count": 0,
    "Total TCP Retrans. Count": 0,
    "Total Connection Flow Time": 6000215
  },
  attack_type: "Advanced Multi-Stage Attack on Wide Area Measurement System",
  confidence: 0.9882792234420776
};

// Send the message to the Kafka topic
const sendMessage = async () => {
  try {
    // Connect to the producer
    await producer.connect();

    // Send the message to the Kafka topic 'ai4fids.sc1.1.events'
    await producer.send({
      topic: 'ai4fids.sc1.1.events',
      messages: [
        {
          value: JSON.stringify(alertData),
        },
      ],
    });

    console.log("Message sent to Kafka topic 'ai4fids.sc1.1.events'", JSON.stringify(alertData));
  } catch (error) {
    console.error("Error sending message to Kafka:", error);
  } finally {
    // Disconnect the producer after the message is sent
    await producer.disconnect();
  }
};

// Run the function to send the message
sendMessage();
