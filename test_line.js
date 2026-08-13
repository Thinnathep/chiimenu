const token = "wreIFon+q2CeQu6EzGKTXhhCQRXxjODwaUx6vBkIMr5CkOKi2rRHuHYZcPpdUihcOprOzwE/LWMNZahTmy6k1ckUCt3s9KDeCpTGAxns4VFrmHpro97mXNQ05WUR4KyRrTlKAUQj8WMUUMJ6eQlfMQdB04t89/1O/w1cDnyilFU=";
const userId = "U3cfe1457fc5f6d1c6939e4147cb8ba75";

async function testLine() {
    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to: userId,
                messages: [{ type: 'text', text: 'Test from Node script!' }]
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}

testLine();
