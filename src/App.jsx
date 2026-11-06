
import { useEffect, useState } from 'react';
import './App.css';
import {
  
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import Auth from './Auth';
import { supabase } from './supabase';
function App() {
  const [user, setUser] = useState(null);
  async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
  }
}
  const [cloudProductsLoading, setCloudProductsLoading] = useState(false);
  useEffect(() => {
  async function loadProducts() {
    if (!user) return;

    setCloudProductsLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert('Could not load products: ' + error.message);
    } else {
      setProducts(data);
    }

    setCloudProductsLoading(false);
  }

  loadProducts();
}, [user]);

useEffect(() => {
  async function loadSales() {
    if (!user) return;

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setSales(data.map(sale => ({
  ...sale,
  amount: Number(sale.amount),
  quantity: Number(sale.quantity),
  unitPrice: Number(sale.unit_price),
  date: new Date(`${sale.sale_date}T00:00:00`).toLocaleDateString(),
  time: sale.sale_time
})));
    }
  }

  loadSales();
}, [user]);

useEffect(() => {
  async function loadExpenses() {
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setExpenses(data.map(expense => ({
  ...expense,
  amount: Number(expense.amount),
  date: new Date(`${expense.expense_date}T00:00:00`).toLocaleDateString()
})));
    }
  }

  loadExpenses();
}, [user]);
useEffect(() => {
  async function loadCustomers() {
    if (!user) return;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setCustomers(data.map(customer => ({
  ...customer,
  totalSpent: Number(customer.total_spent || 0)
})));
    }
  }

  loadCustomers();
}, [user]);
const [authLoading, setAuthLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    setAuthLoading(false);
  });

  const { data: { subscription } } =
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

  return () => subscription.unsubscribe();
}, []);
 const [sales, setSales] = useState([]);
  const [amount, setAmount] = useState('');
  const [quantitySold, setQuantitySold] = useState('1');
  const [description, setDescription] = useState('');
  const [activeSection, setActiveSection] = useState('Dashboard');
const [expenses, setExpenses] = useState([]);
const [expenseName, setExpenseName] = useState('');
const [expenseAmount, setExpenseAmount] = useState('');
const [customers, setCustomers] = useState([]);
const [customerName, setCustomerName] = useState('');
const [customerPhone, setCustomerPhone] = useState('');
const [selectedCustomerId, setSelectedCustomerId] = useState('');
  // Inventory data
  const [products, setProducts] = useState([]);

  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [editingId, setEditingId] = useState(null);

  

const today = new Date().toLocaleDateString();

const todaysSales = sales
  .filter(sale => sale.date === today)
  .reduce((total, sale) => total + sale.amount, 0);

const todaysTransactions = sales.filter(
  sale => sale.date === today
).length;
 const totalSales = sales.reduce(
  (total, sale) => total + sale.amount,
  0
);
const currentDate = new Date().toLocaleDateString();

const todaySales = sales
  .filter(sale => sale.date === currentDate)
  .reduce((total, sale) => total + sale.amount, 0);

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const monthlySales = sales
  .filter(sale => {
    const saleDate = new Date(`${sale.sale_date}T00:00:00`);
    return (
      saleDate.getMonth() === currentMonth &&
      saleDate.getFullYear() === currentYear
    );
  })
  .reduce((total, sale) => total + Number(sale.amount), 0);

const totalExpenses = expenses.reduce(
  (total, expense) => total + expense.amount,
  0
);

const todayExpenses = expenses
  .filter(expense => expense.date === currentDate)
  .reduce((total, expense) => total + expense.amount, 0);

const todayProfit = todaySales - todayExpenses;
const estimatedProfit = totalSales - totalExpenses;


  const lowStockProducts = products.filter(
    product => product.quantity <= 5
  );
const bestSellingProducts = products
  .map(product => ({
    ...product,
    quantitySold: sales
      .filter(sale => sale.description === product.name)
      .reduce((total, sale) => total + (sale.quantity ?? 1), 0)
  }))
  .filter(product => product.quantitySold > 0)
  .sort((a, b) => b.quantitySold - a.quantitySold);
  const salesByDate = Object.values(
  sales.reduce((groups, sale) => {
    const date = sale.date;

    if (!groups[date]) {
      groups[date] = {
        date,
        revenue: 0
      };
    }

    groups[date].revenue += sale.amount;

    return groups;
  }, {})
).slice(0, 7).reverse();

const highestDailySales = Math.max(
  ...salesByDate.map(day => day.revenue),
  1
);
async function addSale(e) {
  e.preventDefault();

  const selectedProduct = products.find(
    product => product.name === description
  );

  const quantity = Number(quantitySold);

  if (!selectedProduct) {
    alert('Please select a product from Inventory.');
    return;
    }

  

  if (quantity <= 0 || !Number.isInteger(quantity)) {
  alert('Enter a valid quantity.');
  return;
}

if (selectedProduct.quantity < quantity) {
    alert('Not enough stock available.');
    return;
  }

  const saleAmount = selectedProduct.price * quantity;

  const newSale = {
  id: Date.now(),
  description: selectedProduct.name,
  quantity: quantity,
  unitPrice: selectedProduct.price,
  amount: saleAmount,
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString()
};
  const { data, error } = await supabase.rpc('record_sale', {
  p_product_id: selectedProduct.id,
  p_customer_id: selectedCustomerId || null,
  p_quantity: quantity,
  p_sale_date: new Date().toISOString().slice(0, 10),
  p_sale_time: new Date().toLocaleTimeString()
});

if (error) {
  alert(error.message);
  return;
}

const savedSale = data.sale;

setSales(previousSales => [{
  ...savedSale,
  amount: Number(savedSale.amount),
  quantity: Number(savedSale.quantity),
  unitPrice: Number(savedSale.unit_price),
  date: new Date(`${savedSale.sale_date}T00:00:00`).toLocaleDateString(),
  time: savedSale.sale_time
}, ...previousSales]);

setProducts(previousProducts =>
  previousProducts.map(product =>
    product.id === selectedProduct.id
      ? { ...product, quantity: data.remaining_stock }
      : product
  )
);

  setDescription('');
setAmount('');
 setQuantitySold('1');
}
function exportData() {
  const backup = {
    exportDate: new Date().toISOString(),
    products,
    customers,
    sales,
    expenses
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'mauzomate-backup.json';
  link.click();

  URL.revokeObjectURL(url);
}
async function addExpense(e) {
  e.preventDefault();

  const value = Number(expenseAmount);

  if (!expenseName.trim() || value <= 0 || !Number.isFinite(value)) {
    alert('Enter a valid expense name and amount.');
    return;
  }

  const newExpense = {
    id: Date.now(),
    name: expenseName.trim(),
    amount: value,
    date: new Date().toLocaleDateString(),
  };

  const { data, error } = await supabase
  .from('expenses')
  .insert({
    name: newExpense.name,
    amount: newExpense.amount,
    expense_date: new Date().toISOString().slice(0, 10)
  })
  .select()
  .single();

if (error) {
  alert(error.message);
  return;
}

setExpenses(previousExpenses => [data, ...previousExpenses]);

  setExpenseName('');
  setExpenseAmount('');
}
async function editExpense(expense) {
  const updatedName = window.prompt(
    'Expense name:',
    expense.name
  );

  if (updatedName === null) return;

  if (!updatedName.trim()) {
    alert('Enter an expense name.');
    return;
  }

  const updatedAmount = window.prompt(
    'Expense amount:',
    String(expense.amount)
  );

  if (updatedAmount === null) return;

  const value = Number(updatedAmount);

  if (!Number.isFinite(value) || value <= 0) {
    alert('Enter a valid amount.');
    return;
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({
      name: updatedName.trim(),
      amount: value
    })
    .eq('id', expense.id)
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setExpenses(previousExpenses =>
    previousExpenses.map(item =>
      item.id === expense.id
        ? {
            ...data,
            amount: Number(data.amount),
            date: new Date(
              `${data.expense_date}T00:00:00`
            ).toLocaleDateString()
          }
        : item
    )
  );

  alert('Expense updated successfully.');
}

async function deleteExpense(expenseId) {
  const confirmed = window.confirm(
    'Are you sure you want to delete this expense?'
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    alert(error.message);
    return;
  }

  setExpenses(previousExpenses =>
    previousExpenses.filter(expense => expense.id !== expenseId)
  );

  alert('Expense deleted successfully.');
}
async function addCustomer(e) {
  e.preventDefault();

  if (!customerName.trim()) {
    alert('Enter a customer name.');
    return;
  }

  const newCustomer = {
    id: Date.now(),
    name: customerName.trim(),
    phone: customerPhone.trim(),
    totalSpent: 0
  };

  const { data, error } = await supabase
  .from('customers')
  .insert({
    name: newCustomer.name,
    phone: newCustomer.phone,
    total_spent: 0
  })
  .select()
  .single();

if (error) {
  alert(error.message);
  return;
}

setCustomers(previousCustomers => [
  { ...data, totalSpent: Number(data.total_spent) },
  ...previousCustomers
]);

  setCustomerName('');
  setCustomerPhone('');
}
async function editCustomer(customer) {
  const updatedName = window.prompt(
    'Customer name:',
    customer.name
  );

  if (updatedName === null) return;

  if (!updatedName.trim()) {
    alert('Customer name cannot be empty.');
    return;
  }

  const updatedPhone = window.prompt(
    'Customer phone:',
    customer.phone || ''
  );

  if (updatedPhone === null) return;

  const { data, error } = await supabase
    .from('customers')
    .update({
      name: updatedName.trim(),
      phone: updatedPhone.trim()
    })
    .eq('id', customer.id)
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setCustomers(previousCustomers =>
    previousCustomers.map(item =>
      item.id === customer.id
        ? {
            ...data,
            totalSpent: Number(data.total_spent || 0)
          }
        : item
    )
  );

  alert('Customer updated successfully.');
}

async function deleteCustomer(customerId) {
  const confirmed = window.confirm(
    'Are you sure you want to delete this customer?'
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  if (error) {
    alert(error.message);
    return;
  }

  setCustomers(previousCustomers =>
    previousCustomers.filter(customer => customer.id !== customerId)
  );

  alert('Customer deleted successfully.');
}
async function saveProduct(e) {
  e.preventDefault();

  if (
    !productName.trim() ||
    productPrice === '' ||
    productQuantity === '' ||
    Number(productPrice) <= 0 ||
    Number(productQuantity) < 0
  ) {
    return;
  }

  if (editingId !== null) {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: productName.trim(),
      price: Number(productPrice),
      quantity: Number(productQuantity)
    })
    .eq('id', editingId)
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setProducts(previous =>
    previous.map(product =>
      product.id === editingId ? data : product
    )
  );
} else {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: productName.trim(),
      price: Number(productPrice),
      quantity: Number(productQuantity)
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setProducts(previous => [...previous, data]);
}

  clearProductForm();
}

function editProduct(product) {
  setEditingId(product.id);
  setProductName(product.name);
  setProductPrice(String(product.price));
  setProductQuantity(String(product.quantity));
}

async function deleteProduct(id) {
 if (window.confirm('Are you sure you want to delete this product?')) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    alert(error.message);
    return;
  }

  setProducts(products.filter(product => product.id !== id));

    if (editingId === id) {
      clearProductForm();
    }
  }
}

function clearProductForm() {
  setEditingId(null);
  setProductName('');
  setProductPrice('');
  setProductQuantity('');
}

  const menuItems = [
    ['Dashboard', '▦'],
    ['Sales', '🛒'],
    ['Inventory', '📦'],
    ['Customers', '👥'],
    ['Expenses', '💰'],
    ['Reports', '📊'],
    ['Settings', '⚙️']
  ];
if (authLoading) {
  return <p>Loading MauzoMate...</p>;
}

if (!user) {
  return <Auth onLogin={setUser} />;
}
  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">Mauzo<span>Mate</span></h2>
        <p className="tagline">YOUR BUSINESS PARTNER</p>

        <nav>
          {menuItems.map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${activeSection === name ? 'active' : ''}`}
              onClick={() => setActiveSection(name)}
            >
              {icon} {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <p>Built for Kenyan businesses 🇰🇪</p>
        </div>
      </aside>

      <main className="main">
        {activeSection === 'Dashboard' ? (
          <>
            <header className="topbar">
              <div>
                <h1>Dashboard</h1>
                <p>Welcome to your business overview.</p>
                
              </div>
              <div className="profile">M</div>
            </header>
<button onClick={handleLogout}>
  Logout
</button>
<button onClick={exportData}>
  Download Backup
</button>
            <section className="welcome">
              <div>
                <h2>Welcome to MauzoMate 👋</h2>
                <p>Manage your business smarter, every day.</p>
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <p>Today's Sales</p>
<h2>KSh {todaySales.toLocaleString('en-KE')}</h2>
                <span>Sales recorded today</span>
              </div>

              <div className="stat-card">
               <p>Today's Transactions</p>
<h2>{sales.filter(sale => sale.date === currentDate).length}</h2>
<span>Transactions recorded today</span>
</div>

              <div className="stat-card">
                <p>Total Products</p>
<h2>{products.length}</h2>
<span>Products in your inventory</span>
</div>
<div className="stat-card">
  <p>Estimated Profit Today</p>
  <h2>KSh {todayProfit.toLocaleString('en-KE')}</h2>
  <span>Today's sales minus expenses</span>
</div>
            </section>

            <section className="content-grid">
              <div className="panel">
                <h2>Record a Sale</h2>
                <p className="muted">Enter a new customer purchase.</p>

                <form onSubmit={addSale}>
<select
  value={description}
  onChange={e => setDescription(e.target.value)}
  required
>
  <option value="">Select a product</option>
  {products.map(product => (
    <option key={product.id} value={product.name}>
      {product.name} — KSh {product.price} (Stock: {product.quantity})
    </option>
  ))}
</select><select
  value={selectedCustomerId}
  onChange={e => setSelectedCustomerId(e.target.value)}
>
  <option value="">Select a customer (optional)</option>
  {customers.map(customer => (
    <option key={customer.id} value={customer.id}>
      {customer.name}
    </option>
  ))}
</select>
                 
                  <label>Quantity Sold</label>
<input
  type="number"
  min="1"
  step="1"
  placeholder="e.g. 4"
  value={quantitySold}
  onChange={e => setQuantitySold(e.target.value)}
  required
/>
                  

                  <button type="submit">+ Record Sale</button>
                </form>
              </div>

              <div className="panel">
                <h2>Recent Transactions</h2>
                <p className="muted">Your latest recorded sales.</p>

                {sales.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">🧾</div>
                    <p>No sales recorded yet.</p>
                    <span>Your transactions will appear here.</span>
                  </div>
                ) : (
                  <div className="transactions">
                    {sales.map(sale => (
                      <div className="transaction" key={sale.id}>
                        <div>
                          <strong>{sale.description}</strong>
                          <p>{sale.date}</p>
                        </div>
                        <strong className="sale-amount">
                          + KSh {sale.amount.toLocaleString('en-KE')}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
                   <section className="panel">
  <h2>Low Stock Alerts</h2>
  <p className="muted">Products that need restocking.</p>

  {lowStockProducts.length === 0 ? (
    <p>All products have sufficient stock.</p>
  ) : (
    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Remaining Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {lowStockProducts.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.quantity}</td>
              <td>Low Stock</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
              <section className="panel">
  <h2>Sales Trend</h2>
  <p className="muted">Track your daily sales performance.</p>

  {salesByDate.length === 0 ? (
    <p>No sales data available yet.</p>
  ) : (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
  data={salesByDate}
  margin={{ top: 15, right: 20, left: 15, bottom: 5 }}
>
      <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => `KSh ${value}`} />
        <Tooltip
          formatter={(value) => [
            `KSh ${Number(value).toLocaleString('en-KE')}`,
            'Revenue'
          ]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#16a34a"
          dot={{ r: 5, fill: '#16a34a' }}
          strokeWidth={4}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )}
</section> </>
        ) : activeSection === 'Sales' ? (
          <>
            <header className="topbar">
              <div>
                <h1>Sales History</h1>
                <p>Track all your business transactions.</p>
              </div>
              <div className="profile">M</div>
            </header>

            <section className="stats">
              <div className="stat-card">
                <p>Total Transactions</p>
                <h2>{sales.length}</h2>
                <span>Recorded sales</span>
              </div>

              <div className="stat-card">
                <p>Total Revenue</p>
                <h2>KSh {totalSales.toLocaleString('en-KE')}</h2>
                <span>All recorded sales</span>
              </div>

              <div className="stat-card">
                <p>Today's Sales</p>
                <h2>
                  KSh {sales
                    .filter(sale => sale.date === new Date().toLocaleDateString())
                    .reduce((total, sale) => total + sale.amount, 0)
                    .toLocaleString('en-KE')}
                </h2>
                <span>Revenue today</span>
              </div>
            </section>

            <section className="panel">
              <h2>Transaction History</h2>
              <p className="muted">A record of your shop's sales.</p>

              {sales.length === 0 ? (
                <div className="empty">
                  <p>No transactions recorded yet.</p>
                </div>
              ) : (
                <div className="inventory-table-wrapper">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th>Date</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map(sale => (
                        <tr key={sale.id}>
                          <td>{sale.description}</td>
                          <td>{sale.quantity ?? 1}</td>
                          <td>
                            KSh {(sale.unitPrice ?? sale.amount).toLocaleString('en-KE')}
                          </td>
                          <td>
                            KSh {sale.amount.toLocaleString('en-KE')}
                          </td>
                          <td>{sale.date}</td>
                          <td>{sale.time || 'Earlier sale'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
      ) : activeSection === 'Customers' ? (
  <div className="page-content">
    <h2>Customer Management</h2>
    <p>Manage your business customers.</p>

    <div className="form-card">
      <h3>Add New Customer</h3>

      <form onSubmit={addCustomer}>
        <label>Customer Name</label>
        <input
          type="text"
          placeholder="Enter customer name"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          required
        />

        <label>Phone Number</label>
        <input
          type="tel"
          placeholder="Enter phone number"
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
        />

        <button type="submit">+ Add Customer</button>
      </form>
    </div>

    <div className="table-card">
      <h3>Customer List</h3>

      {customers.length === 0 ? (
        <p>No customers added yet.</p>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Spent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.phone || 'Not provided'}</td>
                  <td>KSh {customer.totalSpent.toLocaleString('en-KE')}</td>
                  <td>
  <button onClick={() => editCustomer(customer)}>
    Edit
  </button>
  <button onClick={() => deleteCustomer(customer.id)}>
    Delete
  </button>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
) : activeSection === 'Expenses' ? (
  <div className="page-content">
    <h2>Expenses Management</h2>
    <p>Track money spent by your business.</p>

    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Expenses</h3>
        <h2>KSh {totalExpenses.toLocaleString()}</h2>
      </div>

      <div className="stat-card">
        <h3>Estimated Profit</h3>
        <h2>KSh {estimatedProfit.toLocaleString()}</h2>
      </div>
    </div>
    <div className="form-card">
      <h3>Record an Expense</h3>
      <form onSubmit={addExpense}>
        <label>Expense Description</label>
        <input
          type="text"
          placeholder="e.g. Electricity"
          value={expenseName}
          onChange={e => setExpenseName(e.target.value)}
          required
        />

        <label>Amount (KSh)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="e.g. 1500"
          value={expenseAmount}
          onChange={e => setExpenseAmount(e.target.value)}
          required
        />

        <button type="submit">Save Expense</button>
      </form>
    </div>

    <div className="table-card">
      <h3>Expense History</h3>

      {expenses.length === 0 ? (
        <p>No expenses recorded yet.</p>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>{expense.name}</td>
                  <td>KSh {expense.amount.toLocaleString()}</td>
                  <td>{expense.date}</td>
                  <td>
  <button onClick={() => editExpense(expense)}>
    Edit
  </button>
  <button onClick={() => deleteExpense(expense.id)}>
    Delete
  </button>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>  
      ) : activeSection === 'Reports' ? (
  <div className="page-content">
    <h2>Business Reports</h2>
   <p>Understand how your business is performing.</p>

<div className="stats-grid">
  <div className="stat-card">
    <h3>Total Revenue</h3>
    <div className="stat-card">
  <h3>Sales This Month</h3>
  <h2>KSh {monthlySales.toLocaleString('en-KE')}</h2>
  <span>Revenue for the current month</span>
</div>
    <h2>KSh {totalSales.toLocaleString('en-KE')}</h2>
  </div>

  <div className="stat-card">
    <h3>Total Expenses</h3>
    <h2>KSh {totalExpenses.toLocaleString('en-KE')}</h2>
  </div>

  <div className="stat-card">
    <h3>Estimated Profit</h3>
    <h2>KSh {estimatedProfit.toLocaleString('en-KE')}</h2>
  </div>

  <div className="stat-card">
    <h3>Transactions</h3>
    <h2>{sales.length}</h2>
  </div>

  <div className="stat-card">
    <h3>Average Sale</h3>
    <h2>
      KSh {sales.length
        ? Math.round(totalSales / sales.length).toLocaleString('en-KE')
        : 0}
    </h2>
  </div>

  <div className="stat-card">
    <h3>Products in Inventory</h3>
    <h2>{products.length}</h2>
  </div>
</div>

<div className="table-card">
  <h3>Best-Selling Products</h3>

  {bestSellingProducts.length === 0 ? (
    <p>No sales recorded yet.</p>
  ) : (
    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity Sold</th>
            <th>Current Stock</th>
          </tr>
        </thead>
        <tbody>
          {bestSellingProducts.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.quantitySold}</td>
              <td>{product.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
<div className="table-card">
  <h3>Sales Performance</h3>
  <p>Daily revenue from your recorded sales.</p>

  {salesByDate.length === 0 ? (
    <p>No sales data available yet.</p>
  ) : (
    <div>
      {salesByDate.map(day => (
        <div key={day.date} style={{ marginBottom: '15px' }}>
          <p>
            {day.date} — KSh {day.revenue.toLocaleString('en-KE')}
          </p>

          <div style={{
            background: '#e5e7eb',
            height: '14px',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(day.revenue / highestDailySales) * 100}%`,
              background: '#2563eb',
              height: '100%',
              borderRadius: '8px'
            }} />
          </div>
        </div>
      ))}
    </div>
  )}
</div>
</div> 

) : activeSection === 'Inventory' ? (
          <>
            <header className="topbar">
              <div>
                <h1>Inventory</h1>
                <p>Manage the products in your shop.</p>
              </div>
              <div className="profile">M</div>
            </header>

            <section className="stats">
              <div className="stat-card">
                <p>Total Products</p>
                <h2>{products.length}</h2>
                <span>Products registered</span>
              </div>

              <div className="stat-card">
                <p>Total Stock Units</p>
                <h2>
                  {products.reduce((total, product) => total + product.quantity, 0)}
                </h2>
                <span>Units available</span>
              </div>

              <div className="stat-card">
                <p>Low Stock</p>
                <h2>{lowStockProducts.length}</h2>
                <span>Products needing attention</span>
              </div>
            </section>

            <section className="panel inventory-form">
              <h2>{editingId !== null ? 'Edit Product' : 'Add New Product'}</h2>
              <p className="muted">Enter your product details below.</p>

              <form onSubmit={saveProduct}>
                <label>Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sugar"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  required
                />

                <label>Selling Price (KSh)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 150"
                  value={productPrice}
                  onChange={e => setProductPrice(e.target.value)}
                  required
                />

                <label>Quantity in Stock</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 20"
                  value={productQuantity}
                  onChange={e => setProductQuantity(e.target.value)}
                  required
                />

                <button type="submit">
                  {editingId !== null ? 'Save Changes' : '+ Add Product'}
                </button>

                {editingId !== null && (
                  <button type="button" onClick={clearProductForm}>
                    Cancel Editing
                  </button>
                )}
              </form>
            </section>

            <section className="panel inventory-list">
              <h2>Your Products</h2>
              <p className="muted">View and manage your shop inventory.</p>

              {products.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📦</div>
                  <p>No products added yet.</p>
                  <span>Add your first product using the form above.</span>
                </div>
              ) : (
                <div className="inventory-table-wrapper">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Stock Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(product => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>
                            KSh {product.price.toLocaleString('en-KE')}
                          </td>
                          <td>{product.quantity}</td>
                          <td>
                            {product.quantity === 0 ? (
                              <span className="stock-status out">Out of Stock</span>
                            ) : product.quantity <= 5 ? (
                              <span className="stock-status low">Low Stock</span>
                            ) : (
                              <span className="stock-status good">In Stock</span>
                            )}
                          </td>
                          <td>
                            <div className="inventory-actions">
                              <button
                                type="button"
                                onClick={() => editProduct(product)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProduct(product.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                <h1>{activeSection}</h1>
                <p>Welcome to your MauzoMate {activeSection.toLowerCase()} section.</p>
              </div>
              <div className="profile">
  <span>👤</span>
</div>
            </header>

            <section className="panel">
              <h2>{activeSection} Management</h2>
              <p className="muted">
                This section is ready for development.
              </p>
              <p>We'll build its features step by step.</p>
            </section>
          </>
        )}

        <footer>
          © 2026 MauzoMate. Made for Kenyan businesses.
        </footer>
      </main>
    </div>
  );
}

export default App;
