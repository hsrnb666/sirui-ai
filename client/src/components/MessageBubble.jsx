import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MessageBubble({ message, index, isLast, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';
  const theme = document.documentElement.getAttribute('data-theme');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  const startEdit = () => { setEditContent(message.content); setIsEditing(true); };
  const confirmEdit = () => { if (editContent.trim()) onEdit(editContent.trim()); setIsEditing(false); };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        )}
      </div>
      <div className="message-body">
        <div className="message-role">{isUser ? '你' : '思瑞AI助手'}</div>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              style={{ width: '100%', minHeight: '100px', padding: '12px', border: '1px solid var(--border-glow)',
                borderRadius: '8px', background: 'var(--bg-input)', resize: 'vertical', outline: 'none',
                fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6', boxShadow: '0 0 8px rgba(0,212,255,0.15)' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }} onClick={confirmEdit}>确认并重新生成</button>
              <button className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '13px' }} onClick={() => setIsEditing(false)}>取消</button>
            </div>
          </div>
        ) : (
          <div className="message-content">
            {message.streaming && !message.content ? (
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeStr = String(children).replace(/\n$/, '');
                    const isInline = !match && !codeStr.includes('\n');
                    if (isInline) return <code {...props}>{children}</code>;
                    return (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">
                          <span>{match ? match[1] : 'code'}</span>
                          <CopyButton text={codeStr} />
                        </div>
                        <SyntaxHighlighter style={theme === 'dark' ? oneDark : oneLight}
                          language={match ? match[1] : 'text'} PreTag="div"
                          customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}>
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                  pre({ children }) { return children; },
                  a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>; }
                }}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {!isEditing && !message.streaming && message.content && (
          <div className="message-actions">
            <button onClick={handleCopy}>{copied ? '✅ 已复制' : '📋 复制'}</button>
            {isUser && <button onClick={startEdit}>✏️ 编辑</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return <button className="copy-btn" onClick={handleCopy}>{copied ? '✅ 已复制' : '📋 复制'}</button>;
}
