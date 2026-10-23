// TODO (Week 3/4, optional): show trip history table (start, end, distance, max speed).
export default function TripList({ trips = [] }) {
  return <div className="card"><h3>Trips</h3>{trips.length === 0 ? <p>No trips recorded.</p> : <p>{trips.length} trips</p>}</div>;
}
