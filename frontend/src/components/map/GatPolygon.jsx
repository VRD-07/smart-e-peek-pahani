import { Polygon } from 'react-leaflet';

export const GatPolygon = ({ positions }) => {
  const polygonOptions = {
    color: '#22c55e',
    fillColor: '#dcfce7',
    fillOpacity: 0.4,
    weight: 2
  };

  return <Polygon pathOptions={polygonOptions} positions={positions} />;
};
