const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

document.addEventListener("DOMContentLoaded", () => {
  const { diyWishlist } = window.SafeBiteData;
  const {
    calculateItinerarySummary,
    createGoogleBadgeIcon,
    createGooglePinIcon,
    createMapFallback,
    escapeHtml,
    fitGoogleMapToPositions,
    formatDurationClock,
    formatKm,
    getRestaurantById,
    loadGoogleMapsApi,
    midpointBetween,
    toLatLng,
  } = window.SafeBiteUtils;

  const preselectedRoute = getPreselectedRoute();
  const savedItinerary = getSavedItinerary();
  const state = {
    query: "",
    wishlistIds: [...diyWishlist],
    itineraryIds: savedItinerary?.length
      ? [...savedItinerary]
      : preselectedRoute?.stops?.length
        ? [...preselectedRoute.stops]
        : diyWishlist.slice(0, 2),
    draggedItem: null,
    map: null,
    mapReady: false,
    routeMarkers: [],
    segmentMarkers: [],
    routePolyline: null,
  };

  const refs = {
    wishlistSearch: document.querySelector("#wishlistSearch"),
    wishlistList: document.querySelector("#wishlistList"),
    itineraryList: document.querySelector("#itineraryList"),
    dropZone: document.querySelector("#dropZone"),
    totalDistance: document.querySelector("#totalDistance"),
    walkingTime: document.querySelector("#walkingTime"),
    priceLevel: document.querySelector("#priceLevel"),
    clearRouteButton: document.querySelector("#clearRouteButton"),
    confirmRouteButton: document.querySelector("#confirmRouteButton"),
    mapElement: document.querySelector("#diyMap"),
    mapCallout: document.querySelector("#diyMapCallout"),
    routeImportNotice: document.querySelector("#routeImportNotice"),
    modal: document.querySelector("#confirmationModal"),
    modalOverlay: document.querySelector("#modalOverlay"),
    closeModalButton: document.querySelector("#closeModalButton"),
    confirmationSummary: document.querySelector("#confirmationSummary"),
  };

  initialize();

  async function initialize() {
    bindEvents();
    render();
    await initializeMap();
    drawItineraryOnMap();
  }

  function bindEvents() {
    refs.wishlistSearch.addEventListener("input", (event) => {
      state.query = event.currentTarget.value.trim().toLowerCase();
      renderWishlist();
    });

    refs.dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      refs.dropZone.classList.add("is-active");
    });

    refs.dropZone.addEventListener("dragleave", () => {
      refs.dropZone.classList.remove("is-active");
    });

    refs.dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      refs.dropZone.classList.remove("is-active");
      if (!state.draggedItem) {
        return;
      }
      insertDraggedItemAtEnd();
    });

    refs.clearRouteButton.addEventListener("click", () => {
      state.itineraryIds = [];
      persistItinerary();
      render();
    });

    refs.confirmRouteButton.addEventListener("click", openModal);
    refs.closeModalButton.addEventListener("click", closeModal);
    refs.modalOverlay.addEventListener("click", closeModal);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  async function initializeMap() {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      refs.mapCallout.hidden = true;
      createMapFallback(
        refs.mapElement,
        "Map preview requires a Google Maps API key. Add it near the top of diy-route-studio/script.js."
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
      center: { lat: -27.476, lng: 153.024 },
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

  function getPreselectedRoute() {
    try {
      const raw = localStorage.getItem("safeBiteSelectedRoute");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function getSavedItinerary() {
    try {
      const raw = localStorage.getItem("safeBiteDIYItinerary");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function render() {
    renderImportNotice();
    renderWishlist();
    renderItinerary();
    renderSummary();
    drawItineraryOnMap();
  }

  function renderImportNotice() {
    if (!preselectedRoute) {
      refs.routeImportNotice.hidden = true;
      return;
    }

    refs.routeImportNotice.hidden = false;
    refs.routeImportNotice.innerHTML = `
      <strong>Imported route:</strong>
      <span>${escapeHtml(preselectedRoute.name)} · ${preselectedRoute.stops.length} suggested stops. You can reorder or remove any stop below.</span>
    `;
  }

  function renderWishlist() {
    const filteredRestaurants = state.wishlistIds
      .map((restaurantId) => getRestaurantById(restaurantId))
      .filter((restaurant) => {
        if (!restaurant) {
          return false;
        }
        const haystack = `${restaurant.name} ${restaurant.cuisine} ${restaurant.category}`.toLowerCase();
        return state.query.length === 0 || haystack.includes(state.query);
      });

    refs.wishlistList.innerHTML = filteredRestaurants
      .map(
        (restaurant) => `
          <article
            class="wishlist-card"
            draggable="true"
            tabindex="0"
            data-wishlist-id="${restaurant.id}"
            aria-label="${escapeHtml(restaurant.name)}"
          >
            <div class="drag-handle" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <img src="${restaurant.image}" alt="${escapeHtml(restaurant.name)} thumbnail" />
            <div>
              <h3>${escapeHtml(restaurant.name)}</h3>
              <div class="wishlist-meta">
                <span class="grade-pill">${restaurant.safetyGrade} / ${restaurant.safetyPercent}%</span>
                <span>${restaurant.priceLevel}</span>
              </div>
              <div class="wishlist-meta">
                <span>${escapeHtml(restaurant.cuisine)}</span>
              </div>
            </div>
          </article>
        `
      )
      .join("");

    refs.wishlistList.querySelectorAll(".wishlist-card").forEach((card) => {
      card.addEventListener("dragstart", () => {
        state.draggedItem = { source: "wishlist", restaurantId: card.dataset.wishlistId };
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => {
        state.draggedItem = null;
        card.classList.remove("is-dragging");
        refs.dropZone.classList.remove("is-active");
      });
    });
  }

  function renderItinerary() {
    refs.itineraryList.innerHTML = state.itineraryIds
      .map((restaurantId, index) => {
        const restaurant = getRestaurantById(restaurantId);
        return `
          <article
            class="itinerary-card"
            draggable="true"
            data-itinerary-id="${restaurant.id}"
            tabindex="0"
            aria-label="${escapeHtml(restaurant.name)} stop ${index + 1}"
          >
            <span class="stop-number">${index + 1}</span>
            <div>
              <h3>${escapeHtml(restaurant.name)}</h3>
              <div class="itinerary-meta">
                <span>${restaurant.waitTime}</span>
                <span>•</span>
                <span>${escapeHtml(restaurant.cuisine)}</span>
              </div>
            </div>
            <button class="remove-stop" type="button" data-remove-id="${restaurant.id}" aria-label="Remove ${escapeHtml(
              restaurant.name
            )}">×</button>
          </article>
        `;
      })
      .join("");

    refs.itineraryList.querySelectorAll(".remove-stop").forEach((button) => {
      button.addEventListener("click", () => {
        state.itineraryIds = state.itineraryIds.filter((restaurantId) => restaurantId !== button.dataset.removeId);
        persistItinerary();
        render();
      });
    });

    refs.itineraryList.querySelectorAll(".itinerary-card").forEach((card) => {
      card.addEventListener("dragstart", () => {
        state.draggedItem = { source: "itinerary", restaurantId: card.dataset.itineraryId };
        card.classList.add("is-dragging");
      });

      card.addEventListener("dragend", () => {
        state.draggedItem = null;
        card.classList.remove("is-dragging");
        refs.dropZone.classList.remove("is-active");
      });

      card.addEventListener("dragover", (event) => {
        event.preventDefault();
      });

      card.addEventListener("drop", (event) => {
        event.preventDefault();
        if (!state.draggedItem) {
          return;
        }
        insertDraggedItemBefore(card.dataset.itineraryId);
      });
    });
  }

  function insertDraggedItemAtEnd() {
    const { source, restaurantId } = state.draggedItem;
    if (source === "wishlist") {
      if (!state.itineraryIds.includes(restaurantId)) {
        state.itineraryIds.push(restaurantId);
      }
    } else {
      state.itineraryIds = state.itineraryIds.filter((id) => id !== restaurantId);
      state.itineraryIds.push(restaurantId);
    }
    persistItinerary();
    render();
  }

  function insertDraggedItemBefore(targetId) {
    const { source, restaurantId } = state.draggedItem;
    const nextIds = state.itineraryIds.filter((id) => id !== restaurantId);
    const targetIndex = nextIds.indexOf(targetId);

    if (source === "wishlist" && state.itineraryIds.includes(restaurantId)) {
      return;
    }

    nextIds.splice(targetIndex, 0, restaurantId);
    state.itineraryIds = nextIds;
    persistItinerary();
    render();
  }

  function renderSummary() {
    const summary = calculateItinerarySummary(state.itineraryIds);
    refs.totalDistance.textContent = formatKm(summary.totalDistance);
    refs.walkingTime.textContent = formatDurationClock(summary.totalWalkingMinutes);
    refs.priceLevel.textContent = summary.priceLevel;
    refs.confirmRouteButton.disabled = state.itineraryIds.length === 0;

    if (state.itineraryIds.length === 0) {
      refs.mapCallout.innerHTML = `
        <strong>No active itinerary</strong>
        <span>Drag saved spots into the stop order list to build your own route.</span>
      `;
      return;
    }

    const stopNames = summary.stops.map((stop) => stop.name).join(" → ");
    refs.mapCallout.innerHTML = `
      <strong>Current DIY route</strong>
      <span>${escapeHtml(stopNames)} · ${formatKm(summary.totalDistance)} · ${formatDurationClock(
        summary.totalWalkingMinutes
      )}</span>
    `;
  }

  function drawItineraryOnMap() {
    if (!state.mapReady || !state.map || !state.routePolyline) {
      return;
    }

    clearRouteMarkers();

    const stops = state.itineraryIds.map((restaurantId) => getRestaurantById(restaurantId)).filter(Boolean);
    const positions = stops.map((stop) => toLatLng(stop.coordinates));
    state.routePolyline.setPath(positions);

    if (stops.length === 0) {
      state.map.setCenter({ lat: -27.476, lng: 153.024 });
      state.map.setZoom(14.2);
      return;
    }

    const summary = calculateItinerarySummary(state.itineraryIds);

    positions.forEach((position, index) => {
      const marker = new window.google.maps.Marker({
        position,
        map: state.map,
        title: `${stops[index].name} stop ${index + 1}`,
        zIndex: 400,
        icon: createGooglePinIcon({
          fillColor: "#ef4444",
          text: String.fromCharCode(65 + index),
          scale: 1,
        }),
      });
      state.routeMarkers.push(marker);
    });

    summary.segmentTimes.forEach((label, index) => {
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

  function openModal() {
    const summary = calculateItinerarySummary(state.itineraryIds);
    refs.confirmationSummary.textContent = `${state.itineraryIds.length} stop${
      state.itineraryIds.length === 1 ? "" : "s"
    } · ${formatKm(summary.totalDistance)} total distance · ${formatDurationClock(
      summary.totalWalkingMinutes
    )} walking time.`;
    refs.modal.hidden = false;
    refs.modalOverlay.hidden = false;
    requestAnimationFrame(() => {
      refs.modal.classList.add("is-open");
      refs.modalOverlay.classList.add("is-visible");
    });
    refs.closeModalButton.focus();
  }

  function closeModal() {
    if (refs.modal.hidden) {
      return;
    }

    refs.modal.classList.remove("is-open");
    refs.modalOverlay.classList.remove("is-visible");
    window.setTimeout(() => {
      refs.modal.hidden = true;
      refs.modalOverlay.hidden = true;
    }, 220);
  }

  function persistItinerary() {
    localStorage.setItem("safeBiteDIYItinerary", JSON.stringify(state.itineraryIds));
  }
});
