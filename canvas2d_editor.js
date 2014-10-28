'use strict';
function CanvasEditor() {
    this.ctx = undefined;
    this.drop_zone = undefined;
    this.entities = [];
    this.selectedEntity = null;
    this.strokeColor = "#FF0000";
    this.squaresSize = 4;
}

//TODO: drag al monitor secundario descoloca la imagen (sin reescalado PPP no pasa?)
//TODO: solucionar evento de mas cuando mouseup (llama a un mousemove de mas)
//TODO: Mantener proporciones al reescalar
//TODO: Rotaciones
//TODO: invertir imagen
//TODO: sticky
//TODO: renderizar
//TODO: añadir, además de mousedown, mouseclick? (Para cambiar entre resize y rotate)
//TODO: quitr fondo blanco
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
    var originAnchor = {
        x: true,
        y: true,
        width: false,
        height: false
    };

    function deleteSelectedEntity() {
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

    function checkResizing(event) {
        var x = event.offsetX;
        var y = event.offsetY;
        var originX = that.selectedEntity.x;
        var originY = that.selectedEntity.y;
        var w = that.selectedEntity.width;
        var h = that.selectedEntity.height;
        var s = that.squaresSize+1;
        var resizing = false;

        //up-left
        if(clickInside(x, y, originX-s, originY-s, s*2, s*2)) {
            originAnchor.x = false;
            originAnchor.y = false;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "nw-resize";
        }
        //up-right
        else if(clickInside(x, y, originX-s+w, originY-s, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = false;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "ne-resize";
        }
        //down-left
        else if(clickInside(x, y, originX-s, originY-s+h, s*2, s*2)) {
            originAnchor.x = false;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "sw-resize";
        }
        //down-right
        else if(clickInside(x, y, originX-s+w, originY-s+h, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "se-resize";
        }
        //up-center
        else if(clickInside(x, y, originX-s+(w/2), originY-s, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = false;
            originAnchor.width = false;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "n-resize";
        }
        //down-center
        else if(clickInside(x, y, originX-s+(w/2), originY-s+h, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = true;
            originAnchor.width = false;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "s-resize";

        }
        //center-left
        else if(clickInside(x, y, originX-s, originY-s+(h/2), s*2, s*2)) {
            originAnchor.x = false;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = false;
            resizing = true;
            that.ctx.canvas.style.cursor = "e-resize";
        }
        //center-right
        else if(clickInside(x, y, originX-s+w, originY-s+(h/2), s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = false;
            resizing = true;
            that.ctx.canvas.style.cursor = "w-resize";
        }
        else {
            that.ctx.canvas.style.cursor = "default";
        }
        return resizing;
    }

    function resizeEntity(event) {
        if(!originAnchor.x) {
            if(originAnchor.width) {
                that.selectedEntity.x += event.deltaX;
                that.selectedEntity.width -= event.deltaX;
            }
        }
        else {
            if(originAnchor.width) that.selectedEntity.width += event.deltaX;
        }
        if(!originAnchor.y) {
            if(originAnchor.height) {
                that.selectedEntity.y += event.deltaY;
                that.selectedEntity.height -= event.deltaY;
            }
        }
        else {
            if(originAnchor.height) that.selectedEntity.height += event.deltaY;
        }
        that.draw();
    }

    function selectEntity(event) {
        //Check if is resizing
        if(that.selectedEntity) {
            if(checkResizing(event)) {
                that.strokeColor = "#0000FF";
                window.addEventListener("mousemove", handle_mousemove_resize, false);
                window.addEventListener("mouseup", handle_mouseup, false);
                console.log(true);
                that.draw();
                return true;
            }
            else{
                that.strokeColor = "#FF0000";
                console.log("false");
            }
        }

        that.selectedEntity = null;
        for (var i = that.entities.length - 1; i >= 0; i--) {
            var entity = that.entities[i];
            if (!entity) continue;

            augmentEvent(event);
            var x = event.offsetX;
            var y = event.offsetY;
            offsetX = event.x - entity.x;
            offsetY = event.y - entity.y;

            if(clickInside(x, y, entity.x, entity.y, entity.width, entity.height)) {
                window.addEventListener("mousemove", handle_mousemove_move, false);
                window.addEventListener("mouseup", handle_mouseup, false);
                that.selectedEntity = entity;
                //console.log(event.x, that.selectedEntity.x, that.selectedEntity.width, offsetX);
                break;
            }
        }
        that.draw();
    }


    function clickInside(x, y, originX, originY, width, height) {
        return (x > originX && y > originY && x < (originX + width) && y < (originY + height));
    }

    function setNewPosition(event) {
        //console.log(event.x, that.selectedEntity.x, that.selectedEntity.width, offsetX);
        that.translate(event.x - offsetX, event.y - offsetY);
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

    function handle_mousemove_move(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        setNewPosition(event);
        //console.log(Date.now(),"move: ", that.selectedEntity.x,",", that.selectedEntity.y);
    }

    function handle_mousemove_resize(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        resizeEntity(event);
        //console.log(Date.now(),"move: ", that.selectedEntity.x,",", that.selectedEntity.y);
    }

    function handle_mousedown(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        selectEntity(event);
    }

    function handle_mouseup(event) {
        event.stopPropagation();
        event.preventDefault();
        window.removeEventListener("mousemove", handle_mousemove_move, false);
        window.removeEventListener("mousemove", handle_mousemove_resize, false);
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


    var lastX = 0;
    var lastY = 0;
    //TODO: Cambiar nombre
    function augmentEvent(event) {
        if(event.offsetX === undefined) {
            event.offsetX = event.layerX;
            event.offsetY = event.layerY;
            event.x = event.clientX;
            event.y = event.clientY;
        }
        event.deltaX = event.x - lastX;
        event.deltaY = event.y - lastY;
        lastX = event.x;
        lastY = event.y;
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
    var size = this.squaresSize;

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

CanvasEditor.prototype.resize = function(width, height) {
    if(this.selectedEntity) {
        this.selectedEntity.width = width;
        this.selectedEntity.height = height;
        this.draw();
    }
}

CanvasEditor.prototype.translate = function(x, y) {
    if(this.selectedEntity) {
        this.selectedEntity.x = x;
        this.selectedEntity.y = y;
        this.draw();
    }
}