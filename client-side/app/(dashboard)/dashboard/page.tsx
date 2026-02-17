
import StatCard from "../components/StatCard";
import RevenueChart from "../components/charts/RevenueChart";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Blue header section */}
      <div className="w-full px-6 pt-8 pb-14 flex flex-col gap-6 relative overflow-visible">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-blue-800 text-base font-semibold mb-1">/ Pages / Default</div>
            <div className="text-2xl font-bold text-blue-900 drop-shadow">Default</div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Type here..."
              className="px-4 py-2 rounded-lg border-none outline-none bg-white text-gray-700 shadow"
            />
            <span className="text-blue-800 font-medium">Sign In</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mt-2">
          <div className="bg-white rounded-xl p-5 shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-indigo-100 p-2 rounded-full text-indigo-600 text-xl">💰</span>
              <span className="text-xs font-semibold text-gray-500">TODAY'S MONEY</span>
            </div>
            <div className="text-xl font-bold text-gray-800">Rp 12.500.000</div>
            <div className="text-green-500 font-semibold text-sm mt-1">
              +55% <span className="text-gray-500 font-normal">since yesterday</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-indigo-100 p-2 rounded-full text-indigo-600 text-xl">👤</span>
              <span className="text-xs font-semibold text-gray-500">TODAY'S USERS</span>
            </div>
            <div className="text-xl font-bold text-gray-800">2,300</div>
            <div className="text-green-500 font-semibold text-sm mt-1">
              +3% <span className="text-gray-500 font-normal">since last week</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-red-100 p-2 rounded-full text-red-600 text-xl">🆕</span>
              <span className="text-xs font-semibold text-gray-500">NEW CLIENTS</span>
            </div>
            <div className="text-xl font-bold text-gray-800">+3,462</div>
            <div className="text-red-500 font-semibold text-sm mt-1">
              -2% <span className="text-gray-500 font-normal">since last quarter</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-orange-100 p-2 rounded-full text-orange-600 text-xl">🛒</span>
              <span className="text-xs font-semibold text-gray-500">SALES</span>
            </div>
            <div className="text-xl font-bold text-gray-800">Rp 103.430</div>
            <div className="text-green-500 font-semibold text-sm mt-1">
              +5% <span className="text-gray-500 font-normal">than last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="px-6 mb-6">
        <RevenueChart />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">Top Selling Menu</h2>
          <div className="h-48 flex items-center justify-center text-gray-400">
            Bar Chart Placeholder
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold mb-4">AI Insight</h2>
          <p className="text-sm text-gray-600">
            Revenue increased 12% this week. Consider promoting Ayam Geprek to maximize margin.
          </p>
        </div>

      </div>
    </div>
  )
}