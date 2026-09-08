// src/components/ExcelProductUpload.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExcelProductUpload({ shopkeeperId, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const dummyImages = [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1563536316-33923d83832d?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=500&q=80"
  ];

  const getRandomDummyImage = () => {
    const randomIndex = Math.floor(Math.random() * dummyImages.length);
    return dummyImages[randomIndex];
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        name: "B Natural Coconut Cola Soft Drink",
        category_name: "Beverages",
        description: "B Natural Coconut Cola: No Addict Sugar. Refreshing and fizzy blend of cola and coconut water.",
        brand: "B Natural",
        diet_type: "Vegetarian",
        shelf_life: "180 Days",
        nutritional_info: "Energy: 42 kcal, Carbs: 10.5g",
        ingredients: "Carbonated Water, Sugar, Coconut Water (2%), Acidity Regulator",
        image_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80",
        // Variant 1
        v1_unit: "250 ml",
        v1_price: 37,
        v1_mrp: 40,
        v1_stock: 100,
        // Variant 2
        v2_unit: "500 ml",
        v2_price: 70,
        v2_mrp: 75,
        v2_stock: 60,
        // Variant 3
        v3_unit: "750 ml",
        v3_price: 95,
        v3_mrp: 105,
        v3_stock: 40,
        // Variant 4
        v4_unit: "1 Litre",
        v4_price: 120,
        v4_mrp: 135,
        v4_stock: 25
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products Template");
    XLSX.writeFile(workbook, "KD_Store_Products_4_Variants_Template.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          throw new Error("The uploaded Excel file is empty or formatted incorrectly.");
        }

        const { data: categories, error: catError } = await supabase.from('categories').select('id, name');
        if (catError) throw catError;

        const categoryMap = {};
        (categories || []).forEach(c => {
          categoryMap[c.name.trim().toLowerCase()] = c.id;
        });

        let successCount = 0;
        let failCount = 0;
        let errorsList = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const productName = row.name || row.Name || row.PRODUCT_NAME;
          const categoryName = row.category_name || row.Category_Name || row.Category || '';
          
          const rawImageUrl = row.image_url || row.Image_Url || row.Image || '';
          const finalImageUrl = String(rawImageUrl).trim() !== '' ? String(rawImageUrl).trim() : getRandomDummyImage();

          const description = row.description || row.Description || '';
          const brand = row.brand || row.Brand || '';
          const dietType = row.diet_type || row.Diet_Type || 'Vegetarian';
          const shelfLife = row.shelf_life || row.Shelf_Life || '';
          const nutritionalInfo = row.nutritional_info || row.Nutritional_Info || '';
          const ingredients = row.ingredients || row.Ingredients || '';

          if (!productName) {
            failCount++;
            errorsList.push(`Row ${i + 2}: Product name is missing.`);
            continue;
          }

          let categoryId = null;
          if (categoryName) {
            categoryId = categoryMap[String(categoryName).trim().toLowerCase()] || null;
          }

          // Dynamically check up to 4 variants (v1, v2, v3, v4)
          const variantsList = [];
          
          for (let vNum = 1; vNum <= 4; vNum++) {
            const unitKey = `v${vNum}_unit`;
            const upperUnitKey = `V${vNum}_Unit`;
            const priceKey = `v${vNum}_price`;
            const upperPriceKey = `V${vNum}_Price`;
            const mrpKey = `v${vNum}_mrp`;
            const upperMrpKey = `V${vNum}_Mrp`;
            const stockKey = `v${vNum}_stock`;
            const upperStockKey = `V${vNum}_Stock`;

            const unitVal = row[unitKey] || row[upperUnitKey];
            const priceVal = Number(row[priceKey] || row[upperPriceKey] || 0);

            if (unitVal && priceVal > 0) {
              const mrpVal = Number(row[mrpKey] || row[upperMrpKey] || priceVal);
              const stockVal = Number(row[stockKey] || row[upperStockKey] || 10);

              variantsList.push({
                unit_label: String(unitVal).trim(),
                price: priceVal,
                mrp: mrpVal > priceVal ? mrpVal : priceVal,
                stock: stockVal
              });
            }
          }

          // Fallback if no specific v1-v4 column mapping was matched but generic price/unit existed
          if (variantsList.length === 0) {
            const fallbackPrice = Number(row.price || 0);
            if (fallbackPrice > 0) {
              variantsList.push({
                unit_label: String(row.unit || row.Unit || '1 unit').trim(),
                price: fallbackPrice,
                mrp: Number(row.mrp || fallbackPrice),
                stock: Number(row.stock || 10)
              });
            }
          }

          if (variantsList.length === 0) {
            failCount++;
            errorsList.push(`Row ${i + 2} (${productName}): At least one valid variant with unit and price is required.`);
            continue;
          }

          // 1. Insert parent product with specifications & JSON variants backup
          const productPayload = {
            shopkeeper_id: shopkeeperId || null,
            name: String(productName).trim(),
            category_id: categoryId,
            description: String(description),
            image_url: finalImageUrl,
            images: [finalImageUrl],
            gallery: [finalImageUrl],
            variants: variantsList,
            approval_status: 'pending',
            is_active: true,
            specifications: {
              brand: String(brand).trim(),
              diet_type: String(dietType).trim(),
              shelf_life: String(shelfLife).trim(),
              nutritional_info: String(nutritionalInfo).trim(),
              ingredients: String(ingredients).trim()
            }
          };

          const { data: insertedProduct, error: insertErr } = await supabase
            .from('products')
            .insert([productPayload])
            .select()
            .single();

          if (insertErr || !insertedProduct) {
            failCount++;
            errorsList.push(`Row ${i + 2} (${productName}): ${insertErr?.message || 'Failed to insert product'}`);
            continue;
          }

          // 2. Insert relational product_variants rows
          const variantPayloads = variantsList.map(v => ({
            product_id: insertedProduct.id,
            unit_label: v.unit_label,
            price: v.price,
            mrp: v.mrp,
            stock: v.stock
          }));

          const { error: variantErr } = await supabase
            .from('product_variants')
            .insert(variantPayloads);

          if (variantErr) {
            failCount++;
            errorsList.push(`Row ${i + 2} (${productName}) Variant error: ${variantErr.message}`);
          } else {
            successCount++;
          }
        }

        setUploadResult({ successCount, failCount, errorsList });
        if (onUploadSuccess) onUploadSuccess();
      } catch (err) {
        alert("Failed to parse Excel file: " + err.message);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-sm font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={20} />
            Bulk Product & Multi-Variant (Up to 4) Upload via Excel
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">Upload products supporting 4 variant tiers (v1 to v4) and specifications.</p>
        </div>

        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-black text-xs transition cursor-pointer"
        >
          <Download size={14} /> Download Template
        </button>
      </div>

      <div className="border-2 border-dashed border-stone-200 hover:border-emerald-500 rounded-3xl p-8 text-center transition-all bg-stone-50/50 relative">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full"
        />

        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          {uploading ? (
            <>
              <Loader2 size={36} className="text-emerald-600 animate-spin" />
              <p className="text-xs font-bold text-stone-700">Processing and uploading variants...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-xs font-black text-stone-800">Click to upload or drag & drop your Excel file</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Supports automated parsing up to 4 variant tiers (v1_unit to v4_unit)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {uploadResult && (
        <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
          uploadResult.failCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-2 font-black text-sm">
            {uploadResult.failCount === 0 ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-amber-600" />}
            <span>Upload Completed: {uploadResult.successCount} Added Successfully, {uploadResult.failCount} Failed</span>
          </div>

          {uploadResult.errorsList.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 pt-1 border-t border-stone-200/60 font-medium">
              {uploadResult.errorsList.map((err, idx) => (
                <p key={idx} className="text-[11px] text-rose-600">• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}