import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/MapWithGPX.tsx
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Fix for default icon issue with Leaflet and Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;
const MapWithGPX = ({ gpxTracks }) => {
    const [currentIndices, setCurrentIndices] = useState({});
    const [isPlaying, setIsPlaying] = useState(false);
    const intervalRef = useRef(null);
    const [bounds, setBounds] = useState(null);
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
            const newIndices = {};
            gpxTracks.forEach((track) => {
                if (!(track.id in currentIndices)) {
                    newIndices[track.id] = 0;
                }
                else {
                    newIndices[track.id] = currentIndices[track.id];
                }
            });
            setCurrentIndices(newIndices);
        }
        else {
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
                        }
                        else {
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
        }
        else if (intervalRef.current !== null) {
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
        const resetIndices = {};
        gpxTracks.forEach((track) => {
            resetIndices[track.id] = 0;
        });
        setCurrentIndices(resetIndices);
        setIsPlaying(false);
    };
    return (_jsxs("div", { className: "w-full", children: [_jsxs(MapContainer, { className: "h-96 w-full rounded shadow", zoom: 6, center: [54.0, -2.0], children: [_jsx(MapEffect, {}), _jsx(TileLayer, { attribution: '\u00A9 <a href="https://openstreetmap.org">OpenStreetMap</a> contributors', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' }), gpxTracks.map((track) => (_jsxs(React.Fragment, { children: [_jsx(Polyline, { positions: track.coordinates, color: track.color }), track.coordinates.length > 0 && (_jsx(Marker, { position: track.coordinates[currentIndices[track.id] ?? 0], children: _jsx(Popup, { children: _jsx("div", { children: _jsx("strong", { children: track.name }) }) }) }))] }, track.id)))] }), _jsxs("div", { className: "flex justify-center mt-4 space-x-4", children: [_jsx("button", { onClick: handlePlayPause, className: "px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none", children: isPlaying ? 'Pause' : 'Play' }), _jsx("button", { onClick: handleRestart, className: "px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none", children: "Restart" })] })] }));
};
export default MapWithGPX;
