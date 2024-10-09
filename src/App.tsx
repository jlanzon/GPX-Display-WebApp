// src/App.tsx
import React, { useState } from "react";
import MapWithGPX from "./components/MapWithGPX";
import L from "leaflet";
import * as toGeoJSON from "@mapbox/togeojson";
import { Feature, FeatureCollection, LineString } from "geojson";
import ElevationProfile from "./components/ElevationProfile";

// shoudl maybe move these into its own tpyes folder

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

function App() {
  const [gpxTracks, setGpxTracks] = useState<GPXTrack[]>([]);
  const [nextTrackId, setNextTrackId] = useState<number>(1);
  const [currentIndices, setCurrentIndices] = useState<{
    [key: number]: number;
  }>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Function to handle file drop
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const files = event.dataTransfer.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Only process files with .gpx extension
      if (file.name.endsWith(".gpx")) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const gpxText = e.target?.result as string;

          // Parse the GPX data
          const parser = new DOMParser();
          const gpxDoc = parser.parseFromString(gpxText, "application/xml");
          const geojson = toGeoJSON.gpx(gpxDoc) as FeatureCollection;

          // Update coordinates to use the Coordinate interface
          const coordinates: Coordinate[] = [];

          (geojson.features as Feature[]).forEach((feature) => {
            if (feature.geometry.type === "LineString") {
              const lineString = feature.geometry as LineString;
              // Coordinates are in the form [lng, lat, ele?]
              const coords = lineString.coordinates as [
                number,
                number,
                number?
              ][];

              coords.forEach((coord) => {
                const [lng, lat, ele] = coord;
                coordinates.push({
                  lat: lat,
                  lng: lng,
                  ele: ele !== undefined ? ele : 0, // Default elevation to 0 if undefined
                });
              });
            }
          });

          if (coordinates.length === 0) {
            console.error("No track points found in the GPX file.");
            alert(`No track data found in the GPX file: ${file.name}`);
            return;
          }

          // Generate a random color for the track
          const color = getRandomColor();

          const newTrack: GPXTrack = {
            id: nextTrackId,
            name: file.name,
            coordinates: coordinates,
            color: color,
          };

          setGpxTracks((prevTracks) => [...prevTracks, newTrack]);
          setNextTrackId((prevId) => prevId + 1);
        };

        reader.readAsText(file);
      } else {
        alert(`Unsupported file type: ${file.name}`);
      }
    }
  };

  // Function to handle drag over
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Function to generate a random color
  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";

    // Generate color code
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
  };

  return (
    <div
      className="flex flex-col items-center min-h-screen"
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
    >
      <h1 className="text-3xl font-bold mt-8 mb-4">GPX Map Playerr</h1>
      <div className="w-full max-w-4xl px-4">
        <div className="mb-4 p-4 border-dashed border-2 border-gray-400 rounded bg-white text-center">
          <p className="text-gray-700">
            Drag and drop GPX files here to load them onto the map.
          </p>
        </div>
        <MapWithGPX
          gpxTracks={gpxTracks}
          currentIndices={currentIndices}
          setCurrentIndices={setCurrentIndices}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
        <ElevationProfile
          gpxTracks={gpxTracks}
          currentIndices={currentIndices}
        />
      </div>
    </div>
  );
}

export default App;
