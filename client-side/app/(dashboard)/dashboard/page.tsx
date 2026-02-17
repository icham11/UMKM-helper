import StatCard from "../components/StatCard";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm">
          Monitor your business performance in real-time.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value="Rp 12.500.000" />
        <StatCard title="Total Profit" value="Rp 4.200.000" />
        <StatCard title="Orders Today" value="124" />
        <StatCard title="Health Score" value="78%" />
      </div>

      {/* Revenue Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-4">Revenue Trend</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Chart Placeholder
        </div>
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