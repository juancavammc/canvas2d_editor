(function init() {
    //Canvas is also drop_zone
    var drop_zone1 = document.getElementById("drop_zone1");
    var editor1 = new CanvasEditor();
    editor1.createEditor({drop_zone: drop_zone1, width: drop_zone1.offsetWidth, height: drop_zone1.offsetHeight});
    drop_zone1.appendChild(editor1.ctx.canvas);


    //Canvas with separated drop_zone
    var drop_zone2 = document.getElementById("drop_zone2");
    var editor_zone2 = document.getElementById("editor_zone2");
    var editor2 = new CanvasEditor();
    editor2.createEditor({drop_zone: drop_zone2, width: editor_zone2.offsetWidth, height: editor_zone2.offsetHeight});
    editor_zone2.appendChild(editor2.ctx.canvas);

    function handle_window_resize(event) {
        editor1.ctx.canvas.width = drop_zone1.offsetWidth;
        editor1.ctx.canvas.height = drop_zone1.offsetHeight;
        editor2.ctx.canvas.width = editor_zone2.offsetWidth;
        editor2.ctx.canvas.height = editor_zone2.offsetHeight;
        editor1.draw();
        editor2.draw();
    }
    window.addEventListener("resize", handle_window_resize, false);

})();