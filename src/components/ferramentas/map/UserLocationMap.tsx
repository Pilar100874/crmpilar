import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Profile } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface UserLocationMapProps {
  users: Profile[];
  selectedUserId?: string | null;
  className?: string;
}

export function UserLocationMap({ users, selectedUserId, className }: UserLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Filter users with location
  const usersWithLocation = users.filter(
    (user) => user.last_location_lat && user.last_location_lng
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] = [-23.5505, -46.6333]; // São Paulo
    const map = L.map(mapRef.current).setView(defaultCenter, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when users change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    usersWithLocation.forEach((user) => {
      if (!user.last_location_lat || !user.last_location_lng) return;

      const isSelected = user.id === selectedUserId;
      const color = isSelected ? "hsl(221, 83%, 53%)" : "hsl(215, 14%, 45%)";

      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      });

      const marker = L.marker([user.last_location_lat, user.last_location_lng], {
        icon: customIcon,
      }).addTo(mapInstanceRef.current!);

      const lastUpdate = user.last_location_updated_at
        ? formatDistanceToNow(new Date(user.last_location_updated_at), {
            addSuffix: true,
            locale: ptBR,
          })
        : "Nunca";

      marker.bindPopup(`
        <div style="min-width: 150px;">
          <p style="font-weight: 600; margin: 0 0 4px 0;">${user.full_name}</p>
          <p style="font-size: 0.875rem; color: #666; margin: 0 0 4px 0;">${user.email}</p>
          <p style="font-size: 0.75rem; color: #999; margin: 0;">Atualizado ${lastUpdate}</p>
        </div>
      `);

      markersRef.current.push(marker);
    });
  }, [usersWithLocation, selectedUserId, isMapReady]);

  // Pan to selected user
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || !selectedUserId) return;

    const user = usersWithLocation.find((u) => u.id === selectedUserId);
    if (user?.last_location_lat && user?.last_location_lng) {
      mapInstanceRef.current.setView([user.last_location_lat, user.last_location_lng], 15, {
        animate: true,
      });
    }
  }, [selectedUserId, usersWithLocation, isMapReady]);

  // Fit bounds to show all users
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || usersWithLocation.length === 0 || selectedUserId) return;

    const bounds = L.latLngBounds(
      usersWithLocation.map((u) => [u.last_location_lat!, u.last_location_lng!])
    );

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [usersWithLocation, isMapReady, selectedUserId]);

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem", minHeight: "300px" }}
    />
  );
}
