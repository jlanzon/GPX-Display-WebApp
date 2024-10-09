// src/MapWithGPX.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import planeIcon from "../assets/plane.png";
import "./MapWithGPX.css";

import L, { LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";

import Slider from "@mui/material/Slider";
import RotatingMarker from "./RotatingMarker";

// Define the Coordinate interface
interface Coordinate {
  lat: number;
  lng: number;
  ele: number;
}

interface GPXTrack {
  id: number;
  name: string;
  coordinates: Coordinate[];
  color: string;
}

interface MapWithGPXProps {
  gpxTracks: GPXTrack[];
  currentIndices: { [key: number]: number };
  setCurrentIndices: React.Dispatch<
    React.SetStateAction<{ [key: number]: number }>
  >;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

// Fix for default icon issue with Leaflet and Vite
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 42],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Function to calculate bearing
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;

  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (toDegrees(brng) + 360) % 360; // Normalize to 0-360 degrees
}

const PlaneIcon = L.divIcon({
  className: "", // Remove default classes to avoid conflicts
  html: `<div class="plane-icon-wrapper">
           <img src="${planeIcon}" style="width:40px; height:40px;" />
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20], // Adjust as needed
});

const MapWithGPX: React.FC<MapWithGPXProps> = ({
  gpxTracks,
  currentIndices,
  setCurrentIndices,
  isPlaying,
  setIsPlaying,
}) => {
  const intervalRef = useRef<number | null>(null);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [sliderValue, setSliderValue] = useState(5);

  const MapEffect = () => {
    const map = useMap();

    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds);
      }
    }, [bounds, map]);

    return null;
  };

  useEffect(() => {
    if (gpxTracks.length > 0) {
      const allCoordinates = gpxTracks.flatMap((track) => track.coordinates);
      const latLngs = allCoordinates.map((coord) =>
        L.latLng(coord.lat, coord.lng)
      );
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
      }, sliderValue);
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, gpxTracks, sliderValue]);

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

  const handleSliderChange = (e: any, newValue: any) => {
    setSliderValue(newValue);
  };

  return (
    <div className="w-full">
      <MapContainer
        className="h-96 w-full rounded shadow-2xl"
        zoom={6}
        center={[54.0, -2.0]}
      >
        <MapEffect />
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {gpxTracks.map((track) => {
          const currentIndex = currentIndices[track.id] ?? 0;
          const positionCoord = track.coordinates[currentIndex];
          const position: L.LatLngTuple = [
            positionCoord.lat,
            positionCoord.lng,
          ];

          let rotationAngle = 0;

          if (currentIndex > 0) {
            const prevPositionCoord = track.coordinates[currentIndex - 1];
            rotationAngle = calculateBearing(
              prevPositionCoord.lat,
              prevPositionCoord.lng,
              positionCoord.lat,
              positionCoord.lng
            );
          }

          const elevation = positionCoord.ele;

          return (
            <div key={track.id}>
              <Polyline
                positions={track.coordinates.map(
                  (coord) => [coord.lat, coord.lng] as L.LatLngTuple
                )}
                color={track.color}
              />
              {track.coordinates.length > 0 && (
                <RotatingMarker
                  position={position}
                  icon={PlaneIcon}
                  rotationAngle={rotationAngle}
                  rotationOrigin="center"
                >
                  <Popup>
                    <div>
                      <strong>{track.name}</strong>
                      <br />
                      Elevation: {elevation.toFixed(2)} m
                    </div>
                  </Popup>
                </RotatingMarker>
              )}
            </div>
          );
        })}
      </MapContainer>
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={handlePlayPause}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={handleRestart}
          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
        >
          Restart
        </button>
      </div>
      <Slider
        defaultValue={5}
        aria-label="speed slider"
        value={sliderValue}
        onChange={handleSliderChange}
        marks
        min={0}
        max={100}
        valueLabelDisplay="auto"
      />
    </div>
  );
};

export default MapWithGPX;
