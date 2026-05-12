(function() {
    function initChatbot() {
        console.log("Chatbot Widget v1.1.2 Initializing...");
        
        // 1. Inject Styles
        if (!document.getElementById('bio-chatbot-styles')) {
            const style = document.createElement("style");
            style.id = 'bio-chatbot-styles';
            style.innerHTML = `
                #bio-chatbot-widget {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                }
                
                #bio-chat-toggle {
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
                    border-radius: 30px;
                    box-shadow: 0 10px 25px rgba(13, 148, 136, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                
                #bio-chat-toggle:hover {
                    transform: scale(1.05);
                }
                
                #bio-chat-window {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 380px;
                    height: 520px;
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(13, 148, 136, 0.2);
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform-origin: bottom right;
                    transform: scale(0);
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                #bio-chat-window.open {
                    transform: scale(1);
                    opacity: 1;
                }
                
                .chat-header {
                    padding: 1.25rem;
                    background: #0d9488;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .chat-messages {
                    flex: 1;
                    padding: 1.25rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    background: #f8fafc;
                }
                
                .message {
                    max-width: 85%;
                    padding: 0.85rem 1rem;
                    border-radius: 16px;
                    font-size: 0.9rem;
                    line-height: 1.5;
                    font-weight: 500;
                }
                
                .message.bot {
                    align-self: flex-start;
                    background: white;
                    color: #1e293b;
                    border: 1px solid #e2e8f0;
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                
                .message.user {
                    align-self: flex-end;
                    background: #0d9488;
                    color: white;
                    border-bottom-right-radius: 4px;
                    box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
                }
                
                .chat-input-area {
                    padding: 1.25rem;
                    background: white;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    gap: 0.75rem;
                }
                
                #chat-input {
                    flex: 1;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 0.75rem 1rem;
                    color: #1e293b;
                    font-family: inherit;
                    font-size: 0.9rem;
                    outline: none;
                }
                
                #chat-send {
                    background: #0d9488;
                    border: none;
                    border-radius: 12px;
                    width: 44px;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        }

        // 2. Inject HTML
        if (!document.getElementById('bio-chatbot-widget')) {
            const widget = document.createElement("div");
            widget.id = "bio-chatbot-widget";
            widget.innerHTML = `
                <div id="bio-chat-window">
                    <div class="chat-header">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <img src="../static/images/mascot.png" style="width: 32px; height: 32px; border-radius: 50%; background: white; object-fit: cover;">
                            <div>
                                <div style="font-weight: 600; color: white; font-size: 0.95rem;">GenQuantis Assistant</div>
                                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 0.3rem;">
                                    <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span> Online
                                </div>
                            </div>
                        </div>
                        <button id="close-chat" style="background:none; border:none; color: white; cursor: pointer; font-size: 1.2rem; opacity: 0.7;">✕</button>
                    </div>
                    <div class="chat-messages" id="chat-messages">
                        <div class="message bot">
                            Hello! I'm your GenQuantis Discovery assistant. How can I help you with your research today?
                        </div>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="chat-input" placeholder="Ask about targets, molecules...">
                        <button id="chat-send">➤</button>
                    </div>
                </div>
                <div id="bio-chat-toggle">
                    <span style="font-size: 1.5rem;">💬</span>
                </div>
            `;
            document.body.appendChild(widget);
            console.log("Chatbot Widget DOM Injected.");
        }

        // 3. Logic
        const toggle = document.getElementById("bio-chat-toggle");
        const chatWindow = document.getElementById("bio-chat-window");
        const close = document.getElementById("close-chat");
        const input = document.getElementById("chat-input");
        const send = document.getElementById("chat-send");
        const messages = document.getElementById("chat-messages");

        function toggleChat() {
            chatWindow.classList.toggle("open");
        }

        if (toggle) toggle.onclick = toggleChat;
        if (close) close.onclick = toggleChat;

        async function sendMessage() {
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, "user");
            input.value = "";

            const loadingId = addMessage(`Thinking...`, "bot");

            try {
                // Use global API_BASE_URL if available, else fallback
                const baseUrl = window.API_BASE_URL || window.location.origin;
                const res = await fetch(`${baseUrl}/api/chat/ask`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        context: document.title
                    })
                });

                removeMessage(loadingId);
                if (res.ok) {
                    const data = await res.json();
                    simulateTypewriter(data.response);
                } else {
                    addMessage("⚠️ System error. Please try again.", "bot");
                }
            } catch (e) {
                removeMessage(loadingId);
                addMessage("⚠️ Connection error.", "bot");
            }
        }

        if (send) send.onclick = sendMessage;
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === "Enter") sendMessage();
            };
        }

        function addMessage(html, type) {
            const div = document.createElement("div");
            div.className = `message ${type}`;
            div.innerHTML = html;
            div.id = "msg-" + Date.now() + Math.random();
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            return div.id;
        }

        function removeMessage(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        function simulateTypewriter(text) {
            const div = document.createElement("div");
            div.className = `message bot`;
            messages.appendChild(div);
            let i = 0;
            function type() {
                if (i < text.length) {
                    div.textContent += text.charAt(i);
                    i++;
                    messages.scrollTop = messages.scrollHeight;
                    setTimeout(type, 10);
                }
            }
            type();
        }
    }

    // Run when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatbot);
    } else {
        initChatbot();
    }
})();
