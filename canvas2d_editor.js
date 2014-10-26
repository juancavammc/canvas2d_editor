'use strict';
function CanvasEditor() {

    this.ctx = undefined;
    this.drop_zone = undefined;
    this.entities = [];
    this.selectedEntity = null;
    this.strokeColor = "#FF0000";
}

CanvasEditor.prototype.init = function(options) {
    var that = this;
    options = options || {};
    var canvas = null;

    //Drop zone
    if(options.drop_zone) {
        if(typeof(options.drop_zone) == "string")
        {
            that.drop_zone = document.getElementById( options.drop_zone );
            if(!that.drop_zone) throw("Drop zone element not found: " + options.drop_zone );
        }
        else {
            that.drop_zone = options.drop_zone;
        }
    }
    else {
        throw("Drop zone element not found: " + options.drop_zone);
    }
    //Canvas
    if(options.canvas)
    {
        if(typeof(options.canvas) == "string")
        {
            canvas = document.getElementById( options.canvas );
            canvas.width = that.drop_zone.offsetWidth; //TODO: Firefox?
            canvas.height = that.drop_zone.offsetHeight;
            if(!canvas) throw("Canvas element not found: " + options.canvas );
        }
        else {
            canvas = options.canvas;
        }
    }
    else {
        canvas = createCanvas(options.width || 800, options.height || 600); //TODO
    }

    that.ctx = canvas.getContext("2d");

    var offsetX = 0;
    var offsetY = 0;

    function draw() {
        that.ctx.clearRect(0, 0, that.ctx.canvas.width, that.ctx.canvas.height);
        for (var i in that.entities) {
            if (that.entities[i]) {
                that.ctx.save();
                var entity = that.entities[i];
                that.ctx.translate(entity.x, entity.y);
                that.ctx.drawImage(entity.image, 0, 0, entity.width, entity.height);
                that.ctx.restore();
            }
        }
        if (that.selectedEntity) drawSelectedStroke();
    }

    function drawSelectedStroke() {
        that.ctx.save();
        that.ctx.strokeStyle = that.strokeColor;
        that.ctx.fillStyle = that.strokeColor;
        var entity = that.selectedEntity;
        var x = entity.x;
        var y = entity.y;
        var w = entity.width;
        var h = entity.height
        var size = 4;

        that.ctx.translate(x,y);

        that.ctx.strokeRect(0,0,w,h);

        fillSquare(0,0,size);
        fillSquare(w,0,size);
        fillSquare(0,h,size);
        fillSquare(w,h,size);

        fillSquare(w/2,0,size);
        fillSquare(0,h/2,size);
        fillSquare(w/2,h,size);
        fillSquare(w,h/2,size);

        that.ctx.restore();
    }

    function fillSquare(x, y, halfsize) {
        that.ctx.fillRect(x-halfsize, y-halfsize, halfsize*2, halfsize*2);
    }

    function deleteSelectedEntity() {
        for (var i in that.entities) {
            if (that.entities[i] === that.selectedEntity) {
                that.selectedEntity = null;
                that.entities[i] = null;
                that.entities = that.entities.filter(function (n) {
                    return n != undefined
                });
                draw();
                break;
            }
        }
    }

    function promoteSelectedEntity() {
        for (var i in that.entities) {
            if (that.entities[i] === that.selectedEntity) {
                if (i < that.entities.length - 1) {
                    var temp = that.entities[parseInt(i) + 1];
                    that.entities[parseInt(i) + 1] = that.entities[i];
                    that.entities[i] = temp;
                    draw();
                    break;
                }
            }
        }
    }

    function demoteSelectedEntity() {
        for (var i in that.entities) {
            if (that.entities[i] === that.selectedEntity) {
                if (i > 0) {
                    var temp = that.entities[parseInt(i) - 1];
                    that.entities[parseInt(i) - 1] = that.entities[i];
                    that.entities[i] = temp;
                    draw();
                    break;
                }
            }
        }
    }

    function handle_dragover(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    function handle_drop(event) {
        event.stopPropagation();
        event.preventDefault();
        var files = event.dataTransfer.files;

        for (var i in files) {
            if (!(files[i] instanceof File)) continue;
            var file = files[i];
            if (file.type.substring(0, 6) !== "image/") {
                console.log("Not an image."); //TODO: Throw error/message?
                continue;
            }
            var reader = new FileReader();
            reader.onloadend = function () {
                var img = new Image();
                img.src = this.result;
                ///////////////
                //TODO: Image on center
                ///////////////

                img.addEventListener("load", function () {
                    that.entities.push({image: img, x: 0, y: 0, width: img.width, height: img.height});
                    draw();
                }, false);
            };
            reader.readAsDataURL(file);
        }
        draw();
    }

    function handle_mousemove(event) {
        parseEvent(event);
        that.selectedEntity.x = event.offsetX - offsetX;
        that.selectedEntity.y = event.offsetY - offsetY;
        draw();
    }

    function handle_mousedown(event) {
        that.selectedEntity = null;
        for (var i = that.entities.length - 1; i >= 0; i--) {
            var entity = that.entities[i];
            if (!entity) continue;

            parseEvent(event);
            var x = event.offsetX;
            var y = event.offsetY;
            offsetX = event.offsetX - entity.x;
            offsetY = event.offsetY - entity.y;

            if (x > entity.x && y > entity.y && x < parseFloat(entity.x + entity.width) && y < parseFloat(entity.y + entity.height)) {
                that.ctx.canvas.addEventListener("mousemove", handle_mousemove, false);
                that.selectedEntity = entity;
                break;
            }
        }
        draw();
    }

    function handle_mouseup(event) {
        that.ctx.canvas.removeEventListener("mousemove", handle_mousemove, false);
    }

    function handle_keypress(event) {
        //console.log(event.keyCode);
        if (that.selectedEntity && event.keyCode === 46) { //DEL == 46
            deleteSelectedEntity();
        }
        else if (that.selectedEntity && (event.keyCode === 107 || event.keyCode === 187)) { //+
            promoteSelectedEntity();
        }
        else if (that.selectedEntity && (event.keyCode === 109 || event.keyCode === 189)) { //-
            demoteSelectedEntity();
        }
    }

    //TODO: Debería ir fuera de la clase, que se encargue el que crea el objeto
    function handle_window_resize(event) {
        that.ctx.canvas.width = that.drop_zone.offsetWidth;
        that.ctx.canvas.height = that.drop_zone.offsetHeight;
        draw();
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    window.addEventListener("keydown", handle_keypress, false);
    window.addEventListener("resize", handle_window_resize, false);

    document.body.addEventListener("dragover", handle_dragover, false)
    document.body.addEventListener("drop", stop_default_drop, false);

    that.drop_zone.addEventListener("dragover", handle_dragover, false);
    that.drop_zone.addEventListener("drop", handle_drop, false);

    that.ctx.canvas.addEventListener("mousedown", handle_mousedown, false);
    that.ctx.canvas.addEventListener("mouseup", handle_mouseup, false);

    function parseEvent(event) {
        if(event.offsetX === undefined) {
            event.offsetX = event.layerX;
            event.offsetY = event.layerY;
            event.x = event.clientX;
            event.y = event.clientY;
        }

    }
};

function createCanvas(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}