const env = require('../../../config/env');
const {
  getNotificationProvider,
  resetNotificationProvider,
} = require('../notificationFactory');
const MockWhatsAppProvider = require('../mockWhatsAppProvider');
const TwilioWhatsAppProvider = require('../twilioWhatsAppProvider');

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

  it('should return MockWhatsAppProvider by default', () => {
    delete env.notificationProvider;
    expect(getNotificationProvider()).toBeInstanceOf(MockWhatsAppProvider);
  });

  it('should return MockWhatsAppProvider when NOTIFICATION_PROVIDER=mock', () => {
    env.notificationProvider = 'mock';
    expect(getNotificationProvider()).toBeInstanceOf(MockWhatsAppProvider);
  });

  it('should resolve the provider name case-insensitively', () => {
    env.notificationProvider = 'MOCK';
    expect(getNotificationProvider()).toBeInstanceOf(MockWhatsAppProvider);
  });

  it('should reuse the mock instance so its sent log survives across calls', async () => {
    env.notificationProvider = 'mock';

    const first = getNotificationProvider();
    await first.sendMessage('whatsapp:+919990001111', 'hello');

    expect(getNotificationProvider()).toBe(first);
    expect(getNotificationProvider().getSentMessages()).toHaveLength(1);
  });

  it('should return TwilioWhatsAppProvider when credentials are present', () => {
    env.notificationProvider = 'twilio';
    env.twilioAccountSid = 'ACmocksid00000000000000000000000000';
    env.twilioAuthToken = 'mock_twilio_token';
    env.twilioWhatsappNumber = 'whatsapp:+14155238886';

    expect(getNotificationProvider()).toBeInstanceOf(TwilioWhatsAppProvider);
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

describe('Mock WhatsApp Provider', () => {
  let provider;

  beforeEach(() => {
    provider = new MockWhatsAppProvider();
  });

  it('should record what it sent and return a message id', async () => {
    const result = await provider.sendMessage('whatsapp:+919990001111', 'reminder body');

    expect(result.error).toBeUndefined();
    expect(result.messageId).toBeTruthy();
    expect(provider.getSentMessages()).toEqual([
      { to: 'whatsapp:+919990001111', body: 'reminder body', messageId: result.messageId },
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
