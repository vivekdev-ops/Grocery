// src/pages/CustomerOrdersPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../supabaseClient';
import StoreHeader from './store/StoreHeader';
import Footer from './Footer';
import InvoiceModal from './InvoiceModal';


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

  const [expandedOrders, setExpandedOrders] = useState({});

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
        <StoreHeader session={authUser} customerProfile={user} showSearch={false} />

        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            <p className="text-stone-500 font-bold">Loading...</p>
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
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50/50 to-white pb-28 md:pb-12 font-sans text-stone-900 selection:bg-emerald-500 selection:text-white text-xs">
      <StoreHeader session={authUser} customerProfile={user} showSearch={false} />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6">

       

        {/* =================================================
            FILTERS & SEARCH SECTION
        ================================================= */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-4 mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'active', label: 'Active' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-stone-400 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
              </select>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full pt-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-[calc(50%-2px)] w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, status, or item name..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-[calc(50%-2px)] text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>


        {/* =================================================
            ORDERS LIST SECTION
        ================================================= */}
        <section>
          {loadingOrders ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-stone-500 font-bold">Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs space-y-3">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-sm">No orders found</h3>
                <p className="text-stone-400 text-xs mt-1">Try adjusting your filters or search terms.</p>
              </div>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/')}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 cursor-pointer transition active:scale-95"
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
                const subtotal = getOrderItemsSubtotal(order);
                const total = getOrderTotal(order);
                const expanded = Boolean(expandedOrders[orderId]);
                const isDelivered = normalizeOrderStatus(status) === 'DELIVERED';
                const isCancelled = normalizeOrderStatus(status) === 'CANCELLED';
                const isPending = String(status).toLowerCase().trim() === 'pending' || String(status).toLowerCase().trim() === 'placed';

                return (
                  <motion.div
                    key={orderId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:shadow-md transition duration-300 overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            isDelivered ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            isCancelled ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            <Package className="w-6 h-6" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-stone-900 text-sm">
                                {getDisplayOrderId(order)}
                              </span>
                              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                isDelivered ? 'bg-emerald-100 text-emerald-800' : 
                                isCancelled ? 'bg-rose-100 text-rose-800' : 
                                'bg-amber-100 text-amber-800 animate-pulse'
                              }`}>
                                {formatStatus(status)}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1 font-medium">
                              <Clock size={12} /> {formatDateTime(order?.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-emerald-700 text-base">{formatCurrency(total)}</span>
                          <span className="text-[11px] text-stone-400 block font-bold">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* ── OTP BANNER ── */}
                      {!isDelivered && !isCancelled && (
                        <div className="mt-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-600" /> Delivery Verification OTP:
                          </span>
                          <span className="font-mono font-black text-sm text-emerald-700 tracking-widest bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                            {order?.otp || '----'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-stone-100 gap-2 flex-wrap">
                        <button
                          onClick={() => toggleOrder(orderId)}
                          className="text-xs text-stone-600 hover:text-emerald-700 inline-flex items-center gap-1.5 font-bold cursor-pointer bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-xl transition"
                        >
                          <span>{expanded ? 'Hide Items' : 'View Ordered Items'}</span>
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isPending && (
                            <button
                              onClick={() => handleCancelOrder(order)}
                              disabled={cancellingOrderId === orderId}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-black text-rose-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5 transition"
                            >
                              {cancellingOrderId === orderId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                              <span>Cancel Order</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-black cursor-pointer shadow-sm transition"
                          >
                            Track & Details
                          </button>

                          {isDelivered && (
                            <button
                              onClick={() => handleReorder(order)}
                              disabled={reorderingOrderId === orderId}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20 transition active:scale-95"
                            >
                              {reorderingOrderId === orderId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Reorder</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-stone-100 bg-stone-50/70 p-4 space-y-2.5"
                        >
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
                                className="bg-white rounded-2xl border border-stone-200/80 p-3 flex items-center gap-3.5 shadow-2xs"
                              >
                                <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 border border-stone-100">
                                  {image ? (
                                    <img src={image} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <Package className="w-5 h-5 text-stone-300" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-stone-900 text-xs truncate">
                                    {product?.name || 'Product'}
                                  </p>
                                  {variant && (
                                    <p className="text-[11px] text-emerald-700 font-extrabold mt-0.5">{getVariantLabel(variant)}</p>
                                  )}
                                  <p className="text-[10px] text-stone-400 font-bold mt-0.5">Quantity: {Number(item?.quantity) || 1}</p>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="font-black text-stone-900 text-xs">{formatCurrency(item?.price)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

      </main>


      {/* =========================================================
          MOBILE BOTTOM NAVIGATION BAR
      ========================================================= */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-1.5 cursor-pointer group"
            title="Home"
          >
            <div className="w-10 h-10 bg-stone-100 group-active:bg-stone-200 rounded-xl flex items-center justify-center">
              <Home size={18} className="text-stone-700" />
            </div>
          </button>

          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-1.5 cursor-pointer group"
            title="Orders"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <Package size={18} />
            </div>
          </button>
        </div>
      </div>


      <Footer />


      {/* ===================================================
          ORDER DETAILS & TRACKING MODAL
      =================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 text-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-stone-100"
          >
            <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-black text-stone-900 text-sm">
                  Order {getDisplayOrderId(selectedOrder)}
                </h2>
                <p className="text-[11px] text-stone-400 font-medium">
                  {formatDateTime(selectedOrder?.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* TRACKING PROGRESS */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <h3 className="font-black text-stone-900 mb-3 text-[11px] uppercase tracking-wider">Live Tracking Status</h3>
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
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                  : 'bg-white border-stone-300 text-stone-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            {index < allSteps.length - 1 && (
                              <div
                                className={`h-1 flex-1 mx-1.5 rounded-full ${
                                  step.completed ? 'bg-emerald-600' : 'bg-stone-200'
                                }`}
                              />
                            )}
                          </div>

                          <p
                            className={`text-[11px] mt-2 font-bold truncate ${
                              step.active ? 'text-emerald-700 font-black' : 'text-stone-500'
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
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600" /> Delivery Verification OTP:
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-700 tracking-widest bg-white px-4 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
                    {selectedOrder?.otp || '----'}
                  </span>
                </div>
              )}

              {/* FULFILLMENT DURATION */}
              {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && selectedOrder?.created_at && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                  <span className="font-black flex items-center gap-2 text-xs">
                    <CheckCircle2 size={18} /> Successfully delivered in {calculateDeliveryDuration(selectedOrder.created_at, selectedOrder.delivered_at || selectedOrder.updated_at)}
                  </span>
                </div>
              )}

              {/* ITEMS IN MODAL */}
              <div>
                <h3 className="font-black text-stone-900 mb-3 text-[11px] uppercase tracking-wider">Ordered Items</h3>
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

                    return (
                      <div
                        key={item?.id || index}
                        className="flex items-center gap-3.5 border border-stone-200/80 rounded-2xl p-3 bg-white shadow-2xs"
                      >
                        <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 border border-stone-100">
                          {image ? (
                            <img src={image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-stone-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-black text-stone-900 text-xs truncate">
                            {product?.name || 'Product'}
                          </p>
                          {variant && (
                            <p className="text-[11px] text-emerald-700 font-extrabold mt-0.5">{getVariantLabel(variant)}</p>
                          )}
                          <p className="text-[11px] text-stone-400 font-bold mt-0.5">Quantity: {Number(item?.quantity) || 1}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-stone-900 text-xs">{formatCurrency(item?.price)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ADDRESS & PAYMENT INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <h4 className="font-black text-stone-600 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivery Address
                  </h4>
                  <p className="text-stone-700 font-medium leading-relaxed text-xs">
                    {selectedOrder?.shipping_address || selectedOrder?.delivery_address || selectedOrder?.address || '-'}
                  </p>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                  <h4 className="font-black text-stone-600 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Payment Info
                  </h4>
                  <p className="font-black text-stone-900 text-xs">Cash on Delivery (COD)</p>
                  <p className={`font-black text-[11px] mt-0.5 ${normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Status: {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'Paid / Completed' : 'Pending Payment'}
                  </p>
                </div>
              </div>

              {/* BILLING BREAKDOWN */}
              <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/70 space-y-2">
                <div className="flex justify-between text-stone-600 font-medium text-xs">
                  <span>Items Subtotal</span>
                  <span>{formatCurrency(getOrderItemsSubtotal(selectedOrder))}</span>
                </div>

                {getDiscount(selectedOrder) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold text-xs">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(getDiscount(selectedOrder))}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600 font-medium text-xs">
                  <span>Delivery Charges</span>
                  <span>{getDeliveryCharge(selectedOrder) > 0 ? formatCurrency(getDeliveryCharge(selectedOrder)) : 'FREE'}</span>
                </div>

                <div className="flex justify-between pt-3 border-t border-stone-200 font-black text-sm">
                  <span className="text-stone-900">Total Amount</span>
                  <span className="text-emerald-700 text-base">{formatCurrency(getOrderTotal(selectedOrder))}</span>
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
                      <FileText className="w-4 h-4 text-emerald-600" /> Download Invoice
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
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-black cursor-pointer transition text-xs shadow-md shadow-emerald-600/20 active:scale-95"
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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 text-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-100"
          >
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-stone-900 text-sm">Rate & Review Products</h2>
                <p className="text-[11px] text-stone-400 font-medium">Order {getDisplayOrderId(ratingOrder)}</p>
              </div>

              <button
                onClick={() => setRatingOrder(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition"
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
                          <p className="font-black text-stone-900 text-xs truncate">{product?.name || 'Product'}</p>
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
                        className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-black inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition text-xs"
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