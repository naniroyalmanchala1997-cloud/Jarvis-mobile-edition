
// ==================================
// 1. JARVIS CONFIGURATION
// ==================================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt(AQ.Ab8RN6LCjgz41-hWxNyQfyVlp9dek8VcFFW5-V2t7iqNn8jMWw);

    if (API_KEY && API_KEY.trim()) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

const MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash"
];

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");

const networkStatus = document.getElementById("network-status");
const voiceStatus = document.getElementById("voice-status");

// Conversation memory
let history = [];

// ==================================
// 2. CHAT DISPLAY
// ==================================

function add(message, type) {
    const div = document.createElement("div");

    div.className = "msg " + type;
    div.textContent = message;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    return div;
}

// ==================================
// 3. GEMINI API CONNECTION
// ==================================

async function callGemini(promptText) {

    if (!API_KEY) {
        throw new Error("API key missing. Reload and enter your key.");
    }

    let lastError;

    for (const model of MODELS) {

        try {

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        systemInstruction: {
                            parts: [{
                                text: "You are JARVIS, a helpful AI assistant. Reply clearly and naturally."
                            }]
                        },

                        contents: [
                            ...history,
                            {
                                role: "user",
                                parts: [{ text: promptText }]
                            }
                        ]
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error?.message || "Gemini API request failed"
                );
            }

            const reply =
                data.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();

            if (!reply) {
                throw new Error("No response received from Gemini.");
            }

            history.push(
                { role: "user", parts: [{ text: promptText }] },
                { role: "model", parts: [{ text: reply }] }
            );

            // Keep recent conversation history
            if (history.length > 20) {
                history = history.slice(-20);
            }

            networkStatus.textContent = "● ONLINE";
            networkStatus.className = "on";

            return reply;

        } catch (error) {

            lastError = error;

            // Try another model only for model-related errors
            if (/not found|not supported|unavailable/i.test(error.message)) {
                continue;
            }

            throw error;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

// ==================================
// 4. ASK JARVIS
// ==================================

async function askGemini(text) {

    const thinking = add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    sendBtn.disabled = true;

    try {

        const reply = await callGemini(text);

        thinking.textContent = "J.A.R.V.I.S: " + reply;

        speak(reply);

    } catch (error) {

        thinking.textContent =
            "J.A.R.V.I.S: ERROR - " + error.message;

        networkStatus.textContent = "● ERROR";
        networkStatus.className = "off";

    } finally {

        sendBtn.disabled = false;
        input.focus();
    }
}

// ==================================
// 5. SEND MESSAGE
// ==================================

function sendMessage() {

    const text = input.value.trim();

    if (!text) return;

    add("YOU: " + text, "user");

    input.value = "";

    askGemini(text);
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        sendMessage();
    }

});

// ==================================
// 6. TEXT TO SPEECH
// ==================================

let voices = [];

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {

    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {

    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    const voice = voices.find(v =>
        v.lang.startsWith("en")
    );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
}

// ==================================
// 7. SPEECH RECOGNITION
// ==================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceStatus.textContent = "● ONLINE";
    voiceStatus.className = "on";

    recognition.onresult = function(event) {

        const text = event.results[0][0].transcript;

        add("YOU: " + text, "user");

        askGemini(text);
    };

    recognition.onerror = function(event) {

        add("J.A.R.V.I.S: Voice error - " + event.error, "ai");

        micBtn.textContent = "🎙";
    };

    recognition.onend = function() {

        micBtn.textContent = "🎙";
    };

    micBtn.addEventListener("click", function() {

        try {
            recognition.start();
            micBtn.textContent = "LISTENING...";
        } catch (error) {
            add("J.A.R.V.I.S: Microphone is busy.", "ai");
        }

    });

} else {

    micBtn.disabled = true;

    voiceStatus.textContent = "● UNSUPPORTED";
    voiceStatus.className = "off";

    micBtn.title = "Speech recognition is not supported in this browser.";
}
