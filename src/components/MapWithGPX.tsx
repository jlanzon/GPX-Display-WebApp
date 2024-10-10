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
import RotatingMarker from "./RotatingMarker";
import Slider from "@mui/material/Slider";
import { GPXTrack } from "../types/types";

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

interface MapWithGPXProps {
  gpxTracks: GPXTrack[];
  currentIndices: { [key: number]: number };
  setCurrentIndices: React.Dispatch<
    React.SetStateAction<{ [key: number]: number }>
  >;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

const MapWithGPX: React.FC<MapWithGPXProps> = ({
  gpxTracks,
  currentIndices,
  setCurrentIndices,
  isPlaying,
  setIsPlaying,
}) => {
  const intervalRef = useRef<number | null>(null);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [progress, setProgress] = useState(0);
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

  const updateCurrentIndices = (newTime: Date) => {
    console.log(`Current Time: ${newTime.toISOString()}`);
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
      console.log(`Track ID: ${track.id}, Current Index: ${index}`);
      newIndices[track.id] = index;
    });

    setCurrentIndices(newIndices);

    // Update progress based on time
    if (earliestTime && latestTime) {
      const totalDuration = latestTime.getTime() - earliestTime.getTime();
      const elapsed = newTime.getTime() - earliestTime.getTime();
      const progressPercentage = (elapsed / totalDuration) * 100;
      setProgress(progressPercentage);
    }
  };

  useEffect(() => {
    if (gpxTracks.length === 0) return;

    // Flatten all times from all tracks
    const allTimes = gpxTracks.flatMap((track) =>
      track.coordinates.map((coord) => coord.time.getTime())
    );

    // Determine earliest and latest times
    const minTime = new Date(Math.min(...allTimes));
    const maxTime = new Date(Math.max(...allTimes));

    setEarliestTime(minTime);
    setLatestTime(maxTime);
    setCurrentTime(minTime);
  }, [gpxTracks]);

  // Update currentIndices whenever currentTime changes
  useEffect(() => {
    if (currentTime) {
      updateCurrentIndices(currentTime);
    }
  }, [currentTime]);

  useEffect(() => {
    if (gpxTracks.length > 0) {
      const displayedTracks = gpxTracks.filter((track) => {
        const trackStartTime = track.coordinates[0].time;
        return currentTime && currentTime >= trackStartTime;
      });

      if (displayedTracks.length > 0) {
        const allCoordinates = displayedTracks.flatMap(
          (track) => track.coordinates
        );
        const latLngs = allCoordinates.map((coord) =>
          L.latLng(coord.lat, coord.lng)
        );
        const newBounds = L.latLngBounds(latLngs);
        setBounds(newBounds);
      } else {
        // No tracks are currently being displayed
        // Optionally, you could set bounds to some default area
        const defaultBounds = L.latLngBounds([
          [49.959999905, -7.57216793459],
          [58.6350001085, 1.68153079591],
        ]);
        setBounds(defaultBounds);
      }
    } else {
      // If no tracks, reset bounds to a default area
      const defaultBounds = L.latLngBounds([
        [49.959999905, -7.57216793459],
        [58.6350001085, 1.68153079591],
      ]);
      setBounds(defaultBounds);
    }
  }, [gpxTracks, currentTime]);

  useEffect(() => {
    if (!isPlaying || !earliestTime || !latestTime) return;

    intervalRef.current = window.setInterval(() => {
      setCurrentTime((prevTime) => {
        if (!prevTime) return null;

        const timeIncrement = INTERVAL_DURATION * playbackSpeed * 10; // Adjust multiplier as needed
        const newTime = new Date(prevTime.getTime() + timeIncrement);

        if (newTime > latestTime) {
          clearInterval(intervalRef.current!);
          setIsPlaying(false);
          return latestTime;
        }

        return newTime;
      });
    }, INTERVAL_DURATION);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, earliestTime, latestTime]);

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

          // Only render the polyline if currentTime has reached the track's start time
          if (currentTime && currentTime >= trackStartTime) {
            // Render the polyline
            const polylinePositions = track.coordinates.map(
              (coord) => [coord.lat, coord.lng] as L.LatLngTuple
            );

            polyline = (
              <Polyline positions={polylinePositions} color={track.color} />
            );
          }

          // Conditionally render the RotatingMarker (plane)
          if (
            currentIndex !== undefined &&
            currentIndex >= 0 &&
            currentIndex < track.coordinates.length
          ) {
            const positionCoord = track.coordinates[currentIndex];

            // Only render the plane if the current time is within the track's time range
            if (
              currentTime &&
              currentTime >= trackStartTime &&
              currentTime <= trackEndTime
            ) {
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
          }

          return (
            <div key={track.id}>
              {polyline}
              {rotatingMarker}
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
      <Slider
        value={
          currentTime ? currentTime.getTime() : earliestTime?.getTime() || 0
        }
        min={earliestTime?.getTime() || 0}
        max={latestTime?.getTime() || 1000}
        onChange={handleSliderChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) =>
          new Date(value).toISOString().substr(11, 8)
        } // Format as HH:MM:SS
      />
    </div>
  );
};

export default MapWithGPX;
