import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';

const CATS = ['Еда', 'Транспорт', 'Развлечения', 'Здоровье', 'Одежда', 'Зарплата', 'Другое'];

export default function TransactionForm({ onAdd, accounts }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Еда');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || null);

  const valid = parseFloat(amount) > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      amount: parseFloat(amount),
      category,
      type,
      description,
      account_id: accountId ? parseInt(accountId) : null,
    });
    setAmount('');
    setDescription('');
  };

  return (
    <form onSubmit={submit}>
      <div className="type-toggle">
        <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')}>
          <ArrowUpRight size={14} /> Расход
        </button>
        <button type="button" className={type === 'income' ? 'active income' : ''} onClick={() => setType('income')}>
          <ArrowDownLeft size={14} /> Доход
        </button>
      </div>

      <div className="field">
        <label>Счёт</label>
        <select value={accountId || ''} onChange={(e) => setAccountId(e.target.value || null)}>
          <option value="">— Не выбран —</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name} ({a.bank})</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Сумма</label>
        <div className="amount-wrap">
          <input
            type="number" inputMode="decimal" min="1" step="1"
            placeholder="0" value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="currency">₽</span>
        </div>
      </div>

      <div className="field">
        <label>Категория</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Описание</label>
        <input
          placeholder="Например: продукты в Пятёрочке"
          value={description} onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <button className="submit" type="submit" disabled={!valid}>
        <Plus size={15} /> Добавить операцию
      </button>
    </form>
  );
}