'use strict';
function init() {
    var canvas = document.getElementById("canvas_test");
    var ctx = canvas.getContext("2d");
    var drop_zone = document.getElementById("drop_zone");
    ctx.canvas.width = drop_zone.offsetWidth;
    ctx.canvas.height = drop_zone.offsetHeight;
    console.log(drop_zone.offsetWidth);
    console.log(drop_zone.offsetHeight);
    var entity = null; //TODO: Pueden haber más de una imagen (lista)?

    function handle_dragover(event) {
        console.log("dragover");
        event.stopPropagation();
        event.preventDefault();
    }
    
    function handle_drop(event) {
        event.stopPropagation();
        event.preventDefault();
        ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
        var files = event.dataTransfer.files;
        if(files.length) {
            var file = files[0];
            var reader = new FileReader();
            reader.onloadend = function() { 
                console.log(this.result);
                var img = new Image();
                img.src = this.result;
                ///////////////
                //TODO: Image on center
                ///////////////
                img.onload = function() {
                    ctx.drawImage(this, 0, 0);
                    entity = {image: img, x: 0, y: 0};
                }

            };
            reader.readAsDataURL(file);
            console.log(reader.result);
        }
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    var offsetX = 0;
    var offsetY = 0;
    function handle_mousemove(event) {
        if(event.offsetX === undefined) {
            entity.x = event.layerX - offsetX;
            entity.y = event.layerY - offsetY;
        }
        else {
            entity.x = event.offsetX - offsetX;
            entity.y = event.offsetY - offsetY;
        }
        ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(entity.image, entity.x, entity.y);
    }

    function handle_mousedown(event) {
        if(event.offsetX === undefined) {
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

        if(entity && x > entity.x && y > entity.y && x < parseFloat(entity.x+entity.image.width) && y < parseFloat(entity.y+entity.image.height) ) {
            console.log("click!");
            canvas.addEventListener("mousemove", handle_mousemove, false);
        }
    }

    function handle_mouseup(event) {
        canvas.removeEventListener("mousemove", handle_mousemove, false);
    }

    document.body.addEventListener("dragover", handle_dragover, false)
    document.body.addEventListener("drop", stop_default_drop, false);
    drop_zone.addEventListener("dragover", handle_dragover, false);
    drop_zone.addEventListener("drop", handle_drop, false);

    canvas.addEventListener("mousedown", handle_mousedown, false);
    canvas.addEventListener("mouseup", handle_mouseup, false);





    //TODO: RESIZE EVENT
    

};