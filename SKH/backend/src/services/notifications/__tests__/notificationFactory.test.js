const env = require('../../../config/env');
const {
  getNotificationProvider,
  resetNotificationProvider,
} = require('../notificationFactory');
const MockNotificationProvider = require('../mockNotificationProvider');
const TwilioNotificationProvider = require('../twilioNotificationProvider');
const { CHANNELS } = require('../constants');

describe('Notification Factory', () => {
  const originalProvider = env.notificationProvider;
  const originalSid = env.twilioAccountSid;
  const originalToken = env.twilioAuthToken;
  const originalNumber = env.twilioWhatsappNumber;

  beforeEach(() => {
    resetNotificationProvider();
  });

  afterEach(() => {
    env.notificationProvider = originalProvider;
    env.twilioAccountSid = originalSid;
    env.twilioAuthToken = originalToken;
    env.twilioWhatsappNumber = originalNumber;
    resetNotificationProvider();
  });

  it('should return MockNotificationProvider by default', () => {
    delete env.notificationProvider;
    expect(getNotificationProvider()).toBeInstanceOf(MockNotificationProvider);
  });

  it('should return MockNotificationProvider when NOTIFICATION_PROVIDER=mock', () => {
    env.notificationProvider = 'mock';
    expect(getNotificationProvider()).toBeInstanceOf(MockNotificationProvider);
  });

  it('should resolve the provider name case-insensitively', () => {
    env.notificationProvider = 'MOCK';
    expect(getNotificationProvider()).toBeInstanceOf(MockNotificationProvider);
  });

  it('should reuse the mock instance so its sent log survives across calls', async () => {
    env.notificationProvider = 'mock';

    const first = getNotificationProvider();
    await first.sendMessage('whatsapp:+919990001111', 'hello');

    expect(getNotificationProvider()).toBe(first);
    expect(getNotificationProvider().getSentMessages()).toHaveLength(1);
  });

  it('should return TwilioNotificationProvider when credentials are present', () => {
    env.notificationProvider = 'twilio';
    env.twilioAccountSid = 'ACmocksid00000000000000000000000000';
    env.twilioAuthToken = 'mock_twilio_token';
    env.twilioWhatsappNumber = 'whatsapp:+14155238886';

    expect(getNotificationProvider()).toBeInstanceOf(TwilioNotificationProvider);
  });

  it('should fail loudly rather than silently dropping messages when credentials are missing', () => {
    env.notificationProvider = 'twilio';
    delete env.twilioAccountSid;
    delete env.twilioAuthToken;

    expect(() => getNotificationProvider()).toThrow('Missing Twilio credentials');
  });

  it('should require an outbound sender number for the twilio provider', () => {
    env.notificationProvider = 'twilio';
    env.twilioAccountSid = 'ACmocksid00000000000000000000000000';
    env.twilioAuthToken = 'mock_twilio_token';
    delete env.twilioWhatsappNumber;

    expect(() => getNotificationProvider()).toThrow('Missing TWILIO_WHATSAPP_NUMBER');
  });

  it('should throw when NOTIFICATION_PROVIDER is invalid', () => {
    env.notificationProvider = 'invalid';
    expect(() => getNotificationProvider()).toThrow('Unknown NOTIFICATION_PROVIDER configured: invalid');
  });
});

describe('Mock Notification Provider', () => {
  let provider;

  beforeEach(() => {
    provider = new MockNotificationProvider();
  });

  it('should record what it sent and return a message id', async () => {
    const result = await provider.sendMessage('whatsapp:+919990001111', 'reminder body');

    expect(result.error).toBeUndefined();
    expect(result.messageId).toBeTruthy();
    // The channel is recorded alongside the body: the escalation ladder sends the
    // same reminder on more than one channel, so a demo has to be able to tell
    // which record is the SMS fallback and which is the original WhatsApp message.
    expect(provider.getSentMessages()).toEqual([
      {
        to: 'whatsapp:+919990001111',
        body: 'reminder body',
        messageId: result.messageId,
        channel: CHANNELS.WHATSAPP,
      },
    ]);
  });

  it('should reject a missing recipient', async () => {
    const result = await provider.sendMessage('', 'body');
    expect(result.error).toBe('INVALID_RECIPIENT');
    expect(provider.getSentMessages()).toHaveLength(0);
  });

  it('should reject an empty body', async () => {
    const result = await provider.sendMessage('whatsapp:+919990001111', '');
    expect(result.error).toBe('EMPTY_BODY');
  });

  it('should simulate a provider failure for recipients marked fail', async () => {
    const result = await provider.sendMessage('whatsapp:+fail0001', 'body');
    expect(result.error).toBe('PROVIDER_ERROR');
    expect(provider.getSentMessages()).toHaveLength(0);
  });

  it('should report itself as the mock provider for audit logging', () => {
    expect(provider.name).toBe('mock');
  });
});

describe('Mock Notification Provider — SMS and voice channels', () => {
  let provider;

  beforeEach(() => {
    provider = new MockNotificationProvider();
  });

  it('should record an SMS against the SMS channel', async () => {
    const result = await provider.sendSms('+919990001111', 'short reminder');

    expect(result.error).toBeUndefined();
    expect(provider.getSentMessages()).toEqual([
      {
        to: '+919990001111',
        body: 'short reminder',
        messageId: result.messageId,
        channel: CHANNELS.SMS,
      },
    ]);
  });

  it('should record a placed call separately from messages', async () => {
    const twiml = '<Response><Play>https://example.test/reminder-mr.wav</Play></Response>';
    const result = await provider.placeVoiceCall('+919990001111', twiml);

    expect(result.callId).toBeTruthy();
    expect(provider.getSentMessages()).toHaveLength(0);
    expect(provider.getPlacedCalls()).toEqual([
      { to: '+919990001111', twiml, callId: result.callId },
    ]);
  });

  it('should reject a call with no TwiML', async () => {
    const result = await provider.placeVoiceCall('+919990001111', '');
    expect(result.error).toBe('EMPTY_BODY');
    expect(provider.getPlacedCalls()).toHaveLength(0);
  });

  it('should report an unconfirmed send as sent rather than delivered', async () => {
    const { messageId } = await provider.sendMessage('whatsapp:+919990001111', 'body');

    // 'sent' means the carrier accepted it, not that the handset showed it. The
    // escalation windows exist precisely because this is the usual resting state.
    const status = await provider.getDeliveryStatus(messageId, CHANNELS.WHATSAPP);
    expect(status.status).toBe('sent');
  });

  it('should report a queued state for a call that has not been answered', async () => {
    const { callId } = await provider.placeVoiceCall('+919990001111', '<Response/>');

    const status = await provider.getDeliveryStatus(callId, CHANNELS.VOICE);
    expect(status.status).toBe('queued');
  });

  it('should let a demo force a delivery state without waiting for a real handset', async () => {
    const { messageId } = await provider.sendMessage('whatsapp:+919990001111', 'body');
    provider.setDeliveryStatus(messageId, 'undelivered');

    const status = await provider.getDeliveryStatus(messageId, CHANNELS.WHATSAPP);
    expect(status.status).toBe('undelivered');
  });

  it('should report an error for a status lookup with no provider id', async () => {
    const status = await provider.getDeliveryStatus('', CHANNELS.WHATSAPP);
    expect(status.error).toBe('INVALID_ID');
  });

  it('should clear messages, calls and forced states on reset', async () => {
    const { messageId } = await provider.sendMessage('whatsapp:+919990001111', 'body');
    await provider.sendSms('+919990001111', 'body');
    await provider.placeVoiceCall('+919990001111', '<Response/>');
    provider.setDeliveryStatus(messageId, 'read');

    provider.reset();

    expect(provider.getSentMessages()).toHaveLength(0);
    expect(provider.getPlacedCalls()).toHaveLength(0);
    const fresh = await provider.sendMessage('whatsapp:+919990001111', 'body');
    expect((await provider.getDeliveryStatus(fresh.messageId, CHANNELS.WHATSAPP)).status).toBe('sent');
  });
});
