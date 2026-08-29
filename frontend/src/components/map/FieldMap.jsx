import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { GatPolygon } from './GatPolygon';
import { LocationMarker } from './LocationMarker';
import { demoData } from '../../constants/demoData';

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

export const FieldMap = ({ location, setLocation, gat }) => {
  let positions = demoData.gatPolygon;
  if (gat && gat.boundary && gat.boundary.coordinates && gat.boundary.coordinates[0]) {
    // GeoJSON is [lng, lat], Leaflet is [lat, lng]
    positions = gat.boundary.coordinates[0].map(coord => [coord[1], coord[0]]);
  }

  let defaultCenter = positions[0];
  if (gat && gat.center && gat.center.latitude && gat.center.longitude) {
    defaultCenter = [gat.center.latitude, gat.center.longitude];
  }

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 z-10 relative">
      <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
        <MapUpdater center={defaultCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <GatPolygon positions={positions} />
        <LocationMarker location={location} setLocation={setLocation} />
      </MapContainer>
    </div>
  );
};
