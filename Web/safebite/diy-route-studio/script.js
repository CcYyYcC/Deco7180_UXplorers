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
        directionsService: null,
        directionsRenderer: null,
        previousSummary: null, // 用于记录上一次的状态以计算 Delta
    };

    const refs = {
        wishlistSearch: document.querySelector("#wishlistSearch"),
        wishlistList: document.querySelector("#wishlistList"),
        itineraryList: document.querySelector("#itineraryList"),
        dropZone: document.querySelector("#dropZone"),
        totalDistance: document.querySelector("#totalDistance"),
        walkingTime: document.querySelector("#walkingTime"),
        waitingTime: document.querySelector("#waitingTime"),
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
                "Map preview requires a Google Maps API key. Add it near the top of diy-route-studio/script.js.",
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
            center: { lat: -27.476, lng: 153.024 }, // Brisbane CBD
            zoom: 14.2,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
        });

        // 初始化导航服务与渲染器，替代原本的 Polyline
        state.directionsService = new window.google.maps.DirectionsService();
        state.directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: state.map,
            suppressMarkers: true, // 隐藏默认图钉，保留我们的红色圆点
            preserveViewport: true, // 避免自动缩放冲突
            polylineOptions: {
                strokeColor: "#ef4444", // 保持原来的红色线条风格
                strokeOpacity: 0.94,
                strokeWeight: 5,
            },
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
                const haystack =
                    `${restaurant.name} ${restaurant.cuisine} ${restaurant.category}`.toLowerCase();
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
            <div style="width: 100%;">
              <h3>${escapeHtml(restaurant.name)}</h3>
              
              <div class="wishlist-meta">
                <button type="button" class="grade-pill grade-pill--interactive" title="Verify Official Safety Report">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                  ${restaurant.safetyGrade} / ${restaurant.safetyPercent}%
                </button>
                <span>${restaurant.priceLevel}</span>
              </div>
              
              <div class="wishlist-meta wishlist-actions">
                <span>${escapeHtml(restaurant.cuisine)}</span>
                <button type="button" class="button-menu-preview" aria-label="View Menu Images">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  Menu
                </button>
              </div>
            </div>
          </article>
        `,
            )
            .join("");

        refs.wishlistList.querySelectorAll(".wishlist-card").forEach((card) => {
            card.addEventListener("dragstart", () => {
                state.draggedItem = {
                    source: "wishlist",
                    restaurantId: card.dataset.wishlistId,
                };
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
                <span>${restaurant.waitTime} wait</span>
                <span>•</span>
                <span>${escapeHtml(restaurant.cuisine)}</span>
              </div>
            </div>
            <button class="remove-stop" type="button" data-remove-id="${restaurant.id}" aria-label="Remove ${escapeHtml(
                restaurant.name,
            )}">×</button>
          </article>
        `;
            })
            .join("");

        refs.itineraryList.querySelectorAll(".remove-stop").forEach((button) => {
            button.addEventListener("click", () => {
                state.itineraryIds = state.itineraryIds.filter(
                    (restaurantId) => restaurantId !== button.dataset.removeId,
                );
                persistItinerary();
                render();
            });
        });

        refs.itineraryList.querySelectorAll(".itinerary-card").forEach((card) => {
            card.addEventListener("dragstart", () => {
                state.draggedItem = {
                    source: "itinerary",
                    restaurantId: card.dataset.itineraryId,
                };
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

    function generateDeltaHtml(diff, unit) {
        if (Math.abs(diff) < 0.1) return "";
        const isIncrease = diff > 0;
        const colorClass = isIncrease ? "is-positive" : "is-negative";
        const sign = isIncrease ? "+" : "";
        const val = unit === "km" ? diff.toFixed(1) : Math.round(diff);
        return `<span class="delta-badge ${colorClass}">${sign}${val}${unit}</span>`;
    }

    function renderSummary() {
        const summary = calculateItinerarySummary(state.itineraryIds);
        const stops = state.itineraryIds.map((id) => getRestaurantById(id)).filter(Boolean);

        let totalWaitMins = 0;
        stops.forEach((stop) => {
            const min = parseInt(stop.waitTime);
            if (!isNaN(min)) totalWaitMins += min;
        });

        const currentData = {
            dist: summary.totalDistance,
            walk: summary.totalWalkingMinutes,
            wait: totalWaitMins,
        };

        const prev = state.previousSummary || currentData;

        refs.totalDistance.innerHTML = `${formatKm(currentData.dist)} ${generateDeltaHtml(currentData.dist - prev.dist, "km")}`;
        refs.walkingTime.innerHTML = `${formatDurationClock(currentData.walk)} ${generateDeltaHtml(currentData.walk - prev.walk, "m")}`;
        refs.waitingTime.innerHTML = `${formatDurationClock(currentData.wait)} ${generateDeltaHtml(currentData.wait - prev.wait, "m")}`;
        refs.priceLevel.textContent = summary.priceLevel;

        state.previousSummary = currentData;
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
          summary.totalWalkingMinutes,
      )} walk · ${formatDurationClock(totalWaitMins)} wait</span>
    `;
    }

    function drawItineraryOnMap() {
        if (!state.mapReady || !state.map) {
            return;
        }

        clearRouteMarkers();

        const stops = state.itineraryIds
            .map((restaurantId) => getRestaurantById(restaurantId))
            .filter(Boolean);
        const positions = stops.map((stop) => toLatLng(stop.coordinates));

        if (stops.length === 0) {
            state.map.setCenter({ lat: -27.476, lng: 153.024 });
            state.map.setZoom(14.2);
            return;
        }

        // 1. 绘制我们自定义的带字母（A, B, C）的红色打卡图钉
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

        const summary = calculateItinerarySummary(state.itineraryIds);

        // 如果只有一个地点，仅聚焦，不计算路线
        if (positions.length === 1) {
            fitGoogleMapToPositions(state.map, positions, 96);
            return;
        }

        // 2. 如果有多个地点，调用 Google Directions API 规划【真实步行】路线
        const waypoints = positions
            .slice(1, -1)
            .map((pos) => ({ location: pos, stopover: true }));
        const request = {
            origin: positions[0],
            destination: positions[positions.length - 1],
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.WALKING, // 关键：指定为步行模式，会自动找桥梁过河
        };

        state.directionsService.route(request, (response, status) => {
            if (status === "OK") {
                // 渲染真实路线到地图上
                state.directionsRenderer.setDirections(response);

                // 为路线的每一段 (leg) 添加时间气泡标签
                response.routes[0].legs.forEach((leg, index) => {
                    // 找到这一段路径大概中间的步骤位置来放置徽章
                    const middleStep = leg.steps[Math.floor(leg.steps.length / 2)];
                    const badgeLabel = summary.segmentTimes[index] || leg.duration.text;

                    const badge = new window.google.maps.Marker({
                        position: middleStep.start_location,
                        map: state.map,
                        clickable: false,
                        zIndex: 120,
                        icon: createGoogleBadgeIcon(badgeLabel),
                    });
                    state.segmentMarkers.push(badge);
                });
            } else {
                console.warn("Directions request failed due to " + status);
            }
        });

        // 根据所有坐标点缩放视野
        fitGoogleMapToPositions(state.map, positions, 96);
    }

    function clearRouteMarkers() {
        // 清除自定义图钉
        state.routeMarkers.forEach((marker) => marker.setMap(null));
        state.segmentMarkers.forEach((marker) => marker.setMap(null));
        state.routeMarkers = [];
        state.segmentMarkers = [];

        // 清除真实的导航连线
        if (state.directionsRenderer) {
            state.directionsRenderer.setDirections({ routes: [] });
        }
    }

    function openModal() {
        const summary = calculateItinerarySummary(state.itineraryIds);
        refs.confirmationSummary.textContent = `${state.itineraryIds.length} stop${
            state.itineraryIds.length === 1 ? "" : "s"
        } · ${formatKm(summary.totalDistance)} total distance · ${formatDurationClock(
            summary.totalWalkingMinutes,
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
