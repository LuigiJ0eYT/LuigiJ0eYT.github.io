function togglemenu() {
    var btn = document.getElementById("hamburgerbutton");
    var navham = document.getElementById("navid");
    if (!btn || !navham) return; //  ||  means OR apparently
    btn.classList.toggle("open");
    navham.classList.toggle("open");
}

// Ensure mobile menu is closed when resizing to desktop width
window.addEventListener('resize', function () {
    var navham = document.getElementById("navid");
    var btn = document.getElementById("hamburgerbutton");
    if (!navham || !btn) return;
    if (window.innerWidth > 860) {
        navham.classList.remove('open');
        btn.classList.remove('open');
    }
});
// ok this all works im just not touching it

// I agree joe good mentality 