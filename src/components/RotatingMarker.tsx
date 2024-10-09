import React, { useEffect, useRef } from "react";
import { Marker, MarkerProps } from "react-leaflet";
import L from "leaflet";

interface RotatingMarkerProps extends MarkerProps {
  rotationAngle: number;
  rotationOrigin?: string;
}

const RotatingMarker: React.FC<RotatingMarkerProps> = ({
  children,
  rotationAngle,
  rotationOrigin = "center",
  ...props
}) => {
  const markerRef = useRef<L.Marker<any>>(null);

  useEffect(() => {
    if (markerRef.current) {
      const markerElement = markerRef.current.getElement();
      if (markerElement) {
        // Find the wrapper div inside the marker element
        const wrapper = markerElement.querySelector(
          ".plane-icon-wrapper"
        ) as HTMLElement;
        if (wrapper) {
          wrapper.style.transform = `rotate(${rotationAngle}deg)`;
          wrapper.style.transformOrigin = rotationOrigin;
        }
      }
    }
  }, [rotationAngle, rotationOrigin]);

  return (
    <Marker ref={markerRef} {...props}>
      {children}
    </Marker>
  );
};

export default RotatingMarker;
