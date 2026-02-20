"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Search, X, CreditCard } from "lucide-react";

interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  categoryId: number | null;
  isActive: boolean;
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Transfer" | "Digital">("Cash");
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");

    if (paymentStatus === "success") {
      setPaymentNotice("Pembayaran berhasil. Status akan diperbarui otomatis.");
    } else if (paymentStatus === "pending") {
      setPaymentNotice("Pembayaran tertunda. Silakan selesaikan pembayaran.");
    } else if (paymentStatus === "error") {
      setPaymentNotice("Pembayaran gagal. Coba lagi atau gunakan metode lain.");
    }

    if (paymentStatus) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.filter((p: Product) => p.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.sellingPrice),
          quantity: 1,
        },
      ];
    });
  };

  // Update quantity
  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculate total
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Filter products by search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle checkout
  const handleCheckout = async (useOnlinePayment: boolean) => {
    if (cart.length === 0) {
      alert("Keranjang kosong!");
      return;
    }

    if (useOnlinePayment && (!customerName || !customerEmail)) {
      alert("Nama dan email customer wajib diisi untuk pembayaran online!");
      return;
    }

    setLoading(true);

    try {
      if (useOnlinePayment) {
        // Online payment via Midtrans
        const response = await fetch("/api/sales/midtrans-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            paymentMethod,
            customerName,
            customerEmail,
            customerPhone: customerPhone || undefined,
          }),
        });

        const data = await response.json();

        if (data.success) {
          const saleId = data.data.saleId;
          const orderId = data.data.orderId;

          // Load Midtrans Snap
          // @ts-ignore
          window.snap.pay(data.data.snapToken, {
            onSuccess: () => {
              // Redirect to payment success page for auto-download invoice
              window.location.href = `/pos/payment-success?saleId=${saleId}&orderId=${orderId}`;
            },
            onPending: () => {
              alert("Menunggu pembayaran...");
              clearCart();
            },
            onError: () => {
              alert("Pembayaran gagal!");
            },
            onClose: () => {
              console.log("Payment popup closed");
            },
          });
        } else {
          alert(`Error: ${data.error}`);
        }
      } else {
        // Direct payment (Cash)
        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            paymentMethod: "Cash",
            paymentStatus: "Paid",
            customerName: customerName || undefined,
            customerEmail: customerEmail || undefined,
            customerPhone: customerPhone || undefined,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Redirect to payment success page with saleId for auto-download invoice
          const saleId = data.data.id;
          const orderId = data.data.transactionNumber;
          window.location.href = `/pos/payment-success?saleId=${saleId}&orderId=${orderId}`;
        } else {
          alert(`Error: ${data.error}`);
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Terjadi kesalahan saat checkout");
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Point of Sale</h1>

        {paymentNotice ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {paymentNotice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-all text-left"
                >
                  <div className="font-semibold text-gray-900 mb-2">{product.name}</div>
                  <div className="text-lg font-bold text-blue-600">
                    Rp {Number(product.sellingPrice).toLocaleString("id-ID")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Keranjang</h2>
            </div>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between border-b border-gray-200 pb-3"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        Rp {item.price.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Info for Online Payment */}
            <div className="space-y-3 mb-4 border-t border-gray-200 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Customer *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Customer *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. HP (Opsional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer">Transfer Bank</option>
                <option value="Digital">E-Wallet</option>
              </select>
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">Rp {total.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Checkout Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleCheckout(false)}
                disabled={loading || cart.length === 0}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                💵 Bayar Cash
              </button>
              <button
                onClick={() => handleCheckout(true)}
                disabled={loading || cart.length === 0 || paymentMethod === "Cash"}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Bayar Online (Midtrans)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}