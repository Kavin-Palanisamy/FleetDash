import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
// data: [{ timestamp, speed }]
export default function TelemetryChart({ data }) {
  const rows = data.map((d) => ({ time: new Date(d.timestamp).toLocaleTimeString(), speed: d.speed }));
  return (
    <div className="card" style={{ height: 280 }}>
      <h3>Speed history</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={rows}><XAxis dataKey="time" /><YAxis /><Tooltip /><Line dataKey="speed" dot={false} /></LineChart>
      </ResponsiveContainer>
    </div>
  );
}
