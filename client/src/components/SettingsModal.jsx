import { useState, useEffect } from 'react';
import { fetchModels } from '../api';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...settings });
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const handleChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const loadModels = async () => {
    if (!form.apiUrl || !form.apiKey) return;
    setLoadingModels(true);
    try { const list = await fetchModels(form.apiUrl, form.apiKey); setModels(list.map(m => m.id)); }
    catch (e) { setModels([]); }
    setLoadingModels(false);
  };

  useEffect(() => { const timer = setTimeout(loadModels, 500); return () => clearTimeout(timer); }, [form.apiUrl, form.apiKey]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 设置</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>模型</label>
            {models.length > 0 ? (
              <select value={form.model || ''} onChange={e => handleChange('model', e.target.value)}>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input type="text" value={form.model || ''} onChange={e => handleChange('model', e.target.value)} placeholder="deepseek-ai/DeepSeek-V3" />
            )}
            {loadingModels && <div className="hint">加载模型列表中...</div>}
            <div className="hint">常用：gpt-4, gpt-3.5-turbo, deepseek-chat, qwen-turbo</div>
          </div>
          <div className="form-group">
            <label>温度 (Temperature)：<span className="range-display">{form.temperature ?? 0.7}</span></label>
            <input type="range" min="0" max="2" step="0.1" value={form.temperature ?? 0.7}
              onChange={e => handleChange('temperature', parseFloat(e.target.value))} />
            <div className="hint">0 = 更确定，2 = 更随机。推荐 0.7</div>
          </div>
          <div className="form-group">
            <label>最大 Token 数</label>
            <input type="number" value={form.maxTokens || 2048}
              onChange={e => handleChange('maxTokens', parseInt(e.target.value) || 2048)} min={1} max={128000} />
            <div className="hint">单次回复的最大 token 数量</div>
          </div>
          <div className="form-group">
            <label>系统提示词 (System Prompt)</label>
            <textarea value={form.systemPrompt || ''} onChange={e => handleChange('systemPrompt', e.target.value)}
              placeholder="你是思瑞AI助手，一个智能、友善的AI助手..." rows={3} />
            <div className="hint">设定 AI 的角色和行为准则</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>保存设置</button>
        </div>
      </div>
    </div>
  );
}
