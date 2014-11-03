(function init() {
    var container = document.getElementById("drop_zone");
    var editor1 = new CanvasEditor();

    //Canvas is attached to drop_zone
    editor1.createEditor({drop_zone: container, width: container.offsetWidth, height: container.offsetHeight});
    container.appendChild(editor1.ctx.canvas);

    function handle_window_resize(event) {
        editor1.ctx.canvas.width = container.offsetWidth;
        editor1.ctx.canvas.height = container.offsetHeight;
        editor1.draw();
    }
    window.addEventListener("resize", handle_window_resize, false);

})();