// src/components/CustomerStorefront.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Package, X, User, MapPin, ChevronRight, ChevronDown, LogOut, Trash2, FileText, Heart, ArrowRight, Store, Navigation, MessageSquarePlus, Ban, Star, RotateCcw, MessageCircle, CheckCircle } from 'lucide-react';
import InvoiceModal from './InvoiceModal';
import Footer from './Footer';
import CustomerFeedbackModal from './CustomerFeedbackModal';
import { calculateDistanceKm } from '../utils/distance';

// Import Modular Components
import StoreHeader from './store/StoreHeader';
import ProductGrid from './store/ProductGrid';
import CartDrawer from './store/CartDrawer';

export default function CustomerStorefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
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
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Profile Collapsible Accordion & Detail States
  const [openSection, setOpenSection] = useState(null);
  const [selectedProfileOrder, setSelectedProfileOrder] = useState(null);
  const [deliveredProductIds, setDeliveredProductIds] = useState([]);
  const [userReviewsMap, setUserReviewsMap] = useState({});

  // Order Section Review Modal State
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [newReviewForm, setNewReviewForm] = useState({ rating: 5, review_text: '' });

  // Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Product Details Modal State & Gallery Preview & Reviews
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState('');
  const [productReviews, setProductReviews] = useState([]);

  // Cart & Checkout State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

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

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchMyOrders(session.user.email);
        fetchSavedAddresses(session.user.id);
        fetchWishlist(session.user.id);
        fetchUserReviews(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchMyOrders(session.user.email);
        fetchSavedAddresses(session.user.id);
        fetchWishlist(session.user.id);
        fetchUserReviews(session.user.id);
      }
    });

    fetchStoreData();
    fetchStoreLocation();
    fetchDeliveryRules();
    fetchBanners();
    fetchActiveFlashSale();

    return () => subscription.unsubscribe();
  }, []);

  // Realtime review synchronization
  useEffect(() => {
    const reviewsChannel = supabase
      .channel('public:product_reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_reviews' }, () => {
        fetchStoreData();
        if (selectedProductDetails) {
          fetchProductReviews(selectedProductDetails.id);
        }
        if (session) {
          fetchUserReviews(session.user.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
    };
  }, [selectedProductDetails, session]);

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
      const [prodRes, catRes, varRes, revRes] = await Promise.all([
        supabase.from('products').select('*, categories(name), shopkeeper_profiles(store_name)').eq('approval_status', 'approved').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('product_variants').select('*'),
        supabase.from('product_reviews').select('*')
      ]);

      const rawProducts = prodRes.data || [];
      const rawVariants = varRes.data || [];
      const rawReviews = revRes.data || [];

      const productsWithVariants = rawProducts.map(p => {
        const relationalVariants = rawVariants.filter(v => v.product_id === p.id);
        const jsonVariants = p.variants || [];
        const mergedVariants = relationalVariants.length > 0 ? relationalVariants : jsonVariants;

        if (mergedVariants.length > 0) {
          setSelectedVariants(prev => ({ ...prev, [p.id]: mergedVariants[0].id || mergedVariants[0].label }));
        }

        const mergedImages = p.images || p.gallery || (p.image_url ? [p.image_url] : []);
        const pReviews = rawReviews.filter(r => r.product_id === p.id);
        const avgRating = pReviews.length > 0 ? (pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviews.length).toFixed(1) : null;

        return { 
          ...p, 
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

  const fetchProductReviews = async (productId) => {
    const { data } = await supabase.from('product_reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
    if (data) setProductReviews(data);
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
    order.order_items.forEach(item => {
      const prod = item.products;
      if (prod && Number(prod.stock || 0) > 0) {
        const pImages = prod.images || prod.gallery || [prod.image_url].filter(Boolean);
        const itemImage = pImages[0] || '';

        setCart(prev => {
          const cartItemId = prod.id;
          const existing = prev.find(ci => ci.cartItemId === cartItemId);
          if (existing) {
            return prev.map(ci => ci.cartItemId === cartItemId ? { ...ci, quantity: ci.quantity + item.quantity } : ci);
          }
          return [...prev, {
            cartItemId,
            product: prod,
            variant: null,
            title: prod.name,
            price: Number(item.price),
            quantity: item.quantity,
            stock: Number(prod.stock || 10),
            image: itemImage
          }];
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      alert("Items from past order successfully added to your cart!");
      setIsCartOpen(true);
    } else {
      alert("Sorry, items in this order are currently out of stock.");
    }
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

  // Automatically fetch GPS location when the add address box is toggled open
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

    const matchedRule = deliveryRules.find(r => {
      const minCart = r.min_cart_value || 0;
      const maxCart = r.max_cart_value || 999999;
      const minDst = r.min_distance_km || 0;
      const maxDst = r.max_distance_km || 999;

      return subtotal >= minCart && subtotal <= maxCart && distKm >= minDst && distKm <= maxDst;
    });

    if (matchedRule) return matchedRule.delivery_fee;

    const cartOnlyRule = deliveryRules.find(r => subtotal >= (r.min_cart_value || 0) && subtotal <= (r.max_cart_value || 999999));
    return cartOnlyRule ? cartOnlyRule.delivery_fee : 40;
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
      return [...prev, { cartItemId, product, variant, title: itemTitle, price: itemPrice, quantity: 1, stock: itemStock, image: itemImage }];
    });
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
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
      `Hey! Check out *${product.name}* on ValueGo delivered in 10 minutes! 🛒✨\n\nView here: ${productUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const cartTotal = Math.max(0, cartSubtotal - discountAmount) + deliveryFee;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!session) { navigate('/login'); return; }
    if (cart.length === 0) return;
    setCheckingOut(true);

    try {
      for (const item of cart) {
        if (item.variant && item.variant.id) {
          const { data: vData } = await supabase.from('product_variants').select('stock').eq('id', item.variant.id).single();
          if (!vData || vData.stock < item.quantity) {
            alert(`Sorry! "${item.title}" is now out of stock.`);
            setCheckingOut(false);
            return;
          }
        } else {
          const { data: pData } = await supabase.from('products').select('stock').eq('id', item.product.id).single();
          if (!pData || pData.stock < item.quantity) {
            alert(`Sorry! "${item.title}" is now out of stock.`);
            setCheckingOut(false);
            return;
          }
        }
      }

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
          latitude: selectedAddrObj?.latitude || null,
          longitude: selectedAddrObj?.longitude || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsData = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) throw itemsError;

      for (const item of cart) {
        if (item.variant && item.variant.id) {
          await supabase.from('product_variants').update({ stock: item.variant.stock - item.quantity }).eq('id', item.variant.id);
        } else {
          await supabase.from('products').update({ stock: item.product.stock - item.quantity }).eq('id', item.product.id);
        }
      }

      setOrderSuccess(orderData.id.slice(0, 8));
      setCart([]);
      setIsCartOpen(false);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      fetchStoreData();
      fetchMyOrders(session.user.email);
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-slate-900 pb-44 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 1. Header Component */}
      <StoreHeader 
        session={session}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalItemsCount={totalItemsCount}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Profile & Dashboard Drawer */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-end z-50 transition-opacity duration-300">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2.5"><User size={20} className="text-emerald-700" /> My Account & Dashboard</h3>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-emerald-100/60 rounded-full text-slate-600 hover:bg-emerald-100 transition"><X size={16} /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl shadow-2xs">
                <p className="text-[10px] text-emerald-800 uppercase font-black tracking-widest">Signed in as</p>
                <p className="font-bold text-slate-900 mt-1 truncate text-sm">{session?.user?.email}</p>
              </div>

              {/* Collapsible Accordion: Recent Orders */}
              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'orders' ? null : 'orders')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <Package size={16} className="text-emerald-700" /> My Orders ({myOrders.length})
                  </span>
                  {openSection === 'orders' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openSection === 'orders' && (
                  <div className="p-4 pt-0 space-y-3 bg-white border-t border-emerald-100">
                    {myOrders.length === 0 ? (
                      <p className="text-slate-400 italic py-3 text-center">No orders placed yet.</p>
                    ) : (
                      myOrders.map(order => (
                        <div key={order.id} className="p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-slate-900">#{order.id.slice(0, 8)}</span>
                            <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{order.status}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500">
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            <span className="font-black text-slate-900 text-sm">₹{order.total_amount}</span>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button 
                              onClick={() => setSelectedProfileOrder(order)}
                              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 border border-emerald-200"
                            >
                              <FileText size={13} /> Details
                            </button>
                            {order.status === 'delivered' && (
                              <button 
                                onClick={() => handleReorder(order)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl font-black transition flex items-center gap-1 shadow-xs"
                              >
                                <RotateCcw size={13} /> Reorder
                              </button>
                            )}
                            {order.status === 'delivered' && (
                              <button 
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl font-bold transition border border-slate-200"
                              >
                                Bill
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Accordion: Wishlist */}
              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'wishlist' ? null : 'wishlist')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition"
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
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl font-black shadow-sm transition"
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

              {/* Collapsible Accordion: Addresses */}
              <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/80 overflow-hidden">
                <button 
                  onClick={() => setOpenSection(openSection === 'addresses' ? null : 'addresses')}
                  className="w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-emerald-50/60 transition"
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
                      <button onClick={() => handleToggleAddAddressBox(!showAddAddressBox)} className="text-emerald-700 font-black hover:underline">
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
                        <button type="submit" className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-black">Save Address</button>
                      </form>
                    )}

                    {savedAddresses.map(addr => (
                      <div key={addr.id} className="p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-200 flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900 block">{addr.title}</span>
                          <span className="text-slate-600 block mt-0.5 leading-snug">{addr.address}</span>
                          <span className="text-slate-400 font-mono text-[10px] block mt-1">Phone: {addr.phone}</span>
                        </div>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-rose-500 hover:text-rose-700 p-1"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback */}
              <button 
                onClick={() => setIsFeedbackOpen(true)}
                className="w-full bg-emerald-50/60 hover:bg-emerald-100 text-slate-900 p-4 rounded-2xl font-black flex items-center justify-between border border-emerald-200 transition"
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
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3.5 rounded-2xl transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs border border-rose-200"
              >
                <LogOut size={16} /> Logout Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Order Details Modal */}
      {selectedProfileOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Order #{selectedProfileOrder.id.slice(0, 8)} Details</h3>
              <button onClick={() => setSelectedProfileOrder(null)} className="p-1.5 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100"><X size={16}/></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Order Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-black ${
                  selectedProfileOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  selectedProfileOrder.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>{selectedProfileOrder.status}</span>
              </div>

              {/* Cancellation Remark Box */}
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
                          <div className="flex items-center gap-3">
                            <img src={itemImg} alt="" className="w-11 h-11 object-cover rounded-xl border border-emerald-200 bg-white shrink-0" />
                            <div>
                              <span className="font-black text-slate-900 block line-clamp-1">{item.products?.name || 'Item'}</span>
                              <span className="text-slate-500 font-medium text-[11px]">Qty: {item.quantity} • ₹{item.price * item.quantity}</span>
                            </div>
                          </div>

                          {selectedProfileOrder.status === 'delivered' && item.products && (
                            <button
                              onClick={() => {
                                setReviewModalProduct(item.products);
                                if (hasReviewed) {
                                  setNewReviewForm({ rating: hasReviewed.rating, review_text: hasReviewed.review_text });
                                } else {
                                  setNewReviewForm({ rating: 5, review_text: '' });
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                                hasReviewed 
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' 
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {hasReviewed ? <><Star size={12} className="fill-amber-500 text-amber-500" /> Edit Review</> : <><Star size={12} /> Rate Item</>}
                            </button>
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
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Ban size={15} /> Cancel Order
                </button>
              )}
              <button 
                onClick={() => setSelectedProfileOrder(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">
                {userReviewsMap[reviewModalProduct.id] ? 'Edit Product Review' : 'Rate & Review Product'}
              </h3>
              <button onClick={() => setReviewModalProduct(null)} className="p-1 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100"><X size={16}/></button>
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

              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 rounded-2xl font-black tracking-wider uppercase transition shadow-lg shadow-emerald-700/20">
                {userReviewsMap[reviewModalProduct.id] ? 'Update Review' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
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
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-xl shadow-emerald-700/25 active:scale-95 flex items-center justify-center gap-2"
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
          const pImages = product.images || product.gallery || [product.image_url].filter(Boolean);
          setActiveGalleryImage(pImages[0] || '');
          await fetchProductReviews(product.id);
        }}
      />

      {/* Product Details Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
              <h3 className="font-black text-base text-slate-900">Product Details</h3>
              <button onClick={() => setSelectedProductDetails(null)} className="p-2 rounded-full hover:bg-emerald-50 text-slate-500"><X size={18}/></button>
            </div>

            {(() => {
              const modalImages = selectedProductDetails.images || selectedProductDetails.gallery || [selectedProductDetails.image_url].filter(Boolean);
              const currentVariantKey = selectedVariants[selectedProductDetails.id];
              const modalActiveVariant = selectedProductDetails.variants?.find(v => (v.id === currentVariantKey || v.label === currentVariantKey || v.unit_label === currentVariantKey));
              
              const modalPrice = Number(modalActiveVariant ? modalActiveVariant.price : selectedProductDetails.price || 0);
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
                            className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition bg-emerald-50/30 ${activeGalleryImage === imgUrl ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-emerald-100 opacity-70 hover:opacity-100'}`}
                          >
                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-black text-slate-900">{selectedProductDetails.name}</h2>
                      {selectedProductDetails.avgRating && (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-black border border-amber-200 shrink-0">
                          <Star size={14} className="fill-amber-500 text-amber-500" />
                          <span>{selectedProductDetails.avgRating} ({selectedProductDetails.reviewCount})</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full w-max flex items-center gap-1 border border-emerald-200">
                      <Store size={12} /> Sold by: {selectedProductDetails.shopkeeper_profiles?.store_name || 'ValueGo'}
                    </p>
                    <p className="text-sm text-slate-600 mt-2">{selectedProductDetails.description || 'No detailed description provided for this fresh item.'}</p>
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
                    <span className="text-xl font-black text-slate-900">
                      ₹{modalPrice.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => shareOnWhatsApp(selectedProductDetails)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-3 rounded-2xl transition flex items-center justify-center"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </button>
                      <button 
                        onClick={() => { addToCart(selectedProductDetails); setSelectedProductDetails(null); }}
                        disabled={isModalOutOfStock}
                        className={`font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg transition ${
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
            className="flex items-center gap-2 font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 px-6 py-3 rounded-2xl transition duration-200 shadow-lg shadow-emerald-500/30 active:scale-95 text-slate-950"
          >
            View Cart <ChevronRight size={16} />
          </button>
        </div>
      )}

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
        onClose={() => setSelectedInvoiceOrder(log => null)} 
      />

      {/* Feedback Modal */}
      <CustomerFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      <Footer />
    </div>
  );
}