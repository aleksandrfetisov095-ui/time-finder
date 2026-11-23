import { useState, useEffect } from 'react';
import { RotateCcw, Save } from 'lucide-react';

const DEFAULT_LIMITS = {
  Еда: 15000,
  Транспорт: 5000,
  Развлечения: 8000,
  Здоровье: 10000,
  Одежда: 12000,
  Зарплата: 0,
  Другое: 5000,
};

export function getBudgets() {
  try {
    const stored = localStorage.getItem('budgets');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Мержим с дефолтом, чтобы новые категории появились
      return { ...DEFAULT_LIMITS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_LIMITS };
}

export default function BudgetsEditor() {
  const [limits, setLimits] = useState(getBudgets());
  const [saved, setSaved] = useState(false);

  const handleChange = (cat, value) => {
    const num = parseFloat(value);
    setLimits(prev => ({ ...prev, [cat]: isNaN(num) ? 0 : num }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('budgets', JSON.stringify(limits));
    window.dispatchEvent(new Event('budgets-changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Сбросить все лимиты к значениям по умолчанию?')) {
      setLimits({ ...DEFAULT_LIMITS });
      localStorage.removeItem('budgets');
      window.dispatchEvent(new Event('budgets-changed'));
    }
  };

  return (
    <div className="panel budgets-panel">
      <div className="panel-title">Лимиты расходов по категориям</div>
      <div className="panel-sub">
        Установите месячные ограничения. Прогресс-бары в обзоре будут использовать эти значения.
      </div>

      <div className="budget-editor">
        {Object.entries(limits).map(([cat, value]) => (
          <div className="be-row" key={cat}>
            <span className="be-name">{cat}</span>
            <div className="be-input-wrap">
              <input
                type="number"
                min="0"
                step="500"
                value={value}
                onChange={(e) => handleChange(cat, e.target.value)}
                className="be-input"
              />
              <span className="be-currency">₽</span>
            </div>
          </div>
        ))}
      </div>

      <div className="be-actions">
        <button className={`submit ${saved ? 'saved' : ''}`} onClick={handleSave}>
          <Save size={15} />
          {saved ? 'Сохранено ✓' : 'Сохранить'}
        </button>
        <button className="ghost-btn" onClick={handleReset}>
          <RotateCcw size={14} />
          Сбросить к дефолту
        </button>
      </div>
    </div>
  );
}