const GOOGLE_MAPS_API_KEY =
    typeof window !== "undefined" && typeof window.GOOGLE_MAPS_API_KEY === "string"
        ? window.GOOGLE_MAPS_API_KEY.trim()
        : "";

document.addEventListener("DOMContentLoaded", () => {
    const { routes, recommendedSavedSpots } = window.SafeBiteData;
    const {
        createGoogleBadgeIcon,
        createGooglePinIcon,
        createMapFallback,
        escapeHtml,
        fitGoogleMapToPositions,
        formatKm,
        getRouteStops,
        loadGoogleMapsApi,
        midpointBetween,
        toLatLng,
    } = window.SafeBiteUtils;

    const state = {
        query: "",
        selectedRouteId: null,
        map: null,
        mapReady: false,
        routeMarkers: [],
        segmentMarkers: [],
        routePolyline: null,
        directionsService: null,
        directionsRenderer: null,
        attractionCircles: [],
        attractionMarkers: [],
        nearbyRestaurantMarkers: [],
        infoWindow: null,
        visibleRoutes: [],
    };

    const refs = {
        search: document.querySelector("#destinationSearch"),
        routeCards: document.querySelector("#routeCards"),
        savedSpotsList: document.querySelector("#savedSpotsList"),
        mapElement: document.querySelector("#routesMap"),
        mapCallout: document.querySelector("#routeMapCallout"),
    };

    const attractionAreas = [
        {
            id: "south-bank",
            name: "South Bank Parklands",
            label: "Riverside parkland and casual dining area",
            color: "#ef4444",
            center: { lat: -27.4787, lng: 153.0226 },
            radius: 650,
        },
        {
            id: "queen-street",
            name: "Queen Street Mall",
            label: "CBD shopping and quick lunch area",
            color: "#ef4444",
            center: { lat: -27.4698, lng: 153.0231 },
            radius: 420,
        },
        {
            id: "kangaroo-point",
            name: "Kangaroo Point Cliffs",
            label: "Lookout, riverside walk and dinner area",
            color: "#facc15",
            center: { lat: -27.4773, lng: 153.0342 },
            radius: 560,
        },
        {
            id: "botanic-gardens",
            name: "City Botanic Gardens",
            label: "Garden walk with nearby CBD cafes",
            color: "#22c55e",
            center: { lat: -27.475, lng: 153.03 },
            radius: 500,
        },
        {
            id: "story-bridge",
            name: "Howard Smith Wharves",
            label: "Story Bridge view and riverside dining",
            color: "#facc15",
            center: { lat: -27.4648, lng: 153.0348 },
            radius: 460,
        },
        {
            id: "fortitude-valley",
            name: "Fortitude Valley",
            label: "Night food, music and group dining area",
            color: "#ef4444",
            center: { lat: -27.4567, lng: 153.0348 },
            radius: 620,
        },
        {
            id: "new-farm",
            name: "New Farm Park",
            label: "Picnic, brunch and river walk area",
            color: "#22c55e",
            center: { lat: -27.4697, lng: 153.0516 },
            radius: 580,
        },
        {
            id: "west-end",
            name: "West End",
            label: "International food and student-friendly dining",
            color: "#facc15",
            center: { lat: -27.4807, lng: 153.0117 },
            radius: 650,
        },
        {
            id: "milton",
            name: "Milton / Suncorp Stadium",
            label: "Stadium food and casual group route area",
            color: "#facc15",
            center: { lat: -27.4661, lng: 153.0096 },
            radius: 540,
        },
        {
            id: "toowong",
            name: "Toowong / St Lucia",
            label: "Student dining and riverside travel area",
            color: "#22c55e",
            center: { lat: -27.4893, lng: 152.9916 },
            radius: 700,
        },
        {
            id: "woolloongabba",
            name: "Woolloongabba",
            label: "Gabba event dining and casual food area",
            color: "#ef4444",
            center: { lat: -27.485, lng: 153.0379 },
            radius: 560,
        },
    ];

    const nearbyRestaurants = [
        {
            areaId: "south-bank",
            name: "Riverside Noodle House",
            cuisine: "Asian Fusion",
            foodSafetyScore: 94,
            position: { lat: -27.4789, lng: 153.0221 },
        },
        {
            areaId: "south-bank",
            name: "Grey Street Dessert Bar",
            cuisine: "Dessert",
            foodSafetyScore: 91,
            position: { lat: -27.4802, lng: 153.0207 },
        },
        {
            areaId: "queen-street",
            name: "CBD Quick Bites",
            cuisine: "Cafe",
            foodSafetyScore: 88,
            position: { lat: -27.4696, lng: 153.0235 },
        },
        {
            areaId: "queen-street",
            name: "Mall Lunch Corner",
            cuisine: "Modern Australian",
            foodSafetyScore: 90,
            position: { lat: -27.4706, lng: 153.0224 },
        },
        {
            areaId: "kangaroo-point",
            name: "Cliffside Dinner Spot",
            cuisine: "Casual Dining",
            foodSafetyScore: 90,
            position: { lat: -27.4762, lng: 153.0347 },
        },
        {
            areaId: "botanic-gardens",
            name: "Garden Walk Cafe",
            cuisine: "Cafe",
            foodSafetyScore: 92,
            position: { lat: -27.4728, lng: 153.0297 },
        },
        {
            areaId: "story-bridge",
            name: "Wharf Seafood Table",
            cuisine: "Seafood",
            foodSafetyScore: 93,
            position: { lat: -27.4646, lng: 153.0357 },
        },
        {
            areaId: "fortitude-valley",
            name: "Valley Late Night Eats",
            cuisine: "Korean",
            foodSafetyScore: 89,
            position: { lat: -27.4562, lng: 153.0343 },
        },
        {
            areaId: "fortitude-valley",
            name: "Brunswick Street Grill",
            cuisine: "Grill",
            foodSafetyScore: 87,
            position: { lat: -27.4579, lng: 153.036 },
        },
        {
            areaId: "new-farm",
            name: "New Farm Brunch House",
            cuisine: "Brunch",
            foodSafetyScore: 95,
            position: { lat: -27.4692, lng: 153.0507 },
        },
        {
            areaId: "west-end",
            name: "Boundary Street Dumplings",
            cuisine: "Chinese",
            foodSafetyScore: 90,
            position: { lat: -27.4802, lng: 153.0112 },
        },
        {
            areaId: "west-end",
            name: "West End Vegan Bowl",
            cuisine: "Vegetarian",
            foodSafetyScore: 96,
            position: { lat: -27.482, lng: 153.0108 },
        },
        {
            areaId: "milton",
            name: "Stadium Burger Stop",
            cuisine: "Burger",
            foodSafetyScore: 86,
            position: { lat: -27.4658, lng: 153.009 },
        },
        {
            areaId: "toowong",
            name: "Student Bento Kitchen",
            cuisine: "Japanese",
            foodSafetyScore: 91,
            position: { lat: -27.4898, lng: 152.9928 },
        },
        {
            areaId: "woolloongabba",
            name: "Gabba Match Day Meals",
            cuisine: "Pub Food",
            foodSafetyScore: 88,
            position: { lat: -27.4854, lng: 153.0387 },
        },
    ];

    const demoRoutes = [
        {
            id: "demo-toowong-student-route",
            mode: "solo",
            name: "Toowong Student Dinner Route",
            summaryLabel:
                "Student-friendly route with simple food choices near Toowong and St Lucia.",
            distanceKm: 2.3,
            priceLevel: "$",
            estimatedWalkingTime: "31 min walk",
            foodSafetyScore: 91,
            coordinates: [
                { lat: -27.4898, lng: 152.9928 },
                { lat: -27.4912, lng: 152.9941 },
                { lat: -27.495, lng: 153.0012 },
            ],
            segmentTimes: ["10 min", "21 min"],
            demoStops: [
                { name: "Student Bento Kitchen", cuisine: "Japanese" },
                { name: "Toowong Rice Bowl", cuisine: "Korean" },
                { name: "St Lucia Cafe Stop", cuisine: "Cafe" },
            ],
        },
        
    ];

    const allRoutes = [...routes, ...demoRoutes];

    initialize();

    async function initialize() {
        renderSavedSpots();
        bindEvents();
        render();
        await initializeMap();
        drawSelectedRoute();
    }

    function bindEvents() {
        refs.search.addEventListener("input", (event) => {
            state.query = event.currentTarget.value.trim().toLowerCase();
            render();
        });
    }

    function renderSavedSpots() {
        refs.savedSpotsList.innerHTML = recommendedSavedSpots
            .map(
                (spot) => `
          <li>
            <strong>${escapeHtml(spot.name)}</strong>
            <span>${escapeHtml(spot.type)}</span>
          </li>
        `,
            )
            .join("");
    }

    async function initializeMap() {
        if (
            !GOOGLE_MAPS_API_KEY ||
            GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" ||
            GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        ) {
            refs.mapCallout.hidden = true;
            createMapFallback(
                refs.mapElement,
                "Map preview requires a Google Maps API key. Add it near the top of recommended-routes/script.js.",
            );
            return;
        }

        try {
            await loadGoogleMapsApi(GOOGLE_MAPS_API_KEY);
        } catch (error) {
            refs.mapCallout.hidden = true;
            createMapFallback(
                refs.mapElement,
                "Google Maps failed to load. Check the API key and make sure the Maps JavaScript API is enabled.",
            );
            return;
        }

        state.map = new window.google.maps.Map(refs.mapElement, {
            center: { lat: -27.4748, lng: 153.024 },
            zoom: 13.2,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
        });

        state.routePolyline = new window.google.maps.Polyline({
            map: state.map,
            strokeColor: "#ef4444",
            strokeOpacity: 1,
            strokeWeight: 6,
            zIndex: 500,
        });

        state.directionsService = new window.google.maps.DirectionsService();

        state.directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: state.map,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
                strokeColor: "#ef4444",
                strokeOpacity: 1,
                strokeWeight: 6,
                zIndex: 500,
            },
        });

        state.mapReady = true;
        state.infoWindow = new window.google.maps.InfoWindow();
        refs.mapCallout.hidden = false;

        drawAttractionLayer();
    }

    function getRouteStopsForRoute(route) {
        if (Array.isArray(route.demoStops)) {
            return route.demoStops;
        }

        return getRouteStops(route);
    }

    function getFilteredRoutes() {
        const query = state.query;

        const filtered = allRoutes.filter((route) => {
            const stopNames = getRouteStopsForRoute(route)
                .map((stop) => `${stop.name} ${stop.cuisine}`.toLowerCase())
                .join(" ");

            return (
                query.length === 0 ||
                route.name.toLowerCase().includes(query) ||
                stopNames.includes(query)
            );
        });

        return filtered.sort((first, second) => {
            if (second.foodSafetyScore !== first.foodSafetyScore) {
                return second.foodSafetyScore - first.foodSafetyScore;
            }

            return first.distanceKm - second.distanceKm;
        });
    }

    function render() {
        state.visibleRoutes = getFilteredRoutes();

        if (
            !state.visibleRoutes.some(
                (route) => route.id === state.selectedRouteId,
            )
        ) {
            state.selectedRouteId = state.visibleRoutes[0]?.id ?? null;
        }

        if (state.visibleRoutes.length === 0) {
            refs.routeCards.innerHTML = `
        <div class="empty-state">
          <h2>No routes match this search.</h2>
          <p>Try another destination keyword or switch travel mode.</p>
        </div>
      `;
            clearRouteMarkers();
            updateMapCallout(null);
            return;
        }

        refs.routeCards.innerHTML = state.visibleRoutes
            .map(renderRouteCard)
            .join("");

        refs.routeCards.querySelectorAll(".route-card").forEach((card) => {
            card.addEventListener("click", (event) => {
                if (event.target.closest(".edit-button")) {
                    return;
                }

                state.selectedRouteId = card.dataset.routeId;
                render();
            });
        });

        refs.routeCards.querySelectorAll(".edit-button").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();

                const route = state.visibleRoutes.find(
                    (item) => item.id === button.dataset.routeId,
                );

                if (!route) {
                    return;
                }

                localStorage.setItem(
                    "safeBiteSelectedRoute",
                    JSON.stringify({
                        id: route.id,
                        name: route.name,
                        mode: route.mode,
                        stops: route.stops ?? getRouteStopsForRoute(route),
                        coordinates: route.coordinates,
                        distanceKm: route.distanceKm,
                        estimatedWalkingTime: route.estimatedWalkingTime,
                    }),
                );

                window.location.href = "../diy-route-studio/index.html";
            });
        });

        drawSelectedRoute();
    }

    function renderRouteCard(route) {
        const isSelected = route.id === state.selectedRouteId;
        const progressWidth = Math.max(Math.min(route.foodSafetyScore, 100), 0);
        const tagText = "Recommended route";

        const stopChips = getRouteStopsForRoute(route)
            .map(
                (stop) =>
                    `<span class="route-stop-chip">${escapeHtml(stop.name)}</span>`,
            )
            .join("");

        return `
      <article class="route-card ${isSelected ? "is-selected" : ""}" data-route-id="${route.id}">
        <span class="route-card__tag">${tagText}</span>
        <h2>${escapeHtml(route.name)}</h2>
        <p>${escapeHtml(route.summaryLabel)}</p>
        <div class="route-meta">
          <span>${formatKm(route.distanceKm)}</span>
          <span>${route.priceLevel}</span>
          <strong>${route.estimatedWalkingTime}</strong>
        </div>
        <div class="route-stop-list">${stopChips}</div>
        <div class="progress-row">
          <div class="progress-row__header">
            <span>Food Safety Score</span>
            <strong>${route.foodSafetyScore}/100</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressWidth}%"></div>
          </div>
        </div>
        <button class="edit-button" type="button" data-route-id="${route.id}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16.9 3.5 3.6 3.6-10.7 10.7-4.2.6.6-4.2L16.9 3.5Zm-9.1 11.8-.3 2 2-.3 9-9-1.7-1.7-9 9Z"/></svg>
          Edit / Customize
        </button>
      </article>
    `;
    }

    function getSelectedRoute() {
        return (
            state.visibleRoutes.find(
                (route) => route.id === state.selectedRouteId,
            ) ?? null
        );
    }

    function drawSelectedRoute() {
        const route = getSelectedRoute();
        updateMapCallout(route);

        if (!route || !state.mapReady || !state.map) {
            return;
        }

        clearRouteMarkers();

        const positions = route.coordinates.map(toLatLng);

        drawRouteMarkers(route, positions);
        drawNavigationRoute(route, positions);
    }

    function drawRouteMarkers(route, positions) {
        positions.forEach((position, index) => {
            const marker = new window.google.maps.Marker({
                position,
                map: state.map,
                title: `${route.name} stop ${index + 1}`,
                zIndex: 400,
                icon: createGooglePinIcon({
                    fillColor: "#ef4444",
                    text: String.fromCharCode(65 + index),
                    scale: 1,
                }),
            });

            state.routeMarkers.push(marker);
        });
    }

    function drawNavigationRoute(route, positions) {
        if (
            !state.directionsService ||
            !state.directionsRenderer ||
            positions.length < 2
        ) {
            drawFallbackStraightRoute(route, positions);
            return;
        }

        // First draw a visible fallback line, so the user never sees markers only.
        drawFallbackStraightRoute(route, positions);

        const request = {
            origin: positions[0],
            destination: positions[positions.length - 1],
            waypoints: positions.slice(1, -1).map((position) => ({
                location: position,
                stopover: true,
            })),
            travelMode: window.google.maps.TravelMode.WALKING,
            optimizeWaypoints: false,
        };

        const currentRouteId = route.id;

        state.directionsService.route(request, (result, status) => {
            console.log("Directions status:", route.name, status);

            if (currentRouteId !== state.selectedRouteId) {
                return;
            }

            if (status === "OK" && result) {
                if (state.routePolyline) {
                    state.routePolyline.setPath([]);
                }

                state.segmentMarkers.forEach((marker) => marker.setMap(null));
                state.segmentMarkers = [];

                state.directionsRenderer.setDirections(result);
                drawSegmentBadgesFromDirections(result, route);
                return;
            }

            // Keep fallback line when Google navigation fails.
            console.warn(
                `Navigation route failed for "${route.name}". Fallback line is kept.`,
                status,
            );
        });
    }

    function drawSegmentBadgesFromDirections(result, route) {
        const legs = result.routes?.[0]?.legs ?? [];

        legs.forEach((leg, index) => {
            const label =
                leg.duration?.text ?? route.segmentTimes?.[index] ?? "";

            if (!label) {
                return;
            }

            const badge = new window.google.maps.Marker({
                position: midpointBetween(leg.start_location, leg.end_location),
                map: state.map,
                clickable: false,
                zIndex: 120,
                icon: createGoogleBadgeIcon(label),
            });

            state.segmentMarkers.push(badge);
        });
    }

    function drawFallbackStraightRoute(route, positions) {
        if (state.routePolyline) {
            state.routePolyline.setOptions({
                strokeColor: "#b91c1c",
                strokeOpacity: 1,
                strokeWeight: 6,
                zIndex: 500,
            });
            state.routePolyline.setPath(positions);
        }

        const segmentTimes = route.segmentTimes ?? [];

        segmentTimes.forEach((label, index) => {
            if (!positions[index] || !positions[index + 1]) {
                return;
            }

            const badge = new window.google.maps.Marker({
                position: midpointBetween(
                    positions[index],
                    positions[index + 1],
                ),
                map: state.map,
                clickable: false,
                zIndex: 120,
                icon: createGoogleBadgeIcon(label),
            });

            state.segmentMarkers.push(badge);
        });

        fitGoogleMapToPositions(state.map, positions, 96);
    }

    function clearRouteMarkers() {
        state.routeMarkers.forEach((marker) => marker.setMap(null));
        state.segmentMarkers.forEach((marker) => marker.setMap(null));

        state.routeMarkers = [];
        state.segmentMarkers = [];

        if (state.routePolyline) {
            state.routePolyline.setPath([]);
        }

        if (state.directionsRenderer) {
            state.directionsRenderer.set("directions", null);
        }
    }

    function updateMapCallout(route) {
        if (!route) {
            refs.mapCallout.innerHTML = `
        <strong>No route selected</strong>
        <span>Choose one of the recommended routes to preview it on the map.</span>
      `;
            return;
        }

        const stopNames = getRouteStopsForRoute(route)
            .map((stop) => stop.name)
            .join(" → ");

        refs.mapCallout.innerHTML = `
      <strong>${escapeHtml(route.name)}</strong>
      <span>${escapeHtml(stopNames)} · ${route.estimatedWalkingTime} · ${formatKm(route.distanceKm)}</span>
    `;
    }

    function drawAttractionLayer() {
        if (!state.mapReady || !state.map) {
            return;
        }

        clearAttractionLayer();

        attractionAreas.forEach((area) => {
            const circle = new window.google.maps.Circle({
                map: state.map,
                center: area.center,
                radius: area.radius,
                strokeColor: area.color,
                strokeOpacity: 0,
                strokeWeight: 0,
                fillColor: area.color,
                fillOpacity: 0.28,
                zIndex: 40,
            });

            circle.addListener("click", (event) => {
                openInfoWindow(
                    event.latLng,
                    `
        <strong>${escapeHtml(area.name)}</strong>
        <br />
        <span>${escapeHtml(area.label)}</span>
        <br />
        <span>Approx. ${area.radius}m area</span>
      `,
                );
            });

            state.attractionCircles.push(circle);

            const attractionMarker = new window.google.maps.Marker({
                position: area.center,
                map: state.map,
                title: area.name,
                zIndex: 300,
                icon: createGooglePinIcon({
                    fillColor: area.color,
                    text: "★",
                    scale: 0.9,
                }),
            });

            attractionMarker.addListener("click", () => {
                openInfoWindow(
                    area.center,
                    `
        <strong>${escapeHtml(area.name)}</strong>
        <br />
        <span>${escapeHtml(area.label)}</span>
        <br />
        <span>Approx. ${area.radius}m area</span>
      `,
                );
            });

            state.attractionMarkers.push(attractionMarker);
        });

        nearbyRestaurants.forEach((restaurant) => {
            const marker = new window.google.maps.Marker({
                position: restaurant.position,
                map: state.map,
                title: restaurant.name,
                zIndex: 360,
                icon: createGooglePinIcon({
                    fillColor: "#2563eb",
                    text: "R",
                    scale: 0.78,
                }),
            });

            marker.addListener("click", () => {
                openInfoWindow(
                    restaurant.position,
                    `
        <strong>${escapeHtml(restaurant.name)}</strong>
        <br />
        <span>${escapeHtml(restaurant.cuisine)}</span>
        <br />
        <span>Food Safety Score: ${restaurant.foodSafetyScore}/100</span>
      `,
                );
            });

            state.nearbyRestaurantMarkers.push(marker);
        });
    }

    function clearAttractionLayer() {
        state.attractionCircles.forEach((circle) => circle.setMap(null));
        state.attractionMarkers.forEach((marker) => marker.setMap(null));
        state.nearbyRestaurantMarkers.forEach((marker) => marker.setMap(null));

        state.attractionCircles = [];
        state.attractionMarkers = [];
        state.nearbyRestaurantMarkers = [];
    }

    function openInfoWindow(position, content) {
        if (!state.infoWindow) {
            return;
        }

        state.infoWindow.setContent(`
    <div class="map-info-window">
      ${content}
    </div>
  `);

        state.infoWindow.setPosition(position);
        state.infoWindow.open(state.map);
    }
});
