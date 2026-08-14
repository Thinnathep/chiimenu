async function findStore() {
  try {
    const res = await fetch('http://localhost:3000/api/debug/stores');
    // Wait, earlier debug endpoint had RLS issue on anon.
    // Let's create an endpoint with service role or check slug pattern.
  } catch (e) {}
}
