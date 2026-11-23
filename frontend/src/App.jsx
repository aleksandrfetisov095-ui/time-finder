import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowDownUp, Check, Calendar, Plus, Wallet } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import BudgetsEditor from './components/BudgetsEditor';
import AccountsManager from './components/AccountsManager';
import './App.css';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null); // null = все
  const [period, setPeriod] = useState('month');
  const [section, setSection] = useState('overview');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const fullDate = useMemo(() => {
    const s = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const showToast = useCallback((msg) => {
    setToast({ msg, key: Date.now() });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (selectedAccountId) params.set('account_id', selectedAccountId);
      const qs = '?' + params.toString();

      const [t, s, a] = await Promise.all([
        fetch(`/api/transactions${qs}`).then(r => r.json()),
        fetch(`/api/stats${qs}`).then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
      ]);
      setTransactions(t);
      setStats(s);
      setAccounts(a);
    } catch {
      showToast('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [period, selectedAccountId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTransaction = async (data) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      showToast(data.type === 'income' ? 'Доход добавлен' : 'Расход добавлен');
      fetchData();
    } else showToast('Ошибка сохранения');
  };

  const deleteTransaction = async (id) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    showToast('Транзакция удалена');
    fetchData();
  };

  const totalBalance = useMemo(() =>
    accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const visible = useMemo(() => {
    let list = transactions;
    if (filter !== 'all') list = list.filter(t => t.type === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) =>
      sortBy === 'amount' ? b.amount - a.amount : new Date(b.created_at) - new Date(a.created_at));
  }, [transactions, filter, query, sortBy]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <h1>Finance</h1>
            <div className="sub">Личный учёт средств</div>
          </div>
        </div>
        <div className="header-right">
          <div className="total-balance">
            <Wallet size={14} />
            <span className="total-label">Всего:</span>
            <span className="total-value">{money(totalBalance)}</span>
          </div>
          <div className="period">
            <Calendar size={14} />
            {fullDate}
          </div>
        </div>
      </header>

      <nav className="nav-tabs">
        <button className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}>Обзор</button>
        <button className={section === 'budgets' ? 'active' : ''} onClick={() => setSection('budgets')}>Лимиты</button>
        <button className={section === 'accounts' ? 'active' : ''} onClick={() => setSection('accounts')}>Счета</button>
      </nav>

      {section === 'overview' && (
        <>
          {/* Переключатель счетов */}
          <div className="accounts-tabs">
            <button
              className={selectedAccountId === null ? 'active' : ''}
              onClick={() => setSelectedAccountId(null)}
            >
              Все счета
            </button>
            {accounts.map(a => (
              <button
                key={a.id}
                className={selectedAccountId === a.id ? 'active' : ''}
                onClick={() => setSelectedAccountId(a.id)}
                style={{ '--accent-color': a.color }}
              >
                <span className="account-dot" style={{ background: a.color }} />
                {a.name}
                <span className="account-balance">{money(a.balance)}</span>
              </button>
            ))}
          </div>

          {/* Период */}
          <div className="tabs period-tabs">
            {[['month', 'Месяц'], ['year', 'Год'], ['all', 'Всё время']].map(([val, label]) => (
              <button key={val} className={period === val ? 'active' : ''} onClick={() => setPeriod(val)}>
                {label}
              </button>
            ))}
          </div>

          {stats && (
            <section className="summary">
              <div className="stat">
                <div className="stat-label"><span className="dot income" /> Доходы</div>
                <div className="stat-value income">{money(stats.total_income)}</div>
                <div className="stat-meta">{transactions.filter(t => t.type === 'income').length} операций</div>
              </div>
              <div className="stat">
                <div className="stat-label"><span className="dot expense" /> Расходы</div>
                <div className="stat-value expense">{money(stats.total_expense)}</div>
                <div className="stat-meta">{transactions.filter(t => t.type === 'expense').length} операций</div>
              </div>
              <div className="stat">
                <div className="stat-label"><span className="dot balance" /> Баланс периода</div>
                <div className="stat-value">{money(stats.balance)}</div>
                <div className="stat-meta">за выбранный период</div>
              </div>
            </section>
          )}

          {stats && <Dashboard stats={stats} period={period} />}

          <section className="main">
            <div className="panel form-panel">
              <div className="panel-title">Новая операция</div>
              <div className="panel-sub">Заполните форму, чтобы добавить запись</div>
              <TransactionForm onAdd={addTransaction} accounts={accounts} />
            </div>

            <div className="panel">
              <div className="toolbar">
                <div className="tabs">
                  {[['all', 'Все'], ['income', 'Доходы'], ['expense', 'Расходы']].map(([val, label]) => (
                    <button key={val} className={filter === val ? 'active' : ''} onClick={() => setFilter(val)}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="search">
                  <Search size={14} />
                  <input placeholder="Поиск по описанию..." value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <button className="sort-btn" onClick={() => setSortBy(s => s === 'date' ? 'amount' : 'date')}>
                  <ArrowDownUp size={13} />
                  {sortBy === 'date' ? 'По дате' : 'По сумме'}
                </button>
              </div>

              {loading
                ? <div className="empty"><p>Загрузка...</p></div>
                : <TransactionList items={visible} onDelete={deleteTransaction} sortBy={sortBy} />}
            </div>
          </section>
        </>
      )}

      {section === 'budgets' && <BudgetsEditor />}
      {section === 'accounts' && <AccountsManager accounts={accounts} onUpdate={fetchData} />}

      {toast && <div className="toast" key={toast.key}><Check size={15} /> {toast.msg}</div>}
    </div>
  );
}

export function money(v) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v) + ' ₽';
}