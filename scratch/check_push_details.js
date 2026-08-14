const lineToken = "wreIFon+q2CeQu6EzGKTXhhCQRXxjODwaUx6vBkIMr5CkOKi2rRHuHYZcPpdUihcOprOzwE/LWMNZahTmy6k1ckUCt3s9KDeCpTGAxns4VFrmHpro97mXNQ05WUR4KyRrTlKAUQj8WMUUMJ6eQlfMQdB04t89/1O/w1cDnyilFU=";
const targetId = "U4790ff266c321e498dec5bbea6f0ee0f";

async function detailedPush() {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lineToken}`
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{ type: 'text', text: 'ทดสอบ' }]
    })
  });
  
  const status = res.status;
  const json = await res.json();
  console.log('Status:', status);
  console.log('Detailed JSON:', JSON.stringify(json, null, 2));
}

detailedPush();
