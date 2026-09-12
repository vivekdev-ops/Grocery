// src/components/CustomerStorefront.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Package, X, User, MapPin, ChevronRight, ChevronDown, LogOut, Trash2, 
  FileText, Heart, MessageSquarePlus, Ban, Star, CheckCircle, LifeBuoy, 
  Sparkles, Bot, Search, Send, Plus, Minus, ArrowLeft, ShoppingBag
} from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import CustomerFeedbackModal from './CustomerFeedbackModal';
import PortalBottomNav from './PortalBottomNav';
import { calculateDistanceKm } from '../utils/distance';
import { registerPushToken, notifyAdminOrderPlaced, notifyShopkeeperOrderPlaced, notifyCustomerOrderStatus } from '../utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';

// Import Modular Components
import StoreHeader from './store/StoreHeader';
import ProductGrid from './store/ProductGrid';
import CartDrawer from './store/CartDrawer';

export default function CustomerStorefront() {
  const [storeStatus, setStoreStatus] = useState({ active: true, message: '', image: '' });
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [personalizedDeals, setPersonalizedDeals] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;
  const [sortBy, setSortBy] = useState('');

  // Store & Sale Data
  const [storeLocation, setStoreLocation] = useState({ latitude: 26.7900, longitude: 82.6000 });
  const [activeFlashSale, setActiveFlashSale] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // User & Profile Drawer State
  const [session, setSession] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [myComplaintsMap, setMyComplaintsMap] = useState({});
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);

  // Profile Collapsible Accordion & Detail States
  const [openSection, setOpenSection] = useState(null);
  const [selectedProfileOrder, setSelectedProfileOrder] = useState(null);
  const [orderTab, setOrderTab] = useState('active'); // 'active' | 'delivered' | 'cancelled'
  const [userReviewsMap, setUserReviewsMap] = useState({});

  // Invoice Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Order Section Review Modal State
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [newReviewForm, setNewReviewForm] = useState({ rating: 5, review_text: '' });

  // Order & Item Help Support Modal State
  const [orderHelpTarget, setOrderHelpTarget] = useState(null);
  const [helpForm, setHelpForm] = useState({
    issueType: 'Damaged / Defective Item',
    message: ''
  });
  const [submittingHelp, setSubmittingHelp] = useState(false);

  // Cart & Checkout State Synchronization with localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Check portal status immediately on component mount
  useEffect(() => {
    supabase.from('store_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setStoreStatus({
          active: data.is_portal_active ?? true,
          message: data.maintenance_message || '',
          image: data.maintenance_image || ''
        });
      }
      setCheckingStatus(false);
    });
  }, []);

  useEffect(() => {
  const handleOpenCartEvent = () => setIsCartOpen(true);
  window.addEventListener('openCartDrawer', handleOpenCartEvent);
  return () => {
    window.removeEventListener('openCartDrawer', handleOpenCartEvent);
  };
}, []);

  useEffect(() => {
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
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  // Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Product Details Modal State & Gallery Preview & Reviews
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState('');
  const [productReviews, setProductReviews] = useState([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleCheckout = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!session) { navigate('/login'); return; }

    if (!cart || cart.length === 0) {
      alert("Your cart is empty. Please add items before placing an order.");
      return;
    }

    setCheckingOut(true);

    try {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const selectedAddrObj = savedAddresses.find(a => a.id === selectedAddressId);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_email: session.user.email,
          customer_id: session.user.id,
          total_amount: cartTotal,
          status: 'pending',
          delivery_address: addressForm.address,
          phone: addressForm.phone,
          otp: generatedOtp,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount_amount: discountAmount,
          delivery_fee: deliveryFee,
          handling_charge: 5,
          latitude: selectedAddrObj?.latitude || null,
          longitude: selectedAddrObj?.longitude || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item?.product?.id || item?.id || item?.product_id,
        variant_id: item?.variant?.id || null,
        variant_label: item?.variant?.unit_label || item?.variant?.label || item?.variant_label || null,
        quantity: Number(item?.quantity) || 1,
        price: Number(item?.price) || 0
      })).filter(item => item.product_id);

      if (itemsToInsert.length === 0) {
        throw new Error("No valid items found in the cart for checkout.");
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      for (const item of cart) {
        if (item.variant && item.variant.id) {
          await supabase.from('product_variants').update({ stock: item.variant.stock - item.quantity }).eq('id', item.variant.id);
        }
      }

      setOrderSuccess(orderData.id.slice(0, 8));
      setCart([]);
      localStorage.removeItem('cart_items');
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
      window.dispatchEvent(new Event('storage'));

      setIsCartOpen(false);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      fetchStoreData();
      fetchMyOrders(session.user.email);

      notifyAdminOrderPlaced(orderData);
      const shopkeeperIds = [
        ...new Set(
          cart
            .map(item => item?.product?.shopkeeper_id || item?.shopkeeper_id)
            .filter(Boolean)
        ),
      ];
      if (shopkeeperIds.length > 0) {
        notifyShopkeeperOrderPlaced(orderData, shopkeeperIds);
      }
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  // Selected Variants State for each product
  const [selectedVariants, setSelectedVariants] = useState({});

  // Delivery Fee Rules & Coupons State
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(40);
  const [selectedAddressDistance, setSelectedAddressDistance] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

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

      if (data.expiry_date) {
        const expiry = new Date(data.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiry < today) {
          alert("This coupon has expired.");
          return;
        }
      }

      if (data.usage_limit_type === 'one_time') {
        const userEmail = session?.user?.email || session?.user?.user_metadata?.email;
        if (!userEmail) {
          alert("Please log in to use this one-time coupon.");
          return;
        }

        const { data: pastOrders, error: orderError } = await supabase
          .from('orders')
          .select('id, coupon_code, customer_email')
          .eq('customer_email', userEmail)
          .eq('coupon_code', data.code);

        if (orderError) {
          alert(`Could not verify usage history: ${orderError.message}`);
          return;
        }

        if (pastOrders && pastOrders.length > 0) {
          alert("You have already used this one-time coupon on a previous order.");
          return;
        }
      }

      if (cartSubtotal < (data.min_order_value || 0)) {
        alert(`Minimum order value of ₹${data.min_order_value} required for this coupon.`);
        return;
      }

      let discount = data.discount_type === 'percentage' 
        ? (cartSubtotal * data.discount_value) / 100 
        : data.discount_value;

      setDiscountAmount(Math.min(discount, cartSubtotal));
      setAppliedCoupon(data);
      setCouponInput('');
      alert("Coupon applied successfully!");
    } catch (err) {
      alert(`Failed to apply coupon: ${err.message || err}`);
    }
  };

  // Addresses State
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

  // --- AI ENHANCEMENTS STATE ---
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your KD Store AI Grocery Concierge. Tell me what you want to cook or what items you need, and I will instantly set up your cart!' }
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [predictedRefillItems, setPredictedRefillItems] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchMyOrders(session.user.email);
        fetchMyComplaints(session.user.id);
        fetchSavedAddresses(session.user.id);
        fetchWishlist(session.user.id);
        fetchUserReviews(session.user.id);
        fetchCustomerProfile(session.user.id);
        registerPushToken(session.user.id, 'customer');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchMyOrders(session.user.email);
        fetchMyComplaints(session.user.id);
        fetchSavedAddresses(session.user.id);
        fetchWishlist(session.user.id);
        fetchUserReviews(session.user.id);
        fetchCustomerProfile(session.user.id);
      }
    });

    fetchStoreData();
    fetchStoreLocation();
    fetchDeliveryRules();
    fetchBanners();
    fetchActiveFlashSale();
    fetchPersonalizedDeals();

    return () => subscription.unsubscribe();
  }, []);

  const fetchCustomerProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setCustomerProfile(data);
      }
    } catch (err) {
      console.error('Error fetching customer profile:', err.message);
    }
  };

  useEffect(() => {
    if (myOrders.length > 0 && products.length > 0) {
      const purchasedCounts = {};
      myOrders.forEach(ord => {
        ord.order_items?.forEach(item => {
          if (item.product_id) {
            purchasedCounts[item.product_id] = (purchasedCounts[item.product_id] || 0) + item.quantity;
          }
        });
      });
      const sortedFavs = [...products]
        .filter(p => purchasedCounts[p.id])
        .sort((a, b) => (purchasedCounts[b.id] || 0) - (purchasedCounts[a.id] || 0))
        .slice(0, 4);
      setPredictedRefillItems(sortedFavs);
    }
  }, [myOrders, products]);

  useEffect(() => {
    const channel = supabase
      .channel('public:customer_feedbacks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_feedbacks' }, () => {
        if (session) {
          fetchMyComplaints(session.user.id);
          fetchUserReviews(session.user.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const fetchStoreLocation = async () => {
    const { data } = await supabase.from('store_settings').select('*').limit(1).single();
    if (data) setStoreLocation(data);
  };

  const fetchActiveFlashSale = async () => {
    const { data } = await supabase.from('flash_sales').select('*').eq('is_active', true).single();
    if (data) {
      setActiveFlashSale(data);
      const difference = new Date(data.end_time).getTime() - new Date().getTime();
      setTimeLeft(Math.max(0, Math.floor(difference / 1000)));
    }
  };

  const fetchPersonalizedDeals = async () => {
    const { data } = await supabase.from('personalized_deals').select('*, products(*)').eq('is_active', true);
    if (data) setPersonalizedDeals(data);
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setBanners(data);
  };

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, varRes, revRes, dealRes] = await Promise.all([
        supabase.from('products').select('*, categories(name), shopkeeper_profiles(store_name)').eq('approval_status', 'approved').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('product_variants').select('*'),
        supabase.from('product_reviews').select('*'),
        supabase.from('personalized_deals').select('*').eq('is_active', true)
      ]);

      const rawProducts = prodRes.data || [];
      const rawVariants = varRes.data || [];
      const rawReviews = revRes.data || [];
      const activeDeals = dealRes.data || [];

      setPersonalizedDeals(activeDeals);

      const productDealMap = {};
      const categoryDealMap = {};

      activeDeals.forEach(deal => {
        if (deal.deal_type === 'category' || deal.category_id) {
          if (deal.category_id) categoryDealMap[deal.category_id] = deal;
        } else if (deal.product_id) {
          productDealMap[deal.product_id] = deal;
        }
      });

      const productsWithVariants = rawProducts.map(p => {
        const relationalVariants = rawVariants.filter(v => v.product_id === p.id);
        const jsonVariants = p.variants || [];
        let mergedVariants = relationalVariants.length > 0 ? relationalVariants : jsonVariants;

        const activeDeal = productDealMap[p.id] || categoryDealMap[p.category_id];
        let dealBadge = null;
        let discountPercent = 0;

        if (activeDeal) {
          const badgeText = String(activeDeal.discount_tag || activeDeal.discount_badge || activeDeal.badge_label || '');
          const matchPercent = badgeText.match(/(\d+)\s*%/);
          if (matchPercent) {
            discountPercent = parseInt(matchPercent[1], 10);
          }
          if (discountPercent > 0) {
            dealBadge = badgeText;
          }
        }

        let originalPrice = Number(p.price || 0);
        let originalMrp = Number(p.mrp || originalPrice);
        let finalPrice = originalPrice;

        if (discountPercent > 0) {
          if (!p.mrp || Number(p.mrp) <= originalPrice) {
            originalMrp = originalPrice;
          }
          finalPrice = Math.round(originalMrp * (1 - discountPercent / 100));
        }

        mergedVariants = mergedVariants.map(v => {
          let vPrice = Number(v.price || 0);
          let vMrp = Number(v.mrp || vPrice);
          let vFinalPrice = vPrice;
          if (discountPercent > 0) {
            if (!v.mrp || Number(v.mrp) <= vPrice) {
              vMrp = vPrice;
            }
            vFinalPrice = Math.round(vMrp * (1 - discountPercent / 100));
          }
          return { ...v, price: vFinalPrice, mrp: vMrp };
        });

        if (mergedVariants.length > 0) {
          setSelectedVariants(prev => ({ ...prev, [p.id]: mergedVariants[0].id || mergedVariants[0].label || mergedVariants[0].unit_label }));
        }

        const mergedImages = p.images || p.gallery || [p.image_url].filter(Boolean);
        const pReviews = rawReviews.filter(r => r.product_id === p.id);
        const avgRating = pReviews.length > 0 ? (pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviews.length).toFixed(1) : null;

        return { 
          ...p, 
          price: finalPrice,
          mrp: originalMrp,
          dealBadge, 
          images: mergedImages,
          variants: mergedVariants,
          avgRating,
          reviewCount: pReviews.length
        };
      });

      setProducts(productsWithVariants);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReviews = async (userId) => {
    const { data } = await supabase.from('product_reviews').select('*').eq('user_id', userId);
    if (data) {
      const map = {};
      data.forEach(rev => {
        map[rev.product_id] = rev;
      });
      setUserReviewsMap(map);
    }
  };

  const fetchMyComplaints = async (userId) => {
    const { data } = await supabase
      .from('customer_feedbacks')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'order_support');

    if (data) {
      const map = {};
      data.forEach(ticket => {
        const match = ticket.comments?.match(/Order ID: ([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          map[match[1]] = ticket;
        }
      });
      setMyComplaintsMap(map);
    }
  };

  const fetchProductReviews = async (productId) => {
    const { data } = await supabase.from('product_reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
    if (data) setProductReviews(data);
  };

  const handleAiChatSubmit = (e) => {
    e.preventDefault();
    if (!aiInputText.trim()) return;

    const userMsg = aiInputText.trim();
    setAiChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiInputText('');

    setTimeout(() => {
      const queryLower = userMsg.toLowerCase();
      let matchedItems = [];

      products.forEach(p => {
        if (queryLower.includes(p.name.toLowerCase()) || queryLower.split(' ').some(word => word.length > 3 && p.name.toLowerCase().includes(word))) {
          matchedItems.push(p);
        }
      });

      if (matchedItems.length > 0) {
        let addedNames = [];
        matchedItems.slice(0, 2).forEach(prod => {
          addToCart(prod);
          addedNames.push(prod.name);
        });
        setAiChatMessages(prev => [
          ...prev, 
          { sender: 'ai', text: `I found matching items for your request! I've added **${addedNames.join(', ')}** to your cart. Ready for fast delivery.` }
        ]);
      } else {
        setAiChatMessages(prev => [
          ...prev, 
          { sender: 'ai', text: `I scanned our inventory for "${userMsg}", but couldn't find an exact match. Try asking for items like milk, paneer, rice, oil, or snacks!` }
        ]);
      }
    }, 600);
  };

  const handleAddOrUpdateReview = async (e) => {
    e.preventDefault();
    if (!session) { navigate('/login'); return; }
    if (!reviewModalProduct) return;

    const existingReview = userReviewsMap[reviewModalProduct.id];

    if (existingReview) {
      const { error } = await supabase
        .from('product_reviews')
        .update({ rating: Number(newReviewForm.rating), review_text: newReviewForm.review_text })
        .eq('id', existingReview.id);

      if (!error) {
        alert("Review updated successfully!");
        setNewReviewForm({ rating: 5, review_text: '' });
        setReviewModalProduct(null);
        fetchUserReviews(session.user.id);
        fetchStoreData();
      } else {
        alert("Error updating review: " + error.message);
      }
    } else {
      const { error } = await supabase.from('product_reviews').insert([{
        product_id: reviewModalProduct.id,
        user_id: session.user.id,
        user_email: session.user.email,
        rating: Number(newReviewForm.rating),
        review_text: newReviewForm.review_text
      }]);

      if (!error) {
        alert("Review submitted successfully!");
        setNewReviewForm({ rating: 5, review_text: '' });
        setReviewModalProduct(null);
        fetchUserReviews(session.user.id);
        fetchStoreData();
      } else {
        alert("Error posting review: " + error.message);
      }
    }
  };

  const handleSubmitOrderHelp = async (e) => {
    e.preventDefault();
    if (!session) { navigate('/login'); return; }
    if (!orderHelpTarget) return;

    setSubmittingHelp(true);
    try {
      const isItemLevel = Boolean(orderHelpTarget.item);
      const subjectText = isItemLevel 
        ? `Issue with ${orderHelpTarget.item.name} in Order #${orderHelpTarget.order.id.slice(0, 8)}`
        : `Issue with Order #${orderHelpTarget.order.id.slice(0, 8)}`;

      const { error } = await supabase.from('customer_feedbacks').insert([{
        user_id: session.user.id,
        user_email: session.user.email,
        category: 'order_support',
        subject: subjectText,
        comments: `[${helpForm.issueType}] ${helpForm.message} (Order ID: ${orderHelpTarget.order.id}${isItemLevel ? `, Product: ${orderHelpTarget.item.name} [ID: ${orderHelpTarget.item.id}]` : ''})`,
        status: 'open',
        rating: 5
      }]);

      if (error) throw error;

      alert("Your support request has been recorded. Our team will review and resolve it promptly!");
      setOrderHelpTarget(null);
      setHelpForm({ issueType: 'Damaged / Defective Item', message: '' });
      fetchMyComplaints(session.user.id);
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    } finally {
      setSubmittingHelp(false);
    }
  };

  const fetchWishlist = async (userId) => {
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id, products(*, categories(name), shopkeeper_profiles(store_name))')
      .eq('user_id', userId);

    if (!error && data) {
      setWishlistIds(data.map(w => w.product_id));
      setWishlistProducts(data.map(w => w.products).filter(Boolean));
    }
  };

  const toggleWishlist = async (productId, e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    if (!session?.user) { 
      navigate('/login'); 
      return; 
    }

    const isAlreadyWishlisted = wishlistIds.includes(productId);

    try {
      if (isAlreadyWishlisted) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', productId);

        if (error) throw error;

        setWishlistIds(prev => prev.filter(id => id !== productId));
        setWishlistProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        // Add to wishlist (using upsert/ignore duplicates to prevent 409 conflicts)
        const { error } = await supabase
          .from('wishlists')
          .upsert(
            [{ user_id: session.user.id, product_id: productId }],
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
          );

        if (error) throw error;

        if (!wishlistIds.includes(productId)) {
          setWishlistIds(prev => [...prev, productId]);
          const prodToAdd = products.find(p => p.id === productId);
          if (prodToAdd && !wishlistProducts.some(p => p.id === productId)) {
            setWishlistProducts(prev => [...prev, prodToAdd]);
          }
        }
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err.message);
      alert('Could not update wishlist. Please try again.');
    }
  };

  const fetchDeliveryRules = async () => {
    const { data } = await supabase.from('delivery_rules').select('*');
    if (data) setDeliveryRules(data);
  };

  const fetchMyOrders = async (email) => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_id, total_amount, status, created_at, delivery_boy_id, customer_email, delivery_address, phone, otp, order_items(*, products(*, product_variants(*)))')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyOrders(data || []);
    }
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => {
      const updatedCart = prev.map(item => {
        const currentKey = item?.cartItemId || item?.id || item?.product_id;
        if (currentKey === cartItemId) {
          const newQty = (item.quantity || 1) + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
      return updatedCart;
    });

    setTimeout(() => {
      const currentCart = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const updatedCart = currentCart.map(item => {
        const currentKey = item?.cartItemId || item?.id || item?.product_id;
        if (currentKey === cartItemId) {
          const newQty = (item.quantity || 1) + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
      localStorage.setItem('cart_items', JSON.stringify(updatedCart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updatedCart }));
    }, 0);
  };
  
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_remark: 'Cancelled by customer'
      })
      .eq('id', orderId);

    if (!error) {
      alert("Order cancelled successfully.");
      setSelectedProfileOrder(null);
      if (session) fetchMyOrders(session.user.email);
      fetchStoreData();
      const order = myOrders.find(o => o.id === orderId);
      if (order) notifyCustomerOrderStatus(order, 'cancelled', 'Cancelled by customer');
    } else {
      alert("Failed to cancel order: " + error.message);
    }
  };

  const fetchSavedAddresses = async (userId) => {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedAddresses(data);
      if (data.length > 0) {
        handleSelectAddress(data[0]);
      }
    }
  };

  const handleToggleAddAddressBox = (isOpen) => {
    setShowAddAddressBox(isOpen);
    if (isOpen) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setNewAddressForm(prev => ({
              ...prev,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }));
          },
          (err) => {
            console.warn("Automatic location fetch failed or denied: " + err.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!session) return;

    const fullFormattedAddress = `${newAddressForm.house_no}, ${newAddressForm.ward_no_name}, ${newAddressForm.city || 'Harraiya'}, ${newAddressForm.district || 'Basti'}, ${newAddressForm.state || 'Uttar Pradesh'} - ${newAddressForm.pincode || '272155'}`;

    const { error } = await supabase.from('customer_addresses').insert([{
      user_id: session.user.id,
      title: newAddressForm.title || 'Home',
      house_no: newAddressForm.house_no,
      ward_no_name: newAddressForm.ward_no_name,
      city: newAddressForm.city || 'Harraiya',
      district: newAddressForm.district || 'Basti',
      state: newAddressForm.state || 'Uttar Pradesh',
      pincode: newAddressForm.pincode || '272155',
      phone: newAddressForm.phone,
      latitude: newAddressForm.latitude,
      longitude: newAddressForm.longitude,
      address: fullFormattedAddress
    }]);

    if (!error) {
      setNewAddressForm({
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
      setShowAddAddressBox(false);
      fetchSavedAddresses(session.user.id);
    } else {
      alert("Error adding address: " + error.message);
    }
  };

  const handleDeleteAddress = async (id) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    if (session) fetchSavedAddresses(session.user.id);
  };

  const calculateFee = (subtotal, distKm) => {
    if (!deliveryRules || deliveryRules.length === 0) return 0;

    const currentDist = Number(distKm || 0);

    let matchedRule = deliveryRules.find(r => {
      const minCart = Number(r.min_cart_value || 0);
      const maxCart = Number(r.max_cart_value || 99999);
      const minDst = Number(r.min_distance_km || 0);
      const maxDst = Number(r.max_distance_km || 5000);

      return subtotal >= minCart && subtotal <= maxCart && currentDist >= minDst && currentDist <= maxDst;
    });

    if (matchedRule) return Number(matchedRule.delivery_fee);

    let cartFallback = deliveryRules.find(r => {
      const minCart = Number(r.min_cart_value || 0);
      const maxCart = Number(r.max_cart_value || 99999);
      return subtotal >= minCart && subtotal <= maxCart;
    });

    if (cartFallback) return Number(cartFallback.delivery_fee);

    return 0;
  };

  const handleSelectAddress = (addrObj) => {
    setSelectedAddressId(addrObj.id);
    setAddressForm(prev => ({ ...prev, phone: addrObj.phone, address: addrObj.address }));

    const lat = addrObj.latitude || storeLocation.latitude;
    const lon = addrObj.longitude || storeLocation.longitude;
    const distanceKm = calculateDistanceKm(storeLocation.latitude, storeLocation.longitude, lat, lon);
     
    setSelectedAddressDistance(distanceKm);

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const fee = calculateFee(cartSubtotal, distanceKm);
     
    setDeliveryFee(fee);
  };

  const addToCart = (product, explicitVariant = null) => {
    const variants = product.variants || product.product_variants || [];
    const variantKey = explicitVariant ? (explicitVariant.id || explicitVariant.label || explicitVariant.unit_label) : selectedVariants[product.id];
    const variant = explicitVariant || variants.find(v => (v.id === variantKey || v.label === variantKey || v.unit_label === variantKey)) || variants[0];
     
    const stockCheck = Number(variant ? variant.stock : product.stock || 0);
    if (stockCheck <= 0) {
      alert("Sorry, this item is currently out of stock.");
      return;
    }

    const variantIdentifier = variant ? (variant.id || variant.unit_label || variant.label || 'default') : 'default';
    const cartItemId = `${product.id}-${variantIdentifier}`;

    const itemTitle = variant ? `${product.name} (${variant.unit_label || variant.label || variant.unit})` : product.name;
    const itemPrice = Number(variant ? variant.price : product.price || 0);
    const itemStock = stockCheck;
     
    const productImages = product.images || product.gallery || [product.image_url].filter(Boolean);
    const itemImage = productImages[0] || '';

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: Math.min(itemStock, item.quantity + 1) }
            : item
        );
      }
      return [...prev, {
        cartItemId,
        product,
        variant,
        id: product.id,
        product_id: product.id,
        title: itemTitle,
        price: itemPrice,
        quantity: 1,
        stock: itemStock,
        image: itemImage
      }];
    });

    setTimeout(() => {
      const currentCart = JSON.parse(localStorage.getItem('cart_items') || '[]');
      const existing = currentCart.find(item => item.cartItemId === cartItemId);
      const updatedCart = existing
        ? currentCart.map(item =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: Math.min(itemStock, item.quantity + 1) }
              : item
          )
        : [...currentCart, {
            cartItemId,
            product,
            variant,
            id: product.id,
            product_id: product.id,
            title: itemTitle,
            price: itemPrice,
            quantity: 1,
            stock: itemStock,
            image: itemImage
          }];
      localStorage.setItem('cart_items', JSON.stringify(updatedCart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updatedCart }));
    }, 0);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    if (savedAddresses.length > 0 && selectedAddressId) {
      const currentAddr = savedAddresses.find(a => a.id === selectedAddressId);
      if (currentAddr) handleSelectAddress(currentAddr);
    } else {
      const fee = calculateFee(cartSubtotal, selectedAddressDistance || 0);
      setDeliveryFee(fee);
    }
  }, [cartSubtotal, deliveryRules]);

  useEffect(() => {
    if (appliedCoupon) {
      if (cartSubtotal < (appliedCoupon.min_order_value || 0)) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
      } else {
        let discount = appliedCoupon.discount_type === 'percentage' 
          ? (cartSubtotal * appliedCoupon.discount_value) / 100 
          : appliedCoupon.discount_value;
        setDiscountAmount(Math.min(discount, cartSubtotal));
      }
    }
  }, [cartSubtotal]);

  const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') {
      const priceA = Number(a.variants?.[0]?.price ?? a.price ?? 0);
      const priceB = Number(b.variants?.[0]?.price ?? b.price ?? 0);
      return priceA - priceB;
    }
    if (sortBy === 'price_desc') {
      const priceA = Number(a.variants?.[0]?.price ?? a.price ?? 0);
      const priceB = Number(b.variants?.[0]?.price ?? b.price ?? 0);
      return priceB - priceA;
    }
    if (sortBy === 'rating_desc') {
      const ratingA = Number(a.avgRating || a.rating || 0);
      const ratingB = Number(b.avgRating || b.rating || 0);
      return ratingB - ratingA;
    }
    return 0;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  if (checkingStatus || loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[9999] flex items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80" 
          alt="Loading Store" 
          className="w-full h-full object-cover filter brightness-75 animate-pulse"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl animate-bounce">
            KD
          </div>
          <p className="text-white font-black text-xs uppercase tracking-widest bg-slate-900/80 px-4 py-2 rounded-full border border-orange-500/30">
            Opening KD Store...
          </p>
        </div>
      </div>
    );
  }

  if (!storeStatus.active) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center p-6 font-sans text-center z-[9999] overflow-hidden">
        {storeStatus.image ? (
          <img 
            src={storeStatus.image} 
            alt="Store Maintenance" 
            className="absolute inset-0 w-full h-full object-cover filter brightness-50"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <img 
            src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200&auto=format&fit=crop&q=80" 
            alt="Maintenance" 
            className="absolute inset-0 w-full h-full object-cover filter brightness-50"
          />
        )}
        <div className="relative z-10 max-w-md w-full space-y-4 bg-slate-900/90 backdrop-blur-md border border-orange-500/30 p-8 rounded-3xl shadow-2xl">
          <div className="w-14 h-14 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto border border-orange-400/30 font-black text-xl shadow-xl">
            KD
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">We'll be back soon!</h1>
          <p className="text-orange-200 text-xs leading-relaxed">{storeStatus.message || 'The store is temporarily offline for maintenance.'}</p>
        </div>
      </div>
    );
  }

  return (
<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-amber-50/60 via-orange-50/40 to-amber-100/50 text-slate-900 pb-16 font-sans selection:bg-orange-600 selection:text-white">       
      {/* 1. StoreHeader Component */}
      <StoreHeader 
        session={session} 
        customerProfile={customerProfile}
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        totalItemsCount={totalItemsCount} 
        onOpenProfile={() => setIsProfileOpen(true)} 
        onOpenCart={() => setIsCartOpen(true)}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Profile & Dashboard Drawer */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-end z-[999] transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b border-orange-100 flex justify-between items-center bg-orange-50/50">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2.5">
                <User size={20} className="text-orange-600 shrink-0" /> 
                <span className="truncate">My Account & Dashboard</span>
              </h3>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-orange-100/60 rounded-full text-slate-600 hover:bg-orange-100 transition cursor-pointer" title="Close"><X size={16} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 p-4 rounded-2xl shadow-2xs">
                <p className="text-[10px] text-orange-700 uppercase font-black tracking-widest">Signed in as</p>
                <p className="font-bold text-slate-900 mt-1 truncate text-sm">{session?.user?.email}</p>
              </div>

              {/* Edit Profile Section */}
              <div className="bg-orange-50/30 rounded-2xl border border-orange-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'profile_edit' ? null : 'profile_edit')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-orange-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <User size={16} className="text-orange-600 shrink-0" /> <span className="truncate">Edit Profile & Preferences</span>
                  </span>
                  {openSection === 'profile_edit' ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                </button>

                {openSection === 'profile_edit' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!session?.user) return;
                    const formData = new FormData(e.target);
                    const updates = {
                      user_id: session.user.id,
                      full_name: formData.get('fullName'),
                      phone: formData.get('phone'),
                      avatar_url: formData.get('avatarUrl'),
                      interests: formData.get('interests'),
                      updated_at: new Date(),
                    };
                    const { error } = await supabase.from('customer_profiles').upsert(updates, { onConflict: 'user_id' });
                    if (error) {
                      alert('Error updating profile: ' + error.message);
                    } else {
                      setCustomerProfile(updates);
                      alert('Profile updated successfully!');
                    }
                  }} className="p-4 pt-0 space-y-3 bg-white border-t border-orange-100">
                    <div className="space-y-1 pt-2">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Full Name</label>
                      <input 
                        type="text" 
                        name="fullName"
                        placeholder="Enter your name" 
                        defaultValue={customerProfile?.full_name || ''}
                        className="w-full border border-orange-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-orange-600 font-medium" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Phone Number</label>
                      <input 
                        type="text" 
                        name="phone"
                        placeholder="+91 98765 43210" 
                        defaultValue={customerProfile?.phone || ''}
                        className="w-full border border-orange-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-orange-600 font-medium" 
                      />
                    </div>
                     
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Profile Avatar</label>
                      <input 
                        type="url" 
                        name="avatarUrl"
                        placeholder="https://example.com/avatar.jpg" 
                        defaultValue={customerProfile?.avatar_url || ''}
                        className="w-full border border-orange-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-orange-600 font-medium" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Interests & Preferences</label>
                      <textarea 
                        name="interests"
                        rows="2"
                        placeholder="e.g. Organic, Snacks, Dairy..." 
                        defaultValue={customerProfile?.interests || ''}
                        className="w-full border border-orange-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-orange-600 font-medium resize-none" 
                      />
                    </div>
                    <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-black cursor-pointer shadow-sm">
                      Save Profile Changes
                    </button>
                  </form>
                )}
              </div>

              
              {/* My Orders Section */}
              <div className="bg-orange-50/30 rounded-2xl border border-orange-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'orders' ? null : 'orders')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-orange-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Package size={16} className="text-orange-600 shrink-0" /> 
                    <span className="truncate">My Orders ({myOrders.length})</span>
                  </span>
                  {openSection === 'orders' ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                </button>

                {openSection === 'orders' && (() => {
                  const activeOrders = myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
                  const deliveredOrders = myOrders.filter(o => o.status === 'delivered');
                  const cancelledOrders = myOrders.filter(o => o.status === 'cancelled');

                  const renderOrderCard = (order) => {
                    const showOtp = order.status !== 'delivered' && order.status !== 'cancelled';

                    return (
                      <div key={order.id} className="p-3.5 bg-orange-50/20 rounded-2xl border border-orange-100 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 truncate">#{order.id.slice(0, 8)}</span>
                          <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                            order.status === 'delivered' ? 'bg-orange-100 text-orange-800' :
                            order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>{order.status}</span>
                        </div>

                        {showOtp && (
                          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-orange-200 rounded-2xl p-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-wider text-orange-800 block">
                                Delivery OTP
                              </span>
                              <p className="text-[9px] text-stone-500">Show to delivery partner</p>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-xl border border-orange-300 font-mono font-black text-sm text-orange-700 tracking-widest shadow-2xs">
                              {order.otp || '----'}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-slate-500">
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <span className="font-black text-slate-900 text-sm">₹{order.total_amount}</span>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button 
                            onClick={() => setSelectedProfileOrder(order)}
                            className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-800 py-2 px-3 rounded-2xl font-bold transition flex items-center justify-center gap-1.5 border border-orange-200 cursor-pointer"
                          >
                            <FileText size={14} className="shrink-0" />
                            <span>Details</span>
                          </button>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="p-4 pt-0 space-y-3 bg-white border-t border-orange-100 text-xs">
                      {myOrders.length === 0 ? (
                        <p className="text-slate-400 italic py-3 text-center">No orders placed yet.</p>
                      ) : (
                        <>
                          <div className="flex gap-1 bg-orange-50/70 p-1 rounded-2xl border border-orange-100 mt-2">
                            <button
                              onClick={() => setOrderTab('active')}
                              className={`flex-1 py-2 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer text-center truncate ${
                                orderTab === 'active' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Active ({activeOrders.length})
                            </button>
                            <button
                              onClick={() => setOrderTab('delivered')}
                              className={`flex-1 py-2 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer text-center truncate ${
                                orderTab === 'delivered' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Delivered ({deliveredOrders.length})
                            </button>
                            <button
                              onClick={() => setOrderTab('cancelled')}
                              className={`flex-1 py-2 px-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer text-center truncate ${
                                orderTab === 'cancelled' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Cancelled ({cancelledOrders.length})
                            </button>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {orderTab === 'active' && (
                              activeOrders.length === 0 ? (
                                <p className="text-slate-400 italic py-4 text-center">No active or ongoing orders.</p>
                              ) : (
                                activeOrders.map(order => renderOrderCard(order))
                              )
                            )}

                            {orderTab === 'delivered' && (
                              deliveredOrders.length === 0 ? (
                                <p className="text-slate-400 italic py-4 text-center">No delivered orders history.</p>
                              ) : (
                                deliveredOrders.map(order => renderOrderCard(order))
                              )
                            )}

                            {orderTab === 'cancelled' && (
                              cancelledOrders.length === 0 ? (
                                <p className="text-slate-400 italic py-4 text-center">No cancelled orders.</p>
                              ) : (
                                cancelledOrders.map(order => renderOrderCard(order))
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-orange-50/30 rounded-2xl border border-orange-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'wishlist' ? null : 'wishlist')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-orange-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Heart size={16} className="text-pink-600 shrink-0" /> 
                    <span className="truncate">My Wishlist ({wishlistProducts.length})</span>
                  </span>
                  {openSection === 'wishlist' ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                </button>

                {openSection === 'wishlist' && (
                  <div className="p-4 pt-0 space-y-2.5 bg-white border-t border-orange-100">
                    {wishlistProducts.length === 0 ? (
                      <p className="text-slate-400 italic py-3 text-center">Your wishlist is empty.</p>
                    ) : (
                      wishlistProducts.map(p => {
                        const pImages = p.images || p.gallery || [p.image_url].filter(Boolean);
                        return (
                          <div key={p.id} className="p-3 bg-orange-50/20 rounded-2xl border border-orange-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={pImages[0] || ''} alt="" className="w-11 h-11 object-cover rounded-xl border border-orange-200 bg-white shrink-0" />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                                <span className="font-black text-orange-700">₹{p.price}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => addToCart(p)}
                              className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-xl font-black shadow-sm transition cursor-pointer shrink-0"
                              title="Add"
                            >
                              <Package size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="bg-orange-50/30 rounded-2xl border border-orange-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'addresses' ? null : 'addresses')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-orange-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin size={16} className="text-orange-600 shrink-0" /> 
                    <span className="truncate">Saved Addresses ({savedAddresses.length})</span>
                  </span>
                  {openSection === 'addresses' ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
                </button>

                {openSection === 'addresses' && (
                  <div className="p-4 pt-0 space-y-3 bg-white border-t border-orange-100">
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">Your Locations</span>
                      <button onClick={() => setShowAddAddressBox(true)} className="text-orange-600 font-black hover:underline cursor-pointer">
                        + Add Address
                      </button>
                    </div>

                    {savedAddresses.map(addr => (
                      <div key={addr.id} className="p-3.5 bg-orange-50/20 rounded-2xl border border-orange-200 flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="font-black text-slate-900 block truncate">{addr.title}</span>
                          <span className="text-slate-600 block mt-0.5 leading-snug">{addr.address}</span>
                          <span className="text-slate-400 font-mono text-[10px] block mt-1">Phone: {addr.phone}</span>
                        </div>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer shrink-0" title="Delete"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="w-full bg-orange-50/60 hover:bg-orange-100 text-slate-900 p-4 rounded-2xl font-black flex items-center justify-between border border-orange-200 transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <MessageSquarePlus size={16} className="text-orange-600 shrink-0" /> 
                  <span className="truncate">Send Feedback & Suggestions</span>
                </span>
                <ChevronRight size={16} className="shrink-0" />
              </button>

            </div>

            <div className="p-6 border-t border-orange-100 bg-orange-50/50">
              <button 
                onClick={() => { supabase.auth.signOut(); setIsProfileOpen(false); }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3.5 rounded-2xl transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs border border-rose-200 cursor-pointer shadow-2xs"
              >
                <LogOut size={16} className="shrink-0" /> Logout Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedProfileOrder && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-orange-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-orange-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Order #{selectedProfileOrder.id.slice(0, 8)} Details</h3>
              <button onClick={() => setSelectedProfileOrder(null)} className="p-1.5 bg-orange-50 rounded-full text-slate-600 hover:bg-orange-100 cursor-pointer" title="Close"><X size={16}/></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-orange-50/40 p-3.5 rounded-2xl border border-orange-100 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Order Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                  selectedProfileOrder.status === 'delivered' ? 'bg-orange-100 text-orange-800' :
                  selectedProfileOrder.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>{selectedProfileOrder.status}</span>
              </div>

              {selectedProfileOrder.status !== 'delivered' && selectedProfileOrder.status !== 'cancelled' && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-orange-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs my-2">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-800 block">
                      Delivery Verification OTP
                    </span>
                    <p className="text-[10px] text-stone-600 font-medium">
                      Share this code with the delivery partner
                    </p>
                  </div>
                  <div className="bg-white px-3.5 py-1.5 rounded-xl border border-orange-300 font-mono font-black text-base text-orange-700 tracking-widest shadow-sm">
                    {selectedProfileOrder.otp || '----'}
                  </div>
                </div>
              )}

              {myComplaintsMap[selectedProfileOrder.id] && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <LifeBuoy size={14} className="text-orange-600" /> Support Ticket Status
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      myComplaintsMap[selectedProfileOrder.id].status === 'resolved' ? 'bg-orange-200 text-orange-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {myComplaintsMap[selectedProfileOrder.id].status || 'open'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium leading-snug">
                    {myComplaintsMap[selectedProfileOrder.id].comments}
                  </p>
                </div>
              )}

              {selectedProfileOrder.status === 'cancelled' && (
                <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-1">
                  <span className="text-rose-900 font-black uppercase text-[10px] tracking-wider block">Cancellation Reason</span>
                  <p className="text-rose-700 font-medium leading-snug">
                    {selectedProfileOrder.cancellation_remark || 'No specific remark provided.'}
                  </p>
                </div>
              )}

              {selectedProfileOrder.status === 'delivered' && !myComplaintsMap[selectedProfileOrder.id] && (
                <button
                  onClick={() => setOrderHelpTarget({ order: selectedProfileOrder, item: null })}
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 p-3 rounded-2xl border border-amber-200 font-black flex items-center justify-between transition cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <LifeBuoy size={16} className="text-orange-600" /> Need Help with this Whole Order?
                  </span>
                  <ChevronRight size={14} />
                </button>
              )}

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Ordered Items</span>
                <div className="space-y-2 bg-orange-50/30 p-3.5 rounded-2xl border border-orange-100">
                  {selectedProfileOrder.order_items?.map(item => {
                    const itemImages = item.products?.images || item.products?.gallery || [item.products?.image_url].filter(Boolean);
                    const itemImg = itemImages[0] || '';
                    const hasReviewed = userReviewsMap[item.product_id];

                    const variantsList = Array.isArray(item.products?.product_variants) 
                      ? item.products.product_variants 
                      : Array.isArray(item.products?.variants) 
                        ? item.products.variants 
                        : [];

                    const matchedVariant = variantsList.find(v => 
                      (item.variant_id && String(v.id) === String(item.variant_id)) || 
                      (item.variant_label && String(v.unit_label || v.label || '').trim().toLowerCase() === String(item.variant_label || '').trim().toLowerCase())
                    );

                    const itemPrice = Number(item.price || 0);
                    const itemMrp = Number(
                      matchedVariant?.mrp || 
                      item.products?.mrp || 
                      itemPrice
                    );
                    const hasMrp = itemMrp > itemPrice;
                    const discountPct = hasMrp ? Math.round(((itemMrp - itemPrice) / itemMrp) * 100) : 0;

                    return (
                      <div key={item.id} className="flex flex-col gap-2 py-2 border-b border-orange-100 last:border-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={itemImg} alt="" className="w-11 h-11 object-cover rounded-xl border border-orange-200 bg-white shrink-0" />
                            <div className="min-w-0">
                              <span className="font-black text-slate-900 block truncate">{item.products?.name || 'Item'}</span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {item.variant_label && (
                                  <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md">
                                    {item.variant_label}
                                  </span>
                                )}
                                <span className="text-stone-500 font-medium text-[11px]">Qty: {item.quantity}</span>
                                <span>•</span>
                                <span className="font-bold text-slate-900 text-[11px]">₹{itemPrice * item.quantity}</span>
                                {hasMrp && (
                                  <span className="text-stone-400 line-through text-[10px]">₹{itemMrp * item.quantity}</span>
                                )}
                                {discountPct > 0 && (
                                  <span className="text-[9px] text-orange-700 font-black bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                                    {discountPct}% OFF
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {selectedProfileOrder.status === 'delivered' && item.products && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setOrderHelpTarget({ order: selectedProfileOrder, item: item.products })}
                                className="p-2 rounded-xl font-bold text-[11px] bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition flex items-center justify-center cursor-pointer"
                                title="Item Help"
                              >
                                <LifeBuoy size={14} className="shrink-0" />
                              </button>

                              <button
                                onClick={() => {
                                  setReviewModalProduct(item.products);
                                  if (hasReviewed) {
                                    setNewReviewForm({ rating: hasReviewed.rating, review_text: hasReviewed.review_text });
                                  } else {
                                    setNewReviewForm({ rating: 5, review_text: '' });
                                  }
                                }}
                                className={`p-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center cursor-pointer ${
                                  hasReviewed 
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' 
                                    : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
                                }`}
                                title={hasReviewed ? "Review" : "Rate"}
                              >
                                <Star size={14} className={`shrink-0 ${hasReviewed ? 'fill-amber-500 text-amber-500' : ''}`} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-orange-50/40 p-3.5 rounded-2xl border border-orange-100 space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Delivery Address</p>
                <p className="text-slate-800 font-medium leading-snug">{selectedProfileOrder.delivery_address}</p>
              </div>

              <div className="pt-2 border-t border-orange-100 flex justify-between items-center font-black text-sm text-slate-900">
                <span>Total Amount Paid:</span>
                <span className="text-orange-600">₹{selectedProfileOrder.total_amount}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {selectedProfileOrder.status === 'pending' && (
                <button 
                  onClick={() => handleCancelOrder(selectedProfileOrder.id)}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Ban size={15} /> Cancel Order
                </button>
              )}
              <button 
                onClick={() => setSelectedProfileOrder(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {orderHelpTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-orange-100 space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <LifeBuoy size={16} className="text-orange-600" />
                {orderHelpTarget.item ? 'Item Support Request' : 'Order Support Request'}
              </h3>
              <button onClick={() => setOrderHelpTarget(null)} className="p-1 bg-orange-50 rounded-full text-slate-600 hover:bg-orange-100 cursor-pointer" title="Close"><X size={16}/></button>
            </div>

            <form onSubmit={handleSubmitOrderHelp} className="space-y-3.5 text-xs">
              <div className="bg-orange-50/60 p-3 rounded-2xl border border-orange-200 space-y-1">
                <span className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block">Target Reference</span>
                <p className="font-black text-slate-900">Order #{orderHelpTarget.order.id.slice(0, 8)}</p>
                {orderHelpTarget.item && (
                  <p className="text-orange-700 font-bold">Product: {orderHelpTarget.item.name}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Category</label>
                <select 
                  value={helpForm.issueType} 
                  onChange={e => setHelpForm({...helpForm, issueType: e.target.value})}
                  className="w-full border border-orange-200 p-3 rounded-2xl bg-orange-50/30 text-slate-900 font-bold outline-none cursor-pointer"
                >
                  <option value="Damaged / Defective Item">Damaged / Defective Item</option>
                  <option value="Missing Item from Package">Missing Item from Package</option>
                  <option value="Expired / Freshness Issue">Expired / Freshness Issue</option>
                  <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                  <option value="Billing / Payment Dispute">Billing / Payment Dispute</option>
                  <option value="Other Issue">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Describe the Issue</label>
                <textarea 
                  rows="3"
                  placeholder="Explain the issue in detail so our support team can assist..." 
                  required
                  value={helpForm.message}
                  onChange={e => setHelpForm({...helpForm, message: e.target.value})}
                  className="w-full border border-orange-200 p-3 rounded-2xl bg-orange-50/30 text-slate-900 outline-none resize-none focus:border-orange-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={submittingHelp}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3.5 rounded-2xl font-black tracking-wider uppercase transition shadow-lg shadow-orange-600/20 disabled:opacity-50 cursor-pointer"
              >
                {submittingHelp ? 'Submitting Request...' : 'Submit Support Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {reviewModalProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-orange-100 space-y-4">
            <div className="flex justify-between items-center border-b border-orange-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">
                {userReviewsMap[reviewModalProduct.id] ? 'Edit Product Review' : 'Rate & Review Product'}
              </h3>
              <button onClick={() => setReviewModalProduct(null)} className="p-1 bg-orange-50 rounded-full text-slate-600 hover:bg-orange-100 cursor-pointer" title="Close"><X size={16}/></button>
            </div>

            <form onSubmit={handleAddOrUpdateReview} className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 bg-orange-50/40 p-3 rounded-2xl border border-orange-100">
                <img 
                  src={reviewModalProduct.image_url || (reviewModalProduct.images && reviewModalProduct.images[0]) || ''} 
                  alt="" 
                  className="w-11 h-11 object-cover rounded-xl bg-white border border-orange-200" 
                />
                <span className="font-bold text-slate-950 truncate">{reviewModalProduct.name}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Star Rating</label>
                <select 
                  value={newReviewForm.rating} 
                  onChange={e => setNewReviewForm({...newReviewForm, rating: e.target.value})}
                  className="w-full border border-orange-200 p-3 rounded-2xl bg-orange-50/30 text-slate-900 font-bold outline-none cursor-pointer"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (5/5 - Excellent)</option>
                  <option value="4">⭐⭐⭐⭐ (4/5 - Good)</option>
                  <option value="3">⭐⭐⭐ (3/5 - Average)</option>
                  <option value="2">⭐⭐ (2/5 - Poor)</option>
                  <option value="1">⭐ (1/5 - Terrible)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Review</label>
                <textarea 
                  rows="3"
                  placeholder="Share details of your experience with this item..." 
                  required
                  value={newReviewForm.review_text}
                  onChange={e => setNewReviewForm({...newReviewForm, review_text: e.target.value})}
                  className="w-full border border-orange-200 p-3 rounded-2xl bg-orange-50/30 text-slate-900 outline-none resize-none focus:border-orange-500"
                />
              </div>

              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-2xl font-black tracking-wider uppercase transition shadow-lg shadow-orange-600/20 cursor-pointer">
                {userReviewsMap[reviewModalProduct.id] ? 'Update Review' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[300] animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-stone-100 space-y-4">
            <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto border border-orange-100 shadow-xs">
              <CheckCircle size={40} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Order Placed Successfully</h2>
              <p className="text-stone-400 text-xs font-medium">You have successfully placed your order</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => { setOrderSuccess(null); navigate('/account/orders'); }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                View Order Status
              </button>
              <button
                onClick={() => { setOrderSuccess(null); setActiveCategory('All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full py-3 rounded-2xl font-extrabold text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Product Grid Component */}
      <ProductGrid
        session={session}
        banners={banners}
        currentSlide={currentSlide}
        activeFlashSale={activeFlashSale}
        timeLeft={timeLeft}
        formatTime={formatTime}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        loading={loading}
        products={products}
        searchQuery={searchQuery}
        filteredProducts={filteredProducts}
        currentProducts={currentProducts}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        wishlistIds={wishlistIds}
        toggleWishlist={toggleWishlist}
        selectedVariants={selectedVariants}
        setSelectedVariants={setSelectedVariants}
        cart={cart}
        addToCart={addToCart}
        updateQuantity={updateQuantity}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onNavigate={navigate}
        onOpenCart={() => setIsCartOpen(true)}
        onSelectProduct={async (product) => {
          setSelectedProductDetails(product);
          setIsDescriptionExpanded(false);
          const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
          setActiveGalleryImage(pImages[0] || '');
          await fetchProductReviews(product.id);
        }}
      />

      {/* Product Details Modal - Optimized Layout with Floating Action Bar above Bottom Nav */}
      {selectedProductDetails && (() => {
        const modalImages = selectedProductDetails.images || selectedProductDetails.gallery || [selectedProductDetails.image_url].filter(Boolean);
        const variants = selectedProductDetails.variants || selectedProductDetails.product_variants || [];
        const hasVariants = variants.length > 0;

        const currentVariantKey = selectedVariants[selectedProductDetails.id] || (hasVariants ? (variants[0].id || variants[0].label || variants[0].unit_label) : null);
        const modalActiveVariant = variants.find(
          v => v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey
        ) || variants[0];
         
        const modalPrice = Number(modalActiveVariant ? modalActiveVariant.price : selectedProductDetails.price || 0);
        const modalMrp = Number(modalActiveVariant?.mrp || selectedProductDetails.mrp || 0);
        const hasModalMrp = modalMrp > modalPrice;
        const discountPct = hasModalMrp ? Math.round(((modalMrp - modalPrice) / modalMrp) * 100) : 0;
        const modalStock = Number(modalActiveVariant ? modalActiveVariant.stock : selectedProductDetails.stock || 0);
        const isModalOutOfStock = modalStock <= 0;

        const variantIdentifier = modalActiveVariant ? (modalActiveVariant.id || modalActiveVariant.unit_label || modalActiveVariant.label || 'default') : 'default';
        const cartKey = `${selectedProductDetails.id}-${variantIdentifier}`;
        const modalCartItem = cart.find(item => item.cartItemId === cartKey);
        const modalQty = modalCartItem ? modalCartItem.quantity : 0;

        const similarProducts = products.filter(p => 
          p.id !== selectedProductDetails.id && 
          (
            (selectedProductDetails.category_id && p.category_id === selectedProductDetails.category_id) ||
            (selectedProductDetails.category && (p.category === selectedProductDetails.category || p.category_id === selectedProductDetails.category))
          )
        ).slice(0, 4);

        const ratingNum = selectedProductDetails.avgRating ? Number(selectedProductDetails.avgRating) : 4.0;
        const reviewCountNum = selectedProductDetails.reviewCount || productReviews.length || 1;

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center z-[1100] font-sans p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] mb-16 sm:mb-0"
            >
              {/* Modal Sticky Top Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100 bg-white sticky top-0 z-20">
                <button 
                  onClick={() => setSelectedProductDetails(null)}
                  className="p-1.5 -ml-1 text-slate-900 hover:bg-stone-100 rounded-full transition cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft size={20} className="stroke-[2.5]" />
                </button>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">Product Details</h3>
                <button 
                  onClick={(e) => toggleWishlist(selectedProductDetails.id, e)}
                  className="p-2 text-stone-700 hover:text-rose-500 transition cursor-pointer"
                  title="Wishlist"
                >
                  <Heart size={20} className={wishlistIds.includes(selectedProductDetails.id) ? 'fill-rose-500 text-rose-500' : ''} />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 pb-24">
                
                {/* Clean Product Image Carousel */}
                <div className="space-y-3">
                  <div className="aspect-[4/3] bg-stone-50/80 rounded-3xl flex items-center justify-center p-6 relative border border-stone-100">
                    <img 
                      src={activeGalleryImage || modalImages[0] || ''} 
                      alt={selectedProductDetails.name} 
                      className="w-full h-full object-contain drop-shadow-md" 
                    />
                    {isModalOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-20 rounded-3xl">
                        <span className="bg-white text-stone-950 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">Sold Out</span>
                      </div>
                    )}
                  </div>

                  {modalImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {modalImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveGalleryImage(imgUrl)}
                          className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition cursor-pointer shrink-0 bg-stone-50 ${
                            activeGalleryImage === imgUrl ? 'border-orange-600 scale-105' : 'border-stone-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Title, Rating & Pricing Block */}
                <div className="space-y-3 bg-stone-50/50 p-5 rounded-3xl border border-stone-100">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                    {selectedProductDetails.name}
                  </h2>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((starIdx) => (
                        <Star 
                          key={starIdx} 
                          size={13} 
                          className={starIdx <= Math.round(ratingNum) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'} 
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-700 text-xs">
                      {ratingNum.toFixed(1)} <span className="text-stone-400">({reviewCountNum} reviews)</span>
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 pt-1">
                    <span className="text-2xl font-black text-slate-900">₹{modalPrice.toFixed(0)}</span>
                    {hasModalMrp && (
                      <span className="text-stone-400 line-through font-bold text-sm">₹{modalMrp.toFixed(0)}</span>
                    )}
                    {discountPct > 0 && (
                      <span className="bg-orange-500 text-white font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>

                  {hasVariants && (
                    <div className="pt-3 border-t border-stone-200/60 space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500">Select Variant / Unit</label>
                      <div className="flex flex-wrap gap-2">
                        {variants.map((v, idx) => {
                          const vKey = v.id || v.label || v.unit_label || idx;
                          const vLabel = v.unit_label || v.label || `Option ${idx + 1}`;
                          const isVarSelected = (currentVariantKey === v.id || currentVariantKey === v.label || currentVariantKey === v.unit_label);
                          return (
                            <button
                              key={vKey}
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [selectedProductDetails.id]: vKey }))}
                              className={`px-3.5 py-2 rounded-2xl text-xs font-black border transition cursor-pointer ${
                                isVarSelected 
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {vLabel} • ₹{v.price}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description Block */}
                {selectedProductDetails.description && (
                  <div className="space-y-2 bg-white p-5 rounded-3xl border border-stone-100">
                    <h4 className="font-black text-xs uppercase tracking-wider text-stone-400">Product Information</h4>
                    <p className="text-xs text-stone-700 leading-relaxed font-medium">
                      {isDescriptionExpanded 
                        ? selectedProductDetails.description 
                        : (selectedProductDetails.description.slice(0, 160) + (selectedProductDetails.description.length > 160 ? '...' : ''))}
                      {selectedProductDetails.description.length > 160 && (
                        <button 
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} 
                          className="text-orange-600 font-extrabold ml-1 hover:underline cursor-pointer"
                        >
                          {isDescriptionExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </p>
                  </div>
                )}

                {/* Similar Products Shelf */}
                {similarProducts.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="font-black text-sm text-slate-900 tracking-tight">Similar Products</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {similarProducts.map(p => {
                        const pImgs = p.images || p.gallery || [p.image_url].filter(Boolean);
                        const pVariants = p.variants || p.product_variants || [];
                        const pVar = pVariants[0] || null;
                        const pPrice = Number(pVar ? pVar.price : p.price || 0);

                        return (
                          <div 
                            key={p.id}
                            onClick={async () => {
                              setSelectedProductDetails(p);
                              setActiveGalleryImage(pImgs[0] || '');
                              await fetchProductReviews(p.id);
                            }}
                            className="bg-white p-3.5 rounded-3xl border border-stone-200/80 cursor-pointer space-y-2 group hover:shadow-md transition"
                          >
                            <div className="aspect-square bg-stone-50 rounded-2xl p-2 flex items-center justify-center relative">
                              <img src={pImgs[0] || ''} alt="" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                            </div>
                            <h5 className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</h5>
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-black text-sm text-slate-900">₹{pPrice.toFixed(0)}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); addToCart(p, pVar); }}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl font-extrabold text-[10px] shadow-xs cursor-pointer transition"
                              >
                                ADD
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Floating Bottom Action Bar (Lifted above Bottom Nav) */}
              <div className="p-3.5 bg-white/95 backdrop-blur-md border-t border-stone-200/80 flex items-center gap-3 sticky bottom-16 sm:bottom-0 z-30 shadow-2xl">
                <div className="flex items-center bg-stone-100 rounded-2xl px-2.5 py-2 gap-2.5 border border-stone-200">
                  <button 
                    onClick={() => {
                      if (modalQty > 0) {
                        updateQuantity(modalCartItem.cartItemId, -1);
                      }
                    }}
                    className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer p-1"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="font-black text-xs text-slate-900 w-4 text-center">{modalQty > 0 ? modalQty : 1}</span>
                  <button 
                    onClick={() => {
                      if (modalQty > 0) {
                        updateQuantity(modalCartItem.cartItemId, 1);
                      } else {
                        addToCart(selectedProductDetails, modalActiveVariant);
                      }
                    }}
                    className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer p-1"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button 
                  onClick={() => {
                    if (modalQty === 0) {
                      addToCart(selectedProductDetails, modalActiveVariant);
                    }
                    setIsCartOpen(true);
                    setSelectedProductDetails(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-orange-600/25 transition cursor-pointer"
                >
                  <span>Add to Cart</span>
                  <span className="border-l border-orange-500 pl-3 font-mono text-xs">₹{(modalPrice * (modalQty > 0 ? modalQty : 1)).toFixed(0)}</span>
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      

{/* 3. Cart Drawer Component */}
<CartDrawer 
  isOpen={isCartOpen}
  onClose={() => setIsCartOpen(false)}
  cart={cart}
  totalItemsCount={totalItemsCount}
  session={session}
  savedAddresses={savedAddresses}
  selectedAddressId={selectedAddressId}
  handleSelectAddress={handleSelectAddress}
  showAddAddressBox={showAddAddressBox}
  setShowAddAddressBox={handleToggleAddAddressBox}
  newAddressForm={newAddressForm}
  setNewAddressForm={setNewAddressForm}
  detectCustomerLocation={() => {}}
  handleAddAddress={handleAddAddress}
  handleDeleteAddress={handleDeleteAddress}
  updateQuantity={updateQuantity}
  appliedCoupon={appliedCoupon}
  setAppliedCoupon={setAppliedCoupon}
  couponInput={couponInput}
  setCouponInput={setCouponInput}
  handleApplyCoupon={handleApplyCoupon}
  removeCoupon={() => { setAppliedCoupon(null); setDiscountAmount(0); }}
  cartSubtotal={cartSubtotal}
  discountAmount={discountAmount}
  selectedAddressDistance={selectedAddressDistance}
  deliveryFee={deliveryFee}
  cartTotal={cartTotal}
  checkingOut={checkingOut}
  handleCheckout={handleCheckout}
  navigate={navigate}
  addToCart={addToCart}
/>

      {/* Invoice Modal */}
      <InvoiceModal 
        order={selectedInvoiceOrder} 
        isOpen={Boolean(selectedInvoiceOrder)} 
        onClose={() => setSelectedInvoiceOrder(null)} 
      />

      {/* Feedback Modal */}
      <CustomerFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* 3. Bottom Nav Component */}
<PortalBottomNav 
  totalItemsCount={totalItemsCount}
  totalPrice={cartTotal}
  onOpenCart={() => setIsCartOpen(true)}
/>

    </div>
  );
}