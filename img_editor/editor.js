(function init() {
    //var drop_zone = document.getElementById("drop_zone");

    var logos_zone = document.getElementById("logos_zone");
    var product_thumbs_zone = document.getElementById("product_thumbs_zone");
    var canvas_zone = document.getElementById("canvas_zone");
    var canvas_tools_zone = document.getElementById("canvas_tools_zone");
    var editor1 = new CanvasEditor();

    //Canvas is attached to drop_zone
    editor1.createEditor({drop_zone: canvas_zone, width: canvas_zone.offsetWidth, height: canvas_zone.offsetHeight});
    canvas_zone.appendChild(editor1.ctx.canvas);

    function handle_window_resize(event) {
        editor1.ctx.canvas.width = canvas_zone.offsetWidth;
        editor1.ctx.canvas.height = canvas_zone.offsetHeight;
        editor1.draw();
    }
    window.addEventListener("resize", handle_window_resize, false);

})();