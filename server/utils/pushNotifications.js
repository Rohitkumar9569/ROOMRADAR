const PushSubscription = require('../models/PushSubscription');

let webpush = null;
try {
  webpush = require('web-push');
} catch (error) {
  webpush = null;
}

const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || '';

const isWebPushConfigured = () => (
  Boolean(webpush) &&
  Boolean(process.env.VAPID_PUBLIC_KEY) &&
  Boolean(process.env.VAPID_PRIVATE_KEY)
);

const configureWebPush = () => {
  if (!isWebPushConfigured()) return false;

  const subject = process.env.VAPID_SUBJECT || process.env.CLIENT_URL || 'mailto:support@roomradar.in';
  webpush.setVapidDetails(
    subject.startsWith('mailto:') || subject.startsWith('http') ? subject : `mailto:${subject}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
};

const buildPayload = ({
  title = 'RoomRadar',
  body = 'You have a new RoomRadar update.',
  url = '/profile/inbox',
  tag = 'roomradar-update',
  data = {},
} = {}) => JSON.stringify({
  title,
  body,
  url,
  tag,
  icon: '/pwa-icon.svg',
  badge: '/pwa-maskable.svg',
  data,
});

const removeExpiredSubscription = async (subscriptionId) => {
  try {
    await PushSubscription.findByIdAndDelete(subscriptionId);
  } catch (error) {
    // Expired subscriptions are cleaned best-effort.
  }
};

const sendPushToUser = async (userId, payload) => {
  if (!userId || !configureWebPush()) return { sent: 0, skipped: true };

  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (subscriptions.length === 0) return { sent: 0, skipped: false };

  const body = typeof payload === 'string' ? payload : buildPayload(payload);
  let sent = 0;

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: subscription.keys,
      }, body);

      sent += 1;
      await PushSubscription.findByIdAndUpdate(subscription._id, {
        $set: { lastUsedAt: new Date() },
        $unset: { failedAt: '' },
      });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await removeExpiredSubscription(subscription._id);
        return;
      }

      await PushSubscription.findByIdAndUpdate(subscription._id, {
        $set: { failedAt: new Date() },
      });
    }
  }));

  return { sent, skipped: false };
};

module.exports = {
  getVapidPublicKey,
  isWebPushConfigured,
  sendPushToUser,
};
