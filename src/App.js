import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/App.tsx
import { useState } from 'react';
import MapWithGPX from './MapWithGPX';
import * as toGeoJSON from '@mapbox/togeojson';
const App = () => {
    const [gpxTracks, setGpxTracks] = useState([]);
    const [nextTrackId, setNextTrackId] = useState(1);
    // Function to handle file drop
    const handleFileDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Only process files with .gpx extension
            if (file.name.endsWith('.gpx')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const gpxText = e.target?.result;
                    // Parse the GPX data
                    const parser = new DOMParser();
                    const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
                    const geojson = toGeoJSON.gpx(gpxDoc);
                    const coordinates = [];
                    geojson.features.forEach((feature) => {
                        if (feature.geometry.type === 'LineString') {
                            feature.geometry.coordinates.forEach((coord) => {
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
                    const newTrack = {
                        id: nextTrackId,
                        name: file.name,
                        coordinates: coordinates,
                        color: color,
                    };
                    setGpxTracks((prevTracks) => [...prevTracks, newTrack]);
                    setNextTrackId((prevId) => prevId + 1);
                };
                reader.readAsText(file);
            }
            else {
                alert(`Unsupported file type: ${file.name}`);
            }
        }
    };
    // Function to handle drag over
    const handleDragOver = (event) => {
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
    return (_jsxs("div", { className: "flex flex-col items-center min-h-screen", onDrop: handleFileDrop, onDragOver: handleDragOver, children: [_jsx("h1", { className: "text-3xl font-bold mt-8 mb-4", children: "GPX Map Player" }), _jsxs("div", { className: "w-full max-w-4xl px-4", children: [_jsx("div", { className: "mb-4 p-4 border-dashed border-2 border-gray-400 rounded bg-white text-center", children: _jsx("p", { className: "text-gray-700", children: "Drag and drop GPX files here to load them onto the map." }) }), _jsx(MapWithGPX, { gpxTracks: gpxTracks })] })] }));
};
export default App;
