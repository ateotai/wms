// const fetch = require('node-fetch');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluX3Rlc3RfaWQiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6IkFETUlOIiwiZnVsbF9uYW1lIjoiQWRtaW4gVGVzdCIsImlhdCI6MTc2NjA4MzE4OSwiZXhwIjoxNzY2MDg2Nzg5fQ.8KgkKOkSYRmbpMynYi59dlCXSZB70zj1BJVr1LUk39o';

async function main() {
  try {
    const res = await fetch('http://localhost:8081/putaway/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    const txt = await res.text();
    console.log('Body:', txt);
  } catch (e) {
    console.error(e);
  }
}
main();
