'use strict';
function CanvasEditor() {

    this.ctx = undefined;
    this.drop_zone = undefined;
    this.entities = [];
    this.selectedEntity = null;
    this.strokeColor = "#FF0000";
}

//TODO: drag al monitor secundario descoloca la imagen
//TODO: solucionar evento de mas cuando mouseup (llama a un mousemove de mas)
//TODO: Sacar draw. Usuario tiene que llamar draw si hace un resize.
CanvasEditor.prototype.create = function(options) {
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

    function deleteSelectedEntity() {
        //for (var i in that.entities) {
        for(var i = 0; i < that.entities.length; ++i) {
            if (that.entities[i] === that.selectedEntity) {
                that.selectedEntity = null;
                that.entities[i] = null;
                that.entities = that.entities.filter(function (n) {
                    return n != undefined
                });
                that.draw();
                break;
            }
        }
    }

    function promoteSelectedEntity() {
        //for (var i in that.entities) {
        for(var i = 0; i < that.entities.length; ++i) {
            if (that.entities[i] === that.selectedEntity) {
                if (i < that.entities.length - 1) {
                    var temp = that.entities[i+1];
                    that.entities[i+1] = that.entities[i];
                    that.entities[i] = temp;
                    that.draw();
                    break;
                }
            }
        }
    }

    function demoteSelectedEntity() {
        //for (var i in that.entities) {
        for(var i = 0; i < that.entities.length; ++i) {
            if (that.entities[i] === that.selectedEntity) {
                if (i > 0) {
                    var temp = that.entities[i-1];
                    that.entities[i-1] = that.entities[i];
                    that.entities[i] = temp;
                    that.draw();
                    break;
                }
            }
        }
    }

    function createNewImages(event) {
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
                    that.draw();
                }, false);
            };
            reader.readAsDataURL(file);
        }
        that.draw();
    }

    function selectEntity(event) {
        that.selectedEntity = null;
        for (var i = that.entities.length - 1; i >= 0; i--) {
            var entity = that.entities[i];
            if (!entity) continue;

            parseEvent(event);
            var x = event.offsetX;
            var y = event.offsetY;
            offsetX = event.x - entity.x;
            offsetY = event.y - entity.y;

            if (x > entity.x && y > entity.y && x < (entity.x + entity.width) && y < (entity.y + entity.height)) {
                window.addEventListener("mousemove", handle_mousemove, false);
                window.addEventListener("mouseup", handle_mouseup, false);
                that.selectedEntity = entity;
                //console.log(event.x, that.selectedEntity.x, that.selectedEntity.width, offsetX);
                break;
            }
        }
        that.draw();
    }

    function setNewPosition(event) {
        //console.log(event.x, that.selectedEntity.x, that.selectedEntity.width, offsetX);
        that.selectedEntity.x = event.x - offsetX;
        that.selectedEntity.y = event.y - offsetY;
        that.draw();
    }

    function keyPressed(event) {
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

    function handle_dragover(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    function handle_drop(event) {
        event.stopPropagation();
        event.preventDefault();
        createNewImages(event);
    }

    function handle_mousemove(event) {
        event.stopPropagation();
        event.preventDefault();
        parseEvent(event);
        setNewPosition(event);
        //console.log(Date.now(),"move: ", that.selectedEntity.x,",", that.selectedEntity.y);
    }

    function handle_mousedown(event) {
        event.stopPropagation();
        event.preventDefault();
        selectEntity(event);
    }

    function handle_mouseup(event) {
        event.stopPropagation();
        event.preventDefault();
        window.removeEventListener("mousemove", handle_mousemove, false);
        window.removeEventListener("mouseup", handle_mousemove, false);
        //if(that.selectedEntity) console.log(Date.now(),"up: " + that.selectedEntity.x + "," + that.selectedEntity.y);
    }

    function handle_keypress(event) {
        keyPressed(event);
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    window.addEventListener("keydown", handle_keypress, false);
    document.body.addEventListener("drop", stop_default_drop, false);
    that.drop_zone.addEventListener("dragover", handle_dragover, false);
    that.drop_zone.addEventListener("drop", handle_drop, false);
    that.ctx.canvas.addEventListener("mousedown", handle_mousedown, false);

    //TODO: Cambiar nombre
    function parseEvent(event) {
        if(event.offsetX === undefined) {
            event.offsetX = event.layerX;
            event.offsetY = event.layerY;
            event.x = event.clientX;
            event.y = event.clientY;
        }
    }

    function createCanvas(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
};

CanvasEditor.prototype.draw = function() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    //for (var i in that.entities) {
    for(var i = 0; i < this.entities.length; ++i) {
        if (this.entities[i]) {
            this.ctx.save();
            var entity = this.entities[i];
            this.ctx.translate(entity.x, entity.y);
            this.ctx.drawImage(entity.image, 0, 0, entity.width, entity.height);
            this.ctx.restore();
        }
    }
    if (this.selectedEntity) this.drawSelectedStroke();
}

CanvasEditor.prototype.drawSelectedStroke = function() {
    //console.log("draw: " + this.selectedEntity.x + "," + this.selectedEntity.y);
    this.ctx.save();
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.fillStyle = this.strokeColor;
    var entity = this.selectedEntity;
    var x = entity.x;
    var y = entity.y;
    var w = entity.width;
    var h = entity.height
    var size = 4;

    this.ctx.translate(x,y);

    this.ctx.strokeRect(0,0,w,h);

    this.fillSquare(0,0,size);
    this.fillSquare(w,0,size);
    this.fillSquare(0,h,size);
    this.fillSquare(w,h,size);

    this.fillSquare(w/2,0,size);
    this.fillSquare(0,h/2,size);
    this.fillSquare(w/2,h,size);
    this.fillSquare(w,h/2,size);

    this.ctx.restore();
}

CanvasEditor.prototype.fillSquare = function(x, y, halfsize) {
    this.ctx.fillRect(x-halfsize, y-halfsize, halfsize*2, halfsize*2);
}