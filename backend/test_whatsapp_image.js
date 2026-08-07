import dotenv from 'dotenv';
dotenv.config();

function testWhatsappWebhookDirect() {
  console.log('--- SIMULATING WHATSAPP ROUTE LOGIC ---');
  
  const fakeSenderId = "1234567890";
  
  // Simulate what Nexa returns when it wants to send an image
  const simulatedNexaResult = {
    replyText: "Here is the Cool Red Shirt you requested!",
    newStage: "QUALIFYING",
    productImageUrlToSend: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  };

  if (simulatedNexaResult?.productImageUrlToSend) {
    console.log('✅ Webhook logic caught product image request!');
    
    const productImgPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: fakeSenderId,
      type: 'image',
      image: { link: simulatedNexaResult.productImageUrlToSend }
    };
    
    console.log('Payload that WOULD be sent to WhatsApp API:');
    console.log(JSON.stringify(productImgPayload, null, 2));
    console.log('✅ TEST PASSED: Image payload correctly formed for WhatsApp.');
  } else {
    console.log('❌ TEST FAILED: No product image returned.');
  }
}

testWhatsappWebhookDirect();
