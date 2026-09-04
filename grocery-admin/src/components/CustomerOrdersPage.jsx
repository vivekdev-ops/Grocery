import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChevronRight,
  Edit3,
  Trash2,
  Plus,
  Heart,
  Star,
  Camera,
  ShoppingBag,
  ArrowLeft,
  RefreshCw,
  Search,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Receipt,
  CircleAlert,
  Navigation,
  Loader2,
  X,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import StoreHeader from './store/StoreHeader';
import Footer from './Footer';
import InvoiceModal from './InvoiceModal';


/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '₹0.00';
  }

  return `₹${amount.toFixed(2)}`;
};


const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};


const formatDateTime = (dateValue) => {
  if (!dateValue) return 'N/A';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


const formatStatus = (value) => {
  if (!value) return 'Placed';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


/* ============================================================
   ORDER ID
============================================================ */

const getOrderId = (order) => {
  if (!order) return '';

  return (
    order.order_number ||
    order.order_id ||
    order.id ||
    ''
  );
};


const getDisplayOrderId = (order) => {
  const id = getOrderId(order);

  if (!id) {
    return 'N/A';
  }

  const stringId = String(id);

  /*
   * If database already has a business order number such as:
   * ORD-20260904-0001
   * ORD123456
   * then display it directly.
   */
  if (
    stringId.toUpperCase().startsWith('ORD')
  ) {
    return stringId.toUpperCase();
  }

  /*
   * If order_number exists, use it directly.
   */
  if (order.order_number) {
    return String(order.order_number);
  }

  /*
   * UUID fallback.
   */
  return `ORD${stringId
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()}`;
};


/* ============================================================
   ORDER STATUS / TRACKING
============================================================ */

const getOrderStatus = (order) => {
  if (!order) {
    return 'PLACED';
  }

  return String(
    order.tracking_status ||
    order.status ||
    'PLACED'
  ).toUpperCase();
};


const getTrackingSteps = (order) => {
  const status = getOrderStatus(order);
  const normalizedStatus = status
    .toLowerCase()
    .replace(/\s+/g, '_');

  const steps = [
    {
      key: 'placed',
      label: 'Order Placed',
      description: 'Your order has been placed',
      icon: Package,
    },
    {
      key: 'confirmed',
      label: 'Order Confirmed',
      description: 'Your order has been confirmed',
      icon: CheckCircle2,
    },
    {
      key: 'preparing',
      label: 'Preparing',
      description: 'Your items are being prepared',
      icon: ShoppingBag,
    },
    {
      key: 'ready_for_pickup',
      label: 'Ready for Pickup',
      description: 'Order is ready for delivery',
      icon: Package,
    },
    {
      key: 'out_for_delivery',
      label: 'Out for Delivery',
      description: 'Delivery partner is on the way',
      icon: Truck,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: 'Order delivered successfully',
      icon: CheckCircle2,
    },
  ];

  const statusIndexMap = {
    placed: 0,
    pending: 0,

    confirmed: 1,

    preparing: 2,

    ready: 3,
    ready_for_pickup: 3,

    out_for_delivery: 4,
    outfordelivery: 4,
    shipped: 4,
    dispatched: 4,

    delivered: 5,
    completed: 5,
  };

  if (
    normalizedStatus === 'cancelled' ||
    normalizedStatus === 'canceled'
  ) {
    return {
      cancelled: true,
      currentIndex: -1,
      steps,
    };
  }

  let currentIndex = statusIndexMap[normalizedStatus];

  if (currentIndex === undefined) {
    currentIndex = 0;
  }

  return {
    cancelled: false,
    currentIndex,
    steps,
  };
};


/* ============================================================
   VARIANT HELPERS
============================================================ */

const getProductVariants = (product) => {
  if (!product) {
    return [];
  }

  /*
   * Preferred:
   * relational product_variants table
   */
  if (
    Array.isArray(product.product_variants) &&
    product.product_variants.length > 0
  ) {
    return product.product_variants;
  }

  /*
   * Backward compatibility:
   * JSONB variants field
   */
  if (Array.isArray(product.variants)) {
    return product.variants;
  }

  return [];
};


const getVariantLabel = (variant) => {
  if (!variant) return '';

  return (
    variant.unit_label ||
    variant.label ||
    variant.unit ||
    ''
  );
};


const getVariantPrice = (variant) => {
  if (!variant) return 0;

  const price = Number(variant.price);

  return Number.isFinite(price) ? price : 0;
};


const getVariantMRP = (variant) => {
  if (!variant) return 0;

  const mrp = Number(variant.mrp);

  return Number.isFinite(mrp) ? mrp : 0;
};


const getVariantStock = (variant) => {
  if (!variant) return 0;

  const stock = Number(variant.stock);

  return Number.isFinite(stock) ? stock : 0;
};


/* ============================================================
   FIND ORDER ITEM VARIANT
============================================================ */

const findOrderItemVariant = (item) => {
  if (!item?.products) {
    return null;
  }

  const variants = getProductVariants(item.products);

  if (!variants.length) {
    return null;
  }

  /*
   * First priority:
   * variant_id stored in order_items
   */
  if (item.variant_id) {
    const matchedById = variants.find(
      (variant) =>
        String(variant.id) === String(item.variant_id)
    );

    if (matchedById) {
      return matchedById;
    }
  }

  /*
   * Second priority:
   * variant label
   */
  if (item.variant_label) {
    const matchedByLabel = variants.find(
      (variant) =>
        String(getVariantLabel(variant)).toLowerCase() ===
        String(item.variant_label).toLowerCase()
    );

    if (matchedByLabel) {
      return matchedByLabel;
    }
  }

  /*
   * Third priority:
   * Match historical price against current variant.
   *
   * This is only for finding the variant.
   * We NEVER replace the historical order price.
   */
  if (item.price !== null && item.price !== undefined) {
    const historicalPrice = Number(item.price);

    const matchedByPrice = variants.find(
      (variant) =>
        Number(variant.price) === historicalPrice
    );

    if (matchedByPrice) {
      return matchedByPrice;
    }
  }

  return null;
};


/* ============================================================
   CHARGES
============================================================ */

const getDeliveryCharge = (order) => {
  if (!order) {
    return 0;
  }

  const possibleFields = [
    order.delivery_charge,
    order.delivery_fee,
    order.delivery_charges,
    order.shipping_charge,
    order.shipping_fee,
  ];

  const value = possibleFields.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      item !== ''
  );

  const charge = Number(value);

  return Number.isFinite(charge) ? charge : 0;
};


const getHandlingCharge = (order) => {
  if (!order) {
    return 0;
  }

  const possibleFields = [
    order.handling_charge,
    order.handling_fee,
    order.platform_fee,
  ];

  const value = possibleFields.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      item !== ''
  );

  const charge = Number(value);

  return Number.isFinite(charge) ? charge : 0;
};


const getDiscount = (order) => {
  if (!order) {
    return 0;
  }

  const possibleFields = [
    order.discount_amount,
    order.discount,
    order.coupon_discount,
  ];

  const value = possibleFields.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      item !== ''
  );

  const discount = Number(value);

  return Number.isFinite(discount) ? discount : 0;
};


const getTax = (order) => {
  if (!order) {
    return 0;
  }

  const possibleFields = [
    order.tax_amount,
    order.tax,
    order.gst_amount,
  ];

  const value = possibleFields.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      item !== ''
  );

  const tax = Number(value);

  return Number.isFinite(tax) ? tax : 0;
};


/* ============================================================
   ITEM SUBTOTAL
============================================================ */

const getItemSubtotal = (order) => {
  if (!order?.order_items) {
    return 0;
  }

  return order.order_items.reduce(
    (total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;

      return total + price * quantity;
    },
    0
  );
};


/* ============================================================
   ORDER TOTAL
============================================================ */

const getOrderTotal = (order) => {
  if (!order) {
    return 0;
  }

  /*
   * total_amount is treated as authoritative.
   */
  const total = Number(order.total_amount);

  if (Number.isFinite(total)) {
    return total;
  }

  /*
   * Fallback calculation.
   */
  const subtotal = getItemSubtotal(order);
  const delivery = getDeliveryCharge(order);
  const handling = getHandlingCharge(order);
  const discount = getDiscount(order);
  const tax = getTax(order);

  return (
    subtotal +
    delivery +
    handling +
    tax -
    discount
  );
};


/* ============================================================
   COMPONENT
============================================================ */

export default function CustomerOrdersPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [activeTab, setActiveTab] = useState('orders');

  const [searchQuery, setSearchQuery] = useState('');

  const [showAddressModal, setShowAddressModal] =
    useState(false);

  const [editingAddress, setEditingAddress] =
    useState(null);

  const [showProfileEdit, setShowProfileEdit] =
    useState(false);

  const [showRatingModal, setShowRatingModal] =
    useState(false);

  const [ratingOrder, setRatingOrder] =
    useState(null);

  const [rating, setRating] = useState(0);

  const [ratingComment, setRatingComment] =
    useState('');

  const [invoiceOrder, setInvoiceOrder] =
    useState(null);

  const [reordering, setReordering] =
    useState(false);

  const [profileForm, setProfileForm] =
    useState({
      full_name: '',
      phone: '',
    });

  const [addressForm, setAddressForm] =
    useState({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      address_type: 'HOME',
    });

  /* ============================================================
     AUTH
  ============================================================ */

  useEffect(() => {
    initialize();
  }, []);


  const initialize = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authUser) {
        navigate('/login');
        return;
      }

      setUser(authUser);

      await Promise.all([
        loadProfile(authUser),
        loadOrders(authUser),
        loadAddresses(authUser),
      ]);
    } catch (error) {
      console.error(
        'Customer page initialization error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };


  /* ============================================================
     PROFILE
  ============================================================ */

  const loadProfile = async (authUser) => {
    try {
      const email = authUser?.email;

      if (!email) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error(
          'Customer profile error:',
          error
        );
        return;
      }

      setProfile(data);

      setProfileForm({
        full_name:
          data?.full_name ||
          data?.name ||
          authUser?.user_metadata?.full_name ||
          '',
        phone:
          data?.phone ||
          authUser?.phone ||
          '',
      });
    } catch (error) {
      console.error(
        'Load profile error:',
        error
      );
    }
  };


  const handleProfileSave = async () => {
    try {
      if (!user?.email) {
        return;
      }

      const payload = {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      };

      const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('email', user.email)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data);
      setShowProfileEdit(false);

      alert('Profile updated successfully.');
    } catch (error) {
      console.error(
        'Profile update error:',
        error
      );

      alert(
        error?.message ||
        'Unable to update profile.'
      );
    }
  };


  /* ============================================================
     ORDERS
  ============================================================ */

  const loadOrders = async (authUser = user) => {
    try {
      if (!authUser?.email) {
        return;
      }

      setOrdersLoading(true);

      const email = authUser.email;

      /*
       * IMPORTANT:
       *
       * We fetch:
       * orders
       *   -> order_items
       *       -> products
       *           -> product_variants
       *
       * Product-level price/mrp/stock are NOT used.
       */
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
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

      if (error) {
        throw error;
      }

      setOrders(data || []);
    } catch (error) {
      console.error(
        'Orders loading error:',
        error
      );

      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };


  /* ============================================================
     ADDRESSES
  ============================================================ */

  const loadAddresses = async (authUser = user) => {
    try {
      if (!authUser?.email) {
        return;
      }

      /*
       * Change this table name if your address table has
       * a different name.
       */
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_email', authUser.email)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        console.error(
          'Address loading error:',
          error
        );

        return;
      }

      setAddresses(data || []);
    } catch (error) {
      console.error(
        'Load addresses error:',
        error
      );
    }
  };


  const resetAddressForm = () => {
    setAddressForm({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      address_type: 'HOME',
    });

    setEditingAddress(null);
  };


  const handleAddressSubmit = async (event) => {
    event.preventDefault();

    try {
      if (!user?.email) {
        return;
      }

      const payload = {
        ...addressForm,
        customer_email: user.email,
      };

      if (editingAddress?.id) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(payload)
          .eq('id', editingAddress.id);

        if (error) {
          throw error;
        }

        alert('Address updated successfully.');
      } else {
        const { error } = await supabase
          .from('customer_addresses')
          .insert(payload);

        if (error) {
          throw error;
        }

        alert('Address added successfully.');
      }

      setShowAddressModal(false);
      resetAddressForm();

      await loadAddresses();
    } catch (error) {
      console.error(
        'Address save error:',
        error
      );

      alert(
        error?.message ||
        'Unable to save address.'
      );
    }
  };


  const handleEditAddress = (address) => {
    setEditingAddress(address);

    setAddressForm({
      address_line1:
        address.address_line1 || '',
      address_line2:
        address.address_line2 || '',
      city:
        address.city || '',
      state:
        address.state || '',
      pincode:
        address.pincode || '',
      landmark:
        address.landmark || '',
      address_type:
        address.address_type || 'HOME',
    });

    setShowAddressModal(true);
  };


  const handleDeleteAddress = async (addressId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this address?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId);

      if (error) {
        throw error;
      }

      await loadAddresses();
    } catch (error) {
      console.error(
        'Delete address error:',
        error
      );

      alert(
        error?.message ||
        'Unable to delete address.'
      );
    }
  };


  /* ============================================================
     REORDER
  ============================================================ */

  const handleReorder = async (order) => {
    try {
      if (!order?.order_items?.length) {
        alert(
          'There are no items available to reorder.'
        );
        return;
      }

      setReordering(true);

      let cart = [];

      try {
        const existingCart =
          localStorage.getItem('cart');

        cart = existingCart
          ? JSON.parse(existingCart)
          : [];
      } catch {
        cart = [];
      }

      if (!Array.isArray(cart)) {
        cart = [];
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const item of order.order_items) {
        const product = item.products;

        if (!product) {
          skippedCount++;
          continue;
        }

        /*
         * IMPORTANT:
         *
         * Only variant-level pricing and stock.
         *
         * We do NOT use:
         * product.price
         * product.mrp
         * product.stock
         */
        const variants =
          getProductVariants(product);

        if (!variants.length) {
          skippedCount++;
          continue;
        }

        const matchedVariant =
          findOrderItemVariant(item);

        if (!matchedVariant) {
          skippedCount++;
          continue;
        }

        const variantId =
          matchedVariant.id ||
          item.variant_id;

        if (!variantId) {
          skippedCount++;
          continue;
        }

        const variantStock =
          getVariantStock(matchedVariant);

        const currentPrice =
          getVariantPrice(matchedVariant);

        const variantLabel =
          getVariantLabel(matchedVariant);

        /*
         * Don't add unavailable variants.
         */
        if (variantStock <= 0) {
          skippedCount++;
          continue;
        }

        if (currentPrice < 0) {
          skippedCount++;
          continue;
        }

        /*
         * Cart item gets a unique product + variant key.
         */
        const cartItemId =
          `${product.id}-${variantId}`;

        const existingIndex =
          cart.findIndex(
            (cartItem) =>
              String(
                cartItem.cartItemId ||
                cartItem.id
              ) ===
              String(cartItemId)
          );

        const requestedQuantity =
          Number(item.quantity) || 1;

        if (existingIndex >= 0) {
          const existingQuantity =
            Number(
              cart[existingIndex].quantity
            ) || 0;

          const newQuantity =
            Math.min(
              existingQuantity +
                requestedQuantity,
              variantStock
            );

          cart[existingIndex] = {
            ...cart[existingIndex],
            quantity: newQuantity,
            price: currentPrice,
            unit_price: currentPrice,
            stock: variantStock,
            variant_id: variantId,
            variant_label: variantLabel,
          };
        } else {
          cart.push({
            cartItemId,
            id: product.id,
            product_id: product.id,

            name: product.name,

            image_url:
              product.image_url ||
              product.image ||
              '',

            price: currentPrice,
            unit_price: currentPrice,

            quantity: Math.min(
              requestedQuantity,
              variantStock
            ),

            stock: variantStock,

            variant_id: variantId,
            variant_label: variantLabel,

            /*
             * Keep MRP at variant level.
             */
            mrp: getVariantMRP(
              matchedVariant
            ),
          });
        }

        addedCount++;
      }

      localStorage.setItem(
        'cart',
        JSON.stringify(cart)
      );

      if (addedCount > 0) {
        if (skippedCount > 0) {
          alert(
            `${addedCount} item(s) added to cart. ${skippedCount} item(s) were skipped because their variant is unavailable.`
          );
        } else {
          alert(
            'All available items have been added to your cart.'
          );
        }

        navigate('/');
      } else {
        alert(
          'None of the ordered variants are currently available.'
        );
      }
    } catch (error) {
      console.error(
        'Reorder error:',
        error
      );

      alert(
        error?.message ||
        'Unable to reorder this order.'
      );
    } finally {
      setReordering(false);
    }
  };


  /* ============================================================
     RATING
  ============================================================ */

  const openRatingModal = (order) => {
    setRatingOrder(order);
    setRating(0);
    setRatingComment('');
    setShowRatingModal(true);
  };


  const handleRateOrderSubmit = async () => {
    if (!ratingOrder) {
      return;
    }

    if (!rating) {
      alert('Please select a rating.');
      return;
    }

    /*
     * Existing implementation only displayed an alert.
     *
     * Keeping this safe because exact review table schema
     * was not provided.
     *
     * Once your review table columns are confirmed, this
     * can be connected directly.
     */
    alert(
      'Thank you for rating your order!'
    );

    setShowRatingModal(false);
    setRatingOrder(null);
    setRating(0);
    setRatingComment('');
  };


  /* ============================================================
     FILTERED ORDERS
  ============================================================ */

  const filteredOrders = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      const orderId =
        getDisplayOrderId(order)
          .toLowerCase();

      const status =
        getOrderStatus(order)
          .toLowerCase();

      const itemNames =
        (order.order_items || [])
          .map(
            (item) =>
              item.products?.name || ''
          )
          .join(' ')
          .toLowerCase();

      return (
        orderId.includes(query) ||
        status.includes(query) ||
        itemNames.includes(query)
      );
    });
  }, [orders, searchQuery]);


  /* ============================================================
     RENDER LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StoreHeader />

        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2
              className="animate-spin mx-auto text-emerald-600"
              size={36}
            />

            <p className="mt-4 text-stone-500 text-sm">
              Loading your account...
            </p>
          </div>
        </div>

        <Footer />
      </div>
    );
  }


  /* ============================================================
     MAIN UI
  ============================================================ */

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <StoreHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 mb-5"
          >
            <ArrowLeft size={16} />

            Continue Shopping
          </button>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">
                My Account
              </p>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Hello,{' '}
                {profile?.full_name ||
                  profile?.name ||
                  user?.user_metadata?.full_name ||
                  'Customer'}
              </h1>

              <p className="text-stone-500 mt-2">
                Manage your orders, profile and saved addresses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadOrders()}
                disabled={ordersLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-bold hover:border-stone-300 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={
                    ordersLoading
                      ? 'animate-spin'
                      : ''
                  }
                />

                Refresh
              </button>
            </div>
          </div>
        </div>


        {/* =====================================================
            TABS
        ===================================================== */}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'orders'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Package
              size={16}
              className="inline mr-2"
            />

            My Orders
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'profile'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <User
              size={16}
              className="inline mr-2"
            />

            Profile
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'addresses'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <MapPin
              size={16}
              className="inline mr-2"
            />

            Addresses
          </button>
        </div>


        {/* =====================================================
            ORDERS TAB
        ===================================================== */}

        {activeTab === 'orders' && (
          <section>

            {/* Search */}

            <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search by order ID, status or product..."
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>


            {ordersLoading ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <Loader2
                  className="animate-spin mx-auto text-emerald-600"
                  size={32}
                />

                <p className="mt-4 text-stone-500">
                  Loading orders...
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto">
                  <ShoppingBag
                    size={28}
                    className="text-stone-400"
                  />
                </div>

                <h3 className="font-black text-lg mt-5">
                  No orders found
                </h3>

                <p className="text-stone-500 text-sm mt-2">
                  {searchQuery
                    ? 'Try another search.'
                    : 'You have not placed any orders yet.'}
                </p>

                {!searchQuery && (
                  <button
                    onClick={() => navigate('/')}
                    className="mt-5 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700"
                  >
                    Start Shopping
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredOrders.map((order) => {
                  const orderStatus =
                    getOrderStatus(order);

                  const orderTotal =
                    getOrderTotal(order);

                  const itemCount =
                    (order.order_items || [])
                      .reduce(
                        (total, item) =>
                          total +
                          (Number(
                            item.quantity
                          ) || 0),
                        0
                      );

                  const isCancelled =
                    orderStatus ===
                      'CANCELLED' ||
                    orderStatus ===
                      'CANCELED';

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-stone-200 rounded-2xl overflow-hidden"
                    >

                      {/* Order Header */}

                      <div className="p-5 border-b border-stone-100">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                              <Package
                                size={22}
                                className="text-stone-700"
                              />
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-black text-stone-900">
                                  {getDisplayOrderId(
                                    order
                                  )}
                                </h3>

                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isCancelled
                                      ? 'bg-rose-50 text-rose-600'
                                      : orderStatus ===
                                          'DELIVERED'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {formatStatus(
                                    orderStatus
                                  )}
                                </span>
                              </div>

                              <p className="text-xs text-stone-400 font-mono mt-1">
                                Order ID:{' '}
                                {getDisplayOrderId(
                                  order
                                )}
                              </p>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar
                                    size={13}
                                  />

                                  {formatDate(
                                    order.created_at
                                  )}
                                </span>

                                <span className="inline-flex items-center gap-1.5">
                                  <Package
                                    size={13}
                                  />

                                  {itemCount}{' '}
                                  {itemCount === 1
                                    ? 'item'
                                    : 'items'}
                                </span>
                              </div>
                            </div>
                          </div>


                          <div className="flex items-center justify-between lg:justify-end gap-5">
                            <div className="text-left lg:text-right">
                              <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                                Order Total
                              </p>

                              <p className="font-black text-lg mt-0.5">
                                {formatCurrency(
                                  orderTotal
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-900 hover:text-white transition"
                            >
                              <ChevronRight
                                size={18}
                              />
                            </button>
                          </div>
                        </div>
                      </div>


                      {/* Order Items */}

                      <div className="p-5">
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {(order.order_items || [])
                            .slice(0, 5)
                            .map((item) => {
                              const product =
                                item.products;

                              const matchedVariant =
                                findOrderItemVariant(
                                  item
                                );

                              const variantLabel =
                                item.variant_label ||
                                getVariantLabel(
                                  matchedVariant
                                );

                              return (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="flex-shrink-0 w-56 bg-stone-50 rounded-xl p-3"
                                >
                                  <div className="flex gap-3">
                                    <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0">
                                      {product?.image_url ? (
                                        <img
                                          src={
                                            product.image_url
                                          }
                                          alt={
                                            product?.name ||
                                            'Product'
                                          }
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Package
                                            size={
                                              20
                                            }
                                            className="text-stone-300"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-xs truncate">
                                        {product?.name ||
                                          'Product'}
                                      </p>

                                      {variantLabel && (
                                        <p className="text-[10px] text-stone-500 mt-0.5">
                                          {variantLabel}
                                        </p>
                                      )}

                                      <p className="text-[10px] text-stone-400 mt-1">
                                        Qty:{' '}
                                        {item.quantity}
                                      </p>

                                      <p className="font-black text-xs mt-1">
                                        {formatCurrency(
                                          Number(
                                            item.price
                                          ) *
                                            Number(
                                              item.quantity
                                            )
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                          {order.order_items?.length >
                            5 && (
                            <div className="flex-shrink-0 w-20 rounded-xl bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                              +
                              {order.order_items.length -
                                5}{' '}
                              more
                            </div>
                          )}
                        </div>


                        {/* Actions */}

                        <div className="flex flex-wrap gap-2 mt-5">
                          <button
                            onClick={() =>
                              setSelectedOrder(
                                order
                              )
                            }
                            className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800"
                          >
                            View Details
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold hover:bg-stone-50 inline-flex items-center gap-2"
                            >
                              <Navigation
                                size={14}
                              />

                              Track Order
                            </button>
                          )}

                          <button
                            onClick={() =>
                              handleReorder(order)
                            }
                            disabled={reordering}
                            className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold hover:bg-stone-50 inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            <RefreshCw
                              size={14}
                            />

                            Reorder
                          </button>

                          {orderStatus ===
                            'DELIVERED' && (
                            <>
                              <button
                                onClick={() =>
                                  openRatingModal(
                                    order
                                  )
                                }
                                className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold hover:bg-stone-50 inline-flex items-center gap-2"
                              >
                                <Star
                                  size={14}
                                />

                                Rate Order
                              </button>

                              <button
                                onClick={() =>
                                  setInvoiceOrder(
                                    order
                                  )
                                }
                                className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold hover:bg-stone-50 inline-flex items-center gap-2"
                              >
                                <Receipt
                                  size={14}
                                />

                                Invoice
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}


        {/* =====================================================
            PROFILE TAB
        ===================================================== */}

        {activeTab === 'profile' && (
          <section>
            <div className="grid lg:grid-cols-3 gap-6">

              {/* Profile Card */}

              <div className="bg-white border border-stone-200 rounded-2xl p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={
                          profile.avatar_url
                        }
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User
                        size={38}
                        className="text-stone-400"
                      />
                    )}
                  </div>

                  <h2 className="font-black text-xl mt-4">
                    {profile?.full_name ||
                      profile?.name ||
                      user?.user_metadata
                        ?.full_name ||
                      'Customer'}
                  </h2>

                  <p className="text-sm text-stone-500 mt-1">
                    {user?.email}
                  </p>

                  <button
                    onClick={() =>
                      setShowProfileEdit(true)
                    }
                    className="mt-5 px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2"
                  >
                    <Edit3 size={14} />

                    Edit Profile
                  </button>
                </div>
              </div>


              {/* Profile Details */}

              <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6">
                <h3 className="font-black text-lg">
                  Personal Information
                </h3>

                <div className="grid md:grid-cols-2 gap-5 mt-6">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                      Full Name
                    </p>

                    <p className="font-medium mt-1">
                      {profile?.full_name ||
                        profile?.name ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                      Email
                    </p>

                    <p className="font-medium mt-1 break-all">
                      {user?.email ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                      Phone
                    </p>

                    <p className="font-medium mt-1">
                      {profile?.phone ||
                        user?.phone ||
                        'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                      Total Orders
                    </p>

                    <p className="font-medium mt-1">
                      {orders.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}


        {/* =====================================================
            ADDRESSES TAB
        ===================================================== */}

        {activeTab === 'addresses' && (
          <section>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black">
                  Saved Addresses
                </h2>

                <p className="text-sm text-stone-500 mt-1">
                  Manage your delivery addresses.
                </p>
              </div>

              <button
                onClick={() => {
                  resetAddressForm();
                  setShowAddressModal(true);
                }}
                className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2"
              >
                <Plus size={16} />

                Add Address
              </button>
            </div>


            {addresses.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
                <MapPin
                  size={34}
                  className="mx-auto text-stone-300"
                />

                <h3 className="font-black mt-4">
                  No saved addresses
                </h3>

                <p className="text-sm text-stone-500 mt-1">
                  Add an address for faster checkout.
                </p>

                <button
                  onClick={() => {
                    resetAddressForm();
                    setShowAddressModal(true);
                  }}
                  className="mt-5 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm"
                >
                  Add Address
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white border border-stone-200 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <MapPin
                            size={17}
                            className="text-emerald-600"
                          />
                        </div>

                        <div>
                          <p className="font-black text-sm">
                            {address.address_type ||
                              'Address'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            handleEditAddress(
                              address
                            )
                          }
                          className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center"
                        >
                          <Edit3
                            size={14}
                          />
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteAddress(
                              address.id
                            )
                          }
                          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-500 flex items-center justify-center"
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-stone-600 leading-relaxed">
                      <p>
                        {address.address_line1}
                      </p>

                      {address.address_line2 && (
                        <p>
                          {address.address_line2}
                        </p>
                      )}

                      {address.landmark && (
                        <p>
                          Landmark:{' '}
                          {address.landmark}
                        </p>
                      )}

                      <p>
                        {address.city},{' '}
                        {address.state}
                      </p>

                      <p>
                        {address.pincode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>


      {/* =======================================================
          ORDER DETAIL MODAL
      ======================================================= */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white w-full md:max-w-4xl md:rounded-3xl rounded-t-3xl max-h-[95vh] overflow-hidden flex flex-col">

            {/* Modal Header */}

            <div className="p-5 md:p-6 border-b border-stone-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-stone-400">
                  Order Details
                </p>

                <h2 className="text-xl md:text-2xl font-black mt-1">
                  {getDisplayOrderId(
                    selectedOrder
                  )}
                </h2>

                <p className="text-xs text-stone-400 font-mono mt-1">
                  Order ID:{' '}
                  {getDisplayOrderId(
                    selectedOrder
                  )}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200"
              >
                <X size={18} />
              </button>
            </div>


            {/* Modal Body */}

            <div className="overflow-y-auto p-5 md:p-6 space-y-6">

              {/* Order Summary */}

              <div className="grid md:grid-cols-3 gap-4">

                <div className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-stone-400">
                    <Calendar size={15} />

                    <span className="text-[10px] uppercase font-black tracking-wider">
                      Ordered
                    </span>
                  </div>

                  <p className="font-bold text-sm mt-2">
                    {formatDateTime(
                      selectedOrder.created_at
                    )}
                  </p>
                </div>


                <div className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-stone-400">
                    <Package size={15} />

                    <span className="text-[10px] uppercase font-black tracking-wider">
                      Status
                    </span>
                  </div>

                  <p className="font-bold text-sm mt-2">
                    {formatStatus(
                      getOrderStatus(
                        selectedOrder
                      )
                    )}
                  </p>
                </div>


                <div className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-stone-400">
                    <CreditCard size={15} />

                    <span className="text-[10px] uppercase font-black tracking-wider">
                      Payment
                    </span>
                  </div>

                  <p className="font-bold text-sm mt-2">
                    {selectedOrder.payment_method ||
                      selectedOrder.payment_type ||
                      (
                        selectedOrder.payment_status
                          ? formatStatus(
                              selectedOrder.payment_status
                            )
                          : 'Payment information unavailable'
                      )}
                  </p>

                  {selectedOrder.payment_status && (
                    <p className="text-[10px] text-stone-400 mt-1">
                      Status:{' '}
                      {formatStatus(
                        selectedOrder.payment_status
                      )}
                    </p>
                  )}
                </div>
              </div>


              {/* =================================================
                  ORDER TRACKING
              ================================================= */}

              {(() => {
                const tracking =
                  getTrackingSteps(
                    selectedOrder
                  );

                return (
                  <div className="bg-white border border-stone-200 rounded-2xl p-5">

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-black text-stone-400">
                          Order Tracking
                        </p>

                        <h3 className="font-black text-lg mt-1">
                          {getDisplayOrderId(
                            selectedOrder
                          )}
                        </h3>
                      </div>

                      <span
                        className={`self-start px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          tracking.cancelled
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {formatStatus(
                          getOrderStatus(
                            selectedOrder
                          )
                        )}
                      </span>
                    </div>


                    {tracking.cancelled ? (
                      <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 flex gap-3">
                        <XCircle
                          size={22}
                          className="text-rose-500 flex-shrink-0"
                        />

                        <div>
                          <p className="font-black text-sm text-rose-700">
                            Order Cancelled
                          </p>

                          <p className="text-xs text-rose-600 mt-1">
                            This order has been cancelled.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {tracking.steps.map(
                          (
                            step,
                            index
                          ) => {
                            const StepIcon =
                              step.icon;

                            const completed =
                              index <
                              tracking.currentIndex;

                            const current =
                              index ===
                              tracking.currentIndex;

                            const upcoming =
                              index >
                              tracking.currentIndex;

                            return (
                              <div
                                key={
                                  step.key
                                }
                                className="relative flex gap-4"
                              >

                                {/* Vertical Line */}

                                {index <
                                  tracking
                                    .steps
                                    .length -
                                    1 && (
                                  <div
                                    className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${
                                      index <
                                      tracking.currentIndex
                                        ? 'bg-emerald-500'
                                        : 'bg-stone-200'
                                    }`}
                                  />
                                )}


                                {/* Icon */}

                                <div
                                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    completed ||
                                    current
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-stone-100 text-stone-400'
                                  } ${
                                    current
                                      ? 'ring-4 ring-emerald-50'
                                      : ''
                                  }`}
                                >
                                  <StepIcon
                                    size={
                                      15
                                    }
                                  />
                                </div>


                                {/* Content */}

                                <div className="pb-7">
                                  <p
                                    className={`text-sm font-black ${
                                      upcoming
                                        ? 'text-stone-400'
                                        : 'text-stone-900'
                                    }`}
                                  >
                                    {
                                      step.label
                                    }

                                    {current && (
                                      <span className="ml-2 text-[9px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                                        Current
                                      </span>
                                    )}
                                  </p>

                                  <p
                                    className={`text-xs mt-1 ${
                                      upcoming
                                        ? 'text-stone-300'
                                        : 'text-stone-500'
                                    }`}
                                  >
                                    {
                                      step.description
                                    }
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}


              {/* =================================================
                  ITEMS
              ================================================= */}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black">
                    Ordered Items
                  </h3>

                  <span className="text-xs text-stone-400">
                    {
                      selectedOrder
                        .order_items?.length ||
                      0
                    }{' '}
                    items
                  </span>
                </div>

                <div className="space-y-3">
                  {(
                    selectedOrder.order_items ||
                    []
                  ).map((item) => {
                    const product =
                      item.products;

                    const matchedVariant =
                      findOrderItemVariant(
                        item
                      );

                    const variantLabel =
                      item.variant_label ||
                      getVariantLabel(
                        matchedVariant
                      );

                    const itemPrice =
                      Number(item.price) || 0;

                    const quantity =
                      Number(
                        item.quantity
                      ) || 0;

                    const itemTotal =
                      itemPrice *
                      quantity;

                    return (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 bg-stone-50 rounded-2xl"
                      >
                        <div className="w-16 h-16 rounded-xl bg-white overflow-hidden flex-shrink-0">
                          {product?.image_url ? (
                            <img
                              src={
                                product.image_url
                              }
                              alt={
                                product.name ||
                                'Product'
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package
                                size={
                                  22
                                }
                                className="text-stone-300"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black text-sm">
                                {product?.name ||
                                  'Product'}
                              </p>

                              {variantLabel && (
                                <p className="text-xs text-stone-500 mt-1">
                                  Variant:{' '}
                                  <span className="font-bold">
                                    {
                                      variantLabel
                                    }
                                  </span>
                                </p>
                              )}

                              <p className="text-xs text-stone-400 mt-1">
                                Qty:{' '}
                                {quantity}
                              </p>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-sm">
                                {formatCurrency(
                                  itemTotal
                                )}
                              </p>

                              <p className="text-[10px] text-stone-400 mt-1">
                                {formatCurrency(
                                  itemPrice
                                )}{' '}
                                / unit
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* =================================================
                  DELIVERY ADDRESS
              ================================================= */}

              {(selectedOrder.shipping_address ||
                selectedOrder.delivery_address ||
                selectedOrder.address) && (
                <div className="bg-stone-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin
                      size={16}
                      className="text-emerald-600"
                    />

                    <h3 className="font-black text-sm">
                      Delivery Address
                    </h3>
                  </div>

                  <p className="text-sm text-stone-600 whitespace-pre-line">
                    {typeof (
                      selectedOrder.shipping_address ||
                      selectedOrder.delivery_address ||
                      selectedOrder.address
                    ) === 'string'
                      ? selectedOrder.shipping_address ||
                        selectedOrder.delivery_address ||
                        selectedOrder.address
                      : JSON.stringify(
                          selectedOrder.shipping_address ||
                            selectedOrder.delivery_address ||
                            selectedOrder.address,
                          null,
                          2
                        )}
                  </p>
                </div>
              )}


              {/* =================================================
                  BILL DETAILS
              ================================================= */}

              {(() => {
                const itemSubtotal =
                  getItemSubtotal(
                    selectedOrder
                  );

                const deliveryCharge =
                  getDeliveryCharge(
                    selectedOrder
                  );

                const handlingCharge =
                  getHandlingCharge(
                    selectedOrder
                  );

                const discount =
                  getDiscount(
                    selectedOrder
                  );

                const tax =
                  getTax(
                    selectedOrder
                  );

                const billTotal =
                  getOrderTotal(
                    selectedOrder
                  );

                return (
                  <div className="bg-stone-50/70 p-5 rounded-2xl border border-stone-200/60 space-y-3">

                    <p className="font-black text-stone-900 uppercase tracking-wider text-[11px] mb-4">
                      Bill Details
                    </p>


                    {/* Item Total */}

                    <div className="flex justify-between text-stone-600 text-sm">
                      <span>
                        Item total
                      </span>

                      <span className="font-bold text-stone-900">
                        {formatCurrency(
                          itemSubtotal
                        )}
                      </span>
                    </div>


                    {/* Delivery Charge */}

                    <div className="flex justify-between text-stone-600 text-sm">
                      <span>
                        Delivery charges
                      </span>

                      {deliveryCharge >
                      0 ? (
                        <span className="font-bold text-stone-900">
                          +
                          {formatCurrency(
                            deliveryCharge
                          )}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600">
                          FREE
                        </span>
                      )}
                    </div>


                    {/* Handling Charge */}

                    {handlingCharge >
                      0 && (
                      <div className="flex justify-between text-stone-600 text-sm">
                        <span>
                          Handling charge
                        </span>

                        <span className="font-bold text-stone-900">
                          +
                          {formatCurrency(
                            handlingCharge
                          )}
                        </span>
                      </div>
                    )}


                    {/* Tax */}

                    {tax > 0 && (
                      <div className="flex justify-between text-stone-600 text-sm">
                        <span>
                          Tax / GST
                        </span>

                        <span className="font-bold text-stone-900">
                          +
                          {formatCurrency(
                            tax
                          )}
                        </span>
                      </div>
                    )}


                    {/* Discount */}

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 text-sm">
                        <span>
                          Discount
                        </span>

                        <span className="font-bold">
                          -
                          {formatCurrency(
                            discount
                          )}
                        </span>
                      </div>
                    )}


                    {/* Total */}

                    <div className="flex justify-between pt-4 border-t border-stone-200 font-black text-slate-900 text-base">
                      <span>
                        Bill total
                      </span>

                      <span>
                        {formatCurrency(
                          billTotal
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}


              {/* =================================================
                  ORDER META
              ================================================= */}

              <div className="grid md:grid-cols-2 gap-4">

                <div className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail
                      size={15}
                      className="text-stone-400"
                    />

                    <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                      Customer Email
                    </p>
                  </div>

                  <p className="text-sm font-medium break-all">
                    {selectedOrder.customer_email ||
                      user?.email ||
                      'N/A'}
                  </p>
                </div>


                <div className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone
                      size={15}
                      className="text-stone-400"
                    />

                    <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">
                      Customer Phone
                    </p>
                  </div>

                  <p className="text-sm font-medium">
                    {selectedOrder.customer_phone ||
                      selectedOrder.phone ||
                      profile?.phone ||
                      'N/A'}
                  </p>
                </div>
              </div>
            </div>


            {/* Modal Footer */}

            <div className="p-5 border-t border-stone-100 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() =>
                  handleReorder(
                    selectedOrder
                  )
                }
                disabled={reordering}
                className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-stone-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={
                    reordering
                      ? 'animate-spin'
                      : ''
                  }
                />

                Reorder
              </button>

              {getOrderStatus(
                selectedOrder
              ) === 'DELIVERED' && (
                <button
                  onClick={() => {
                    setSelectedOrder(
                      null
                    );

                    setTimeout(() => {
                      openRatingModal(
                        selectedOrder
                      );
                    }, 100);
                  }}
                  className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-stone-50"
                >
                  <Star size={15} />

                  Rate Order
                </button>
              )}

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =======================================================
          PROFILE EDIT MODAL
      ======================================================= */}

      {showProfileEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">

            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-black text-lg">
                Edit Profile
              </h3>

              <button
                onClick={() =>
                  setShowProfileEdit(false)
                }
                className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5 space-y-5">

              <div>
                <label className="text-xs font-bold text-stone-600">
                  Full Name
                </label>

                <input
                  value={
                    profileForm.full_name
                  }
                  onChange={(event) =>
                    setProfileForm(
                      (prev) => ({
                        ...prev,
                        full_name:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  placeholder="Your full name"
                />
              </div>


              <div>
                <label className="text-xs font-bold text-stone-600">
                  Phone Number
                </label>

                <input
                  value={
                    profileForm.phone
                  }
                  onChange={(event) =>
                    setProfileForm(
                      (prev) => ({
                        ...prev,
                        phone:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  placeholder="Phone number"
                />
              </div>

            </div>

            <div className="p-5 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() =>
                  setShowProfileEdit(false)
                }
                className="px-4 py-2.5 bg-stone-100 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>

              <button
                onClick={handleProfileSave}
                className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =======================================================
          ADDRESS MODAL
      ======================================================= */}

      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden">

            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">
                  {editingAddress
                    ? 'Edit Address'
                    : 'Add Address'}
                </h3>

                <p className="text-xs text-stone-400 mt-1">
                  Enter your delivery address.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAddressModal(
                    false
                  );
                  resetAddressForm();
                }}
                className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center"
              >
                <X size={17} />
              </button>
            </div>


            <form
              onSubmit={
                handleAddressSubmit
              }
            >
              <div className="p-5 space-y-4">

                <div>
                  <label className="text-xs font-bold text-stone-600">
                    Address Line 1
                  </label>

                  <input
                    required
                    value={
                      addressForm.address_line1
                    }
                    onChange={(event) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          address_line1:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    placeholder="House / Flat / Building"
                  />
                </div>


                <div>
                  <label className="text-xs font-bold text-stone-600">
                    Address Line 2
                  </label>

                  <input
                    value={
                      addressForm.address_line2
                    }
                    onChange={(event) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          address_line2:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    placeholder="Street / Area"
                  />
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-600">
                      City
                    </label>

                    <input
                      required
                      value={
                        addressForm.city
                      }
                      onChange={(event) =>
                        setAddressForm(
                          (prev) => ({
                            ...prev,
                            city:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-600">
                      State
                    </label>

                    <input
                      required
                      value={
                        addressForm.state
                      }
                      onChange={(event) =>
                        setAddressForm(
                          (prev) => ({
                            ...prev,
                            state:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-600">
                      PIN Code
                    </label>

                    <input
                      required
                      value={
                        addressForm.pincode
                      }
                      onChange={(event) =>
                        setAddressForm(
                          (prev) => ({
                            ...prev,
                            pincode:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-600">
                      Address Type
                    </label>

                    <select
                      value={
                        addressForm.address_type
                      }
                      onChange={(event) =>
                        setAddressForm(
                          (prev) => ({
                            ...prev,
                            address_type:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500 bg-white"
                    >
                      <option value="HOME">
                        Home
                      </option>

                      <option value="WORK">
                        Work
                      </option>

                      <option value="OTHER">
                        Other
                      </option>
                    </select>
                  </div>
                </div>


                <div>
                  <label className="text-xs font-bold text-stone-600">
                    Landmark
                  </label>

                  <input
                    value={
                      addressForm.landmark
                    }
                    onChange={(event) =>
                      setAddressForm(
                        (prev) => ({
                          ...prev,
                          landmark:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full mt-2 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    placeholder="Nearby landmark"
                  />
                </div>
              </div>


              <div className="p-5 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(
                      false
                    );
                    resetAddressForm();
                  }}
                  className="px-4 py-2.5 bg-stone-100 rounded-xl text-sm font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold"
                >
                  {editingAddress
                    ? 'Update Address'
                    : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* =======================================================
          RATING MODAL
      ======================================================= */}

      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">

            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">
                  Rate Your Order
                </h3>

                <p className="text-xs text-stone-400 mt-1">
                  {ratingOrder
                    ? getDisplayOrderId(
                        ratingOrder
                      )
                    : ''}
                </p>
              </div>

              <button
                onClick={() =>
                  setShowRatingModal(
                    false
                  )
                }
                className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center"
              >
                <X size={17} />
              </button>
            </div>


            <div className="p-5">
              <p className="text-sm font-bold text-center">
                How was your experience?
              </p>

              <div className="flex justify-center gap-2 mt-5">
                {[1, 2, 3, 4, 5].map(
                  (value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setRating(value)
                      }
                      className="p-1"
                    >
                      <Star
                        size={32}
                        fill={
                          value <= rating
                            ? 'currentColor'
                            : 'none'
                        }
                        className={
                          value <= rating
                            ? 'text-amber-400'
                            : 'text-stone-300'
                        }
                      />
                    </button>
                  )
                )}
              </div>

              <textarea
                value={ratingComment}
                onChange={(event) =>
                  setRatingComment(
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Tell us about your experience..."
                className="w-full mt-5 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:border-emerald-500 resize-none"
              />
            </div>


            <div className="p-5 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() =>
                  setShowRatingModal(
                    false
                  )
                }
                className="px-4 py-2.5 bg-stone-100 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>

              <button
                onClick={
                  handleRateOrderSubmit
                }
                className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =======================================================
          INVOICE
      ======================================================= */}

      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() =>
            setInvoiceOrder(null)
          }
        />
      )}


      <Footer />
    </div>
  );
}