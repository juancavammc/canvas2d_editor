'use strict';
function init() {
    var canvas = document.getElementById("canvas_test");
    var ctx = canvas.getContext("2d");
    var drop_zone = document.getElementById("drop_zone");
    ctx.canvas.width = drop_zone.offsetWidth;
    ctx.canvas.height = drop_zone.offsetHeight;

    var entities = [];
    var selectedEntity = null;

    function handle_dragover(event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    function handle_drop(event) {
        event.stopPropagation();
        event.preventDefault();
        var files = event.dataTransfer.files;
        if(files.length) {
            var file = files[0];
            var reader = new FileReader();
            reader.onloadend = function() {
                var img = new Image();
                img.src = this.result;
                ///////////////
                //TODO: Image on center
                ///////////////
                img.onload = function() {
                    ctx.drawImage(this, 0, 0);
                    entities.push( {image: img, x: 0, y: 0} );
                }

            };
            reader.readAsDataURL(file);
        }
        draw();
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    var offsetX = 0;
    var offsetY = 0;
    function handle_mousemove(event) {
        if (event.offsetX === undefined) {
            selectedEntity.x = event.layerX - offsetX;
            selectedEntity.y = event.layerY - offsetY;
        }
        else {
            selectedEntity.x = event.offsetX - offsetX;
            selectedEntity.y = event.offsetY - offsetY;
        }
        draw();
    }

    function handle_mousedown(event) {
        selectedEntity = null;
        for(var i = entities.length - 1; i >= 0; i-- ) {
            var entity = entities[i];
            if(!entity) continue;

            if (event.offsetX === undefined) {
                var x = event.layerX;
                var y = event.layerY;
                offsetX = event.layerX - entity.x;
                offsetY = event.layerY - entity.y;
            }
            else {
                var x = event.offsetX;
                var y = event.offsetY;
                offsetX = event.offsetX - entity.x;
                offsetY = event.offsetY - entity.y;
            }

            if (x > entity.x && y > entity.y && x < parseFloat(entity.x + entity.image.width) && y < parseFloat(entity.y + entity.image.height)) {
                canvas.addEventListener("mousemove", handle_mousemove, false);
                selectedEntity = entity;
                break;
            }
        }
        draw();
    }

    function draw() {
        ctx.strokeStyle="#FF0000";
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (var i in entities) {
            if(entities[i]) ctx.drawImage(entities[i].image, entities[i].x, entities[i].y);
        }
        if (selectedEntity) ctx.strokeRect(selectedEntity.x, selectedEntity.y, selectedEntity.image.width, selectedEntity.image.height);
    }

    function handle_mouseup(event) {
        canvas.removeEventListener("mousemove", handle_mousemove, false);
    }

    function handle_keypress(event) {
        if(selectedEntity && event.keyCode === 46) { //DEL == 46
            for(var i in entities) {
                if(entities[i] === selectedEntity) {
                    selectedEntity = null;
                    entities[i] = null;
                    entities = entities.filter(function(n){ return n != undefined });
                    draw();
                }
            }
        }
    }

    function handle_window_resize(event) {
        console.log("yep");
        ctx.canvas.width = drop_zone.offsetWidth;
        ctx.canvas.height = drop_zone.offsetHeight;
        draw();
    }


    window.addEventListener("keydown", handle_keypress, false);
    window.addEventListener("resize", handle_window_resize, false);


    document.body.addEventListener("dragover", handle_dragover, false)
    document.body.addEventListener("drop", stop_default_drop, false);

    drop_zone.addEventListener("dragover", handle_dragover, false);
    drop_zone.addEventListener("drop", handle_drop, false);

    canvas.addEventListener("mousedown", handle_mousedown, false);
    canvas.addEventListener("mouseup", handle_mouseup, false);

    //TODO: RESIZE EVENT
};