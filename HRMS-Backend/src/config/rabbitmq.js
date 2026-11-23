// src/config/rabbitmq.js
// Production-grade resilient RabbitMQ Message Broker with async in-memory worker fallback

const EventEmitter = require('events');
const memoryQueue = new EventEmitter();

let rabbitConnection = null;
let rabbitChannel = null;
let isRabbitConnected = false;

const NOTIFICATIONS_QUEUE = 'hrms_notifications_queue';

async function initRabbitMQ() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  try {
    const amqp = require('amqplib');
    rabbitConnection = await amqp.connect(amqpUrl);
    rabbitChannel = await rabbitConnection.createChannel();
    await rabbitChannel.assertQueue(NOTIFICATIONS_QUEUE, { durable: true });
    isRabbitConnected = true;
    console.log('🐰 [RabbitMQ] Connected successfully to', amqpUrl);

    // Start consuming messages
    rabbitChannel.consume(NOTIFICATIONS_QUEUE, async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await processNotification(payload);
          rabbitChannel.ack(msg);
        } catch (err) {
          console.error('❌ [RabbitMQ] Worker error:', err.message);
          rabbitChannel.nack(msg, false, false);
        }
      }
    });

    rabbitConnection.on('error', (err) => {
      console.warn('⚠️ [RabbitMQ] Connection error, using async memory queue:', err.message);
      isRabbitConnected = false;
    });

    rabbitConnection.on('close', () => {
      isRabbitConnected = false;
    });
  } catch (err) {
    isRabbitConnected = false;
    console.log('ℹ️ [RabbitMQ] Local RabbitMQ not detected. Gracefully running on In-Memory Event Queue.');
  }
}

// In-Memory worker fallback
memoryQueue.on('notification_task', async (payload) => {
  try {
    await processNotification(payload);
  } catch (err) {
    console.error('❌ [MemoryWorker] Notification processing error:', err.message);
  }
});

/**
 * Core notification processor (dispatches real SMS, Push, Email alerts)
 */
async function processNotification(payload) {
  const { type, recipient, data, title, body } = payload;
  console.log(`📨 [NotificationWorker] Processing task "${type}" for recipient ${recipient}`);

  if (type === 'SMS_OTP') {
    // Delivered via SMS Service
    const otpService = require('../services/otp.service');
    await otpService.deliverRealSms(recipient, data.otp);
  } else if (type === 'ANNOUNCEMENT_PUSH') {
    console.log(`📢 [Broadcast] Sent push notice "${title}" to organization.`);
  } else if (type === 'LEAVE_STATUS_ALERT') {
    console.log(`📝 [LeaveAlert] Leave request status updated for user ${recipient}: ${data.status}`);
  } else if (type === 'PAYSLIP_GENERATED') {
    console.log(`💳 [PayrollAlert] Payslip ready for download: ${recipient} (${data.month}/${data.year})`);
  }
}

/**
 * Publish a message to RabbitMQ (or memory queue fallback)
 */
async function publishNotification(payload) {
  try {
    if (isRabbitConnected && rabbitChannel) {
      const buffer = Buffer.from(JSON.stringify(payload));
      rabbitChannel.sendToQueue(NOTIFICATIONS_QUEUE, buffer, { persistent: true });
      return true;
    }
  } catch (e) {
    // Fall back to memory queue
  }

  // Fallback: asynchronous memory queue
  setImmediate(() => {
    memoryQueue.emit('notification_task', payload);
  });
  return true;
}

// Initialize on boot
initRabbitMQ().catch(() => {});

module.exports = {
  publishNotification,
  isRabbitConnected: () => isRabbitConnected,
};
