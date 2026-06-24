const botToken = '8630296780:AAG3E3K6buvbdZ92jJIfJZvqKv3DVyJFOX8';
const channelId = '-1004367674760';

async function testGetChat() {
  const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelId}`;
  console.log('Querying chat info from Telegram...');
  
  try {
    const response = await fetch(url);
    console.log('HTTP Status:', response.status);
    const body = await response.json();
    console.log('Response body:', body);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGetChat();
