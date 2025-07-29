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

// New alert data (as provided)
const alertData = {
  flow_features: {
    flow_id: "192.168.21.242-192.168.21.250-3671-49003",
    ip_src: "192.168.21.220",
    ip_dst: "192.168.21.242",
    udp_sport: 3671,
    udp_dport: 49003,
    icmp_code_3_count: 0,
    flow_packets_count: 9,
    flow_packet_length_max: 63,
    flow_packet_length_min: 60,
    flow_packet_length_mean: 61.333333333333336,
    flow_packet_length_std: 1.4907119849998598,
    flow_packet_length_var: 2.2222222222222223,
    flow_duration: 10.004853,
    flow_down_up_ratio: 0.125,
    flow_start_timestamp: 1.748262006188295e+18,
    flow_end_timestamp: 1.748262016193148e+18,
    flow_knxip_count: 8,
    fw_knxip_count: 1,
    bw_knxip_count: 8,
    flow_knxip_down_up_ratio: 0.125,
    flow_knxip_pps: 0.7996119483214796,
    fw_knxip_pps: 0.0999514935401849,
    bw_knxip_pps: 0.7996119483214796,
    flow_knxip_bps: 13.793306108545522,
    fw_knxip_bps: 2.098981364343884,
    bw_knxip_bps: 15.292578511648298,
    flow_knxip_status_bad_count: 0,
    flow_knxip_hpai_disc_count: 0,
    flow_knxip_hpai_ctrl_count: 2,
    flow_knxip_hpai_data_count: 0,
    flow_knxip_cri_count: 0,
    flow_knxip_dib_count: 0,
    flow_knxip_crd_count: 0,
    flow_knxip_comchannel_count: 1,
    flow_knxip_load_max: 0,
    flow_knxip_load_min: 0,
    flow_knxip_load_mean: 0,
    flow_knxip_load_std: 0.0,
    flow_knxip_load_var: 0,
    fw_knxip_load_max: 0,
    fw_knxip_load_min: 0,
    fw_knxip_load_mean: 0,
    fw_knxip_load_std: 0,
    fw_knxip_load_var: 0,
    bw_knxip_load_max: 0,
    bw_knxip_load_min: 0,
    bw_knxip_load_mean: 0,
    bw_knxip_load_std: 0.0,
    bw_knxip_load_var: 0,
    flow_knxip_load_bps: 0.0,
    fw_knxip_load_bps: 0.0,
    bw_knxip_load_bps: 0.0,
    flow_cemi_mcode_lrawreq_count: 0,
    flow_cemi_mcode_ldatareq_count: 0,
    flow_cemi_mcode_lpolldatareq_count: 0,
    flow_cemi_mcode_lpolldatacon_count: 0,
    flow_cemi_mcode_ldataind_count: 4,
    flow_cemi_mcode_lbusmonind_count: 0,
    flow_cemi_mcode_lrawind_count: 0,
    flow_cemi_mcode_ldatacon_count: 0,
    flow_cemi_mcode_lrawcon_count: 0,
    flow_cemi_mcode_mpropinfoind_count: 0,
    flow_cemi_mcode_mpropreadcon_count: 0,
    flow_cemi_mcode_mpropreadreq_count: 0,
    flow_cemi_mcode_mpropwritecon_count: 0,
    flow_cemi_mcode_mpropwritereq_count: 0,
    flow_cemi_mcode_mresetcon_count: 0,
    flow_cemi_mcode_mresetreq_count: 0,
    flow_cemi_mcode_other_count: 0,
    flow_cemi_ctrl1_eframe_count: 0,
    flow_cemi_ctrl1_sframe_count: 4,
    flow_cemi_ctrl1_repeat_count: 4,
    flow_cemi_ctrl1_broadcast_count: 4,
    flow_cemi_ctrl1_prio0_count: 0,
    flow_cemi_ctrl1_prio1_count: 0,
    flow_cemi_ctrl1_prio2_count: 0,
    flow_cemi_ctrl1_prio3_count: 4,
    flow_cemi_ctrl1_error_count: 4,
    flow_cemi_ctrl2_hops_mean: 6,
    flow_cemi_ctrl2_hops_max: 6,
    flow_cemi_ctrl2_hops_min: 6,
    flow_cemi_ctrl2_hops_std: 0.0,
    flow_cemi_ctrl2_hops_var: 0,
    flow_cemi_src_count: 2,
    flow_cemi_dst_count: 0,
    flow_cemi_mpropread_objType_count: 0,
    flow_cemi_mpropread_objInstance_count: 0,
    flow_cemi_mpropread_propId_count: 0,
    flow_cemi_mpropread_error_count: 0,
    flow_cemi_tpci_data_count: 4,
    flow_cemi_tpci_other_count: 0,
    flow_cemi_acpi_groupvalueread_count: 0,
    flow_cemi_acpi_groupvalueresp_count: 0,
    flow_cemi_acpi_groupvaluewrite_count: 4,
    flow_cemi_acpi_indaddwrite_count: 0,
    flow_cemi_acpi_indaddread_count: 0,
    flow_cemi_acpi_indaddresp_count: 0,
    flow_cemi_acpi_devdescrread_count: 0,
    flow_cemi_acpi_devdescrresp_count: 0,
    flow_cemi_acpi_restart_count: 0,
    flow_cemi_acpi_esc_count: 0,
    flow_cemi_acpi_other_count: 0,
  },
  attack_type: "cyberattack_knx_fuzzing_mpropread",
  confidence: 1.0
};

// Send the message to the Kafka topic
const sendMessage = async () => {
  try {
    await producer.connect();

    await producer.send({
      topic: 'ai4fids.sc1.2.events',
      messages: [
        {
          value: JSON.stringify(alertData),
        },
      ],
    });

    console.log("Message sent to Kafka topic 'ai4fids.sc1.2.events'");
  } catch (error) {
    console.error("Error sending message to Kafka:", error);
  } finally {
    await producer.disconnect();
  }
};

sendMessage();
