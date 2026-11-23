CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    bank VARCHAR(50) NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_account ON transactions(account_id);

-- Дефолтные счета
INSERT INTO accounts (name, bank, balance, color) VALUES
    ('Основной', 'Тинькофф', 50000, '#2563eb'),
    ('Накопительный', 'Сбербанк', 120000, '#059669'),
    ('Наличные', '-', 15000, '#d97706')
ON CONFLICT DO NOTHING;