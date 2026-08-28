import L from "leaflet";

export function createPinIcon() {
  return L.divIcon({
    className: "",
    html: `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0Z" fill="#C23B22" stroke="#332B22" stroke-width="2"/>
        <circle cx="16" cy="16" r="7" fill="#EFE6CE" stroke="#332B22" stroke-width="1.5"/>
      </svg>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}