
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
const [editingEmployeeId, setEditingEmployeeId] = useState(null);
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
} else {
  setIsEmployee(!!membership);
  setEmployeePermissionsForUser(
    membership?.permissions || {}
  );
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
  async function loadSupplierDocuments() {
    if (!user) {
      setSupplierDocuments([]);
      return;
    }

    const { data, error } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supplier documents loading error:', error.message);
      return;
    }

    setSupplierDocuments(data || []);
  }

  loadSupplierDocuments();
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
  .maybeSingle();

if (businessError) throw businessError;

if (!business) {
  setEmployees([]);
  return;
}

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

    const rolePermissions = {
      manager: {
        dashboard: true,
        sales: true,
        inventory: true,
        customers: true,
        suppliers: true,
        expenses: true,
        reports: true
      },
      cashier: {
        dashboard: true,
        sales: true,
        customers: true
      },
      stock_manager: {
        dashboard: true,
        inventory: true,
        suppliers: true
      },
      accountant: {
        dashboard: true,
        sales: true,
        expenses: true,
        reports: true
      },
      custom: employeePermissions
    };

    const permissions = rolePermissions[employeeRole] || {};

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
          permissions
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
          permissions
        })
        .select()
        .single();

      if (insertError) throw insertError;
      data = newMember;
    }

    const { data: invitationResult, error: invitationError } =
      await supabase.functions.invoke('invite-employee', {
        body: {
          email: employeeEmail.trim().toLowerCase()
        }
      });

    if (invitationError) throw invitationError;

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

    alert('Employee invitation sent successfully!');

  } catch (error) {
    alert('Could not add employee: ' + error.message);
  } finally {
    setInvitingEmployee(false);
  }
}

function editEmployee(employee) {
  setEditingEmployeeId(employee.id);
  setEmployeeName(employee.full_name || '');
  setEmployeeEmail(employee.email || '');
  setEmployeeRole(employee.role || 'cashier');
  setEmployeeBranch(employee.branch_id || '');

  setEmployeePermissions({
    dashboard: false,
    sales: false,
    inventory: false,
    customers: false,
    suppliers: false,
    expenses: false,
    reports: false,
    employees: false,
    branches: false,
    business_settings: false,
    ...(employee.permissions || {})
  });
}

async function updateEmployee(e) {
  e.preventDefault();

  if (!employeeName.trim()) {
    alert('Please enter the employee name.');
    return;
  }

  try {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError) throw businessError;

    const { error } = await supabase
      .from('business_members')
      .update({
        full_name: employeeName.trim(),
        role: employeeRole,
        branch_id: employeeBranch || null,
        permissions: employeeRole === 'custom'
          ? employeePermissions
          : {}
      })
      .eq('id', editingEmployeeId)
      .eq('business_id', business.id);

    if (error) throw error;

    setEmployees(previous =>
      previous.map(employee =>
        employee.id === editingEmployeeId
          ? {
              ...employee,
              full_name: employeeName.trim(),
              role: employeeRole,
              branch_id: employeeBranch || null,
              permissions: employeePermissions
            }
          : employee
      )
    );

    setEditingEmployeeId(null);
    setEmployeeName('');
    setEmployeeEmail('');
    setEmployeeRole('cashier');
    setEmployeeBranch('');

  } catch (error) {
    alert('Could not update employee: ' + error.message);
  }
}

async function deleteEmployee(employeeId) {
  const confirmed = window.confirm(
    'Are you sure you want to deactivate this employee?'
  );

  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from('business_members')
      .update({ status: 'inactive' })
      .eq('id', employeeId);

    if (error) throw error;

    setEmployees(previous =>
      previous.filter(employee => employee.id !== employeeId)
    );

  } catch (error) {
    alert('Could not deactivate employee: ' + error.message);
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
        .maybeSingle();

      if (businessError) throw businessError;

      if (!business) {
        setBranches([]);
        return;
      }

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
  .maybeSingle();

if (businessError) throw businessError;

if (!business) {
  setEmployees([]);
  return;
}

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
    if (!user || roleLoading || isEmployee) return;

    const { data, error } = await supabase
      .from('businesses')
.select('*')
.eq('owner_id', user.id)
.maybeSingle();

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
}, [user, isEmployee, roleLoading]);
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
  setRoleLoading(true);
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
setRoleLoading(true);
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

const { data, error } = await supabase.storage
  .from('profile-photos')
  .createSignedUrl(`${user.id}/profile.jpg`, 3600);

if (error) {
  console.error('Profile photo loading error:', error.message);
  setProfilePhotoUrl('');
  return;
}

setProfilePhotoUrl(data?.signedUrl || '');

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
const [expenseDate, setExpenseDate] = useState(
  new Date().toISOString().split('T')[0]
);
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
const [supplierDocuments, setSupplierDocuments] = useState([]);
const [documentSupplier, setDocumentSupplier] = useState('');
const [documentName, setDocumentName] = useState('');
const [documentExpiry, setDocumentExpiry] = useState('');
const [documentNotes, setDocumentNotes] = useState('');
const [documentFile, setDocumentFile] = useState(null);
const [supplierRating, setSupplierRating] = useState(0);
const [supplierReliability, setSupplierReliability] = useState('Not rated');
const [supplierPerformanceNotes, setSupplierPerformanceNotes] = useState('');
const [editingSupplierRatingId, setEditingSupplierRatingId] = useState(null);
const [purchaseOrders, setPurchaseOrders] = useState([]);
const [showPurchaseOrderHistory, setShowPurchaseOrderHistory] = useState(true);
const [supplierPayments, setSupplierPayments] = useState([]);
const [paymentOrderId, setPaymentOrderId] = useState('');
const [paymentAmount, setPaymentAmount] = useState('');
const [paymentDate, setPaymentDate] = useState(
  new Date().toISOString().split('T')[0]
);
const [paymentMethod, setPaymentMethod] = useState('Cash');
const [paymentReference, setPaymentReference] = useState('');
const [paymentNotes, setPaymentNotes] = useState('');
const [selectedSupplierPerformance, setSelectedSupplierPerformance] = useState(null);
const [compareSupplierIds, setCompareSupplierIds] = useState([]);
const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
useEffect(() => {
  async function loadPurchaseOrders() {
    if (!user) {
      setPurchaseOrders([]);
      setPurchaseOrderItems([]);
      return;
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Purchase orders loading error:', error.message);
      return;
    }

    setPurchaseOrders(data || []);

    const orderIds = (data || []).map(order => order.id);

    if (orderIds.length === 0) {
      setPurchaseOrderItems([]);
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*, products(name)')
      .in('purchase_order_id', orderIds);

    if (itemsError) {
      console.error('Purchase order items loading error:', itemsError.message);
      return;
    }

    setPurchaseOrderItems(items || []);
  }

  loadPurchaseOrders();
}, [user]);
useEffect(() => {
  async function loadSupplierPayments() {
    if (!user) {
      setSupplierPayments([]);
      return;
    }

    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('owner_id', user.id)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Supplier payments loading error:', error.message);
      return;
    }

    setSupplierPayments(data || []);
  }

  loadSupplierPayments();
}, [user]);
const [purchaseOrderItems, setPurchaseOrderItems] = useState([]);
const [draftPurchaseItems, setDraftPurchaseItems] = useState([]);
const [purchaseSupplier, setPurchaseSupplier] = useState('');
const [purchaseProduct, setPurchaseProduct] = useState('');
const [purchaseQuantity, setPurchaseQuantity] = useState(1);
const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
const [purchaseNotes, setPurchaseNotes] = useState('');
const [purchaseOrderDate, setPurchaseOrderDate] = useState(
  new Date().toISOString().split('T')[0]
);
const [paymentDueDate, setPaymentDueDate] = useState('');
const [customerName, setCustomerName] = useState('');
const [supplierName, setSupplierName] = useState('');
const [supplierPhone, setSupplierPhone] = useState('');
const [supplierEmail, setSupplierEmail] = useState('');
const [supplierAddress, setSupplierAddress] = useState('');
const [customerPhone, setCustomerPhone] = useState('');
const [selectedCustomerId, setSelectedCustomerId] = useState('');
  // Inventory data
  const [products, setProducts] = useState([]);
const [showRestockList, setShowRestockList] = useState(false);
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
const outOfStockCount = products.filter(
  product => Number(product.quantity) <= 0
).length;

const criticalStockCount = products.filter(
  product => Number(product.quantity) > 0 &&
             Number(product.quantity) <= 2
).length;

const lowStockCount = products.filter(
  product => Number(product.quantity) > 2 &&
             Number(product.quantity) <= lowStockThreshold
).length;

const unitsToRestock = lowStockProducts.reduce(
  (total, product) =>
    total + Math.max(
      lowStockThreshold - Number(product.quantity), 0
    ),
  0
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

  if (!expenseName.trim() || !expenseDate || value <= 0 || !Number.isFinite(value)) {
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
   expense_date: expenseDate
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
  setExpenseDate(new Date().toISOString().split('T')[0]);
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

}
async function editSupplier(supplier) {
  const updatedName = window.prompt(
    'Supplier name:',
    supplier.name
  );

  if (updatedName === null) return;

  if (!updatedName.trim()) {
    alert('Supplier name cannot be empty.');
    return;
  }

  const updatedPhone = window.prompt(
    'Supplier phone:',
    supplier.phone || ''
  );

  if (updatedPhone === null) return;

  const updatedEmail = window.prompt(
    'Supplier email:',
    supplier.email || ''
  );

  if (updatedEmail === null) return;

  const updatedAddress = window.prompt(
    'Supplier address:',
    supplier.address || ''
  );

  if (updatedAddress === null) return;

  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: updatedName.trim(),
      phone: updatedPhone.trim(),
      email: updatedEmail.trim(),
      address: updatedAddress.trim()
    })
    .eq('id', supplier.id)
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setSuppliers(previous =>
    previous.map(item =>
      item.id === supplier.id ? data : item
    )
  );

}
async function deleteSupplier(supplierId) {
  const confirmed = window.confirm(
    'Are you sure you want to delete this supplier?'
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId);

  if (error) {
    alert(error.message);
    return;
  }

  setSuppliers(previous =>
    previous.filter(supplier => supplier.id !== supplierId)
  );

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
function downloadRestockList() {
  if (lowStockProducts.length === 0) {
    alert('There are no products to restock.');
    return;
  }

  const rows = [
    ['Product', 'Current Stock', 'Recommended Order'],
    ...lowStockProducts.map(product => [
      product.name,
      product.quantity,
      Math.max(
        lowStockThreshold - Number(product.quantity),
        0
      )
    ])
  ];

  const csv = rows
    .map(row =>
      row.map(value =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    )
    .join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'MauzoMate-Restock-List.csv';
  link.click();

  URL.revokeObjectURL(url);
}
function addDraftPurchaseItem(e) {
  e.preventDefault();

  const product = products.find(
    item => item.id === purchaseProduct
  );

  if (!product) {
    alert('Please select a product.');
    return;
  }

  const quantity = Number(purchaseQuantity);
  const unitCost = Number(purchaseUnitCost);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    alert('Enter a valid quantity.');
    return;
  }

  if (purchaseUnitCost === '' || !Number.isFinite(unitCost) || unitCost < 0) {
    alert('Enter a valid purchase cost.');
    return;
  }

  setDraftPurchaseItems(previous => [
    ...previous,
    {
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_cost: unitCost,
      subtotal: quantity * unitCost
    }
  ]);

  setPurchaseProduct('');
  setPurchaseQuantity(1);
  setPurchaseUnitCost('');
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
  ['Purchase Orders', '📋'],
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
async function savePurchaseOrder(e) {
 
  e.preventDefault();

  if (!user) {
    alert('Please sign in first.');
    return;
  }

  if (!purchaseSupplier) {
    alert('Please select a supplier.');
    return;
  }

  if (draftPurchaseItems.length === 0) {
    alert('Please add at least one product.');
    return;
  }

  const total = draftPurchaseItems.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );

  try {
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        owner_id: user.id,
        supplier_id: purchaseSupplier,
        order_date: purchaseOrderDate,
        payment_due_date: paymentDueDate || null,
        status: 'pending',
        total_amount: total,
        notes: purchaseNotes
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const items = draftPurchaseItems.map(item => ({
      purchase_order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.subtotal
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(items);

    if (itemsError) {
      await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', order.id);

      throw itemsError;
    }

    setPurchaseOrders(previous => [order, ...previous]);
    setPurchaseOrderItems(previous => [...previous, ...items]);

    setDraftPurchaseItems([]);
    setPurchaseSupplier('');
    setPurchaseNotes('');
    setPurchaseOrderDate(new Date().toISOString().split('T')[0]);
setPaymentDueDate('');
    alert('Purchase order created successfully!');
   } catch (error) {
    alert('Could not create purchase order: ' + error.message);
  }
}

async function recordSupplierPayment(e) {
  e.preventDefault();

  if (!user || !paymentOrderId || !paymentAmount) {
    alert('Please select an order and enter a payment amount.');
    return;
  }

  const order = purchaseOrders.find(
    o => o.id === paymentOrderId
  );

  if (!order) {
    alert('Purchase order not found.');
    return;
  }

  const alreadyPaid = supplierPayments
    .filter(p => p.purchase_order_id === paymentOrderId)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const balance = Number(order.total_amount) - alreadyPaid;
  const amount = Number(paymentAmount);

  if (amount <= 0 || amount > balance) {
    alert(
      `Payment must be greater than zero and no more than ${currency} ${balance.toFixed(2)}.`
    );
    return;
  }

  const { data, error } = await supabase
    .from('supplier_payments')
    .insert({
      owner_id: user.id,
      purchase_order_id: paymentOrderId,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference: paymentReference.trim() || null,
      notes: paymentNotes.trim() || null
    })
    .select()
    .single();

  if (error) {
    alert('Payment could not be saved: ' + error.message);
    return;
  }

  setSupplierPayments(previous => [data, ...previous]);
  setPaymentOrderId('');
  setPaymentAmount('');
  setPaymentReference('');
  setPaymentNotes('');

  alert('Supplier payment recorded successfully!');
}

async function saveSupplierRating(supplierId) {
  e.preventDefault();

  if (!user || !documentSupplier || !documentFile) {
    alert('Please select a supplier and a document.');
    return;
  }

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ];

  if (!allowedTypes.includes(documentFile.type)) {
    alert('Only PDF, JPG and PNG files are allowed.');
    return;
  }

  if (documentFile.size > 10 * 1024 * 1024) {
    alert('File must not exceed 10 MB.');
    return;
  }

  const safeName = documentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${user.id}/${documentSupplier}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('supplier-documents')
    .upload(filePath, documentFile);

  if (uploadError) {
    alert('Document upload failed: ' + uploadError.message);
    return;
  }

  const { data, error } = await supabase
    .from('supplier_documents')
    .insert({
      owner_id: user.id,
      supplier_id: documentSupplier,
      document_name: documentName.trim() || documentFile.name,
      file_path: filePath,
      expiry_date: documentExpiry || null,
      notes: documentNotes.trim() || null
    })
    .select()
    .single();

  if (error) {
    await supabase.storage
      .from('supplier-documents')
      .remove([filePath]);

    alert('Could not save document details: ' + error.message);
    return;
  }

  setSupplierDocuments(previous => [data, ...previous]);
  setDocumentSupplier('');
  setDocumentName('');
  setDocumentExpiry('');
  setDocumentNotes('');
  setDocumentFile(null);

  alert('Supplier document uploaded successfully!');
}
async function openSupplierDocument(document) {
  if (!user || !document.file_path.startsWith(`${user.id}/`)) {
    alert('You are not authorized to open this document.');
    return;
  }

  const { data, error } = await supabase.storage
    .from('supplier-documents')
    .createSignedUrl(document.file_path, 60);

  if (error) {
    alert('Could not open document: ' + error.message);
    return;
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
async function updatePurchaseOrderStatus(order) {
  const newStatus = window.prompt(
    'Enter new status: pending, received, or cancelled',
    order.status
  );

  if (!newStatus) return;

  const status = newStatus.trim().toLowerCase();

  if (!['pending', 'received', 'cancelled'].includes(status)) {
    alert('Invalid status.');
    return;
  }

  if (order.status === 'received' && status !== 'received') {
    alert('A received order cannot be changed to another status.');
    return;
  }

  if (order.status === status) return;

  if (status === 'received') {
  const confirmed = window.confirm(
    'Mark this order as received and add its quantities to inventory? This can only be done once.'
  );

  if (!confirmed) return;

  const { error } = await supabase.rpc('receive_purchase_order', {
    p_order_id: order.id
  });

  if (error) {
    alert('Could not receive order: ' + error.message);
    return;
  }

  setPurchaseOrders(previous =>
    previous.map(item =>
      item.id === order.id
        ? { ...item, status: 'received', stock_applied: true }
        : item
    )
  );

  if (selectedPurchaseOrder?.id === order.id) {
    setSelectedPurchaseOrder(previous => ({
      ...previous,
      status: 'received',
      stock_applied: true
    }));
  }

  alert('Order received! Inventory has been updated.');
  return;
}
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', order.id);

  if (error) {
    alert('Could not update order: ' + error.message);
    return;
  }

  setPurchaseOrders(previous =>
    previous.map(item =>
      item.id === order.id ? { ...item, status } : item
    )
  );

  if (selectedPurchaseOrder?.id === order.id) {
    setSelectedPurchaseOrder(previous => ({ ...previous, status }));
  }

  alert('Purchase order status updated.');
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
<section className="stats stock-intelligence">
  <div className="stat-card">
    <p>Out of Stock</p>
    <h2>{outOfStockCount}</h2>
    <span>Products unavailable</span>
  </div>

  <div className="stat-card">
    <p>Critical Stock</p>
    <h2>{criticalStockCount}</h2>
    <span>Only 1–2 units remaining</span>
  </div>

  <div className="stat-card">
    <p>Low Stock</p>
    <h2>{lowStockCount}</h2>
    <span>Products needing attention</span>
  </div>

  <div className="stat-card">
    <p>Units to Restock</p>
    <h2>{unitsToRestock}</h2>
    <span>To reach your stock threshold</span>
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
  <button
  className="stock-restock-list-button"
  type="button"
  onClick={() => setShowRestockList(!showRestockList)}
>
  📋 {showRestockList ? 'Hide Restock List' : 'Prepare Restock List'}
</button>
<button
  type="button"
  className="stock-restock-list-button"
  onClick={downloadRestockList}
  style={{ marginLeft: '10px' }}
>
  📥 Download Restock List
</button>
{showRestockList && (
  <div className="stock-restock-list">
    <h3>📋 Recommended Restocking List</h3>

    {lowStockProducts.length === 0 ? (
      <p>No products currently need restocking.</p>
    ) : (
      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Recommended Order</th>
            </tr>
          </thead>

          <tbody>
            {lowStockProducts.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.quantity}</td>
                <td>
                  <strong>
                    {Math.max(
                      lowStockThreshold - Number(product.quantity),
                      0
                    )} units
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
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
    <th>No.</th>
    <th>Product</th>
<th>Remaining Stock</th>
<th>Status</th>
<th>Recommended Order</th>
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
  <span className="stock-recommendation">
  {Math.max(
    lowStockThreshold - Number(product.quantity), 0
  )} units
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
  ) : activeSection === 'Purchase Orders' ? (
  <div className="page-content">
    <h2>📋 Supplier Purchase Orders</h2>
    <p>Create and manage orders from your suppliers.</p>

    <div className="supplier-payment-alerts">
  <h3>🔔 Supplier Payment Reminders</h3>

  {purchaseOrders
    .filter(order => {
      if (!order.payment_due_date || order.status === 'cancelled') {
        return false;
      }

      const paid = supplierPayments
        .filter(p => p.purchase_order_id === order.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return Number(order.total_amount) - paid > 0;
    })
    .map(order => {
      const paid = supplierPayments
        .filter(p => p.purchase_order_id === order.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const balance = Number(order.total_amount) - paid;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDate = new Date(
        `${order.payment_due_date}T00:00:00`
      );

      const daysLeft = Math.round(
        (dueDate - today) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 7) return null;

      return (
        <div
          key={order.id}
          className={
            daysLeft < 0
              ? 'payment-overdue'
              : 'payment-due-soon'
          }
        >
          <strong>
            {daysLeft < 0 ? '⚠️ OVERDUE' : '📅 DUE SOON'}
          </strong>

          <p>
            Supplier: {
              suppliers.find(s => s.id === order.supplier_id)?.name
              || 'Unknown Supplier'
            }
          </p>

          <p>
            Due Date: {order.payment_due_date}
          </p>

          <p>
            Outstanding: {currency} {balance.toLocaleString()}
          </p>

          <p>
            {daysLeft < 0
              ? `${Math.abs(daysLeft)} days overdue`
              : daysLeft === 0
              ? 'Due today'
              : `Due in ${daysLeft} days`}
          </p>
        </div>
      );
    })}

  {!purchaseOrders.some(order => {
    if (!order.payment_due_date || order.status === 'cancelled') {
      return false;
    }

    const paid = supplierPayments
      .filter(p => p.purchase_order_id === order.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const daysLeft = Math.round(
      (
        new Date(`${order.payment_due_date}T00:00:00`) -
        new Date(new Date().setHours(0, 0, 0, 0))
      ) / (1000 * 60 * 60 * 24)
    );

    return Number(order.total_amount) - paid > 0 && daysLeft <= 7;
  }) && (
    <p>No upcoming or overdue supplier payments. 🎉</p>
  )}
</div>
<div className="supplier-financial-health">
  <h3>💹 Supplier Financial Health</h3>
  <p>Monitor outstanding supplier obligations.</p>

  <div className="stats">
    <div className="stat-card">
      <h3>Overdue Suppliers</h3>
      <h2>
        {new Set(
          purchaseOrders
            .filter(order => {
              if (!order.payment_due_date || order.status === 'cancelled') return false;

              const paid = supplierPayments
                .filter(p => p.purchase_order_id === order.id)
                .reduce((sum, p) => sum + Number(p.amount), 0);

              const daysLeft = Math.round(
                (new Date(`${order.payment_due_date}T00:00:00`) -
                  new Date(new Date().setHours(0, 0, 0, 0))) /
                  86400000
              );

              return daysLeft < 0 &&
                Number(order.total_amount) - paid > 0;
            })
            .map(order => order.supplier_id)
        ).size}
      </h2>
    </div>

    <div className="stat-card">
      <h3>Upcoming Payments</h3>
      <h2>
        {purchaseOrders.filter(order => {
          if (!order.payment_due_date || order.status === 'cancelled') return false;

          const paid = supplierPayments
            .filter(p => p.purchase_order_id === order.id)
            .reduce((sum, p) => sum + Number(p.amount), 0);

          const daysLeft = Math.round(
            (new Date(`${order.payment_due_date}T00:00:00`) -
              new Date(new Date().setHours(0, 0, 0, 0))) /
              86400000
          );

          return daysLeft >= 0 &&
            daysLeft <= 7 &&
            Number(order.total_amount) - paid > 0;
        }).length}
      </h2>
    </div>

    <div className="stat-card">
      <h3>Payment Completion</h3>
      <h2>
        {(() => {
          const total = purchaseOrders
            .filter(order => order.status === 'received')
            .reduce((sum, order) => sum + Number(order.total_amount), 0);

          const paid = supplierPayments
            .filter(payment =>
              purchaseOrders.some(
                order =>
                  order.id === payment.purchase_order_id &&
                  order.status === 'received'
              )
            )
            .reduce((sum, payment) => sum + Number(payment.amount), 0);

          return total > 0
            ? `${Math.min(100, (paid / total) * 100).toFixed(1)}%`
            : '0%';
        })()}
      </h2>
    </div>
  </div>
</div>
    <div className="stats supplier-payment-stats">
  <div className="stat-card">
    <h3>Total Supplier Payments</h3>
    <h2>
      {currency}{' '}
      {supplierPayments
        .reduce((sum, payment) => sum + Number(payment.amount), 0)
        .toLocaleString()}
    </h2>
  </div>

  <div className="stat-card">
    <h3>Outstanding Supplier Debt</h3>
    <h2>
      {currency}{' '}
      {purchaseOrders
        .filter(order => order.status === 'received')
        .reduce((sum, order) => {
          const paid = supplierPayments
            .filter(p => p.purchase_order_id === order.id)
            .reduce((total, p) => total + Number(p.amount), 0);

          return sum + Math.max(
            0,
            Number(order.total_amount) - paid
          );
        }, 0)
        .toLocaleString()}
    </h2>
  </div>

  <div className="stat-card">
    <h3>Total Payments Recorded</h3>
    <h2>{supplierPayments.length}</h2>
  </div>
</div>
<div className="supplier-payment-trends">
  <h3>📈 Supplier Payment Trends</h3>
  <p>Track payments made over the last 7 days.</p>

  {Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    const dateKey = date.toISOString().split('T')[0];

    const total = supplierPayments
      .filter(payment => payment.payment_date === dateKey)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const highest = Math.max(
      1,
      ...supplierPayments.map(payment => Number(payment.amount))
    );

    return (
      <div key={dateKey} className="payment-trend-row">
        <div className="payment-trend-label">
          <strong>
            {date.toLocaleDateString('en', {
              weekday: 'short',
              day: 'numeric'
            })}
          </strong>
          <span>
            {currency} {total.toLocaleString()}
          </span>
        </div>

        <div className="payment-trend-track">
          <div
            className="payment-trend-fill"
            style={{
              width: `${(total / highest) * 100}%`
            }}
          />
        </div>
      </div>
    );
  })}
</div>
<div className="form-card">
  <h3>💳 Record Supplier Payment</h3>

  <form onSubmit={recordSupplierPayment}>
    <label>Select Purchase Order</label>
    <select
      value={paymentOrderId}
      onChange={e => setPaymentOrderId(e.target.value)}
      required
    >
      <option value="">Choose a purchase order</option>

      {purchaseOrders
        .filter(order => order.status === 'received')
        .map(order => (
          <option key={order.id} value={order.id}>
            #{order.id.slice(0, 8).toUpperCase()} -
            {' '}{order.suppliers?.name || 'Supplier'} -
            {' '}{currency} {Number(order.total_amount).toLocaleString()}
          </option>
        ))}
    </select>

    <label>Payment Amount</label>
    <input
      type="number"
      min="0.01"
      step="0.01"
      value={paymentAmount}
      onChange={e => setPaymentAmount(e.target.value)}
      placeholder="Enter payment amount"
      required
    />

    <label>Payment Date</label>
    <input
      type="date"
      value={paymentDate}
      onChange={e => setPaymentDate(e.target.value)}
      required
    />

    <label>Payment Method</label>
    <select
      value={paymentMethod}
      onChange={e => setPaymentMethod(e.target.value)}
    >
      <option value="Cash">Cash</option>
      <option value="Bank Transfer">Bank Transfer</option>
      <option value="Mobile Money">Mobile Money</option>
      <option value="Card">Card</option>
      <option value="Other">Other</option>
    </select>

    <label>Payment Reference (optional)</label>
    <input
      type="text"
      value={paymentReference}
      onChange={e => setPaymentReference(e.target.value)}
      placeholder="Transaction reference"
    />

    <label>Notes (optional)</label>
    <textarea
      value={paymentNotes}
      onChange={e => setPaymentNotes(e.target.value)}
      placeholder="Payment notes..."
    />

    <button type="submit">Record Payment</button>
  </form>
</div>
    <div className="form-card">
      <h3>Create New Purchase Order</h3>

      <form onSubmit={savePurchaseOrder}>
        <label>Select Supplier</label>
        <select
          value={purchaseSupplier}
          onChange={e => setPurchaseSupplier(e.target.value)}
          required
        >
          <option value="">Choose a supplier</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>

        <label>Order Date</label>
        <input
          type="date"
          value={purchaseOrderDate}
          onChange={e => setPurchaseOrderDate(e.target.value)}
          required
        />
<label>Payment Due Date</label>
<input
  type="date"
  value={paymentDueDate}
  onChange={e => setPaymentDueDate(e.target.value)}
/>
        <hr />

        <h3>Add Products</h3>

        <label>Select Product</label>
        <select
          value={purchaseProduct}
          onChange={e => setPurchaseProduct(e.target.value)}
        >
          <option value="">Choose a product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <label>Quantity</label>
        <input
          type="number"
          min="1"
          step="1"
          value={purchaseQuantity}
          onChange={e => setPurchaseQuantity(e.target.value)}
        />

        <label>Unit Purchase Cost</label>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter cost per unit"
          value={purchaseUnitCost}
          onChange={e => setPurchaseUnitCost(e.target.value)}
        />

        <button
          type="button"
          onClick={() =>
            addDraftPurchaseItem({ preventDefault: () => {} })
          }
        >
          + Add Product to Order
        </button>

        <div className="table-card">
          <h3>Order Items</h3>

          {draftPurchaseItems.length === 0 ? (
            <p>No products added yet.</p>
          ) : (
            <div className="inventory-table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                    <th>Subtotal</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {draftPurchaseItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>{currency} {item.unit_cost.toLocaleString()}</td>
                      <td>{currency} {item.subtotal.toLocaleString()}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftPurchaseItems(previous =>
                              previous.filter((_, i) => i !== index)
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-card">
  <h3
  onClick={() => setShowPurchaseOrderHistory(!showPurchaseOrderHistory)}
  style={{ cursor: 'pointer' }}
>
  📋 Purchase Order History
  {showPurchaseOrderHistory ? ' ▲' : ' ▼'}
</h3>

  {showPurchaseOrderHistory && (
  purchaseOrders.length === 0 ? (
    <p>No purchase orders found yet.</p>
  ) : (
    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Supplier</th>
            <th>Order Date</th>
            <th>Total</th>
<th>Amount Paid</th>
<th>Outstanding Balance</th>
<th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {purchaseOrders.map((order, index) => (
            <tr key={order.id}>
              <td>{index + 1}</td>
              <td>{order.suppliers?.name || 'Unknown supplier'}</td>
              <td>{order.order_date}</td>

<td>
  {currency} {Number(order.total_amount).toLocaleString()}
</td>

<td>
  {currency}{' '}
  {supplierPayments
    .filter(p => p.purchase_order_id === order.id)
    .reduce((sum, p) => sum + Number(p.amount), 0)
    .toLocaleString()}
</td>

<td>
  {currency}{' '}
  {Math.max(
    0,
    Number(order.total_amount || 0) -
    supplierPayments
      .filter(p => p.purchase_order_id === order.id)
      .reduce((sum, p) => sum + Number(p.amount), 0)
  ).toLocaleString()}
</td>

<td>{order.status}</td>

<td>
  <button
    type="button"
    onClick={() => updatePurchaseOrderStatus(order)}
  >
    Update Status
  </button>

  <button
    type="button"
    onClick={() => setSelectedPurchaseOrder(order)}
  >
    View Details
  </button>
</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
     )
)}
</div>
{selectedPurchaseOrder && (
    <div className="table-card purchase-order-print-area">
    <h3>
      Purchase Order Details
    </h3>

    <p>
      Supplier: {selectedPurchaseOrder.suppliers?.name || 'Unknown supplier'}
    </p>

    <p>Order Date: {selectedPurchaseOrder.order_date}</p>
<p>
  Order Number: {selectedPurchaseOrder.id.slice(0, 8).toUpperCase()}
</p>
    <p>Status: {selectedPurchaseOrder.status}</p>

    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Cost</th>
            <th>Subtotal</th>
          </tr>
        </thead>

        <tbody>
          {purchaseOrderItems
            .filter(item =>
              item.purchase_order_id === selectedPurchaseOrder.id
            )
            .map(item => {
              const product = products.find(
                p => p.id === item.product_id
              );

              return (
                <tr key={item.id}>
                  <td>{product?.name || item.products?.name || 'Unknown product'}</td>
                  <td>{item.quantity}</td>
                  <td>{currency} {Number(item.unit_cost).toLocaleString()}</td>
                  <td>{currency} {Number(item.subtotal).toLocaleString()}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>

    <h3>
      Total: {currency}{' '}
      {Number(selectedPurchaseOrder.total_amount).toLocaleString()}
    </h3>
    <div className="table-card">
  <h3>💳 Payment History</h3>

  {(() => {
    const orderPayments = supplierPayments.filter(
      payment =>
        payment.purchase_order_id === selectedPurchaseOrder.id
    );

    const totalPaid = orderPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const balance = Math.max(
      0,
      Number(selectedPurchaseOrder.total_amount) - totalPaid
    );

    return (
      <>
        <p>
          <strong>Total Paid:</strong> {currency} {totalPaid.toLocaleString()}
        </p>

        <p>
          <strong>Outstanding:</strong> {currency} {balance.toLocaleString()}
        </p>

        {orderPayments.length === 0 ? (
          <p>No payments recorded for this order yet.</p>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                </tr>
              </thead>

              <tbody>
                {orderPayments.map(payment => (
                  <tr key={payment.id}>
                    <td>{payment.payment_date}</td>
                    <td>
                      {currency} {Number(payment.amount).toLocaleString()}
                    </td>
                    <td>{payment.payment_method}</td>
                    <td>{payment.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  })()}
</div>
<button
  type="button"
  onClick={() => window.print()}
>
  🖨️ Print Purchase Order
</button>
    <button
      type="button"
      onClick={() => setSelectedPurchaseOrder(null)}
    >
      Close Details
    </button>
  </div>
)}
        </div>

        <h3>
          Order Total: {currency}{' '}
          {draftPurchaseItems.reduce(
            (sum, item) => sum + item.subtotal,
            0
          ).toLocaleString()}
        </h3>

        <label>Order Notes</label>
        <textarea
          placeholder="Optional notes for this order"
          value={purchaseNotes}
          onChange={e => setPurchaseNotes(e.target.value)}
        />

        <button
          type="submit"
          disabled={draftPurchaseItems.length === 0}
        >
          Create Purchase Order
        </button>
      </form>
    </div>
  </div>
) : activeSection === 'Suppliers' ? (
  <div className="page-content">
    <div className="form-card">
  <h3>📁 Supplier Contracts & Documents</h3>
  <p>Upload and keep track of supplier agreements and documents.</p>

  <form onSubmit={uploadSupplierDocument}>
    <label>Select Supplier</label>
    <select
      value={documentSupplier}
      onChange={e => setDocumentSupplier(e.target.value)}
      required
    >
      <option value="">Choose a supplier</option>
      {suppliers.map(supplier => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name}
        </option>
      ))}
    </select>

    <label>Document Name</label>
    <input
      type="text"
      placeholder="e.g. Supply Agreement"
      value={documentName}
      onChange={e => setDocumentName(e.target.value)}
    />

    <label>Choose File (PDF, JPG or PNG)</label>
    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={e => setDocumentFile(e.target.files[0] || null)}
      required
    />

    <label>Expiry Date (optional)</label>
    <input
      type="date"
      value={documentExpiry}
      onChange={e => setDocumentExpiry(e.target.value)}
    />

    <label>Notes (optional)</label>
    <textarea
      value={documentNotes}
      onChange={e => setDocumentNotes(e.target.value)}
      placeholder="Add document notes..."
    />

    <button type="submit">Upload Supplier Document</button>
  </form>
</div>
<div className="table-card">
  <div className="supplier-document-alerts">
  <h3>⏰ Document Expiry Alerts</h3>

  {(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringDocuments = supplierDocuments.filter(document => {
      if (!document.expiry_date) return false;

      const expiry = new Date(`${document.expiry_date}T00:00:00`);
      const daysLeft = Math.ceil(
        (expiry - today) / (1000 * 60 * 60 * 24)
      );

      return daysLeft <= 30;
    });

    return expiringDocuments.length === 0 ? (
      <p>No documents are expiring within the next 30 days.</p>
    ) : (
      expiringDocuments.map(document => {
        const daysLeft = Math.ceil(
          (
            new Date(`${document.expiry_date}T00:00:00`) - today
          ) / (1000 * 60 * 60 * 24)
        );

        return (
          <div key={document.id} className="supplier-expiry-alert">
            <strong>{document.document_name}</strong>
            <p>
              Supplier: {
                suppliers.find(s => s.id === document.supplier_id)?.name
                || 'Unknown Supplier'
              }
            </p>
            <p>
              {daysLeft < 0
                ? `Expired ${Math.abs(daysLeft)} days ago`
                : daysLeft === 0
                ? 'Expires today'
                : `Expires in ${daysLeft} days`}
            </p>
          </div>
        );
      })
    );
  })()}
</div>
  <h3>Saved Supplier Documents</h3>

  {supplierDocuments.length === 0 ? (
    <p>No supplier documents uploaded yet.</p>
  ) : (
    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Supplier</th>
            <th>Expiry Date</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {supplierDocuments.map(document => (
            <tr key={document.id}>
              <td>{document.document_name}</td>
              <td>
                {suppliers.find(
                  supplier => supplier.id === document.supplier_id
                )?.name || 'Unknown Supplier'}
              </td>
              <td>{document.expiry_date || 'Not specified'}</td>
              <td>{document.notes || '—'}</td>
              <td>
                <button
                  type="button"
                  onClick={() => openSupplierDocument(document)}
                >
                  View Document
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
    <h2>📊 Supplier Performance</h2>
<p>Track supplier activity and purchasing performance.</p>
<div className="table-card">
  <div className="stats">
  <div className="stat-card">
    <h3>Total Supplier Spending</h3>
    <h2>
      {currency}{' '}
      {purchaseOrders
        .filter(order => order.status === 'received')
        .reduce(
          (sum, order) => sum + Number(order.total_amount || 0),
          0
        ).toLocaleString()}
    </h2>
  </div>

  <div className="stat-card">
    <h3>Received Orders</h3>
    <h2>
      {purchaseOrders.filter(
        order => order.status === 'received'
      ).length}
    </h2>
  </div>

  <div className="stat-card">
    <h3>Pending Orders</h3>
    <h2>
      {purchaseOrders.filter(
        order => order.status === 'pending'
      ).length}
    </h2>
  </div>

  <div className="stat-card">
    <h3>Average Supplier Rating</h3>
    <h2>
      {suppliers.length
        ? (
            suppliers.reduce(
              (sum, supplier) =>
                sum + Number(supplier.rating || 0),
              0
            ) / suppliers.length
          ).toFixed(1)
        : '0.0'} / 5 ⭐
    </h2>
  </div>
</div>
<div className="supplier-spending-chart">
  <div className="table-card supplier-alerts">
  <h3>🚨 Supplier Alerts</h3>
  <p>Important supplier performance warnings.</p>

  {suppliers.filter(supplier => {
    const spending = purchaseOrders
      .filter(order =>
        order.supplier_id === supplier.id &&
        order.status === 'received'
      )
      .reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );

    const averageSpending = suppliers.length
      ? purchaseOrders
          .filter(order => order.status === 'received')
          .reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0
          ) / suppliers.length
      : 0;

    return (
      (supplier.rating > 0 && supplier.rating <= 2) ||
      supplier.reliability === 'Unreliable' ||
      (averageSpending > 0 && spending > averageSpending * 1.5)
    );
  }).map(supplier => (
    <div key={supplier.id} className="supplier-alert-item">
      <strong>{supplier.name}</strong>

      {supplier.rating > 0 && supplier.rating <= 2 && (
        <p>⭐ Low supplier rating: {supplier.rating}/5</p>
      )}

      {supplier.reliability === 'Unreliable' && (
        <p>⚠️ Delivery reliability is marked Unreliable.</p>
      )}

      <p>
        {(() => {
          const spending = purchaseOrders
            .filter(order =>
              order.supplier_id === supplier.id &&
              order.status === 'received'
            )
            .reduce(
              (sum, order) => sum + Number(order.total_amount || 0),
              0
            );

          const average = suppliers.length
            ? purchaseOrders
                .filter(order => order.status === 'received')
                .reduce(
                  (sum, order) => sum + Number(order.total_amount || 0),
                  0
                ) / suppliers.length
            : 0;

          return average > 0 && spending > average * 1.5
            ? '💰 Spending is unusually high compared with the supplier average.'
            : null;
        })()}
      </p>
    </div>
  ))}

  {!suppliers.some(supplier =>
    (supplier.rating > 0 && supplier.rating <= 2) ||
    supplier.reliability === 'Unreliable'
  ) && (
    <p>No rating or delivery warnings. Check the spending alerts above.</p>
  )}
</div>
  <h3>📊 Spending by Supplier</h3>
  <p>Compare purchases from each supplier.</p>

  {suppliers.map(supplier => {
    const spending = purchaseOrders
      .filter(
        order =>
          order.supplier_id === supplier.id &&
          order.status === 'received'
      )
      .reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );

    const highestSpending = Math.max(
      1,
      ...suppliers.map(s =>
        purchaseOrders
          .filter(
            order =>
              order.supplier_id === s.id &&
              order.status === 'received'
          )
          .reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0
          )
      )
    );

    return (
      <div key={supplier.id} className="supplier-chart-row">
        <div className="supplier-chart-label">
          <strong>{supplier.name}</strong>
          <span>
            {currency} {spending.toLocaleString()}
          </span>
        </div>

        <div className="supplier-chart-track">
          <div
            className="supplier-chart-fill"
            style={{
              width: `${(spending / highestSpending) * 100}%`
            }}
          />
        </div>
      </div>
    );
  })}
</div>
<div className="table-card">
  <h3>⚖️ Supplier Comparison</h3>
  <p>Select suppliers to compare their performance.</p>

  <div>
    {suppliers.map(supplier => (
      <label key={supplier.id} style={{
        display: 'block',
        margin: '10px 0'
      }}>
        <input
          type="checkbox"
          checked={compareSupplierIds.includes(supplier.id)}
          onChange={e => {
            setCompareSupplierIds(previous =>
              e.target.checked
                ? [...previous, supplier.id]
                : previous.filter(id => id !== supplier.id)
            );
          }}
        />
        {' '}{supplier.name}
      </label>
    ))}
  </div>

  {compareSupplierIds.length > 0 && (
    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Rating</th>
            <th>Reliability</th>
            <th>Received Orders</th>
            <th>Total Spending</th>
          </tr>
        </thead>

        <tbody>
          {suppliers
            .filter(supplier =>
              compareSupplierIds.includes(supplier.id)
            )
            .map(supplier => {
              const orders = purchaseOrders.filter(
                order =>
                  order.supplier_id === supplier.id &&
                  order.status === 'received'
              );

              const spending = orders.reduce(
                (sum, order) =>
                  sum + Number(order.total_amount || 0),
                0
              );

              return (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.rating || 0}/5 ⭐</td>
                  <td>{supplier.reliability || 'Not rated'}</td>
                  <td>{orders.length}</td>
                  <td>
                    {currency} {spending.toLocaleString()}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  )}

 <button
    type="button"
    className="supplier-compare-clear"
    onClick={() => setCompareSupplierIds([])}
  >
    Clear Comparison
</button>
</div>
  <h3>🏆 Supplier Leaderboard</h3>
  <p>Top-performing suppliers ranked automatically.</p>

  {suppliers
    .slice()
    .sort((a, b) => {
      const score = supplier => {
        const reliabilityPoints = {
          Reliable: 5,
          Average: 3,
          Unreliable: 0,
          'Not rated': 0
        };

        const received = purchaseOrders.filter(
          order =>
            order.supplier_id === supplier.id &&
            order.status === 'received'
        ).length;

        return (
          Number(supplier.rating || 0) * 10 +
          (reliabilityPoints[supplier.reliability] || 0) +
          received
        );
      };

      return score(b) - score(a);
    })
    .map((supplier, index) => (
      <div key={supplier.id} className="stat-card">
        <h3>
          {index + 1}. {supplier.name}
          <p>
  <strong>Performance Score:</strong>{' '}
  {Math.min(
    100,
    Number(supplier.rating || 0) * 10 +
    (supplier.reliability === 'Reliable'
      ? 30
      : supplier.reliability === 'Average'
      ? 18
      : 0) +
    Math.min(
      20,
      purchaseOrders.filter(
        order =>
          order.supplier_id === supplier.id &&
          order.status === 'received'
      ).length
    )
  )}/100
</p>
          {index === 0 ? ' 🥇' : ''}
        </h3>

        <p>
          Rating: {supplier.rating > 0
            ? '⭐'.repeat(supplier.rating)
            : 'Not rated'}
        </p>

        <p>
          Reliability: {supplier.reliability || 'Not rated'}
        </p>
      </div>
    ))}
</div>
<div className="stats">
  {suppliers.map(supplier => {
    const supplierOrders = purchaseOrders.filter(
      order => order.supplier_id === supplier.id
    );

    const totalSpent = supplierOrders
      .filter(order => order.status === 'received')
      .reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );

    const pendingOrders = supplierOrders.filter(
      order => order.status === 'pending'
    ).length;

    const receivedOrders = supplierOrders.filter(
      order => order.status === 'received'
    ).length;

    return (
      <div className="stat-card" key={supplier.id}>
        <h3>{supplier.name}</h3>
        <p>Total Orders: {supplierOrders.length}</p>
        <p>
  Rating: {
    supplier.rating > 0
      ? '⭐'.repeat(supplier.rating) + ` (${supplier.rating}/5)`
      : 'Not rated yet'
  }
</p>

<p>
  Reliability: {supplier.reliability || 'Not rated'}
</p>
{(() => {
  const risk =
    supplier.reliability === 'Unreliable' ||
    (supplier.rating > 0 && supplier.rating <= 2)
      ? 'High Risk'
      : supplier.reliability === 'Reliable' &&
        supplier.rating >= 4
      ? 'Low Risk'
      : 'Medium Risk';

  return (
    <p>
      **Supplier Risk:** 
      <strong>{risk}</strong>
    </p>
  );
})()}
{supplier.performance_notes && (
  <p>
    Notes: {supplier.performance_notes}
  </p>
)}
        <p>Received: {receivedOrders}</p>
        <p>Pending: {pendingOrders}</p>
        <h3>{currency} {totalSpent.toLocaleString()}</h3>
        <small>Total Received Purchases</small>
        <button
  type="button"
  className="supplier-history-button"
  onClick={() => {
    setSelectedSupplierPerformance(null);
    setEditingSupplierRatingId(supplier.id);
    setSupplierRating(supplier.rating || 0);
    setSupplierReliability(supplier.reliability || 'Not rated');
    setSupplierPerformanceNotes(supplier.performance_notes || '');
  }}
>
  ⭐ Rate Supplier
</button>
       <button
  type="button"
  className="supplier-history-button"
  onClick={() => setSelectedSupplierPerformance(supplier)}
>
  View Purchase History
</button>
      </div>
    );
  })}
  {selectedSupplierPerformance && (
  <div className="table-card">
    <h3>
      Purchase History: {selectedSupplierPerformance.name}
    </h3>

    {purchaseOrders.filter(
      order => order.supplier_id === selectedSupplierPerformance.id
    ).length === 0 ? (
      <p>No purchase orders for this supplier yet.</p>
    ) : (
      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {purchaseOrders
              .filter(
                order => order.supplier_id === selectedSupplierPerformance.id
              )
              .map((order, index) => (
                <tr key={order.id}>
                  <td>{index + 1}</td>
                  <td>{order.order_date}</td>
                  <td>
                    {currency} {Number(order.total_amount).toLocaleString()}
                  </td>
                  <td>{order.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )}

    <button
  type="button"
  className="supplier-history-button"
  onClick={() => setSelectedSupplierPerformance(null)}
>
  Close History
</button>
  </div>
)}
{editingSupplierRatingId && (
  <div className="form-card">
    <h3>
      Rate Supplier: {
        suppliers.find(s => s.id === editingSupplierRatingId)?.name
      }
    </h3>

    <form onSubmit={e => {
      e.preventDefault();
      saveSupplierRating(editingSupplierRatingId);
    }}>
      <label>Supplier Rating</label>
      <select
        value={supplierRating}
        onChange={e => setSupplierRating(Number(e.target.value))}
      >
        {[0, 1, 2, 3, 4, 5].map(n => (
          <option key={n} value={n}>
            {n === 0 ? 'Not rated' : `${n} Star${n > 1 ? 's' : ''}`}
          </option>
        ))}
      </select>

      <label>Delivery Reliability</label>
      <select
        value={supplierReliability}
        onChange={e => setSupplierReliability(e.target.value)}
      >
        <option value="Not rated">Not rated</option>
        <option value="Reliable">Reliable</option>
        <option value="Average">Average</option>
        <option value="Unreliable">Unreliable</option>
      </select>

      <label>Performance Notes</label>
      <textarea
        value={supplierPerformanceNotes}
        onChange={e => setSupplierPerformanceNotes(e.target.value)}
        placeholder="Write notes about this supplier..."
      />

      <button type="submit">Save Rating</button>
      <button
        type="button"
        onClick={() => setEditingSupplierRatingId(null)}
      >
        Cancel
      </button>
    </form>
  </div>
)}
<button
  type="button"
  className="supplier-history-button"
  onClick={() => setSelectedSupplierPerformance(null)}
>
  Close History
</button>
</div>
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
    <div className="inventory-table-wrapper">
  <table className="inventory-table">
     <thead>
  <tr>
    <th>No.</th>
    <th>Name</th>
    <th>Phone</th>
    <th>Email</th>
    <th>Address</th>
    <th>Actions</th>
  </tr>
</thead>
     <tbody>
  {suppliers.map((supplier, index) => (
    <tr key={supplier.id}>
      <td>{index + 1}</td>
      <td>{supplier.name}</td>
      <td>{supplier.phone}</td>
      <td>{supplier.email}</td>
      <td>{supplier.address}</td>
      <td>
        <div className="inventory-actions">
          <button
            type="button"
            onClick={() => editSupplier(supplier)}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => deleteSupplier(supplier.id)}
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
<label>Expense Date</label>
<input
  type="date"
  value={expenseDate}
  onChange={e => setExpenseDate(e.target.value)}
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
    <th>No.</th>
    <th>Product</th>
    <th>Price</th>
                        <th>Quantity</th>
                        <th>Stock Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                     {products.map((product, index) => (
  <tr key={product.id}>
    <td>{index + 1}</td>
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
  if (fileInputRef.current) {
    fileInputRef.current.click();
  } else {
    console.error('Profile photo input was not found.');
  }

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

  <form onSubmit={editingEmployeeId ? updateEmployee : inviteEmployee}>
    <label>Full Name</label>
    <input
      type="text"
      placeholder="Employee full name"
      value={employeeName}
      onChange={e => setEmployeeName(e.target.value)}
      disabled={!!editingEmployeeId}
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
  {editingEmployeeId
    ? 'Save Changes'
    : invitingEmployee
      ? 'Preparing invitation...'
      : 'Invite Employee'}
</button>
{editingEmployeeId && (
  <button
    type="button"
    onClick={() => {
      setEditingEmployeeId(null);
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
    }}
  >
    Cancel Editing
  </button>
)}
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
    <th>#</th>
    <th>Name</th>
    <th>Email</th>
    <th>Role</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>
</thead>

<tbody>
  {employees
    .filter(employee => employee.role !== 'owner')
    .map((employee, index) => (
      <tr key={employee.id}>
        <td>{index + 1}</td>
        <td>{employee.full_name || 'Not provided'}</td>
        <td>{employee.email}</td>
        <td>{employee.role.replace('_', ' ')}</td>
        <td>{employee.status}</td>
        <td>
  <div className="inventory-actions">
    <button
      type="button"
      onClick={() => {
  console.log('Employee selected:', employee);
  editEmployee(employee);
}}
    >
      Edit
    </button>

    <button
      type="button"
      onClick={() => deleteEmployee(employee.id)}
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
