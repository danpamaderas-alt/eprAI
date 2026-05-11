import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useCrmStore, type Customer } from '../store/useCrmStore'; //
import Swal from 'sweetalert2';

import { ClientFormModal } from '../pages/ClientFormModal';
import { generateGiftMessage, type MessageTone } from '../utils/giftHelper';
import { GiftCardPrintable } from '../components/GiftCardPrintable';

//
const CUSTOMER_TYPES = [
  { id: 'MINORISTA', label: '👤 Minorista / Consumidor', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { id: 'MAYORISTA', label: '🏷️ Mayorista / Revendedor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { id: 'INSTITUCION', label: '🏛️ Institución / Empresa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' }
];

export const CrmDashboard = memo(() => {
  // 🛡️ Extraemos los nuevos poderes del Store consolidado
  const { 
    balances: customers, 
    fetchBalances: fetchCustomers, 
    isLoading,
    updateCustomer,
    deleteCustomer 
  } = useCrmStore(); //
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers(); //
  }, [fetchCustomers]);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditForm({});
  }, []);

  //
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.filter((c: Customer) => {
      const searchLower = searchTerm.toLowerCase();
      const matchText = 
        c.name?.toLowerCase().includes(searchLower) || 
        c.phone?.includes(searchTerm) || 
        c.email?.toLowerCase().includes(searchLower);
      const matchType = filterType === '' || c.type === filterType;
      return matchText && matchType;
    });
  }, [customers, searchTerm, filterType]);

  const handleUpdate = useCallback(async () => {
    if (!editForm.id || !editForm.name?.trim()) return;

    // 🚀 Delegamos al Store: Maneja la DB y actualiza el estado local automáticamente
    const success = await updateCustomer(editForm.id, {
      name: editForm.name.trim(),
      phone: editForm.phone?.trim() || null,
      email: editForm.email?.trim() || null,
      type: editForm.type || 'MINORISTA',
      cuit: editForm.cuit?.trim() || null, 
      address: editForm.address?.trim() || null,
      notes: editForm.notes?.trim() || null,
    }); //

    if (success) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente actualizado', showConfirmButton: false, timer: 1500 });
      closeEditModal();
    }
  }, [editForm, updateCustomer, closeEditModal]);

  const handleDelete = useCallback(async (customer: Customer) => {
    const result = await Swal.fire({
      title: '¿Eliminar Cliente?',
      text: `Se borrará a "${customer.name}". No podrás deshacer esto.`,
      icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#f43f5e', cancelButtonColor: '#64748b', confirmButtonText: 'Sí, eliminar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' }
    });

    if (result.isConfirmed) {
      const success = await deleteCustomer(customer.id); //
      if (success) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente eliminado', showConfirmButton: false, timer: 1500 });
      }
    }
  }, [deleteCustomer]);

  // ... (Mantenemos handleGiftClick, openWhatsApp y renderizado de tabla igual) ...

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ... (Header y Filtros igual) ... */}

      <ClientFormModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)}
        // onSuccess ya no es necesario; el Store es reactivo
      />

      {/* ... (Resto del JSX igual) ... */}
    </div>
  );
});

CrmDashboard.displayName = 'CrmDashboard';