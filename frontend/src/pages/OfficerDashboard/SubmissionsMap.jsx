import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS_META, statusMeta } from './statusMeta';

// Fallback view: Nashik region, where the demo Gats live.
const FALLBACK_CENTER = [19.9012, 74.4939];

const hasCoords = (sub) =>
  typeof sub?.location?.latitude === 'number' && typeof sub?.location?.longitude === 'number';

/**
 * GIS crop map for the Officer Dashboard.
 * Plots each submission as a pin coloured by its validation outcome, over the
 * Gat polygons the submissions were checked against.
 */
export const SubmissionsMap = ({ submissions }) => {
  const plotted = useMemo(() => submissions.filter(hasCoords), [submissions]);

  // De-duplicate Gat polygons so a Gat with many submissions is only drawn once.
  const gatPolygons = useMemo(() => {
    const byId = new Map();

    submissions.forEach((sub) => {
      const gat = sub.gatId;
      const ring = gat?.boundary?.coordinates?.[0];
      if (!gat?._id || !ring || byId.has(gat._id)) return;

      byId.set(gat._id, {
        id: gat._id,
        gatNumber: gat.gatNumber,
        village: gat.village,
        // GeoJSON is [lng, lat], Leaflet is [lat, lng]
        positions: ring.map(([lng, lat]) => [lat, lng]),
      });
    });

    return Array.from(byId.values());
  }, [submissions]);

  const center = plotted.length > 0
    ? [plotted[0].location.latitude, plotted[0].location.longitude]
    : FALLBACK_CENTER;

  return (
    <div className="relative">
      <div className="h-[28rem] w-full overflow-hidden border-b border-gray-100 z-10 relative">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {gatPolygons.map((gat) => (
            <Polygon
              key={gat.id}
              positions={gat.positions}
              pathOptions={{ color: '#22c55e', fillColor: '#dcfce7', fillOpacity: 0.25, weight: 2 }}
            >
              <Tooltip sticky>Gat {gat.gatNumber} — {gat.village}</Tooltip>
            </Polygon>
          ))}

          {plotted.map((sub) => {
            const meta = statusMeta(sub.status);

            return (
              <CircleMarker
                key={sub._id}
                center={[sub.location.latitude, sub.location.longitude]}
                radius={8}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: meta.color,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="text-sm space-y-1">
                    <div className="font-semibold">{sub.farmerId?.name || 'Unknown farmer'}</div>
                    <div>Gat {sub.gatId?.gatNumber} — {sub.gatId?.village}</div>
                    <div className="capitalize">Declared: {sub.crop?.declaredCrop || '—'}</div>
                    <div>Outcome: <strong>{meta.label}</strong></div>
                    <div className="text-xs text-gray-500">
                      {new Date(sub.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-gray-600">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-white shadow" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        ))}

        {plotted.length < submissions.length && (
          <span className="ml-auto text-gray-400">
            {submissions.length - plotted.length} submission(s) without coordinates are not plotted
          </span>
        )}
      </div>
    </div>
  );
};
