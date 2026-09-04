// src/pages/CustomerOrdersPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  FileText,
  Home,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  User,
  X,
  ShoppingBag,
  Truck,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../supabaseClient';
import StoreHeader from '../components/store/StoreHeader';
import Footer from '../components/Footer';
import InvoiceModal from '../components/InvoiceModal';


/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

const formatStatus = (status) => {
  if (!status) return 'Order Placed';

  return String(status)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getOrderId = (order) => {
  return order?.id || order?.order_id || null;
};

const getDisplayOrderId = (order) => {
  const id = getOrderId(order);

  if (!id) return '-';

  if (order?.order_number) return order.order_number;
  if (order?.order_no) return order.order_no;
  if (order?.display_order_id) return order.display_order_id;

  return `#${String(id).slice(0, 8).toUpperCase()}`;
};

const getOrderStatus = (order) => {
  return (
    order?.status ||
    order?.order_status ||
    order?.payment_status ||
    'PLACED'
  );
};

/* =========================================================
   TRACKING HELPERS
========================================================= */

const normalizeOrderStatus = (status) => {
  if (!status) return 'PLACED';
  const lower = String(status).toLowerCase().trim();

  if (lower === 'pending') return 'PLACED';
  if (lower === 'processing') return 'PREPARING';
  if (lower === 'shipped') return 'OUT_FOR_DELIVERY';
  if (lower === 'delivered') return 'DELIVERED';
  if (lower === 'cancelled') return 'CANCELLED';

  return 'PLACED';
};

const getTrackingSteps = (orderOrStatus) => {
  const order = typeof orderOrStatus === 'object' && orderOrStatus !== null ? orderOrStatus : { status: orderOrStatus };
  const status = order?.status || order?.order_status || 'pending';
  const currentStatus = normalizeOrderStatus(status);
  const createdAt = order?.created_at;

  const steps = [
    { 
      key: 'PLACED', 
      label: 'Order Placed', 
      icon: ShoppingBag, 
      time: createdAt ? formatDateTime(createdAt) : null 
    },
    { 
      key: 'CONFIRMED', 
      label: 'Confirmed', 
      icon: Check, 
      time: order?.confirmed_at ? formatDateTime(order.confirmed_at) : (currentStatus !== 'PLACED' && createdAt ? formatDateTime(createdAt) : null)
    },
    { 
      key: 'PREPARING', 
      label: 'Preparing', 
      icon: Package, 
      time: order?.preparing_at ? formatDateTime(order.preparing_at) : null
    },
    { 
      key: 'OUT_FOR_DELIVERY', 
      label: 'Out for Delivery', 
      icon: Truck, 
      time: order?.shipped_at ? formatDateTime(order.shipped_at) : null
    },
    { 
      key: 'DELIVERED', 
      label: 'Delivered', 
      icon: Check, 
      time: order?.delivered_at ? formatDateTime(order.delivered_at) : null
    },
  ];

  if (currentStatus === 'CANCELLED') {
    return [
      { key: 'PLACED', label: 'Order Placed', icon: ShoppingBag, time: createdAt ? formatDateTime(createdAt) : null },
      { key: 'CANCELLED', label: 'Cancelled', icon: X, time: order?.updated_at ? formatDateTime(order.updated_at) : null },
    ];
  }

  const stepKeys = steps.map(s => s.key);
  const statusIndex = stepKeys.indexOf(currentStatus);

  return steps.map((step, index) => ({
    ...step,
    completed: statusIndex >= 0 ? index <= statusIndex : index === 0,
    active: step.key === currentStatus,
  }));
};

/* =========================================================
   VARIANT HELPERS
========================================================= */

const getProductVariants = (product) => {
  if (!product) return [];

  if (
    Array.isArray(product.product_variants) &&
    product.product_variants.length > 0
  ) {
    return product.product_variants;
  }

  if (Array.isArray(product.variants)) {
    return product.variants;
  }

  if (typeof product.variants === 'string') {
    try {
      const parsed = JSON.parse(product.variants);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getVariantLabel = (variant) => {
  if (!variant) return '';

  return (
    variant.unit_label ||
    variant.label ||
    variant.unit ||
    variant.name ||
    ''
  );
};

const getVariantPrice = (variant) => {
  return Number(variant?.price) || 0;
};

const getVariantMRP = (variant) => {
  return Number(variant?.mrp) || 0;
};

const getVariantStock = (variant) => {
  return Math.max(0, Number(variant?.stock) || 0);
};

const findOrderItemVariant = (orderItem, product) => {
  const variants = getProductVariants(product);

  if (!variants.length) return null;

  if (orderItem?.variant_id) {
    const byId = variants.find(
      (variant) =>
        String(variant?.id) === String(orderItem.variant_id)
    );

    if (byId) return byId;
  }

  if (orderItem?.variant_label) {
    const targetLabel = String(
      orderItem.variant_label
    ).trim().toLowerCase();

    const byLabel = variants.find((variant) => {
      const label = String(
        getVariantLabel(variant)
      )
        .trim()
        .toLowerCase();

      return label === targetLabel;
    });

    if (byLabel) return byLabel;
  }

  if (variants.length === 1) {
    return variants[0];
  }

  return null;
};


/* =========================================================
   ORDER CALCULATIONS
========================================================= */

const getDeliveryCharge = (order) => {
  return Number(
    order?.delivery_charge ??
      order?.delivery_fee ??
      order?.shipping_charge ??
      0
  ) || 0;
};

const getHandlingCharge = (order) => {
  return Number(
    order?.handling_charge ??
      order?.handling_fee ??
      0
  ) || 0;
};

const getDiscount = (order) => {
  return Number(
    order?.discount ??
      order?.discount_amount ??
      0
  ) || 0;
};

const getTax = (order) => {
  return Number(
    order?.tax ??
      order?.tax_amount ??
      0
  ) || 0;
};

const getItemSubtotal = (item) => {
  const quantity = Number(item?.quantity) || 0;
  const price = Number(item?.price) || 0;

  return quantity * price;
};

const getOrderItemsSubtotal = (order) => {
  const items = Array.isArray(order?.order_items)
    ? order.order_items
    : [];

  return items.reduce(
    (total, item) => total + getItemSubtotal(item),
    0
  );
};

const getOrderTotal = (order) => {
  if (
    order?.total_amount !== undefined &&
    order?.total_amount !== null
  ) {
    return Number(order.total_amount) || 0;
  }

  if (
    order?.grand_total !== undefined &&
    order?.grand_total !== null
  ) {
    return Number(order.grand_total) || 0;
  }

  const subtotal = getOrderItemsSubtotal(order);
  const delivery = getDeliveryCharge(order);
  const handling = getHandlingCharge(order);
  const discount = getDiscount(order);
  const tax = getTax(order);

  return subtotal + delivery + handling + tax - discount;
};


/* =========================================================
   ADDRESS HELPERS
========================================================= */

const emptyAddressForm = {
  title: 'Home',
  house_no: '',
  ward_no_name: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  phone: '',
  address: '',
  latitude: null,
  longitude: null,
  is_default: false,
};


/* =========================================================
   COMPONENT
========================================================= */

const CustomerOrdersPage = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [expandedOrders, setExpandedOrders] = useState({});

  const [searchTerm, setSearchTerm] = useState('');

  const [addresses, setAddresses] = useState([]);

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const [editingAddress, setEditingAddress] =
    useState(null);

  const [addressForm, setAddressForm] =
    useState(emptyAddressForm);

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [deletingAddressId, setDeletingAddressId] =
    useState(null);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [ratingOrder, setRatingOrder] =
    useState(null);

  const [ratingValue, setRatingValue] =
    useState(0);

  const [ratingComment, setRatingComment] =
    useState('');

  const [savingRating, setSavingRating] =
    useState(false);

  const [invoiceOrder, setInvoiceOrder] =
    useState(null);

  const [reorderingOrderId, setReorderingOrderId] =
    useState(null);


  /* =======================================================
     AUTH INITIALIZATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!mounted) return;

        if (!session || !session.user) {
          navigate('/login');
          return;
        }

        const currentUser = session.user;
        setAuthUser(currentUser);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        const profile = profileData || {
          id: currentUser.id,
          email: currentUser.email,
          full_name:
            currentUser.user_metadata?.full_name || '',
          phone:
            currentUser.user_metadata?.phone || '',
        };

        setUser(profile);

        setProfileForm({
          full_name:
            profile.full_name ||
            currentUser.user_metadata?.full_name ||
            '',
          phone:
            profile.phone ||
            currentUser.user_metadata?.phone ||
            '',
        });

        await Promise.all([
          loadOrders(currentUser.email),
          loadAddresses(currentUser.id),
        ]);
      } catch (error) {
        console.error(
          'Customer orders initialization error:',
          error
        );
        navigate('/login');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);


  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  const loadOrders = async (emailOverride = null) => {
    const email =
      emailOverride ||
      authUser?.email ||
      user?.email;

    if (!email) return;

    try {
      setLoadingOrders(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            variant_id,
            variant_label,
            products (
              *,
              product_variants (*)
            )
          )
        `)
        .eq('customer_email', email)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };


  /* =======================================================
     LOAD ADDRESSES
  ======================================================= */

  const loadAddresses = async (overrideUserId = null) => {
    const ownerUserId = overrideUserId || authUser?.id || user?.id;

    if (!ownerUserId) {
      setAddresses([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', ownerUserId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAddresses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAddresses([]);
    }
  };


  /* =======================================================
     SEARCHED ORDERS
  ======================================================= */

  const filteredOrders = useMemo(() => {
    const term = String(searchTerm || '')
      .trim()
      .toLowerCase();

    if (!term) return orders;

    return orders.filter((order) => {
      const orderId =
        getDisplayOrderId(order).toLowerCase();

      const status =
        formatStatus(
          getOrderStatus(order)
        ).toLowerCase();

      const items = Array.isArray(
        order?.order_items
      )
        ? order.order_items
        : [];

      const productText = items
        .map(
          (item) =>
            item?.products?.name || ''
        )
        .join(' ')
        .toLowerCase();

      return (
        orderId.includes(term) ||
        status.includes(term) ||
        productText.includes(term)
      );
    });
  }, [orders, searchTerm]);


  /* =======================================================
     ORDER TOGGLE
  ======================================================= */

  const toggleOrder = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };


  /* =======================================================
     REORDER
  ======================================================= */

  const handleReorder = async (order) => {
    if (!order) return;

    const orderId = getOrderId(order);

    try {
      setReorderingOrderId(orderId);

      const existingCartRaw =
        localStorage.getItem('cart_items');

      let existingCart = [];

      try {
        existingCart = existingCartRaw
          ? JSON.parse(existingCartRaw)
          : [];
      } catch {
        existingCart = [];
      }

      if (!Array.isArray(existingCart)) {
        existingCart = [];
      }

      const orderItems = Array.isArray(
        order?.order_items
      )
        ? order.order_items
        : [];

      if (!orderItems.length) {
        alert('No items found in this order.');
        return;
      }

      const cart = [...existingCart];

      let addedCount = 0;
      let skippedCount = 0;

      for (const orderItem of orderItems) {
        const product = orderItem?.products;

        if (!product?.id) {
          skippedCount += 1;
          continue;
        }

        const variants =
          getProductVariants(product);

        let matchedVariant =
          findOrderItemVariant(
            orderItem,
            product
          );

        if (!matchedVariant) {
          skippedCount += 1;
          continue;
        }

        const currentStock =
          getVariantStock(matchedVariant);

        const currentPrice =
          getVariantPrice(matchedVariant);

        const currentMrp =
          getVariantMRP(matchedVariant);

        if (currentStock <= 0) {
          skippedCount += 1;
          continue;
        }

        const requestedQuantity = Math.max(
          1,
          Number(orderItem?.quantity) || 1
        );

        const variantId =
          matchedVariant?.id ||
          orderItem?.variant_id ||
          null;

        const cartItemId =
          `${product.id}-${variantId || 'default'}`;

        const existingIndex =
          cart.findIndex(
            (item) =>
              String(
                item?.cartItemId
              ) === String(cartItemId)
          );

        if (existingIndex >= 0) {
          const existingItem =
            cart[existingIndex];

          const existingQuantity =
            Number(
              existingItem?.quantity
            ) || 0;

          const newQuantity = Math.min(
            existingQuantity +
              requestedQuantity,
            currentStock
          );

          cart[existingIndex] = {
            ...existingItem,
            cartItemId,
            id: product.id,
            product_id: product.id,
            product,
            variant: matchedVariant,
            title:
              product?.name || 'Product',
            price: currentPrice,
            mrp: currentMrp,
            stock: currentStock,
            quantity: newQuantity,
            image:
              product?.image_url ||
              product?.image ||
              product?.images?.[0] ||
              product?.gallery?.[0] ||
              '',
            image_url:
              product?.image_url ||
              product?.image ||
              product?.images?.[0] ||
              product?.gallery?.[0] ||
              '',
          };
        } else {
          cart.push({
            cartItemId,
            id: product.id,
            product_id: product.id,
            product,
            variant: matchedVariant,
            title:
              product?.name || 'Product',
            price: currentPrice,
            mrp: currentMrp,
            stock: currentStock,
            quantity: Math.min(
              requestedQuantity,
              currentStock
            ),
            image:
              product?.image_url ||
              product?.image ||
              product?.images?.[0] ||
              product?.gallery?.[0] ||
              '',
            image_url:
              product?.image_url ||
              product?.image ||
              product?.images?.[0] ||
              product?.gallery?.[0] ||
              '',
          });
        }

        addedCount += 1;
      }

      localStorage.setItem(
        'cart_items',
        JSON.stringify(cart)
      );

      window.dispatchEvent(
        new CustomEvent('cartUpdated', {
          detail: cart,
        })
      );

      window.dispatchEvent(
        new Event('storage')
      );

      setSelectedOrder(null);

      if (addedCount === 0) {
        alert(
          'None of the items from this order are currently available.'
        );
        return;
      }

      let message =
        `${addedCount} item${addedCount !== 1 ? 's' : ''} added to your cart.`;

      if (skippedCount > 0) {
        message += ` ${skippedCount} unavailable item${skippedCount !== 1 ? 's were' : ' was'} skipped.`;
      }

      alert(message);

      navigate('/');
    } catch (error) {
      console.error(
        'Reorder error:',
        error
      );

      alert(
        `Unable to reorder: ${
          error?.message ||
          'Something went wrong.'
        }`
      );
    } finally {
      setReorderingOrderId(null);
    }
  };


  /* =======================================================
     ADDRESS - ADD
  ======================================================= */

  const handleAddAddress = () => {
    setEditingAddress(null);

    setAddressForm({
      ...emptyAddressForm,
      is_default:
        addresses.length === 0,
    });

    setShowAddressForm(true);
  };


  /* =======================================================
     ADDRESS - EDIT
  ======================================================= */

  const handleEditAddress = (address) => {
    if (!address) return;

    setEditingAddress(address);

    setAddressForm({
      title:
        address.title || 'Home',
      house_no:
        address.house_no || '',
      ward_no_name:
        address.ward_no_name || '',
      city:
        address.city || '',
      district:
        address.district || '',
      state:
        address.state || '',
      pincode:
        address.pincode || '',
      phone:
        address.phone || '',
      address:
        address.address || '',
      latitude:
        address.latitude ?? null,
      longitude:
        address.longitude ?? null,
      is_default:
        Boolean(address.is_default),
    });

    setShowAddressForm(true);
  };


  /* =======================================================
     ADDRESS - SUBMIT
  ======================================================= */

  const handleAddressSubmit = async (e) => {
    e.preventDefault();

    const ownerUserId = authUser?.id || user?.id;

    if (!ownerUserId) {
      alert(
        'Please login again to manage your address.'
      );
      return;
    }

    if (
      !addressForm.house_no?.trim() ||
      !addressForm.city?.trim() ||
      !addressForm.state?.trim() ||
      !addressForm.pincode?.trim()
    ) {
      alert(
        'Please fill House / Flat No., City, State and Pincode.'
      );
      return;
    }

    if (
      !/^\d{6}$/.test(
        String(addressForm.pincode).trim()
      )
    ) {
      alert(
        'Please enter a valid 6-digit pincode.'
      );
      return;
    }

    try {
      setSavingAddress(true);

      const payload = {
        user_id: ownerUserId,
        title: addressForm.title || 'Home',
        house_no: addressForm.house_no?.trim() || null,
        ward_no_name: addressForm.ward_no_name?.trim() || null,
        city: addressForm.city?.trim() || null,
        district: addressForm.district?.trim() || null,
        state: addressForm.state?.trim() || null,
        pincode: addressForm.pincode?.trim() || null,
        phone: addressForm.phone?.trim() || null,
        address: addressForm.address?.trim() || null,
        latitude:
          addressForm.latitude !== null &&
          addressForm.latitude !== ''
            ? Number(addressForm.latitude)
            : null,
        longitude:
          addressForm.longitude !== null &&
          addressForm.longitude !== ''
            ? Number(addressForm.longitude)
            : null,
        is_default: Boolean(addressForm.is_default),
      };

      if (payload.is_default) {
        const { error: resetError } =
          await supabase
            .from('customer_addresses')
            .update({
              is_default: false,
            })
            .eq(
              'user_id',
              ownerUserId
            );

        if (resetError) {
          throw resetError;
        }
      }

      if (editingAddress?.id) {
        const {
          data,
          error,
        } = await supabase
          .from('customer_addresses')
          .update(payload)
          .eq(
            'id',
            editingAddress.id
          )
          .eq(
            'user_id',
            ownerUserId
          )
          .select()
          .single();

        if (error) throw error;

        setAddresses((prev) =>
          prev.map((item) => {
            if (item.id === editingAddress.id) {
              return data;
            }
            return payload.is_default ? { ...item, is_default: false } : item;
          })
        );

        alert(
          'Address updated successfully.'
        );
      } else {
        const shouldBeDefault =
          payload.is_default ||
          addresses.length === 0;

        const finalPayload = {
          ...payload,
          is_default:
            shouldBeDefault,
        };

        if (shouldBeDefault && addresses.length > 0) {
          await supabase
            .from('customer_addresses')
            .update({ is_default: false })
            .eq('user_id', ownerUserId);
        }

        const {
          data,
          error,
        } = await supabase
          .from('customer_addresses')
          .insert(finalPayload)
          .select()
          .single();

        if (error) throw error;

        setAddresses((prev) => {
          const updatedList = prev.map((item) =>
            shouldBeDefault ? { ...item, is_default: false } : item
          );
          return [...updatedList, data];
        });

        alert(
          'Address added successfully.'
        );
      }

      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({
        ...emptyAddressForm,
      });

      await loadAddresses();
    } catch (error) {
      console.error(
        'Address save error:',
        error
      );

      alert(
        `Unable to save address: ${
          error?.message ||
          'Unknown error'
        }`
      );
    } finally {
      setSavingAddress(false);
    }
  };


  /* =======================================================
     ADDRESS - DELETE
  ======================================================= */

  const handleDeleteAddress = async (address) => {
    if (!address?.id) return;

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this address?'
      );

    if (!confirmed) return;

    const ownerUserId = authUser?.id || user?.id;

    try {
      setDeletingAddressId(
        address.id
      );

      const wasDefault =
        Boolean(address.is_default);

      const { error } =
        await supabase
          .from('customer_addresses')
          .delete()
          .eq(
            'id',
            address.id
          )
          .eq(
            'user_id',
            ownerUserId
          );

      if (error) throw error;

      let remaining =
        addresses.filter(
          (item) =>
            item.id !== address.id
        );

      if (
        wasDefault &&
        remaining.length > 0
      ) {
        const nextDefaultId =
          remaining[0].id;

        const {
          data,
          error: defaultError,
        } = await supabase
          .from('customer_addresses')
          .update({
            is_default: true,
          })
          .eq(
            'id',
            nextDefaultId
          )
          .eq(
            'user_id',
            ownerUserId
          )
          .select()
          .single();

        if (!defaultError && data) {
          remaining = remaining.map((item) =>
            item.id === nextDefaultId ? data : { ...item, is_default: false }
          );
        }
      }

      setAddresses(remaining);

      alert(
        'Address deleted successfully.'
      );
    } catch (error) {
      console.error(
        'Delete address error:',
        error
      );

      alert(
        `Unable to delete address: ${
          error?.message ||
          'Something went wrong.'
        }`
      );
    } finally {
      setDeletingAddressId(null);
    }
  };


  /* =======================================================
     ADDRESS - SET DEFAULT
  ======================================================= */

  const handleSetDefaultAddress = async (
    address
  ) => {
    if (
      !address?.id ||
      address.is_default
    ) {
      return;
    }

    const ownerUserId = authUser?.id || user?.id;

    try {
      const {
        error: resetError,
      } = await supabase
        .from('customer_addresses')
        .update({
          is_default: false,
        })
        .eq(
          'user_id',
          ownerUserId
        );

      if (resetError) {
        throw resetError;
      }

      const {
        data,
        error,
      } = await supabase
        .from('customer_addresses')
        .update({
          is_default: true,
        })
        .eq(
          'id',
          address.id
        )
        .eq(
          'user_id',
          ownerUserId
        )
        .select()
        .single();

      if (error) throw error;

      setAddresses((prev) =>
        prev.map((item) => ({
          ...item,
          is_default:
            item.id === data.id,
        }))
      );
    } catch (error) {
      console.error(
        'Set default address error:',
        error
      );

      alert(
        `Unable to set default address: ${
          error?.message ||
          'Something went wrong.'
        }`
      );
    }
  };


 /* =======================================================
     PROFILE - SAVE
  ======================================================= */

  const handleProfileSave = async () => {
    if (!authUser?.id) return;

    try {
      setSavingProfile(true);

      const payload = {
        id: authUser.id,
        email: authUser.email,
        full_name: profileForm.full_name?.trim() || null,
        phone: profileForm.phone?.trim() || null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      setUser((prev) => ({
        ...prev,
        ...data,
      }));

      setEditingProfile(false);

      alert('Profile updated successfully.');
    } catch (error) {
      console.error('Profile update error:', error);
      alert(`Unable to update profile: ${error?.message || 'Something went wrong.'}`);
    } finally {
      setSavingProfile(false);
    }
  };


  /* =======================================================
     RATING
  ======================================================= */

  const openRatingModal = (order) => {
    setRatingOrder(order);
    setRatingValue(0);
    setRatingComment('');
  };

  const handleSubmitRating = async () => {
    if (!ratingOrder) return;

    if (
      !ratingValue ||
      ratingValue < 1
    ) {
      alert(
        'Please select a rating.'
      );
      return;
    }

    try {
      setSavingRating(true);

      const orderId =
        getOrderId(ratingOrder);

      const {
        error,
      } = await supabase
        .from('order_ratings')
        .insert({
          order_id: orderId,
          customer_email:
            authUser?.email ||
            user?.email ||
            null,
          rating: ratingValue,
          comment:
            ratingComment?.trim() ||
            null,
        });

      if (error) throw error;

      alert(
        'Thank you for your feedback!'
      );

      setRatingOrder(null);
      setRatingValue(0);
      setRatingComment('');
    } catch (error) {
      console.error(
        'Rating submission error:',
        error
      );

      alert(
        `Unable to submit rating: ${
          error?.message ||
          'Something went wrong.'
        }`
      );
    } finally {
      setSavingRating(false);
    }
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StoreHeader session={authUser} customerProfile={user} />

        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-3" />

            <p className="text-gray-600">
              Loading your account...
            </p>
          </div>
        </div>

        <Footer />
      </div>
    );
  }


  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader session={authUser} customerProfile={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

          <div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </button>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Account
            </h1>

            <p className="text-gray-500 mt-1">
              Manage your orders, profile and addresses.
            </p>
          </div>

          <button
            onClick={() =>
              loadOrders()
            }
            disabled={loadingOrders}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loadingOrders
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>

        </div>


        {/* =================================================
            PROFILE
        ================================================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">

          <div className="p-5 border-b border-gray-100 flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Profile
                </h2>

                <p className="text-sm text-gray-500">
                  Your account information
                </p>
              </div>
            </div>

            {!editingProfile && (
              <button
                onClick={() =>
                  setEditingProfile(true)
                }
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}

          </div>


          <div className="p-5">

            {editingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={
                      profileForm.full_name
                    }
                    onChange={(e) =>
                      setProfileForm(
                        (prev) => ({
                          ...prev,
                          full_name:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>

                  <input
                    type="tel"
                    value={
                      profileForm.phone
                    }
                    onChange={(e) =>
                      setProfileForm(
                        (prev) => ({
                          ...prev,
                          phone:
                            e.target.value.replace(
                              /\D/g,
                              ''
                            ),
                        })
                      )
                    }
                    maxLength={10}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>


                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      authUser?.email ||
                      user?.email ||
                      ''
                    }
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-gray-500"
                  />
                </div>


                <div className="md:col-span-2 flex justify-end gap-3">

                  <button
                    onClick={() =>
                      setEditingProfile(false)
                    }
                    className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleProfileSave
                    }
                    disabled={
                      savingProfile
                    }
                    className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {savingProfile && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}

                    Save Changes
                  </button>

                </div>

              </div>
            ) : (

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Name
                  </p>

                  <p className="font-medium text-gray-900">
                    {user?.full_name ||
                      'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Email
                  </p>

                  <p className="font-medium text-gray-900 break-all">
                    {authUser?.email ||
                      user?.email ||
                      '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Phone
                  </p>

                  <p className="font-medium text-gray-900">
                    {user?.phone ||
                      'Not provided'}
                  </p>
                </div>

              </div>

            )}

          </div>

        </section>


        {/* =================================================
            ADDRESSES
        ================================================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">

          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  My Addresses
                </h2>

                <p className="text-sm text-gray-500">
                  Manage your delivery addresses
                </p>
              </div>

            </div>


            <button
              onClick={
                handleAddAddress
              }
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </button>

          </div>


          <div className="p-5">

            {addresses.length === 0 ? (

              <div className="text-center py-8">

                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />

                <p className="text-gray-600 font-medium">
                  No addresses saved
                </p>

                <p className="text-sm text-gray-400 mt-1">
                  Add an address for faster checkout.
                </p>

              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {addresses.map(
                  (address) => (

                    <div
                      key={address.id}
                      className={`border rounded-xl p-4 ${
                        address.is_default
                          ? 'border-green-500 bg-green-50/40'
                          : 'border-gray-200'
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-start gap-3 min-w-0">

                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Home className="w-4 h-4 text-gray-600" />
                          </div>

                          <div className="min-w-0">

                            <div className="flex items-center gap-2 flex-wrap">

                              <span className="font-semibold text-gray-900">
                                {address.title ||
                                  'Address'}
                              </span>

                              {address.is_default && (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                  Default
                                </span>
                              )}

                            </div>

                          </div>

                        </div>


                        <div className="flex items-center gap-1">

                          <button
                            onClick={() =>
                              handleEditAddress(
                                address
                              )
                            }
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            title="Edit address"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteAddress(
                                address
                              )
                            }
                            disabled={
                              deletingAddressId ===
                              address.id
                            }
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-50"
                            title="Delete address"
                          >
                            {deletingAddressId ===
                            address.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>

                        </div>

                      </div>


                      <div className="mt-3 space-y-1">

                        <p className="text-sm text-gray-700 leading-6">
                          {[
                            address.house_no,
                            address.ward_no_name,
                            address.address,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>

                        <p className="text-sm text-gray-600">
                          {[
                            address.city,
                            address.district,
                            address.state,
                          ]
                            .filter(Boolean)
                            .join(', ')}

                          {address.pincode
                            ? ` - ${address.pincode}`
                            : ''}
                        </p>

                        {address.phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-2 pt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {address.phone}
                          </p>
                        )}

                      </div>


                      {!address.is_default && (
                        <button
                          onClick={() =>
                            handleSetDefaultAddress(
                              address
                            )
                          }
                          className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Make Default
                        </button>
                      )}

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>


        {/* =================================================
            ORDERS
        ================================================= */}

        <section>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                My Orders
              </h2>

              <p className="text-sm text-gray-500">
                {orders.length}{' '}
                {orders.length === 1
                  ? 'order'
                  : 'orders'}{' '}
                found
              </p>
            </div>


            <div className="relative w-full md:w-80">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder="Search orders..."
                className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />

            </div>

          </div>


          {loadingOrders ? (

            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">

              <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />

              <p className="text-gray-500">
                Loading orders...
              </p>

            </div>

          ) : filteredOrders.length === 0 ? (

            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">

              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />

              <h3 className="font-semibold text-gray-900">
                {searchTerm
                  ? 'No matching orders'
                  : 'No orders yet'}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {searchTerm
                  ? 'Try a different search term.'
                  : 'Your completed orders will appear here.'}
              </p>

              {!searchTerm && (
                <button
                  onClick={() =>
                    navigate('/')
                  }
                  className="mt-5 px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Start Shopping
                </button>
              )}

            </div>

          ) : (

            <div className="space-y-4">

              {filteredOrders.map(
                (order) => {

                  const orderId =
                    getOrderId(order);

                  const status =
                    getOrderStatus(order);

                  const items =
                    Array.isArray(
                      order?.order_items
                    )
                      ? order.order_items
                      : [];

                  const subtotal =
                    getOrderItemsSubtotal(
                      order
                    );

                  const total =
                    getOrderTotal(order);

                  const expanded =
                    Boolean(
                      expandedOrders[
                        orderId
                      ]
                    );

                  return (
                    <div
                      key={orderId}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                    >

                      {/* --------------------------------
                          ORDER HEADER
                      --------------------------------- */}

                      <div className="p-5">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                          <div className="flex items-start gap-4">

                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-green-600" />
                            </div>

                            <div>

                              <div className="flex flex-wrap items-center gap-2">

                                <h3 className="font-bold text-gray-900">
                                  {getDisplayOrderId(
                                    order
                                  )}
                                </h3>

                                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                                  {formatStatus(
                                    status
                                  )}
                                </span>

                              </div>

                              <p className="text-sm text-gray-500 mt-1">
                                {formatDateTime(
                                  order?.created_at
                                )}
                              </p>

                            </div>

                          </div>


                          <div className="flex flex-wrap items-center gap-2">

                            <button
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
                            >
                              View Details
                            </button>

                            <button
                              onClick={() =>
                                handleReorder(
                                  order
                                )
                              }
                              disabled={
                                reorderingOrderId ===
                                orderId
                              }
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              {reorderingOrderId ===
                              orderId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}

                              Reorder
                            </button>

                          </div>

                        </div>


                        {/* --------------------------------
                            ORDER SUMMARY
                        --------------------------------- */}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-gray-100">

                          <div>
                            <p className="text-xs text-gray-500">
                              Items
                            </p>

                            <p className="font-semibold text-gray-900 mt-1">
                              {items.length}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Subtotal
                            </p>

                            <p className="font-semibold text-gray-900 mt-1">
                              {formatCurrency(
                                subtotal
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Delivery
                            </p>

                            <p className="font-semibold text-gray-900 mt-1">
                              {getDeliveryCharge(
                                order
                              ) > 0
                                ? formatCurrency(
                                    getDeliveryCharge(
                                      order
                                    )
                                  )
                                : 'FREE'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              Total
                            </p>

                            <p className="font-bold text-green-600 mt-1">
                              {formatCurrency(
                                total
                              )}
                            </p>
                          </div>

                        </div>


                        {/* --------------------------------
                            COLLAPSE BUTTON
                        --------------------------------- */}

                        <button
                          onClick={() =>
                            toggleOrder(
                              orderId
                            )
                          }
                          className="mt-4 text-sm text-gray-600 hover:text-green-600 inline-flex items-center gap-1"
                        >
                          {expanded
                            ? 'Hide Items'
                            : 'Show Items'}

                          {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                      </div>


                      {/* --------------------------------
                          EXPANDED ITEMS
                      --------------------------------- */}

                      {expanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-5">

                          <div className="space-y-3">

                            {items.map(
                              (item, index) => {

                                const product =
                                  item?.products;

                                const variant =
                                  findOrderItemVariant(
                                    item,
                                    product
                                  );

                                const image =
                                  product?.image_url ||
                                  product?.image ||
                                  product?.images?.[0] ||
                                  product?.gallery?.[0] ||
                                  '';

                                return (
                                  <div
                                    key={
                                      item?.id ||
                                      index
                                    }
                                    className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3"
                                  >

                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">

                                      {image ? (
                                        <img
                                          src={image}
                                          alt={
                                            product?.name ||
                                            'Product'
                                          }
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <Package className="w-6 h-6 text-gray-300" />
                                      )}

                                    </div>

                                    <div className="flex-1 min-w-0">

                                      <p className="font-medium text-gray-900 truncate">
                                        {product?.name ||
                                          'Product'}
                                      </p>

                                      {variant && (
                                        <p className="text-sm text-gray-500">
                                          {getVariantLabel(
                                            variant
                                          )}
                                        </p>
                                      )}

                                      <p className="text-sm text-gray-500">
                                        Qty:{' '}
                                        {Number(
                                          item?.quantity
                                        ) || 1}
                                      </p>

                                    </div>

                                    <div className="text-right">

                                      <p className="font-semibold text-gray-900">
                                        {formatCurrency(
                                          item?.price
                                        )}
                                      </p>

                                      <p className="text-xs text-gray-500">
                                        {formatCurrency(
                                          getItemSubtotal(
                                            item
                                          )
                                        )}
                                      </p>

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </main>


      <Footer />


      {/* ===================================================
          ADDRESS MODAL
      =================================================== */}

      {showAddressForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingAddress
                    ? 'Edit Address'
                    : 'Add New Address'}
                </h2>

                <p className="text-sm text-gray-500">
                  Enter your delivery address details.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAddressForm(
                    false
                  );
                  setEditingAddress(
                    null
                  );
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

            </div>


            <form
              onSubmit={
                handleAddressSubmit
              }
              className="p-5 space-y-4"
            >

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Type
                </label>

                <select
                  value={
                    addressForm.title
                  }
                  onChange={(e) =>
                    setAddressForm(
                      (prev) => ({
                        ...prev,
                        title:
                          e.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Home">
                    Home
                  </option>

                  <option value="Work">
                    Work
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  House / Flat / Shop No. *
                </label>

                <input
                  type="text"
                  value={
                    addressForm.house_no
                  }
                  onChange={(e) =>
                    setAddressForm(
                      (prev) => ({
                        ...prev,
                        house_no:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="e.g. House No. 123"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ward / Area / Locality
                </label>

                <input
                  type="text"
                  value={
                    addressForm.ward_no_name
                  }
                  onChange={(e) =>
                    setAddressForm(
                      (prev) => ({
                        ...prev,
                        ward_no_name:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Sector 45"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complete Address
                </label>

                <textarea
                  value={
                    addressForm.address
                  }
                  onChange={(e) =>
                    setAddressForm(
                      (prev) => ({
                        ...prev,
                        address:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Building, street, landmark, etc."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>

                  <input
                    type="text"
                    value={
                      addressForm.city
                    }
                    onChange={(e) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          city:
                            e.target.value,
                        })
                      )
                    }
                    required
                    placeholder="City"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>

                  <input
                    type="text"
                    value={
                      addressForm.district
                    }
                    onChange={(e) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          district:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="District"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>

                  <input
                    type="text"
                    value={
                      addressForm.state
                    }
                    onChange={(e) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          state:
                            e.target.value,
                        })
                      )
                    }
                    required
                    placeholder="State"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode *
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={
                      addressForm.pincode
                    }
                    onChange={(e) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          pincode:
                            e.target.value.replace(
                              /\D/g,
                              ''
                            ),
                        })
                      )
                    }
                    required
                    placeholder="6-digit pincode"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={
                    addressForm.phone
                  }
                  onChange={(e) =>
                    setAddressForm(
                      (prev) => ({
                        ...prev,
                        phone:
                          e.target.value.replace(
                            /\D/g,
                            ''
                          ),
                      })
                    )
                  }
                  placeholder="10-digit mobile number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>


              <label className="flex items-center gap-3 cursor-pointer">

                <input
                  type="checkbox"
                  checked={Boolean(
                    addressForm.is_default
                  )}
                  onChange={(e) =>
                    setAddressForm(
                      (prev) => ({
                        ...prev,
                        is_default:
                          e.target.checked,
                      })
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />

                <span className="text-sm text-gray-700">
                  Make this my default address
                </span>

              </label>


              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">

                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(
                      false
                    );
                    setEditingAddress(
                      null
                    );
                  }}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingAddress
                  }
                  className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingAddress && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {editingAddress
                    ? 'Update Address'
                    : 'Save Address'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* ===================================================
          ORDER DETAILS MODAL
      =================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Order{' '}
                  {getDisplayOrderId(
                    selectedOrder
                  )}
                </h2>

                <p className="text-sm text-gray-500">
                  {formatDateTime(
                    selectedOrder?.created_at
                  )}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

            </div>


            <div className="p-5 space-y-6">

              <div>

                <h3 className="font-semibold text-gray-900 mb-4">
                  Order Tracking
                </h3>

                <div className="overflow-x-auto">

                  <div className="flex min-w-[650px]">

                    {getTrackingSteps(
                  selectedOrder
                ).map(
                  (
                    step,
                    index,
                    allSteps
                  ) => {

                    const Icon =
                      step.icon;

                    return (
                      <div
                        key={
                          step.key
                        }
                        className="flex-1 relative"
                      >

                        <div className="flex items-center">

                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                              step.completed ||
                              step.active
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'bg-white border-gray-300 text-gray-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          {index <
                            allSteps.length -
                              1 && (
                            <div
                              className={`h-0.5 flex-1 mx-2 ${
                                step.completed
                                  ? 'bg-green-600'
                                  : 'bg-gray-200'
                              }`}
                            />
                          )}

                        </div>

                        <p
                          className={`text-xs mt-2 ${
                            step.active
                              ? 'font-semibold text-green-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </p>

                        {step.time && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {step.time}
                          </p>
                        )}

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </div>


          <div>

            <h3 className="font-semibold text-gray-900 mb-3">
              Order Items
            </h3>

            <div className="space-y-3">

              {(Array.isArray(
                selectedOrder?.order_items
              )
                ? selectedOrder.order_items
                : []
              ).map(
                (item, index) => {

                  const product =
                    item?.products;

                  const variant =
                    findOrderItemVariant(
                      item,
                      product
                    );

                  const image =
                    product?.image_url ||
                    product?.image ||
                    product?.images?.[0] ||
                    product?.gallery?.[0] ||
                    '';

                  return (
                    <div
                      key={
                        item?.id ||
                        index
                      }
                      className="flex items-center gap-3 border border-gray-200 rounded-xl p-3"
                    >

                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">

                        {image ? (
                          <img
                            src={image}
                            alt={
                              product?.name ||
                              'Product'
                            }
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300" />
                        )}

                      </div>
                      
                          <div className="flex-1 min-w-0">

                            <p className="font-medium text-gray-900">
                              {product?.name ||
                                'Product'}
                            </p>

                            {variant && (
                              <p className="text-sm text-gray-500">
                                {getVariantLabel(
                                  variant
                                )}
                              </p>
                            )}

                            <p className="text-sm text-gray-500">
                              Qty:{' '}
                              {Number(
                                item?.quantity
                              ) || 1}
                            </p>

                          </div>

                          <div className="text-right">

                            <p className="font-semibold">
                              {formatCurrency(
                                item?.price
                              )}
                            </p>

                            <p className="text-sm text-gray-500">
                              {formatCurrency(
                                getItemSubtotal(
                                  item
                                )
                              )}
                            </p>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>


              <div>

                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  Delivery Address
                </h3>

                <div className="bg-gray-50 rounded-xl p-4">

                  {selectedOrder?.address ? (
                    <p className="text-sm text-gray-700 leading-6">
                      {selectedOrder.address}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700">
                        {selectedOrder?.delivery_address ||
                          selectedOrder?.shipping_address ||
                          'Address information not available'}
                      </p>
                    </>
                  )}

                </div>

              </div>


              <div>

                <h3 className="font-semibold text-gray-900 mb-3">
                  Payment
                </h3>

                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">

                  <CreditCard className="w-5 h-5 text-gray-500" />

                  <div>

                    <p className="text-sm font-medium text-gray-900">
                      {selectedOrder?.payment_method ||
                        'Payment'}
                    </p>

                    <p className="text-xs text-gray-500">
                      {selectedOrder?.payment_status ||
                        ''}
                    </p>

                  </div>

                </div>

              </div>


              <div className="border-t border-gray-100 pt-4">

                <div className="space-y-2 text-sm">

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span>
                      {formatCurrency(
                        getOrderItemsSubtotal(
                          selectedOrder
                        )
                      )}
                    </span>
                  </div>


                  {getDiscount(
                    selectedOrder
                  ) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Discount
                      </span>

                      <span className="text-green-600">
                        -
                        {formatCurrency(
                          getDiscount(
                            selectedOrder
                          )
                        )}
                      </span>
                    </div>
                  )}


                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Delivery
                    </span>

                    <span>
                      {getDeliveryCharge(
                        selectedOrder
                      ) > 0
                        ? formatCurrency(
                            getDeliveryCharge(
                              selectedOrder
                            )
                          )
                        : 'FREE'}
                    </span>
                  </div>


                  {getHandlingCharge(
                    selectedOrder
                  ) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Handling
                      </span>

                      <span>
                        {formatCurrency(
                          getHandlingCharge(
                            selectedOrder
                          )
                        )}
                      </span>
                    </div>
                  )}


                  {getTax(
                    selectedOrder
                  ) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Tax
                      </span>

                      <span>
                        {formatCurrency(
                          getTax(
                            selectedOrder
                          )
                        )}
                      </span>
                    </div>
                  )}


                  <div className="flex justify-between pt-3 border-t border-gray-200 text-base font-bold">

                    <span>
                      Total
                    </span>

                    <span className="text-green-600">
                      {formatCurrency(
                        getOrderTotal(
                          selectedOrder
                        )
                      )}
                    </span>

                  </div>

                </div>

              </div>


              <div className="flex flex-wrap justify-end gap-3 pt-2">

                <button
                  onClick={() =>
                    setInvoiceOrder(
                      selectedOrder
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  <FileText className="w-4 h-4" />
                  Invoice
                </button>


                {String(
                  getOrderStatus(
                    selectedOrder
                  )
                ).toUpperCase() ===
                  'DELIVERED' && (
                  <button
                    onClick={() =>
                      openRatingModal(
                        selectedOrder
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  >
                    <Star className="w-4 h-4" />
                    Rate Order
                  </button>
                )}


                <button
                  onClick={() =>
                    handleReorder(
                      selectedOrder
                    )
                  }
                  disabled={
                    reorderingOrderId ===
                    getOrderId(
                      selectedOrder
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {reorderingOrderId ===
                  getOrderId(
                    selectedOrder
                  ) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}

                  Reorder
                </button>

              </div>

            </div>

          </div>

        </div>
      )}


      {/* ===================================================
          RATING MODAL
      =================================================== */}

      {ratingOrder && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            <div className="p-5 border-b border-gray-100 flex items-center justify-between">

              <div>
                <h2 className="font-bold text-gray-900">
                  Rate Your Order
                </h2>

                <p className="text-sm text-gray-500">
                  {getDisplayOrderId(
                    ratingOrder
                  )}
                </p>
              </div>

              <button
                onClick={() =>
                  setRatingOrder(null)
                }
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>

            </div>


            <div className="p-5">

              <p className="text-sm text-gray-600 text-center mb-4">
                How was your overall experience?
              </p>


              <div className="flex justify-center gap-2 mb-5">

                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setRatingValue(
                          star
                        )
                      }
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <=
                          ratingValue
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  )
                )}

              </div>


              <textarea
                value={
                  ratingComment
                }
                onChange={(e) =>
                  setRatingComment(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Tell us about your experience..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />


              <div className="flex justify-end gap-3 mt-4">

                <button
                  onClick={() =>
                    setRatingOrder(
                      null
                    )
                  }
                  className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    handleSubmitRating
                  }
                  disabled={
                    savingRating ||
                    !ratingValue
                  }
                  className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingRating && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  Submit Rating
                </button>

              </div>

            </div>

          </div>

        </div>
      )}


      {/* ===================================================
          INVOICE
      =================================================== */}

      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() =>
            setInvoiceOrder(null)
          }
        />
      )}

    </div>
  );
};

export default CustomerOrdersPage;