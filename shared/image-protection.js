// A saving deterrent, not DRM. Screen capture and network copying remain possible.
const artworkRoot = document.getElementById('portfolio');
for (const eventName of ['contextmenu', 'dragstart']) {
  artworkRoot?.addEventListener(eventName, event => {
    if (event.target instanceof Element && event.target.closest('img,.artwork-view')) event.preventDefault();
  });
}
