(function() {
  if (window.SiteChatLoaded) return;
  window.SiteChatLoaded = true;

  const scriptEl = document.currentScript;
  const siteId = scriptEl ? scriptEl.dataset.siteId : "";
  const apiUrl = scriptEl ? scriptEl.dataset.apiUrl : "https://sitechat-backend-zmlt.onrender.com";

  const config = {
    siteId: siteId || "6aef384a5764a4928998882c",
    apiUrl: apiUrl,
    primaryColor: "#6366f1",
    title: "TapuPaylaş Asistan"
  };

  function adjustHexColor(hex, amount) {
    let usePound = false;
    if (hex[0] == "#") {
      hex = hex.slice(1);
      usePound = true;
    }
    let num = parseInt(hex, 16);
    let r = (num >> 16) + amount;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00ff) + amount;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000ff) + amount;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0");
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp.").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  const baseWidgetCss = `
    .sitechat-widget * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .sitechat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${config.primaryColor}, ${adjustHexColor(config.primaryColor, -20)});
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      z-index: 99998;
    }
    .sitechat-window {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 400px;
      height: 560px;
      background: #ffffff !important;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sitechat-window.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    .sitechat-header {
      background: linear-gradient(135deg, ${config.primaryColor}, ${adjustHexColor(config.primaryColor, -20)});
      color: white !important;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sitechat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc !important;
    }
    .sitechat-message-wrapper {
      display: flex;
      gap: 10px;
    }
    .sitechat-message-wrapper.user {
      flex-direction: row-reverse;
    }
    .sitechat-message {
      padding: 14px 18px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
    }
    .sitechat-message.user {
      background: linear-gradient(135deg, ${config.primaryColor}, ${adjustHexColor(config.primaryColor, -25)}) !important;
      color: white !important;
      border-bottom-right-radius: 6px;
    }
    .sitechat-message.bot {
      background: #ffffff !important;
      color: #1e293b !important;
      border-bottom-left-radius: 6px;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .sitechat-message.bot p, .sitechat-message.bot span, .sitechat-message.bot div, .sitechat-message.bot li {
      color: #1e293b !important;
    }
    .sitechat-input-wrapper {
      padding: 16px;
      background: white !important;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 10px;
    }
    .sitechat-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
      color: #1e293b !important;
      background: #ffffff !important;
    }
    .sitechat-send {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: ${config.primaryColor};
      border: none;
      color: white;
      cursor: pointer;
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = baseWidgetCss;
  document.head.appendChild(styleEl);

  const widgetRoot = document.createElement("div");
  widgetRoot.className = "sitechat-widget";
  widgetRoot.innerHTML = `
    <button class="sitechat-toggle" aria-label="Toggle chat">💬</button>
    <div class="sitechat-window">
      <div class="sitechat-header">
        <h3>${config.title}</h3>
      </div>
      <div class="sitechat-messages" id="sitechat-messages">
        <div class="sitechat-message-wrapper bot">
          <div class="sitechat-message bot">Hello! How can I help you with TapuPaylaş today?</div>
        </div>
      </div>
      <div class="sitechat-input-wrapper">
        <input type="text" class="sitechat-input" id="sitechat-input-field" placeholder="Type your message..." />
        <button class="sitechat-send" id="sitechat-send-btn">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetRoot);

  const toggleBtn = widgetRoot.querySelector(".sitechat-toggle");
  const win = widgetRoot.querySelector(".sitechat-window");
  const inputField = widgetRoot.querySelector("#sitechat-input-field");
  const sendBtn = widgetRoot.querySelector("#sitechat-send-btn");
  const messagesContainer = widgetRoot.querySelector("#sitechat-messages");

  toggleBtn.addEventListener("click", () => {
    win.classList.toggle("open");
  });

  async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    // User message
    const userMsgWrapper = document.createElement("div");
    userMsgWrapper.className = "sitechat-message-wrapper user";
    userMsgWrapper.innerHTML = `<div class="sitechat-message user">${escapeHtml(text)}</div>`;
    messagesContainer.appendChild(userMsgWrapper);
    inputField.value = "";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch(`${config.apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: config.siteId, message: text })
      });
      const data = await response.json();
      const reply = data.response || data.answer || "I received your message.";

      const botMsgWrapper = document.createElement("div");
      botMsgWrapper.className = "sitechat-message-wrapper bot";
      botMsgWrapper.innerHTML = `<div class="sitechat-message bot">${escapeHtml(reply)}</div>`;
      messagesContainer.appendChild(botMsgWrapper);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
      console.error(err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
