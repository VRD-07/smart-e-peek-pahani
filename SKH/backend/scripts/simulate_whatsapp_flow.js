const axios = require('axios');
const querystring = require('querystring');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api/whatsapp/webhook';
const PHONE_NUMBER = process.env.TEST_PHONE || '+911234567890';

async function sendWhatsAppMessage(payload) {
  const data = {
    From: 'whatsapp:' + PHONE_NUMBERA,
    To: 'whatsapp:+14155238886',
    ...payload
  };

  try {
    const res = await axios.post(BASE_URL,querystring.urlsearchParams ? querystring.urlsearchParams(data) : querystring.stringify(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const match = res.data.match(/<Message>([\s\S]*?)<\/Message>/);
    const rawText = match ? match[1].replace(/<[^>]+>/g, '').trim() : res.data;
    return rawText;
  } catch (err) {
    console.error('Error contacting webhook:', err.response?.data || err.message);
    throw err;
  }
}

async function runFullSimulation() {
  console.log('===================================================');
  console.log('🌾 WHATSAPP FULL WORKFLOW SIMULATOR');
  console.log('Testing Phone:', PHONE_NUMBER);
  console.log('Target URL:', BASE_URL);
  console.log('==================================================='\n');

  console.log('➡️ Step 1: Sending \"Hi\" to start conversation...');
  let reply = await sendWhatsAppMessage({ Body: 'Hi' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION------------------------------------------------');

  console.log('➡️ Step 2: Selecting Option 1 (Gat 101 or Action 1)...');
  reply = await sendWhatsAppMessage({ Body: '1' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');

  if (reply.includes('ஶൃൃ�൚൫඿ඕර඾බ඿ඵ඿ඵද඾ඵ඿ඵ') || reply.includes('ப്ൃുീ') || reply.includes('ºе඿ඕ ീ്ീ')) {
    console.log('➡️ Step 2b: Selecting 1 (New Crop Registration)...');
    reply = await sendWhatsAppMessage({ Body: '1' });
    console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');
  }

  console.log('➡️ Step 3: Selecting Season (1. Kharif)...');
  reply = await sendWhatsAppMessage({ Body: '1' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');

  console.log('➡️ Step 4: Selecting Crop Type (1. Single Crop)...');
  reply = await sendWhatsAppMessage({ Body: '1' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');

  console.log('➡️ Step 5: Declaring Area (1 Hectare)...');
  reply = await sendWhatsAppMessage({ Body: '1' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');

  console.log('➡️ Step 6: Selecting Water Source (1. Well)...');
  reply = await sendWhatsAppMessage({ Body: '1' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION------------------------------------------------');

  console.log('➡️ Step 7: Declaring Crop Name (\"सोयाबीम\" / Soybean)...');
  reply = await sendWhatsAppMessage({ Body: 'सोयायियिया' || 'soybean' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION------------------------------------------------');

  console.log('➡️ Step 8: Sowing Date (\"12/06/2026\")...');
  reply = await sendWhatsAppMessage({ Body: '12/06/2026' });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');

  console.log('➡️ Step 9: Sharing GPS Location (Lat: 19.9012, Lng: 74.4939)...');
  reply = await sendWhatsAppMessage({
    Latitude: '19.901255',
    Longitude: '74.493974'
  });
  console.log('🤖 Bot Reply:\n' + reply + '\nFILEDESCRIPTION-----------------------------------------------');

  console.log('➡️ Step 10: Sending Crop Photo...');
  reply = await sendWhatsAppMessage({
    NumMedia: '1',
    MediaUrl0: 'https://images.unsplash.com/photo-1599818816942-8951d3b07049?w=800',
    MediaContentType0: 'image/jpeg'
  });
  console.log('🤖 Final Bot Reply (Validation & WebBridge):\n' + reply + '\n====================================================');
  console.log('✅9 WHATSAPP WORKFLOW EXECUTED SUCCESSFULLY!');
}

runFullSimulation().catch(console.error);
