async function pingWebhook() {
  try {
    const res = await fetch('https://chiimenu.pages.dev/api/line/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: []
      })
    });
    console.log('Webhook ping status:', res.status);
    const text = await res.text();
    console.log('Webhook ping response:', text);
  } catch (e) {
    console.error('Ping error:', e);
  }
}

pingWebhook();
