(function () {
  let googleMapsPromise = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getSafetyTone = (score) => {
    if (score >= 4.5) {
      return "success";
    }
    if (score >= 4.0) {
      return "warning";
    }
    return "danger";
  };

  const getSafetyLabel = (score) => {
    if (score >= 4.6) {
      return "Excellent Food Safety";
    }
    if (score >= 4.2) {
      return "Trusted Food Safety";
    }
    return "Safety Needs Attention";
  };

  const formatMiles = (distance) => `${distance.toFixed(1)} mi`;
  const formatKm = (distance) => `${distance.toFixed(1)} km`;

  const getPriorityLabel = (value) => {
    if (value < 34) {
      return "Low";
    }
    if (value < 67) {
      return "Medium";
    }
    return "High";
  };

  const getPriorityDescription = (value) => {
    const label = getPriorityLabel(value);
    if (label === "Low") {
      return "Food safety has lighter influence while rating and convenience lead recommendations.";
    }
    if (label === "Medium") {
      return "Food safety is balanced with other factors in recommendations.";
    }
    return "Food safety strongly influences the ranking before price and walking distance.";
  };

  const priceToValue = (priceLevel) => priceLevel.length;
  const valueToPrice = (value) => "$".repeat(clamp(Math.round(value), 1, 4));

  const haversineKm = (from, to) => {
    const [lng1, lat1] = from;
    const [lng2, lat2] = to;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const getRestaurantById = (id) =>
    window.SafeBiteData.restaurants.find((restaurant) => restaurant.id === id);

  const getRouteById = (id) => window.SafeBiteData.routes.find((route) => route.id === id);

  const getRouteStops = (route) => route.stops.map((restaurantId) => getRestaurantById(restaurantId));

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[character];
    });

  const calculateItinerarySummary = (restaurantIds) => {
    const stops = restaurantIds.map((restaurantId) => getRestaurantById(restaurantId)).filter(Boolean);
    const totalDistance = stops.reduce((distance, stop, index) => {
      if (index === 0) {
        return distance;
      }
      return distance + haversineKm(stops[index - 1].coordinates, stop.coordinates);
    }, 0);
    const segmentCount = Math.max(stops.length - 1, 0);
    const totalWalkingMinutes = segmentCount === 0 ? 0 : Math.round(totalDistance * 14 + segmentCount * 2);
    const averagePriceValue =
      stops.length === 0
        ? 2
        : stops.reduce((total, stop) => total + priceToValue(stop.priceLevel), 0) / stops.length;

    return {
      stops,
      totalDistance,
      totalWalkingMinutes,
      priceLevel: valueToPrice(averagePriceValue),
      segmentTimes: stops.slice(1).map((stop, index) => {
        const previousStop = stops[index];
        const segmentDistance = haversineKm(previousStop.coordinates, stop.coordinates);
        return `${Math.max(4, Math.round(segmentDistance * 14))} mins walk`;
      }),
    };
  };

  const formatDurationClock = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes.toString().padStart(2, "0")}m`;
  };

  const createMapFallback = (container, message) => {
    container.classList.add("is-fallback");
    container.innerHTML = `
      <div class="map-fallback" role="status" aria-live="polite">
        <div class="map-fallback__content">
          <span class="map-fallback__badge">Google Maps Preview</span>
          <h3>Map preview requires a Google Maps API key.</h3>
          <p>${escapeHtml(
            message || "Add your Google Maps API key near the top of this page's script file to enable the live map."
          )}</p>
        </div>
      </div>
    `;
  };

  const sortRestaurantsByPriority = (restaurants, priority) => {
    const normalizedPriority = clamp(priority / 100, 0, 1);
    return [...restaurants].sort((first, second) => {
      const scoreRestaurant = (restaurant) => {
        const ratingScore = restaurant.rating / 5;
        const safetyScore = restaurant.safetyScore / 5;
        const distanceScore = 1 - Math.min(restaurant.distance / 10, 1);
        const priceScore = 1 - (priceToValue(restaurant.priceLevel) - 1) / 3;
        const safetyWeight = 0.18 + normalizedPriority * 0.42;
        const ratingWeight = 0.46 - normalizedPriority * 0.16;
        const distanceWeight = 0.26 - normalizedPriority * 0.06;
        const priceWeight = 0.1 - normalizedPriority * 0.02;
        return (
          safetyScore * safetyWeight +
          ratingScore * ratingWeight +
          distanceScore * distanceWeight +
          priceScore * priceWeight
        );
      };

      return scoreRestaurant(second) - scoreRestaurant(first);
    });
  };

  const loadGoogleMapsApi = (apiKey) => {
    if (window.google && window.google.maps) {
      return Promise.resolve(window.google.maps);
    }

    if (googleMapsPromise) {
      return googleMapsPromise;
    }

    googleMapsPromise = new Promise((resolve, reject) => {
      const callbackName = "__safeBiteInitGoogleMaps";
      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google.maps);
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&v=weekly&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callbackName];
        googleMapsPromise = null;
        reject(new Error("Failed to load Google Maps JavaScript API."));
      };
      document.head.appendChild(script);
    });

    return googleMapsPromise;
  };

  const toLatLng = (coordinates) => ({
    lat: coordinates[1],
    lng: coordinates[0],
  });

  const midpointBetween = (from, to) => ({
    lat: (from.lat + to.lat) / 2,
    lng: (from.lng + to.lng) / 2,
  });

  const createSvgDataUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

  const createGooglePinIcon = ({
    fillColor,
    text,
    scale = 1,
    textColor = "#ffffff",
    borderColor = "#ffffff",
    shadowColor = "rgba(15,23,42,0.18)",
  }) => {
    const width = 44 * scale;
    const height = 56 * scale;
    const anchorX = width / 2;
    const anchorY = height - 2 * scale;
    const labelText = escapeHtml(text);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 44 56">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${shadowColor}" flood-opacity="1"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <path d="M22 1.5C11.5 1.5 3 9.7 3 19.9c0 14.6 16.9 29.4 18.2 30.5a1.2 1.2 0 0 0 1.6 0C24.1 49.3 41 34.5 41 19.9 41 9.7 32.5 1.5 22 1.5Z" fill="${fillColor}" stroke="${borderColor}" stroke-width="3"/>
          <text x="22" y="22" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="800" fill="${textColor}">${labelText}</text>
        </g>
      </svg>
    `;

    return {
      url: createSvgDataUri(svg),
      scaledSize: new window.google.maps.Size(width, height),
      anchor: new window.google.maps.Point(anchorX, anchorY),
    };
  };

  const createGoogleBadgeIcon = (text) => {
    const badgeText = escapeHtml(text);
    const width = Math.max(92, text.length * 10 + 26);
    const height = 36;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(15,23,42,0.18)" flood-opacity="1"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="#ffffff" stroke="rgba(15,23,42,0.16)" stroke-width="1.5"/>
          <text x="${width / 2}" y="23" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#111827">${badgeText}</text>
        </g>
      </svg>
    `;

    return {
      url: createSvgDataUri(svg),
      scaledSize: new window.google.maps.Size(width, height),
      anchor: new window.google.maps.Point(width / 2, height / 2),
    };
  };

  const fitGoogleMapToPositions = (map, positions, padding) => {
    if (!positions.length) {
      return;
    }

    if (positions.length === 1) {
      map.setCenter(positions[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    positions.forEach((position) => bounds.extend(position));
    map.fitBounds(bounds, padding || 84);
  };

  window.SafeBiteUtils = {
    calculateItinerarySummary,
    clamp,
    createGoogleBadgeIcon,
    createGooglePinIcon,
    createMapFallback,
    escapeHtml,
    fitGoogleMapToPositions,
    formatDurationClock,
    formatKm,
    formatMiles,
    getPriorityDescription,
    getPriorityLabel,
    getRestaurantById,
    getRouteById,
    getRouteStops,
    getSafetyLabel,
    getSafetyTone,
    haversineKm,
    loadGoogleMapsApi,
    midpointBetween,
    priceToValue,
    sortRestaurantsByPriority,
    toLatLng,
    valueToPrice,
  };
})();
