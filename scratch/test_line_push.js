const lineToken = "wreIFon+q2CeQu6EzGKTXhhCQRXxjODwaUx6vBkIMr5CkOKi2rRHuHYZcPpdUihcOprOzwE/LWMNZahTmy6k1ckUCt3s9KDeCpTGAxns4VFrmHpro97mXNQ05WUR4KyRrTlKAUQj8WMUUMJ6eQlfMQdB04t89/1O/w1cDnyilFU=";
const userId = "U3cfe1457fc5f6d1c6939e4147cb8ba75";

async function testPush() {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineToken}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: '🔔 ทดสอบการแจ้งเตือน ChiiMenu: ทดสอบบอส' }]
      })
    });
    
    const status = res.status;
    const body = await res.text();
    console.log('Push Result Status:', status);
    console.log('Push Result Body:', body);
  } catch (e) {
    console.error('Push error:', e);
  }
}

testPush();
