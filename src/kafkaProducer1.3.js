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

// Sample alert data
const alertData = {
  flow_features: {
    flow_id: "192.168.21.70-192.168.21.225-80-41440",
    src_ip: "192.168.21.70",
    dst_ip: "192.168.21.225",
    src_port: 80,
    dst_port: 41440,
    total_flow_packets: 1671,
    total_fw_packets: 714,
    total_bw_packets: 957,
    flow_duration: 119947902.0,
    flow_down_up_ratio: 1.3403361344537814,
    flow_total_SYN_flag: 0,
    flow_total_RST_flag: 0,
    flow_total_PSH_flag: 958,
    flow_total_ACK_flag: 1671,
    flow_total_URG_flag: 0,
    flow_total_CWE_flag: 0,
    flow_total_ECE_flag: 0,
    flow_total_FIN_flag: 0,
    flow_start_timestamp: 1719313323064026.0,
    flow_end_timestamp: 1719313443011928.0,
    flow_total_http_get_packets: 0,
    flow_total_http_2xx_packets: 0,
    flow_total_http_4xx_packets: 0,
    flow_total_http_5xx_packets: 0,
    flow_websocket_packts_per_second: 7.9868008029e-06,
    fw_websocket_packts_per_second: 4.0017373542e-06,
    bw_websocket_packts_per_second: 3.9850634486e-06,
    flow_websocket_bytes_per_second: 0.0006104900442527,
    fw_websocket_bytes_per_second: 0.0003474758566431,
    bw_websocket_bytes_per_second: 0.0002630141876095,
    flow_total_websocket_ping_packets: 1,
    flow_total_websocket_pong_packets: 0,
    flow_total_websocket_close_packets: 0,
    flow_total_websocket_data_messages: 957,
    flow_total_ocpp16_heartbeat_packets: 478,
    flow_total_ocpp16_resetHard_packets: 0,
    flow_total_ocpp16_resetSoft_packets: 0,
    flow_total_ocpp16_unlockconnector_packets: 0,
    flow_total_ocpp16_starttransaction_packets: 0,
    flow_total_ocpp16_remotestarttransaction_packets: 0,
    flow_total_ocpp16_authorize_not_accepted_packets: 0,
    flow_total_ocpp16_setchargingprofile_packets: 0,
    flow_avg_ocpp16_setchargingprofile_limit: 0.0,
    flow_max_ocpp16_setchargingprofile_limit: 0,
    flow_min_ocpp16_setchargingprofile_limit: 0,
    flow_avg_ocpp16_setchargingprofile_minchargingrate: 0.0,
    flow_min_ocpp16_setchargingprofile_minchargingrate: 0,
    flow_max_ocpp16_setchargingprofile_minchargingrate: 0,
    flow_total_ocpp16_metervalues: 0,
    flow_min_ocpp16_metervalues_soc: 0.0,
    flow_max_ocpp16_metervalues_soc: 0.0,
    flow_avg_ocpp16_metervalues_wh_diff: 0.0,
    flow_max_ocpp16_metervalues_wh_diff: 0,
    flow_min_ocpp16_metervalues_wh_diff: 0
  },
  attack_type: "cyberattack_ocpp16_dos_flooding_heartbeat",
  confidence: 1.0
};

// Append UNIX timestamp to flow_id to ensure uniqueness
const timestampNow = Math.floor(Date.now() / 1000); // seconds precision
alertData.flow_features.flow_id += `-${timestampNow}`;

// Send the message to Kafka topic
const sendMessage = async () => {
  try {
    await producer.connect();

    await producer.send({
      topic: 'ai4fids.sc1.3.events',
      messages: [
        { value: JSON.stringify(alertData) }
      ],
    });

    console.log(`[${new Date().toISOString()}] Message sent to Kafka topic 'ai4fids.sc1.3.events'`);
    console.log("Payload:\n", JSON.stringify(alertData, null, 2));
  } catch (error) {
    console.error("❌ Error sending message to Kafka:", error);
  } finally {
    await producer.disconnect();
  }
};

sendMessage();
