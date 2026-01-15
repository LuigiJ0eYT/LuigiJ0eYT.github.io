function togglemenu() {
    var btn = document.getElementById("hamburgerbutton");
    var links = document.getElementById("links");
    if (!btn || !links) return; //  ||  means OR apparently
    btn.classList.toggle("open");
    links.classList.toggle("open");
}

// Ensure mobile menu is closed when resizing to desktop width
window.addEventListener('resize', function () {
    var links = document.getElementById("links");
    var btn = document.getElementById("hamburgerbutton");
    if (!links || !btn) return;
    if (window.innerWidth > 860) {
        links.classList.remove('open');
        btn.classList.remove('open');
    }
});
// ok this all works im just not touching it