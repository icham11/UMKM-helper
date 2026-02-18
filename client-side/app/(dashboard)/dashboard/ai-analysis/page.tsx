import ImageAnalyzer from '@/app/(dashboard)/components/ai/ImageAnalyzer';

export default function AIAnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Image Analysis</h1>
          <p className="text-gray-600 mt-2">
            Upload gambar invoice, receipt, atau stock untuk analisis otomatis dengan AI
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="font-semibold text-gray-900">Fitur AI Analysis</h3>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>✅ Invoice OCR - Extract data dari faktur</li>
              <li>✅ Receipt Analysis - Analisis struk pembelian</li>
              <li>✅ Stock Photo - Hitung inventory dari foto</li>
              <li>✅ Product Analysis - Analisis produk otomatis</li>
              <li>⏱️ Auto-delete - Gambar terhapus otomatis setelah 1 menit</li>
            </ul>
          </div>
        </div>
      </div>

      <ImageAnalyzer />

      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-gray-900">Penting!</h3>
            <p className="text-sm text-gray-600 mt-1">
              Gambar yang diupload akan <strong>otomatis terhapus setelah 1 menit</strong> untuk menghemat storage.
              Pastikan Anda sudah mencatat hasil analisis sebelum gambar terhapus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

