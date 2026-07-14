# Meta App Review Guide for WhatsApp Embedded Signup

Here is the complete guide on exactly what permissions you need to request and step-by-step instructions on how to record the perfect screen recording (screencast) for Meta's App Review to get approved for WhatsApp Embedded Signup.

## 1. Permissions You Must Request in App Review
To act as a "Tech Provider" and fully automate the onboarding and template creation for your users, you need **Advanced Access** for these specific permissions:

*   **`whatsapp_business_management`**
    *   **Why you need it:** This allows Velocity to programmatically fetch the user's `Phone ID` and `WABA ID` immediately after they connect. Crucially, this is the permission that allows your backend to automatically generate the 1-para, 2-para, and 3-para "Template Matrix" directly into their WhatsApp account without them doing it manually.
*   **`whatsapp_business_messaging`**
    *   **Why you need it:** This allows Velocity to actually send the automated campaigns and messages on behalf of the user's connected phone number.
*   **`business_management`** (Optional but Recommended for Tech Providers)
    *   **Why you need it:** Often required alongside Embedded Signup to properly read the business profile metadata and ensure the user's WhatsApp Business Account is correctly mapped to your Tech Provider App.

---

## 2. How to Record the App Review Video
Meta is incredibly strict about the screencast. If the reviewer cannot clearly see *how* each permission is used in your app's UI, they will reject it. 

Here is the exact script and flow you should record. (Make sure you are testing with a real phone number, not a sandbox number).

### **Step 1: Show the Login / Connection Flow**
1.  Start the recording on Velocity's "Settings" or "Integrations" page.
2.  Click your **"Connect WhatsApp Business"** button.
3.  Show the Facebook login popup opening.
4.  Go through the standard Facebook flow on screen: selecting the business, entering the test phone number, and clicking "Finish".
5.  Show the popup closing and redirecting back to Velocity. 
6.  *Narrate or add text to the video:* "The user authenticates via Embedded Signup. Velocity securely receives the OAuth token and uses `whatsapp_business_management` to fetch their Phone ID and WABA ID automatically."

### **Step 2: Show the Template Generation (The Magic Step)**
Because the template generation happens in the backend, you need a way to prove to Meta that it happened. 
1.  Show a quick screen on Velocity that says "Setting up your account..." or similar. 
2.  *Narrate or add text:* "Velocity uses `whatsapp_business_management` to automatically create generic messaging templates in the user's Meta account, completely removing the need for manual setup."
3.  *(Optional but helpful)* Briefly split-screen or flash the Meta WhatsApp Manager showing that the `velocity_generic_1_para` templates successfully appeared in that test user's account.

### **Step 3: Show the Message Sending**
1.  Go to your Campaign Builder in Velocity.
2.  Type a 2-paragraph test message into your text box.
3.  Click "Send Campaign".
4.  *Narrate or add text:* "Velocity calculates the paragraphs and dynamically selects the correct pre-approved template. We use `whatsapp_business_messaging` to send this campaign on behalf of the user."

### **Step 4: Prove the Delivery**
1.  Open the WhatsApp app on a physical phone (or WhatsApp Web on screen).
2.  Show the test message arriving perfectly formatted.

---

## 3. Tips for the Written Justification
When submitting the App Review, you have to write a description of how you use the permissions. Use language like this:

*   **For whatsapp_business_management:** "Velocity is a SaaS platform for businesses. We use Embedded Signup to allow our clients to connect their WhatsApp numbers without dealing with developer API keys. We use this permission to securely fetch their WABA IDs and to programmatically create dynamic message templates on their behalf to streamline their onboarding."
*   **For whatsapp_business_messaging:** "Once a client has connected their number via Embedded Signup, Velocity uses this permission to send marketing campaigns and automated responses to their customers on their behalf."
