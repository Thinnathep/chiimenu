const lineToken = "wreIFon+q2CeQu6EzGKTXhhCQRXxjODwaUx6vBkIMr5CkOKi2rRHuHYZcPpdUihcOprOzwE/LWMNZahTmy6k1ckUCt3s9KDeCpTGAxns4VFrmHpro97mXNQ05WUR4KyRrTlKAUQj8WMUUMJ6eQlfMQdB04t89/1O/w1cDnyilFU=";

async function checkUser() {
  const res = await fetch('https://api.line.me/v2/bot/profile/U4790ff266c321e498dec5bbea6f0ee0f', {
    headers: { 'Authorization': `Bearer ${lineToken}` }
  });
  const data = await res.json();
  console.log('Profile for U4790ff266c321e498dec5bbea6f0ee0f on @946vhuev:');
  console.log(JSON.stringify(data, null, 2));
}

checkUser();
