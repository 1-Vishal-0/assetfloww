(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' }),
    });

    const loginData = await loginRes.json();
    console.log('---LOGIN RESPONSE---');
    console.log(JSON.stringify(loginData, null, 2));

    const token = loginData.token;
    if (!token) {
      console.error('No token returned from login');
      process.exit(1);
    }

    const meRes = await fetch('http://localhost:5000/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const meData = await meRes.json();
    console.log('---ME RESPONSE---');
    console.log(JSON.stringify(meData, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
