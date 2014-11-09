/**
 * Created by Ricardo Navarro (rcnavarro7@gmail.com)
 */

(function init() {
    var img_zone = document.getElementById("img_zone");
    var canvas_zone = document.getElementById("canvas_zone");
    //var tools_zone = document.getElementById("tools_zone");
    var zone_editor = new CanvasEditor();

    //Canvas is attached to drop_zone
    zone_editor.createZoneEditor({canvas_zone: canvas_zone, img_zone: img_zone, width: canvas_zone.offsetWidth, height: canvas_zone.offsetHeight});
    canvas_zone.appendChild(zone_editor.ctx.canvas);

    function handle_window_resize(event) {
        zone_editor.resizeCanvas(canvas_zone.offsetWidth, canvas_zone.offsetHeight);
    }
    window.addEventListener("resize", handle_window_resize, false);
})();