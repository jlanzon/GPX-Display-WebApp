// src/components/ElevationProfile.tsx
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

// Define the Coordinate and GPXTrack interfaces
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

interface ElevationProfileProps {
  gpxTracks: GPXTrack[];
  currentIndices: { [key: number]: number };
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({
  gpxTracks,
  currentIndices,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (gpxTracks.length === 0) return;

    // Prepare data
    const allData = gpxTracks.map((track) => {
      let cumulativeDistance = 0;
      const data = track.coordinates.map((coord, index, arr) => {
        if (index > 0) {
          const prev = arr[index - 1];
          const distance = calculateDistance(prev, coord);
          cumulativeDistance += distance;
        }
        return {
          distance: cumulativeDistance,
          elevation: coord.ele,
        };
      });
      return { id: track.id, name: track.name, data, color: track.color };
    });

    // Set up SVG dimensions
    const svgWidth = 800;
    const svgHeight = 400;
    const margin = { top: 20, right: 30, bottom: 30, left: 50 };

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(allData, (track) => d3.max(track.data, (d) => d.distance)) || 0,
      ])
      .range([margin.left, svgWidth - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(allData, (track) => d3.min(track.data, (d) => d.elevation)) || 0,
        d3.max(allData, (track) => d3.max(track.data, (d) => d.elevation)) || 0,
      ])
      .nice()
      .range([svgHeight - margin.bottom, margin.top]);

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    // Create axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickFormat((d) => `${d} km`);
    const yAxis = d3.axisLeft(yScale).ticks(10);

    svg
      .append("g")
      .attr("transform", `translate(0, ${svgHeight - margin.bottom})`)
      .call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

    // Create line generator
    const line = d3
      .line<{ distance: number; elevation: number }>()
      .x((d) => xScale(d.distance))
      .y((d) => yScale(d.elevation));

    // Add lines for each track
    svg
      .selectAll(".line")
      .data(allData)
      .enter()
      .append("path")
      .attr("class", "line")
      .attr("d", (track) => line(track.data))
      .attr("fill", "none")
      .attr("stroke", (track) => track.color)
      .attr("stroke-width", 2);

    // Clear previous indicators
    svg.selectAll(".current-indicator").remove();

    // Add current position indicators
    allData.forEach((track) => {
      const currentIndex = currentIndices[track.id] ?? 0;
      const currentDataPoint = track.data[currentIndex];

      if (currentDataPoint) {
        svg
          .append("line")
          .attr("class", "current-indicator")
          .attr("x1", xScale(currentDataPoint.distance))
          .attr("x2", xScale(currentDataPoint.distance))
          .attr("y1", yScale.range()[0])
          .attr("y2", yScale.range()[1])
          .attr("stroke", track.color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4");
      }
    });
  }, [gpxTracks, currentIndices]); // Correct placement of dependency array

  // Helper function to calculate distance between two coordinates
  function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371; // Earth radius in km
    const dLat = toRadians(coord2.lat - coord1.lat);
    const dLng = toRadians(coord2.lng - coord1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(coord1.lat)) *
        Math.cos(toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ElevationProfile;
