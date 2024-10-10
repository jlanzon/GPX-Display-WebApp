import React, { useEffect, useState } from "react";
import MapWithGPX from "./components/MapWithGPX";
import L from "leaflet";
import * as toGeoJSON from "@mapbox/togeojson";
import { Feature, FeatureCollection, LineString } from "geojson";
import ElevationProfile from "./components/ElevationProfile";
import "./App.css"; // Import the CSS file for styling
import { GPXTrack, Coordinate } from "./types/types";

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

          // Extract track points
          const trkpts = gpxDoc.getElementsByTagName("trkpt");

          const coordinates: Coordinate[] = [];

          for (let j = 0; j < trkpts.length; j++) {
            const trkpt = trkpts[j];
            const lat = parseFloat(trkpt.getAttribute("lat") || "0");
            const lng = parseFloat(trkpt.getAttribute("lon") || "0");

            // Extract elevation
            const eleElement = trkpt.getElementsByTagName("ele")[0];
            const ele = eleElement
              ? parseFloat(eleElement.textContent || "0")
              : 0;

            // Extract time
            const timeElement = trkpt.getElementsByTagName("time")[0];
            const time = timeElement
              ? new Date(timeElement.textContent || "")
              : undefined;

            // Check for valid time
            if (!time || isNaN(time.getTime())) {
              console.warn(`Invalid time at point ${j} in file ${file.name}`);
              continue; // Skip this point if time is invalid
            }

            coordinates.push({
              lat: lat,
              lng: lng,
              ele: ele,
              time: time,
            });
          }

          if (coordinates.length === 0) {
            console.error("No valid track points found in the GPX file.");
            alert(`No valid track data found in the GPX file: ${file.name}`);
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
  // useEffect(() => {
  //   const newIndices: { [key: number]: number } = {};
  //   gpxTracks.forEach((track) => {
  //     newIndices[track.id] = -1; // Set to -1 to indicate the track hasn't started
  //   });
  //   setCurrentIndices(newIndices);
  // }, [gpxTracks]);

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
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <h1 className="navbar-brand">GPX Map Player</h1>
        {/* Add navigation links or menus here */}
      </nav>

      {/* Main Content Area with Sidebars */}
      <div className="main-content">
        {/* Left Sidebar */}
        <aside className="sidebar left-sidebar">
          {/* Add content for the left sidebar here */}
          <p>Left Sidebar</p>
        </aside>

        {/* Center Content */}
        <main className="content">
          {/* Drag and Drop Area */}
          <div
            className="drop-area"
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            <p>Drag and drop GPX files here to load them onto the map.</p>
          </div>

          {/* Map and Elevation Profile */}
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
        </main>

        {/* Right Sidebar */}
        <aside className="sidebar right-sidebar">
          <p>Right Sidebar</p>
        </aside>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} JLanzon GPX Mapping</p>
      </footer>
    </div>
  );
}

export default App;
