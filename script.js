// Opens every resource card before printing, so no details are hidden on paper.
window.addEventListener("beforeprint", function () {
  document.querySelectorAll("details").forEach(function (card) {
    card.open = true;
  });
});
