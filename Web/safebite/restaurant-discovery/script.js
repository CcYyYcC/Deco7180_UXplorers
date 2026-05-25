const GOOGLE_MAPS_API_KEY =
  typeof window !== "undefined" && typeof window.GOOGLE_MAPS_API_KEY === "string"
    ? window.GOOGLE_MAPS_API_KEY.trim()
    : "";

document.addEventListener("DOMContentLoaded", () => {
  const { restaurants } = window.SafeBiteData;
  const {
    createGooglePinIcon,
    createMapFallback,
    escapeHtml,
    formatEatSafeSmileyHtml,
    formatMiles,
    getEatSafeRating,
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
      sortByRating: false,
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

  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    state.filters.query = initialQuery.trim().toLowerCase();
  }

  const refs = {
    searchInput: document.querySelector("#searchInput"),
    restaurantList: document.querySelector("#restaurantList"),
    resultsCount: document.querySelector("#resultsCount"),
    mapElement: document.querySelector("#discoveryMap"),
    mapPreview: document.querySelector("#mapPreview"),
    layout: document.querySelector("#discoveryLayout"),
    sidebarToggle: document.querySelector("#sidebarToggle"),
    sidebarExpandToggle: document.querySelector("#sidebarExpandToggle"),
    sidebarToggleLabel: document.querySelector(".sidebar-toggle__label"),
    openFilterButton: document.querySelector("#openFilterButton"),
    closeFilterButton: document.querySelector("#closeFilterButton"),
    applyFiltersButton: document.querySelector("#applyFiltersButton"),
    clearFiltersButton: document.querySelector("#clearFiltersButton"),
    drawer: document.querySelector("#filterDrawer"),
    overlay: document.querySelector("#drawerOverlay"),
    prioritySlider: document.querySelector("#safetyPriority"),
    ratingSortToggle: document.querySelector("#ratingSortToggle"),
    priorityBadge: document.querySelector("#priorityBadge"),
    priorityDescription: document.querySelector("#priorityDescription"),
    restaurantModal: document.querySelector("#restaurantModal"),
    restaurantModalOverlay: document.querySelector("#restaurantModalOverlay"),
    restaurantModalContent: document.querySelector("#restaurantModalContent"),
    closeRestaurantModal: document.querySelector("#closeRestaurantModal"),
  };

  const FOOD_SAFETY_DATA_SOURCE_URL =
    "https://data.brisbane.qld.gov.au/explore/dataset/food-safety-permits/information/?disjunctive.permit_name&disjunctive.business_address_suburb_list&sort=index&dataChart=eyJxdWVyaWVzIjpbeyJjb25maWciOnsiZGF0YXNldCI6ImZvb2Qtc2FmZXR5LXBlcm1pdHMiLCJvcHRpb25zIjp7ImRpc2p1bmN0aXZlLnBlcm1pdF9uYW1lIjp0cnVlLCJkaXNqdW5jdGl2ZS5idXNpbmVzc19hZGRyZXNzX3N1YnVyYl9saXN0Ijp0cnVlLCJzb3J0IjoiaW5kZXgifX0sImNoYXJ0cyI6W3siYWxpZ25Nb250aCI6dHJ1ZSwidHlwZSI6ImNvbHVtbiIsImZ1bmMiOiJDT1VOVCIsInNjaWVudGlmaWNEaXNwbGF5Ijp0cnVlLCJjb2xvciI6IiMwMDY3YjEifV0sInhBeGlzIjoiZWF0X3NhZmVfcmF0aW5nIiwibWF4cG9pbnRzIjo1MCwic29ydCI6IiJ9XSwidGltZXNjYWxlIjoiIiwiZGlzcGxheUxlZ2VuZCI6dHJ1ZSwiYWxpZ25Nb250aCI6dHJ1ZX0%3D";

  const inspectionDatesByRestaurant = {
    "longwang-restaurant": "12 May 2026",
    "opa-bar-and-mezze": "8 May 2026",
    "babylon-brisbane": "30 April 2026",
    "dark-shepherd": "22 April 2026",
    "toscano-bar-and-kitchen": "18 April 2026",
    "massimo-restaurant-and-bar": "15 April 2026",
    "mr-wabi": "9 April 2026",
    "donna-chang": "2 April 2026",
    "madame-wu": "26 March 2026",
    "naldham-house": "19 March 2026",
  };

  const inspectionSummaries = {
    5: {
      status: "Compliant",
      result: "Excellent",
      complaintRecord: "Low complaint record",
      followUp: "Routine inspection only",
    },
    4: {
      status: "Compliant with minor notes",
      result: "Good",
      complaintRecord: "Moderate complaint record",
      followUp: "Minor follow-up recommended",
    },
    3: {
      status: "Improvement required",
      result: "Needs attention",
      complaintRecord: "Recent complaint record",
      followUp: "Follow-up inspection recommended",
    },
  };

  const reviewsByRestaurant = {
    "longwang-restaurant": [
      {
        name: "Emily Chen",
        rating: 5,
        text: "Elegant room, quick service, and the staff explained the seafood options clearly. A reassuring choice for a first night in Brisbane.",
      },
      {
        name: "James Walker",
        rating: 5,
        text: "The dining area felt calm and clean. Food arrived hot, and the Eat Safe 5 score matched the experience.",
      },
      {
        name: "Priya Nair",
        rating: 4,
        text: "Great city location and polished service. I would book ahead next time because it became busy fast.",
      },
    ],
    "opa-bar-and-mezze": [
      {
        name: "Sofia Papadakis",
        rating: 5,
        text: "Bright, lively atmosphere with generous mezze plates. Staff were attentive without rushing the table.",
      },
      {
        name: "Oliver Smith",
        rating: 4,
        text: "Excellent riverside stop for sharing plates. The wait was close to the estimate, which helped with our route plan.",
      },
      {
        name: "Hannah Lee",
        rating: 5,
        text: "Fresh dips, warm bread, and very clear allergen guidance. It felt visitor-friendly and easy to trust.",
      },
    ],
    "babylon-brisbane": [
      {
        name: "Noah Williams",
        rating: 4,
        text: "Good for a relaxed group meal. The view and location were the highlights, and the staff handled a busy service well.",
      },
      {
        name: "Aisha Khan",
        rating: 4,
        text: "Flavours were strong and the menu had enough variety for different diets. I liked seeing the safety score before deciding.",
      },
      {
        name: "Lucas Martin",
        rating: 5,
        text: "Friendly team and a memorable setting near the river. The food came out neatly plated and fresh.",
      },
    ],
    "dark-shepherd": [
      {
        name: "Grace Thompson",
        rating: 4,
        text: "Stylish venue and excellent grilled dishes. I would like clearer safety information on the menu before ordering.",
      },
      {
        name: "Daniel Roberts",
        rating: 4,
        text: "The staff were helpful and the meal was enjoyable, but the lower Eat Safe score made me choose simpler dishes.",
      },
      {
        name: "Mei Lin",
        rating: 3,
        text: "Nice atmosphere for dinner, though service felt stretched. I would check recent inspection details before returning.",
      },
    ],
    "toscano-bar-and-kitchen": [
      {
        name: "Isabella Rossi",
        rating: 5,
        text: "Warm service, beautiful pasta, and a spotless open dining area. The high safety score made it an easy pick.",
      },
      {
        name: "Ethan Brown",
        rating: 4,
        text: "Great for a polished Italian lunch. Prices are higher, but the food quality and location felt worth it.",
      },
      {
        name: "Chloe Wilson",
        rating: 5,
        text: "Comfortable seating and clear menu guidance. I would recommend it to visitors who want something reliable.",
      },
    ],
    "massimo-restaurant-and-bar": [
      {
        name: "Liam Anderson",
        rating: 4,
        text: "Lovely river setting and strong seafood options. Service was professional even during a busy dinner window.",
      },
      {
        name: "Zara Ahmed",
        rating: 5,
        text: "The staff checked dietary needs carefully, which made the whole meal feel safer and more relaxed.",
      },
      {
        name: "Matthew Taylor",
        rating: 4,
        text: "Good choice for a scenic meal. The safety rating was solid, though I would like more visible hygiene notes on the page.",
      },
    ],
    "mr-wabi": [
      {
        name: "Sophie Nguyen",
        rating: 5,
        text: "Fun atmosphere with quick, flavourful dishes. The table turnover was fast but the service still felt personal.",
      },
      {
        name: "Jack Miller",
        rating: 4,
        text: "A convenient stop near the city centre. The food was fresh, and the wait time estimate was accurate.",
      },
      {
        name: "Nina Patel",
        rating: 5,
        text: "Great for visitors who want Asian food without too much planning. Clean setting and confident staff.",
      },
    ],
    "donna-chang": [
      {
        name: "Ruby Harris",
        rating: 4,
        text: "Beautiful interior and careful Cantonese dishes. The team was helpful when we asked about ingredients.",
      },
      {
        name: "Aaron Li",
        rating: 5,
        text: "Excellent lunch spot with smooth service. The food safety score made it feel dependable for guests.",
      },
      {
        name: "Maya Johnson",
        rating: 4,
        text: "Refined food and a central address. It felt a little formal, but very comfortable once seated.",
      },
    ],
    "madame-wu": [
      {
        name: "Ben Carter",
        rating: 4,
        text: "Great view and creative dishes. I liked the restaurant, although the safety score made me compare it with nearby options.",
      },
      {
        name: "Lily Zhang",
        rating: 5,
        text: "Service was warm and the menu was easy to navigate. A strong pick for a riverside dinner.",
      },
      {
        name: "Amelia Davis",
        rating: 4,
        text: "The setting is memorable and the food tasted fresh. I would return for the atmosphere.",
      },
    ],
    "naldham-house": [
      {
        name: "Henry Clark",
        rating: 5,
        text: "Relaxed but polished, with friendly staff and a comfortable dining room. A good option for modern Australian food.",
      },
      {
        name: "Ella Robinson",
        rating: 4,
        text: "The short wait was a bonus. Food quality was strong, and the location worked well for our walking route.",
      },
      {
        name: "Sam Wilson",
        rating: 4,
        text: "Nice balance of casual and special. I appreciated seeing the safety score alongside the user rating.",
      },
    ],
  };

  initialize();

  async function initialize() {
    bindEvents();
    refs.searchInput.value = initialQuery ? initialQuery.trim() : "";
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

    refs.ratingSortToggle.addEventListener("change", (event) => {
      state.filters.sortByRating = event.currentTarget.checked;
      render();
    });

    refs.openFilterButton.addEventListener("click", openDrawer);
    refs.sidebarToggle.addEventListener("click", toggleSidebar);
    refs.sidebarExpandToggle.addEventListener("click", toggleSidebar);
    refs.closeFilterButton.addEventListener("click", closeDrawer);
    refs.overlay.addEventListener("click", closeDrawer);
    refs.closeRestaurantModal.addEventListener("click", closeRestaurantModal);
    refs.restaurantModalOverlay.addEventListener("click", closeRestaurantModal);
    refs.restaurantModalContent.addEventListener("click", (event) => {
      const safetyButton = event.target.closest("[data-safety-report]");
      if (safetyButton) {
        openSafetyReport(safetyButton.dataset.safetyReport);
        return;
      }

      if (event.target.closest("[data-close-safety-report]")) {
        closeSafetyReport();
      }
    });
    refs.applyFiltersButton.addEventListener("click", closeDrawer);
    refs.clearFiltersButton.addEventListener("click", () => {
      state.filters = {
        query: state.filters.query,
        sortByRating: false,
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
        closeSafetyReport();
        closeDrawer();
        closeRestaurantModal();
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
    refs.ratingSortToggle.checked = state.filters.sortByRating;
    syncPriorityState();
  }

  function syncPriorityState() {
    const label = getPriorityLabel(state.filters.priority);
    const minimum = getPrioritySafetyMinimum(state.filters.priority);
    refs.priorityBadge.textContent = label;
    refs.priorityDescription.textContent = `${label} importance: ${getPriorityDescription(
      state.filters.priority
    )} Showing Eat Safe ${minimum}+ restaurants.`;
  }

  async function initializeMap() {
    if (
      !GOOGLE_MAPS_API_KEY ||
      GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" ||
      GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE"
    ) {
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
    const prioritySafetyMinimum = getPrioritySafetyMinimum(state.filters.priority);
    const filtered = restaurants.filter((restaurant) => {
      const matchesQuery =
        query.length === 0 ||
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.address.toLowerCase().includes(query);

      const eatSafeRating = getEatSafeRating(restaurant);
      const matchesPrioritySafety = query.length > 0 || eatSafeRating >= prioritySafetyMinimum;

      const matchesAvailability = [...state.filters.availability].every((filterKey) => restaurant[filterKey]);

      const matchesPrice = state.filters.price === "all" || restaurant.priceLevel === state.filters.price;

      const matchesDistance =
        state.filters.distance === "any" || restaurant.distance <= Number(state.filters.distance);

      const matchesCategory =
        state.filters.category === "all" || restaurant.category === state.filters.category;

      return (
        matchesQuery &&
        matchesPrioritySafety &&
        matchesAvailability &&
        matchesPrice &&
        matchesDistance &&
        matchesCategory
      );
    });

    if (state.filters.sortByRating) {
      return [...filtered].sort(
        (first, second) =>
          second.rating - first.rating ||
          getEatSafeRating(second) - getEatSafeRating(first) ||
          first.distance - second.distance
      );
    }

    return sortRestaurantsByPriority(filtered, state.filters.priority);
  }

  function getPrioritySafetyMinimum(priority) {
    if (priority >= 67) {
      return 5;
    }

    if (priority >= 34) {
      return 4;
    }

    return 3;
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
      card.addEventListener("click", () => {
        selectRestaurant(card.dataset.restaurantId, true);
        openRestaurantModal(card.dataset.restaurantId);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRestaurant(card.dataset.restaurantId, true);
          openRestaurantModal(card.dataset.restaurantId);
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

  function renderRestaurantCard(restaurant, index) {
    const isSelected = restaurant.id === state.selectedRestaurantId;
    const eatSafeRating = getEatSafeRating(restaurant);
    const safetyLabel = getSafetyLabel(eatSafeRating);
    const safetyToneClass =
      eatSafeRating >= 5 ? "is-eat-safe-5" : eatSafeRating >= 4 ? "is-eat-safe-4" : "is-eat-safe-3";
    const openStatus = restaurant.openNow ? "Open Now" : "Lunch Spot";

    return `
      <article
        class="restaurant-card ${isSelected ? "is-selected" : ""}"
        tabindex="0"
        data-restaurant-id="${restaurant.id}"
        aria-label="${escapeHtml(restaurant.name)}"
      >
        <div class="restaurant-card__media">
          <img
            src="${restaurant.image}"
            alt="${escapeHtml(restaurant.name)} dining area"
            loading="${index === 0 ? "eager" : "lazy"}"
            fetchpriority="${index === 0 ? "high" : "auto"}"
            decoding="async"
          />
          <span class="overlay-badge overlay-badge--open">${openStatus}</span>
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
            <span class="dot">·</span>
            <span>${escapeHtml(restaurant.cuisine)}</span>
            <span class="dot">·</span>
            <span>${formatMiles(restaurant.distance)}</span>
          </div>
          <div class="food-safety-banner ${safetyToneClass}">
            <span class="food-safety-banner__label">
              ${escapeHtml(safetyLabel)} Food Safety
            </span>
            <span class="food-safety-banner__smiley" aria-label="${eatSafeRating} out of 5 food safety rating">
              ${formatEatSafeSmileyHtml(restaurant, { size: 34, className: "food-safety-smiley" })}
            </span>
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
          <span>·</span>
          <span>${escapeHtml(restaurant.cuisine)}</span>
        </div>
        <div class="preview-row">
          <span>Safety: ${escapeHtml(getSafetyLabel(getEatSafeRating(restaurant)))}</span>
        </div>
        <p class="preview-address">${escapeHtml(restaurant.address)}</p>
      </div>
    `;
  }

  function openRestaurantModal(restaurantId) {
    const restaurant = state.currentRestaurants.find((item) => item.id === restaurantId);
    if (!restaurant) {
      return;
    }

    refs.restaurantModalContent.innerHTML = renderRestaurantModalContent(restaurant);
    refs.restaurantModal.hidden = false;
    refs.restaurantModalOverlay.hidden = false;
    document.body.classList.add("is-filter-open");

    requestAnimationFrame(() => {
      refs.restaurantModal.classList.add("is-open");
      refs.restaurantModalOverlay.classList.add("is-visible");
    });

    refs.closeRestaurantModal.focus();
  }

  function openSafetyReport(restaurantId) {
    const report = refs.restaurantModalContent.querySelector(`[data-safety-report-panel="${restaurantId}"]`);
    if (!report) {
      return;
    }

    report.hidden = false;
    report.classList.add("is-open");
  }

  function closeSafetyReport() {
    const report = refs.restaurantModalContent.querySelector(".safety-report-panel.is-open");
    if (!report) {
      return;
    }

    report.classList.remove("is-open");
    window.setTimeout(() => {
      report.hidden = true;
    }, 180);
  }

  function closeRestaurantModal() {
    if (refs.restaurantModal.hidden) {
      return;
    }

    closeSafetyReport();
    refs.restaurantModal.classList.remove("is-open");
    refs.restaurantModalOverlay.classList.remove("is-visible");
    window.setTimeout(() => {
      refs.restaurantModal.hidden = true;
      refs.restaurantModalOverlay.hidden = true;
      if (refs.drawer.hidden) {
        document.body.classList.remove("is-filter-open");
      }
    }, 220);
  }

  function renderRestaurantModalContent(restaurant) {
    const eatSafeRating = getEatSafeRating(restaurant);
    const safetyLabel = getSafetyLabel(eatSafeRating);
    const safetyToneClass =
      eatSafeRating >= 5 ? "is-eat-safe-5" : eatSafeRating >= 4 ? "is-eat-safe-4" : "is-eat-safe-3";
    const inspection = inspectionSummaries[eatSafeRating] ?? inspectionSummaries[3];
    const reviews = (reviewsByRestaurant[restaurant.id] ?? [])
      .map(
        (review) => `
          <article class="review-card">
            <div class="review-card__header">
              <strong>${escapeHtml(review.name)}</strong>
              <span>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
            </div>
            <p>${escapeHtml(review.text)}</p>
          </article>
        `
      )
      .join("");

    return `
      <div class="restaurant-modal__body">
        <section class="restaurant-modal__info" aria-label="${escapeHtml(restaurant.name)} details">
          <div class="restaurant-modal__hero">
            <img src="${restaurant.image}" alt="${escapeHtml(restaurant.name)} dining area" />
          </div>

          <div class="restaurant-modal__info-body">
            <div class="restaurant-modal__title-row">
              <div>
                <p class="restaurant-modal__eyebrow">${escapeHtml(restaurant.cuisine)} · ${restaurant.priceLevel}</p>
                <h2 id="restaurantModalTitle">${escapeHtml(restaurant.name)}</h2>
              </div>
              <span class="restaurant-modal__status">${restaurant.openNow ? "Open Now" : "Lunch Spot"}</span>
            </div>

            <div class="restaurant-modal__stats">
              <div>
                <span>Rating</span>
                <strong>${restaurant.rating.toFixed(1)}</strong>
                <small>User score</small>
              </div>
              <div>
                <span>Reviews</span>
                <strong>${restaurant.reviewCount.toLocaleString()}</strong>
                <small>User ratings</small>
              </div>
              <div>
                <span>Wait</span>
                <strong>${escapeHtml(restaurant.waitTime.replace(" wait", ""))}</strong>
                <small>Estimated wait</small>
              </div>
            </div>

            <button
              class="food-safety-banner food-safety-banner--button ${safetyToneClass}"
              type="button"
              data-safety-report="${restaurant.id}"
              aria-label="Open government food safety report for ${escapeHtml(restaurant.name)}"
            >
              <span class="food-safety-banner__label">
                ${escapeHtml(safetyLabel)} Food Safety
              </span>
              <span class="food-safety-banner__smiley" aria-label="${eatSafeRating} out of 5 food safety rating">
                ${formatEatSafeSmileyHtml(restaurant, { size: 38, className: "food-safety-smiley" })}
              </span>
            </button>

            <dl class="restaurant-modal__details">
              <div><dt>Address</dt><dd>${escapeHtml(restaurant.address)}</dd></div>
              <div><dt>Distance</dt><dd>${formatMiles(restaurant.distance)} from current area</dd></div>
              <div><dt>Availability</dt><dd>${restaurant.openForLunch ? "Open for lunch" : "Limited lunch availability"}</dd></div>
            </dl>
          </div>
        </section>

        <aside class="restaurant-modal__reviews" aria-label="${escapeHtml(restaurant.name)} user reviews">
          <h3>User Reviews</h3>
          ${reviews}
        </aside>

        <aside
          class="safety-report-panel"
          data-safety-report-panel="${restaurant.id}"
          aria-label="Government food safety report for ${escapeHtml(restaurant.name)}"
          hidden
        >
          <div class="safety-report-panel__card">
            <button class="safety-report-panel__close" type="button" data-close-safety-report aria-label="Close food safety report">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"/></svg>
            </button>
            <p class="safety-report-panel__eyebrow">Queensland Government Food Safety Report</p>
            <h3>${escapeHtml(restaurant.name)}</h3>
            <div class="safety-report-panel__rating ${safetyToneClass}">
              <span>${formatEatSafeSmileyHtml(restaurant, { size: 46, className: "food-safety-smiley" })}</span>
              <div>
                <strong>${escapeHtml(safetyLabel)}</strong>
                <small>Eat Safe ${eatSafeRating} / 5</small>
              </div>
            </div>
            <dl class="safety-report-panel__details">
              <div><dt>Inspection result</dt><dd>${escapeHtml(inspection.result)}</dd></div>
              <div><dt>Compliance status</dt><dd>${escapeHtml(inspection.status)}</dd></div>
              <div><dt>Inspection date</dt><dd>${escapeHtml(inspectionDatesByRestaurant[restaurant.id] || "12 May 2026")}</dd></div>
              <div><dt>Complaint record</dt><dd>${escapeHtml(inspection.complaintRecord)}</dd></div>
              <div><dt>Follow-up action</dt><dd>${escapeHtml(inspection.followUp)}</dd></div>
              <div><dt>Inspection authority</dt><dd>Brisbane City Council food business monitoring</dd></div>
            </dl>
            <a class="safety-report-panel__source" href="${FOOD_SAFETY_DATA_SOURCE_URL}" target="_blank" rel="noopener noreferrer">
              View data source
            </a>
          </div>
        </aside>
      </div>
    `;
  }

  function updateMarkers() {
    if (!state.mapReady || !state.map) {
      return;
    }

    clearMarkers();

    state.currentRestaurants.forEach((restaurant) => {
      const eatSafeRating = getEatSafeRating(restaurant);
      const tone = getSafetyTone(eatSafeRating);
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
        zIndex: isSelected ? 900 : 200,
        icon: createGooglePinIcon({
          fillColor: colorMap[tone],
          text: String(eatSafeRating),
          textColor: isSelected ? "#111111" : textColor,
          scale: isSelected ? 1.34 : 1,
          borderColor: isSelected ? "#111111" : "#ffffff",
          borderWidth: isSelected ? 7 : 3,
          innerBorderColor: isSelected ? "#ffffff" : "",
          innerBorderWidth: isSelected ? 2.5 : 0,
          shadowColor: isSelected ? "rgba(0,0,0,0)" : "rgba(15,23,42,0.18)",
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

  function toggleSidebar() {
    const isCollapsed = refs.layout.classList.toggle("is-sidebar-collapsed");
    refs.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    refs.sidebarToggle.setAttribute(
      "aria-label",
      isCollapsed ? "Expand restaurant list" : "Collapse restaurant list"
    );
    refs.sidebarToggle.title = isCollapsed ? "Expand restaurant list" : "Collapse restaurant list";
    refs.sidebarToggleLabel.textContent = isCollapsed ? "Expand" : "Collapse";
    refs.sidebarExpandToggle.setAttribute("aria-expanded", String(!isCollapsed));

    if (state.mapReady && state.map) {
      window.setTimeout(() => {
        window.google.maps.event.trigger(state.map, "resize");
        focusSelectedOnMap(false);
      }, 260);
    }
  }

  function openDrawer() {
    refs.drawer.hidden = false;
    refs.overlay.hidden = false;
    document.body.classList.add("is-filter-open");
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
      document.body.classList.remove("is-filter-open");
    }, 240);
  }
});


