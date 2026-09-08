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
  FolderTree,
  Eye,
  Search
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
  const [searchQuery, setSearchQuery] = useState('');

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
    is_active: true,
    brand: '',
    diet_type: 'Vegetarian',
    shelf_life: '',
    ingredients: '',
    nutritional_info: ''
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
  // EXPORT PRODUCTS TO EXCEL / CSV (Import-Compatible Format)
  // =========================================================

  const exportProductsToExcel = () => {
    if (!products || products.length === 0) {
      alert("No products available to export.");
      return;
    }

    const headers = [
      "Product Name", 
      "Category", 
      "Description", 
      "Image URL", 
      "Variant 1 Unit", 
      "Variant 1 Price", 
      "Variant 1 MRP", 
      "Variant 1 Stock",
      "Variant 2 Unit", 
      "Variant 2 Price", 
      "Variant 2 MRP", 
      "Variant 2 Stock"
    ];

    const rows = products.map(p => {
      const primaryImage = p.image_url || (Array.isArray(p.images) ? p.images[0] : '') || '';
      const variants = Array.isArray(p.variants) ? p.variants : [];
      
      const v1 = variants[0] || {};
      const v2 = variants[1] || {};

      return [
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.categories?.name || '').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " ")}"`,
        `"${primaryImage}"`,
        `"${(v1.unit_label || v1.label || '').replace(/"/g, '""')}"`,
        v1.price ?? 0,
        v1.mrp ?? 0,
        v1.stock ?? 0,
        `"${(v2.unit_label || v2.label || '').replace(/"/g, '""')}"`,
        v2.price ?? '',
        v2.mrp ?? '',
        v2.stock ?? ''
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kd_store_products_template_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      is_active: true,
      brand: '',
      diet_type: 'Vegetarian',
      shelf_life: '',
      ingredients: '',
      nutritional_info: ''
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

    const specs = product.specifications || {};

    setForm({
      name:
        product.name || '',

      category_id:
        product.category_id || '',

      description:
        product.description || '',

      is_active:
        product.is_active !== false,

      brand: specs.brand || '',
      diet_type: specs.diet_type || 'Vegetarian',
      shelf_life: specs.shelf_life || '',
      ingredients: specs.ingredients || '',
      nutritional_info: specs.nutritional_info || ''
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
            form.is_active,

          specifications: {
            brand: form.brand.trim(),
            diet_type: form.diet_type,
            shelf_life: form.shelf_life.trim(),
            ingredients: form.ingredients.trim(),
            nutritional_info: form.nutritional_info.trim()
          }

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
          is_active: true,
          brand: '',
          diet_type: 'Vegetarian',
          shelf_life: '',
          ingredients: '',
          nutritional_info: ''
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

        if (
          activeTab === 'approvals'
        ) {

          matchesTab =
            product.approval_status ===
              'pending' ||
            !product.approval_status;

        }

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

        else if (
          activeTab === 'topSelling'
        ) {

          matchesTab =
            Number(
              product.totalSold || 0
            ) > 0;

        }

        const matchesShopkeeper =
          selectedShopkeeperFilter ===
            'all' ||

          String(
            product.shopkeeper_id
          ).trim() ===
            String(
              selectedShopkeeperFilter
            ).trim();

        const matchesSearch =
          !searchQuery.trim() ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase());

        return (
          matchesTab &&
          matchesShopkeeper &&
          matchesSearch
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

  // Separate parent categories and subcategories for structured dropdowns & management
  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId) => categories.filter(c => c.parent_id === parentId);

  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="space-y-8 font-sans pb-16">

      {/* =====================================================
          HEADER SECTION (Attractive Dashboard Title & Actions)
      ===================================================== */}

      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl border border-emerald-800/50 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-[-30px] bottom-[-30px] opacity-10 pointer-events-none">
          <Package size={220} />
        </div>

        <div className="relative z-10 space-y-1">
          <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-3.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">
            Catalog Management & Control
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Product Inventory Hub</h2>
          <p className="text-xs text-emerald-200/80 max-w-xl">
            Monitor store items, multi-pack variants, pricing rules, stock alerts, and shopkeeper moderation effortlessly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">

          {/* SHOPKEEPER FILTER */}
          <div className="flex items-center gap-2 bg-emerald-900/60 px-3.5 py-2.5 rounded-2xl border border-emerald-700/60 backdrop-blur-md">
            <Filter size={14} className="text-emerald-400 shrink-0" />
            <select
              className="text-xs font-bold text-white bg-transparent outline-none cursor-pointer"
              value={selectedShopkeeperFilter}
              onChange={e => setSelectedShopkeeperFilter(e.target.value)}
            >
              <option value="all" className="bg-slate-900 text-white">All Shopkeepers (Stores)</option>
              {shopkeepers.map(shopkeeper => (
                <option key={shopkeeper.id} value={shopkeeper.id} className="bg-slate-900 text-white">
                  {shopkeeper.store_name} ({shopkeeper.email})
                </option>
              ))}
            </select>
          </div>

          {/* EXCEL EXPORT BUTTON */}
          <button
            onClick={exportProductsToExcel}
            className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer border border-emerald-600/50 shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-emerald-300" />
            Export to Excel
          </button>

          {/* EXCEL UPLOAD TOGGLE */}
          <button
            onClick={() => setIsExcelUploadExpanded(!isExcelUploadExpanded)}
            className="bg-emerald-900/40 hover:bg-emerald-900/80 text-emerald-200 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer border border-emerald-700/50 backdrop-blur-md shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-emerald-400" />
            Bulk Excel Upload
            {isExcelUploadExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* ADD PRODUCT */}
          <button
            onClick={openAddModal}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer ml-auto md:ml-0"
          >
            <Plus size={16} />
            Add Product
          </button>

        </div>
      </div>

      {/* =====================================================
          EXCEL UPLOAD DRAWER
      ===================================================== */}

      {isExcelUploadExpanded && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-emerald-200 shadow-xl animate-fadeIn">
          <ExcelProductUpload onUploadSuccess={fetchData} />
        </div>
      )}

      {/* =====================================================
          INTELLIGENCE & METRICS BAR
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Catalog Capacity</span>
            <h3 className="text-2xl font-black text-slate-900">{products.length} Items</h3>
            <p className="text-[11px] text-stone-500 font-medium">Total active & listed products</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold border border-emerald-200 group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between group hover:border-amber-300 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Low Stock Variants</span>
            <h3 className="text-2xl font-black text-amber-600">{lowStockCount} Variants</h3>
            <p className="text-[11px] text-stone-500 font-medium">Items with stock count ≤ 5</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold border border-amber-200 group-hover:scale-110 transition-transform">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Pending Approvals</span>
            <h3 className="text-2xl font-black text-slate-900">{pendingCount} Listings</h3>
            <p className="text-[11px] text-stone-500 font-medium">Awaiting administrator verification</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold border border-emerald-200 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION TABS & SEARCH BAR
      ================================================     */}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
        
        {/* TABS */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-stone-50 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Package size={14} />
            <span>All Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'approvals'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-stone-50 text-stone-600 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            <AlertOctagon size={14} />
            <span>Pending Approvals</span>
            {pendingCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('lowStock')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'lowStock'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-stone-50 text-stone-600 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Low Stock</span>
            {lowStockCount > 0 && (
              <span className="bg-amber-700 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('topSelling')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'topSelling'
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                : 'bg-stone-50 text-stone-600 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            <TrendingUp size={14} />
            <span>Top Selling</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-emerald-200 rounded-2xl text-xs font-bold text-stone-900 outline-none focus:border-emerald-600 transition"
          />
        </div>

      </div>

      {/* =====================================================
          INVENTORY TABLE (Designed for clarity and elegance)
      ================================================     */}

      <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse">

            <thead>

              <tr className="bg-emerald-50/50 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-black tracking-wider">

                <th className="p-4 sm:p-5">Product & Store</th>
                <th className="p-4 sm:p-5">Images</th>
                <th className="p-4 sm:p-5">Variants & Pricing</th>
                <th className="p-4 sm:p-5">Inventory Stock</th>
                <th className="p-4 sm:p-5">Ratings</th>
                <th className="p-4 sm:p-5">Status</th>
                <th className="p-4 sm:p-5 text-right">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-emerald-50 text-xs">

              {loading ? (

                <tr>
                  <td colSpan="7" className="p-16 text-center text-stone-500 font-bold">
                    Loading inventory data...
                  </td>
                </tr>

              ) : filteredProducts.length === 0 ? (

                <tr>
                  <td colSpan="7" className="p-16 text-center text-stone-400 italic font-medium">
                    No products found matching your current filter.
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
                      className="hover:bg-emerald-50/20 transition-colors"
                    >

                      {/* PRODUCT & STORE */}

                      <td className="p-4 sm:p-5">

                        <div className="flex items-center gap-3.5">

                          <div className="w-12 h-12 bg-white rounded-2xl overflow-hidden shrink-0 border border-emerald-200 shadow-2xs flex items-center justify-center p-1">

                            {product.image_url || imgList.length > 0 ? (

                              <img
                                src={product.image_url || imgList[0]}
                                alt=""
                                className="w-full h-full object-contain"
                              />

                            ) : (

                              <Package size={20} className="text-stone-300" />

                            )}

                          </div>

                          <div className="min-w-0 max-w-[200px]">

                            <span className="font-black text-slate-900 block truncate text-sm">
                              {product.name}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1 border border-emerald-200 truncate max-w-full">
                              <Store size={10} className="shrink-0" />
                              <span className="truncate">{product.shopkeeper_profiles?.store_name || 'Admin Store'}</span>
                            </span>

                          </div>

                        </div>

                      </td>

                      {/* IMAGES */}

                      <td className="p-4 sm:p-5 text-stone-600 font-bold">
                        <span className="bg-stone-100 px-2.5 py-1 rounded-xl">{imgList.length} loaded</span>
                      </td>

                      {/* VARIANTS */}

                      <td className="p-4 sm:p-5">

                        {variantCount > 0 ? (

                          <div className="space-y-2 min-w-[280px]">

                            {product.variants.map((variant, index) => {

                              const price = Number(variant.price || 0);
                              const mrp = Number(variant.mrp || 0);
                              const stock = Number(variant.stock || 0);

                              const discount =
                                mrp > 0
                                  ? Math.round(((mrp - price) / mrp) * 100)
                                  : 0;

                              return (

                                <div
                                  key={variant.id || index}
                                  className={`rounded-2xl p-2.5 border transition ${
                                    stock <= 5
                                      ? 'bg-amber-50/80 border-amber-300'
                                      : 'bg-emerald-50/40 border-emerald-200/80'
                                  }`}
                                >

                                  <div className="flex justify-between items-center gap-2">
                                    <span className="font-black text-emerald-950">
                                      {variant.unit_label || variant.label || 'Variant'}
                                    </span>
                                    <span className="font-black text-slate-900 text-sm">
                                      ₹{price.toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center mt-1 text-[10px]">
                                    <span className="text-stone-500 font-medium">
                                      MRP: ₹{mrp.toFixed(2)}
                                      {discount > 0 && (
                                        <span className="ml-1 text-emerald-700 font-black">
                                          ({discount}% OFF)
                                        </span>
                                      )}
                                    </span>
                                    <span className={stock <= 5 ? 'font-black text-amber-600' : 'text-stone-500 font-bold'}>
                                      Stock: {stock}
                                    </span>
                                  </div>

                                </div>

                              );

                            })}

                          </div>

                        ) : (

                          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 max-w-[220px]">
                            <span className="text-rose-600 font-black block">No variants</span>
                            <span className="block text-[10px] text-rose-500 mt-0.5">Product cannot be sold until variant is added.</span>
                          </div>

                        )}

                      </td>

                      {/* INVENTORY */}

                      <td className="p-4 sm:p-5">

                        <div className="space-y-1">

                          <span className="font-black text-slate-900 text-sm block">
                            {product.totalVariantStock || 0} units
                          </span>

                          <span className="text-[10px] text-stone-400 font-medium block">
                            {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
                          </span>

                          {lowVariantCount > 0 && (
                            <span className="inline-flex items-center gap-1 font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[10px]">
                              <AlertTriangle size={11} />
                              {lowVariantCount} low stock
                            </span>
                          )}

                          {activeTab === 'topSelling' && (
                            <span className="inline-block font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 text-[10px]">
                              🔥 {product.totalSold || 0} Sold
                            </span>
                          )}

                        </div>

                      </td>

                      {/* RATINGS */}

                      <td className="p-4 sm:p-5">

                        {product.avgRating !== 'No ratings' ? (

                          <button
                            onClick={() => {
                              setSelectedProductForReviews(product);
                              setProductReviewsList(product.reviews || []);
                            }}
                            className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-full font-black border border-amber-200 hover:bg-amber-100 transition cursor-pointer shadow-2xs"
                          >
                            <Star size={13} className="fill-amber-500 text-amber-500" />
                            <span>{product.avgRating} ({product.reviewCount})</span>
                          </button>

                        ) : (

                          <span className="text-stone-400 italic font-medium">No ratings</span>

                        )}

                      </td>

                      {/* STATUS & VISIBILITY */}

                      <td className="p-4 sm:p-5 space-y-2">

                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-black uppercase text-[9px] tracking-wider ${
                          product.approval_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : product.approval_status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {product.approval_status || 'pending'}
                        </span>

                        <div>
                          <button
                            onClick={() => handleToggleProductStatus(product.id, isProductActive)}
                            className="inline-flex items-center gap-1 text-[10px] font-black cursor-pointer transition"
                            title={isProductActive ? 'Disable product from customer view' : 'Enable product for customer view'}
                          >
                            {isProductActive ? (
                              <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Disabled
                              </span>
                            )}
                          </button>
                        </div>

                      </td>

                      {/* ACTIONS */}

                      <td className="p-4 sm:p-5 text-right">

                        <div className="flex justify-end items-center gap-2">

                          {(!product.approval_status || product.approval_status === 'pending') && (
                            <button
                              onClick={() => handleUpdateApproval(product.id, 'approved')}
                              className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-black hover:bg-emerald-700 transition cursor-pointer shadow-xs text-xs"
                            >
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 rounded-xl transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
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

      {/* =====================================================
          REVIEWS MODAL
      ===================================================== */}

      {selectedProductForReviews && (

        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">

          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">

              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2.5 truncate">
                <MessageSquare size={18} className="text-emerald-700 shrink-0" />
                <span className="truncate">Reviews for {selectedProductForReviews.name}</span>
              </h3>

              <button
                onClick={() => setSelectedProductForReviews(null)}
                className="p-2 bg-emerald-50 rounded-full text-stone-600 hover:bg-emerald-100 cursor-pointer shrink-0"
                title="Close"
              >
                <X size={16} />
              </button>

            </div>

            <div className="space-y-3">

              {productReviewsList.length === 0 ? (

                <p className="text-xs text-stone-400 italic py-8 text-center font-medium">
                  No customer reviews submitted for this product yet.
                </p>

              ) : (

                productReviewsList.map(review => (

                  <div
                    key={review.id}
                    className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-2 text-xs"
                  >

                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{review.user_email || 'Customer'}</span>
                      <div className="flex items-center gap-1 text-amber-500 shrink-0">
                        {[...Array(Number(review.rating || 0))].map((_, i) => (
                          <Star key={i} size={12} className="fill-amber-500" />
                        ))}
                      </div>
                    </div>

                    <p className="text-stone-600 leading-relaxed">{review.review_text}</p>

                    <div className="flex justify-between items-center pt-2 border-t border-emerald-100 text-[10px] text-stone-400 font-mono">
                      <span>{review.created_at ? new Date(review.created_at).toLocaleString() : ''}</span>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-rose-600 font-black hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        Delete Review
                      </button>
                    </div>

                  </div>

                ))

              )}

            </div>

            <button
              onClick={() => setSelectedProductForReviews(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-black text-xs uppercase cursor-pointer transition shadow-md"
            >
              Close
            </button>

          </div>

        </div>

      )}

      {/* =====================================================
          ADD / EDIT PRODUCT MODAL
      ===================================================== */}

      {isModalOpen && (

        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">

          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-emerald-100 space-y-6 my-8 max-h-[92vh] overflow-y-auto animate-fadeIn">

            {/* MODAL HEADER */}

            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">

              <div>
                <h3 className="font-black text-lg text-slate-900">
                  {editingProduct ? 'Edit Product & Variants' : 'Add New Product'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Price, MRP, stock and specifications are managed here.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer transition"
                title="Close"
              >
                <X size={18} />
              </button>

            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6 text-xs">

              {/* PRODUCT NAME */}

              <div className="space-y-1.5">
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B Natural Coconut Cola Soft Drink"
                  className="w-full border border-emerald-200 p-3.5 rounded-2xl outline-none focus:border-emerald-600 text-xs bg-emerald-50/20 font-bold text-stone-900"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* CATEGORY & SUBCATEGORY HIERARCHICAL SELECTOR */}

              <div className="space-y-1.5">
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">
                  Category / Subcategory
                </label>
                <select
                  className="w-full border border-emerald-200 p-3.5 rounded-2xl text-xs bg-emerald-50/20 font-bold text-stone-900 cursor-pointer outline-none focus:border-emerald-600"
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {parentCategories.map(parent => {
                    const subs = getSubcategories(parent.id);
                    return (
                      <optgroup key={parent.id} label={`📁 ${parent.name}`}>
                        <option value={parent.id}>📂 {parent.name} (Main Category)</option>
                        {subs.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            &nbsp;&nbsp;&nbsp;&nbsp;└─ {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="form_is_active"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="form_is_active" className="font-bold text-stone-800 cursor-pointer text-xs">
                  Make Product Active / Visible to Customers on Storefront
                </label>
              </div>

              {/* IMAGES */}

              <div className="space-y-2">
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">
                  Product Images
                </label>

                <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 p-6 rounded-3xl text-center bg-emerald-50/20 transition relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => setImageFiles(Array.from(e.target.files || []))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-1 pointer-events-none">
                    <p className="font-black text-stone-800 text-xs">Click to browse or drag & drop images</p>
                    <p className="text-[10px] text-stone-400">Supports PNG, JPG, WebP formats</p>
                  </div>
                </div>

                {existingImages.length > 0 && (
                  <div className="flex gap-2.5 mt-3 flex-wrap">
                    {existingImages.map((url, index) => (
                      <div
                        key={index}
                        className="w-16 h-16 rounded-2xl border border-emerald-200 relative overflow-hidden bg-white shadow-xs"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DESCRIPTION WITH AI & RICH TOOLBAR */}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-stone-700 uppercase tracking-wider text-[11px]">
                    Description
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={generatingAiDesc}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black px-3.5 py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={13} className="text-amber-300 fill-amber-300" />
                    {generatingAiDesc ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>

                <div className="border border-emerald-200 rounded-3xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-emerald-50/60 px-3 py-2 border-b border-emerald-100 flex items-center gap-1">
                    <button type="button" onClick={() => handleFormatText('<b>', '</b>')} className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer" title="Bold">
                      <Bold size={14} />
                    </button>
                    <button type="button" onClick={() => handleFormatText('<i>', '</i>')} className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer" title="Italic">
                      <Italic size={14} />
                    </button>
                    <div className="h-4 w-[1px] bg-emerald-200 mx-1" />
                    <button type="button" onClick={() => handleFormatText('<ul>\n  <li>', '</li>\n</ul>')} className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer" title="List">
                      <List size={14} />
                    </button>
                    <button type="button" onClick={() => handleFormatText('<p>', '</p>')} className="p-1.5 hover:bg-emerald-200/50 rounded-lg cursor-pointer" title="Paragraph">
                      <AlignLeft size={14} />
                    </button>
                  </div>

                  <textarea
                    id="product-rich-description"
                    rows="4"
                    placeholder="Enter product description or specifications..."
                    className="w-full p-3.5 text-xs bg-emerald-50/10 outline-none font-medium resize-y text-stone-900"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              {/* DETAILED SPECIFICATIONS (Brand, Ingredients, Nutrition, etc.) */}
              <div className="pt-4 border-t border-emerald-100 space-y-4">
                <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={15} className="text-emerald-700" /> Detailed Product Specifications
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Brand Name</label>
                    <input
                      type="text"
                      placeholder="e.g. B Natural"
                      className="w-full border border-emerald-200 bg-white p-3 rounded-2xl text-xs font-bold outline-none text-stone-900"
                      value={form.brand}
                      onChange={e => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Diet Type</label>
                    <select
                      className="w-full border border-emerald-200 bg-white p-3 rounded-2xl text-xs font-bold outline-none text-stone-900 cursor-pointer"
                      value={form.diet_type}
                      onChange={e => setForm({ ...form, diet_type: e.target.value })}
                    >
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Gluten-Free">Gluten-Free</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Shelf Life</label>
                    <input
                      type="text"
                      placeholder="e.g. 180 Days"
                      className="w-full border border-emerald-200 bg-white p-3 rounded-2xl text-xs font-bold outline-none text-stone-900"
                      value={form.shelf_life}
                      onChange={e => setForm({ ...form, shelf_life: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Nutritional Information</label>
                    <input
                      type="text"
                      placeholder="e.g. Energy: 42 kcal, Carbs: 10.5g"
                      className="w-full border border-emerald-200 bg-white p-3 rounded-2xl text-xs font-bold outline-none text-stone-900"
                      value={form.nutritional_info}
                      onChange={e => setForm({ ...form, nutritional_info: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-stone-700 uppercase mb-1">Ingredients</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Carbonated Water, Sugar, Coconut Water (2%), Acidity Regulator..."
                    className="w-full border border-emerald-200 bg-white p-3 rounded-2xl text-xs font-medium outline-none text-stone-900 resize-none"
                    value={form.ingredients}
                    onChange={e => setForm({ ...form, ingredients: e.target.value })}
                  />
                </div>
              </div>

              {/* VARIANTS SECTION */}

              <div className="pt-4 border-t border-emerald-100 space-y-4">

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={15} className="text-emerald-700" /> Product Variants (Pack Sizes & Pricing)
                    </h4>
                    <p className="text-[10px] text-stone-500 font-medium">Each variant requires its own pack size, selling price, MRP, and stock level.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="bg-emerald-900 hover:bg-emerald-950 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus size={14} /> Add Variant Tier
                  </button>
                </div>

                {variants.length === 0 ? (
                  <div className="text-center py-8 bg-amber-50/80 rounded-2xl border border-amber-200">
                    <p className="text-amber-800 font-black text-xs">No variants added yet.</p>
                    <p className="text-[10px] text-amber-700 font-medium mt-1">Please add at least one variant configuration.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id || index}
                        className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-200/80 space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-emerald-900 text-xs uppercase">Variant #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeVariantRow(index)}
                            className="text-rose-600 hover:text-rose-800 p-1 bg-white rounded-lg border border-rose-200 cursor-pointer shadow-2xs"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Unit / Pack Size</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 250 ml"
                              className="w-full border border-emerald-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900"
                              value={variant.unit_label || ''}
                              onChange={e => updateVariantRow(index, 'unit_label', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Selling Price (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="37.00"
                              className="w-full border border-emerald-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900"
                              value={variant.price ?? ''}
                              onChange={e => updateVariantRow(index, 'price', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">MRP (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="40.00"
                              className="w-full border border-emerald-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900"
                              value={variant.mrp ?? ''}
                              onChange={e => updateVariantRow(index, 'mrp', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-stone-600 uppercase mb-1">Stock</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              required
                              placeholder="100"
                              className="w-full border border-emerald-200 bg-white p-2.5 rounded-xl text-xs font-bold outline-none text-stone-900"
                              value={variant.stock ?? ''}
                              onChange={e => updateVariantRow(index, 'stock', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white border border-emerald-100 rounded-xl px-3 py-1.5 text-[11px]">
                          <span className="text-stone-500 font-bold">Calculated Discount</span>
                          <span className="font-black text-emerald-700">
                            {Number(variant.mrp || 0) > 0
                              ? Math.max(0, Math.round(((Number(variant.mrp) - Number(variant.price || 0)) / Number(variant.mrp)) * 100))
                              : 0}% OFF
                          </span>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* SAVE BUTTON */}

              <button
                type="submit"
                disabled={submitting || variants.length === 0}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition text-xs uppercase tracking-wider shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 mt-4 cursor-pointer active:scale-95"
              >
                <Plus size={16} />
                {submitting
                  ? 'Saving Product...'
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