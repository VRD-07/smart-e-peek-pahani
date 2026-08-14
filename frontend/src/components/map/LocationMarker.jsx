import { useState, useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const LocationMarker = ({ location, setLocation }) => {
  const map = useMap();

  const pos = location && location.latitude ? [location.latitude, location.longitude] : location;

  useEffect(() => {
    if (pos) {
      map.flyTo(pos, map.getZoom());
    }
  }, [pos, map]);

  if (!pos) return null;

  return (
    <Marker position={pos}>
      <Popup>Your current location</Popup>
    </Marker>
  );
};
