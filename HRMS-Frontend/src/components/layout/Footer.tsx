import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function Footer() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <footer className="layout-footer">
        <span>© {new Date().getFullYear()} NIRALIX HRMS. All rights reserved.</span>
      </footer>

      {/* Chatbot FAB */}
      <div className="chatbot-container">
        <button
          className="chatbot-toggle"
          onClick={() => setChatOpen(prev => !prev)}
          aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        >
          {chatOpen ? <X size={18} /> : <MessageCircle size={18} />}
          <span>{chatOpen ? 'Close' : 'Chat'}</span>
        </button>

        {chatOpen && (
          <div className="chatbot-box">
            <div className="chatbot-placeholder">
              <MessageCircle size={40} className="chatbot-placeholder-icon" />
              <p>AI Chatbot coming soon</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
