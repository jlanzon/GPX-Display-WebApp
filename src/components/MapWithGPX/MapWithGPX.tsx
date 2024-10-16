import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Popup,
  useMap,
  Marker,
} from "react-leaflet";
import planeIcon from "../../assets/plane.png";
import "./MapWithGPX.css";
import L, { LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import RotatingMarker from "./RotatingMarker";
import Slider from "@mui/material/Slider";
import { GPXTrack, CustomMarker } from "../../types/types";
import {
  calculateMagneticBearing,
  calculateBearing,
  calculateDistance,
} from "../../utils/geoutils";

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

const PlaneIcon = L.divIcon({
  className: "", // Remove default classes to avoid conflicts
  html: `<div class="plane-icon-wrapper">
           <img src="${planeIcon}" style="width:40px; height:40px;" />
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface MapWithGPXProps {
  gpxTracks: GPXTrack[];
  currentIndices: { [key: number]: number };
  setCurrentIndices: React.Dispatch<
    React.SetStateAction<{ [key: number]: number }>
  >;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  customMarkers: CustomMarker[];
  onDistanceBearingUpdate: (data: DistanceBearingInfo[]) => void;
}

interface DistanceBearingInfo {
  planeName: string;
  planeId: number;
  markerData: {
    markerName: string;
    distance: string; // in miles
    bearing: string; // in degrees
  }[];
}

const MapWithGPX: React.FC<MapWithGPXProps> = ({
  gpxTracks,
  currentIndices,
  setCurrentIndices,
  isPlaying,
  setIsPlaying,
  customMarkers,
  onDistanceBearingUpdate,
}) => {
  const intervalRef = useRef<number | null>(null);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const availableSpeeds = [0.25, 0.5, 1, 2, 4, 8];
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Default to 1x speed
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [earliestTime, setEarliestTime] = useState<Date | null>(null);
  const [latestTime, setLatestTime] = useState<Date | null>(null);

  const INTERVAL_DURATION = 100; // milliseconds

  const MapEffect = () => {
    const map = useMap();

    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds);
      }
    }, [bounds, map]);

    return null;
  };

  const updateCurrentIndices = useCallback(
    (newTime: Date) => {
      const newIndices: { [key: number]: number } = {};

      gpxTracks.forEach((track) => {
        let index = -1;
        for (let i = 0; i < track.coordinates.length; i++) {
          const coordTime = track.coordinates[i].time.getTime();
          if (coordTime <= newTime.getTime()) {
            index = i;
          } else {
            break;
          }
        }
        newIndices[track.id] = index;
      });

      setCurrentIndices(newIndices);
    },
    [gpxTracks, setCurrentIndices]
  );

  // Update currentIndices whenever currentTime changes
  useEffect(() => {
    if (currentTime) {
      updateCurrentIndices(currentTime);
    }
  }, [currentTime, updateCurrentIndices]);

  useEffect(() => {
    if (gpxTracks.length > 0) {
      // Flatten all times from all tracks
      const allTimes = gpxTracks.flatMap((track) =>
        track.coordinates.map((coord) => coord.time.getTime())
      );

      // Determine earliest and latest times
      const minTime = new Date(Math.min(...allTimes));
      const maxTime = new Date(Math.max(...allTimes));

      setEarliestTime(minTime);
      setLatestTime(maxTime);

      // Initialize currentTime if it's null
      if (!currentTime) {
        setCurrentTime(minTime);
      }
    } else {
      setEarliestTime(null);
      setLatestTime(null);
      setCurrentTime(null);
    }
  }, [gpxTracks, currentTime]);

  useEffect(() => {
    if (gpxTracks.length > 0) {
      const allCoordinates = gpxTracks.flatMap((track) => track.coordinates);
      const latLngs = allCoordinates.map((coord) =>
        L.latLng(coord.lat, coord.lng)
      );
      const newBounds = L.latLngBounds(latLngs);
      setBounds(newBounds);
    } else if (customMarkers.length > 0) {
      // If no tracks but there are markers, fit bounds to markers
      const latLngs = customMarkers.map((marker) =>
        L.latLng(marker.lat, marker.lng)
      );
      const newBounds = L.latLngBounds(latLngs);
      setBounds(newBounds);
    } else {
      // If no tracks or markers, reset bounds to default location
      const defaultBounds = L.latLngBounds([
        [49.959999905, -7.57216793459], // Southwest coordinates
        [58.6350001085, 1.68153079591], // Northeast coordinates
      ]);
      setBounds(defaultBounds);
    }
  }, [gpxTracks, customMarkers]);

  useEffect(() => {
    if (!isPlaying || !earliestTime || !latestTime) return;

    intervalRef.current = setInterval(() => {
      setCurrentTime((prevTime) => {
        if (!prevTime) return earliestTime;

        const timeIncrement = INTERVAL_DURATION * playbackSpeed * 10; // Adjust multiplier as needed
        const newTime = new Date(prevTime.getTime() + timeIncrement);

        if (newTime > latestTime) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          return latestTime;
        }

        return newTime;
      });
    }, INTERVAL_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isPlaying,
    playbackSpeed,
    earliestTime,
    latestTime,
    setIsPlaying,
    updateCurrentIndices,
  ]);

  useEffect(() => {
    // Calculate and update distance and bearing information
    const distanceBearingData: DistanceBearingInfo[] = [];

    gpxTracks.forEach((track) => {
      const currentIndex = currentIndices[track.id];

      if (
        currentIndex !== undefined &&
        currentIndex >= 0 &&
        currentIndex < track.coordinates.length
      ) {
        const positionCoord = track.coordinates[currentIndex];

        // Calculate distance and magnetic bearing from custom markers
        const markerData = customMarkers.map((marker) => {
          const distance = calculateDistance(
            marker.lat,
            marker.lng,
            positionCoord.lat,
            positionCoord.lng
          );

          // Altitude in feet (elevation is in meters, so convert it)
          const altitudeFeet = positionCoord.ele * 3.28084;

          const bearing = calculateMagneticBearing(
            marker.lat,
            marker.lng,
            positionCoord.lat,
            positionCoord.lng,
            altitudeFeet // Altitude in feet
          );

          return {
            markerName: marker.name,
            distance: distance.toFixed(2), // in miles
            bearing: bearing.toFixed(2), // in degrees
          };
        });

        distanceBearingData.push({
          planeName: track.name,
          planeId: track.id,
          markerData,
        });
      }
    });

    // Pass the data back to GPXPage
    onDistanceBearingUpdate(distanceBearingData);
  }, [
    currentIndices,
    customMarkers,
    gpxTracks,
    onDistanceBearingUpdate,
    currentTime,
  ]);

  const handlePlayPause = () => {
    if (!isPlaying && currentTime && currentTime >= latestTime!) {
      setCurrentTime(earliestTime);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    setCurrentTime(earliestTime);
    setIsPlaying(false);
  };

  const handleSliderChange = (event: any, newValue: number | number[]) => {
    const newTime = new Date(newValue as number);
    setCurrentTime(newTime);
    setIsPlaying(false); // Pause playback when slider is moved
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
          const trackStartTime = track.coordinates[0].time;
          const trackEndTime =
            track.coordinates[track.coordinates.length - 1].time;

          const currentIndex = currentIndices[track.id];
          let polyline = null;
          let rotatingMarker = null;

          // Render the polyline
          const polylinePositions = track.coordinates.map(
            (coord) => [coord.lat, coord.lng] as L.LatLngTuple
          );

          polyline = (
            <Polyline positions={polylinePositions} color={track.color} />
          );

          // Conditionally render the RotatingMarker (plane)
          if (
            currentIndex !== undefined &&
            currentIndex >= 0 &&
            currentIndex < track.coordinates.length
          ) {
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
            const elevationInFeet = positionCoord.ele * 3.28084;

            rotatingMarker = (
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
                    Elevation: {elevationInFeet.toFixed(2)} ft
                    <br />
                    Time: {positionCoord.time.toISOString()}
                  </div>
                </Popup>
              </RotatingMarker>
            );
          }

          return (
            <div key={track.id}>
              {polyline}
              {rotatingMarker}
            </div>
          );
        })}

        {/* Render custom markers */}
        {customMarkers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div>
                <strong>{marker.name}</strong>
                <br />
                Lat: {marker.lat.toFixed(4)}
                <br />
                Lng: {marker.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        ))}
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
        {/* Speed Control Buttons */}
        {availableSpeeds.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={`px-4 py-2 rounded focus:outline-none ${
              playbackSpeed === speed
                ? "bg-green-500 text-white"
                : "bg-gray-300 text-gray-800 hover:bg-gray-400"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>
      {/* Progress Bar */}
      {earliestTime && latestTime && (
        <Slider
          value={currentTime ? currentTime.getTime() : earliestTime.getTime()}
          min={earliestTime.getTime()}
          max={latestTime.getTime()}
          onChange={handleSliderChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) =>
            new Date(value).toISOString().substr(11, 8)
          } // Format as HH:MM:SS
        />
      )}
    </div>
  );
};

export default MapWithGPX;
