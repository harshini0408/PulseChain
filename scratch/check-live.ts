async function check() {
  const endpoints = [
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/health",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/facilities",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/facilities/FAC_CBE_KMCH/inbox",
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep);
      const text = await res.text();
      console.log(`[${res.status}] ${ep} -> ${text.slice(0, 100)}`);
    } catch (e: any) {
      console.error(`Error fetching ${ep}:`, e.message);
    }
  }
}

check().catch(console.error);
