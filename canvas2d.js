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

    function handle_mousemove(event) {
        entity.x = event.offsetX;
        entity.y = event.offsetY;
        ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(entity.image, entity.x, entity.y);
    }

    function handle_mousedown(event) {
        console.log( event.offsetX + " < " + parseFloat(entity.x+entity.image.width) );
        console.log( event.offsetY + " < " + parseFloat(entity.y+entity.image.height) );

        if(entity && event.offsetX > entity.x && event.offsetY > entity.y && event.offsetX < parseFloat(entity.x+entity.image.width) && event.offsetY < parseFloat(entity.y+entity.image.height) ) {
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