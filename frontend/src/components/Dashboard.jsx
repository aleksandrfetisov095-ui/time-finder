import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { money } from '../App';
import { getBudgets } from './BudgetsEditor';

export default function Dashboard({ stats, period }) {
  const [limits, setLimits] = useState(getBudgets());

  useEffect(() => {
    const handler = () => setLimits(getBudgets());
    window.addEventListener('budgets-changed', handler);
    return () => window.removeEventListener('budgets-changed', handler);
  }, []);

  const rows = stats.by_category.map(c => {
    const limit = limits[c.category] || 0;
    return { ...c, limit, pct: limit ? Math.min(100, (c.amount / limit) * 100) : 100 };
  });

  const months = stats.by_month.map(m => ({
    ...m,
    label: period === 'month'
      ? new Date(m.month).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : new Date(m.month + '-01').toLocaleDateString('ru-RU', { month: 'short' }),
  }));

  return (
    <section className="charts">
      <div className="panel">
        <div className="panel-title">Расходы по категориям</div>
        <div className="panel-sub">Превышение лимита подсвечивается красным</div>
        {rows.length === 0 ? (
          <div className="panel-sub">Нет расходов за период</div>
        ) : (
          <div className="budget-list">
            {rows.map(r => (
              <div className="budget-row" key={r.category}>
                <div className="budget-head">
                  <span className="budget-name">{r.category}</span>
                  <span className="budget-amount">{money(r.amount)}{r.limit ? ` / ${money(r.limit)}` : ''}</span>
                </div>
                <div className="budget-track">
                  <div
                    className={`budget-fill ${r.pct >= 100 ? 'over' : r.pct >= 80 ? 'warn' : 'ok'}`}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">{period === 'month' ? 'Динамика по дням' : 'Динамика по месяцам'}</div>
        <div className="panel-sub">Сравнение доходов и расходов</div>
        {months.length === 0 ? (
          <div className="panel-sub">Недостаточно данных</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={months} barSize={28}>
              <CartesianGrid vertical={false} stroke="#eef0f3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#9ca3af" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#9ca3af"
                     tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
              <Tooltip formatter={(v) => money(v)}
                       contentStyle={{ borderRadius: 8, border: '1px solid #e4e6eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Доход" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Расход" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}