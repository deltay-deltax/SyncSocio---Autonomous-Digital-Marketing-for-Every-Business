

async function testGeneration() {
  console.log("🚀 Sending POST request to http://localhost:8000/generate-asset...");
  
  const payload = {
    userId: "6a06d92a9a4e0f38703a64d9", // Typical test userId
    postTopic: "5 tips to keep laptop protected",
    flowName: "Luxury Tech Repair",
    flowKeyword: "REPAIR"
  };

  try {
    const res = await fetch("http://localhost:8000/generate-asset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("\n🟢 Status Code:", res.status);
    console.log("🟢 Response Body:\n", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("🔴 Request failed:", error.message);
  }
}

testGeneration();
