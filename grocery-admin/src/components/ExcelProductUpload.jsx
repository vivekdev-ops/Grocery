// src/components/ExcelProductUpload.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExcelProductUpload({ shopkeeperId, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        name: "Fresh Organic Tomato",
        category_name: "Vegetables",
        price: 40,
        mrp: 50,
        stock: 100,
        unit: "1 kg",
        description: "Freshly harvested organic tomatoes from local farms."
      },
      {
        name: "Amul Fresh Toned Milk",
        category_name: "Dairy",
        price: 32,
        mrp: 34,
        stock: 50,
        unit: "500 ml",
        description: "Pasteurised fresh toned milk."
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products Template");
    XLSX.writeFile(workbook, "KD_Store_Products_Template.xlsx");
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
          const price = Number(row.price || row.Price || 0);
          const mrp = Number(row.mrp || row.MRP || price);
          const stock = Number(row.stock || row.Stock || 10);
          const unit = row.unit || row.Unit || '1 unit';
          const description = row.description || row.Description || '';

          if (!productName) {
            failCount++;
            errorsList.push(`Row ${i + 2}: Product name is missing.`);
            continue;
          }

          let categoryId = null;
          if (categoryName) {
            categoryId = categoryMap[String(categoryName).trim().toLowerCase()] || null;
          }

          // 1. Insert parent product without the 'unit' column
          const productPayload = {
            shopkeeper_id: shopkeeperId,
            name: String(productName).trim(),
            category_id: categoryId,
            description: String(description),
            approval_status: 'approved',
            is_active: true
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

          // 2. Insert variant details including unit_label, price, mrp, and stock
          const variantPayload = {
            product_id: insertedProduct.id,
            unit_label: String(unit),
            price: price,
            mrp: mrp > price ? mrp : price,
            stock: stock
          };

          const { error: variantErr } = await supabase
            .from('product_variants')
            .insert([variantPayload]);

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
            Bulk Product Upload via Excel
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">Upload an Excel spreadsheet to add multiple inventory items at once.</p>
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
              <p className="text-xs font-bold text-stone-700">Processing and uploading products...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-xs font-black text-stone-800">Click to upload or drag & drop your Excel file</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Supports .xlsx, .xls and .csv formats</p>
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
            <span>Upload Completed: {uploadResult.successCount} Successful, {uploadResult.failCount} Failed</span>
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