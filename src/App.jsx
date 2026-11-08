
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
import { useRef } from 'react';
function App() {
  const [user, setUser] = useState(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
const [employeePermissionsForUser, setEmployeePermissionsForUser] = useState({});
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
const [branchesLoading, setBranchesLoading] = useState(false);
const [branchName, setBranchName] = useState('');
const [branchAddress, setBranchAddress] = useState('');
const [branchPhone, setBranchPhone] = useState('');
const [employeesLoading, setEmployeesLoading] = useState(false);
const [employeeName, setEmployeeName] = useState('');
const [employeeEmail, setEmployeeEmail] = useState('');
const [employeeRole, setEmployeeRole] = useState('cashier');
const [employeePermissions, setEmployeePermissions] = useState({
  dashboard: true,
  sales: false,
  inventory: false,
  customers: false,
  suppliers: false,
  expenses: false,
  reports: false,
  employees: false,
  branches: false,
  business_settings: false
});
const [employeeBranch, setEmployeeBranch] = useState('');
const [invitingEmployee, setInvitingEmployee] = useState(false);
 const [isRecoveryMode, setIsRecoveryMode] = useState(false); 
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [recoveryPassword, setRecoveryPassword] = useState('');
const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('');
const fileInputRef = useRef(null);
async function handlePasswordChange() {
  if (!user) {
  alert('Your session has expired. Please sign in again.');
  return;
}
  if (!newPassword || !confirmPassword) {
    alert('Please fill in both password fields.');
    return;
  }

  if (newPassword.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) {
    alert(error.message);
    return;
  }

  alert('Password updated successfully!');

  setNewPassword('');
  setConfirmPassword('');
}
async function handleRecoveryPasswordChange() {
  if (recoveryPassword.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }

  if (recoveryPassword !== confirmRecoveryPassword) {
    alert('Passwords do not match.');
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: recoveryPassword
  });

  if (error) {
    alert(error.message);
    return;
  }

  setRecoveryPassword('');
  setConfirmRecoveryPassword('');
  setIsRecoveryMode(false);

  alert('Password reset successfully! Please sign in with your new password.');
  await supabase.auth.signOut();
}
  async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
  }
  }

  async function uploadProfilePhoto(event) {
  const file = event.target.files?.[0];

  if (!file || !user) return;

  setPhotoLoading(true);

  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(`${user.id}/profile.jpg`, file, {
      upsert: true,
      contentType: file.type
    });

  if (error) {
    alert(error.message);
  } else {
    const { data } = await supabase.storage
      .from('profile-photos')
      .createSignedUrl(`${user.id}/profile.jpg`, 3600);

    setProfilePhotoUrl(data?.signedUrl || '');
    alert('Profile photo updated successfully.');
  }

  setPhotoLoading(false);
  event.target.value = '';
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
    if (!user) {
      setCustomers([]);
      return;
    }

    try {
      let ownerId = user.id;

      // Check whether this user is an employee
      const { data: membership, error: memberError } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;
const { data: ownedBusiness, error: ownerError } = await supabase
  .from('businesses')
  .select('id')
  .eq('owner_id', user.id)
  .maybeSingle();

if (ownerError) {
  console.error('Owner check error:', ownerError.message);
  return;
}

if (ownedBusiness) {
  setIsEmployee(false);
  setEmployeePermissionsForUser({});
  return;
}
      // If employee, retrieve the business owner's ID
      if (membership) {
        const { data: business, error: businessError } = await supabase
  .from('businesses')
  .select('owner_id')
  .eq('id', membership.business_id)
  .maybeSingle();

       if (businessError) throw businessError;

if (!business) {
  throw new Error('The employee business record could not be found.');
}

ownerId = business.owner_id;

if (!ownerId) {
  throw new Error('The business owner ID is missing.');
}
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(
        (data || []).map(customer => ({
          ...customer,
          totalSpent: Number(customer.total_spent || 0)
        }))
      );
    } catch (error) {
      console.error('Customer loading error:', error.message);
      alert(error.message);
    }
  }

  loadCustomers();
}, [user]);
 
useEffect(() => {
  async function loadSuppliers() {
    if (!user) return;

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setSuppliers(data || []);
    }
  }

  loadSuppliers();
}, [user]);

useEffect(() => {
  async function loadEmployees() {
    if (!user) {
      setEmployees([]);
      return;
    }

    setEmployeesLoading(true);

    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (businessError) throw businessError;

      const { data, error } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error) {
      console.error('Employee loading error:', error.message);
    } finally {
      setEmployeesLoading(false);
    }
  }

  loadEmployees();
}, [user]);

async function inviteEmployee(e) {
  e.preventDefault();

  if (!employeeName.trim() || !employeeEmail.trim()) {
    alert('Enter the employee name and email.');
    return;
  }

  if (!user) {
    alert('Please sign in again.');
    return;
  }

  setInvitingEmployee(true);

  try {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError) throw businessError;

    let { data, error } = await supabase
  .from('business_members')
  .select('*')
  .eq('business_id', business.id)
  .eq('email', employeeEmail.trim().toLowerCase())
  .maybeSingle();

if (error) throw error;

if (data) {
  if (data.status !== 'pending' || data.user_id) {
    throw new Error('This email already belongs to an active or linked employee.');
  }

  const { data: updatedMember, error: updateError } = await supabase
    .from('business_members')
    .update({
      full_name: employeeName.trim(),
      role: employeeRole,
      branch_id: employeeBranch || null,
      permissions: employeeRole === 'custom'
  ? employeePermissions
  : employeeRole === 'manager'
    ? {
        dashboard: true,
        sales: true,
        inventory: true,
        customers: true,
        suppliers: true,
        expenses: true,
        reports: true
      }
    : employeeRole === 'cashier'
      ? {
          dashboard: true,
          sales: true,
          customers: true
        }
      : employeeRole === 'stock_manager'
        ? {
            dashboard: true,
            inventory: true,
            suppliers: true
          }
        : employeeRole === 'accountant'
          ? {
              dashboard: true,
              sales: true,
              expenses: true,
              reports: true
            }
          : {}
    })
    .eq('id', data.id)
    .select()
    .single();

  if (updateError) throw updateError;
  data = updatedMember;
} else {
  const { data: newMember, error: insertError } = await supabase
    .from('business_members')
    .insert({
      business_id: business.id,
      full_name: employeeName.trim(),
      email: employeeEmail.trim().toLowerCase(),
      role: employeeRole,
      branch_id: employeeBranch || null,
      status: 'pending',
      permissions: employeeRole === 'custom' ? employeePermissions : {}
    })
    .select()
    .single();

  if (insertError) throw insertError;
  data = newMember;
}

// Send the actual invitation email
const { data: invitationResult, error: invitationError } =
  await supabase.functions.invoke('invite-employee', {
    body: {
  email: employeeEmail.trim().toLowerCase()
}
  });

if (invitationError) {
  let details = invitationError.message;

  if (invitationError.context) {
    try {
      const response = await invitationError.context.clone().text();
      if (response) details += ' — ' + response;
    } catch {}
  }

  throw new Error(details);
}

if (invitationResult?.error) {
  throw new Error(invitationResult.error);
}

setEmployees(previous => [data, ...previous]);
    setEmployeeName('');
    setEmployeeEmail('');
    setEmployeeRole('cashier');
setEmployeeBranch('');
setEmployeePermissions({
  dashboard: true,
  sales: false,
  inventory: false,
  customers: false,
  suppliers: false,
  expenses: false,
  reports: false,
  employees: false,
  branches: false,
  business_settings: false
});
    alert('Employee record created successfully!');
  } catch (error) {
    alert('Could not add employee: ' + error.message);
  } finally {
    setInvitingEmployee(false);
  }
}

useEffect(() => {
  async function loadBranches() {
    if (!user) {
      setBranches([]);
      return;
    }

    setBranchesLoading(true);

    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (businessError) throw businessError;

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setBranches(data || []);
    } catch (error) {
      console.error('Branch loading error:', error.message);
    } finally {
      setBranchesLoading(false);
    }
  }

  loadBranches();
}, [user]);

async function addBranch(e) {
  e.preventDefault();

  if (!user || !branchName.trim()) {
    alert('Enter a branch name.');
    return;
  }

  try {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError) throw businessError;

    const { data, error } = await supabase
      .from('branches')
      .insert({
        business_id: business.id,
        branch_name: branchName.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        is_default: false
      })
      .select()
      .single();

    if (error) throw error;

    setBranches(previous => [...previous, data]);
    setBranchName('');
    setBranchAddress('');
    setBranchPhone('');

    alert('Branch created successfully!');
  } catch (error) {
    alert('Could not create branch: ' + error.message);
  }
}
useEffect(() => {
  async function loadBusinessSettings() {
    if (!user) return;

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (error || !data) {
  console.error(
    'Business settings loading error:',
    error?.message || 'No business found for this user.'
  );
  return;
}

    setBusinessName(data.business_name || '');
    setBusinessType(data.business_type || '');
    setBusinessPhone(data.phone || '');
    setBusinessEmail(data.email || '');
    setBusinessAddress(data.address || '');
    setTaxPin(data.tax_pin || '');
  }

  loadBusinessSettings();
}, [user]);
async function saveBusinessSettings(e) {
  e.preventDefault();

  if (!user) {
    alert('Please sign in again.');
    return;
  }

  if (!businessName.trim()) {
    alert('Enter your business name.');
    return;
  }

  setBusinessSaving(true);

  try {
    const { error } = await supabase
      .from('businesses')
      .update({
        business_name: businessName.trim(),
        business_type: businessType,
        phone: businessPhone.trim(),
        email: businessEmail.trim(),
        address: businessAddress.trim(),
        tax_pin: taxPin.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('owner_id', user.id);

    if (error) throw error;

    alert('Business settings saved successfully!');
  } catch (error) {
    alert('Could not save business settings: ' + error.message);
  } finally {
    setBusinessSaving(false);
  }
}
const [authLoading, setAuthLoading] = useState(true);
const [photoLoading, setPhotoLoading] = useState(false);
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    setAuthLoading(false);
  });

  const { data: { subscription } } =
    supabase.auth.onAuthStateChange((event, session) => {
     
  const authType = new URLSearchParams(
  window.location.hash.substring(1)
).get('type');

if (event === 'PASSWORD_RECOVERY' || authType === 'invite') {
  setIsRecoveryMode(true);
}
  setUser(session?.user ?? null);
  setAuthLoading(false);
});

  return () => subscription.unsubscribe();
}, []);
useEffect(() => {
  async function checkEmployeeRole() {
    if (!user) {
      setIsEmployee(false);
      setEmployeePermissionsForUser({});
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);

    try {
      const { data: membership, error } = await supabase
        .from('business_members')
        .select('business_id, role, permissions, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const { data: ownedBusiness, error: ownerError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownerError) throw ownerError;

      if (ownedBusiness) {
        setIsEmployee(false);
        setEmployeePermissionsForUser({});
        return;
      }

      setIsEmployee(!!membership);
      setEmployeePermissionsForUser(
        membership?.permissions || {}
      );

    } catch (error) {
      console.error('Employee role check error:', error.message);
      setIsEmployee(false);
      setEmployeePermissionsForUser({});
    } finally {
      setRoleLoading(false);
    }
  }

  checkEmployeeRole();
}, [user]);
useEffect(() => {
  async function loadProfilePhoto() {
    if (!user) {
      setProfilePhotoUrl('');
      return;
    }

    const { data } = await supabase.storage
      .from('profile-photos')
      .createSignedUrl(`${user.id}/profile.jpg`, 3600);

    setProfilePhotoUrl(data?.signedUrl || '');
  }

  loadProfilePhoto();
}, [user]);
 const [sales, setSales] = useState([]);
  const [amount, setAmount] = useState('');
  const [quantitySold, setQuantitySold] = useState('1');
  const [description, setDescription] = useState('');
  const [activeSection, setActiveSection] = useState('Dashboard');
  useEffect(() => {
  if (roleLoading || !isEmployee) return;

  const permissionKey = activeSection
    .toLowerCase()
    .replace(' ', '_');

  if (
    activeSection !== 'Settings' &&
    !employeePermissionsForUser[permissionKey]
  ) {
    setActiveSection('Dashboard');
  }
}, [
  roleLoading,
  isEmployee,
  activeSection,
  employeePermissionsForUser
]);
const [expenses, setExpenses] = useState([]);
const [expenseName, setExpenseName] = useState('');
const [expenseAmount, setExpenseAmount] = useState('');const [businessName, setBusinessName] = useState(
  
  () => localStorage.getItem('mauzomate-business-name') || ''
);
const [businessPhone, setBusinessPhone] = useState(
  () => localStorage.getItem('mauzomate-business-phone') || ''
);
const [businessType, setBusinessType] = useState('');
const [businessEmail, setBusinessEmail] = useState('');
const [businessAddress, setBusinessAddress] = useState('');
const [taxPin, setTaxPin] = useState('');
const [businessSaving, setBusinessSaving] = useState(false);
const [currency, setCurrency] = useState(
  () => localStorage.getItem('mauzomate-currency') || 'KES'
);
const [darkMode, setDarkMode] = useState(
  () => localStorage.getItem('mauzomate-dark-mode') === 'true'
);
const [notifications, setNotifications] = useState(
  () => localStorage.getItem('mauzomate-notifications') === 'true'
);
const [customers, setCustomers] = useState([]);
const [suppliers, setSuppliers] = useState([]);
const [customerName, setCustomerName] = useState('');
const [supplierName, setSupplierName] = useState('');
const [supplierPhone, setSupplierPhone] = useState('');
const [supplierEmail, setSupplierEmail] = useState('');
const [supplierAddress, setSupplierAddress] = useState('');
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

const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const lowStockProducts = products.filter(
  product => Number(product.quantity) <= lowStockThreshold
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
async function exportData() {
  try {
    const { data: branchesData, error: branchesError } = await supabase
      .from('branches')
      .select('*');

    if (branchesError) throw branchesError;

    const { data: settingsData, error: settingsError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybesingle();

    if (settingsError) throw settingsError;

    const { data: employeesData, error: employeesError } = await supabase
      .from('business_members')
      .select('*')
      .eq('business_id', settingsData.id);

    if (employeesError) throw employeesError;

    const backup = {
      exportDate: new Date().toISOString(),
      products,
      customers,
      suppliers,
      sales,
      expenses,
      branches: branchesData || [],
      businessSettings: settingsData,
      employees: employeesData || []
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `MauzoMate-Backup-${new Date().toISOString().slice(0, 10)}.json`;

    link.click();
    URL.revokeObjectURL(url);

    alert('Complete business backup downloaded successfully!');
  } catch (error) {
    console.error('Backup error:', error);
    alert('Backup failed: ' + error.message);
  }
}

async function handleRestoreBackup(e) {
  const file = e.target.files?.[0];

  if (!file) return;

  try {
    if (!user?.id) {
      throw new Error('Please sign in first.');
    }

    const fileContent = await file.text();
    const backup = JSON.parse(fileContent);

    const requiredSections = [
      'products',
      'customers',
      'suppliers',
      'sales',
      'expenses',
      'branches',
      'businessSettings',
      'employees'
    ];

    for (const section of requiredSections) {
      if (!Object.prototype.hasOwnProperty.call(backup, section)) {
        throw new Error(`Backup is missing ${section}.`);
      }
    }

    if (
      !backup.businessSettings ||
      backup.businessSettings.owner_id !== user.id
    ) {
      throw new Error('This backup does not belong to your account.');
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .single();

    if (businessError) throw businessError;

    if (
      business.id !== backup.businessSettings.id ||
      business.owner_id !== user.id
    ) {
      throw new Error('Business verification failed. No records imported.');
    }

    const arraySections = [
      'products',
      'customers',
      'suppliers',
      'sales',
      'expenses',
      'branches',
      'employees'
    ];

    for (const section of arraySections) {
      if (!Array.isArray(backup[section])) {
        throw new Error(`${section} must be an array.`);
      }
    }

    const ownerSections = [
      'products',
      'customers',
      'suppliers',
      'sales',
      'expenses'
    ];

    for (const section of ownerSections) {
      const valid = backup[section].every(
        record => record.owner_id === user.id
      );

      if (!valid) {
        throw new Error(
          `Ownership verification failed for ${section}.`
        );
      }
    }

    if (
      !backup.branches.every(
        branch => branch.business_id === business.id
      )
    ) {
      throw new Error('Branch ownership verification failed.');
    }

    const importSection = async (table, records) => {
      if (!records.length) return;

      const { error } = await supabase
        .from(table)
        .upsert(records, {
          onConflict: 'id',
          ignoreDuplicates: true
        });

      if (error) throw error;
    };

    const products = backup.products.map(item => ({
      id: item.id,
      owner_id: item.owner_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      quantity_sold: item.quantity_sold,
      created_at: item.created_at
    }));

    const customers = backup.customers.map(item => ({
      id: item.id,
      owner_id: item.owner_id,
      name: item.name,
      phone: item.phone,
      total_spent: item.total_spent,
      created_at: item.created_at
    }));

    const suppliers = backup.suppliers.map(item => ({
      id: item.id,
      owner_id: item.owner_id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      address: item.address,
      created_at: item.created_at
    }));

    const expenses = backup.expenses.map(item => ({
      id: item.id,
      owner_id: item.owner_id,
      name: item.name,
      amount: item.amount,
      expense_date: item.expense_date,
      created_at: item.created_at
    }));

    const branches = backup.branches.map(item => ({
      id: item.id,
      business_id: item.business_id,
      branch_name: item.branch_name,
      address: item.address,
      phone: item.phone,
      is_default: item.is_default,
      created_at: item.created_at
    }));

    const sales = backup.sales.map(item => ({
      id: item.id,
      owner_id: item.owner_id,
      product_id: item.product_id,
      customer_id: item.customer_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount,
      sale_date: item.sale_date,
      sale_time: item.sale_time,
      created_at: item.created_at
    }));

    // Import parent records before sales.
    await importSection('products', products);
    await importSection('customers', customers);
    await importSection('suppliers', suppliers);
    await importSection('expenses', expenses);
    await importSection('branches', branches);
    await importSection('sales', sales);

    alert(
      'Safe merge completed!\n\n' +
      'Products checked: ' + products.length + '\n' +
      'Customers checked: ' + customers.length + '\n' +
      'Suppliers checked: ' + suppliers.length + '\n' +
      'Expenses checked: ' + expenses.length + '\n' +
      'Branches checked: ' + branches.length + '\n' +
      'Sales checked: ' + sales.length + '\n\n' +
      'Existing UUIDs were skipped. Employees and business settings were not changed.'
    );

  } catch (error) {
    console.error('Restore error:', error);

    alert(
      'Restore stopped: ' + error.message +
      '\n\nIf an earlier section was already imported, its records were not rolled back. Retrying is safe for matching UUIDs.'
    );

  } finally {
    e.target.value = '';
  }
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

async function addSupplier(e) {
  e.preventDefault();

  if (!supplierName.trim()) {
    alert('Enter a supplier name.');
    return;
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: supplierName.trim(),
      phone: supplierPhone.trim(),
      email: supplierEmail.trim(),
      address: supplierAddress.trim()
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setSuppliers(previous => [data, ...previous]);

  setSupplierName('');
  setSupplierPhone('');
  setSupplierEmail('');
  setSupplierAddress('');

  alert('Supplier added successfully!');
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
async function restockProduct(product) {
  const input = window.prompt(
    `How many units of ${product.name} are you adding?`
  );

  if (input === null) return;

  const amount = Number(input);

  if (!Number.isInteger(amount) || amount <= 0) {
    alert('Please enter a valid positive whole number.');
    return;
  }

  const newQuantity = Number(product.quantity) + amount;

  const { data, error } = await supabase.rpc('restock_product', {
  p_product_id: product.id,
  p_amount: amount
});
  if (error) {
    alert(error.message);
    return;
  }

  setProducts(previous =>
    previous.map(item =>
      item.id === product.id ? data : item
    )
  );

  alert('Stock updated successfully!');
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
  ['Suppliers', '🏢'],
  ['Expenses', '💰'],
  ['Reports', '📊'],
  ['Employees', '👤'],
  ['Branches', '🏬'],
  ['Business Settings', '⚙️'],
  ['Settings', '🔧']
];
if (authLoading) {
  return <p>Loading MauzoMate...</p>;
}

if (isRecoveryMode) {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Set Your Password</h2>
        <p>Create a password for your MauzoMate employee account.</p>

        <input
          type="password"
          placeholder="New password"
          value={recoveryPassword}
          onChange={e => setRecoveryPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmRecoveryPassword}
          onChange={e => setConfirmRecoveryPassword(e.target.value)}
        />

        <button onClick={handleRecoveryPasswordChange}>
          Set Password
        </button>
      </div>
    </div>
  );
}

if (!user) {
  return <Auth onLogin={setUser} />;
}

return (
  <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <aside className="sidebar">
        <h2 className="logo">Mauzo<span>Mate</span></h2>
        <p className="tagline">YOUR BUSINESS PARTNER</p>

        <nav>
  {roleLoading ? (
    <p>Loading permissions...</p>
  ) : (
    menuItems
      .filter(([name]) => {
        if (!isEmployee) return true;

        const permissionKey = name
          .toLowerCase()
          .replace(' ', '_');

        if (name === 'Settings') return true;

        return !!employeePermissionsForUser[permissionKey];
      })
      .map(([name, icon]) => (
        <button
          key={name}
          className={`nav-item ${activeSection === name ? 'active' : ''}`}
          onClick={() => {
            setActiveSection(name);
          }}
        >
          {icon} {name}
        </button>
      ))
  )}
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
                <h1>{businessName || 'MauzoMate'} Dashboard</h1>
                <p>Welcome to your business overview.</p>
                
              </div>
              <div className="profile">
  <img
    src={profilePhotoUrl || 'https://placehold.co/100x100?text=M'}
    alt="Profile"
    className="profile-photo"
    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
  />

  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    ref={fileInputRef}
    onChange={uploadProfilePhoto}
    style={{ display: 'none' }}
  />

  {profileMenuOpen && (
    <div className="profile-menu">
      <button onClick={() => {
  setActiveSection('Settings');
  setProfileMenuOpen(false);
}}>
  👤 My Profile & Settings
</button>

<button onClick={() => {
  fileInputRef.current.click();
  setProfileMenuOpen(false);
}}>
  📷 Change Profile Photo
</button>

<button onClick={() => {
  exportData();
  setProfileMenuOpen(false);
}}>
  💾 Download Backup
</button>

<button onClick={() => {
  const input = document.getElementById('restoreBackupInput');
  input.value = '';
  input.click();
}}>
  ♻️ Restore Backup
</button>

<input
  id="restoreBackupInput"
  type="file"
  accept=".json,application/json"
  style={{ display: 'none' }}
  onChange={(e) => {
  
  handleRestoreBackup(e);
}}
/>
<button onClick={() => {
  setActiveSection('Settings');
  setProfileMenuOpen(false);
}}>
  🔒 Account & Security
</button>

<button onClick={handleLogout}>
  ↪ Log Out
</button>

     
    </div>
  )}
</div>
</header>

            <section className="welcome">
              <div>
                <h2>Welcome to MauzoMate 👋</h2>
                <p>Manage your business smarter, every day.</p>
              </div>
            </section>

            <section className="stats">
              <div className="stat-card">
                <p>Today's Sales</p>
<h2>
  {currency} {todaySales.toLocaleString()}
</h2>
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
  <h2>{currency} {todayProfit.toLocaleString()}</h2>
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
      {product.name} — {currency} {product.price} (Stock: {product.quantity})
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
                          + {currency} {Number(sale.amount).toLocaleString()}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
                   <section className="panel">
  <h2>Low Stock Alerts</h2>
  <div className="setting-row">
  <label>Alert me when stock reaches:</label>
  <input
    type="number"
    min="0"
    value={lowStockThreshold}
    onChange={e => setLowStockThreshold(Number(e.target.value))}
  />
</div>
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
<th>Action</th>
          </tr>
        </thead>
        <tbody>
          {lowStockProducts.map(product => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.quantity}</td>
            <td>
  <span className={
    Number(product.quantity) === 0
      ? 'stock-status out-of-stock'
      : Number(product.quantity) <= 2
      ? 'stock-status critical-stock'
      : 'stock-status low-stock'
  }>
    {Number(product.quantity) === 0
      ? 'Out of Stock'
      : Number(product.quantity) <= 2
      ? 'Critical Stock'
      : 'Low Stock'}
  </span>
</td>
<td>
  <button
    type="button"
    onClick={() => restockProduct(product)}
  >
    Restock
  </button>
</td>
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
        <YAxis tickFormatter={(value) => `${currency} ${value}`} />
        <Tooltip
          formatter={(value) => [
           `${currency} ${Number(value).toLocaleString()}`,
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
                        </section>
          </>
        ) : activeSection === 'Sales' ? (
          <>
            <header className="topbar">
              <div>
                <h1>Sales History</h1>
                <p>Track all your business transactions.</p>
              </div>
              <div className="profile">
  <img
    src={profilePhotoUrl || 'https://placehold.co/100x100?text=M'}
    alt="Profile"
    className="profile-photo"
    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
  />
</div>
            </header>

            <section className="stats">
              <div className="stat-card">
                <p>Total Transactions</p>
                <h2>{sales.length}</h2>
                <span>Recorded sales</span>
              </div>

              <div className="stat-card">
                <p>Total Revenue</p>
                <h2>{currency} {totalSales.toLocaleString()}</h2>
                <span>All recorded sales</span>
              </div>

              <div className="stat-card">
                <p>Today's Sales</p>
                <h2>
                  {currency} {sales
  .filter(sale => sale.date === new Date().toLocaleDateString())
  .reduce((total, sale) => total + Number(sale.amount), 0)
  .toLocaleString()}
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
                 <table className="inventory-table history-table"> 
                    <thead>
  <tr>
    <th>#</th>
    <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th>Date</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale, index) => (
                        <tr key={sale.id}>
                          <td>{index + 1}</td>
                          <td>{sale.description}</td>
                          <td>{sale.quantity ?? 1}</td>
                          <td>
                            {currency} {Number(sale.unitPrice ?? sale.amount).toLocaleString()}
                          </td>
                          <td>
                            {currency} {Number(sale.amount).toLocaleString()}
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
  <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '15px' }}>
    <div className="profile">
      <img
        src={profilePhotoUrl || 'https://placehold.co/100x100?text=M'}
        alt="Profile"
        className="profile-photo"
      />
    </div>
  </div>

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
  <th>#</th>
  <th>Name</th>
                <th>Phone</th>
                <th>Total Spent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr key={customer.id}>
                  <td>{index + 1}</td>
                  <td>{customer.name}</td>
                  <td>{customer.phone || 'Not provided'}</td>
                  <td>{currency} {Number(customer.totalSpent).toLocaleString()}</td>
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
  ) : activeSection === 'Suppliers' ? (
  <div className="page-content">
    <h2>Supplier Management</h2>
    <p>Manage your business suppliers.</p>
    <div className="form-card">
  <h3>Add New Supplier</h3>

<form onSubmit={addSupplier}>
  <label>Supplier Name</label>
  <input
    type="text"
    placeholder="Enter supplier name"
    value={supplierName}
    onChange={e => setSupplierName(e.target.value)}
    required
  />

  <label>Phone Number</label>
  <input
    type="tel"
    placeholder="Enter supplier phone number"
    value={supplierPhone}
    onChange={e => setSupplierPhone(e.target.value)}
  />

  <label>Email Address</label>
  <input
    type="email"
    placeholder="Enter supplier email"
    value={supplierEmail}
    onChange={e => setSupplierEmail(e.target.value)}
  />

  <label>Supplier Address</label>
  <textarea
    placeholder="Enter supplier address"
    value={supplierAddress}
    onChange={e => setSupplierAddress(e.target.value)}
  />

  <button type="submit">+ Add Supplier</button>
</form>
</div>

<div className="table-card">
  <h3>Supplier List</h3>

  {suppliers.length === 0 ? (
    <p>No suppliers added yet.</p>
  ) : (
    <table className="inventory-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Address</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map(supplier => (
          <tr key={supplier.id}>
            <td>{supplier.name}</td>
            <td>{supplier.phone}</td>
            <td>{supplier.email}</td>
            <td>{supplier.address}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>
  </div>
) : activeSection === 'Expenses' ? (
  <div className="page-content">
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '15px' }}>
  <div className="profile">
    <img
      src={profilePhotoUrl || 'https://placehold.co/100x100?text=M'}
      alt="Profile"
      className="profile-photo"
    />
  </div>
</div>
    <h2>Expenses Management</h2>
    <p>Track money spent by your business.</p>

    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Expenses</h3>
        <h2>{currency} {totalExpenses.toLocaleString()}</h2>
      </div>

      <div className="stat-card">
        <h3>Estimated Profit</h3>
        <h2>{currency} {estimatedProfit.toLocaleString()}</h2>
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

        <label>Amount ({currency})</label>
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
         <table className="inventory-table history-table">
            <thead>
              <tr>
  <th>#</th>
  <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
  <tr key={expense.id}>
    <td>{index + 1}</td>
    <td>{expense.name}</td>
                  <td>{currency} {Number(expense.amount).toLocaleString()}</td>
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
    <h2>{currency} {totalSales.toLocaleString()}</h2>
    <span>Revenue from all sales</span>
  </div>

  <div className="stat-card">
    <h3>Sales This Month</h3>
    <h2>{currency} {monthlySales.toLocaleString()}</h2>
    <span>Revenue for the current month</span>
  </div>
      <div className="stat-card">
    <h3>Total Expenses</h3>
    <h2>{currency} {totalExpenses.toLocaleString()}</h2>
  </div>
  <div className="stat-card">
    <h3>Estimated Profit</h3>
    <h2>{currency} {estimatedProfit.toLocaleString()}</h2>
  </div>

  <div className="stat-card">
    <h3>Transactions</h3>
    <h2>{sales.length}</h2>
  </div>

  <div className="stat-card">
    <h3>Average Sale</h3>
    <h2>
      {currency} {sales.length
  ? Math.round(totalSales / sales.length).toLocaleString()
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
            {day.date} — {currency} {day.revenue.toLocaleString()}
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
              <div className="profile">
  <img
    src={profilePhotoUrl || 'https://placehold.co/100x100?text=M'}
    alt="Profile"
    className="profile-photo"
    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
  />
</div>
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

                <label>Selling Price ({currency})</label>
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
                           {currency} {Number(product.price).toLocaleString()}
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
                <img
                  src={profilePhotoUrl || 'https://placehold.co/100x100?text=M'}
                  alt="Profile"
                  className="profile-photo"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                />

                {profileMenuOpen && (
                  <div className="profile-menu">
                  <button onClick={() => {
  setActiveSection('Settings');
  setProfileMenuOpen(false);
}}>
  👤 My Profile & Settings
</button>

<button onClick={() => {
  fileInputRef.current.click();
  setProfileMenuOpen(false);
}}>
  📷 Change Profile Photo
</button>

<button onClick={() => {
  exportData();
  setProfileMenuOpen(false);
}}>
  💾 Download Backup
</button>

<button onClick={() => {
  setProfileMenuOpen(false);
}}>
  🔒 Account & Security
</button>

<button onClick={handleLogout}>
  ↪ Log Out
</button>  
                  </div>
                )}
              </div>
            </header>

          {activeSection === 'Employees' ? (
  <section className="panel">
    <h2>Employee Management</h2>
    <p>Manage your business team and employee access.</p>
<div className="form-card">
  <h3>Invite Employee</h3>

  <form onSubmit={inviteEmployee}>
    <label>Full Name</label>
    <input
      type="text"
      placeholder="Employee full name"
      value={employeeName}
      onChange={e => setEmployeeName(e.target.value)}
      required
    />

    <label>Email Address</label>
    <input
      type="email"
      placeholder="Employee email address"
      value={employeeEmail}
      onChange={e => setEmployeeEmail(e.target.value)}
      required
    />

    <label>Employee Role</label>
    <select
      value={employeeRole}
      onChange={e => setEmployeeRole(e.target.value)}
    >
      <option value="manager">Manager</option>
      <option value="cashier">Cashier</option>
      <option value="stock_manager">Stock Manager</option>
      <option value="accountant">Accountant</option>
      <option value="custom">Custom Permissions</option>
    </select>
<label>Assign Branch</label>
<select
  value={employeeBranch}
  onChange={e => setEmployeeBranch(e.target.value)}
>
  <option value="">All branches</option>
  {branches.map(branch => (
    <option key={branch.id} value={branch.id}>
      {branch.branch_name}
    </option>
  ))}
</select>
{employeeRole === 'custom' && (
  <div className="form-card">
    <h3>Custom Employee Permissions</h3>
    <p>Select the sections this employee can access.</p>

    {[
      ['dashboard', 'Dashboard'],
      ['sales', 'Sales'],
      ['inventory', 'Inventory'],
      ['customers', 'Customers'],
      ['suppliers', 'Suppliers'],
      ['expenses', 'Expenses'],
      ['reports', 'Reports'],
      ['employees', 'Employees'],
      ['branches', 'Branches'],
      ['business_settings', 'Business Settings']
    ].map(([key, label]) => (
      <label key={key}>
        <input
          type="checkbox"
          checked={!!employeePermissions[key]}
          onChange={e =>
            setEmployeePermissions(previous => ({
              ...previous,
              [key]: e.target.checked
            }))
          }
        />
        {label}
      </label>
    ))}
  </div>
)}
    <button type="submit" disabled={invitingEmployee}>
      {invitingEmployee ? 'Preparing invitation...' : 'Invite Employee'}
    </button>
  </form>
</div>
    <div className="form-card">
      <h3>Team Members</h3>

      {employeesLoading ? (
        <p>Loading employees...</p>
      ) : employees.filter(employee => employee.role !== 'owner').length === 0 ? (
        <p>No employees added yet.</p>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees
                .filter(employee => employee.role !== 'owner')
                .map(employee => (
                  <tr key={employee.id}>
                    <td>{employee.full_name || 'Not provided'}</td>
                    <td>{employee.email}</td>
                    <td>{employee.role.replace('_', ' ')}</td>
                    <td>{employee.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    <div className="form-card">
      <h3>Employee Roles</h3>
      <ul>
        <li>Manager</li>
        <li>Cashier</li>
        <li>Stock Manager</li>
        <li>Accountant</li>
        <li>Custom Permissions</li>
      </ul>
    </div>
  </section>
) : activeSection === 'Branches' ? (
  <section className="panel">
    <h2>Branch Management</h2>
    <p>Manage your business locations.</p>

    <div className="form-card">
      <h3>Add New Branch</h3>

      <form onSubmit={addBranch}>
        <label>Branch Name</label>
        <input
          type="text"
          placeholder="Enter branch name"
          value={branchName}
          onChange={e => setBranchName(e.target.value)}
          required
        />

        <label>Branch Address</label>
        <input
          type="text"
          placeholder="Enter branch address"
          value={branchAddress}
          onChange={e => setBranchAddress(e.target.value)}
        />

        <label>Phone Number</label>
        <input
          type="tel"
          placeholder="Enter branch phone"
          value={branchPhone}
          onChange={e => setBranchPhone(e.target.value)}
        />

        <button type="submit">+ Add Branch</button>
      </form>
    </div>

    <div className="form-card">
      <h3>Your Branches</h3>

      {branchesLoading ? (
        <p>Loading branches...</p>
      ) : branches.length === 0 ? (
        <p>No branches found.</p>
      ) : (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.id}>
                  <td>{branch.branch_name}</td>
                  <td>{branch.address || 'Not provided'}</td>
                  <td>{branch.phone || 'Not provided'}</td>
                  <td>
                    {branch.is_default ? 'Main Branch' : 'Branch'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </section>

) : activeSection === 'Business Settings' ? (
  <section className="panel">
    <h2>Business Settings</h2>
    <p>Manage your business identity and contact information.</p>

    <div className="form-card">
      <h3>Business Profile</h3>

      <form onSubmit={saveBusinessSettings}>
        <label>Business Name</label>
        <input
          type="text"
          placeholder="Enter business name"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          required
        />

        <label>Business Type</label>
        <select
          value={businessType}
          onChange={e => setBusinessType(e.target.value)}
        >
          <option value="">Select business type</option>
          <option value="Retail Shop">Retail Shop</option>
          <option value="Supermarket">Supermarket</option>
          <option value="Wholesale">Wholesale</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Hardware">Hardware</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Other">Other</option>
        </select>

        <label>Phone Number</label>
        <input
          type="tel"
          placeholder="Business phone number"
          value={businessPhone}
          onChange={e => setBusinessPhone(e.target.value)}
        />

        <label>Business Email</label>
        <input
          type="email"
          placeholder="Business email"
          value={businessEmail}
          onChange={e => setBusinessEmail(e.target.value)}
        />

        <label>Business Address</label>
        <input
          type="text"
          placeholder="Business physical address"
          value={businessAddress}
          onChange={e => setBusinessAddress(e.target.value)}
        />

        <h3>Tax Information</h3>

        <label>KRA PIN</label>
        <input
          type="text"
          placeholder="Enter KRA PIN"
          value={taxPin}
          onChange={e => setTaxPin(e.target.value)}
        />

        <button type="submit" disabled={businessSaving}>
          {businessSaving ? 'Saving...' : 'Save Business Settings'}
        </button>
      </form>
    </div>
  </section>

) : activeSection === 'Settings' ? (
            <section className="panel settings-panel">
              <h2>Settings</h2>
              <p>Manage your MauzoMate preferences and business details.</p>

              <h3 className="settings-heading">Appearance</h3>
              <div className="setting-row">
                <label>Dark Mode</label>
                <button
                  type="button"
                  className={`ios-toggle ${darkMode ? 'active' : ''}`}
                  onClick={() => {
                    const newMode = !darkMode;
                    setDarkMode(newMode);
                    localStorage.setItem('mauzomate-dark-mode', newMode);
                  }}
                  aria-label="Toggle dark mode"
                  aria-pressed={darkMode}
                >
                  <span></span>
                </button>
              </div>

              <h3 className="settings-heading">Notifications</h3>
              <div className="setting-row">
                <label>Notifications</label>
                <button
                  type="button"
                  className={`ios-toggle ${notifications ? 'active' : ''}`}
                  onClick={() => {
                    const newValue = !notifications;
                    setNotifications(newValue);
                    localStorage.setItem('mauzomate-notifications', newValue);
                  }}
                  aria-label="Toggle notifications"
                  aria-pressed={notifications}
                >
                  <span></span>
                </button>
              </div>

              <h3 className="settings-heading">Business Information</h3>
              <label>Business Name</label>
              <input
                type="text"
                placeholder="Enter your business name"
                value={businessName}
                onChange={e => {
                  setBusinessName(e.target.value);
                  localStorage.setItem('mauzomate-business-name', e.target.value);
                }}
              />

              <label>Business Phone Number</label>
              <input
                type="tel"
                placeholder="Enter business phone number"
                value={businessPhone}
                onChange={e => {
                  setBusinessPhone(e.target.value);
                  localStorage.setItem('mauzomate-business-phone', e.target.value);
                }}
              />

              <label>Business Currency</label>
              <select
                value={currency}
                onChange={e => {
                  setCurrency(e.target.value);
                  localStorage.setItem('mauzomate-currency', e.target.value);
                }}
              >
                <option value="KES">Kenyan Shilling (KES)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="UGX">Ugandan Shilling (UGX)</option>
                <option value="TZS">Tanzanian Shilling (TZS)</option>
              </select>

              <h3 className="settings-heading">Account Security</h3>
              <div className="setting-row">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div className="setting-row">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="password-update-btn"
                onClick={handlePasswordChange}
              >
                Update Password
              </button>

              <h3 className="settings-heading">Business Summary</h3>
              <div className="business-summary">
                <h3>Business Profile Summary</h3>
                <p><strong>Business Name:</strong> {businessName || 'Not set'}</p>
                <p><strong>Phone:</strong> {businessPhone || 'Not set'}</p>
                <p><strong>Currency:</strong> {currency}</p>
                <h3>Business Profile Summary</h3>
                <p><strong>Business Name:</strong> {businessName || 'Not set'}</p>
                <p><strong>Phone:</strong> {businessPhone || 'Not set'}</p>
                <p><strong>Currency:</strong> {currency}</p>
              </div>
            </section>

          ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
