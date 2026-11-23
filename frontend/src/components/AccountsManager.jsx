import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { money } from '../App';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'];

export default function AccountsManager({ accounts, onUpdate }) {
  const [form, setForm] = useState({ name: '', bank: '', balance: 0, color: COLORS[0] });

  const create = async (e) => {
    e.preventDefault();
    if (!form.name || !form.bank) return;
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', bank: '', balance: 0, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    onUpdate();
  };

  const updateBalance = async (id, newBalance) => {
    const acc = accounts.find(a => a.id === id);
    await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...acc, balance: parseFloat(newBalance) || 0 }),
    });
    onUpdate();
  };

  const remove = async (id) => {
    if (!window.confirm('Удалить счёт? Транзакции останутся, но без привязки.')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="panel accounts-panel">
      <div className="panel-title">Управление счетами</div>
      <div className="panel-sub">Добавляйте карты, наличные, накопительные счета</div>

      <form className="account-form" onSubmit={create}>
        <input
          placeholder="Название (например, Тинькофф Black)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Банк"
          value={form.bank}
          onChange={(e) => setForm({ ...form, bank: e.target.value })}
          required
        />
        <div className="amount-wrap">
          <input
            type="number"
            placeholder="Начальный баланс"
            value={form.balance || ''}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
          />
          <span className="currency">₽</span>
        </div>
        <div className="color-picker">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`color-dot ${form.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setForm({ ...form, color: c })}
            />
          ))}
        </div>
        <button type="submit" className="submit">
          <Plus size={15} /> Добавить счёт
        </button>
      </form>

      <div className="accounts-list">
        {accounts.map(a => (
          <div className="account-card" key={a.id} style={{ borderLeftColor: a.color }}>
            <div className="account-info">
              <div className="account-name">{a.name}</div>
              <div className="account-bank">{a.bank}</div>
            </div>
            <div className="account-balance-wrap">
              <input
                type="number"
                defaultValue={a.balance}
                onBlur={(e) => updateBalance(a.id, e.target.value)}
                className="account-balance-input"
              />
              <span className="currency">₽</span>
            </div>
            <button className="icon-btn" onClick={() => remove(a.id)} title="Удалить">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}