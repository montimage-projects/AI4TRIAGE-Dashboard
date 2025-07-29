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

const consumer = kafka.consumer({ groupId: 'ai4cyber-test' });

// Function to consume messages from the topics
const consumeMessages = async () => {
  // Connect to the Kafka consumer
  await consumer.connect();

  // Subscribe to two topics
  await consumer.subscribe({ topic: 'ai4fids.sc1.3.events', fromBeginning: true });
  await consumer.subscribe({ topic: 'ai4triage.sc1.3.stix_alerts', fromBeginning: true });

  console.log('Subscribed to ai4fids.sc1.3.events and ai4triage.sc1.3.stix_alerts topics.');

  // Consume messages from the topics
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      // Log the topic, partition, offset, and the message value
      console.log(`Received message on topic ${topic} [partition ${partition} | offset ${message.offset}]:`);
      console.log(message.value.toString());
    },
  });
};

// Run the consumer
consumeMessages().catch(console.error);
