async function fetchDebug() {
  try {
    const res = await fetch('http://localhost:3000/api/debug/stores');
    const data = await res.json();
    console.log('=== STORES IN DB ===');
    console.log(JSON.stringify(data.stores, null, 2));
    console.log('=== RECENT ORDERS IN DB ===');
    console.log(JSON.stringify(data.recentOrders, null, 2));
    console.log('=== ERRORS ===');
    console.log(JSON.stringify(data.errors, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

fetchDebug();
