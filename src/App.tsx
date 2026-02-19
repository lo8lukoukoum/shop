import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  Package, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Scan,
  Download,
  Upload,
  Share2,
  Send,
  ChevronRight,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OrderItem, Order } from './types';
import { Scanner } from './components/Scanner';
import { cn } from './utils';

// --- Constants ---
const STORAGE_KEY_PRODUCTS = 'barcode_app_products';
const STORAGE_KEY_ORDERS = 'barcode_app_orders';

export default function App() {
  const [activeTab, setActiveTab] = useState<'checkout' | 'inventory' | 'settings'>('checkout');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'checkout' | 'inventory'>('checkout');
  
  // Inventory Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data
  useEffect(() => {
    const savedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  }, [orders]);

  // --- Handlers ---

  const handleScan = (barcode: string) => {
    if (scannerMode === 'checkout') {
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        addToOrder(product);
      } else {
        alert(`未找到商品: ${barcode}`);
      }
    } else {
      // Inventory mode: find or create
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        setEditingProduct(product);
      } else {
        setEditingProduct({
          id: crypto.randomUUID(),
          barcode,
          name: '',
          price: 0,
          stock: 0
        });
      }
      setIsProductModalOpen(true);
      setIsScannerOpen(false);
    }
  };

  const addToOrder = (product: Product) => {
    setCurrentOrderItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromOrder = (productId: string) => {
    setCurrentOrderItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateOrderQuantity = (productId: string, delta: number) => {
    setCurrentOrderItems(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalAmount = useMemo(() => {
    return currentOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [currentOrderItems]);

  const handleCheckout = () => {
    if (currentOrderItems.length === 0) return;
    
    const newOrder: Order = {
      id: crypto.randomUUID(),
      items: [...currentOrderItems],
      total: totalAmount,
      timestamp: Date.now()
    };

    // Update stock
    setProducts(prev => prev.map(p => {
      const orderItem = currentOrderItems.find(item => item.id === p.id);
      if (orderItem) {
        return { ...p, stock: Math.max(0, p.stock - orderItem.quantity) };
      }
      return p;
    }));

    setOrders(prev => [newOrder, ...prev]);
    setCurrentOrderItems([]);
    alert('结账成功！');
  };

  const saveProduct = (product: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.map(p => p.id === product.id ? product : p);
      }
      return [...prev, product];
    });
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('确定要删除该商品吗？')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  // --- Export/Import ---
  const exportData = () => {
    const data = { products, orders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products) setProducts(data.products);
        if (data.orders) setOrders(data.orders);
        alert('导入成功！');
      } catch (err) {
        alert('导入失败，请检查文件格式。');
      }
    };
    reader.readAsText(file);
  };

  const shareData = async () => {
    const data = JSON.stringify({ products, orders });
    if (navigator.share) {
      try {
        await navigator.share({
          title: '库存与订单数据',
          text: data,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(data);
      alert('数据已复制到剪贴板');
    }
  };

  // --- Render Helpers ---

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col max-w-md mx-auto border-x border-zinc-200 shadow-xl relative">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-4 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {activeTab === 'checkout' && '扫码结账'}
            {activeTab === 'inventory' && '库存管理'}
            {activeTab === 'settings' && '系统设置'}
          </h1>
          {activeTab === 'inventory' && (
            <button 
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="p-2 bg-zinc-900 text-white rounded-full shadow-sm hover:bg-zinc-800 transition-colors"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'checkout' && (
          <div className="p-4 space-y-4">
            {/* Scan Button */}
            <button 
              onClick={() => {
                setScannerMode('checkout');
                setIsScannerOpen(true);
              }}
              className="w-full py-8 bg-white border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center space-y-2 text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-all"
            >
              <Scan size={48} strokeWidth={1.5} />
              <span className="font-medium">点击开始扫码</span>
            </button>

            {/* Order Items */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">当前订单</h2>
              <AnimatePresence mode="popLayout">
                {currentOrderItems.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-zinc-400"
                  >
                    暂无商品，请扫码添加
                  </motion.div>
                ) : (
                  currentOrderItems.map(item => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900">{item.name || '未命名商品'}</h3>
                        <p className="text-xs text-zinc-500 font-mono">{item.barcode}</p>
                        <p className="text-sm font-bold text-zinc-900 mt-1">¥{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center bg-zinc-100 rounded-lg p-1">
                          <button 
                            onClick={() => updateOrderQuantity(item.id, -1)}
                            className="p-1 hover:bg-white rounded-md transition-colors"
                          >
                            <X size={14} />
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateOrderQuantity(item.id, 1)}
                            className="p-1 hover:bg-white rounded-md transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromOrder(item.id)}
                          className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="搜索商品名称或条码..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
              />
            </div>

            <button 
              onClick={() => {
                setScannerMode('inventory');
                setIsScannerOpen(true);
              }}
              className="w-full py-3 bg-zinc-100 text-zinc-600 rounded-xl flex items-center justify-center space-x-2 hover:bg-zinc-200 transition-colors"
            >
              <Scan size={18} />
              <span className="text-sm font-medium">扫码录入/编辑</span>
            </button>

            {/* Product List */}
            <div className="space-y-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm">
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900">{product.name || '未命名商品'}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-mono">{product.barcode}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        product.stock > 10 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        库存: {product.stock}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-900 mt-2">¥{product.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setIsProductModalOpen(true);
                      }}
                      className="p-2 text-zinc-500 hover:bg-zinc-50 rounded-full transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteProduct(product.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-zinc-400">
                  未找到相关商品
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">数据管理</h2>
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <button 
                  onClick={exportData}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors border-b border-zinc-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Download size={20} />
                    </div>
                    <span className="font-medium">导出数据 (JSON)</span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300" />
                </button>
                
                <label className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors border-b border-zinc-100 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Upload size={20} />
                    </div>
                    <span className="font-medium">导入数据</span>
                  </div>
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                  <ChevronRight size={18} className="text-zinc-300" />
                </label>

                <button 
                  onClick={shareData}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors border-b border-zinc-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Share2 size={20} />
                    </div>
                    <span className="font-medium">分享数据</span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300" />
                </button>

                <button 
                  onClick={() => alert('发送功能已就绪')}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                      <Send size={20} />
                    </div>
                    <span className="font-medium">发送到服务器</span>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300" />
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">关于系统</h2>
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-600">版本号</span>
                  <span className="text-zinc-400 font-mono">v1.0.0</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-600">商品总数</span>
                  <span className="text-zinc-400 font-mono">{products.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-600">累计订单</span>
                  <span className="text-zinc-400 font-mono">{orders.length}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Checkout Footer */}
      {activeTab === 'checkout' && currentOrderItems.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 p-4 z-20">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-zinc-400">总计金额</p>
              <p className="text-2xl font-bold">¥{totalAmount.toFixed(2)}</p>
            </div>
            <button 
              onClick={handleCheckout}
              className="bg-white text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-colors flex items-center space-x-2"
            >
              <span>结账</span>
              <Check size={20} />
            </button>
          </motion.div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-xl border-t border-zinc-200 h-20 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-center justify-around px-6 z-30">
        <button 
          onClick={() => setActiveTab('checkout')}
          className={cn(
            "flex flex-col items-center space-y-1 transition-all",
            activeTab === 'checkout' ? "text-zinc-900 scale-110" : "text-zinc-400"
          )}
        >
          <ShoppingCart size={24} strokeWidth={activeTab === 'checkout' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">结账</span>
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "flex flex-col items-center space-y-1 transition-all",
            activeTab === 'inventory' ? "text-zinc-900 scale-110" : "text-zinc-400"
          )}
        >
          <Package size={24} strokeWidth={activeTab === 'inventory' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">库存</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex flex-col items-center space-y-1 transition-all",
            activeTab === 'settings' ? "text-zinc-900 scale-110" : "text-zinc-400"
          )}
        >
          <SettingsIcon size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">设置</span>
        </button>
      </nav>

      {/* Scanner Overlay */}
      {isScannerOpen && (
        <Scanner 
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Product Edit Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingProduct?.name ? '编辑商品' : '新增商品'}
                </h2>
                <button onClick={() => setIsProductModalOpen(false)} className="p-2 bg-zinc-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                saveProduct({
                  id: editingProduct?.id || crypto.randomUUID(),
                  barcode: formData.get('barcode') as string,
                  name: formData.get('name') as string,
                  price: parseFloat(formData.get('price') as string) || 0,
                  stock: parseInt(formData.get('stock') as string) || 0,
                });
              }}>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">条形码</label>
                  <div className="relative">
                    <input 
                      name="barcode"
                      defaultValue={editingProduct?.barcode}
                      required
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setIsProductModalOpen(false);
                        setScannerMode('inventory');
                        setIsScannerOpen(true);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">商品名称</label>
                  <input 
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    placeholder="例如: 矿泉水"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">价格 (¥)</label>
                    <input 
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={editingProduct?.price}
                      required
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">库存数量</label>
                    <input 
                      name="stock"
                      type="number"
                      defaultValue={editingProduct?.stock}
                      required
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold shadow-lg hover:bg-zinc-800 transition-all active:scale-95"
                >
                  保存商品信息
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
