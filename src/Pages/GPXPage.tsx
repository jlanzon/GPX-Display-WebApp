import React, { useEffect, useState, useRef } from "react";
import MapWithGPX from "../components/MapWithGPX/MapWithGPX";
import ElevationProfile from "../components/ElevationProfile/ElevationProfile";
import "../App.css";
import { GPXTrack, Coordinate, CustomMarker } from "../types/types";
import Layout from "../components/Layout/Layouts";

interface DistanceBearingInfo {
  planeName: string;
  planeId: number;
  markerData: {
    markerName: string;
    distance: string; // in miles
    bearing: string; // in degrees
  }[];
}

function GPXPage() {
  const [gpxTracks, setGpxTracks] = useState<GPXTrack[]>([]);
  const [nextTrackId, setNextTrackId] = useState<number>(1);
  const [currentIndices, setCurrentIndices] = useState<{
    [key: number]: number;
  }>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The states for custom markers
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  const [markerName, setMarkerName] = useState<string>("");
  const [markerLat, setMarkerLat] = useState<string>("");
  const [markerLng, setMarkerLng] = useState<string>("");

  const [distanceBearingData, setDistanceBearingData] = useState<
    DistanceBearingInfo[]
  >([]);

  const processFiles = (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.name.endsWith(".gpx")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const gpxText = e.target?.result as string;
          const parser = new DOMParser();
          const gpxDoc = parser.parseFromString(gpxText, "application/xml");
          const trkpts = gpxDoc.getElementsByTagName("trkpt");

          const coordinates: Coordinate[] = [];

          for (let j = 0; j < trkpts.length; j++) {
            const trkpt = trkpts[j];
            const lat = parseFloat(trkpt.getAttribute("lat") || "0");
            const lng = parseFloat(trkpt.getAttribute("lon") || "0");
            const eleElement = trkpt.getElementsByTagName("ele")[0];
            const ele = eleElement
              ? parseFloat(eleElement.textContent || "0")
              : 0;
            const timeElement = trkpt.getElementsByTagName("time")[0];
            const time = timeElement
              ? new Date(timeElement.textContent || "")
              : undefined;
            if (!time || isNaN(time.getTime())) {
              console.warn(`Invalid time at point ${j} in file ${file.name}`);
              continue;
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

  const handleAddBullsEye = () => {
    const bullsEyeMarker: CustomMarker = {
      id: Date.now(),
      name: "BullsEye",
      lat: 55.873529,
      lng: -1.782049,
    };
    setCustomMarkers((prevMarkers) => [...prevMarkers, bullsEyeMarker]);
  };

  // Function to handle file drop
  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    processFiles(files);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Right Sidebar Content
  const rightSidebarContent = (
    <div className="distance-bearing-info">
      <h2 className="text-lg font-semibold mb-2">
        Distance and Magnetic Bearing
      </h2>
      {distanceBearingData.length > 0 ? (
        distanceBearingData.map((planeInfo) => (
          <div key={planeInfo.planeId} className="mb-4">
            <h3 className="font-semibold">{planeInfo.planeName}</h3>
            <ul className="ml-4 list-disc">
              {planeInfo.markerData.map((info, index) => (
                <li key={index}>
                  From {info.markerName}: {info.distance} miles, Bearing:{" "}
                  {info.bearing}°
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p>No distance and bearing information available.</p>
      )}
    </div>
  );

  // Left Sidebar Content
  const handleAddMarker = () => {
    if (markerName && markerLat && markerLng) {
      const lat = parseFloat(markerLat);
      const lng = parseFloat(markerLng);
      if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid latitude and longitude values.");
        return;
      }
      const newMarker: CustomMarker = {
        id: Date.now(),
        name: markerName,
        lat,
        lng,
      };
      setCustomMarkers((prevMarkers) => [...prevMarkers, newMarker]);
      setMarkerName("");
      setMarkerLat("");
      setMarkerLng("");
    } else {
      alert("What am I surposed to place onto the map??");
    }
  };

  const leftSidebarContent = (
    <div className="marker-form">
      <h2 className="text-lg font-semibold mb-2">Add Marker</h2>
      <div className="mb-2">
        <label className="block text-sm font-medium">Name</label>
        <input
          type="text"
          value={markerName}
          onChange={(e) => setMarkerName(e.target.value)}
          className="mt-1 block w-full p-1 border border-gray-300 rounded"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium">Latitude</label>
        <input
          type="text"
          value={markerLat}
          onChange={(e) => setMarkerLat(e.target.value)}
          className="mt-1 block w-full p-1 border border-gray-300 rounded"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium">Longitude</label>
        <input
          type="text"
          value={markerLng}
          onChange={(e) => setMarkerLng(e.target.value)}
          className="mt-1 block w-full p-1 border border-gray-300 rounded"
        />
      </div>
      <button
        onClick={handleAddMarker}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Add Marker
      </button>
      <button
        onClick={handleAddBullsEye}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
      >
        Add TEST BullsEye Marker
      </button>
      <h2 className="text-lg font-semibold mt-4 mb-2">Markers</h2>
      <ul>
        {customMarkers.map((marker) => (
          <li key={marker.id}>
            {marker.name} ({marker.lat.toFixed(4)}, {marker.lng.toFixed(4)})
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Layout leftSidebar={leftSidebarContent} rightSidebar={rightSidebarContent}>
      <div
        className="drop-area border-dashed border-2 border-gray-400 p-4 mb-4"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <p className="mb-2">
          Drag and drop GPX files here to load them onto the map.
        </p>
        <div className="file-upload">
          <button
            className="upload-button bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload GPX Files
          </button>
          <input
            type="file"
            accept=".gpx"
            multiple
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
        </div>
        <div className="text-red-600 mt-2">ONLY upload 1 file at a time!</div>
      </div>
      <MapWithGPX
        gpxTracks={gpxTracks}
        currentIndices={currentIndices}
        setCurrentIndices={setCurrentIndices}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        customMarkers={customMarkers}
        onDistanceBearingUpdate={setDistanceBearingData}
      />
      <ElevationProfile gpxTracks={gpxTracks} currentIndices={currentIndices} />
    </Layout>
  );
}

export default GPXPage;
