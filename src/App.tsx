// src/App.tsx
import React, { useState } from 'react';
import MapWithGPX from './MapWithGPX';
import L from 'leaflet';
import * as toGeoJSON from '@mapbox/togeojson';
import { Feature, FeatureCollection } from 'geojson';

interface GPXTrack {
  id: number;
  name: string;
  coordinates: L.LatLngTuple[];
  color: string;
}

const App: React.FC = () => {
  const [gpxTracks, setGpxTracks] = useState<GPXTrack[]>([]);
  const [nextTrackId, setNextTrackId] = useState<number>(1);

  // Function to handle file drop
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const files = event.dataTransfer.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Only process files with .gpx extension
      if (file.name.endsWith('.gpx')) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const gpxText = e.target?.result as string;

          // Parse the GPX data
          const parser = new DOMParser();
          const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
          const geojson = toGeoJSON.gpx(gpxDoc) as FeatureCollection;

          const coordinates: L.LatLngTuple[] = [];

          (geojson.features as Feature[]).forEach((feature) => {
            if (feature.geometry.type === 'LineString') {
              (feature.geometry.coordinates as [number, number][]).forEach((coord) => {
                // Convert from [lng, lat] to [lat, lng]
                coordinates.push([coord[1], coord[0]]);
              });
            }
          });

          if (coordinates.length === 0) {
            console.error('No track points found in the GPX file.');
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
    const letters = '0123456789ABCDEF';
    let color = '#';

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
      <h1 className="text-3xl font-bold mt-8 mb-4">GPX Map Player</h1>
      <div className="w-full max-w-4xl px-4">
        <div className="mb-4 p-4 border-dashed border-2 border-gray-400 rounded bg-white text-center">
          <p className="text-gray-700">Drag and drop GPX files here to load them onto the map.</p>
        </div>
        <MapWithGPX gpxTracks={gpxTracks} />
      </div>
    </div>
  );
};

export default App;
