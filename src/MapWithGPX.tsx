// src/MapWithGPX.tsx
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L, {  LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GPXTrack {
  id: number;
  name: string;
  coordinates: L.LatLngTuple[];
  color: string;
}

interface MapWithGPXProps {
  gpxTracks: GPXTrack[];
}

// Fix for default icon issue with Leaflet and Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapWithGPX: React.FC<MapWithGPXProps> = ({ gpxTracks }) => {
  const [currentIndices, setCurrentIndices] = useState<{ [key: number]: number }>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  const MapEffect = () => {
    const map = useMap();

    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds);
      }
    }, [bounds, map]);

    return null;
  };

  // Update bounds when gpxTracks change
  useEffect(() => {
    if (gpxTracks.length > 0) {
      const allCoordinates = gpxTracks.flatMap((track) => track.coordinates);
      const latLngs = allCoordinates.map((coord) => L.latLng(coord[0], coord[1]));
      const newBounds = L.latLngBounds(latLngs);
      setBounds(newBounds);

      // Initialise currentIndices for new tracks
      const newIndices: { [key: number]: number } = {};
      gpxTracks.forEach((track) => {
        if (!(track.id in currentIndices)) {
          newIndices[track.id] = 0;
        } else {
          newIndices[track.id] = currentIndices[track.id];
        }
      });
      setCurrentIndices(newIndices);
    } else {
      // If no tracks, reset bounds to UK
      const ukBounds = L.latLngBounds([
        [49.959999905, -7.57216793459],
        [58.6350001085, 1.68153079591],
      ]);
      setBounds(ukBounds);
    }
  }, [gpxTracks]);

  useEffect(() => {
    if (isPlaying && gpxTracks.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setCurrentIndices((prevIndices) => {
          const newIndices = { ...prevIndices };
          let anyTrackStillPlaying = false;

          gpxTracks.forEach((track) => {
            const currentIndex = prevIndices[track.id] ?? 0;
            if (currentIndex < track.coordinates.length - 1) {
              newIndices[track.id] = currentIndex + 1;
              anyTrackStillPlaying = true;
            } else {
              newIndices[track.id] = currentIndex;
            }
          });

          if (!anyTrackStillPlaying) {
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current);
            }
            setIsPlaying(false);
          }

          return newIndices;
        });
      }, 5); // I will add a slider for the user later
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, gpxTracks]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    // Reset currentIndices
    const resetIndices: { [key: number]: number } = {};
    gpxTracks.forEach((track) => {
      resetIndices[track.id] = 0;
    });
    setCurrentIndices(resetIndices);
    setIsPlaying(false);
  };

  return (
    <div className="w-full">
      <MapContainer className="h-96 w-full rounded shadow" zoom={6} center={[54.0, -2.0]}>
        <MapEffect />
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {gpxTracks.map((track) => (
          <React.Fragment key={track.id}>
            <Polyline positions={track.coordinates} color={track.color} />
            {track.coordinates.length > 0 && (
              <Marker position={track.coordinates[currentIndices[track.id] ?? 0]}>
                <Popup>
                  <div>
                    <strong>{track.name}</strong>
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}
      </MapContainer>
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={handlePlayPause}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={handleRestart}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default MapWithGPX;
