import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Trash2, Inbox, CreditCard } from 'lucide-react';
import { money } from '../App';

function relDate(d) {
  const today = new Date();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Сегодня';
  if (same(d, yest)) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const time = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function TransactionList({ items, onDelete, sortBy }) {
  const isFlat = sortBy === 'amount';

  const groups = useMemo(() => {
    if (isFlat) {
      return [{ label: null, rows: items }];
    }

    const map = new Map();
    for (const t of items) {
      const key = new Date(t.created_at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.entries()]
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .map(([dateKey, rows]) => ({
        label: relDate(new Date(dateKey)),
        rows: [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      }));
  }, [items, isFlat]);

  if (items.length === 0) {
    return (
      <div className="empty">
        <Inbox size={32} strokeWidth={1.5} />
        <h3>Нет операций за период</h3>
        <p>Измените период или добавьте первую запись</p>
      </div>
    );
  }

  return (
    <ul className="tx-list">
      {groups.map(g => (
        <li key={g.label || 'flat'}>
          {g.label && <div className="tx-group-date">{g.label}</div>}
          {g.rows.map(t => (
            <div className="tx" key={t.id}>
              <div className={`tx-icon ${t.type}`}>
                {t.type === 'income' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
              </div>
              <div className="tx-body">
                <div className="tx-title">{t.description || t.category}</div>
                <div className="tx-cat">{t.category}</div>
                {t.account_name && (
                  <div className="tx-account">
                    <CreditCard size={10} />
                    {t.account_name}
                  </div>
                )}
              </div>
              <div className="tx-time">{time(t.created_at)}</div>
              <div className={`tx-amount ${t.type}`}>
                {t.type === 'income' ? '+' : '−'}{money(t.amount)}
              </div>
              <button className="tx-del" onClick={() => onDelete(t.id)} title="Удалить">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}