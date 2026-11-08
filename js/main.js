/* Start the game once every mode has registered. */
CS.init();
window.addEventListener("hashchange", function () {
  // Let the browser back button move between screens
  var h = location.hash.replace("#", "");
  if (h !== CS._lastHash) CS.route();
  CS._lastHash = h;
});
