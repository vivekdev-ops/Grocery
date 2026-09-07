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
  ShieldCheck,
  ExternalLink,
  Camera,
  Upload
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
    interests: '',
    avatar_url: '',
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

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

        setProfileForm({
          full_name:
            profile.full_name ||
            currentUser.user_metadata?.full_name ||
            '',
          phone:
            profile.phone ||
            currentUser.user_metadata?.phone ||
            '',
          interests:
            profile.interests ||
            currentUser.user_metadata?.interests ||
            '',
          avatar_url:
            profile.avatar_url ||
            currentUser.user_metadata?.avatar_url ||
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
    const ownerUserId = overrideUserId || authUser?.id || user?.user_id;

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
     AVATAR UPLOAD
  ======================================================= */

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !authUser?.id) return;

    try {
      setUploadingAvatar(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result;
          setProfileForm((prev) => ({ ...prev, avatar_url: base64String }));
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: publicURLData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicURLData?.publicUrl || '';
      setProfileForm((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Upload failed.');
    } finally {
      setUploadingAvatar(false);
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

    const ownerUserId = authUser?.id || user?.user_id;

    if (!ownerUserId) {
      alert('Login required.');
      return;
    }

    if (
      !addressForm.house_no?.trim() ||
      !addressForm.city?.trim() ||
      !addressForm.state?.trim() ||
      !addressForm.pincode?.trim()
    ) {
      alert('Fill required fields.');
      return;
    }

    if (
      !/^\d{6}$/.test(
        String(addressForm.pincode).trim()
      )
    ) {
      alert('Invalid pincode.');
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

        alert('Updated.');
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

        alert('Saved.');
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

      alert(`Error: ${error?.message || 'Failed'}`);
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
      window.confirm('Delete address?');

    if (!confirmed) return;

    const ownerUserId = authUser?.id || user?.user_id;

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

      alert('Deleted.');
    } catch (error) {
      console.error(
        'Delete address error:',
        error
      );

      alert(`Error: ${error?.message || 'Failed'}`);
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

    const ownerUserId = authUser?.id || user?.user_id;

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

      alert(`Error: ${error?.message || 'Failed'}`);
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
        user_id: authUser.id,
        full_name: profileForm.full_name?.trim() || null,
        phone: profileForm.phone?.trim() || null,
        interests: profileForm.interests?.trim() || null,
        avatar_url: profileForm.avatar_url?.trim() || null,
      };

      const { data, error } = await supabase
        .from('customer_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      setUser((prev) => ({
        ...prev,
        ...data,
      }));

      setEditingProfile(false);

      alert('Updated.');
    } catch (error) {
      console.error('Profile update error:', error);
      alert(`Error: ${error?.message || 'Failed'}`);
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
    <div className="min-h-screen bg-stone-50 pb-28 md:pb-12 font-sans text-stone-900 selection:bg-emerald-500 selection:text-white text-xs">
      <StoreHeader session={authUser} customerProfile={user} showSearch={false} />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* =================================================
            TAB NAVIGATION BUTTONS
        ================================================= */}
        <div className="bg-white rounded-2xl border border-stone-200 p-1.5 mb-4 shadow-xs flex flex-row gap-1.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
            title="Orders"
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Orders</span>
            <span className="opacity-80">({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black transition-all cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
            title="Addresses"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Addresses</span>
            <span className="opacity-80">({addresses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-black transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
            title="Profile"
          >
            <UserCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Profile</span>
          </button>
        </div>


        {/* =================================================
            TAB CONTENT: PROFILE (WITH AVATAR & EXTRA SETTINGS)
        ================================================= */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.section
              key="profile"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-stone-200 shadow-xs mb-4 overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-2 bg-stone-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <UserCircle className="w-4 h-4" />
                  </div>
                  <h2 className="font-black text-stone-900">Profile Settings</h2>
                </div>

                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-5">
                {editingProfile ? (
                  <div className="space-y-4 max-w-md">
                    {/* AVATAR UPLOAD SECTION */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                        {profileForm.avatar_url ? (
                          <img src={profileForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-8 h-8 text-stone-400" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition shadow-2xs">
                          <Upload size={12} /> {uploadingAvatar ? 'Uploading...' : 'Upload Picture'}
                          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </label>
                        <p className="text-[10px] text-stone-400 font-medium">PNG, JPG up to 5MB</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Name</label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        className="w-full border border-stone-200 bg-stone-50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                        maxLength={10}
                        className="w-full border border-stone-200 bg-stone-50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Interests</label>
                      <input
                        type="text"
                        value={profileForm.interests}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, interests: e.target.value }))}
                        placeholder="e.g. Groceries, Organic"
                        className="w-full border border-stone-200 bg-stone-50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        value={authUser?.email || ''}
                        disabled
                        className="w-full border border-stone-200 bg-stone-100 rounded-xl px-3 py-2 text-xs text-stone-500 cursor-not-allowed font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProfileSave}
                        disabled={savingProfile}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 inline-flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {savingProfile && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-8 h-8 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-stone-900 text-sm">{user?.full_name || 'Customer'}</p>
                        <p className="text-[11px] text-stone-400 font-medium">{authUser?.email || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <p className="text-stone-400 text-[10px] font-black uppercase mb-0.5">Phone</p>
                        <p className="font-bold text-stone-900">{user?.phone || 'Not provided'}</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <p className="text-stone-400 text-[10px] font-black uppercase mb-0.5">Interests</p>
                        <p className="font-bold text-stone-900">{user?.interests || 'Not provided'}</p>
                      </div>
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
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl border border-stone-200 shadow-xs mb-4 overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-2 bg-stone-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h2 className="font-black text-stone-900">Saved Addresses</h2>
                </div>

                <button
                  onClick={handleAddAddress}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="p-4 sm:p-5">
                {addresses.length === 0 ? (
                  <div className="text-center py-10 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <MapPin className="w-8 h-8 text-stone-300 mx-auto mb-1.5" />
                    <p className="text-stone-600 font-bold">No saved addresses</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border rounded-xl p-3.5 transition-all relative ${
                          address.is_default
                            ? 'border-blue-500 bg-blue-50/20'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-black text-stone-900">
                              {address.title || 'Address'}
                            </span>
                            {address.is_default && (
                              <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-600 text-white font-black">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address)}
                              disabled={deletingAddressId === address.id}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                              title="Delete"
                            >
                              {deletingAddressId === address.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1 text-stone-600">
                          <p className="font-medium">
                            {[address.house_no, address.ward_no_name, address.address].filter(Boolean).join(', ')}
                          </p>
                          <p className="text-stone-400">
                            {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                          </p>
                          {address.phone && (
                            <p className="text-stone-700 flex items-center gap-1 pt-0.5 font-bold">
                              <Phone className="w-3 h-3 text-blue-600" /> {address.phone}
                            </p>
                          )}
                        </div>

                        {!address.is_default && (
                          <div className="mt-3 pt-2 border-t border-stone-100 flex justify-end">
                            <button
                              onClick={() => handleSetDefaultAddress(address)}
                              className="text-[11px] text-blue-600 hover:text-blue-700 font-black cursor-pointer inline-flex items-center gap-1"
                            >
                              Set Default <ArrowRight size={11} />
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
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-black text-stone-900 text-sm">My Orders</h2>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search orders..."
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>


              {loadingOrders ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                  <p className="text-stone-500 font-bold">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                  <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="font-black text-stone-900">No orders found</p>
                  {!searchTerm && (
                    <button
                      onClick={() => navigate('/')}
                      className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      Shop Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
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
                      <div
                        key={orderId}
                        className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden"
                      >
                        <div className="p-3.5 sm:p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-stone-900">
                                    {getDisplayOrderId(order)}
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${
                                    isDelivered ? 'bg-emerald-100 text-emerald-800' : isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {formatStatus(status)}
                                  </span>
                                </div>
                                <p className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1 font-medium">
                                  <Clock size={11} /> {formatDateTime(order?.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-emerald-700 text-sm">{formatCurrency(total)}</span>
                              <span className="text-[10px] text-stone-400 block font-medium">{items.length} items</span>
                            </div>
                          </div>

                          {/* ── OTP BANNER ── */}
                          {!isDelivered && !isCancelled && (
                            <div className="mt-3 bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                                <ShieldCheck size={12} /> OTP:
                              </span>
                              <span className="font-mono font-black text-sm text-emerald-700 tracking-wider">
                                {order?.otp || '----'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 gap-2 flex-wrap">
                            <button
                              onClick={() => toggleOrder(orderId)}
                              className="text-[11px] text-stone-600 hover:text-emerald-700 inline-flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <span>{expanded ? 'Hide Items' : 'View Items'}</span>
                              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isPending && (
                                <button
                                  onClick={() => handleCancelOrder(order)}
                                  disabled={cancellingOrderId === orderId}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[11px] font-black text-rose-700 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                                >
                                  {cancellingOrderId === orderId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                                  <span>Cancel</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-[11px] font-black text-stone-800 cursor-pointer"
                              >
                                Track / Details
                              </button>

                              {isDelivered && (
                                <button
                                  onClick={() => handleReorder(order)}
                                  disabled={reorderingOrderId === orderId}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black disabled:opacity-50 cursor-pointer"
                                >
                                  {reorderingOrderId === orderId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  <span>Reorder</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t border-stone-100 bg-stone-50/70 p-3 space-y-2">
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
                                  className="bg-white rounded-xl border border-stone-200/80 p-2.5 flex items-center gap-3"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 border border-stone-100">
                                    {image ? (
                                      <img src={image} alt="" className="w-full h-full object-contain" />
                                    ) : (
                                      <Package className="w-4 h-4 text-stone-300" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-stone-900 truncate">
                                      {product?.name || 'Product'}
                                    </p>
                                    {variant && (
                                      <p className="text-[10px] text-stone-500 font-medium">{getVariantLabel(variant)}</p>
                                    )}
                                    <p className="text-[10px] text-stone-400 font-bold">Qty: {Number(item?.quantity) || 1}</p>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <p className="font-black text-stone-900">{formatCurrency(item?.price)}</p>
                                  </div>
                                </div>
                              );
                            })}
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
            onClick={() => { setActiveTab('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-1.5 cursor-pointer group"
            title="Orders"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
              <Package size={18} />
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('addresses'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-1.5 cursor-pointer group"
            title="Addresses"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'addresses' ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
              <MapPin size={18} />
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex flex-col items-center p-1.5 cursor-pointer group"
            title="Profile"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'profile' ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
              <UserCircle size={18} />
            </div>
          </button>
        </div>
      </div>


      <Footer />


      {/* ===================================================
          ADDRESS MODAL
      =================================================== */}

      {showAddressForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 text-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-100">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="font-black text-stone-900">
                {editingAddress ? 'Edit Address' : 'Add Address'}
              </h2>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="p-4 space-y-3">
              <div>
                <label className="block font-bold text-stone-600 mb-1">Label</label>
                <select
                  value={addressForm.title}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">House / Flat *</label>
                  <input
                    type="text"
                    value={addressForm.house_no}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, house_no: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={addressForm.ward_no_name}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, ward_no_name: e.target.value }))}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-600 mb-1">Landmark / Street</label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">State *</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Pincode *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(addressForm.is_default)}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-blue-600"
                />
                <span className="text-stone-700 font-bold">Default Address</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-4.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 text-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-stone-100"
          >
            <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="font-black text-stone-900">
                  Order {getDisplayOrderId(selectedOrder)}
                </h2>
                <p className="text-[10px] text-stone-400">
                  {formatDateTime(selectedOrder?.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* TRACKING PROGRESS */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <h3 className="font-black text-stone-900 mb-3 text-[10px] uppercase">Tracking</h3>
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-[400px]">
                    {getTrackingSteps(selectedOrder).map((step, index, allSteps) => {
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex-1 relative">
                          <div className="flex items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${
                                step.completed || step.active
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-stone-300 text-stone-400'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                            </div>

                            {index < allSteps.length - 1 && (
                              <div
                                className={`h-0.5 flex-1 mx-1 rounded-full ${
                                  step.completed ? 'bg-emerald-600' : 'bg-stone-200'
                                }`}
                              />
                            )}
                          </div>

                          <p
                            className={`text-[10px] mt-1.5 font-bold truncate ${
                              step.active ? 'text-emerald-700' : 'text-stone-500'
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
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                    <ShieldCheck size={13} /> Delivery OTP:
                  </span>
                  <span className="font-mono font-black text-base text-emerald-700 tracking-wider">
                    {selectedOrder?.otp || '----'}
                  </span>
                </div>
              )}

              {/* FULFILLMENT DURATION */}
              {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && selectedOrder?.created_at && (
                <div className="bg-emerald-600 text-white rounded-xl p-3 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <Check size={14} /> Delivered in {calculateDeliveryDuration(selectedOrder.created_at, selectedOrder.delivered_at || selectedOrder.updated_at)}
                  </span>
                </div>
              )}

              {/* ITEMS IN MODAL */}
              <div>
                <h3 className="font-black text-stone-900 mb-2 text-[10px] uppercase">Items</h3>
                <div className="space-y-2">
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
                        className="flex items-center gap-3 border border-stone-200/80 rounded-xl p-2.5 bg-white"
                      >
                        <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center overflow-hidden shrink-0 border border-stone-100">
                          {image ? (
                            <img src={image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-4 h-4 text-stone-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-900 truncate">
                            {product?.name || 'Product'}
                          </p>
                          {variant && (
                            <p className="text-[10px] text-stone-500 font-medium">{getVariantLabel(variant)}</p>
                          )}
                          <p className="text-[10px] text-stone-400 font-bold">Qty: {Number(item?.quantity) || 1}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-black text-stone-900">{formatCurrency(item?.price)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ADDRESS & PAYMENT INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
                  <h4 className="font-black text-stone-600 mb-1 flex items-center gap-1 text-[10px] uppercase">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Address
                  </h4>
                  <p className="text-stone-700 font-medium leading-relaxed">
                    {selectedOrder?.shipping_address || selectedOrder?.delivery_address || selectedOrder?.address || '-'}
                  </p>
                </div>

                <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
                  <h4 className="font-black text-stone-600 mb-1 flex items-center gap-1 text-[10px] uppercase">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Payment
                  </h4>
                  <p className="font-bold text-stone-900">COD</p>
                  <p className={`font-black text-[10px] mt-0.5 ${normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* BILLING BREAKDOWN */}
              <div className="border-t border-stone-200 pt-3 space-y-1.5 px-0.5">
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Subtotal</span>
                  <span>{formatCurrency(getOrderItemsSubtotal(selectedOrder))}</span>
                </div>

                {getDiscount(selectedOrder) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>-{formatCurrency(getDiscount(selectedOrder))}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600 font-medium">
                  <span>Delivery</span>
                  <span>{getDeliveryCharge(selectedOrder) > 0 ? formatCurrency(getDeliveryCharge(selectedOrder)) : 'FREE'}</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-stone-200 font-black text-sm">
                  <span>Total</span>
                  <span className="text-emerald-700">{formatCurrency(getOrderTotal(selectedOrder))}</span>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-stone-100">
                {normalizeOrderStatus(getOrderStatus(selectedOrder)) === 'DELIVERED' && (
                  <>
                    <button
                      onClick={() => setInvoiceOrder(selectedOrder)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 font-bold text-stone-800 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" /> Invoice
                    </button>

                    <button
                      onClick={() => openRatingModal(selectedOrder)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Rate
                    </button>

                    <button
                      onClick={() => handleReorder(selectedOrder)}
                      disabled={reorderingOrderId === getOrderId(selectedOrder)}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-bold cursor-pointer"
                    >
                      {reorderingOrderId === getOrderId(selectedOrder) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Reorder</span>
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
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 text-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-100">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-stone-900">Rate Products</h2>
                <p className="text-[10px] text-stone-400">Order {getDisplayOrderId(ratingOrder)}</p>
              </div>

              <button
                onClick={() => setRatingOrder(null)}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-3">
                {(Array.isArray(ratingOrder?.order_items) ? ratingOrder.order_items : []).map((item, index) => {
                  const product = item?.products;
                  const prodId = product?.id;
                  if (!prodId) return null;

                  const currentData = productRatingsMap[prodId] || { rating: 5, comment: '' };
                  const image = product?.image_url || product?.image || product?.images?.[0] || '';

                  return (
                    <div key={prodId || index} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 border border-stone-200">
                          {image ? (
                            <img src={image} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-4 h-4 text-stone-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-stone-900 truncate">{product?.name || 'Product'}</p>
                          <p className="text-[10px] text-stone-400">Qty: {item.quantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleProductRatingChange(prodId, 'rating', star)}
                            className="cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= currentData.rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-1 text-[11px] font-black text-stone-700">{currentData.rating}/5</span>
                      </div>

                      <input
                        type="text"
                        value={currentData.comment}
                        onChange={(e) => handleProductRatingChange(prodId, 'comment', e.target.value)}
                        placeholder="Write a review..."
                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  onClick={() => setRatingOrder(null)}
                  className="px-3.5 py-2 rounded-xl border border-stone-200 font-bold text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAllProductRatings}
                  disabled={savingRating}
                  className="px-4.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {savingRating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Reviews
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

CustomerOrdersPage.displayName = 'CustomerOrdersPage';

export default CustomerOrdersPage;