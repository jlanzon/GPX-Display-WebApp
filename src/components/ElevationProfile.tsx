import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { NumberValue } from "d3-scale";
import { Coordinate, GPXTrack } from "../types/types"; // Ensure this path is correct

interface TrackDataPoint {
  time: Date;
  elevation: number;
}

interface AllDataEntry {
  id: number;
  name: string;
  data: TrackDataPoint[];
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
    const allData: AllDataEntry[] = gpxTracks.map((track) => {
      const data = track.coordinates.map((coord: Coordinate) => ({
        time: coord.time,
        elevation: coord.ele * 3.28084, // Convert to feet
      }));
      return { id: track.id, name: track.name, data, color: track.color };
    });

    // Get SVG dimensions
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const { width: svgWidth, height: svgHeight } =
      svgElement.getBoundingClientRect();

    const margin = { top: 20, right: 30, bottom: 30, left: 50 };

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Flatten arrays and compute extents
    const xTimes: Date[] = allData.flatMap((track) =>
      track.data.map((d) => d.time)
    );
    const yElevations: number[] = allData.flatMap((track) =>
      track.data.map((d) => d.elevation)
    );

    const xExtent = d3.extent<Date>(xTimes) as [Date, Date];
    const yExtent = d3.extent<number>(yElevations) as [number, number];

    // Create scales
    const xScale = d3
      .scaleTime<number, number>()
      .domain([xExtent[0] || new Date(), xExtent[1] || new Date()])
      .range([margin.left, svgWidth - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] || 0, yExtent[1] || 0])
      .nice()
      .range([svgHeight - margin.bottom, margin.top]);

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%");

    // Create axes
    const timeFormat = (
      domainValue: Date | NumberValue,
      index: number
    ): string => {
      const date =
        domainValue instanceof Date
          ? domainValue
          : new Date(domainValue.valueOf());
      return d3.utcFormat("%H:%M:%S")(date);
    };

    const xAxis: d3.Axis<Date | NumberValue> = d3
      .axisBottom<Date | NumberValue>(xScale)
      .ticks(10)
      .tickFormat(timeFormat);

    const yAxis = d3.axisLeft(yScale).ticks(10);

    svg
      .append("g")
      .attr("transform", `translate(0, ${svgHeight - margin.bottom})`)
      .call(xAxis);

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

    // Add axis labels
    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", svgWidth / 2)
      .attr("y", svgHeight - margin.bottom / 2 + 15)
      .attr("text-anchor", "middle")
      .text("Time (UTC)");

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -svgHeight / 2)
      .attr("y", margin.left / 2 - 10)
      .attr("text-anchor", "middle")
      .text("Elevation (ft)");

    // Create line generator
    const lineGenerator = d3
      .line<TrackDataPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.elevation));

    // Add lines for each track
    svg
      .selectAll(".line")
      .data(allData)
      .enter()
      .append("path")
      .attr("class", "line")
      .attr("d", (track) => lineGenerator(track.data))
      .attr("fill", "none")
      .attr("stroke", (track) => track.color)
      .attr("stroke-width", 2);

    // Add current position indicators
    allData.forEach((track) => {
      const currentIndex = currentIndices[track.id] ?? 0;
      const currentDataPoint = track.data[currentIndex];

      if (currentDataPoint) {
        svg
          .append("line")
          .attr("class", "current-indicator")
          .attr("x1", xScale(currentDataPoint.time))
          .attr("x2", xScale(currentDataPoint.time))
          .attr("y1", yScale.range()[0])
          .attr("y2", yScale.range()[1])
          .attr("stroke", track.color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4");
      }
    });
  }, [gpxTracks, currentIndices]);

  return (
    <div style={{ width: "70vw", height: "50vh" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
    </div>
  );
};

export default ElevationProfile;
