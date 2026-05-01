const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

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
    mode: "solo",
    query: "",
    selectedRouteId: null,
    map: null,
    mapReady: false,
    routeMarkers: [],
    segmentMarkers: [],
    routePolyline: null,
    visibleRoutes: [],
  };

  const refs = {
    search: document.querySelector("#destinationSearch"),
    routeCards: document.querySelector("#routeCards"),
    savedSpotsList: document.querySelector("#savedSpotsList"),
    soloButton: document.querySelector("#soloModeButton"),
    groupButton: document.querySelector("#groupModeButton"),
    mapElement: document.querySelector("#routesMap"),
    mapCallout: document.querySelector("#routeMapCallout"),
  };

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

    refs.soloButton.addEventListener("click", () => {
      state.mode = "solo";
      render();
    });

    refs.groupButton.addEventListener("click", () => {
      state.mode = "group";
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
        `
      )
      .join("");
  }

  async function initializeMap() {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      refs.mapCallout.hidden = true;
      createMapFallback(
        refs.mapElement,
        "Map preview requires a Google Maps API key. Add it near the top of recommended-routes/script.js."
      );
      return;
    }

    try {
      await loadGoogleMapsApi(GOOGLE_MAPS_API_KEY);
    } catch (error) {
      refs.mapCallout.hidden = true;
      createMapFallback(
        refs.mapElement,
        "Google Maps failed to load. Check the API key and make sure the Maps JavaScript API is enabled."
      );
      return;
    }

    state.map = new window.google.maps.Map(refs.mapElement, {
      center: { lat: -27.4748, lng: 153.024 },
      zoom: 14.2,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: "cooperative",
    });

    state.routePolyline = new window.google.maps.Polyline({
      map: state.map,
      strokeColor: "#ef4444",
      strokeOpacity: 0.94,
      strokeWeight: 5,
    });

    state.mapReady = true;
    refs.mapCallout.hidden = false;
  }

  function getFilteredRoutes() {
    const query = state.query;
    const modeRoutes = routes.filter((route) => route.mode === state.mode);
    const filtered = modeRoutes.filter((route) => {
      const stopNames = getRouteStops(route).map((stop) => `${stop.name} ${stop.cuisine}`.toLowerCase()).join(" ");
      return query.length === 0 || route.name.toLowerCase().includes(query) || stopNames.includes(query);
    });

    if (state.mode === "solo") {
      return filtered.sort((first, second) => {
        if (second.foodSafetyScore !== first.foodSafetyScore) {
          return second.foodSafetyScore - first.foodSafetyScore;
        }
        return first.distanceKm - second.distanceKm;
      });
    }

    return filtered.sort((first, second) => second.distanceKm - first.distanceKm);
  }

  function render() {
    state.visibleRoutes = getFilteredRoutes();
    syncModeButtons();

    if (!state.visibleRoutes.some((route) => route.id === state.selectedRouteId)) {
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

    refs.routeCards.innerHTML = state.visibleRoutes.map(renderRouteCard).join("");

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
        const route = state.visibleRoutes.find((item) => item.id === button.dataset.routeId);
        localStorage.setItem(
          "safeBiteSelectedRoute",
          JSON.stringify({
            id: route.id,
            name: route.name,
            mode: route.mode,
            stops: route.stops,
            distanceKm: route.distanceKm,
            estimatedWalkingTime: route.estimatedWalkingTime,
          })
        );
        window.location.href = "../diy-route-studio/index.html";
      });
    });

    drawSelectedRoute();
  }

  function syncModeButtons() {
    const isSolo = state.mode === "solo";
    refs.soloButton.classList.toggle("is-active", isSolo);
    refs.groupButton.classList.toggle("is-active", !isSolo);
  }

  function renderRouteCard(route) {
    const isSelected = route.id === state.selectedRouteId;
    const progressWidth = Math.max(Math.min(route.foodSafetyScore, 100), 0);
    const tagText = state.mode === "solo" ? "Efficient for solo" : "Varied for groups";
    const stopChips = getRouteStops(route)
      .map((stop) => `<span class="route-stop-chip">${escapeHtml(stop.name)}</span>`)
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
    return state.visibleRoutes.find((route) => route.id === state.selectedRouteId) ?? null;
  }

  function drawSelectedRoute() {
    const route = getSelectedRoute();
    updateMapCallout(route);

    if (!route || !state.mapReady || !state.map || !state.routePolyline) {
      return;
    }

    clearRouteMarkers();

    const positions = route.coordinates.map(toLatLng);
    state.routePolyline.setPath(positions);

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

    route.segmentTimes.forEach((label, index) => {
      const badge = new window.google.maps.Marker({
        position: midpointBetween(positions[index], positions[index + 1]),
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
  }

  function updateMapCallout(route) {
    if (!route) {
      refs.mapCallout.innerHTML = `
        <strong>No route selected</strong>
        <span>Choose one of the recommended routes to preview it on the map.</span>
      `;
      return;
    }

    const stopNames = getRouteStops(route)
      .map((stop) => stop.name)
      .join(" → ");

    refs.mapCallout.innerHTML = `
      <strong>${escapeHtml(route.name)}</strong>
      <span>${escapeHtml(stopNames)} · ${route.estimatedWalkingTime} · ${formatKm(route.distanceKm)}</span>
    `;
  }
});
