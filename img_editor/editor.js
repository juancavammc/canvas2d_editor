(function init() {
    //var drop_zone = document.getElementById("drop_zone");

    var logos_zone = document.getElementById("logos_zone");
    var product_thumbs_zone = document.getElementById("product_thumbs_zone");
    var canvas_zone = document.getElementById("canvas_zone");
    var canvas_tools_zone_content = document.getElementById("canvas_tools_zone_content");
    var editor1 = new CanvasEditor();

    //Canvas is attached to drop_zone
    editor1.createEditor({drop_zone: logos_zone, canvas_zone: canvas_zone, img_zone: product_thumbs_zone, width: canvas_zone.offsetWidth, height: canvas_zone.offsetHeight});
    canvas_zone.appendChild(editor1.ctx.canvas);

    function handle_window_resize(event) {
        editor1.resizeCanvas(canvas_zone.offsetWidth, canvas_zone.offsetHeight);
    }
    window.addEventListener("resize", handle_window_resize, false);

})();