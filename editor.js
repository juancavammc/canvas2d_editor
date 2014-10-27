(function init() {
    var container = document.getElementById("drop_zone");
    var editor1 = new CanvasEditor();

    //Canvas is also drop_zone
    editor1.create({drop_zone: container, width: container.offsetWidth, height: container.offsetHeight});
    container.appendChild(editor1.ctx.canvas);

    //function handle_window_resize(event) {
    //    editor1.ctx.canvas.width = container.offsetWidth;
    //    editor1.ctx.canvas.height = container.offsetHeight;
    //}
    //window.addEventListener("resize", handle_window_resize, false);

})();