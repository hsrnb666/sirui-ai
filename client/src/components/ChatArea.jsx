import { useEffect, useRef, useMemo } from 'react';
import MessageBubble from './MessageBubble';
import InputBox from './InputBox';

export default function ChatArea({ messages, isStreaming, onSend, onStop, onRegenerate, onToggleSidebar, settings, sidebarOpen }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const tokenCount = useMemo(() => {
    return messages.reduce((acc, m) => acc + Math.ceil((m.content || '').length / 3), 0);
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-header-left">
          <button className={`menu-btn ${!sidebarOpen ? 'visible' : ''}`} onClick={onToggleSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="model-badge">{settings.model || '思瑞AI助手'}</span>
        </div>
        <div className="chat-header-right">
          {messages.length > 0 && <span className="token-count">~{tokenCount.toLocaleString()} tokens</span>}
        </div>
      </div>

      <div className="messages-container" ref={containerRef}>
        {isEmpty ? (
          <div className="welcome-screen">
            <div className="logo">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="url(#grad1)" strokeWidth="2" opacity="0.6"/>
                <circle cx="32" cy="32" r="20" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.3"/>
                <circle cx="32" cy="32" r="6" fill="url(#grad1)"/>
                <line x1="32" y1="4" x2="32" y2="12" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.5"/>
                <line x1="32" y1="52" x2="32" y2="60" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.5"/>
                <line x1="4" y1="32" x2="12" y2="32" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.5"/>
                <line x1="52" y1="32" x2="60" y2="32" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.5"/>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#7c5cfc"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1>思瑞AI助手</h1>
            <p>智能对话，随时为你解答</p>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => onSend('请用简单的语言解释什么是量子计算')}>
                <div className="qa-title">💡 解释概念</div>
                <div>请用简单的语言解释什么是量子计算</div>
              </button>
              <button className="quick-action" onClick={() => onSend('帮我写一个Python的快速排序算法')}>
                <div className="qa-title">💻 编写代码</div>
                <div>帮我写一个Python的快速排序算法</div>
              </button>
              <button className="quick-action" onClick={() => onSend('帮我写一封请假邮件，原因是身体不适')}>
                <div className="qa-title">✍️ 撰写文案</div>
                <div>帮我写一封请假邮件</div>
              </button>
              <button className="quick-action" onClick={() => onSend('列出5个提高学习效率的方法')}>
                <div className="qa-title">🎯 头脑风暴</div>
                <div>列出5个提高学习效率的方法</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="messages-inner">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} index={idx} isLast={idx === messages.length - 1}
                onEdit={(newContent) => onSend(newContent, idx)} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <InputBox onSend={onSend} onStop={onStop} onRegenerate={onRegenerate}
        isStreaming={isStreaming} hasMessages={!isEmpty} />
    </div>
  );
}
