// src/pages/CustomerOrdersPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
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
  UserCircle,
  MapPinned,
  ShoppingBag as BagIcon,
  Sparkles,
  Clock,
  ArrowRight,
  Flame,
  LogOut,
  KeyRound,
  Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
      time: order?.confirmed_at ? formatDateTime(order.confirmed_at) : null
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

const calculateDeliveryDuration = (createdAt, deliveredAt) => {
  if (!createdAt || !deliveredAt) return null;

  try {
    const start = new Date(createdAt);
    const end = new Date(deliveredAt);
    const diffMs = end - start;

    if (diffMs < 0) return null;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    if (hours === 0) {
      return `${minutes} mins`;
    }
    return `${hours} hr ${minutes} mins`;
  } catch {
    return null;
  }
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
  const discount = getDiscount(order);
  const tax = getTax(order);

  return subtotal + delivery + tax - discount;
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

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'addresses' | 'profile'

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

  // Per-product rating state map: { [productId]: { rating: number, comment: string } }
  const [productRatingsMap, setProductRatingsMap] = useState({});

  const [savingRating, setSavingRating] =
    useState(false);

  const [invoiceOrder, setInvoiceOrder] =
    useState(null);

  const [reorderingOrderId, setReorderingOrderId] =
    useState(null);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);


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
     CANCEL ORDER
  ======================================================= */

  const handleCancelOrder = async (order) => {
    if (!order) return;
    const orderId = getOrderId(order);
    const status = String(getOrderStatus(order)).toLowerCase().trim();

    if (status !== 'pending' && status !== 'placed') {
      alert('Orders can only be cancelled while their status is Pending.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;

    try {
      setCancellingOrderId(orderId);

      const customerName = user?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Customer';
      const cancelRemark = `Cancelled by :${customerName}:`;

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          remark: cancelRemark
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('Order cancelled successfully.');
      setSelectedOrder(null);
      await loadOrders();
    } catch (error) {
      console.error('Cancel order error:', error);
      alert(`Unable to cancel order: ${error?.message || 'Something went wrong.'}`);
    } finally {
      setCancellingOrderId(null);
    }
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
     RATING (PER PRODUCT)
  ======================================================= */

  const openRatingModal = (order) => {
    setRatingOrder(order);
    const initialMap = {};
    const items = Array.isArray(order?.order_items) ? order.order_items : [];
    items.forEach((item) => {
      const prodId = item?.products?.id;
      if (prodId) {
        initialMap[prodId] = { rating: 5, comment: '' };
      }
    });
    setProductRatingsMap(initialMap);
  };

  const handleProductRatingChange = (productId, field, value) => {
    setProductRatingsMap((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { rating: 5, comment: '' }),
        [field]: value,
      },
    }));
  };

  const handleSubmitAllProductRatings = async () => {
    if (!ratingOrder) return;

    const userId = authUser?.id || user?.id;
    const userEmail = authUser?.email || user?.email || 'customer@hub.com';

    if (!userId) {
      alert('Please log in to submit product reviews.');
      return;
    }

    try {
      setSavingRating(true);

      const items = Array.isArray(ratingOrder?.order_items) ? ratingOrder.order_items : [];
      const insertPayloads = [];

      items.forEach((item) => {
        const prodId = item?.products?.id;
        if (prodId && productRatingsMap[prodId]) {
          const entry = productRatingsMap[prodId];
          insertPayloads.push({
            product_id: prodId,
            user_id: userId,
            user_email: userEmail,
            rating: Number(entry.rating || 5),
            review_text: entry.comment?.trim() || null,
          });
        }
      });

      if (insertPayloads.length === 0) {
        alert('No ratings provided.');
        return;
      }

      const { error } = await supabase
        .from('product_reviews')
        .insert(insertPayloads);

      if (error) throw error;

      alert('Thank you! Product reviews submitted successfully.');
      setRatingOrder(null);
      setProductRatingsMap({});
    } catch (error) {
      console.error('Product review submission error:', error);
      alert(`Unable to submit reviews: ${error?.message || 'Something went wrong.'}`);
    } finally {
      setSavingRating(false);
    }
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans">
        <StoreHeader session={authUser} customerProfile={user} showSearch={false} />

        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-stone-600 font-bold text-sm">
              Loading your account dashboard...
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-stone-50 to-emerald-50/30 pb-28 md:pb-16 font-sans">
      <StoreHeader session={authUser} customerProfile={user} showSearch={false} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* =================================================
            VIBRANT INTERACTIVE TAB NAVIGATION BUTTONS
        ================================================= */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200/80 p-2 mb-8 shadow-md flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === 'orders' ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
              <BagIcon className="w-4 h-4 shrink-0" />
            </div>
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === 'addresses' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
              <MapPinned className="w-4 h-4 shrink-0" />
            </div>
            <span>Addresses ({addresses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02]'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${activeTab === 'profile' ? 'bg-white/20' : 'bg-purple-50 text-purple-600'}`}>
              <UserCircle className="w-4 h-4 shrink-0" />
            </div>
            <span>Profile Settings</span>
          </button>
        </div>


        {/* =================================================
            TAB CONTENT: PROFILE
        ================================================= */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.section
              key="profile"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-lg mb-8 overflow-hidden"
            >
              <div className="p-6 sm:p-7 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/25">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="font-black text-stone-900 text-lg">Profile & Security Credentials</h2>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">Manage your personal contact info and login bindings</p>
                  </div>
                </div>

                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-4 py-2.5 rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    <Edit className="w-4 h-4" /> Edit Profile
                  </button>
                )}
              </div>

              <div className="p-6 sm:p-8">
                {editingProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                    <div>
                      <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        className="w-full border border-stone-200 bg-stone-50 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2">Mobile Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                        maxLength={10}
                        className="w-full border border-stone-200 bg-stone-50 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2">Account Email (Permanent)</label>
                      <input
                        type="email"
                        value={authUser?.email || user?.email || ''}
                        disabled
                        className="w-full border border-stone-200 bg-stone-100 rounded-2xl px-4 py-3 text-sm text-stone-500 cursor-not-allowed font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-stone-100">
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-6 py-3 rounded-2xl border border-stone-200 hover:bg-stone-100 text-xs font-black transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProfileSave}
                        disabled={savingProfile}
                        className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 inline-flex items-center gap-2 text-xs font-black transition cursor-pointer shadow-md shadow-purple-600/30"
                      >
                        {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gradient-to-br from-purple-50/40 to-stone-50 p-6 rounded-2xl border border-purple-100/60 shadow-2xs">
                    <div className="bg-white p-4 rounded-xl border border-stone-200/60 shadow-2xs">
                      <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Full Name</p>
                      <p className="font-black text-stone-900 text-base">{user?.full_name || 'Not provided'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-200/60 shadow-2xs">
                      <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Email Address</p>
                      <p className="font-black text-stone-900 text-sm break-all">{authUser?.email || user?.email || '-'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-200/60 shadow-2xs">
                      <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">Phone Number</p>
                      <p className="font-black text-stone-900 text-base">{user?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}


          {/* =================================================
              TAB CONTENT: ADDRESSES
          ================================================= */}
          {activeTab === 'addresses' && (
            <motion.section
              key="addresses"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-lg mb-8 overflow-hidden"
            >
              <div className="p-6 sm:p-7 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="font-black text-stone-900 text-lg">Saved Delivery Addresses</h2>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">Manage drop-off coordinates for rapid order dispatch</p>
                  </div>
                </div>

                <button
                  onClick={handleAddAddress}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-blue-600/25"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>

              <div className="p-6 sm:p-8">
                {addresses.length === 0 ? (
                  <div className="text-center py-16 bg-blue-50/30 rounded-3xl border border-dashed border-blue-200">
                    <MapPin className="w-14 h-14 text-blue-400 mx-auto mb-3 animate-bounce" />
                    <p className="text-stone-800 font-black text-base">No saved delivery addresses</p>
                    <p className="text-xs text-stone-400 mt-1 font-medium">Add a location to enable instant 10-minute grocery delivery.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border rounded-2xl p-5 transition-all relative overflow-hidden shadow-2xs ${
                          address.is_default
                            ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <Home className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-black text-stone-900 text-sm">
                                  {address.title || 'Address'}
                                </span>
                                {address.is_default && (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black uppercase tracking-wider shadow-2xs">
                                    Default Zone
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-blue-600 cursor-pointer transition"
                              title="Edit Address"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address)}
                              disabled={deletingAddressId === address.id}
                              className="p-2 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition"
                              title="Delete Address"
                            >
                              {deletingAddressId === address.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3.5 space-y-1 text-xs sm:text-sm pl-14">
                          <p className="text-stone-800 font-bold leading-relaxed">
                            {[address.house_no, address.ward_no_name, address.address].filter(Boolean).join(', ')}
                          </p>
                          <p className="text-stone-500 font-medium">
                            {[address.city, address.district, address.state].filter(Boolean).join(', ')}
                            {address.pincode ? ` — ${address.pincode}` : ''}
                          </p>
                          {address.phone && (
                            <p className="text-stone-600 flex items-center gap-1.5 pt-1.5 font-bold text-xs">
                              <Phone className="w-3.5 h-3.5 text-blue-600" /> {address.phone}
                            </p>
                          )}
                        </div>

                        {!address.is_default && (
                          <div className="mt-4 pt-3.5 border-t border-stone-100 flex justify-end">
                            <button
                              onClick={() => handleSetDefaultAddress(address)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-black tracking-wide cursor-pointer inline-flex items-center gap-1"
                            >
                              Set as Default <ArrowRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}


          {/* =================================================
              TAB CONTENT: ORDERS
          ================================================= */}
          {activeTab === 'orders' && (
            <motion.section
              key="orders"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-stone-900 tracking-tight">Order Activity History</h2>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">Track real-time shipment steps and past grocery transactions</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search orders by ID, status, items..."
                    className="w-full bg-white border border-stone-200/90 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-stone-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>


              {loadingOrders ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-16 text-center shadow-xs">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className="text-stone-600 font-bold text-sm">Fetching active orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
                  <Package className="w-14 h-14 text-stone-300 mx-auto mb-3" />
                  <h3 className="font-black text-stone-900 text-base">
                    {searchTerm ? 'No matching orders found' : 'No past orders yet'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 font-medium">
                    {searchTerm ? 'Try searching with a different keyword.' : 'Your placed grocery orders will show up here.'}
                  </p>

                  {!searchTerm && (
                    <button
                      onClick={() => navigate('/')}
                      className="mt-5 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-emerald-600/25"
                    >
                      Start Shopping Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const orderId = getOrderId(order);
                    const status = getOrderStatus(order);
                    const items = Array.isArray(order?.order_items) ? order.order_items : [];
                    const subtotal = getOrderItemsSubtotal(order);
                    const total = getOrderTotal(order);
                    const expanded = Boolean(expandedOrders[orderId]);
                    const isDelivered = normalizeOrderStatus(status) === 'DELIVERED';
                    const isPending = String(status).toLowerCase().trim() === 'pending' || String(status).toLowerCase().trim() === 'placed';

                    return (
                      <div
                        key={orderId}
                        className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden transition hover:shadow-md"
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                                <Package className="w-6 h-6" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="font-black text-stone-900 text-sm sm:text-base">
                                    {getDisplayOrderId(order)}
                                  </h3>
                                  <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-2xs ${
                                    isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                                  }`}>
                                    {formatStatus(status)}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-400 mt-1 font-medium flex items-center gap-1">
                                  <Clock size={13} /> {formatDateTime(order?.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              {isPending && (
                                <button
                                  onClick={() => handleCancelOrder(order)}
                                  disabled={cancellingOrderId === orderId}
                                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-black text-rose-700 disabled:opacity-50 cursor-pointer transition shadow-2xs inline-flex items-center gap-1"
                                >
                                  {cancellingOrderId === orderId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                  <span>Cancel Order</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-black text-stone-800 cursor-pointer transition shadow-2xs"
                              >
                                View Details & Track
                              </button>

                              {isDelivered && (
                                <button
                                  onClick={() => handleReorder(order)}
                                  disabled={reorderingOrderId === orderId}
                                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20 transition"
                                >
                                  {reorderingOrderId === orderId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4" />
                                  )}
                                  <span>Reorder</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-stone-100 text-xs bg-stone-50/70 p-4 rounded-2xl border border-stone-100">
                            <div>
                              <p className="text-stone-400 font-black uppercase tracking-wider text-[10px]">Total Items</p>
                              <p className="font-black text-stone-900 mt-0.5 text-sm">{items.length} items</p>
                            </div>
                            <div>
                              <p className="text-stone-400 font-black uppercase tracking-wider text-[10px]">Items Subtotal</p>
                              <p className="font-black text-stone-900 mt-0.5 text-sm">{formatCurrency(subtotal)}</p>
                            </div>
                            <div>
                              <p className="text-stone-400 font-black uppercase tracking-wider text-[10px]">Delivery Fee</p>
                              <p className="font-black text-stone-900 mt-0.5 text-sm">
                                {getDeliveryCharge(order) > 0 ? formatCurrency(getDeliveryCharge(order)) : <span className="text-emerald-600">FREE</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-stone-400 font-black uppercase tracking-wider text-[10px]">Grand Total</p>
                              <p className="font-black text-emerald-700 mt-0.5 text-base">{formatCurrency(total)}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleOrder(orderId)}
                            className="mt-4 text-xs text-stone-600 hover:text-emerald-700 inline-flex items-center gap-1 font-bold cursor-pointer transition"
                          >
                            <span>{expanded ? 'Hide ordered items list' : 'View ordered items list'}</span>
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {expanded && (
                          <div className="border-t border-stone-100 bg-stone-50/90 p-5 sm:p-6">
                            <div className="space-y-3">
                              {items.map((item, index) => {
                                const product = item?.products;
                                const variant = findOrderItemVariant(item, product);
                                const image =
                                  product?.image_url ||
                                  product?.image ||
                                  product?.images?.[0] ||
                                  product?.gallery?.[0] ||
                                  '';

                                return (
                                  <div
                                    key={item?.id || index}
                                    className="bg-white rounded-2xl border border-stone-200 p-3.5 flex items-center gap-4 shadow-2xs"
                                  >
                                    <div className="w-14 h-14 rounded-xl bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 border border-stone-100">
                                      {image ? (
                                        <img src={image} alt={product?.name || 'Product'} className="w-full h-full object-contain" />
                                      ) : (
                                        <Package className="w-6 h-6 text-stone-300" />
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="font-extrabold text-stone-900 text-sm truncate">
                                        {product?.name || 'Product'}
                                      </p>
                                      {variant && (
                                        <p className="text-xs text-stone-500 font-bold">{getVariantLabel(variant)}</p>
                                      )}
                                      <p className="text-xs text-stone-500 font-black mt-0.5">Qty: {Number(item?.quantity) || 1}</p>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <p className="font-black text-stone-900 text-sm">{formatCurrency(item?.price)}</p>
                                      <p className="text-xs text-stone-400 font-bold">{formatCurrency(getItemSubtotal(item))}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

      </main>


      {/* =========================================================
          VIBRANT MOBILE BOTTOM NAVIGATION BAR (Icons Only on Mobile)
      ========================================================= */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2.5">
          <button
            onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Home"
          >
            <div className="w-11 h-11 bg-stone-100 group-active:bg-stone-200 rounded-2xl flex items-center justify-center transition-colors">
              <Home size={22} className="text-stone-700" />
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Orders"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors shadow-2xs ${activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
              <Package size={22} />
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('addresses'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Addresses"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors shadow-2xs ${activeTab === 'addresses' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
              <MapPin size={22} />
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-2 cursor-pointer group"
            title="Profile"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors shadow-2xs ${activeTab === 'profile' ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
              <User size={22} />
            </div>
          </button>
        </div>
      </div>


      <Footer />


      {/* ===================================================
          ADDRESS MODAL
      =================================================== */}

      {showAddressForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-stone-100">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-black text-stone-900">
                  {editingAddress ? 'Edit Delivery Address' : 'Add New Address'}
                </h2>
                <p className="text-xs text-stone-500 font-medium">Specify details for express drop-off.</p>
              </div>

              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Address Label</label>
                <select
                  value={addressForm.title}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">House / Flat / Shop No. *</label>
                  <input
                    type="text"
                    value={addressForm.house_no}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, house_no: e.target.value }))}
                    placeholder="e.g. Flat No. 402"
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Ward / Area / Locality</label>
                  <input
                    type="text"
                    value={addressForm.ward_no_name}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, ward_no_name: e.target.value }))}
                    placeholder="e.g. Sector 18"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Complete Landmark & Street Address</label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Nearby landmark, building name..."
                  rows={2}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                    required
                    placeholder="City"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">District</label>
                  <input
                    type="text"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="District"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">State *</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                    required
                    placeholder="State"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                    required
                    placeholder="6-digit pincode"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Receiver Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={Boolean(addressForm.is_default)}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-stone-700 font-bold text-xs">Make this my default checkout address</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 inline-flex items-center gap-2 font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {savingAddress && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingAddress ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ===================================================
          ORDER DETAILS & TRACKING MODAL
      =================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-stone-100"
          >
            <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-stone-900">
                  Order Details {getDisplayOrderId(selectedOrder)}
                </h2>
                <p className="text-xs text-stone-400 font-medium">
                  Placed on {formatDateTime(selectedOrder?.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs sm:text-sm">
              {/* TRACKING PROGRESS */}
              <div className="bg-stone-50/70 p-5 rounded-2xl border border-stone-100">
                <h3 className="font-black text-stone-900 mb-4 text-xs uppercase tracking-wider">Live Order Tracking</h3>
                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-[550px]">
                    {getTrackingSteps(selectedOrder).map((step, index, allSteps) => {
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex-1 relative">
                          <div className="flex items-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 shadow-2xs ${
                                step.completed || step.active
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-stone-300 text-stone-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            {index < allSteps.length - 1 && (
                              <div
                                className={`h-1 flex-1 mx-2 rounded-full ${
                                  step.completed ? 'bg-emerald-600' : 'bg-stone-200'
                                }`}
                              />
                            )}
                          </div>

                          <p
                            className={`text-xs mt-2.5 font-bold ${
                              step.active ? 'text-emerald-700' : 'text-stone-500'
                            }`}
                          >
                            {step.label}
                          </p>

                          {step.time && (
                            <p className="text-[10px] text-stone-400 mt-0.5 font-mono font-bold">
                              {step.time}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FULFILLMENT DURATION BANNER (When Delivered) */}
              {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && selectedOrder?.created_at && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
                      ✓
                    </div>
                    <div>
                      <p className="font-black text-sm">Lightning Fast Delivery Completed</p>
                      <p className="text-emerald-100 text-[11px]">Total turnaround time from placement to doorstep</p>
                    </div>
                  </div>
                  <div className="font-black text-emerald-900 bg-amber-300 px-3.5 py-1.5 rounded-xl shadow-2xs text-xs">
                    {calculateDeliveryDuration(selectedOrder.created_at, selectedOrder.delivered_at || selectedOrder.updated_at)}
                  </div>
                </div>
              )}

              {/* ITEMS IN MODAL */}
              <div>
                <h3 className="font-black text-stone-900 mb-3 text-xs uppercase tracking-wider">Ordered Products</h3>
                <div className="space-y-3">
                  {(Array.isArray(selectedOrder?.order_items) ? selectedOrder.order_items : []).map((item, index) => {
                    const product = item?.products;
                    const variant = findOrderItemVariant(item, product);
                    const image =
                      product?.image_url ||
                      product?.image ||
                      product?.images?.[0] ||
                      product?.gallery?.[0] ||
                      '';

                    return (
                      <div
                        key={item?.id || index}
                        className="flex items-center gap-4 border border-stone-200/80 rounded-2xl p-3.5 bg-white shadow-2xs"
                      >
                        <div className="w-14 h-14 rounded-xl bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 border border-stone-100">
                          {image ? (
                            <img src={image} alt={product?.name || 'Product'} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-6 h-6 text-stone-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-stone-900 text-sm truncate">
                            {product?.name || 'Product'}
                          </p>
                          {variant && (
                            <p className="text-xs text-stone-500 font-medium">{getVariantLabel(variant)}</p>
                          )}
                          <p className="text-xs text-stone-500 font-black mt-0.5">Qty: {Number(item?.quantity) || 1}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-stone-900 text-sm">{formatCurrency(item?.price)}</p>
                          <p className="text-xs text-stone-400 font-bold">{formatCurrency(getItemSubtotal(item))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ADDRESS & PAYMENT INFO (COD Only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70">
                  <h4 className="font-black text-stone-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Delivery Address
                  </h4>
                  <p className="text-stone-700 font-medium leading-relaxed text-xs">
                    {selectedOrder?.address || selectedOrder?.delivery_address || selectedOrder?.shipping_address || 'Address info unavailable'}
                  </p>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70">
                  <h4 className="font-black text-stone-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                    <CreditCard className="w-4 h-4 text-emerald-600" /> Payment Summary
                  </h4>
                  <p className="font-extrabold text-stone-900 text-sm">Cash on Delivery (COD)</p>
                  <p className={`font-black text-xs mt-1 ${normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Status: {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'Paid' : 'Pending Payment'}
                  </p>
                </div>
              </div>

              {/* BILLING BREAKDOWN */}
              <div className="border-t border-stone-200 pt-4 space-y-2.5 px-1">
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Items Subtotal</span>
                  <span>{formatCurrency(getOrderItemsSubtotal(selectedOrder))}</span>
                </div>

                {getDiscount(selectedOrder) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(getDiscount(selectedOrder))}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Delivery Charge</span>
                  <span>{getDeliveryCharge(selectedOrder) > 0 ? formatCurrency(getDeliveryCharge(selectedOrder)) : <strong className="text-emerald-600">FREE</strong>}</span>
                </div>

                {getTax(selectedOrder) > 0 && (
                  <div className="flex justify-between text-stone-600 font-medium">
                    <span>Taxes (GST)</span>
                    <span>{formatCurrency(getTax(selectedOrder))}</span>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t-2 border-stone-900 text-base font-black">
                  <span className="text-stone-900">Grand Total</span>
                  <span className="text-emerald-700 text-lg">{formatCurrency(getOrderTotal(selectedOrder))}</span>
                </div>
              </div>

              {/* MODAL ACTIONS (Restricted to Delivered Status) */}
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-stone-100">
                {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && (
                  <>
                    <button
                      onClick={() => setInvoiceOrder(selectedOrder)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-xs font-bold text-stone-800 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" /> Tax Invoice
                    </button>

                    <button
                      onClick={() => openRatingModal(selectedOrder)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100/60 text-xs font-bold cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" /> Rate Products
                    </button>

                    <button
                      onClick={() => handleReorder(selectedOrder)}
                      disabled={reorderingOrderId === getOrderId(selectedOrder)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      {reorderingOrderId === getOrderId(selectedOrder) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>Reorder Items</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}


      {/* ===================================================
          PER-PRODUCT RATING MODAL
      =================================================== */}

      {ratingOrder && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-stone-100">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-stone-900 text-base">Rate Ordered Products</h2>
                <p className="text-xs text-stone-500 font-medium">Order {getDisplayOrderId(ratingOrder)}</p>
              </div>

              <button
                onClick={() => setRatingOrder(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-stone-500 font-medium">
                Please provide a rating and review for each product included in this delivery.
              </p>

              <div className="space-y-5">
                {(Array.isArray(ratingOrder?.order_items) ? ratingOrder.order_items : []).map((item, index) => {
                  const product = item?.products;
                  const prodId = product?.id;
                  if (!prodId) return null;

                  const currentData = productRatingsMap[prodId] || { rating: 5, comment: '' };
                  const image = product?.image_url || product?.image || product?.images?.[0] || '';

                  return (
                    <div key={prodId || index} className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-stone-200">
                          {image ? (
                            <img src={image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-stone-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-stone-900 text-sm">{product?.name || 'Product'}</p>
                          <p className="text-xs text-stone-400 font-bold">Qty: {item.quantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleProductRatingChange(prodId, 'rating', star)}
                            className="cursor-pointer transition transform hover:scale-110"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= currentData.rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-black text-stone-700">{currentData.rating} / 5</span>
                      </div>

                      <input
                        type="text"
                        value={currentData.comment}
                        onChange={(e) => handleProductRatingChange(prodId, 'comment', e.target.value)}
                        placeholder="Write a quick review for this item..."
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setRatingOrder(null)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAllProductRatings}
                  disabled={savingRating}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {savingRating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit All Product Reviews
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ===================================================
          INVOICE MODAL
      =================================================== */}

      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

    </div>
  );
};

export default CustomerOrdersPage;