const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

document.addEventListener("DOMContentLoaded", () => {
  const { restaurants } = window.SafeBiteData;
  const {
    createGooglePinIcon,
    createMapFallback,
    escapeHtml,
    formatMiles,
    getPriorityDescription,
    getPriorityLabel,
    getSafetyLabel,
    getSafetyTone,
    loadGoogleMapsApi,
    sortRestaurantsByPriority,
    toLatLng,
  } = window.SafeBiteUtils;

  const state = {
    filters: {
      query: "",
      safety: "all",
      priority: 50,
      availability: new Set(),
      price: "all",
      distance: "any",
      category: "all",
    },
    selectedRestaurantId: restaurants[0]?.id ?? null,
    map: null,
    markers: new Map(),
    mapReady: false,
    currentRestaurants: [],
  };

  const refs = {
    searchInput: document.querySelector("#searchInput"),
    restaurantList: document.querySelector("#restaurantList"),
    resultsCount: document.querySelector("#resultsCount"),
    mapElement: document.querySelector("#discoveryMap"),
    mapPreview: document.querySelector("#mapPreview"),
    openFilterButton: document.querySelector("#openFilterButton"),
    closeFilterButton: document.querySelector("#closeFilterButton"),
    applyFiltersButton: document.querySelector("#applyFiltersButton"),
    clearFiltersButton: document.querySelector("#clearFiltersButton"),
    drawer: document.querySelector("#filterDrawer"),
    overlay: document.querySelector("#drawerOverlay"),
    prioritySlider: document.querySelector("#safetyPriority"),
    priorityBadge: document.querySelector("#priorityBadge"),
    priorityDescription: document.querySelector("#priorityDescription"),
  };

  initialize();

  async function initialize() {
    bindEvents();
    syncFilterControls();
    render();
    await initializeMap();
    updateMarkers();
    focusSelectedOnMap(false);
  }

  function bindEvents() {
    refs.searchInput.addEventListener("input", (event) => {
      state.filters.query = event.currentTarget.value.trim().toLowerCase();
      render();
    });

    refs.prioritySlider.addEventListener("input", (event) => {
      state.filters.priority = Number(event.currentTarget.value);
      syncPriorityState();
      render();
    });

    refs.openFilterButton.addEventListener("click", openDrawer);
    refs.closeFilterButton.addEventListener("click", closeDrawer);
    refs.overlay.addEventListener("click", closeDrawer);
    refs.applyFiltersButton.addEventListener("click", closeDrawer);
    refs.clearFiltersButton.addEventListener("click", () => {
      state.filters = {
        query: state.filters.query,
        safety: "all",
        priority: 50,
        availability: new Set(),
        price: "all",
        distance: "any",
        category: "all",
      };
      syncFilterControls();
      render();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    });

    document.querySelectorAll("[data-filter-group]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.dataset.filterGroup;
        const value = button.dataset.value;

        if (group === "availability") {
          if (state.filters.availability.has(value)) {
            state.filters.availability.delete(value);
          } else {
            state.filters.availability.add(value);
          }
        } else {
          state.filters[group] = value;
        }

        syncFilterControls();
        render();
      });
    });
  }

  function syncFilterControls() {
    document.querySelectorAll("[data-filter-group]").forEach((button) => {
      const group = button.dataset.filterGroup;
      const value = button.dataset.value;
      let isSelected = false;

      if (group === "availability") {
        isSelected = state.filters.availability.has(value);
      } else {
        isSelected = state.filters[group] === value;
      }

      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    refs.prioritySlider.value = String(state.filters.priority);
    syncPriorityState();
  }

  function syncPriorityState() {
    const label = getPriorityLabel(state.filters.priority);
    refs.priorityBadge.textContent = label;
    refs.priorityDescription.textContent = `${label} importance: ${getPriorityDescription(state.filters.priority)}`;
  }

  async function initializeMap() {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      createMapFallback(
        refs.mapElement,
        "Map preview requires a Google Maps API key. Add it near the top of restaurant-discovery/script.js."
      );
      return;
    }

    try {
      await loadGoogleMapsApi(GOOGLE_MAPS_API_KEY);
    } catch (error) {
      createMapFallback(
        refs.mapElement,
        "Google Maps failed to load. Check the API key and make sure the Maps JavaScript API is enabled."
      );
      return;
    }

    state.map = new window.google.maps.Map(refs.mapElement, {
      center: { lat: -27.4705, lng: 153.0251 },
      zoom: 13.8,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: "cooperative",
    });

    state.mapReady = true;
  }

  function getFilteredRestaurants() {
    const query = state.filters.query;
    const filtered = restaurants.filter((restaurant) => {
      const matchesQuery =
        query.length === 0 ||
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.address.toLowerCase().includes(query);

      const matchesSafety =
        state.filters.safety === "all" || restaurant.safetyScore >= Number(state.filters.safety);

      const matchesAvailability = [...state.filters.availability].every((filterKey) => restaurant[filterKey]);

      const matchesPrice = state.filters.price === "all" || restaurant.priceLevel === state.filters.price;

      const matchesDistance =
        state.filters.distance === "any" || restaurant.distance <= Number(state.filters.distance);

      const matchesCategory =
        state.filters.category === "all" || restaurant.category === state.filters.category;

      return (
        matchesQuery &&
        matchesSafety &&
        matchesAvailability &&
        matchesPrice &&
        matchesDistance &&
        matchesCategory
      );
    });

    return sortRestaurantsByPriority(filtered, state.filters.priority);
  }

  function render() {
    const filteredRestaurants = getFilteredRestaurants();
    state.currentRestaurants = filteredRestaurants;
    ensureSelection(filteredRestaurants);

    refs.resultsCount.textContent = `${filteredRestaurants.length} restaurant${
      filteredRestaurants.length === 1 ? "" : "s"
    } found`;

    if (filteredRestaurants.length === 0) {
      refs.restaurantList.innerHTML = `
        <div class="empty-state">
          <h2>No matching restaurants found.</h2>
          <p>Try adjusting your filters.</p>
        </div>
      `;
      refs.mapPreview.hidden = true;
      clearMarkers();
      return;
    }

    refs.restaurantList.innerHTML = filteredRestaurants.map(renderRestaurantCard).join("");

    refs.restaurantList.querySelectorAll(".restaurant-card").forEach((card) => {
      card.addEventListener("click", () => selectRestaurant(card.dataset.restaurantId, true));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRestaurant(card.dataset.restaurantId, true);
        }
      });
    });

    renderPreview();
    updateMarkers();
  }

  function ensureSelection(filteredRestaurants) {
    const selectedStillVisible = filteredRestaurants.some(
      (restaurant) => restaurant.id === state.selectedRestaurantId
    );

    if (!selectedStillVisible) {
      state.selectedRestaurantId = filteredRestaurants[0]?.id ?? null;
    }
  }

  function renderRestaurantCard(restaurant) {
    const isSelected = restaurant.id === state.selectedRestaurantId;
    const safetyLabel = getSafetyLabel(restaurant.safetyScore);
    const openStatus = restaurant.openNow ? "Open Now" : "Lunch Spot";

    return `
      <article
        class="restaurant-card ${isSelected ? "is-selected" : ""}"
        tabindex="0"
        data-restaurant-id="${restaurant.id}"
        aria-label="${escapeHtml(restaurant.name)}"
      >
        <div class="restaurant-card__media">
          <img src="${restaurant.image}" alt="${escapeHtml(restaurant.name)} dining area" />
          <span class="overlay-badge overlay-badge--open">${openStatus}</span>
          <span class="overlay-badge overlay-badge--safety">${restaurant.safetyScore.toFixed(1)}</span>
        </div>
        <div class="restaurant-card__body">
          <div class="title-row">
            <div>
              <h2>${escapeHtml(restaurant.name)}</h2>
            </div>
            <span class="price-level">${restaurant.priceLevel}</span>
          </div>
          <div class="meta-line">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a1 1 0 0 0-1 1v4.6l3 1.8 1-1.7-2-1.2V8a1 1 0 0 0-1-1Zm0-5a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8Z"/></svg>
            ${restaurant.waitTime}
          </div>
          <div class="rating-line">
            <span class="star">★</span>
            <strong>${restaurant.rating.toFixed(1)}</strong>
            <span class="dot">•</span>
            <span>${escapeHtml(restaurant.cuisine)}</span>
            <span class="dot">•</span>
            <span>${formatMiles(restaurant.distance)}</span>
          </div>
          <div class="food-safety-banner">
            <span class="food-safety-banner__label">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 5 5v6c0 5 3.4 9.4 7 11 3.6-1.6 7-6 7-11V5l-7-3Zm0 5a3 3 0 1 1 0 6a3 3 0 0 1 0-6Zm0 10.2a8.6 8.6 0 0 1-3.6-3.2c.6-1.2 1.9-2 3.6-2s3 .8 3.6 2A8.6 8.6 0 0 1 12 17.2Z"/></svg>
              ${escapeHtml(safetyLabel)}
            </span>
            <span class="food-safety-banner__score">${restaurant.safetyPercent}% · ${restaurant.safetyGrade}</span>
          </div>
          <div class="location-line">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 6 12.2 6.3 12.6a1 1 0 0 0 1.4 0C13 21.2 19 14.2 19 9a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>
            ${escapeHtml(restaurant.address)}
          </div>
        </div>
      </article>
    `;
  }

  function selectRestaurant(restaurantId, shouldPan) {
    state.selectedRestaurantId = restaurantId;
    render();
    focusSelectedOnMap(shouldPan);
    scrollSelectedCardIntoView();
  }

  function renderPreview() {
    const restaurant = state.currentRestaurants.find((item) => item.id === state.selectedRestaurantId);
    if (!restaurant) {
      refs.mapPreview.hidden = true;
      return;
    }

    refs.mapPreview.hidden = false;
    refs.mapPreview.innerHTML = `
      <img src="${restaurant.image}" alt="${escapeHtml(restaurant.name)} thumbnail" />
      <div>
        <h3>${escapeHtml(restaurant.name)}</h3>
        <div class="preview-row">
          <span class="star">★</span>
          <strong>${restaurant.rating.toFixed(1)}</strong>
          <span>•</span>
          <span>${escapeHtml(restaurant.cuisine)}</span>
        </div>
        <div class="preview-row">
          <span>Safety: ${restaurant.safetyScore.toFixed(1)}/5.0</span>
        </div>
        <p class="preview-address">${escapeHtml(restaurant.address)}</p>
      </div>
    `;
  }

  function updateMarkers() {
    if (!state.mapReady || !state.map) {
      return;
    }

    clearMarkers();

    state.currentRestaurants.forEach((restaurant) => {
      const tone = getSafetyTone(restaurant.safetyScore);
      const colorMap = {
        success: "#22c55e",
        warning: "#facc15",
        danger: "#ef4444",
      };
      const textColor = tone === "warning" ? "#111827" : "#ffffff";
      const isSelected = restaurant.id === state.selectedRestaurantId;
      const marker = new window.google.maps.Marker({
        position: toLatLng(restaurant.coordinates),
        map: state.map,
        title: restaurant.name,
        zIndex: isSelected ? 500 : 200,
        icon: createGooglePinIcon({
          fillColor: colorMap[tone],
          text: restaurant.safetyScore.toFixed(1),
          textColor,
          scale: isSelected ? 1.12 : 1,
        }),
      });

      marker.addListener("click", () => {
        selectRestaurant(restaurant.id, true);
      });

      state.markers.set(restaurant.id, marker);
    });
  }

  function clearMarkers() {
    state.markers.forEach((marker) => marker.setMap(null));
    state.markers.clear();
  }

  function focusSelectedOnMap(shouldPan) {
    if (!state.mapReady || !state.map) {
      return;
    }

    const restaurant = state.currentRestaurants.find((item) => item.id === state.selectedRestaurantId);
    if (!restaurant) {
      return;
    }

    if (shouldPan) {
      state.map.panTo(toLatLng(restaurant.coordinates));
      state.map.setZoom(15);
    }
  }

  function scrollSelectedCardIntoView() {
    const activeCard = refs.restaurantList.querySelector(`[data-restaurant-id="${state.selectedRestaurantId}"]`);
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function openDrawer() {
    refs.drawer.hidden = false;
    refs.overlay.hidden = false;
    requestAnimationFrame(() => {
      refs.drawer.classList.add("is-open");
      refs.overlay.classList.add("is-visible");
    });
    refs.openFilterButton.setAttribute("aria-expanded", "true");
    refs.closeFilterButton.focus();
  }

  function closeDrawer() {
    if (refs.drawer.hidden) {
      return;
    }

    refs.drawer.classList.remove("is-open");
    refs.overlay.classList.remove("is-visible");
    refs.openFilterButton.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      refs.drawer.hidden = true;
      refs.overlay.hidden = true;
    }, 240);
  }
});
