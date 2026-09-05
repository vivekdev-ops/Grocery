// src/components/ProductManager.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

import {
  Package,
  Plus,
  Trash2,
  Edit,
  X,
  Layers,
  Store,
  Filter,
  Star,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  List,
  AlignLeft,
  ToggleLeft,
  ToggleRight,
  FolderTree
} from 'lucide-react';

import ExcelProductUpload from './ExcelProductUpload';

export default function ProductManager() {

  // =========================================================
  // DATA
  // =========================================================

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);

  const [selectedShopkeeperFilter, setSelectedShopkeeperFilter] =
    useState('all');

  const [activeTab, setActiveTab] = useState('inventory');

  const [loading, setLoading] = useState(true);

  // =========================================================
  // MODAL
  // =========================================================

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    description: '',
    is_active: true
  });

  // =========================================================
  // IMAGES
  // =========================================================

  const [imageFiles, setImageFiles] = useState([]);

  const [existingImages, setExistingImages] = useState([]);

  // =========================================================
  // VARIANTS
  // IMPORTANT:
  // Price / MRP / Stock are ONLY managed here.
  // =========================================================

  const [variants, setVariants] = useState([]);

  // =========================================================
  // SUBMIT
  // =========================================================

  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // AI
  // =========================================================

  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);

  // =========================================================
  // REVIEWS
  // =========================================================

  const [selectedProductForReviews, setSelectedProductForReviews] =
    useState(null);

  const [productReviewsList, setProductReviewsList] = useState([]);

  // =========================================================
  // SALES
  // =========================================================

  const [productOrderCounts, setProductOrderCounts] = useState({});

  // =========================================================
  // EXCEL
  // =========================================================

  const [isExcelUploadExpanded, setIsExcelUploadExpanded] =
    useState(false);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchData();
  }, []);

  // =========================================================
  // FETCH DATA
  // =========================================================

  const fetchData = async () => {

    setLoading(true);

    try {

      const [
        prodRes,
        catRes,
        varRes,
        shopRes,
        revRes,
        orderItemsRes
      ] = await Promise.all([

        supabase
          .from('products')
          .select('*')
          .order('name'),

        supabase
          .from('categories')
          .select('*')
          .order('name'),

        supabase
          .from('product_variants')
          .select('*')
          .order('created_at'),

        supabase
          .from('shopkeeper_profiles')
          .select('*'),

        supabase
          .from('product_reviews')
          .select('*'),

        supabase
          .from('order_items')
          .select('product_id, quantity, variant_id')
      ]);

      // -------------------------------------------------------
      // REQUIRED DATA
      // -------------------------------------------------------

      if (prodRes.error) {
        throw prodRes.error;
      }

      if (catRes.error) {
        throw catRes.error;
      }

      // -------------------------------------------------------
      // OPTIONAL DATA
      // -------------------------------------------------------

      if (varRes.error) {
        console.warn(
          'Could not load product variants:',
          varRes.error.message
        );
      }

      if (shopRes.error) {
        console.warn(
          'Could not load shopkeepers:',
          shopRes.error.message
        );
      }

      if (revRes.error) {
        console.warn(
          'Could not load reviews:',
          revRes.error.message
        );
      }

      if (orderItemsRes.error) {
        console.warn(
          'Could not load order items:',
          orderItemsRes.error.message
        );
      }

      const rawProducts = prodRes.data || [];
      const rawCategories = catRes.data || [];
      const rawVariants = varRes.data || [];
      const shopkeepersList = shopRes.data || [];
      const rawReviews = revRes.data || [];
      const rawOrderItems = orderItemsRes.data || [];

      // =====================================================
      // SHOPKEEPERS
      // =====================================================

      setShopkeepers(shopkeepersList);

      // =====================================================
      // SALES COUNT
      // =====================================================

      const countsMap = {};

      rawOrderItems.forEach(item => {

        if (!item.product_id) {
          return;
        }

        countsMap[item.product_id] =
          (countsMap[item.product_id] || 0) +
          Number(item.quantity || 1);

      });

      setProductOrderCounts(countsMap);

      // =====================================================
      // COMBINE PRODUCT DATA
      // =====================================================

      const combined = rawProducts.map(product => {

        // -----------------------------------------------------
        // RELATIONAL VARIANTS
        // -----------------------------------------------------

        const relationalVariants =
          rawVariants.filter(
            variant =>
              String(variant.product_id) ===
              String(product.id)
          );

        // -----------------------------------------------------
        // JSON VARIANTS - BACKWARD COMPATIBILITY
        // -----------------------------------------------------

        const jsonVariants =
          Array.isArray(product.variants)
            ? product.variants
            : [];

        // -----------------------------------------------------
        // SOURCE OF TRUTH
        //
        // Relational product_variants takes priority.
        // JSON variants are only fallback.
        // -----------------------------------------------------

        const mergedVariants =
          relationalVariants.length > 0
            ? relationalVariants
            : jsonVariants;

        // -----------------------------------------------------
        // IMAGES
        // -----------------------------------------------------

        let mergedImages = [];

        if (Array.isArray(product.images)) {

          mergedImages = product.images;

        } else if (Array.isArray(product.gallery)) {

          mergedImages = product.gallery;

        } else if (
          typeof product.gallery === 'string'
        ) {

          try {

            const parsedGallery =
              JSON.parse(product.gallery);

            if (Array.isArray(parsedGallery)) {
              mergedImages = parsedGallery;
            }

          } catch {
            // Ignore invalid gallery JSON
          }

        }

        if (
          mergedImages.length === 0 &&
          product.image_url
        ) {

          mergedImages = [
            product.image_url
          ];

        }

        // -----------------------------------------------------
        // REVIEWS
        // -----------------------------------------------------

        const pReviews =
          rawReviews.filter(
            review =>
              String(review.product_id) ===
              String(product.id)
          );

        const avgRating =
          pReviews.length > 0
            ? (
                pReviews.reduce(
                  (sum, review) =>
                    sum +
                    Number(review.rating || 0),
                  0
                ) /
                pReviews.length
              ).toFixed(1)
            : 'No ratings';

        // -----------------------------------------------------
        // SHOPKEEPER
        // -----------------------------------------------------

        const ownerProfile =
          shopkeepersList.find(
            shopkeeper =>
              String(shopkeeper.id).trim() ===
              String(product.shopkeeper_id).trim()
          );

        // -----------------------------------------------------
        // CATEGORY
        // -----------------------------------------------------

        const categoryObj =
          rawCategories.find(
            category =>
              String(category.id) ===
              String(product.category_id)
          );

        // =====================================================
        // VARIANT INVENTORY
        // =====================================================

        const totalVariantStock =
          mergedVariants.reduce(
            (sum, variant) =>
              sum +
              Number(variant.stock || 0),
            0
          );

        // =====================================================
        // LOW STOCK VARIANTS
        // =====================================================

        const lowStockVariants =
          mergedVariants.filter(
            variant =>
              Number(variant.stock || 0) <= 5
          );

        // =====================================================
        // LOWEST SELLING PRICE
        // =====================================================

        const variantPrices =
          mergedVariants
            .map(variant =>
              Number(variant.price)
            )
            .filter(
              price =>
                Number.isFinite(price)
            );

        const lowestVariantPrice =
          variantPrices.length > 0
            ? Math.min(...variantPrices)
            : null;

        // =====================================================
        // HIGHEST MRP
        // =====================================================

        const variantMrps =
          mergedVariants
            .map(variant =>
              Number(variant.mrp)
            )
            .filter(
              mrp =>
                Number.isFinite(mrp)
            );

        const highestVariantMrp =
          variantMrps.length > 0
            ? Math.max(...variantMrps)
            : null;

        return {

          ...product,

          categories:
            categoryObj || {
              name: 'General'
            },

          shopkeeper_profiles:
            ownerProfile || {
              store_name: 'Admin / Direct',
              email: 'admin@hub.com'
            },

          images:
            mergedImages,

          variants:
            mergedVariants,

          avgRating,

          reviewCount:
            pReviews.length,

          reviews:
            pReviews,

          totalSold:
            countsMap[product.id] || 0,

          totalVariantStock,

          lowStockVariants,

          lowestVariantPrice,

          highestVariantMrp

        };

      });

      setProducts(combined);
      setCategories(rawCategories);

    } catch (err) {

      console.error(
        'Error fetching inventory:',
        err
      );

    } finally {

      setLoading(false);

    }

  };

  // =========================================================
  // TOGGLE STATUS
  // =========================================================

  const handleToggleProductStatus = async (productId, currentStatus) => {
    const nextStatus = currentStatus === false ? true : false;
    const { error } = await supabase
      .from('products')
      .update({ is_active: nextStatus })
      .eq('id', productId);

    if (error) {
      alert(error.message);
    } else {
      await fetchData();
    }
  };

  const handleToggleCategoryStatus = async (categoryId, currentStatus) => {
    const nextStatus = currentStatus === false ? true : false;
    const { error } = await supabase
      .from('categories')
      .update({ is_active: nextStatus })
      .eq('id', categoryId);

    if (error) {
      alert(error.message);
    } else {
      await fetchData();
    }
  };

  // =========================================================
  // APPROVAL
  // =========================================================

  const handleUpdateApproval = async (
    productId,
    status
  ) => {

    const { error } =
      await supabase
        .from('products')
        .update({
          approval_status: status
        })
        .eq('id', productId);

    if (error) {

      alert(error.message);

    } else {

      await fetchData();

    }

  };

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const handleDeleteProduct = async id => {

    if (
      !window.confirm(
        'Delete this product and all its variants/images?'
      )
    ) {
      return;
    }

    // -------------------------------------------------------
    // DELETE VARIANTS FIRST
    // -------------------------------------------------------

    const {
      error: variantDeleteError
    } =
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', id);

    if (variantDeleteError) {

      alert(
        'Could not delete variants: ' +
        variantDeleteError.message
      );

      return;

    }

    // -------------------------------------------------------
    // DELETE PRODUCT
    // -------------------------------------------------------

    const { error } =
      await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {

      alert(error.message);

    } else {

      await fetchData();

    }

  };

  // =========================================================
  // DELETE REVIEW
  // =========================================================

  const handleDeleteReview = async reviewId => {

    if (
      !window.confirm(
        'Are you sure you want to delete this customer review?'
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

    if (!error) {

      alert(
        'Review deleted successfully.'
      );

      await fetchData();

      if (selectedProductForReviews) {

        setProductReviewsList(
          prev =>
            prev.filter(
              review =>
                review.id !== reviewId
            )
        );

      }

    } else {

      alert(
        'Error deleting review: ' +
        error.message
      );

    }

  };

  // =========================================================
  // RICH TEXT
  // =========================================================

  const handleFormatText = (
    tagOpen,
    tagClose = ''
  ) => {

    const textarea =
      document.getElementById(
        'product-rich-description'
      );

    if (!textarea) {
      return;
    }

    const start =
      textarea.selectionStart;

    const end =
      textarea.selectionEnd;

    const text =
      form.description;

    const selectedText =
      text.substring(start, end);

    const replacement =
      tagClose
        ? `${tagOpen}${selectedText}${tagClose}`
        : `${tagOpen}${selectedText}`;

    const newText =
      text.substring(0, start) +
      replacement +
      text.substring(end);

    setForm(prev => ({
      ...prev,
      description: newText
    }));

    setTimeout(() => {

      textarea.focus();

      textarea.setSelectionRange(
        start + tagOpen.length,
        end + tagOpen.length
      );

    }, 0);

  };

  // =========================================================
  // AI DESCRIPTION
  // =========================================================

  const handleGenerateAiDescription =
    async () => {

      if (!form.name.trim()) {

        alert(
          'Please enter a Product Name first so the description can be generated!'
        );

        return;

      }

      setGeneratingAiDesc(true);

      try {

        await new Promise(
          resolve =>
            setTimeout(resolve, 800)
        );

        const productName =
          form.name.trim();

        const cleanHtml = `
<p>Experience the superior quality and freshness of <b>${productName}</b>, carefully sourced to meet your everyday household and culinary needs.</p>

<ul>
  <li><b>100% Pure & Fresh:</b> Premium quality guaranteed with strict quality checks.</li>
  <li><b>Best Value:</b> Packed securely to preserve natural taste, aroma, and essential nutrients.</li>
  <li><b>Versatile Usage:</b> Perfect for daily cooking, household preparation, and family meals.</li>
</ul>

<p>Order today for fast grocery delivery right to your doorstep!</p>
`;

        setForm(prev => ({
          ...prev,
          description: cleanHtml
        }));

      } catch (err) {

        alert(
          'Generation error: ' +
          err.message
        );

      } finally {

        setGeneratingAiDesc(false);

      }

    };

  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  const openAddModal = () => {

    setEditingProduct(null);

    setForm({
      name: '',
      category_id: '',
      description: '',
      is_active: true
    });

    setImageFiles([]);

    setExistingImages([]);

    setVariants([]);

    setIsModalOpen(true);

  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = product => {

    setEditingProduct(product);

    setForm({
      name:
        product.name || '',

      category_id:
        product.category_id || '',

      description:
        product.description || '',

      is_active:
        product.is_active !== false
    });

    setExistingImages(
      Array.isArray(product.images)
        ? product.images
        : product.image_url
        ? [product.image_url]
        : []
    );

    setImageFiles([]);

    setVariants(
      (product.variants || []).map(
        variant => ({

          id:
            variant.id,

          unit_label:
            variant.unit_label ||
            variant.label ||
            '',

          price:
            variant.price ?? '',

          mrp:
            variant.mrp ?? '',

          stock:
            variant.stock ?? ''

        })
      )
    );

    setIsModalOpen(true);

  };

  // =========================================================
  // ADD VARIANT
  // =========================================================

  const addVariantRow = () => {

    setVariants(prev => [

      ...prev,

      {
        unit_label: '',
        price: '',
        mrp: '',
        stock: ''
      }

    ]);

  };

  // =========================================================
  // UPDATE VARIANT
  // =========================================================

  const updateVariantRow = (
    index,
    field,
    value
  ) => {

    setVariants(prev => {

      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value
      };

      return updated;

    });

  };

  // =========================================================
  // REMOVE VARIANT
  // =========================================================

  const removeVariantRow = index => {

    setVariants(prev =>
      prev.filter(
        (_, i) => i !== index
      )
    );

  };

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const uploadImagesToStorage =
    async () => {

      let uploadedUrls =
        [...existingImages];

      for (
        const file of imageFiles
      ) {

        const fileExt =
          file.name
            .split('.')
            .pop();

        const fileName =
          `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}.${fileExt}`;

        const {
          error: uploadError
        } =
          await supabase.storage
            .from('product-images')
            .upload(
              fileName,
              file
            );

        if (uploadError) {

          console.error(
            'Upload error:',
            uploadError.message
          );

          continue;

        }

        const {
          data: publicUrlData
        } =
          supabase.storage
            .from('product-images')
            .getPublicUrl(
              fileName
            );

        if (
          publicUrlData?.publicUrl
        ) {

          uploadedUrls.push(
            publicUrlData.publicUrl
          );

        }

      }

      return uploadedUrls;

    };

  // =========================================================
  // VALIDATE VARIANTS
  // =========================================================

  const validateVariants = () => {

    if (variants.length === 0) {

      return (
        'Please add at least one product variant.'
      );

    }

    for (
      let i = 0;
      i < variants.length;
      i++
    ) {

      const variant =
        variants[i];

      // -----------------------------------------------------
      // UNIT
      // -----------------------------------------------------

      if (
        !variant.unit_label ||
        !variant.unit_label.trim()
      ) {

        return (
          `Please enter Unit / Pack Size for Variant ${i + 1}.`
        );

      }

      // -----------------------------------------------------
      // PRICE
      // -----------------------------------------------------

      const price =
        Number(variant.price);

      if (
        variant.price === '' ||
        variant.price === null ||
        !Number.isFinite(price) ||
        price < 0
      ) {

        return (
          `Invalid selling price for Variant ${i + 1}.`
        );

      }

      // -----------------------------------------------------
      // MRP
      // -----------------------------------------------------

      const mrp =
        Number(variant.mrp);

      if (
        variant.mrp === '' ||
        variant.mrp === null ||
        !Number.isFinite(mrp) ||
        mrp < 0
      ) {

        return (
          `Invalid MRP for Variant ${i + 1}.`
        );

      }

      if (mrp < price) {

        return (
          `MRP cannot be lower than selling price for Variant ${i + 1}.`
        );

      }

      // -----------------------------------------------------
      // STOCK
      // -----------------------------------------------------

      const stock =
        Number(variant.stock);

      if (
        variant.stock === '' ||
        variant.stock === null ||
        !Number.isFinite(stock) ||
        stock < 0 ||
        !Number.isInteger(stock)
      ) {

        return (
          `Stock must be a whole number greater than or equal to 0 for Variant ${i + 1}.`
        );

      }

    }

    return null;

  };

  // =========================================================
  // NORMALIZE VARIANTS
  // =========================================================

  const getNormalizedVariants = () => {

    return variants.map(
      variant => ({

        unit_label:
          variant.unit_label.trim(),

        price:
          Number(variant.price),

        mrp:
          Number(variant.mrp),

        stock:
          Number(variant.stock)

      })
    );

  };

  // =========================================================
  // SAVE PRODUCT
  // =========================================================

  const handleSaveProduct =
    async e => {

      e.preventDefault();

      // -------------------------------------------------------
      // PRODUCT NAME
      // -------------------------------------------------------

      if (!form.name.trim()) {

        alert(
          'Please enter a product name.'
        );

        return;

      }

      // -------------------------------------------------------
      // VALIDATE VARIANTS
      // -------------------------------------------------------

      const validationError =
        validateVariants();

      if (validationError) {

        alert(validationError);

        return;

      }

      setSubmitting(true);

      let productId =
        editingProduct?.id || null;

      try {

        // =====================================================
        // NORMALIZE VARIANTS
        // =====================================================

        const normalizedVariants =
          getNormalizedVariants();

        // =====================================================
        // UPLOAD IMAGES
        // =====================================================

        const allImageUrls =
          await uploadImagesToStorage();

        const primaryImageUrl =
          allImageUrls.length > 0
            ? allImageUrls[0]
            : null;

        // =====================================================
        // JSON VARIANT DATA
        //
        // Kept synchronized for backward compatibility.
        //
        // IMPORTANT:
        // The relational product_variants table remains the
        // actual source of truth.
        // =====================================================

        const jsonVariants =
          normalizedVariants.map(
            variant => ({

              unit_label:
                variant.unit_label,

              price:
                variant.price,

              mrp:
                variant.mrp,

              stock:
                variant.stock

            })
          );

        // =====================================================
        // PRODUCT PAYLOAD
        // =====================================================

        const productPayload = {

          name:
            form.name.trim(),

          category_id:
            form.category_id || null,

          image_url:
            primaryImageUrl,

          images:
            allImageUrls,

          gallery:
            allImageUrls,

          variants:
            jsonVariants,

          description:
            form.description || '',

          approval_status:
            'approved',

          is_active:
            form.is_active

        };

        // =====================================================
        // UPDATE PRODUCT
        // =====================================================

        if (editingProduct) {

          const {
            error: productUpdateError
          } =
            await supabase
              .from('products')
              .update(productPayload)
              .eq(
                'id',
                editingProduct.id
              );

          if (productUpdateError) {

            throw productUpdateError;

          }

          // ---------------------------------------------------
          // DELETE OLD VARIANTS
          // ---------------------------------------------------

          const {
            error: deleteVariantError
          } =
            await supabase
              .from('product_variants')
              .delete()
              .eq(
                'product_id',
                editingProduct.id
              );

          if (deleteVariantError) {

            throw deleteVariantError;

          }

        }

        // =====================================================
        // CREATE PRODUCT
        // =====================================================

        else {

          const {
            data,
            error: productInsertError
          } =
            await supabase
              .from('products')
              .insert([
                productPayload
              ])
              .select()
              .single();

          if (productInsertError) {

            throw productInsertError;

          }

          productId =
            data.id;

        }

        // =====================================================
        // INSERT VARIANTS
        // =====================================================

        const variantPayloads =
          normalizedVariants.map(
            variant => ({

              product_id:
                productId,

              unit_label:
                variant.unit_label,

              price:
                variant.price,

              mrp:
                variant.mrp,

              stock:
                variant.stock

            })
          );

        const {
          error: variantError
        } =
          await supabase
            .from('product_variants')
            .insert(
              variantPayloads
            );

        // =====================================================
        // VARIANT INSERT FAILED
        // =====================================================

        if (variantError) {

          // If this was a newly-created product,
          // remove it so we don't leave an orphan product.

          if (!editingProduct && productId) {

            await supabase
              .from('products')
              .delete()
              .eq('id', productId);

          }

          throw variantError;

        }

        // =====================================================
        // SUCCESS
        // =====================================================

        alert(
          editingProduct
            ? 'Product and variants updated successfully!'
            : 'Product and variants created successfully!'
        );

        setIsModalOpen(false);

        setEditingProduct(null);

        setVariants([]);

        setImageFiles([]);

        setExistingImages([]);

        setForm({
          name: '',
          category_id: '',
          description: '',
          is_active: true
        });

        await fetchData();

      } catch (err) {

        console.error(
          'Product save error:',
          err
        );

        alert(
          'Operation failed: ' +
          err.message
        );

      } finally {

        setSubmitting(false);

      }

    };

  // =========================================================
  // FILTER PRODUCTS
  // =========================================================

  const filteredProducts =
    products
      .filter(product => {

        let matchesTab = true;

        // -----------------------------------------------------
        // PENDING APPROVALS
        // -----------------------------------------------------

        if (
          activeTab === 'approvals'
        ) {

          matchesTab =
            product.approval_status ===
              'pending' ||
            !product.approval_status;

        }

        // -----------------------------------------------------
        // LOW STOCK
        // -----------------------------------------------------

        else if (
          activeTab === 'lowStock'
        ) {

          matchesTab =
            product.variants?.some(
              variant =>
                Number(
                  variant.stock || 0
                ) <= 5
            );

        }

        // -----------------------------------------------------
        // TOP SELLING
        // -----------------------------------------------------

        else if (
          activeTab === 'topSelling'
        ) {

          matchesTab =
            Number(
              product.totalSold || 0
            ) > 0;

        }

        // -----------------------------------------------------
        // SHOPKEEPER
        // -----------------------------------------------------

        const matchesShopkeeper =
          selectedShopkeeperFilter ===
            'all' ||

          String(
            product.shopkeeper_id
          ).trim() ===
            String(
              selectedShopkeeperFilter
            ).trim();

        return (
          matchesTab &&
          matchesShopkeeper
        );

      })
      .sort((a, b) => {

        if (
          activeTab === 'topSelling'
        ) {

          return (
            (b.totalSold || 0) -
            (a.totalSold || 0)
          );

        }

        if (
          activeTab === 'lowStock'
        ) {

          return (
            (a.lowStockVariants?.length || 0) -
            (b.lowStockVariants?.length || 0)
          );

        }

        return 0;

      });

  // =========================================================
  // COUNTS
  // =========================================================

  const pendingCount =
    products.filter(
      product =>
        product.approval_status ===
          'pending' ||
        !product.approval_status
    ).length;

  const lowStockCount =
    products.filter(
      product =>
        product.variants?.some(
          variant =>
            Number(
              variant.stock || 0
            ) <= 5
        )
    ).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="space-y-6 font-sans">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">

        <div>

          <h2 className="text-2xl font-black text-slate-900">
            Product Inventory & Shopkeeper Moderation
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Manage products, pack variants, pricing,
            MRP, stock, reviews and store visibility.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* SHOPKEEPER FILTER */}

          <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-2 rounded-2xl border border-emerald-200">

            <Filter
              size={14}
              className="text-emerald-700"
            />

            <select
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              value={
                selectedShopkeeperFilter
              }
              onChange={e =>
                setSelectedShopkeeperFilter(
                  e.target.value
                )
              }
            >

              <option value="all">
                All Shopkeepers (Stores)
              </option>

              {shopkeepers.map(
                shopkeeper => (

                  <option
                    key={shopkeeper.id}
                    value={shopkeeper.id}
                  >
                    {shopkeeper.store_name}
                    {' '}
                    ({shopkeeper.email})
                  </option>

                )
              )}

            </select>

          </div>

          {/* EXCEL */}

          <button
            onClick={() =>
              setIsExcelUploadExpanded(
                !isExcelUploadExpanded
              )
            }
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
          >

            <FileSpreadsheet
              size={16}
              className="text-emerald-700"
            />

            Bulk Excel Upload

            {isExcelUploadExpanded
              ? <ChevronUp size={14} />
              : <ChevronDown size={14} />
            }

          </button>

          {/* ADD PRODUCT */}

          <button
            onClick={openAddModal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-700/20 active:scale-95 cursor-pointer"
          >

            <Plus size={16} />

            Add Product

          </button>

        </div>

      </div>

      {/* =====================================================
          EXCEL
      ===================================================== */}

      {isExcelUploadExpanded && (

        <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-md">

          <ExcelProductUpload
            onUploadSuccess={fetchData}
          />

        </div>

      )}

      {/* =====================================================
          INTELLIGENCE BAR
      ===================================================== */}

      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-xl space-y-5">

        <div className="flex items-center gap-2.5 border-b border-emerald-800/80 pb-3">

          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">

            <Sparkles size={18} />

          </div>

          <div>

            <h3 className="font-black text-sm uppercase tracking-wider">
              Catalog & Stock Diagnostics
            </h3>

            <p className="text-[11px] text-emerald-300/80">
              Product and variant-level inventory health.
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">

          {/* CATALOG */}

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1">

            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">

              <ShieldCheck size={14} />

              Catalog Capacity

            </div>

            <p className="text-emerald-100/90">

              Total catalog contains

              {' '}

              <strong className="text-white">
                {products.length}
              </strong>

              {' '}products.

            </p>

          </div>

          {/* LOW STOCK */}

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1">

            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-amber-400">

              <AlertTriangle size={14} />

              Low Stock Alerts

            </div>

            <p className="text-emerald-100/90">

              <strong className="text-white">
                {lowStockCount}
              </strong>

              {' '}products have variants
              with stock ≤ 5.

            </p>

          </div>

          {/* APPROVAL */}

          <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/60 space-y-1">

            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">

              <CheckCircle2 size={14} />

              Moderation Queue

            </div>

            <p className="text-emerald-100/90">

              <strong className="text-white">
                {pendingCount}
              </strong>

              {' '}store listings awaiting review.

            </p>

          </div>

        </div>

        {/* ===================================================
            TABS
        ================================================   */}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-800/80">

          <button
            onClick={() =>
              setActiveTab('inventory')
            }
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >

            <Package size={14} />

            All Inventory ({products.length})

          </button>

          <button
            onClick={() =>
              setActiveTab('categories')
            }
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >

            <FolderTree size={14} />

            Manage Categories ({categories.length})

          </button>

          <button
            onClick={() =>
              setActiveTab('approvals')
            }
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >

            <AlertOctagon size={14} />

            Pending Approvals

            {pendingCount > 0 && (

              <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full">

                {pendingCount}

              </span>

            )}

          </button>

          <button
            onClick={() =>
              setActiveTab('lowStock')
            }
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'lowStock'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >

            <AlertTriangle size={14} />

            Low Stock

            {lowStockCount > 0 && (

              <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full">

                {lowStockCount}

              </span>

            )}

          </button>

          <button
            onClick={() =>
              setActiveTab('topSelling')
            }
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'topSelling'
                ? 'bg-emerald-400 text-slate-950 shadow-md'
                : 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 border border-emerald-800'
            }`}
          >

            <TrendingUp size={14} />

            Most Orders / Top Selling

          </button>

        </div>

      </div>

      {/* =====================================================
          CATEGORIES MANAGEMENT TAB
      ===================================================== */}
      {activeTab === 'categories' ? (
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-black text-sm text-slate-900 uppercase">Category Visibility Control</h3>
            <span className="text-xs text-slate-400">Enable or disable entire categories from displaying on storefront.</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map(cat => {
              const isActive = cat.is_active !== false;
              return (
                <div key={cat.id} className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-sm block">{cat.name}</span>
                    <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {isActive ? 'Visible to Customer' : 'Hidden from Customer'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleCategoryStatus(cat.id, isActive)}
                    className="p-2 cursor-pointer transition"
                    title={isActive ? 'Disable Category' : 'Enable Category'}
                  >
                    {isActive ? (
                      <ToggleRight size={28} className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={28} className="text-stone-400" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      /* =====================================================
          INVENTORY TABLE
      ================================================     */
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse">

            <thead>

              <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500 font-semibold">

                <th className="p-4">
                  Product & Store
                </th>

                <th className="p-4">
                  Images
                </th>

                <th className="p-4">
                  Variants
                </th>

                <th className="p-4">
                  Inventory
                </th>

                <th className="p-4">
                  Ratings & Reviews
                </th>

                <th className="p-4">
                  Status & Visibility
                </th>

                <th className="p-4 text-right">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-emerald-50 text-xs">

              {loading ? (

                <tr>

                  <td
                    colSpan="7"
                    className="p-8 text-center text-slate-500 font-medium"
                  >
                    Loading inventory...
                  </td>

                </tr>

              ) : filteredProducts.length === 0 ? (

                <tr>

                  <td
                    colSpan="7"
                    className="p-8 text-center text-slate-400 italic"
                  >
                    No products found in this section.
                  </td>

                </tr>

              ) : (

                filteredProducts.map(product => {

                  const imgList =
                    Array.isArray(product.images)
                      ? product.images
                      : [];

                  const variantCount =
                    product.variants?.length || 0;

                  const lowVariantCount =
                    product.lowStockVariants?.length || 0;

                  const isProductActive = product.is_active !== false;

                  return (

                    <tr
                      key={product.id}
                      className="hover:bg-emerald-50/30 transition"
                    >

                      {/* PRODUCT */}

                      <td className="p-4">

                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 bg-emerald-50 rounded-xl overflow-hidden shrink-0 border border-emerald-200">

                            {product.image_url ||
                            imgList.length > 0 ? (

                              <img
                                src={
                                  product.image_url ||
                                  imgList[0]
                                }
                                alt=""
                                className="w-full h-full object-cover"
                              />

                            ) : (

                              <Package
                                size={18}
                                className="text-slate-400 m-2"
                              />

                            )}

                          </div>

                          <div>

                            <span className="font-bold text-slate-900 block">
                              {product.name}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5 border border-emerald-200">

                              <Store size={10} />

                              {product.shopkeeper_profiles?.store_name ||
                                'Admin Store'}

                            </span>

                          </div>

                        </div>

                      </td>

                      {/* IMAGES */}

                      <td className="p-4 text-slate-600 font-medium">

                        {imgList.length} loaded

                      </td>

                      {/* VARIANTS */}

                      <td className="p-4">

                        {variantCount > 0 ? (

                          <div className="space-y-1.5 min-w-[280px]">

                            {product.variants.map(
                              (variant, index) => {

                                const price =
                                  Number(
                                    variant.price || 0
                                  );

                                const mrp =
                                  Number(
                                    variant.mrp || 0
                                  );

                                const stock =
                                  Number(
                                    variant.stock || 0
                                  );

                                const discount =
                                  mrp > 0
                                    ? Math.round(
                                        (
                                          (
                                            mrp -
                                            price
                                          ) /
                                          mrp
                                        ) *
                                        100
                                      )
                                    : 0;

                                return (

                                  <div
                                    key={
                                      variant.id ||
                                      index
                                    }
                                    className={`rounded-xl p-2 border ${
                                      stock <= 5
                                        ? 'bg-amber-50 border-amber-300'
                                        : 'bg-emerald-50 border-emerald-200'
                                    }`}
                                  >

                                    <div className="flex justify-between items-center gap-2">

                                      <span className="font-black text-emerald-900">

                                        {variant.unit_label ||
                                          variant.label ||
                                          'Variant'}

                                      </span>

                                      <span className="font-black text-slate-900">

                                        ₹
                                        {price.toFixed(2)}

                                      </span>

                                    </div>

                                    <div className="flex justify-between items-center mt-1 text-[10px]">

                                      <span className="text-slate-500">

                                        MRP: ₹
                                        {mrp.toFixed(2)}

                                        {discount > 0 && (
                                          <span className="ml-1 text-emerald-700 font-bold">
                                            ({discount}% OFF)
                                          </span>
                                        )}

                                      </span>

                                      <span
                                        className={
                                          stock <= 5
                                            ? 'font-bold text-amber-600'
                                            : 'text-slate-500'
                                        }
                                      >

                                        Stock: {stock}

                                      </span>

                                    </div>

                                  </div>

                                );

                              }
                            )}

                          </div>

                        ) : (

                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">

                            <span className="text-rose-600 font-bold">
                              No variants
                            </span>

                            <span className="block text-[10px] text-rose-500 mt-1">
                              Product cannot be sold until a variant is added.
                            </span>

                          </div>

                        )}

                      </td>

                      {/* INVENTORY */}

                      <td className="p-4">

                        <div className="space-y-1">

                          <span className="font-black text-slate-900 block">

                            {product.totalVariantStock || 0}

                          </span>

                          <span className="text-[10px] text-slate-400 block">

                            Total Variant Stock

                          </span>

                          <span className="text-[10px] text-slate-500 block">

                            {variantCount}
                            {' '}
                            {variantCount === 1
                              ? 'variant'
                              : 'variants'}

                          </span>

                          {lowVariantCount > 0 && (

                            <span className="inline-flex items-center gap-1 font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">

                              <AlertTriangle size={11} />

                              {lowVariantCount}
                              {' '}
                              low stock

                            </span>

                          )}

                          {activeTab ===
                            'topSelling' && (

                            <span className="block font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">

                              🔥 {product.totalSold || 0}
                              {' '}Sold

                            </span>

                          )}

                        </div>

                      </td>

                      {/* REVIEWS */}

                      <td className="p-4">

                        {product.avgRating !==
                        'No ratings' ? (

                          <button
                            onClick={() => {

                              setSelectedProductForReviews(
                                product
                              );

                              setProductReviewsList(
                                product.reviews ||
                                []
                              );

                            }}
                            className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-black border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                          >

                            <Star
                              size={12}
                              className="fill-amber-500 text-amber-500"
                            />

                            <span>

                              {product.avgRating}
                              {' '}
                              ({product.reviewCount})

                            </span>

                          </button>

                        ) : (

                          <span className="text-slate-400 italic">
                            No ratings
                          </span>

                        )}

                      </td>

                      {/* STATUS & VISIBILITY */}

                      <td className="p-4 space-y-1">

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                            product.approval_status ===
                            'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : product.approval_status ===
                                'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >

                          {product.approval_status ||
                            'pending'}

                        </span>

                        <div className="pt-1">
                          <button
                            onClick={() => handleToggleProductStatus(product.id, isProductActive)}
                            className="inline-flex items-center gap-1 text-[10px] font-black cursor-pointer transition"
                            title={isProductActive ? 'Disable product from customer view' : 'Enable product for customer view'}
                          >
                            {isProductActive ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active</span>
                            ) : (
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Disabled</span>
                            )}
                          </button>
                        </div>

                      </td>

                      {/* ACTIONS */}

                      <td className="p-4 text-right">

                        <div className="flex justify-end items-center gap-2">

                          {(
                            !product.approval_status ||
                            product.approval_status ===
                              'pending'
                          ) && (

                            <button
                              onClick={() =>
                                handleUpdateApproval(
                                  product.id,
                                  'approved'
                                )
                              }
                              className="bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-emerald-800 transition cursor-pointer"
                            >
                              Approve
                            </button>

                          )}

                          <button
                            onClick={() =>
                              openEditModal(product)
                            }
                            className="text-blue-600 hover:text-blue-800 p-1.5 cursor-pointer"
                            title="Edit"
                          >

                            <Edit size={16} />

                          </button>

                          <button
                            onClick={() =>
                              handleDeleteProduct(
                                product.id
                              )
                            }
                            className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer"
                            title="Delete"
                          >

                            <Trash2 size={16} />

                          </button>

                        </div>

                      </td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

        </div>

      </div>
      )}

      {/* =====================================================
          REVIEWS MODAL
      ================================================     */}

      {selectedProductForReviews && (

        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">

              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">

                <MessageSquare
                  size={16}
                  className="text-emerald-700"
                />

                Customer Reviews for

                {' '}

                {selectedProductForReviews.name}

              </h3>

              <button
                onClick={() =>
                  setSelectedProductForReviews(
                    null
                  )
                }
                className="p-1.5 bg-emerald-50 rounded-full text-slate-600 hover:bg-emerald-100 cursor-pointer"
              >

                <X size={16} />

              </button>

            </div>

            <div className="space-y-3">

              {productReviewsList.length ===
              0 ? (

                <p className="text-xs text-slate-400 italic py-6 text-center">

                  No customer reviews submitted
                  for this product yet.

                </p>

              ) : (

                productReviewsList.map(
                  review => (

                    <div
                      key={review.id}
                      className="p-3.5 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-2 text-xs"
                    >

                      <div className="flex justify-between items-center">

                        <span className="font-bold text-slate-900">

                          {review.user_email ||
                            'Customer'}

                        </span>

                        <div className="flex items-center gap-1 text-amber-500">

                          {[
                            ...Array(
                              Number(
                                review.rating || 0
                              )
                            )
                          ].map(
                            (_, i) => (

                              <Star
                                key={i}
                                size={12}
                                className="fill-amber-500"
                              />

                            )
                          )}

                        </div>

                      </div>

                      <p className="text-slate-600">

                        {review.review_text}

                      </p>

                      <div className="flex justify-between items-center pt-2 border-t border-emerald-100 text-[10px] text-slate-400 font-mono">

                        <span>

                          {review.created_at
                            ? new Date(
                                review.created_at
                              ).toLocaleString()
                            : ''}

                        </span>

                        <button
                          onClick={() =>
                            handleDeleteReview(
                              review.id
                            )
                          }
                          className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >

                          <Trash2 size={11} />

                          Delete Review

                        </button>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

            <button
              onClick={() =>
                setSelectedProductForReviews(
                  null
                )
              }
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase cursor-pointer"
            >

              Close

            </button>

          </div>

        </div>

      )}

      {/* =====================================================
          ADD / EDIT PRODUCT MODAL
      ================================================     */}

      {isModalOpen && (

        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">

          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-emerald-100 space-y-6 my-8 max-h-[90vh] overflow-y-auto">

            {/* MODAL HEADER */}

            <div className="flex justify-between items-center border-b border-emerald-100 pb-3">

              <div>

                <h3 className="font-black text-base text-slate-900">

                  {editingProduct
                    ? 'Edit Product'
                    : 'Add Product'}

                </h3>

                <p className="text-[10px] text-slate-400 mt-1">

                  Price, MRP and stock are managed
                  separately for each variant.

                </p>

              </div>

              <button
                onClick={() =>
                  setIsModalOpen(false)
                }
                className="p-2 rounded-full hover:bg-emerald-50 text-slate-500 cursor-pointer"
              >

                <X size={18} />

              </button>

            </div>

            <form
              onSubmit={handleSaveProduct}
              className="space-y-5 text-xs"
            >

              {/* =================================================
                  PRODUCT NAME
              ================================================     */}

              <div>

                <label className="block font-bold text-slate-700 mb-1">
                  Product Name
                </label>

                <input
                  type="text"
                  required
                  placeholder="Aashirvaad Atta / Fresh Milk"
                  className="w-full border border-emerald-200 p-3 rounded-2xl outline-none focus:border-emerald-600 text-sm bg-emerald-50/20 font-medium"
                  value={form.name}
                  onChange={e =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                />

              </div>

              {/* =================================================
                  CATEGORY
              ================================================     */}

              <div>

                <label className="block font-bold text-slate-700 mb-1">
                  Category
                </label>

                <select
                  className="w-full border border-emerald-200 p-3 rounded-2xl text-sm bg-emerald-50/20 font-bold text-slate-800 cursor-pointer"
                  value={
                    form.category_id
                  }
                  onChange={e =>
                    setForm({
                      ...form,
                      category_id:
                        e.target.value
                    })
                  }
                >

                  <option value="">
                    Select Category
                  </option>

                  {categories.map(
                    category => (

                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>

                    )
                  )}

                </select>

              </div>

              <div className="flex items-center gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="form_is_active"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                />
                <label htmlFor="form_is_active" className="font-bold text-slate-800 cursor-pointer">
                  Make Product Active / Visible to Customers on Storefront
                </label>
              </div>

              {/* =================================================
                  IMAGES
              ================================================     */}

              <div>

                <label className="block font-bold text-slate-700 mb-1">
                  Product Images
                </label>

                <div className="border-2 border-dashed border-emerald-200 p-4 rounded-2xl text-center bg-emerald-50/30">

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e =>
                      setImageFiles(
                        Array.from(
                          e.target.files ||
                          []
                        )
                      )
                    }
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />

                  <p className="text-[10px] text-slate-400 mt-1">
                    Select multiple images for the product gallery.
                  </p>

                </div>

                {/* EXISTING IMAGES */}

                {existingImages.length >
                  0 && (

                  <div className="flex gap-2 mt-3 flex-wrap">

                    {existingImages.map(
                      (url, index) => (

                        <div
                          key={index}
                          className="w-16 h-16 rounded-2xl border border-emerald-200 relative overflow-hidden bg-white shadow-sm"
                        >

                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setExistingImages(
                                prev =>
                                  prev.filter(
                                    (_, i) =>
                                      i !== index
                                  )
                              )
                            }
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 shadow cursor-pointer"
                          >

                            <X size={12} />

                          </button>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

              {/* =================================================
                  DESCRIPTION
              ================================================     */}

              <div>

                <div className="flex justify-between items-center mb-1">

                  <label className="font-bold text-slate-700">
                    Description
                  </label>

                  <button
                    type="button"
                    onClick={
                      handleGenerateAiDescription
                    }
                    disabled={
                      generatingAiDesc
                    }
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black px-3 py-1 rounded-xl text-[10px] flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >

                    <Sparkles
                      size={12}
                      className="text-amber-300 fill-amber-300"
                    />

                    {generatingAiDesc
                      ? 'Generating...'
                      : 'Generate with AI'}

                  </button>

                </div>

                <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-white">

                  {/* TOOLBAR */}

                  <div className="bg-emerald-50/50 px-3 py-2 border-b border-emerald-100 flex items-center gap-1.5">

                    <button
                      type="button"
                      onClick={() =>
                        handleFormatText(
                          '<b>',
                          '</b>'
                        )
                      }
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer"
                    >
                      <Bold size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleFormatText(
                          '<i>',
                          '</i>'
                        )
                      }
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer"
                    >
                      <Italic size={14} />
                    </button>

                    <div className="h-4 w-[1px] bg-emerald-200 mx-1" />

                    <button
                      type="button"
                      onClick={() =>
                        handleFormatText(
                          '<ul>\n  <li>',
                          '</li>\n</ul>'
                        )
                      }
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer"
                    >
                      <List size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleFormatText(
                          '<p>',
                          '</p>'
                        )
                      }
                      className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer"
                    >
                      <AlignLeft size={14} />
                    </button>

                  </div>

                  <textarea
                    id="product-rich-description"
                    rows="5"
                    placeholder="Enter product description..."
                    className="w-full p-3 text-sm bg-emerald-50/10 outline-none font-medium resize-y"
                    value={
                      form.description
                    }
                    onChange={e =>
                      setForm({
                        ...form,
                        description:
                          e.target.value
                      })
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  VARIANTS
              ================================================     */}

              <div className="pt-4 border-t border-emerald-100 space-y-4">

                {/* VARIANT HEADER */}

                <div className="flex justify-between items-center">

                  <div>

                    <div className="flex items-center gap-2">

                      <Layers
                        size={18}
                        className="text-emerald-700"
                      />

                      <span className="font-black text-slate-900 text-sm">
                        Product Variants
                      </span>

                    </div>

                    <p className="text-[10px] text-slate-400 mt-1 ml-6">
                      Each variant has its own pack size,
                      selling price, MRP and stock.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      addVariantRow
                    }
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    + Add Variant
                  </button>

                </div>

                {/* VARIANT LIST */}

                {variants.length ===
                0 ? (

                  <div className="text-center py-6 bg-amber-50 rounded-2xl border border-amber-200">

                    <Layers
                      size={24}
                      className="mx-auto text-amber-500 mb-2"
                    />

                    <p className="text-amber-700 font-bold">
                      No variants added.
                    </p>

                    <p className="text-[10px] text-amber-600 mt-1">
                      Add at least one variant before publishing.
                    </p>

                  </div>

                ) : (

                  <div className="space-y-3">

                    {variants.map(
                      (variant, index) => (

                        <div
                          key={
                            variant.id ||
                            index
                          }
                          className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200"
                        >

                          {/* VARIANT NUMBER */}

                          <div className="flex justify-between items-center mb-3">

                            <span className="font-black text-emerald-800">
                              Variant #{index + 1}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removeVariantRow(
                                  index
                                )
                              }
                              className="text-rose-500 hover:text-rose-700 p-1.5 cursor-pointer"
                            >

                              <Trash2 size={16} />

                            </button>

                          </div>

                          {/* VARIANT FIELDS */}

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                            {/* UNIT */}

                            <div>

                              <label className="block font-bold text-slate-600 mb-1">
                                Unit / Pack Size
                              </label>

                              <input
                                type="text"
                                required
                                placeholder="500 g / 1 kg / 5 L"
                                className="w-full border border-emerald-200 p-2.5 rounded-xl text-xs bg-white font-medium"
                                value={
                                  variant.unit_label ||
                                  ''
                                }
                                onChange={e =>
                                  updateVariantRow(
                                    index,
                                    'unit_label',
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            {/* PRICE */}

                            <div>

                              <label className="block font-bold text-slate-600 mb-1">
                                Selling Price (₹)
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                placeholder="55.00"
                                className="w-full border border-emerald-200 p-2.5 rounded-xl text-xs bg-white font-medium"
                                value={
                                  variant.price ??
                                  ''
                                }
                                onChange={e =>
                                  updateVariantRow(
                                    index,
                                    'price',
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            {/* MRP */}

                            <div>

                              <label className="block font-bold text-slate-600 mb-1">
                                MRP (₹)
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                placeholder="60.00"
                                className="w-full border border-emerald-200 p-2.5 rounded-xl text-xs bg-white font-medium"
                                value={
                                  variant.mrp ??
                                  ''
                                }
                                onChange={e =>
                                  updateVariantRow(
                                    index,
                                    'mrp',
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                            {/* STOCK */}

                            <div>

                              <label className="block font-bold text-slate-600 mb-1">
                                Stock
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                placeholder="100"
                                className="w-full border border-emerald-200 p-2.5 rounded-xl text-xs bg-white font-medium"
                                value={
                                  variant.stock ??
                                  ''
                                }
                                onChange={e =>
                                  updateVariantRow(
                                    index,
                                    'stock',
                                    e.target.value
                                  )
                                }
                              />

                            </div>

                          </div>

                          {/* DISCOUNT */}

                          <div className="mt-3 flex items-center justify-between bg-white border border-emerald-100 rounded-xl px-3 py-2">

                            <span className="text-[10px] text-slate-500">
                              Discount
                            </span>

                            <span className="text-xs font-black text-emerald-700">

                              {Number(
                                variant.mrp || 0
                              ) > 0
                                ? Math.max(
                                    0,
                                    Math.round(
                                      (
                                        (
                                          Number(
                                            variant.mrp
                                          ) -
                                          Number(
                                            variant.price ||
                                              0
                                          )
                                        ) /
                                        Number(
                                          variant.mrp
                                        )
                                      ) *
                                      100
                                    )
                                  )
                                : 0}

                              % OFF

                            </span>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

              {/* =================================================
                  SAVE
              ================================================     */}

              <button
                type="submit"
                disabled={
                  submitting ||
                  variants.length === 0
                }
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl transition text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >

                <Plus size={16} />

                {submitting
                  ? 'Uploading & Saving...'
                  : editingProduct
                  ? 'Update Product & Variants'
                  : 'Publish Product'}

              </button>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}