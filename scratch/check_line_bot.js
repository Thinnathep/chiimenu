const lineToken = "wreIFon+q2CeQu6EzGKTXhhCQRXxjODwaUx6vBkIMr5CkOKi2rRHuHYZcPpdUihcOprOzwE/LWMNZahTmy6k1ckUCt3s9KDeCpTGAxns4VFrmHpro97mXNQ05WUR4KyRrTlKAUQj8WMUUMJ6eQlfMQdB04t89/1O/w1cDnyilFU=";

async function checkBotInfo() {
  try {
    // 1. Get bot info
    const botRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: { 'Authorization': `Bearer ${lineToken}` }
    });
    const botInfo = await botRes.json();
    console.log('--- Bot Info for current LINE_CHANNEL_ACCESS_TOKEN ---');
    console.log(JSON.stringify(botInfo, null, 2));

    // 2. Get profile of user Ubaecd6d0836751caeacabcd1a2299705
    const userRes = await fetch('https://api.line.me/v2/bot/profile/Ubaecd6d0836751caeacabcd1a2299705', {
      headers: { 'Authorization': `Bearer ${lineToken}` }
    });
    const userInfo = await userRes.json();
    console.log('--- Profile query for Ubaecd6d0836751caeacabcd1a2299705 ---');
    console.log(JSON.stringify(userInfo, null, 2));

    // 3. Get profile of user U3cfe1457fc5f6d1c6939e4147cb8ba75
    const bossRes = await fetch('https://api.line.me/v2/bot/profile/U3cfe1457fc5f6d1c6939e4147cb8ba75', {
      headers: { 'Authorization': `Bearer ${lineToken}` }
    });
    const bossInfo = await bossRes.json();
    console.log('--- Profile query for U3cfe1457fc5f6d1c6939e4147cb8ba75 ---');
    console.log(JSON.stringify(bossInfo, null, 2));

  } catch (e) {
    console.error('Error:', e);
  }
}

checkBotInfo();
