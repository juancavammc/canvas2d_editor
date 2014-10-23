'use strict';
function init() {
    var canvas = document.getElementById("canvas_test");
    var ctx = canvas.getContext("2d");
    var drop_zone = document.getElementById("drop_zone");
    ctx.canvas.width = drop_zone.offsetWidth;
    ctx.canvas.height = drop_zone.offsetHeight;
    console.log(drop_zone.offsetWidth);
    console.log(drop_zone.offsetHeight);

    var entities = [];
    //var selectedEntity = null;
    var entity = null; //TODO: Pueden haber más de una imagen (lista)?

    function handle_dragover(event) {
        console.log("dragover");
        event.stopPropagation();
        event.preventDefault();
    }
    
    function handle_drop(event) {
        event.stopPropagation();
        event.preventDefault();
        //ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
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
                    entities.push( {image: img, x: 0, y: 0} );
                }

            };
            reader.readAsDataURL(file);
        }
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    var offsetX = 0;
    var offsetY = 0;
    function handle_mousemove(event) {
        if (event.offsetX === undefined) {
            entity.x = event.layerX - offsetX;
            entity.y = event.layerY - offsetY;
        }
        else {
            entity.x = event.offsetX - offsetX;
            entity.y = event.offsetY - offsetY;
        }
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (var i in entities) {
            ctx.drawImage(entities[i].image, entities[i].x, entities[i].y);
        }
    }

    function handle_mousedown(event) {
        for(var i = entities.length - 1; i >= 0; i-- ) {
        //for(var i in entities) {
            console.log("I'm in!");
            var ent = entities[i];
            if (event.offsetX === undefined) {
                var x = event.layerX;
                var y = event.layerY;
                offsetX = event.layerX - ent.x;
                offsetY = event.layerY - ent.y;
            }
            else {
                var x = event.offsetX;
                var y = event.offsetY;
                offsetX = event.offsetX - ent.x;
                offsetY = event.offsetY - ent.y;
            }

            if (ent && x > ent.x && y > ent.y && x < parseFloat(ent.x + ent.image.width) && y < parseFloat(ent.y + ent.image.height)) {
                console.log("click!");
                canvas.addEventListener("mousemove", handle_mousemove, false);
                entity = ent;
                break;
            }
        }
        //entity = null;
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