// src/components/ExcelProductUpload.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { FileSpreadsheet, Upload, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExcelProductUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  // Download a template Excel file featuring variant syntax
  const downloadTemplate = () => {
    const templateData = [
      {
        name: "Aashirvaad Atta",
        description: "Superior quality whole wheat flour",
        price: 220,
        mrp: 250,
        stock: 50,
        category_name: "Grocery & Staples",
        image_url: "https://example.com/atta.jpg",
        variants: "5kg:220:250:50|10kg:420:480:30" // Format: UnitLabel:Price:MRP:Stock separated by |
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "product_upload_template.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setResultMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet);

        if (jsonRows.length === 0) {
          alert("The uploaded Excel file is empty.");
          setUploading(false);
          return;
        }

        // Fetch existing categories to map names to IDs
        const { data: categories } = await supabase.from('categories').select('*');
        const categoryMap = {};
        categories?.forEach(cat => {
          categoryMap[cat.name.toLowerCase().trim()] = cat.id;
        });

        let successCount = 0;
        let failCount = 0;

        for (const row of jsonRows) {
          const catName = (row.category_name || '').toLowerCase().trim();
          const categoryId = categoryMap[catName] || (categories?.[0]?.id);

          const productPayload = {
            name: row.name,
            description: row.description || '',
            price: parseFloat(row.price) || 0,
            mrp: parseFloat(row.mrp) || parseFloat(row.price) || 0,
            stock: parseInt(row.stock) || 0,
            category_id: categoryId,
            image_url: row.image_url || '',
            approval_status: 'approved'
          };

          // 1. Insert Product
          const { data: insertedProduct, error: prodError } = await supabase
            .from('products')
            .insert([productPayload])
            .select()
            .single();

          if (prodError || !insertedProduct) {
            failCount++;
            continue;
          }

          // 2. Parse & Insert Variants if provided (e.g. "500g:40:45:10|1kg:75:90:20")
          if (row.variants && typeof row.variants === 'string') {
            const variantItems = row.variants.split('|');
            const variantPayloads = [];

            for (const item of variantItems) {
              const parts = item.split(':');
              if (parts.length >= 2) {
                const unit_label = parts[0].trim();
                const price = parseFloat(parts[1]) || 0;
                const mrp = parts[2] ? parseFloat(parts[2]) : price;
                const stock = parts[3] ? parseInt(parts[3]) : 10;

                variantPayloads.push({
                  product_id: insertedProduct.id,
                  unit_label,
                  price,
                  mrp,
                  stock
                });
              }
            }

            if (variantPayloads.length > 0) {
              await supabase.from('product_variants').insert(variantPayloads);
            }
          }

          successCount++;
        }

        setResultMessage({ success: successCount, failed: failCount });
        if (onUploadSuccess) onUploadSuccess();
      } catch (err) {
        alert("Error parsing Excel file: " + err.message);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" /> Bulk Upload Products & Variants via Excel
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">Upload an Excel file. Use format <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">Unit:Price:MRP:Stock|Unit:Price:MRP:Stock</code> for variants.</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 border"
        >
          <Download size={14} /> Download Excel Template
        </button>
      </div>

      <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center bg-stone-50/50 hover:bg-stone-50 transition relative">
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload} 
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
            <Upload size={22} />
          </div>
          <p className="text-sm font-bold text-stone-800">
            {uploading ? 'Processing products and variants...' : 'Click to browse or drag & drop your Excel file here'}
          </p>
          <p className="text-xs text-stone-400">Supports .xlsx and .xls files</p>
        </div>
      </div>

      {resultMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <div className="text-xs">
            <p className="font-bold text-emerald-900">Upload Complete!</p>
            <p className="text-emerald-700 mt-0.5">Successfully added <strong>{resultMessage.success}</strong> products with variants. {resultMessage.failed > 0 && `(${resultMessage.failed} failed)`}</p>
          </div>
        </div>
      )}
    </div>
  );
}