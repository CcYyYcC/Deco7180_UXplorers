document.addEventListener("DOMContentLoaded", () => {
    const GOOGLE_MAPS_API_KEY =
        typeof window !== "undefined" && typeof window.GOOGLE_MAPS_API_KEY === "string"
            ? window.GOOGLE_MAPS_API_KEY.trim()
            : "";
    const localWishlist = JSON.parse(localStorage.getItem("safeBiteUserWishlist"));
    const initialWishlistIds = localWishlist || [...window.SafeBiteData.diyWishlist];

    const {
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
        wishlistIds: initialWishlistIds,
        itineraryIds: savedItinerary?.length
            ? [...savedItinerary]
            : preselectedRoute?.stops?.length
              ? [...preselectedRoute.stops]
              : initialWishlistIds.slice(0, 2),
        draggedItem: null,
        map: null,
        mapReady: false,
        routeMarkers: [],
        segmentMarkers: [],
        routePolyline: null,
        directionsService: null,
        directionsRenderer: null,
        previousSummary: null,
        customStops: getSavedCustomStops(),
        savedTemplates: getSavedTemplates(),
        highlightMarker: null,
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

        // ✅ 按钮更名与合并
        saveItineraryButton: document.querySelector("#saveItineraryButton"),
        templateNameInput: document.querySelector("#templateNameInput"),
        savedTemplatesList: document.querySelector("#savedTemplatesList"),

        mapElement: document.querySelector("#diyMap"),
        mapCallout: document.querySelector("#diyMapCallout"),
        routeImportNotice: document.querySelector("#routeImportNotice"),
        clearCustomStopsButton: document.querySelector("#clearCustomStopsButton"),

        // 侧边栏控制
        sidebarToggleBtn: document.querySelector("#sidebarToggleBtn"),
        studioSidebar: document.querySelector("#studioSidebar"),

        // 弹窗
        modal: document.querySelector("#confirmationModal"),
        modalOverlay: document.querySelector("#modalOverlay"),
        closeModalButton: document.querySelector("#closeModalButton"),
        confirmationSummary: document.querySelector("#confirmationSummary"),
    };

    const ICON_PATH = "../assets/Icons%20for%20DIY%20Studio/";

    function getAnyStopById(id) {
        if (id.startsWith("custom_")) return state.customStops[id];
        return getRestaurantById(id);
    }

    initialize();

    async function initialize() {
        bindEvents();
        render();
        await initializeMap();
        drawItineraryOnMap();
    }

    function bindEvents() {
        if (refs.wishlistSearch) {
            refs.wishlistSearch.addEventListener("input", (e) => {
                state.query = e.currentTarget.value.trim().toLowerCase();
                renderWishlist();
            });
        }

        // ✅ 侧边栏折叠事件
        refs.sidebarToggleBtn.addEventListener("click", () => {
            refs.studioSidebar.classList.toggle("is-collapsed");
        });

        refs.dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            refs.dropZone.classList.add("is-active");
        });
        refs.dropZone.addEventListener("dragleave", () =>
            refs.dropZone.classList.remove("is-active"),
        );
        refs.dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            refs.dropZone.classList.remove("is-active");
            if (state.draggedItem) insertDraggedItemAtEnd();
        });

        refs.clearRouteButton.addEventListener("click", () => {
            if (confirm("Clear current itinerary?")) {
                state.itineraryIds = [];
                persistItinerary();
                render();
            }
        });

        refs.clearCustomStopsButton.addEventListener("click", () => {
            state.itineraryIds = state.itineraryIds.filter((id) => !id.startsWith("custom_"));
            persistItinerary();
            render();
        });

        // ✅ 合并的 Save Itinerary 逻辑
        refs.saveItineraryButton.addEventListener("click", () => {
            if (state.itineraryIds.length === 0) return;
            const name = refs.templateNameInput.value.trim();

            if (name) {
                // 如果填了名字，就存入下方模版列表
                state.savedTemplates[name] = [...state.itineraryIds];
                localStorage.setItem(
                    "safeBiteSavedTemplates",
                    JSON.stringify(state.savedTemplates),
                );
                refs.templateNameInput.value = "";
                renderTemplates();
            }
            openModal(name);
        });

        refs.closeModalButton.addEventListener("click", closeModal);
        refs.modalOverlay.addEventListener("click", closeModal);
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeModal();
        });
    }

    async function initializeMap() {
        if (
            !GOOGLE_MAPS_API_KEY ||
            GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" ||
            GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        ) return;
        await loadGoogleMapsApi(GOOGLE_MAPS_API_KEY);
        state.map = new window.google.maps.Map(refs.mapElement, {
            center: { lat: -27.476, lng: 153.024 },
            zoom: 14.2,
            gestureHandling: "cooperative",
            draggableCursor: "crosshair",
        });

        state.directionsService = new window.google.maps.DirectionsService();
        state.directionsRenderer = new window.google.maps.DirectionsRenderer({
            map: state.map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: "#ef4444", strokeOpacity: 0.9, strokeWeight: 5 },
        });

        state.routePolyline = new window.google.maps.Polyline({
            map: state.map,
            path: [],
            strokeColor: "#ef4444",
            strokeOpacity: 0.92,
            strokeWeight: 5,
            zIndex: 450,
        });

        state.map.addListener("click", (e) => {
            const customId = "custom_" + Date.now();
            state.customStops[customId] = {
                id: customId,
                name: "📍 Map Location",
                cuisine: "Custom Point",
                priceLevel: "-",
                waitTime: "0 mins",
                coordinates: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                isCustom: true,
            };
            localStorage.setItem("safeBiteCustomStops", JSON.stringify(state.customStops));
            state.itineraryIds.push(customId);
            persistItinerary();
            render();
        });

        state.mapReady = true;
        drawItineraryOnMap();
    }

    function render() {
        renderWishlist();
        renderItinerary();
        renderTemplates();

        if (state.itineraryIds.length === 0) {
            updateDashboard(0, 0);
            refs.saveItineraryButton.disabled = true;
            refs.clearRouteButton.disabled = true;
            refs.mapCallout.innerHTML = `<strong>No active itinerary</strong><span>Click on the map or drag saved spots to build your route.</span>`;
        } else {
            refs.saveItineraryButton.disabled = false;
            refs.clearRouteButton.disabled = false;
        }

        drawItineraryOnMap();
    }

    function renderWishlist() {
        const filtered = state.wishlistIds.map(getAnyStopById).filter((r) => {
            if (!r) return false;
            const haystack = `${r.name} ${r.cuisine}`.toLowerCase();
            return state.query.length === 0 || haystack.includes(state.query);
        });

        refs.wishlistList.innerHTML = filtered
            .map(
                (r) => `
          <article class="wishlist-card" draggable="true" data-wishlist-id="${r.id}" style="cursor: pointer;">
            <div class="drag-handle"><span></span><span></span><span></span></div>
            <img src="${r.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100"}" class="thumbnail" />
            <div style="flex:1">
              <h3 style="font-size:1rem;margin:0;margin-bottom:2px;">${escapeHtml(r.name)}</h3>
              <div class="wishlist-meta"><span class="grade-pill">${r.safetyGrade || "A"}</span> <span>${r.priceLevel || "-"}</span></div>
            </div>
            <button class="wishlist-action-btn" data-remove-id="${r.id}"><img src="${ICON_PATH}trash.png" class="ui-icon"></button>
          </article>
        `,
            )
            .join("");

        refs.wishlistList.querySelectorAll(".wishlist-card").forEach((card) => {
            card.onclick = (e) => {
                if (e.target.closest(".wishlist-action-btn")) return;
                const stop = getAnyStopById(card.dataset.wishlistId);
                const pos = stop.isCustom ? stop.coordinates : toLatLng(stop.coordinates);
                state.map.panTo(pos);
                state.map.setZoom(16);
                if (state.highlightMarker) state.highlightMarker.setMap(null);
                state.highlightMarker = new window.google.maps.Marker({
                    position: pos,
                    map: state.map,
                    animation: window.google.maps.Animation.DROP,
                    zIndex: 9999,
                    icon: {
                        url: ICON_PATH + "heart.png",
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 40),
                    },
                });
            };
            card.ondragstart = () => {
                state.draggedItem = {
                    source: "wishlist",
                    restaurantId: card.dataset.wishlistId,
                };
            };
        });

        refs.wishlistList.querySelectorAll("[data-remove-id]").forEach((btn) => {
            btn.onclick = () => {
                state.wishlistIds = state.wishlistIds.filter(
                    (id) => id !== btn.dataset.removeId,
                );
                localStorage.setItem(
                    "safeBiteUserWishlist",
                    JSON.stringify(state.wishlistIds),
                );
                render();
            };
        });
    }

    function renderItinerary() {
        refs.itineraryList.innerHTML = state.itineraryIds
            .map((id, idx) => {
                const s = getAnyStopById(id);
                if (!s) return "";
                const inWish = state.wishlistIds.includes(s.id);
                return `
          <article class="itinerary-card" draggable="true" data-itinerary-id="${s.id}">
            <span class="stop-number" style="${s.isCustom ? "background:#8c7b61" : ""}">${idx + 1}</span>
            <div style="flex:1">
              <h3 style="font-size:0.95rem;margin:0;margin-bottom:2px;">${s.isCustom ? "📌" : "🍽️"} ${escapeHtml(s.name)}</h3>
              <div class="itinerary-meta" style="font-size:0.75rem"><span>${s.waitTime || "0 mins"} wait</span></div>
            </div>
            <button class="wishlist-action-btn" data-add-wish="${s.id}">
                <img src="${ICON_PATH}heart.png" class="ui-icon" style="${inWish ? "" : "opacity:0.3;filter:grayscale(1)"}">
            </button>
            <button class="remove-stop" data-remove-id="${s.id}"><img src="${ICON_PATH}trash.png" class="ui-icon"></button>
          </article>`;
            })
            .join("");

        refs.itineraryList.querySelectorAll("[data-add-wish]").forEach((btn) => {
            btn.onclick = () => {
                if (!state.wishlistIds.includes(btn.dataset.addWish)) {
                    state.wishlistIds.unshift(btn.dataset.addWish);
                    localStorage.setItem(
                        "safeBiteUserWishlist",
                        JSON.stringify(state.wishlistIds),
                    );
                    render();
                }
            };
        });

        refs.itineraryList.querySelectorAll(".remove-stop").forEach((btn) => {
            btn.onclick = () => {
                state.itineraryIds = state.itineraryIds.filter(
                    (id) => id !== btn.dataset.removeId,
                );
                persistItinerary();
                render();
            };
        });

        refs.itineraryList.querySelectorAll(".itinerary-card").forEach((card) => {
            card.ondragstart = () => {
                state.draggedItem = {
                    source: "itinerary",
                    restaurantId: card.dataset.itineraryId,
                };
            };
            card.ondragover = (e) => e.preventDefault();
            card.ondrop = (e) => {
                e.preventDefault();
                if (state.draggedItem) insertDraggedItemBefore(card.dataset.itineraryId);
            };
        });
    }

    function updateDashboard(distKm, walkMins) {
        const stops = state.itineraryIds.map(getAnyStopById).filter(Boolean);
        let wait = 0;
        let priceLevels = [];
        stops.forEach((s) => {
            wait += parseInt(s.waitTime) || 0;
            if (s.priceLevel && s.priceLevel.includes("$"))
                priceLevels.push(s.priceLevel.length);
        });

        let finalPrice = "-";
        if (priceLevels.length > 0)
            finalPrice = "$".repeat(
                Math.round(priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length),
            );

        const current = { dist: distKm, walk: walkMins, wait: wait };
        const prev = state.previousSummary || current;

        const genDelta = (now, old, unit) => {
            const diff = now - old;
            if (Math.abs(diff) < 0.1) return "";
            return `<span class="delta-badge ${diff > 0 ? "is-positive" : "is-negative"}">${diff > 0 ? "+" : ""}${unit === "km" ? diff.toFixed(1) : Math.round(diff)}${unit}</span>`;
        };

        refs.totalDistance.innerHTML = `${formatKm(current.dist)} ${genDelta(current.dist, prev.dist, "km")}`;
        refs.walkingTime.innerHTML = `${formatDurationClock(current.walk)} ${genDelta(current.walk, prev.walk, "m")}`;
        refs.waitingTime.innerHTML = `${formatDurationClock(current.wait)} ${genDelta(current.wait, prev.wait, "m")}`;
        refs.priceLevel.textContent = finalPrice;
        state.previousSummary = current;

        if (stops.length > 0) {
            refs.mapCallout.innerHTML = `<strong>Current DIY route</strong><span>${stops.length} Stops · ${formatKm(current.dist)} · ${formatDurationClock(current.walk)} walk</span>`;
        }
    }

    // ✅ 修复：红线遗留 BUG，在每次画图前彻底强制清理 API 渲染器
    function clearRouteMarkers() {
        state.routeMarkers.forEach((m) => m.setMap(null));
        state.routeMarkers = [];
        state.segmentMarkers.forEach((m) => m.setMap(null));
        state.segmentMarkers = [];
        if (state.highlightMarker) {
            state.highlightMarker.setMap(null);
            state.highlightMarker = null;
        }
        // 最核心的清理代码
        if (state.directionsRenderer) state.directionsRenderer.setDirections({ routes: [] });
        if (state.routePolyline) state.routePolyline.setPath([]);
    }

    function getPositionValue(position, key) {
        return typeof position[key] === "function" ? position[key]() : position[key];
    }

    function calculateFallbackSummary(positions) {
        let totalKm = 0;
        for (let index = 1; index < positions.length; index += 1) {
            const previous = positions[index - 1];
            const current = positions[index];
            const previousLat = getPositionValue(previous, "lat");
            const previousLng = getPositionValue(previous, "lng");
            const currentLat = getPositionValue(current, "lat");
            const currentLng = getPositionValue(current, "lng");
            const toRadians = (degrees) => (degrees * Math.PI) / 180;
            const earthRadiusKm = 6371;
            const deltaLat = toRadians(currentLat - previousLat);
            const deltaLng = toRadians(currentLng - previousLng);
            const a =
                Math.sin(deltaLat / 2) ** 2 +
                Math.cos(toRadians(previousLat)) *
                    Math.cos(toRadians(currentLat)) *
                    Math.sin(deltaLng / 2) ** 2;
            totalKm += earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        return {
            distanceKm: totalKm,
            walkingMinutes: Math.max(1, Math.round((totalKm / 4.8) * 60)),
        };
    }

    function drawFallbackRoute(positions) {
        if (!state.routePolyline || positions.length < 2) {
            return;
        }

        state.routePolyline.setPath(positions);
        const summary = calculateFallbackSummary(positions);
        updateDashboard(summary.distanceKm, summary.walkingMinutes);
    }

    function drawItineraryOnMap() {
        if (!state.mapReady) return;

        clearRouteMarkers(); // 清理旧数据

        const stops = state.itineraryIds.map(getAnyStopById).filter(Boolean);
        const positions = stops
            .map((s) => (s.isCustom ? s.coordinates : toLatLng(s.coordinates)))
            .filter(Boolean);

        // ✅ 如果全部被 Clear 删除了，重置中心点
        if (positions.length === 0) {
            state.map.setCenter({ lat: -27.476, lng: 153.024 });
            state.map.setZoom(14.2);
            return;
        }

        positions.forEach((position, index) => {
            const isCustom = stops[index].isCustom;
            state.routeMarkers.push(
                new window.google.maps.Marker({
                    position,
                    map: state.map,
                    zIndex: 400,
                    icon: createGooglePinIcon({
                        fillColor: isCustom ? "#b88331" : "#ef4444",
                        text: String.fromCharCode(65 + index),
                        scale: 1,
                    }),
                }),
            );
        });

        if (positions.length === 1) {
            fitGoogleMapToPositions(state.map, positions, 96);
            updateDashboard(0, 0);
            return;
        }

        drawFallbackRoute(positions);

        const waypoints = positions
            .slice(1, -1)
            .map((pos) => ({ location: pos, stopover: true }));
        state.directionsService.route(
            {
                origin: positions[0],
                destination: positions[positions.length - 1],
                waypoints: waypoints,
                travelMode: window.google.maps.TravelMode.WALKING,
            },
            (response, status) => {
                if (status === "OK") {
                    state.directionsRenderer.setDirections(response);
                    if (state.routePolyline) state.routePolyline.setPath([]);
                    let totalMeters = 0;
                    let totalSeconds = 0;
                    response.routes[0].legs.forEach((leg) => {
                        totalMeters += leg.distance.value;
                        totalSeconds += leg.duration.value;
                        const middleStep = leg.steps[Math.floor(leg.steps.length / 2)];
                        state.segmentMarkers.push(
                            new window.google.maps.Marker({
                                position: middleStep.start_location,
                                map: state.map,
                                clickable: false,
                                zIndex: 120,
                                icon: createGoogleBadgeIcon(leg.duration.text),
                            }),
                        );
                    });
                    updateDashboard(totalMeters / 1000, Math.round(totalSeconds / 60));
                } else {
                    drawFallbackRoute(positions);
                }
            },
        );
        fitGoogleMapToPositions(state.map, positions, 96);
    }

    function renderTemplates() {
        if (!refs.savedTemplatesList) return;
        refs.savedTemplatesList.innerHTML = Object.keys(state.savedTemplates)
            .map(
                (name) => `
            <div class="template-tag-group">
                <button class="load-template-btn" data-name="${escapeHtml(name)}">
                    <img src="${ICON_PATH}calendar.png" class="ui-icon"> ${escapeHtml(name)}
                </button>
                <button class="delete-template-btn" data-name="${escapeHtml(name)}">
                    <img src="${ICON_PATH}trash.png" class="ui-icon">
                </button>
            </div>
        `,
            )
            .join("");

        refs.savedTemplatesList.querySelectorAll(".load-template-btn").forEach(
            (b) =>
                (b.onclick = () => {
                    state.itineraryIds = [...state.savedTemplates[b.dataset.name]];
                    persistItinerary();
                    render();
                }),
        );
        refs.savedTemplatesList.querySelectorAll(".delete-template-btn").forEach(
            (b) =>
                (b.onclick = () => {
                    delete state.savedTemplates[b.dataset.name];
                    localStorage.setItem(
                        "safeBiteSavedTemplates",
                        JSON.stringify(state.savedTemplates),
                    );
                    renderTemplates();
                }),
        );
    }

    function openModal(savedName) {
        const stopsCount = state.itineraryIds.length;
        if (stopsCount === 0) return;

        let extraMsg = savedName
            ? `It has been saved as <strong>${escapeHtml(savedName)}</strong> below.`
            : `<span style="font-size: 0.9rem; color: #8c7b61;">💡 <em>Tip: You didn't enter a name. You can still name it and save it for future use!</em></span>`;

        refs.confirmationSummary.innerHTML = `
            Awesome! You have successfully planned a food journey with <strong>${stopsCount} stops</strong>. 
            <br><br> ${extraMsg}
        `;

        refs.modal.hidden = false;
        refs.modalOverlay.hidden = false;
        requestAnimationFrame(() => {
            refs.modal.classList.add("is-open");
            refs.modalOverlay.classList.add("is-visible");
        });
        refs.closeModalButton.focus();
    }

    function closeModal() {
        refs.modal.classList.remove("is-open");
        refs.modalOverlay.classList.remove("is-visible");
        window.setTimeout(() => {
            refs.modal.hidden = true;
            refs.modalOverlay.hidden = true;
        }, 220);
    }

    function getSavedCustomStops() {
        try {
            return JSON.parse(localStorage.getItem("safeBiteCustomStops")) || {};
        } catch (e) {
            return {};
        }
    }
    function getSavedTemplates() {
        try {
            return JSON.parse(localStorage.getItem("safeBiteSavedTemplates")) || {};
        } catch (e) {
            return {};
        }
    }
    function getPreselectedRoute() {
        try {
            return JSON.parse(localStorage.getItem("safeBiteSelectedRoute"));
        } catch (e) {
            return null;
        }
    }
    function getSavedItinerary() {
        try {
            return JSON.parse(localStorage.getItem("safeBiteDIYItinerary"));
        } catch (e) {
            return null;
        }
    }
    function persistItinerary() {
        localStorage.setItem("safeBiteDIYItinerary", JSON.stringify(state.itineraryIds));
    }

    function insertDraggedItemAtEnd() {
        const { restaurantId } = state.draggedItem;
        if (!state.itineraryIds.includes(restaurantId)) state.itineraryIds.push(restaurantId);
        persistItinerary();
        render();
    }
    function insertDraggedItemBefore(targetId) {
        const { restaurantId } = state.draggedItem;
        const nextIds = state.itineraryIds.filter((id) => id !== restaurantId);
        nextIds.splice(nextIds.indexOf(targetId), 0, restaurantId);
        state.itineraryIds = nextIds;
        persistItinerary();
        render();
    }
});
