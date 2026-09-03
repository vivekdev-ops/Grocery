// src/components/CustomerStorefront.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Package, X, User, MapPin, ChevronRight, ChevronDown, LogOut, Trash2, 
  FileText, Heart, ArrowRight, Store, Navigation, MessageSquarePlus, Ban, 
  Star, RotateCcw, MessageCircle, CheckCircle, LifeBuoy, AlertCircle, Clock, ShieldCheck,
  Sparkles, Bot, Mic, MicOff, Search, Send
} from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import Footer from './Footer';
import CustomerFeedbackModal from './CustomerFeedbackModal';
import { calculateDistanceKm } from '../utils/distance';
import { registerPushToken, notifyAdminOrderPlaced, notifyShopkeeperOrderPlaced, notifyCustomerOrderStatus } from '../utils/notifications';
import { Geolocation } from '@capacitor/geolocation';
import CustomerProfileModal from './store/CustomerProfileModal';

// Import Modular Components
import StoreHeader from './store/StoreHeader';
import ProductGrid from './store/ProductGrid';
import CartDrawer from './store/CartDrawer';

export default function CustomerStorefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [personalizedDeals, setPersonalizedDeals] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

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
  const [deliveredProductIds, setDeliveredProductIds] = useState([]);
  const [userReviewsMap, setUserReviewsMap] = useState({});

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

  const getCurrentPositionNative = async () => {
  try {
    const coordinates = await Geolocation.getCurrentPosition();
    return {
      latitude: coordinates.coords.latitude,
      longitude: coordinates.coords.longitude
    };
  } catch (error) {
    console.error('Error getting native location:', error);
    return null;
  }
};

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

      // 1. Insert the parent order into the 'orders' table
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
          latitude: selectedAddrObj?.latitude || null,
          longitude: selectedAddrObj?.longitude || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert cart items along with variant details into 'order_items'
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
        } else {
          const pId = item?.product?.id || item?.id || item?.product_id;
          const currentStock = Number(item?.product?.stock || item?.stock || 0);
          if (pId) {
            await supabase.from('products').update({ stock: currentStock - item.quantity }).eq('id', pId);
          }
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

      // ── Notify admin & shopkeepers about the new order ──
      notifyAdminOrderPlaced(orderData);
      // Collect unique shopkeeper user_ids from cart items
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

  // Invoice Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Selected Variants State for each product
  const [selectedVariants, setSelectedVariants] = useState({});

  // Delivery Fee Rules & Coupons State
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(40);
  const [selectedAddressDistance, setSelectedAddressDistance] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

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
  const [isListening, setIsListening] = useState(false);
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
      const { data, error } = await supabase
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

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

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
          setSelectedVariants(prev => ({ ...prev, [p.id]: mergedVariants[0].id || mergedVariants[0].label }));
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
          { sender: 'ai', text: `I found matching items for your request! I've added **${addedNames.join(', ')}** to your cart. Ready for fast 10-minute delivery.` }
        ]);
      } else {
        setAiChatMessages(prev => [
          ...prev, 
          { sender: 'ai', text: `I scanned our inventory for "${userMsg}", but couldn't find an exact match. Try asking for items like milk, paneer, rice, oil, or snacks!` }
        ]);
      }
    }, 600);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setSearchQuery(speechToText);
    };

    recognition.start();
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
    e.stopPropagation();
    if (!session) { navigate('/login'); return; }

    const isAlreadyWishlisted = wishlistIds.includes(productId);

    if (isAlreadyWishlisted) {
      const { error } = await supabase.from('wishlists').delete().eq('user_id', session.user.id).eq('product_id', productId);
      if (!error) {
        setWishlistIds(prev => prev.filter(id => id !== productId));
        setWishlistProducts(prev => prev.filter(p => p.id !== productId));
      }
    } else {
      const { error } = await supabase.from('wishlists').insert([{ user_id: session.user.id, product_id: productId }]);
      if (!error) {
        setWishlistIds(prev => [...prev, productId]);
        const prodToAdd = products.find(p => p.id === productId);
        if (prodToAdd) setWishlistProducts(prev => [...prev, prodToAdd]);
      }
    }
  };

  const fetchDeliveryRules = async () => {
    const { data } = await supabase.from('delivery_rules').select('*');
    if (data) setDeliveryRules(data);
  };

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setBanners(data);
  };

  const fetchMyOrders = async (email) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyOrders(data || []);

      const deliveredIds = [];
      data.forEach(order => {
        if (order.status === 'delivered' && order.order_items) {
          order.order_items.forEach(item => {
            if (item.product_id) deliveredIds.push(item.product_id);
          });
        }
      });
      setDeliveredProductIds(deliveredIds);
    }
  };

 const handleReorder = (order) => {
    if (!order.order_items || order.order_items.length === 0) return;

    let addedCount = 0;
    let updatedCart = [...cart];

    order.order_items.forEach(item => {
      const prod = item.products;
      if (prod && Number(prod.stock || 0) > 0) {
        const pImages = prod.images || prod.gallery || [prod.image_url].filter(Boolean);
        const itemImage = pImages[0] || '';

        // Match variant if stored or fallback to base product price/variant
        const variantKey = item.variant_id;
        const matchedVariant = prod.variants?.find(v => v.id === variantKey || v.label === variantKey || v.unit_label === variantKey) || (prod.variants && prod.variants[0]) || null;

        // Strictly determine single unit price (never use multiplied line total directly)
        const unitPrice = Number(matchedVariant ? matchedVariant.price : prod.price) || (Number(item.price) / Number(item.quantity || 1));

        const cartItemId = matchedVariant ? `${prod.id}-${matchedVariant.id || matchedVariant.label || matchedVariant.unit_label}` : prod.id;
        const itemTitle = matchedVariant ? `${prod.name} (${matchedVariant.unit_label || matchedVariant.label})` : prod.name;

        const existingIndex = updatedCart.findIndex(ci => ci.cartItemId === cartItemId);
        if (existingIndex > -1) {
          updatedCart[existingIndex] = {
            ...updatedCart[existingIndex],
            quantity: updatedCart[existingIndex].quantity + item.quantity
          };
        } else {
          updatedCart.push({
            cartItemId,
            product: prod,
            variant: matchedVariant,
            id: prod.id,
            product_id: prod.id,
            title: itemTitle,
            price: unitPrice, // Stored strictly as single unit price
            quantity: item.quantity,
            stock: Number(prod.stock || 10),
            image: itemImage
          });
        }
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setCart(updatedCart);
      localStorage.setItem('cart_items', JSON.stringify(updatedCart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updatedCart }));
      window.dispatchEvent(new Event('storage'));

      alert("Items from past order successfully added to your cart!");
      setIsCartOpen(true);
    } else {
      alert("Sorry, items in this order are currently out of stock.");
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
      // Pure updater — no side effects here (StrictMode double-invokes updaters in dev)
      return updatedCart;
    });

    // Side effects run once, outside the updater
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
      // Notify admin that the customer cancelled (customer themselves already knows)
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

    const fullFormattedAddress = `${newAddressForm.house_no}, ${newAddressForm.ward_no_name}, ${newAddressForm.city}, ${newAddressForm.district}, ${newAddressForm.state} - ${newAddressForm.pincode}`;

    const { error } = await supabase.from('customer_addresses').insert([{
      user_id: session.user.id,
      title: newAddressForm.title,
      house_no: newAddressForm.house_no,
      ward_no_name: newAddressForm.ward_no_name,
      city: newAddressForm.city,
      district: newAddressForm.district,
      state: newAddressForm.state,
      pincode: newAddressForm.pincode,
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
    if (!deliveryRules || deliveryRules.length === 0) return 40;

    const currentDist = Number(distKm || 0);

    let matchedRule = deliveryRules.find(r => {
      const minCart = Number(r.min_cart_value || 0);
      const maxCart = Number(r.max_cart_value || 999999);
      const minDst = Number(r.min_distance_km || 0);
      const maxDst = Number(r.max_distance_km || 999);

      return subtotal >= minCart && subtotal <= maxCart && currentDist >= minDst && currentDist <= maxDst;
    });

    if (matchedRule) return Number(matchedRule.delivery_fee);

    const cartOnlyRule = deliveryRules.find(r => {
      const minCart = Number(r.min_cart_value || 0);
      const maxCart = Number(r.max_cart_value || 999999);
      return subtotal >= minCart && subtotal <= maxCart;
    });

    if (cartOnlyRule) return Number(cartOnlyRule.delivery_fee);

    return 40;
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

  const addToCart = (product) => {
    const variantKey = selectedVariants[product.id];
    const variant = product.variants?.find(v => (v.id === variantKey || v.label === variantKey || v.unit_label === variantKey));
     
    const stockCheck = Number(variant ? variant.stock : product.stock || 0);
    if (stockCheck <= 0) {
      alert("Sorry, this item is currently out of stock.");
      return;
    }

    const cartItemId = variant ? `${product.id}-${variant.id || variant.label || variant.unit_label}` : product.id;
    const itemTitle = variant ? `${product.name} (${variant.unit_label || variant.label})` : product.name;
     
    // Ensure we always take the single unit price
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

    // Side effects run once outside the updater (avoids StrictMode double-invoke issues)
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

      let discount = data.discount_type === 'percentage' ? (cartSubtotal * data.discount_value) / 100 : data.discount_value;
      setDiscountAmount(Math.min(discount, cartSubtotal));
      setAppliedCoupon(data);
      setCouponInput('');
      alert("Coupon applied successfully!");
    } catch (err) {
      alert(`Failed to apply coupon: ${err.message || err}`);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const shareOnWhatsApp = (product) => {
    const productUrl = window.location.href;
    const message = encodeURIComponent(
      `Hey! Check out *${product.name}* on KD Store delivered in 10 minutes! 🛒✨\n\nView here: ${productUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-slate-900 pb-44 font-sans selection:bg-emerald-500 selection:text-white">
       
      {/* 1. Header Component (Includes KD Store Logo & Brand Name) */}
     {/* 1. Header Component */}
<StoreHeader 
  session={session} 
  customerProfile={customerProfile}
  searchQuery={searchQuery} 
  setSearchQuery={setSearchQuery} 
  totalItemsCount={totalItemsCount} 
  onOpenProfile={() => setIsProfileOpen(true)} 
  onOpenCart={() => setIsCartOpen(true)} 
/>

      {personalizedDeals.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4 border border-emerald-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400 fill-amber-400 animate-pulse" size={20} />
                <h3 className="font-black text-base md:text-lg tracking-tight">Deals Picked For Your Routine</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">Limited Time</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {personalizedDeals.map(deal => {
                const prod = deal.products;
                if (!prod) return null;
                 
                const pImages = prod.images || prod.gallery || [prod.image_url].filter(Boolean);
                 
                const originalPrice = Number(prod.price || prod.mrp || 0);
                const baseMrp = Number(prod.mrp || originalPrice);

                const badgeText = String(deal.discount_tag || deal.discount_badge || deal.badge_label || '');
                const matchPercent = badgeText.match(/(\d+)\s*%/);
                const extractedPercent = matchPercent ? parseInt(matchPercent[1], 10) : 0;

                let finalPrice = originalPrice;
                let displayMrp = baseMrp > originalPrice ? baseMrp : null;

                if (extractedPercent > 0) {
                  if (!displayMrp || displayMrp <= originalPrice) {
                    displayMrp = originalPrice;
                  }
                  finalPrice = Math.round(displayMrp * (1 - extractedPercent / 100));
                }
                 
                const productWithDealPrice = { ...prod, price: finalPrice, mrp: displayMrp || originalPrice };

                return (
                  <div key={deal.id} className="bg-emerald-950/70 p-4 rounded-2xl border border-emerald-800/60 flex flex-col justify-between space-y-3 backdrop-blur-md">
                    <div className="space-y-2">
                      <div className="relative h-32 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                        <img src={pImages[0] || ''} alt="" className="w-full h-full object-cover" />
                         
                        {badgeText && (
                          <span className="absolute top-2 left-2 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-lg shadow">
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-white line-clamp-1">{prod.name}</h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-800/50">
                      <div>
                        <span className="font-black text-sm text-emerald-300">₹{finalPrice}</span>
                        {displayMrp && displayMrp > finalPrice && (
                          <span className="text-[10px] text-slate-400 line-through ml-1.5">₹{displayMrp}</span>
                        )}
                      </div>
                      <button 
                        onClick={() => addToCart(productWithDealPrice)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer shadow"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Profile & Dashboard Drawer */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-end z-[999] transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2.5"><User size={20} className="text-emerald-700" /> My Account & Dashboard</h3>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-emerald-100/60 rounded-full text-slate-600 hover:bg-emerald-100 transition cursor-pointer"><X size={16} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl shadow-2xs">
                <p className="text-[10px] text-emerald-800 uppercase font-black tracking-widest">Signed in as</p>
                <p className="font-bold text-slate-900 mt-1 truncate text-sm">{session?.user?.email}</p>
              </div>

              {/* Edit Profile Section */}
              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'profile_edit' ? null : 'profile_edit')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <User size={16} className="text-emerald-700" /> Edit Profile & Preferences
                  </span>
                  {openSection === 'profile_edit' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                  }} className="p-4 pt-0 space-y-3 bg-white border-t border-emerald-100">
                    <div className="space-y-1 pt-2">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Full Name</label>
                      <input 
                        type="text" 
                        name="fullName"
                        placeholder="Enter your name" 
                        defaultValue={customerProfile?.full_name || ''}
                        className="w-full border border-emerald-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-emerald-600 font-medium" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Phone Number</label>
                      <input 
                        type="text" 
                        name="phone"
                        placeholder="+91 98765 43210" 
                        defaultValue={customerProfile?.phone || ''}
                        className="w-full border border-emerald-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-emerald-600 font-medium" 
                      />
                    </div>
                     
                    {/* Avatar Selection Grid & URL input */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Profile Avatar</label>
                      <p className="text-[10px] text-slate-400">Choose a preset avatar or paste a custom image URL below:</p>
                      <div className="flex gap-2 py-1 overflow-x-auto">
                        {[
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack',
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi',
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo'
                        ].map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const urlInput = document.getElementById('avatarUrlInput');
                              if (urlInput) urlInput.value = presetUrl;
                            }}
                            className="w-10 h-10 rounded-full border-2 border-emerald-200 overflow-hidden shrink-0 hover:scale-105 transition bg-emerald-50 cursor-pointer flex items-center justify-center"
                            title="Click to select avatar preset"
                          >
                            <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>

                      <input 
                        id="avatarUrlInput"
                        type="url" 
                        name="avatarUrl"
                        placeholder="https://example.com/avatar.jpg" 
                        defaultValue={customerProfile?.avatar_url || ''}
                        className="w-full border border-emerald-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-emerald-600 font-medium" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 uppercase text-[10px]">Interests & Preferences</label>
                      <textarea 
                        name="interests"
                        rows="2"
                        placeholder="e.g. Organic, Snacks, Dairy..." 
                        defaultValue={customerProfile?.interests || ''}
                        className="w-full border border-emerald-200 p-2.5 rounded-xl bg-stone-50 outline-none focus:border-emerald-600 font-medium resize-none" 
                      />
                    </div>
                    <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-black cursor-pointer shadow-sm">
                      Save Profile Changes
                    </button>
                  </form>
                )}
              </div>

              {predictedRefillItems.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-950 to-teal-950 text-white p-4 rounded-2xl border border-emerald-800 space-y-2 shadow-md">
                  <div className="flex items-center gap-2 text-amber-400 font-black">
                    <Sparkles size={16} /> AI Smart Refill Basket
                  </div>
                  <p className="text-[11px] text-emerald-200">Based on your past orders, you might need these staples soon:</p>
                  <div className="space-y-1.5 pt-1">
                    {predictedRefillItems.map(p => (
                      <div key={p.id} className="bg-emerald-900/60 p-2 rounded-xl flex items-center justify-between border border-emerald-700/50">
                        <span className="font-bold truncate max-w-[180px]">{p.name}</span>
                        <button 
                          onClick={() => addToCart(p)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 rounded-lg font-black text-[10px] cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* My Orders Section - Blinkit Tabbed Quick-Commerce Style */}
              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'orders' ? null : 'orders')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Package size={16} className="text-emerald-700" /> My Orders ({myOrders.length})
                  </span>
                  {openSection === 'orders' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'orders' && (() => {
                  const activeOrders = myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
                  const deliveredOrders = myOrders.filter(o => o.status === 'delivered');
                  const cancelledOrders = myOrders.filter(o => o.status === 'cancelled');

                  const renderOrderCard = (order) => {
                    const complaintTicket = myComplaintsMap[order.id];

                    return (
                      <div key={order.id} className="p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-900">#{order.id.slice(0, 8)}</span>
                          <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>{order.status}</span>
                        </div>
                         
                        {complaintTicket && (
                          <div className={`p-2 rounded-xl text-[10px] font-bold flex items-center justify-between border ${
                            complaintTicket.status === 'resolved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <span className="flex items-center gap-1">
                              <LifeBuoy size={12} /> Complaint Status: <strong className="uppercase">{complaintTicket.status || 'open'}</strong>
                            </span>
                            <span className="font-mono text-[9px]">Ticket Active</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-slate-500">
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          <span className="font-black text-slate-900 text-sm">₹{order.total_amount}</span>
                        </div>
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <button 
                            onClick={() => setSelectedProfileOrder(order)}
                            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 border border-emerald-200 cursor-pointer"
                          >
                            <FileText size={13} /> Details
                          </button>
                          {order.status === 'delivered' && (
                            <button 
                              onClick={() => handleReorder(order)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl font-black transition flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <RotateCcw size={13} /> Reorder
                            </button>
                          )}
                          {order.status === 'delivered' && (
                            <button 
                              onClick={() => setSelectedInvoiceOrder(order)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl font-bold transition border border-slate-200 cursor-pointer"
                            >
                              Bill
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="p-4 pt-0 space-y-3 bg-white border-t border-emerald-100 text-xs">
                      {myOrders.length === 0 ? (
                        <p className="text-slate-400 italic py-3 text-center">No orders placed yet.</p>
                      ) : (
                        <>
                          {/* Blinkit Tab Bar */}
                          <div className="flex gap-1 bg-emerald-50/70 p-1 rounded-2xl border border-emerald-100 mt-2">
                            <button
                              onClick={() => setOrderTab('active')}
                              className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer ${
                                orderTab === 'active' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Active ({activeOrders.length})
                            </button>
                            <button
                              onClick={() => setOrderTab('delivered')}
                              className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer ${
                                orderTab === 'delivered' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Delivered ({deliveredOrders.length})
                            </button>
                            <button
                              onClick={() => setOrderTab('cancelled')}
                              className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition cursor-pointer ${
                                orderTab === 'cancelled' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Cancelled ({cancelledOrders.length})
                            </button>
                          </div>

                          {/* Tab Content Panels */}
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

              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'wishlist' ? null : 'wishlist')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Heart size={16} className="text-rose-600" /> My Wishlist ({wishlistProducts.length})
                  </span>
                  {openSection === 'wishlist' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'wishlist' && (
                  <div className="p-4 pt-0 space-y-2.5 bg-white border-t border-emerald-100">
                    {wishlistProducts.length === 0 ? (
                      <p className="text-slate-400 italic py-3 text-center">Your wishlist is empty.</p>
                    ) : (
                      wishlistProducts.map(p => {
                        const pImages = p.images || p.gallery || [p.image_url].filter(Boolean);
                        return (
                          <div key={p.id} className="p-3 bg-emerald-50/20 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={pImages[0] || ''} alt="" className="w-11 h-11 object-cover rounded-xl border border-emerald-200 bg-white" />
                              <div>
                                <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                                <span className="font-black text-emerald-700">₹{p.price}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => addToCart(p)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl font-black shadow-sm transition cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'addresses' ? null : 'addresses')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin size={16} className="text-emerald-700" /> Saved Addresses ({savedAddresses.length})
                  </span>
                  {openSection === 'addresses' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'addresses' && (
                  <div className="p-4 pt-0 space-y-3 bg-white border-t border-emerald-100">
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">Your Locations</span>
                      <button onClick={() => handleToggleAddAddressBox(!showAddAddressBox)} className="text-emerald-700 font-black hover:underline cursor-pointer">
                        {showAddAddressBox ? 'Cancel' : '+ Add Address'}
                      </button>
                    </div>

                    {showAddAddressBox && (
                      <form onSubmit={handleAddAddress} className="bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-200 space-y-2.5">
                        <input type="text" placeholder="Title (Home/Work)" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none" value={newAddressForm.title} onChange={e => setNewAddressForm({...newAddressForm, title: e.target.value})} />
                         
                        <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center gap-1.5 border border-emerald-200 text-[11px]">
                          <Navigation size={13} className="shrink-0" />
                          <span>{newAddressForm.latitude ? 'GPS Location automatically detected!' : 'Detecting GPS location...'}</span>
                        </div>

                        <input type="text" placeholder="House No." required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none" value={newAddressForm.house_no} onChange={e => setNewAddressForm({...newAddressForm, house_no: e.target.value})} />
                        <input type="text" placeholder="Ward / Colony Name" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none" value={newAddressForm.ward_no_name} onChange={e => setNewAddressForm({...newAddressForm, ward_no_name: e.target.value})} />
                        <input type="tel" placeholder="Phone Number" required className="w-full border border-emerald-200 p-2.5 rounded-xl bg-white outline-none" value={newAddressForm.phone} onChange={e => setNewAddressForm({...newAddressForm, phone: e.target.value})} />
                        <button type="submit" className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-black cursor-pointer">Save Address</button>
                      </form>
                    )}

                    {savedAddresses.map(addr => (
                      <div key={addr.id} className="p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-200 flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900 block">{addr.title}</span>
                          <span className="text-slate-600 block mt-0.5 leading-snug">{addr.address}</span>
                          <span className="text-slate-400 font-mono text-[10px] block mt-1">Phone: {addr.phone}</span>
                        </div>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="w-full bg-emerald-50/60 hover:bg-emerald-100 text-slate-900 p-4 rounded-2xl font-black flex items-center justify-between border border-emerald-200 transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquarePlus size={16} className="text-emerald-700" /> Send Feedback & Suggestions
                </span>
                <ChevronRight size={16} />
              </button>

            </div>

            <div className="p-6 border-t border-emerald-100 bg-emerald-50/50">
              <button 
                onClick={() => { supabase.auth.signOut(); setIsProfileOpen(false); }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3.5 rounded-2xl transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs border border-rose-200 cursor-pointer"
              >
                <LogOut size={16} /> Logout Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal (Isolated with high z-[1000] layer to prevent background bleeding) */}
      {selectedProfileOrder && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Order #{selectedProfileOrder.id.slice(0, 8)} Details</h3>
              <button onClick={() => setSelectedProfileOrder(null)} className="p-1.5 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 cursor-pointer"><X size={16}/></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Order Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                  selectedProfileOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  selectedProfileOrder.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>{selectedProfileOrder.status}</span>
              </div>

              {myComplaintsMap[selectedProfileOrder.id] && (
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-2xl border border-teal-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-teal-900 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <LifeBuoy size={14} className="text-teal-700" /> Support Ticket Status
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      myComplaintsMap[selectedProfileOrder.id].status === 'resolved' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
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

              {selectedProfileOrder.otp && selectedProfileOrder.status !== 'delivered' && selectedProfileOrder.status !== 'cancelled' && (
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex justify-between items-center">
                  <span className="text-emerald-900 font-bold">Delivery Verification OTP:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm tracking-widest bg-white px-3 py-1 rounded-xl border border-emerald-200">{selectedProfileOrder.otp}</span>
                </div>
              )}

              {selectedProfileOrder.status === 'delivered' && !myComplaintsMap[selectedProfileOrder.id] && (
                <button
                  onClick={() => setOrderHelpTarget({ order: selectedProfileOrder, item: null })}
                  className="w-full bg-teal-50 hover:bg-teal-100 text-teal-800 p-3 rounded-2xl border border-teal-200 font-black flex items-center justify-between transition cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <LifeBuoy size={16} className="text-teal-700" /> Need Help with this Whole Order?
                  </span>
                  <ChevronRight size={14} />
                </button>
              )}

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Ordered Items</span>
                <div className="space-y-2 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100">
                  {selectedProfileOrder.order_items?.map(item => {
                    const itemImages = item.products?.images || item.products?.gallery || [item.products?.image_url].filter(Boolean);
                    const itemImg = itemImages[0] || '';
                    const hasReviewed = userReviewsMap[item.product_id];

                    return (
                      <div key={item.id} className="flex flex-col gap-2 py-2 border-b border-emerald-100 last:border-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={itemImg} alt="" className="w-11 h-11 object-cover rounded-xl border border-emerald-200 bg-white shrink-0" />
                            <div className="min-w-0">
                              <span className="font-black text-slate-900 block truncate">{item.products?.name || 'Item'}</span>
                              <span className="text-slate-500 font-medium text-[11px]">Qty: {item.quantity} • ₹{item.price * item.quantity}</span>
                            </div>
                          </div>

                          {selectedProfileOrder.status === 'delivered' && item.products && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setOrderHelpTarget({ order: selectedProfileOrder, item: item.products })}
                                className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition flex items-center gap-1 cursor-pointer"
                                title="Report issue with this specific item"
                              >
                                <LifeBuoy size={11} /> Item Help
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
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                                  hasReviewed 
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' 
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {hasReviewed ? <><Star size={11} className="fill-amber-500 text-amber-500" /> Review</> : <><Star size={11} /> Rate</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Delivery Address</p>
                <p className="text-slate-800 font-medium leading-snug">{selectedProfileOrder.delivery_address}</p>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex justify-between items-center font-black text-sm text-slate-900">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-700">₹{selectedProfileOrder.total_amount}</span>
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
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-emerald-100 space-y-4">
          <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <LifeBuoy size={16} className="text-teal-700" />
              {orderHelpTarget.item ? 'Item Support Request' : 'Order Support Request'}
            </h3>
            <button onClick={() => setOrderHelpTarget(null)} className="p-1 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 cursor-pointer"><X size={16}/></button>
          </div>

          <form onSubmit={handleSubmitOrderHelp} className="space-y-3.5 text-xs">
            <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-200 space-y-1">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Target Reference</span>
              <p className="font-black text-slate-900">Order #{orderHelpTarget.order.id.slice(0, 8)}</p>
              {orderHelpTarget.item && (
                <p className="text-teal-700 font-bold">Product: {orderHelpTarget.item.name}</p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Issue Category</label>
              <select 
                value={helpForm.issueType} 
                onChange={e => setHelpForm({...helpForm, issueType: e.target.value})}
                className="w-full border border-emerald-200 p-3 rounded-2xl bg-emerald-50/30 text-slate-900 font-bold outline-none cursor-pointer"
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
                className="w-full border border-emerald-200 p-3 rounded-2xl bg-emerald-50/30 text-slate-900 outline-none resize-none focus:border-emerald-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={submittingHelp}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3.5 rounded-2xl font-black tracking-wider uppercase transition shadow-lg shadow-teal-700/20 disabled:opacity-50 cursor-pointer"
            >
              {submittingHelp ? 'Submitting Request...' : 'Submit Support Request'}
            </button>
          </form>
        </div>
      </div>
    )}

    {reviewModalProduct && (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-emerald-100 space-y-4">
          <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
            <h3 className="font-black text-sm text-slate-900">
              {userReviewsMap[reviewModalProduct.id] ? 'Edit Product Review' : 'Rate & Review Product'}
            </h3>
            <button onClick={() => setReviewModalProduct(null)} className="p-1 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 cursor-pointer"><X size={16}/></button>
          </div>

          <form onSubmit={handleAddOrUpdateReview} className="space-y-3.5 text-xs">
            <div className="flex items-center gap-3 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100">
              <img 
                src={reviewModalProduct.image_url || (reviewModalProduct.images && reviewModalProduct.images[0]) || ''} 
                alt="" 
                className="w-11 h-11 object-cover rounded-xl bg-white border border-emerald-200" 
              />
              <span className="font-bold text-slate-950 truncate">{reviewModalProduct.name}</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Star Rating</label>
              <select 
                value={newReviewForm.rating} 
                onChange={e => setNewReviewForm({...newReviewForm, rating: e.target.value})}
                className="w-full border border-emerald-200 p-3 rounded-2xl bg-emerald-50/30 text-slate-900 font-bold outline-none cursor-pointer"
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
                className="w-full border border-emerald-200 p-3 rounded-2xl bg-emerald-50/30 text-slate-900 outline-none resize-none focus:border-emerald-500"
              />
            </div>

            <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 rounded-2xl font-black tracking-wider uppercase transition shadow-lg shadow-emerald-700/20 cursor-pointer">
              {userReviewsMap[reviewModalProduct.id] ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>
    )}

    {orderSuccess && (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-emerald-100 space-y-4">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Order Placed!</h2>
            <p className="text-slate-500 text-xs mt-1">Your quick delivery order <span className="font-mono font-bold text-slate-900">#{orderSuccess}</span> is being packed.</p>
          </div>
          <button 
            onClick={() => { setOrderSuccess(null); setIsProfileOpen(true); setOpenSection('orders'); }}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-xl shadow-emerald-700/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Track Order Status <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )}

    {/* 2. Product Grid Component */}
    <ProductGrid 
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
      onSelectProduct={async (product) => {
        setSelectedProductDetails(product);
        setIsDescriptionExpanded(false);
        const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
        setActiveGalleryImage(pImages[0] || '');
        await fetchProductReviews(product.id);
      }}
    />

    {/* Product Details Modal */}
    {selectedProductDetails && (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
        <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">
           
          <div className="flex justify-between items-center border-b border-emerald-100 pb-3 gap-3">
            <h3 className="font-black text-base md:text-lg text-slate-900 truncate">{selectedProductDetails.name}</h3>
            <button 
              onClick={() => { setSelectedProductDetails(null); setIsDescriptionExpanded(false); }} 
              className="p-2 rounded-full hover:bg-emerald-50 text-slate-500 cursor-pointer shrink-0"
            >
              <X size={18}/>
            </button>
          </div>

          {(() => {
            const modalImages = selectedProductDetails.images || selectedProductDetails.gallery || [selectedProductDetails.image_url].filter(Boolean);
            const currentVariantKey = selectedVariants[selectedProductDetails.id];
            const modalActiveVariant = selectedProductDetails.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
             
            const modalPrice = Number(modalActiveVariant ? modalActiveVariant.price : selectedProductDetails.price || 0);
            const modalMrp = Number(modalActiveVariant?.mrp || selectedProductDetails.mrp || 0);
            const hasModalMrp = modalMrp > modalPrice;
            const modalStock = Number(modalActiveVariant ? modalActiveVariant.stock : selectedProductDetails.stock || 0);
            const isModalOutOfStock = modalStock <= 0;

            return (
              <>
                <div className="space-y-3">
                  <div className="h-60 bg-emerald-50/40 rounded-2xl overflow-hidden flex items-center justify-center border border-emerald-100 relative">
                    {activeGalleryImage ? (
                      <img src={activeGalleryImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={48} className="text-emerald-300" />
                    )}
                    {isModalOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-rose-600 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow">Sold Out</span>
                      </div>
                    )}
                  </div>

                  {modalImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {modalImages.map((imgUrl, i) => (
                        <button 
                          key={i} 
                          onClick={() => setActiveGalleryImage(imgUrl)}
                          className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition bg-emerald-50/30 cursor-pointer ${activeGalleryImage === imgUrl ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-emerald-100 opacity-70 hover:opacity-100'}`}
                        >
                          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                      <Store size={12} /> Sold by: {selectedProductDetails.shopkeeper_profiles?.store_name || 'KD Store'}
                    </span>
                    {selectedProductDetails.avgRating && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-black border border-amber-200 shrink-0">
                        <Star size={14} className="fill-amber-500 text-amber-500" />
                        <span>{selectedProductDetails.avgRating} ({selectedProductDetails.reviewCount})</span>
                      </div>
                    )}
                  </div>

                  {selectedProductDetails.description ? (
                    <div className="mt-3 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
                      <span className="font-black text-slate-700 uppercase tracking-wider block text-[10px]">Product Description</span>
                       
                      <div className={`text-slate-600 leading-relaxed overflow-hidden transition-all duration-300 ${
                        !isDescriptionExpanded ? 'max-h-16 relative after:absolute after:inset-x-0 after:bottom-0 after:h-8 after:bg-gradient-to-t after:from-emerald-50/80 after:to-transparent' : ''
                      }`}>
                        <div 
                          className="[&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-1.5 [&>p]:mb-1.5 [&_b]:font-black [&_i]:italic text-xs break-words" 
                          dangerouslySetInnerHTML={{ __html: selectedProductDetails.description }} 
                        />
                      </div>

                      <button 
                        type="button"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="text-emerald-700 font-black hover:underline pt-1 flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        {isDescriptionExpanded ? 'Read Less ▲' : 'Read More ▼'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-2">No detailed description provided for this fresh item.</p>
                  )}
                </div>

                <div className="pt-4 border-t border-emerald-100 space-y-3">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Customer Ratings & Reviews</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {productReviews.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No reviews yet for this product.</p>
                    ) : (
                      productReviews.map(rev => (
                        <div key={rev.id} className="p-3 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{rev.user_email.split('@')[0]}</span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(rev.rating)].map((_, i) => (
                                <Star key={i} size={12} className="fill-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600">{rev.review_text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-emerald-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xl font-black text-slate-900">
                      ₹{modalPrice.toFixed(2)}
                    </span>
                    {hasModalMrp && (
                      <span className="text-xs text-slate-400 line-through ml-2">₹{modalMrp.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => shareOnWhatsApp(selectedProductDetails)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-3 rounded-2xl transition flex items-center justify-center cursor-pointer"
                      title="Share on WhatsApp"
                    >
                      <MessageCircle size={20} />
                    </button>
                    <button 
                      onClick={() => { addToCart(selectedProductDetails); setSelectedProductDetails(null); setIsDescriptionExpanded(false); }}
                      disabled={isModalOutOfStock}
                      className={`font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg transition cursor-pointer ${
                        isModalOutOfStock 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                      }`}
                    >
                      {isModalOutOfStock ? 'Sold Out' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* Floating AI Grocery Concierge Chatbot Widget */}
    <div className="fixed bottom-24 right-6 z-40">
      {!isAiChatOpen ? (
        <button 
          onClick={() => setIsAiChatOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white p-4 rounded-full shadow-2xl flex items-center gap-2.5 font-black text-xs uppercase tracking-wider transition transform hover:scale-105 cursor-pointer ring-4 ring-emerald-500/20"
          title="Ask AI Grocery Assistant"
        >
          <Bot size={22} className="animate-bounce" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      ) : (
        <div className="bg-white w-80 sm:w-96 rounded-3xl shadow-2xl border border-emerald-200 flex flex-col overflow-hidden animate-slideUp font-sans text-xs">
          <div className="bg-gradient-to-r from-emerald-950 to-teal-950 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="font-black text-sm">KD Store AI Concierge</h4>
                <p className="text-[10px] text-emerald-300">Ask for recipes or grocery items</p>
            </div>
          </div>
          <button onClick={() => setIsAiChatOpen(false)} className="p-1.5 bg-emerald-900/60 hover:bg-emerald-900 rounded-full text-emerald-200 cursor-pointer"><X size={16}/></button>
        </div>

        <div className="p-4 h-72 overflow-y-auto space-y-3 bg-emerald-50/20">
          {aiChatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                msg.sender === 'user' ? 'bg-emerald-700 text-white rounded-br-none font-medium' : 'bg-white text-slate-800 border border-emerald-200 rounded-bl-none shadow-2xs font-medium'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAiChatSubmit} className="p-3 border-t border-emerald-100 bg-white flex gap-2">
          <input 
            type="text" 
            placeholder="e.g. Add ingredients for tea..." 
            value={aiInputText}
            onChange={e => setAiInputText(e.target.value)}
            className="flex-1 bg-emerald-50/50 border border-emerald-200 px-3.5 py-2.5 rounded-2xl outline-none text-slate-900 focus:border-emerald-600 font-medium"
          />
          <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white p-2.5 rounded-2xl transition cursor-pointer shadow-sm">
            <Send size={16} />
          </button>
        </form>
      </div>
    )}
  </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-4 right-4 bg-slate-900 text-white p-4 shadow-2xl z-40 flex items-center justify-between max-w-4xl mx-auto rounded-3xl border border-emerald-800/40 animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 px-3 py-1 rounded-xl font-black text-xs">
              {totalItemsCount} ITEMS
            </div>
            <span className="font-black text-base tracking-tight text-white">₹{cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 px-6 py-3 rounded-2xl transition duration-200 shadow-lg shadow-emerald-500/30 active:scale-95 text-slate-950 cursor-pointer"
          >
            View Cart <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 3. Cart Drawer Component (Enforces validation for empty cart and address) */}
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
        removeCoupon={removeCoupon}
        cartSubtotal={cartSubtotal}
        discountAmount={discountAmount}
        selectedAddressDistance={selectedAddressDistance}
        deliveryFee={deliveryFee}
        cartTotal={cartTotal}
        checkingOut={checkingOut}
        handleCheckout={handleCheckout}
        navigate={navigate}
      />

      {/* Invoice Modal */}
      <InvoiceModal 
        order={selectedInvoiceOrder} 
        isOpen={Boolean(selectedInvoiceOrder)} 
        onClose={() => setSelectedInvoiceOrder(null)} 
      />

      {/* Feedback Modal */}
      <CustomerFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      <Footer />
    </div>
  );
}