package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/lib/pq"
)

type Account struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Bank      string    `json:"bank"`
	Balance   float64   `json:"balance"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

type Transaction struct {
	ID          int       `json:"id"`
	Amount      float64   `json:"amount"`
	Category    string    `json:"category"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	AccountID   *int      `json:"account_id"`
	AccountName *string   `json:"account_name,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Stats struct {
	TotalIncome  float64         `json:"total_income"`
	TotalExpense float64         `json:"total_expense"`
	Balance      float64         `json:"balance"`
	ByCategory   []CategoryStats `json:"by_category"`
	ByMonth      []MonthlyStats  `json:"by_month"`
}

type CategoryStats struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

type MonthlyStats struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

var db *sql.DB

func getPeriodFilter(period string) string {
	switch period {
	case "month":
		return "t.created_at >= date_trunc('month', now())"
	case "year":
		return "t.created_at >= date_trunc('year', now())"
	default:
		return "1=1"
	}
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://user:pass@db:5432/finance?sslmode=disable"
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("DB open failed:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("DB ping failed:", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: false,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/accounts", getAccounts)
		r.Post("/accounts", createAccount)
		r.Put("/accounts/{id}", updateAccount)
		r.Delete("/accounts/{id}", deleteAccount)

		r.Get("/transactions", getTransactions)
		r.Post("/transactions", createTransaction)
		r.Delete("/transactions/{id}", deleteTransaction)

		r.Get("/stats", getStats)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// ---------- ACCOUNTS ----------

func getAccounts(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, bank, balance, color, created_at FROM accounts ORDER BY id")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	accounts := []Account{}
	for rows.Next() {
		var a Account
		rows.Scan(&a.ID, &a.Name, &a.Bank, &a.Balance, &a.Color, &a.CreatedAt)
		accounts = append(accounts, a)
	}
	json.NewEncoder(w).Encode(accounts)
}

func createAccount(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name    string  `json:"name"`
		Bank    string  `json:"bank"`
		Balance float64 `json:"balance"`
		Color   string  `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}
	if input.Name == "" || input.Bank == "" {
		http.Error(w, "Name and bank required", 400)
		return
	}
	if input.Color == "" {
		input.Color = "#2563eb"
	}

	var a Account
	err := db.QueryRow(
		"INSERT INTO accounts (name, bank, balance, color) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
		input.Name, input.Bank, input.Balance, input.Color,
	).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	a.Name = input.Name
	a.Bank = input.Bank
	a.Balance = input.Balance
	a.Color = input.Color

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	json.NewEncoder(w).Encode(a)
}

func updateAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	var input struct {
		Name    string  `json:"name"`
		Bank    string  `json:"bank"`
		Balance float64 `json:"balance"`
		Color   string  `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}

	_, err := db.Exec(
		"UPDATE accounts SET name=$1, bank=$2, balance=$3, color=$4 WHERE id=$5",
		input.Name, input.Bank, input.Balance, input.Color, id,
	)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(204)
}

func deleteAccount(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	_, err := db.Exec("DELETE FROM accounts WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(204)
}

// ---------- TRANSACTIONS ----------

func getTransactions(w http.ResponseWriter, r *http.Request) {
	filter := getPeriodFilter(r.URL.Query().Get("period"))
	accountFilter := ""
	if aid := r.URL.Query().Get("account_id"); aid != "" {
		// ИСПРАВЛЕНИЕ: добавлено 't.' перед account_id
		accountFilter = fmt.Sprintf(" AND t.account_id = %s", aid)
	}

	query := fmt.Sprintf(
		"SELECT t.id, t.amount, t.category, t.type, t.description, t.account_id, a.name, t.created_at "+
			"FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id "+
			"WHERE %s%s ORDER BY t.created_at DESC", filter, accountFilter)

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	transactions := []Transaction{}
	for rows.Next() {
		var t Transaction
		rows.Scan(&t.ID, &t.Amount, &t.Category, &t.Type, &t.Description, &t.AccountID, &t.AccountName, &t.CreatedAt)
		transactions = append(transactions, t)
	}
	json.NewEncoder(w).Encode(transactions)
}

func createTransaction(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Amount      float64 `json:"amount"`
		Category    string  `json:"category"`
		Type        string  `json:"type"`
		Description string  `json:"description"`
		AccountID   *int    `json:"account_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}
	if input.Amount <= 0 || input.Category == "" || input.Type == "" {
		http.Error(w, "Invalid data", 400)
		return
	}

	if input.AccountID != nil {
		delta := input.Amount
		if input.Type == "expense" {
			delta = -delta
		}
		db.Exec("UPDATE accounts SET balance = balance + $1 WHERE id = $2", delta, *input.AccountID)
	}

	var t Transaction
	err := db.QueryRow(
		"INSERT INTO transactions (amount, category, type, description, account_id) "+
			"VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at",
		input.Amount, input.Category, input.Type, input.Description, input.AccountID,
	).Scan(&t.ID, &t.CreatedAt)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	t.Amount = input.Amount
	t.Category = input.Category
	t.Type = input.Type
	t.Description = input.Description
	t.AccountID = input.AccountID

	if input.AccountID != nil {
		db.QueryRow("SELECT name FROM accounts WHERE id = $1", *input.AccountID).Scan(&t.AccountName)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	json.NewEncoder(w).Encode(t)
}

func deleteTransaction(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))

	var accID *int
	var amount float64
	var typ string
	db.QueryRow("SELECT account_id, amount, type FROM transactions WHERE id = $1", id).
		Scan(&accID, &amount, &typ)

	if accID != nil {
		delta := amount
		if typ == "expense" {
			delta = -delta
		} else {
			delta = -delta
		}
		db.Exec("UPDATE accounts SET balance = balance + $1 WHERE id = $2", -delta, *accID)
	}

	_, err := db.Exec("DELETE FROM transactions WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	w.WriteHeader(204)
}

// ---------- STATS ----------

func getStats(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	filter := getPeriodFilter(period) // возвращает "t.created_at >= ..."

	accountFilter := ""
	if aid := r.URL.Query().Get("account_id"); aid != "" {
		accountFilter = fmt.Sprintf(" AND t.account_id = %s", aid)
	}

	fullFilter := filter + accountFilter

	var stats Stats
	db.QueryRow(fmt.Sprintf("SELECT COALESCE(SUM(t.amount),0) FROM transactions t WHERE %s AND t.type='income'", fullFilter)).Scan(&stats.TotalIncome)
	db.QueryRow(fmt.Sprintf("SELECT COALESCE(SUM(t.amount),0) FROM transactions t WHERE %s AND t.type='expense'", fullFilter)).Scan(&stats.TotalExpense)
	stats.Balance = stats.TotalIncome - stats.TotalExpense

	rows, _ := db.Query(fmt.Sprintf("SELECT t.category, SUM(t.amount) FROM transactions t WHERE %s AND t.type='expense' GROUP BY t.category ORDER BY SUM(t.amount) DESC", fullFilter))
	defer rows.Close()
	for rows.Next() {
		var cs CategoryStats
		rows.Scan(&cs.Category, &cs.Amount)
		stats.ByCategory = append(stats.ByCategory, cs)
	}
	if stats.ByCategory == nil {
		stats.ByCategory = []CategoryStats{}
	}

	format := "'YYYY-MM'"
	if period == "month" {
		format = "'YYYY-MM-DD'"
	}

	rows2, _ := db.Query(fmt.Sprintf(`
		SELECT TO_CHAR(t.created_at, %s) as period,
			COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END),0) as income,
			COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END),0) as expense
		FROM transactions t WHERE %s
		GROUP BY 1 ORDER BY 1`, format, fullFilter))
	defer rows2.Close()
	for rows2.Next() {
		var ms MonthlyStats
		rows2.Scan(&ms.Month, &ms.Income, &ms.Expense)
		stats.ByMonth = append(stats.ByMonth, ms)
	}
	if stats.ByMonth == nil {
		stats.ByMonth = []MonthlyStats{}
	}

	json.NewEncoder(w).Encode(stats)
}
