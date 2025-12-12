require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const check = async () => {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Ask Google for the list
    const result = await ai.getGenerativeModel({ model: "gemini-pro" }).apiKey; // Dummy call to init
    
    // Actually fetching models requires using the fetch API directly 
    // because the SDK hides the list method sometimes.
    // Let's use a simpler approach provided by the SDK usually:
    
    try {
        console.log("Checking available models...");
        // There isn't a direct listModels method exposed easily in the helper, 
        // so let's just try the common ones manually.
        
        const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
        
        for (const modelName of modelsToTest) {
            try {
                const model = ai.getGenerativeModel({ model: modelName });
                const chat = model.startChat();
                await chat.sendMessage("Hello");
                console.log(`✅ SUCCESS: ${modelName} works!`);
            } catch (e) {
                if (e.message.includes("404")) {
                    console.log(`❌ FAILED: ${modelName} (Not Found / 404)`);
                } else {
                    console.log(`⚠️ ERROR on ${modelName}:`, e.message);
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
};

check();