"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  Search,
  X,
  CreditCard,
  Banknote,
  Minus,
  Plus,
  Trash2,
  Clock,
  CalendarDays,
  Package,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  ChevronDown,
  Receipt,
} from "lucide-react";

// ─── Types ───
interface RecipeIngredient {
  ingredient: {
    id: number;
    name: string;
    unit: string;
    currentStock: number;
  };
  quantity: number;
}

interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  categoryId: number | null;
  isActive: boolean;
  category?: { id: number; name: string } | null;
  recipes?: RecipeIngredient[];
  recipeCost?: number;
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

// ─── Helpers ───
const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

function getProductAvailability(product: Product): { available: boolean; maxQty: number; missingIngredients: string[] } {
  if (!product.recipes || product.recipes.length === 0) {
    return { available: true, maxQty: 999, missingIngredients: [] };
  }

  const missing: string[] = [];
  let maxQty = Infinity;

  for (const recipe of product.recipes) {
    const stock = recipe.ingredient.currentStock;
    const needed = recipe.quantity;

    if (needed <= 0) continue;

    const canMake = Math.floor(stock / needed);
    if (canMake <= 0) {
      missing.push(recipe.ingredient.name);
    }
    maxQty = Math.min(maxQty, canMake);
  }

  return {
    available: missing.length === 0 && maxQty > 0,
    maxQty: maxQty === Infinity ? 999 : maxQty,
    missingIngredients: missing,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ─── Main Component ───
export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Transfer" | "Digital">("Cash");
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch products with recipe data
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (paymentStatus === "success") setPaymentNotice("✅ Pembayaran berhasil!");
    else if (paymentStatus === "pending") setPaymentNotice("⏳ Menunggu pembayaran...");
    else if (paymentStatus === "error") setPaymentNotice("❌ Pembayaran gagal.");
    if (paymentStatus) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await fetch("/api/products?withRecipe=true");
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.filter((p: Product) => p.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Categories
  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    products.forEach((p) => {
      if (p.category) cats.set(String(p.category.id), p.category.name);
    });
    return Array.from(cats.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // Filter products & sort: available first, then low stock, then unavailable
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCategory = selectedCategory === "all" || String(p.categoryId) === selectedCategory;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => {
        const availA = getProductAvailability(a);
        const availB = getProductAvailability(b);
        // Available products first, unavailable last
        if (availA.available && !availB.available) return -1;
        if (!availA.available && availB.available) return 1;
        // Among available, sort by maxQty descending (more stock = higher)
        if (availA.available && availB.available) {
          return availB.maxQty - availA.maxQty;
        }
        return 0;
      });
  }, [products, searchQuery, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    const { available, maxQty } = getProductAvailability(product);
    if (!available) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= maxQty) return prev;

      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.sellingPrice), quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const product = products.find((p) => p.id === productId);
          const { maxQty } = product ? getProductAvailability(product) : { maxQty: 999 };
          const newQty = Math.max(0, Math.min(item.quantity + delta, maxQty));
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout
  const handleCheckout = async (useOnlinePayment: boolean) => {
    if (cart.length === 0) return;

    if (useOnlinePayment && (!customerName.trim() || !customerEmail.trim())) {
      alert("Nama dan email wajib diisi untuk pembayaran online!");
      return;
    }

    setLoading(true);
    try {
      if (useOnlinePayment) {
        const response = await fetch("/api/sales/midtrans-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
            paymentMethod,
            customerName,
            customerEmail,
            customerPhone: customerPhone || undefined,
          }),
        });
        const data = await response.json();
        if (data.success) {
          const { saleId, orderId, snapToken } = data.data;
          // @ts-expect-error - Midtrans Snap loaded from external script
          window.snap.pay(snapToken, {
            onSuccess: () => { window.location.href = `/pos/payment-success?saleId=${saleId}&orderId=${orderId}`; },
            onPending: () => { alert("Menunggu pembayaran..."); clearCart(); },
            onError: () => { alert("Pembayaran gagal!"); },
            onClose: () => { console.log("Payment popup closed"); },
          });
        } else {
          alert(`Error: ${data.error}`);
        }
      } else {
        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
            paymentMethod: "Cash",
            paymentStatus: "Paid",
            customerName: customerName || undefined,
            customerEmail: customerEmail || undefined,
            customerPhone: customerPhone || undefined,
          }),
        });
        const data = await response.json();
        if (data.success) {
          window.location.href = `/pos/payment-success?saleId=${data.data.id}&orderId=${data.data.transactionNumber}`;
        } else {
          alert(`Error: ${data.error}`);
        }
      }
    } catch {
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
    <div className="h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* ═══ Top Bar ═══ */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Point of Sale</h1>
            <p className="text-xs text-gray-500">Kasir &amp; Transaksi</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">{formatDate(currentTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span className="font-mono font-medium">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Payment notice */}
      {paymentNotice && (
        <div className="mx-6 mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700 flex items-center gap-2 shrink-0">
          {paymentNotice}
          <button onClick={() => setPaymentNotice(null)} className="ml-auto text-blue-400 hover:text-blue-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
        {/* ─── LEFT: Products ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search + Categories */}
          <div className="flex gap-3 mb-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari menu atau produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 shrink-0">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Semua ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => String(p.categoryId) === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {productsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Tidak ada produk ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const { available, maxQty, missingIngredients } = getProductAvailability(product);
                  const inCart = cart.find((c) => c.productId === product.id);
                  const cartQty = inCart?.quantity || 0;
                  const isMaxed = cartQty >= maxQty;

                  return (
                    <button
                      key={product.id}
                      onClick={() => available && !isMaxed && addToCart(product)}
                      disabled={!available || isMaxed}
                      className={`relative text-left rounded-xl p-4 transition-all duration-200 border ${
                        !available
                          ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                          : isMaxed
                          ? "bg-orange-50 border-orange-200 cursor-not-allowed"
                          : cartQty > 0
                          ? "bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200"
                          : "bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md"
                      }`}
                    >
                      {/* Badge: quantity in cart */}
                      {cartQty > 0 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                          {cartQty}
                        </div>
                      )}

                      {/* Category */}
                      {product.category && (
                        <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {product.category.name}
                        </span>
                      )}

                      {/* Name */}
                      <h3 className={`font-semibold mt-2 text-sm leading-tight ${!available ? "text-gray-400" : "text-gray-900"}`}>
                        {product.name}
                      </h3>

                      {/* Price */}
                      <p className={`text-base font-bold mt-1 ${!available ? "text-gray-300" : "text-indigo-600"}`}>
                        {formatRupiah(Number(product.sellingPrice))}
                      </p>

                      {/* Availability status */}
                      {!available ? (
                        <div className="mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-[10px] text-red-500 font-medium">
                            Habis: {missingIngredients.slice(0, 2).join(", ")}
                            {missingIngredients.length > 2 && ` +${missingIngredients.length - 2}`}
                          </span>
                        </div>
                      ) : maxQty <= 5 ? (
                        <div className="mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] text-amber-600 font-medium">
                            Sisa {maxQty} porsi
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-[10px] text-green-600 font-medium">Tersedia</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Cart ─── */}
        <div className="w-[380px] bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
          {/* Cart header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">Keranjang</h2>
              {totalItems > 0 && (
                <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Hapus semua
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">Keranjang masih kosong</p>
                <p className="text-xs mt-1">Klik menu untuk menambahkan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatRupiah(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatRupiah(item.price * item.quantity)}</p>
                      <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer */}
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 shrink-0 bg-gray-50/50">
            {/* Customer info toggle */}
            <button
              onClick={() => setShowCustomerForm(!showCustomerForm)}
              className="w-full flex items-center justify-between text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {customerName ? customerName : "Info Customer (opsional)"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition ${showCustomerForm ? "rotate-180" : ""}`} />
            </button>

            {showCustomerForm && (
              <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-3">
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama customer"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email customer"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="No. HP (opsional)"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="flex gap-1.5">
              {(["Cash", "QRIS", "Transfer", "Digital"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-2 text-[11px] font-medium rounded-lg transition ${
                    paymentMethod === method
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {method === "Cash" ? "💵" : method === "QRIS" ? "📱" : method === "Transfer" ? "🏦" : "💳"}{" "}
                  {method}
                </button>
              ))}
            </div>

            {/* Total */}
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>{totalItems} item</span>
                <span>Subtotal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-extrabold text-gray-900">Total</span>
                <span className="text-lg font-extrabold text-indigo-600">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Checkout buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCheckout(false)}
                disabled={loading || cart.length === 0 || paymentMethod !== "Cash"}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition"
              >
                <Banknote className="w-4 h-4" />
                Cash
              </button>
              <button
                onClick={() => handleCheckout(true)}
                disabled={loading || cart.length === 0 || paymentMethod === "Cash"}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition"
              >
                <CreditCard className="w-4 h-4" />
                Online
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}