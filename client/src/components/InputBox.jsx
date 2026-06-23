import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile } from '../api';

export default function InputBox({ onSend, onStop, onRegenerate, isStreaming, hasMessages }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [input]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content && files.length === 0) return;
    let fullContent = content;
    if (files.length > 0) {
      const fileDesc = files.map(f => `[FILE: ${f.filename}]`).join(' ');
      fullContent = content ? `${content}\n\n${fileDesc}` : fileDesc;
    }
    onSend(fullContent); setInput(''); setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, files, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isStreaming) handleSend(); }
  };

  const handleFileSelect = async (e) => {
    for (const file of Array.from(e.target.files)) {
      try { const result = await uploadFile(file); setFiles(prev => [...prev, result]); }
      catch (err) { console.error('Upload error:', err); }
    }
    e.target.value = '';
  };

  const removeFile = (idx) => { setFiles(prev => prev.filter((_, i) => i !== idx)); };

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('当前浏览器不支持语音输入，请使用 Chrome 浏览器'); return;
    }
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'zh-CN'; recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = (event) => {
      let t = ''; for (let i = 0; i < event.results.length; i++) t += event.results[i][0].transcript;
      setInput(prev => prev + t);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition; recognition.start(); setIsRecording(true);
  }, [isRecording]);

  return (
    <div className="input-area">
      <div className="input-wrapper">
        {hasMessages && !isStreaming && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <button onClick={onRegenerate}
              style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--border-color)',
                fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-card)',
                backdropFilter: 'blur(8px)', transition: 'all 0.3s', letterSpacing: '0.5px',
                display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-glow)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--neon-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
              🔄 重新生成
            </button>
          </div>
        )}
        {files.length > 0 && (
          <div className="file-preview">
            {files.map((f, idx) => (
              <div key={idx} className="file-chip">
                <span>{f.filename}</span>
                <button className="remove-file" onClick={() => removeFile(idx)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="input-box">
          <div className="input-actions">
            <button className="action-btn" onClick={() => fileInputRef.current?.click()} title="上传文件">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button className={`action-btn ${isRecording ? 'recording' : ''}`} onClick={toggleVoice}
              title={isRecording ? '停止录音' : '语音输入'} style={isRecording ? { color: 'var(--danger)' } : {}}>
              {isRecording ? (
                <div className="recording-indicator"><div className="recording-dot"></div></div>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
          </div>
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="输入消息... (Shift+Enter 换行)" rows={1} />
          {isStreaming ? (
            <button className="stop-btn" onClick={onStop} title="停止生成">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
          ) : (
            <button className="send-btn" onClick={handleSend} disabled={!input.trim() && files.length === 0} title="发送">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json" style={{ display: 'none' }} onChange={handleFileSelect} />
        <div className="input-footer">思瑞AI助手可能会犯错，请核实重要信息。</div>
      </div>
    </div>
  );
}
