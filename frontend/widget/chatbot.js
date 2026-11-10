(function() {
  if (window.SiteChatLoaded) return;
  window.SiteChatLoaded = true;

  const scriptEl = document.currentScript;
  const siteId = scriptEl ? scriptEl.dataset.siteId : "";
  const apiUrl = scriptEl ? scriptEl.dataset.apiUrl : "https://sitechat-backend-zmlt.onrender.com";

  const config = {
    siteId: siteId || "6aef384a5764a4928998882c",
    apiUrl: apiUrl,
    primaryColor: "#222222",
    backgroundColor: "#f8f8f8",
    title: "TapuPayla Asistan"
  };

  let sessionId = "sess_default";
  try {
    sessionId = localStorage.getItem("sitechat_session_id");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("sitechat_session_id", sessionId);
    }
  } catch (e) {
    sessionId = window._sitechat_fallback_session || ("sess_" + Math.random().toString(36).substring(2, 15));
    window._sitechat_fallback_session = sessionId;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Format bot response: convert **bold** and bullet lists (- or *) into proper HTML
  function formatBotResponse(text) {
    let safe = escapeHtml(text);
    
    // Convert **bold** to <strong>
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    let lines = safe.split("\n");
    let inList = false;
    let htmlLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!inList) {
          htmlLines.push("<ul style='margin: 6px 0 6px 18px; padding: 0; list-style-type: disc;'>");
          inList = true;
        }
        let content = line.substring(2);
        htmlLines.push(`<li style='margin-bottom: 4px;'>${content}</li>`);
      } else {
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        if (line.length > 0) {
          htmlLines.push(`<p style='margin-bottom: 6px;'>${line}</p>`);
        }
      }
    }
    if (inList) {
      htmlLines.push("</ul>");
    }

    return htmlLines.join("");
  }

  // Inject Google Fonts for Nokora
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Nokora:wght@400;700&display=swap";
  document.head.appendChild(fontLink);

  const baseWidgetCss = `
    .sitechat-widget * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Nokora', sans-serif !important;
    }
    .sitechat-toggle {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #222222 !important;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      z-index: 99998;
      color: #ffffff;
      font-size: 22px;
      transition: transform 0.2s ease;
    }
    .sitechat-toggle:hover {
      transform: scale(1.05);
    }
    .sitechat-window {
      position: fixed;
      bottom: 164px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: #f8f8f8 !important;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      opacity: 0;
      visibility: hidden;
      transform: translateY(15px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid #e0e0e0;
    }
    .sitechat-window.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    .sitechat-header {
      background: #222222 !important;
      color: #ffffff !important;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sitechat-header h3 {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff !important;
    }
    .sitechat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8f8f8 !important;
    }
    .sitechat-message-wrapper {
      display: flex;
      gap: 8px;
    }
    .sitechat-message-wrapper.user {
      flex-direction: row-reverse;
    }
    .sitechat-message {
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      max-width: 85%;
    }
    .sitechat-message.user {
      background: #222222 !important;
      color: #ffffff !important;
      border-bottom-right-radius: 4px;
    }
    .sitechat-message.bot {
      background: #ffffff !important;
      color: #222222 !important;
      border-bottom-left-radius: 4px;
      border: 1px solid #e5e5e5 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .sitechat-message.bot p, .sitechat-message.bot span, .sitechat-message.bot div, .sitechat-message.bot li, .sitechat-message.bot strong {
      color: #222222 !important;
    }
    .sitechat-input-wrapper {
      padding: 12px 16px;
      background: #ffffff !important;
      border-top: 1px solid #e5e5e5;
      display: flex;
      gap: 8px;
    }
    .sitechat-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
      color: #222222 !important;
      background: #ffffff !important;
    }
    .sitechat-send {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #222222;
      border: none;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
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
          <div class="sitechat-message bot">Merhaba! TapuPayla platformu hakkında size nasıl yardımcı olabilirim?</div>
        </div>
      </div>
      <div class="sitechat-input-wrapper">
        <input type="text" class="sitechat-input" id="sitechat-input-field" placeholder="Mesajınızı yazın..." />
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
        body: JSON.stringify({
          site_id: config.siteId,
          message: text,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error("Server status " + response.status);

      const data = await response.json();
      const reply = data.answer || data.response || "Yanıt alındı.";

      const botMsgWrapper = document.createElement("div");
      botMsgWrapper.className = "sitechat-message-wrapper bot";
      // Use formatBotResponse instead of raw text so lists and bolding render properly
      botMsgWrapper.innerHTML = `<div class="sitechat-message bot">${formatBotResponse(reply)}</div>`;
      messagesContainer.appendChild(botMsgWrapper);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsgWrapper = document.createElement("div");
      errorMsgWrapper.className = "sitechat-message-wrapper bot";
      errorMsgWrapper.innerHTML = `<div class="sitechat-message bot">Üzgünüm, şu anda yanıt alınamadı. Lütfen tekrar deneyin.</div>`;
      messagesContainer.appendChild(errorMsgWrapper);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
