import { Link } from 'react-router-dom'

export function PlaceDetailLink({ id, name }: { id?: number | null; name?: string | null }) {
  if (!id || !Number.isSafeInteger(id) || id <= 0) return <span>미연결</span>
  return <Link to={`/places?placeId=${id}`}>{name ? `${name} · #${id}` : `장소 #${id}`}</Link>
}
