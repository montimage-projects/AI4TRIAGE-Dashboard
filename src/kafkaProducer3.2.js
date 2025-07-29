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

// Current timestamp in ISO format
const nowISO = new Date().toISOString();

// Define alert
const alertData = {
  flow_features: {
    src_ip: '192.168.126.104',
    dst_ip: '192.168.61.50',
    src_port: 38922,
    dst_port: 1058,
    protocol: 6,
    timestamp: nowISO,
    flow_duration: 2677.0,
    flow_byts_s: 44079.19312663429,
    flow_pkts_s: 747.1049682480389,
    fwd_pkts_s: 373.5524841240194,
    bwd_pkts_s: 373.5524841240194,
    tot_fwd_pkts: 1,
    tot_bwd_pkts: 1,
    totlen_fwd_pkts: 58,
    totlen_bwd_pkts: 60,
    fwd_pkt_len_max: 58,
    fwd_pkt_len_min: 58,
    fwd_pkt_len_mean: 58.0,
    fwd_pkt_len_std: 0.0,
    bwd_pkt_len_max: 60,
    bwd_pkt_len_min: 60,
    bwd_pkt_len_mean: 60.0,
    bwd_pkt_len_std: 0.0,
    pkt_len_max: 60,
    pkt_len_min: 58,
    pkt_len_mean: 59.0,
    pkt_len_std: 1.0,
    pkt_len_var: 1.0,
    fwd_header_len: 20,
    bwd_header_len: 20,
    fwd_seg_size_min: 20,
    fwd_act_data_pkts: 0,
    flow_iat_mean: 0.0,
    flow_iat_max: 0.0,
    flow_iat_min: 0.0,
    flow_iat_std: 0.0,
    fwd_iat_tot: 0.0,
    fwd_iat_max: 0.0,
    fwd_iat_min: 0.0,
    fwd_iat_mean: 0.0,
    fwd_iat_std: 0.0,
    bwd_iat_tot: 0.0,
    bwd_iat_max: 0.0,
    bwd_iat_min: 0.0,
    bwd_iat_mean: 0.0,
    bwd_iat_std: 0.0,
    fwd_psh_flags: 0,
    bwd_psh_flags: 0,
    fwd_urg_flags: 0,
    bwd_urg_flags: 0,
    fin_flag_cnt: 0,
    syn_flag_cnt: 1,
    rst_flag_cnt: 1,
    psh_flag_cnt: 0,
    ack_flag_cnt: 1,
    urg_flag_cnt: 0,
    ece_flag_cnt: 0,
    down_up_ratio: 1.0,
    pkt_size_avg: 59.0,
    init_fwd_win_byts: 1024,
    init_bwd_win_byts: 0,
    active_max: 0.0,
    active_min: 0.0,
    active_mean: 0.0,
    active_std: 0.0,
    idle_max: 0.0,
    idle_min: 0.0,
    idle_mean: 0.0,
    idle_std: 0.0,
    fwd_byts_b_avg: 0.0,
    fwd_pkts_b_avg: 0.0,
    bwd_byts_b_avg: 0.0,
    bwd_pkts_b_avg: 0.0,
    fwd_blk_rate_avg: 0.0,
    bwd_blk_rate_avg: 0.0,
    fwd_seg_size_avg: 58.0,
    bwd_seg_size_avg: 60.0,
    cwr_flag_count: 0,
    subflow_fwd_pkts: 1,
    subflow_bwd_pkts: 1,
    subflow_fwd_byts: 58,
    subflow_bwd_byts: 60
  },
  attack_type: 'abnormal',
  confidence: 1.0
};

// Generate flow_id
const timestampSuffix = Math.floor(Date.now() / 1000);
alertData.flow_features.flow_id = `${alertData.flow_features.src_ip}-${alertData.flow_features.dst_ip}-${alertData.flow_features.dst_port}-${alertData.flow_features.src_port}-${timestampSuffix}`;

// Send to Kafka
const sendMessage = async () => {
  try {
    await producer.connect();

    await producer.send({
      topic: 'ai4fids.sc3.2.events',
      messages: [
        { value: JSON.stringify(alertData) }
      ],
    });

    console.log(`[${new Date().toISOString()}] ✅ Message sent to 'ai4fids.sc3.2.events'`);
    console.log("Payload:\n", JSON.stringify(alertData, null, 2));
  } catch (error) {
    console.error("❌ Error sending message to Kafka:", error);
  } finally {
    await producer.disconnect();
  }
};

sendMessage();
