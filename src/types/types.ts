export interface Coordinate {
  lat: number;
  lng: number;
  ele: number;
  time: Date;
}
export interface GPXTrack {
  id: number;
  name: string;
  coordinates: Coordinate[];
  color: string;
}

export interface CustomMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
}
