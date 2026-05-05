document.addEventListener("DOMContentLoaded", () => {
  const { restaurants, routes } = window.SafeBiteData;
  const { escapeHtml, getRouteStops, getSafetyLabel } = window.SafeBiteUtils;

  const state = {
    query: "",
  };

  const refs = {
    menuToggle: document.querySelector("#menuToggle"),
    siteDrawer: document.querySelector("#siteDrawer"),
    drawerBackdrop: document.querySelector("#drawerBackdrop"),
    searchForm: document.querySelector("#homeSearchForm"),
    searchInput: document.querySelector("#homeSearchInput"),
    featuredRestaurants: document.querySelector("#featuredRestaurants"),
    featuredRoutes: document.querySelector("#featuredRoutes"),
  };

  initialize();

  function initialize() {
    bindEvents();
    render();
  }

  function bindEvents() {
    refs.menuToggle.addEventListener("click", toggleDrawer);
    refs.drawerBackdrop.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    });

    refs.searchInput.addEventListener("input", (event) => {
      state.query = event.currentTarget.value.trim().toLowerCase();
      render();
    });

    refs.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const firstRestaurant = getFilteredRestaurants()[0];
      if (firstRestaurant) {
        window.location.href = `../restaurant-discovery/index.html`;
      }
    });
  }

  function toggleDrawer() {
    const isOpen = !refs.siteDrawer.hidden;
    if (isOpen) {
      closeDrawer();
      return;
    }
    refs.siteDrawer.hidden = false;
    refs.drawerBackdrop.hidden = false;
    refs.menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    refs.siteDrawer.hidden = true;
    refs.drawerBackdrop.hidden = true;
    refs.menuToggle.setAttribute("aria-expanded", "false");
  }

  function getFilteredRestaurants() {
    const featured = [...restaurants]
      .sort((first, second) => second.rating - first.rating || second.safetyScore - first.safetyScore)
      .slice(0, 3);

    if (!state.query) {
      return featured;
    }

    return featured.filter((restaurant) => {
      const haystack = `${restaurant.name} ${restaurant.cuisine} ${restaurant.address}`.toLowerCase();
      return haystack.includes(state.query);
    });
  }

  function getFilteredRoutes() {
    const featured = routes.filter((route) => route.mode === "solo").slice(0, 2);

    if (!state.query) {
      return featured;
    }

    return featured.filter((route) => {
      const stopNames = getRouteStops(route).map((stop) => stop.name).join(" ").toLowerCase();
      return route.name.toLowerCase().includes(state.query) || stopNames.includes(state.query);
    });
  }

  function render() {
    renderRestaurants();
    renderRoutes();
  }

  function renderRestaurants() {
    const items = getFilteredRestaurants();
    if (!items.length) {
      refs.featuredRestaurants.innerHTML = `
        <div class="search-empty">No featured restaurants match that search. Try another keyword.</div>
      `;
      return;
    }

    refs.featuredRestaurants.innerHTML = items
      .map(
        (restaurant) => `
          <article class="content-card">
            <img src="${restaurant.image}" alt="${escapeHtml(restaurant.name)} interior" />
            <div class="content-card__body">
              <span class="content-card__meta">${escapeHtml(restaurant.cuisine)} · ${restaurant.priceLevel}</span>
              <h3>${escapeHtml(restaurant.name)}</h3>
              <p>${escapeHtml(restaurant.address)} · ${restaurant.distance.toFixed(1)} mi away · ${restaurant.waitTime} min wait</p>
              <div class="content-card__footer">
                <span class="safety-pill">${restaurant.safetyScore.toFixed(1)} · ${escapeHtml(
                  getSafetyLabel(restaurant.safetyScore)
                )}</span>
                <a class="content-link" href="../restaurant-discovery/index.html">Open page</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderRoutes() {
    const items = getFilteredRoutes();
    if (!items.length) {
      refs.featuredRoutes.innerHTML = `
        <div class="search-empty">No featured routes match that search. Try another keyword.</div>
      `;
      return;
    }

    refs.featuredRoutes.innerHTML = items
      .map((route) => {
        const stopNames = getRouteStops(route)
          .map((stop) => stop.name)
          .join(" → ");

        return `
          <article class="content-card">
            <img src="../assets/images/restaurant-3.jpg" alt="${escapeHtml(route.name)} route preview" />
            <div class="content-card__body">
              <span class="content-card__meta">${route.estimatedWalkingTime} · ${route.priceLevel}</span>
              <h3>${escapeHtml(route.name)}</h3>
              <p>${escapeHtml(stopNames)}</p>
              <div class="content-card__footer">
                <span class="route-pill">Safety ${route.foodSafetyScore}/100</span>
                <a class="content-link" href="../recommended-routes/index.html">View route</a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }
});
