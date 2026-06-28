import app from './app.js';

app.listen(5051, async () => {
  console.log("Started on 5051");
  try {
    const res = await fetch("http://localhost:5051/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@velocity.com", password: "velocityAdmin123!" })
    });
    console.log("Status:", res.status);
    console.log("Text:", await res.text());
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
