# SafeBite

SafeBite is a vanilla HTML, CSS, and JavaScript restaurant discovery platform designed to help tourists choose places to eat with more confidence by blending user ratings, distance, route planning, and food safety information.

## How to Run Locally

1. Open a terminal in the `safebite` folder.
2. Start a local server, for example:
   - `python3 -m http.server 8000`
3. Visit `http://localhost:8000/`.

## Google Maps API Key

Add your Google Maps JavaScript API key near the top of each page script:

- `restaurant-discovery/script.js`
- `recommended-routes/script.js`
- `diy-route-studio/script.js`

Replace:

```js
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
```

with your real key to enable the live maps.

## Pages

- `restaurant-discovery/`: Browse restaurants, rank by safety importance, search, and filter by availability, price, distance, and cuisine on a Google map of Brisbane.
- `recommended-routes/`: Explore curated food routes for solo or group travel, compare multiple route options, and send a selected route into the DIY planner.
- `diy-route-studio/`: Build or reorder your own itinerary with drag and drop, then confirm the final journey on the same Google map context.

## File Structure

```text
/safebite/
  /assets/
    /images/
      restaurant-1.jpg
      restaurant-2.jpg
      restaurant-3.jpg
      restaurant-4.jpg
      restaurant-placeholder.jpg
    /icons/
    shared-data.js
    shared-utils.js

  /restaurant-discovery/
    index.html
    styles.css
    script.js

  /recommended-routes/
    index.html
    styles.css
    script.js

  /diy-route-studio/
    index.html
    styles.css
    script.js

  index.html
  README.md
```

## Notes

- All page interactions run entirely in the browser.
- Shared mock data lives in `assets/shared-data.js`.
- Shared helper logic lives in `assets/shared-utils.js`.
- The project is intended to be opened through a local server rather than directly from the filesystem.
