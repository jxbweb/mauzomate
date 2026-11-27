
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function SalesChart({ salesByDate, currency }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={salesByDate}
        margin={{ top: 15, right: 20, left: 15, bottom: 5 }}
      >
        <CartesianGrid
          stroke="#e5e7eb"
          strokeDasharray="4 4"
          vertical={false}
        />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
  width={110}
  tick={{
    fontSize: 13,
    fill: 'currentColor'
  }}
  tickFormatter={(value) =>
    `${currency} ${Number(value).toLocaleString()}`
  }
/>
        <Tooltip
          formatter={(value) => [
            `${currency} ${Number(value).toLocaleString()}`,
            'Revenue'
          ]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2864d8"
          dot={{ r: 5, fill: '#2864d8' }}
          strokeWidth={4}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default SalesChart;
