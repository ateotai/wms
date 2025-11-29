// Simple smoke test: signup, login, fetch movements
const base = 'http://localhost:8081';
(async () => {
  try {
    const email = 'dev@example.com';
    const password = 'Test1234!';
    const full_name = 'Dev Tester';

    // Try signup
    const signupResp = await fetch(`${base}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name })
    });
    const signupText = await signupResp.text().catch(() => '');
    console.log('Signup status:', signupResp.status, signupText);

    // Login
    const loginResp = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginJson = await loginResp.json().catch(() => null);
    console.log('Login status:', loginResp.status, loginJson ? 'ok' : 'no json');
    if (!loginResp.ok || !loginJson || !loginJson.token) {
      console.error('Login failed');
      process.exit(1);
    }

    const token = loginJson.token;

    // Fetch movements
    const movResp = await fetch(`${base}/inventory/movements?type=IN&period=7days`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const movJson = await movResp.json().catch(async () => ({ errText: await movResp.text().catch(() => '') }));
    console.log('Movements status:', movResp.status);
    console.log('Movements body keys:', Object.keys(movJson));

  } catch (e) {
    console.error('Smoke test error:', e?.message || e);
    process.exit(1);
  }
})();