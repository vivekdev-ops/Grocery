// src/pages/CustomerOrdersPage.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Home,
  Loader2,
  Package,
  Phone,
  RefreshCw,
  Search,
  Star,
  X,
  ShoppingBag,
  Truck,
  CreditCard,
  Clock,
  ArrowRight,
  Ban,
  ShieldCheck,
  ExternalLink,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Layers,
  Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../supabaseClient';
import StoreHeader from './store/StoreHeader';
import Footer from './Footer';
import InvoiceModal from './InvoiceModal';
import PortalBottomNav from '../components/PortalBottomNav';
import CartDrawer from './store/CartDrawer';


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
  if (!status) return 'Placed';

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
  if (lower === 'shipped' || lower === 'out_for_delivery') return 'OUT_FOR_DELIVERY';
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
      label: 'Placed', 
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
      label: 'Prep', 
      icon: Package, 
      time: order?.preparing_at ? formatDateTime(order.preparing_at) : null
    },
    { 
      key: 'OUT_FOR_DELIVERY', 
      label: 'Dispatched', 
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
      { key: 'PLACED', label: 'Placed', icon: ShoppingBag, time: createdAt ? formatDateTime(createdAt) : null },
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
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
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

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, delivered, cancelled
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest

  const [ratingOrder, setRatingOrder] =
    useState(null);

  const [productRatingsMap, setProductRatingsMap] = useState({});

  const [savingRating, setSavingRating] =
    useState(false);

  const [invoiceOrder, setInvoiceOrder] =
    useState(null);

  const [reorderingOrderId, setReorderingOrderId] =
    useState(null);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Cart state for the bottom nav bar synchronization
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout and Address states for CartDrawer
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedAddressDistance, setSelectedAddressDistance] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddAddressBox, setShowAddAddressBox] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    title: 'Home',
    house_no: '',
    ward_no_name: '',
    city: 'Harraiya',
    district: 'Basti',
    state: 'Uttar Pradesh',
    pincode: '272155',
    phone: '',
    latitude: null,
    longitude: null
  });
  const [addressForm, setAddressForm] = useState({ phone: '', address: '' });
  const [checkingOut, setCheckingOut] = useState(false);


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
          .from('customer_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        const profile = profileData || {
          user_id: currentUser.id,
          full_name:
            currentUser.user_metadata?.full_name || '',
          phone:
            currentUser.user_metadata?.phone || '',
          interests:
            currentUser.user_metadata?.interests || '',
          avatar_url:
            currentUser.user_metadata?.avatar_url || '',
        };

        setUser(profile);

        await loadOrders(currentUser.email);
        await fetchSavedAddresses(currentUser.id);
        await fetchDeliveryRules();
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

    const handleCartUpdate = (e) => {
      if (e.detail) {
        setCart(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('cart_items');
          setCart(saved ? JSON.parse(saved) : []);
        } catch (err) {
          setCart([]);
        }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [navigate]);


  /* =======================================================
     LOAD ALL ORDERS WITH DECOUPLED STAFF PROFILE FETCHING
  ======================================================= */

  const loadOrders = async (emailOverride = null) => {
    const email =
      emailOverride ||
      authUser?.email ||
      user?.email;

    if (!email) return;

    try {
      setLoadingOrders(true);

      const { data: ordersData, error: ordersError } = await supabase
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

      if (ordersError) throw ordersError;

      const rawOrders = Array.isArray(ordersData) ? ordersData : [];

      // Collect all potential staff identifier keys across delivery columns
      const staffIds = new Set();
      rawOrders.forEach(o => {
        if (o.delivery_boy_id) staffIds.add(o.delivery_boy_id);
        if (o.delivery_partner_id) staffIds.add(o.delivery_partner_id);
        if (o.delivery_agent_id) staffIds.add(o.delivery_agent_id);
      });

      let staffMap = {};

      if (staffIds.size > 0) {
        const idsArray = Array.from(staffIds);
        const { data: staffData } = await supabase
          .from('staff_profiles')
          .select('id, user_id, full_name, name, phone, role')
          .or(`id.in.(${idsArray.join(',')}),user_id.in.(${idsArray.join(',')})`);

        if (staffData) {
          staffData.forEach(staff => {
            staffMap[staff.id] = staff;
            staffMap[staff.user_id] = staff;
          });
        }
      }

      const enrichedOrders = rawOrders.map(order => {
        const assignedKey = order.delivery_boy_id || order.delivery_partner_id || order.delivery_agent_id;
        return {
          ...order,
          staff_profiles: assignedKey ? staffMap[assignedKey] || null : null
        };
      });

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };


  /* =======================================================
     ADDRESS & CHECKOUT HELPERS
  ======================================================= */

  const fetchSavedAddresses = async (userId) => {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setSavedAddresses(data);
      handleSelectAddress(data[0]);
    }
  };

  const fetchDeliveryRules = async () => {
    const { data } = await supabase.from('delivery_rules').select('*');
    if (data) setDeliveryRules(data);
  };

  const handleSelectAddress = (addrObj) => {
    setSelectedAddressId(addrObj.id);
    setAddressForm(prev => ({ ...prev, phone: addrObj.phone, address: addrObj.address }));
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponInput.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        alert("Invalid or inactive coupon code.");
        return;
      }
      setAppliedCoupon(data);
      setCouponInput('');
      alert("Coupon applied successfully!");
    } catch (err) {
      alert("Failed to apply coupon.");
    }
  };

  const handleCheckout = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!authUser) { navigate('/login'); return; }

    if (!cart || cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setCheckingOut(true);
    try {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_email: authUser.email,
          customer_id: authUser.id,
          total_amount: cartTotal,
          status: 'pending',
          delivery_address: addressForm.address,
          phone: addressForm.phone,
          otp: generatedOtp,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: discountAmount,
          delivery_fee: deliveryFee,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item?.product?.id || item?.id || item?.product_id,
        variant_id: item?.variant?.id || null,
        variant_label: item?.variant?.unit_label || item?.variant?.label || null,
        quantity: Number(item?.quantity) || 1,
        price: Number(item?.price) || 0
      }));

      await supabase.from('order_items').insert(itemsToInsert);

      setCart([]);
      localStorage.removeItem('cart_items');
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
      window.dispatchEvent(new Event('storage'));
      setIsCartOpen(false);
      alert("Order placed successfully!");
      navigate('/account/orders');
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };


  /* =======================================================
     FILTERED & SORTED ORDERS
  ======================================================= */

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((order) => {
        const norm = normalizeOrderStatus(getOrderStatus(order));
        return norm !== 'DELIVERED' && norm !== 'CANCELLED';
      });
    } else if (statusFilter === 'delivered') {
      result = result.filter((order) => normalizeOrderStatus(getOrderStatus(order)) === 'DELIVERED');
    } else if (statusFilter === 'cancelled') {
      result = result.filter((order) => normalizeOrderStatus(getOrderStatus(order)) === 'CANCELLED');
    }

    // Search filter
    const term = String(searchTerm || '').trim().toLowerCase();
    if (term) {
      result = result.filter((order) => {
        const orderId = getDisplayOrderId(order).toLowerCase();
        const status = formatStatus(getOrderStatus(order)).toLowerCase();
        const items = Array.isArray(order?.order_items) ? order.order_items : [];
        const productText = items
          .map((item) => item?.products?.name || '')
          .join(' ')
          .toLowerCase();

        return (
          orderId.includes(term) ||
          status.includes(term) ||
          productText.includes(term)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a?.created_at || 0);
      const dateB = new Date(b?.created_at || 0);
      const totalA = getOrderTotal(a);
      const totalB = getOrderTotal(b);

      if (sortBy === 'oldest') {
        return dateA - dateB;
      } else if (sortBy === 'highest') {
        return totalB - totalA;
      } else {
        // newest default
        return dateB - dateA;
      }
    });

    return result;
  }, [orders, searchTerm, statusFilter, sortBy]);


  /* =======================================================
     CANCEL ORDER
  ======================================================= */

  const handleCancelOrder = async (order) => {
    if (!order) return;
    const orderId = getOrderId(order);
    const status = String(getOrderStatus(order)).toLowerCase().trim();

    if (status !== 'pending' && status !== 'placed') {
      alert('Orders can only be cancelled while pending.');
      return;
    }

    const confirmed = window.confirm('Cancel order?');
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

      alert('Cancelled.');
      setSelectedOrder(null);
      await loadOrders();
    } catch (error) {
      console.error('Cancel order error:', error);
      alert(`Error: ${error?.message || 'Failed'}`);
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
        alert('No items found.');
        return;
      }

      const cart = [...existingCart];

      let addedCount = 0;

      for (const orderItem of orderItems) {
        const product = orderItem?.products;

        if (!product?.id) {
          continue;
        }

        let matchedVariant =
          findOrderItemVariant(
            orderItem,
            product
          );

        if (!matchedVariant) {
          continue;
        }

        const currentStock =
          getVariantStock(matchedVariant);

        const currentPrice =
          getVariantPrice(matchedVariant);

        const currentMrp =
          getVariantMRP(matchedVariant);

        if (currentStock <= 0) {
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
        alert('Items unavailable.');
        return;
      }

      alert(`${addedCount} items added to cart.`);

      navigate('/');
    } catch (error) {
      console.error(
        'Reorder error:',
        error
      );

      alert(`Error: ${error?.message || 'Failed'}`);
    } finally {
      setReorderingOrderId(null);
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

    const userId = authUser?.id || user?.user_id;
    const userEmail = authUser?.email || 'customer@hub.com';

    if (!userId) {
      alert('Login required.');
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
        alert('No ratings.');
        return;
      }

      const { error } = await supabase
        .from('product_reviews')
        .insert(insertPayloads);

      if (error) throw error;

      alert('Submitted.');
      setRatingOrder(null);
      setProductRatingsMap({});
    } catch (error) {
      console.error('Review error:', error);
      alert(`Error: ${error?.message || 'Failed'}`);
    } finally {
      setSavingRating(false);
    }
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-xs">
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600 mx-auto mb-2" />
            <p className="text-stone-500 font-bold">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calculations for selected order modal
  const selectedOrderItems = Array.isArray(selectedOrder?.order_items) ? selectedOrder.order_items : [];
  
  const totalMrpSum = selectedOrderItems.reduce((sum, item) => {
    const product = item?.products;
    const variant = findOrderItemVariant(item, product);
    const itemPrice = Number(item?.price) || 0;
    const itemMrp = Number(variant?.mrp || item?.mrp || product?.mrp) || itemPrice;
    const qty = Number(item?.quantity) || 1;
    return sum + (itemMrp * qty);
  }, 0);

  const orderItemsSubtotal = getOrderItemsSubtotal(selectedOrder);
  const totalDiscountFromMrp = Math.max(0, totalMrpSum - orderItemsSubtotal);


  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-orange-50/25 to-amber-100/30 text-stone-900 pb-36 font-sans selection:bg-orange-600 selection:text-white text-xs">
      
      {/* Top Header matching dark orange aesthetic */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 md:px-12 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-md">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer border border-white/30"
          title="Back to Home"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" />
        </button>
        <div>
          <h1 className="font-black text-white text-sm md:text-base tracking-tight">Order History</h1>
          <p className="text-[10px] text-amber-100 font-medium">Track, manage and review your purchases</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* =================================================
            FILTERS & SEARCH SECTION (Grouped as Compact Icon Pills)
        ================================================= */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-950/5 p-3.5 sm:p-4 space-y-3">
          {/* Search Input Bar */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order by ID or Product Name..."
              className="w-full bg-stone-50/70 border-2 border-stone-200/80 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-500/10 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Status Filter Grouped Icons / Compact Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All', icon: Layers },
                { id: 'active', label: 'Active', icon: Clock },
                { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
                { id: 'cancelled', label: 'Cancelled', icon: Ban }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer whitespace-nowrap shadow-2xs inline-flex items-center gap-1.5 ${
                      statusFilter === tab.id
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-orange-600/20'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                    }`}
                  >
                    <IconComponent size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-stone-100 border-2 border-stone-200 rounded-xl px-3 py-1.5 text-[11px] font-bold text-stone-800 outline-none cursor-pointer focus:border-orange-600 transition"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
              </select>
            </div>
          </div>
        </div>


        {/* =================================================
            ORDERS LIST SECTION
        ================================================= */}
        <section>
          {loadingOrders ? (
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-orange-100 p-12 text-center shadow-xl">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
              <p className="text-stone-500 font-bold">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-orange-100 p-12 text-center shadow-xl space-y-3">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto border border-orange-100 shadow-inner">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-sm">No orders found</h3>
                <p className="text-stone-400 text-xs mt-1">Try adjusting your filters or search terms.</p>
              </div>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/')}
                  className="mt-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black shadow-lg shadow-orange-600/20 cursor-pointer transition active:scale-95 uppercase tracking-wider text-xs"
                >
                  Start Shopping
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const orderId = getOrderId(order);
                const status = getOrderStatus(order);
                const items = Array.isArray(order?.order_items) ? order.order_items : [];
                const total = getOrderTotal(order);
                const isDelivered = normalizeOrderStatus(status) === 'DELIVERED';
                const isCancelled = normalizeOrderStatus(status) === 'CANCELLED';
                const isPending = String(status).toLowerCase().trim() === 'pending' || String(status).toLowerCase().trim() === 'placed';

                // Display delivery duration or status message matching design style
                const deliveredAtTime = order?.delivered_at || order?.updated_at;
                const durationStr = calculateDeliveryDuration(order?.created_at, deliveredAtTime);
                const arrivalHeader = isDelivered 
                  ? (durationStr ? `Arrived in ${durationStr}` : 'Delivered Successfully') 
                  : isCancelled 
                  ? 'Order Cancelled' 
                  : formatStatus(status);

                return (
                  <div
                    key={orderId}
                    className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-950/5 hover:shadow-2xl transition duration-300 overflow-hidden p-5 space-y-4"
                  >
                    {/* Top Row: Icon Badge, Title, Subtitle, Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isDelivered ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                          isCancelled ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {isCancelled ? <X size={20} /> : <Check size={20} className="stroke-[3]" />}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm tracking-tight">
                            {arrivalHeader}
                          </h3>
                          <p className="text-[11px] text-stone-400 font-bold mt-0.5">
                            {formatCurrency(total)} • {formatDateTime(order?.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancellingOrderId === orderId}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[10px] font-black text-rose-600 disabled:opacity-50 cursor-pointer transition border border-rose-200"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-stone-400 hover:text-stone-700 cursor-pointer rounded-xl hover:bg-stone-100 transition"
                          title="Options"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Products Horizontal Scroll */}
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                      {items.map((item, index) => {
                        const product = item?.products;
                        const image =
                          product?.image_url ||
                          product?.image ||
                          product?.images?.[0] ||
                          product?.gallery?.[0] ||
                          '';

                        if (index >= 4 && items.length > 5) return null;

                        return (
                          <div
                            key={item?.id || index}
                            className="w-16 h-16 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-center p-2 shrink-0 relative shadow-2xs"
                            title={product?.name || 'Product'}
                          >
                            {image ? (
                              <img src={image} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-6 h-6 text-stone-300" />
                            )}
                            {item.quantity > 1 && (
                              <span className="absolute bottom-1 right-1 bg-slate-900 text-white font-black text-[9px] px-1.5 py-0.2 rounded-md shadow-2xs">
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {items.length > 5 && (
                        <div className="w-16 h-16 bg-orange-50 rounded-2xl border border-orange-200 flex items-center justify-center text-orange-700 font-black text-xs shrink-0 shadow-2xs">
                          +{items.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Bottom Split Buttons: Reorder | View Details */}
                    <div className="grid grid-cols-2 divide-x divide-stone-100 border-t border-stone-100 pt-3 text-center">
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingOrderId === orderId}
                        className="text-orange-600 hover:text-orange-700 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 py-1"
                      >
                        {reorderingOrderId === orderId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        <span>Reorder</span>
                      </button>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-orange-600 hover:text-orange-700 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 py-1"
                      >
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Global Bottom Navigation Bar */}
      <PortalBottomNav 
        totalItemsCount={totalItemsCount}
        totalPrice={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Cart Drawer Component */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        totalItemsCount={totalItemsCount}
        session={authUser ? { user: authUser } : null}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        handleSelectAddress={handleSelectAddress}
        showAddAddressBox={showAddAddressBox}
        setShowAddAddressBox={setShowAddAddressBox}
        newAddressForm={newAddressForm}
        setNewAddressForm={setNewAddressForm}
        detectCustomerLocation={() => {}}
        handleAddAddress={() => {}}
        handleDeleteAddress={() => {}}
        updateQuantity={() => {}}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        handleApplyCoupon={handleApplyCoupon}
        removeCoupon={() => { setAppliedCoupon(null); setDiscountAmount(0); }}
        cartSubtotal={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
        discountAmount={discountAmount}
        selectedAddressDistance={selectedAddressDistance}
        deliveryFee={deliveryFee}
        cartTotal={cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - discountAmount + deliveryFee}
        checkingOut={checkingOut}
        handleCheckout={handleCheckout}
        navigate={navigate}
        addToCart={() => {}}
      />

      {/* ===================================================
          ORDER DETAILS & TRACKING MODAL
      =================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 text-xs font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-orange-100"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-stone-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-base">
                  Order {getDisplayOrderId(selectedOrder)}
                </h2>
                <p className="text-[11px] text-stone-400 font-medium">
                  {formatDateTime(selectedOrder?.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* TRACKING PROGRESS */}
              <div className="bg-orange-50/30 p-4 rounded-3xl border border-orange-100">
                <h3 className="font-black text-slate-900 mb-3 text-[11px] uppercase tracking-wider">Live Tracking Status</h3>
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-[420px]">
                    {getTrackingSteps(selectedOrder).map((step, index, allSteps) => {
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex-1 relative">
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                                step.completed || step.active
                                  ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/30'
                                  : 'bg-white border-stone-300 text-stone-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            {index < allSteps.length - 1 && (
                              <div
                                className={`h-1 flex-1 mx-1.5 rounded-full ${
                                  step.completed ? 'bg-orange-600' : 'bg-stone-200'
                                }`}
                              />
                            )}
                          </div>

                          <p
                            className={`text-[11px] mt-2 font-bold truncate ${
                              step.active ? 'text-orange-700 font-black' : 'text-stone-500'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── OTP BANNER IN MODAL ── */}
              {normalizeOrderStatus(getOrderStatus(selectedOrder)) !== 'DELIVERED' && normalizeOrderStatus(getOrderStatus(selectedOrder)) !== 'CANCELLED' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-orange-600" /> Delivery Verification OTP:
                  </span>
                  <span className="font-mono font-black text-lg text-orange-700 tracking-widest bg-white px-4 py-1.5 rounded-xl border border-orange-300 shadow-xs">
                    {selectedOrder?.otp || '----'}
                  </span>
                </div>
              )}

              {/* FULFILLMENT DURATION */}
              {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && selectedOrder?.created_at && (
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <span className="font-black flex items-center gap-2 text-xs">
                    <CheckCircle2 size={18} /> Successfully delivered in {calculateDeliveryDuration(selectedOrder.created_at, selectedOrder.delivered_at || selectedOrder.updated_at)}
                  </span>
                </div>
              )}

              {/* ASSIGNED DELIVERY PARTNER CARD OR STATUS */}
              {selectedOrder?.delivery_boy_id || selectedOrder?.delivery_partner_id || selectedOrder?.delivery_agent_id ? (
                <div className="bg-orange-50/70 rounded-2xl p-4 border border-orange-200/80 space-y-2">
                  <h4 className="font-black text-orange-900 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <Truck className="w-3.5 h-3.5 text-orange-600" /> Assigned Delivery Partner
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 text-xs">
                        {selectedOrder?.staff_profiles?.full_name || selectedOrder?.staff_profiles?.name || 'Assigned Partner'}
                      </p>
                      <p className="text-stone-500 font-mono text-[11px] mt-0.5">
                        {selectedOrder?.staff_profiles?.phone || 'Contact number hidden'}
                      </p>
                    </div>

                    {selectedOrder?.staff_profiles?.phone && (
                      <a
                        href={`tel:${selectedOrder.staff_profiles.phone}`}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl font-black text-[11px] inline-flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Phone size={13} /> Call
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <h4 className="font-black text-stone-600 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <Truck className="w-3.5 h-3.5 text-orange-600" /> Delivery Partner Status
                  </h4>
                  <p className="text-stone-600 font-medium text-xs">
                    Delivery boy will be assigned soon.
                  </p>
                </div>
              )}

              {/* ITEMS IN MODAL */}
              <div>
                <h3 className="font-black text-slate-900 mb-3 text-[11px] uppercase tracking-wider">Ordered Items</h3>
                <div className="space-y-2.5">
                  {(Array.isArray(selectedOrder?.order_items) ? selectedOrder.order_items : []).map((item, index) => {
                    const product = item?.products;
                    const variant = findOrderItemVariant(item, product);
                    const image =
                      product?.image_url ||
                      product?.image ||
                      product?.images?.[0] ||
                      product?.gallery?.[0] ||
                      '';

                    const itemPrice = Number(item?.price) || 0;
                    const itemMrp = Number(variant?.mrp || item?.mrp || product?.mrp) || itemPrice;
                    const hasMrp = itemMrp > itemPrice;
                    const discountPct = hasMrp ? Math.round(((itemMrp - itemPrice) / itemMrp) * 100) : 0;
                    const qty = Number(item?.quantity) || 1;

                    return (
                      <div
                        key={item?.id || index}
                        className="flex items-center gap-3.5 border border-orange-100 rounded-2xl p-3 bg-orange-50/20 shadow-2xs"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-orange-200">
                          {image ? (
                            <img src={image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-stone-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-xs truncate">
                            {product?.name || 'Product'}
                          </p>
                          {variant && (
                            <p className="text-[11px] text-orange-700 font-extrabold mt-0.5">{getVariantLabel(variant)}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-stone-500 font-medium text-[11px]">Qty: {qty}</span>
                            <span>•</span>
                            <span className="font-black text-slate-900 text-[11px]">{formatCurrency(itemPrice * qty)}</span>
                            {hasMrp && (
                              <span className="text-stone-400 line-through text-[10px] font-bold">{formatCurrency(itemMrp * qty)}</span>
                            )}
                            {discountPct > 0 && (
                              <span className="text-[9px] text-orange-700 font-black bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                                {discountPct}% OFF
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-slate-900 text-xs">{formatCurrency(itemPrice * qty)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

               {/* BILLING BREAKDOWN */}
              <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                <div className="flex justify-between text-stone-600 font-medium text-xs">
                  <span>Items Subtotal (MRP)</span>
                  <span>{formatCurrency(totalMrpSum)}</span>
                </div>

                <div className="flex justify-between text-orange-600 font-bold text-xs">
                  <span>Product Discount</span>
                  <span>-{formatCurrency(totalDiscountFromMrp)}</span>
                </div>

                {selectedOrder?.coupon_code && (
                  <div className="flex justify-between items-center bg-orange-50 px-3 py-2 rounded-2xl border border-orange-200 text-orange-900">
                    <span className="font-bold flex items-center gap-1.5">
                      <Tag size={12} className="text-orange-600" /> Coupon ({selectedOrder.coupon_code})
                    </span>
                    <span className="font-black">-{formatCurrency(getDiscount(selectedOrder))}</span>
                  </div>
                )}

                {!selectedOrder?.coupon_code && getDiscount(selectedOrder) > 0 && (
                  <div className="flex justify-between text-orange-600 font-bold text-xs">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(getDiscount(selectedOrder))}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600 font-medium text-xs">
                  <span>Delivery Charges</span>
                  <span>{getDeliveryCharge(selectedOrder) > 0 ? formatCurrency(getDeliveryCharge(selectedOrder)) : 'FREE'}</span>
                </div>

                <div className="flex justify-between pt-3 border-t border-stone-200 font-black text-sm">
                  <span className="text-slate-900">Total Amount</span>
                  <span className="text-orange-600 text-base font-black">{formatCurrency(getOrderTotal(selectedOrder))}</span>
                </div>
              </div>

              {/* ADDRESS & PAYMENT INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <h4 className="font-black text-stone-600 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" /> Delivery Address
                  </h4>
                  <p className="text-stone-700 font-medium leading-relaxed text-xs">
                    {selectedOrder?.shipping_address || selectedOrder?.delivery_address || selectedOrder?.address || '-'}
                  </p>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <h4 className="font-black text-stone-600 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5 text-orange-600" /> Payment Info
                  </h4>
                  <p className="font-black text-slate-900 text-xs">Cash on Delivery (COD)</p>
                  <p className={`font-black text-[11px] mt-0.5 ${normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'text-orange-600' : 'text-amber-700'}`}>
                    Status: {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'Paid / Completed' : 'Pending Payment'}
                  </p>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && (
                  <>
                    <button
                      onClick={() => setInvoiceOrder(selectedOrder)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 font-black text-stone-800 cursor-pointer transition text-xs shadow-2xs"
                    >
                      <FileText className="w-4 h-4 text-orange-600" /> Download Invoice
                    </button>

                    <button
                      onClick={() => openRatingModal(selectedOrder)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-black cursor-pointer transition text-xs shadow-2xs"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" /> Rate Order
                    </button>

                    <button
                      onClick={() => handleReorder(selectedOrder)}
                      disabled={reorderingOrderId === getOrderId(selectedOrder)}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white disabled:opacity-50 font-black cursor-pointer transition text-xs shadow-md shadow-orange-600/20 active:scale-95"
                    >
                      {reorderingOrderId === getOrderId(selectedOrder) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>Reorder All</span>
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
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 text-xs font-sans">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-orange-100"
          >
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-slate-900 text-sm">Rate & Review Products</h2>
                <p className="text-[11px] text-stone-400 font-medium">Order {getDisplayOrderId(ratingOrder)}</p>
              </div>

              <button
                onClick={() => setRatingOrder(null)}
                className="w-9 h-9 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {(Array.isArray(ratingOrder?.order_items) ? ratingOrder.order_items : []).map((item, index) => {
                  const product = item?.products;
                  const prodId = product?.id;
                  if (!prodId) return null;

                  const currentData = productRatingsMap[prodId] || { rating: 5, comment: '' };
                  const image = product?.image_url || product?.image || product?.images?.[0] || '';

                  return (
                    <div key={prodId || index} className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-stone-200 shadow-2xs">
                          {image ? (
                            <img src={image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-stone-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-xs truncate">{product?.name || 'Product'}</p>
                          <p className="text-[11px] text-stone-400 font-bold mt-0.5">Quantity: {item.quantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleProductRatingChange(prodId, 'rating', star)}
                            className="cursor-pointer hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= currentData.rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-black text-stone-700 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg">{currentData.rating}/5 Stars</span>
                      </div>

                      <input
                        type="text"
                        value={currentData.comment}
                        onChange={(e) => handleProductRatingChange(prodId, 'comment', e.target.value)}
                        placeholder="Write a helpful review for this product..."
                        className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 font-medium transition"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setRatingOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 font-black text-stone-700 cursor-pointer hover:bg-stone-100 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAllProductRatings}
                  disabled={savingRating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white disabled:opacity-50 font-black inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20 transition text-xs"
                >
                  {savingRating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit All Reviews
                </button>
              </div>
            </div>
          </motion.div>
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

CustomerOrdersPage.displayName = 'CustomerOrdersPage';

export default CustomerOrdersPage;