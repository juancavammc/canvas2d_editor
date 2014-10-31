'use strict';
function CanvasEditor() {
    this.ctx = undefined;
    this.drop_zone = undefined;
    this.entities = [];
    this.selectedEntity = null;
    this.strokeColor = "#FF0000";
    this.squaresSize = 4;
    this.sizeLine = 16; //line to rotation circle
    this.keepProportions = false;
}

//TODO: drag al monitor secundario descoloca la imagen (sin reescalado PPP no pasa?)
//TODO: solucionar evento de más cuando mouseup (llama a un mousemove de mas)
//TODO: Mantener proporciones al reescalar
//TODO: Rotaciones
//TODO: invertir imagen
//TODO: sticky
//TODO: renderizar
//TODO: añadir, además de mousedown, mouseclick? (Para cambiar entre resize y rotate)
//TODO: quitar fondo blanco de pngs

//TODO: if drop_zone != canvas ---> canvas->drag->preventdefault
//TODO: if click outside canvas ---> unselect
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
        var l = that.entities.length;
        for(var i = 0; i < l; ++i) {
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
        var l = that.entities.length;
        for(var i = 0; i < l; ++i) {
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
        var l = that.entities.length;
        for(var i = 0; i < l; ++i) {
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
                throw("File is not an image: " + file.type);
                continue;
            }
            var reader = new FileReader();
            reader.onloadend = function () {
                var img = new Image();
                img.src = this.result;
                ///////////////
                //TODO: Image on mouse position
                ///////////////

                img.addEventListener("load", function () {
                    that.entities.push({image: img, x: event.offsetX, y: event.offsetY, angle: 0, width: img.width, height: img.height});
                    that.draw();
                }, false);
            };
            reader.readAsDataURL(file);
        }
        that.draw();
    }

    function transform(mat, inv, pos, mouse, angle) {
        mat3.identity(mat);
        mat3.translate(mat, mat, pos);
        mat3.rotate(mat, mat, angle);
        mat3.invert(inv, mat);
        vec2.transformMat3(mouse, mouse, inv);
    }

    var mat = mat3.create();
    var inv = mat3.create();
    var pos = vec2.create();
    var mouse = vec2.create();

    function checkCorners(event) {
        var w = that.selectedEntity.width;
        var h = that.selectedEntity.height;
        vec2.set(pos, that.selectedEntity.x, that.selectedEntity.y);
        vec2.set(mouse, event.offsetX, event.offsetY);
        transform(mat, inv, pos, mouse, that.selectedEntity.angle);
        var x = mouse[0];
        var y = mouse[1];
        var s = that.squaresSize+1;

        var resizing = false;

        //up-left
        if(pointerInside(x, y, (-w/2)-s, (-h/2)-s, s*2, s*2)) {
            originAnchor.x = false;
            originAnchor.y = false;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "nw-resize";
        }
        //up-right
        else if(pointerInside(x, y, (w/2)-s, (-h/2)-s, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = false;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "ne-resize";
        }
        //down-left
        else if(pointerInside(x, y, (-w/2)-s, (h/2)-s, s*2, s*2)) {
            originAnchor.x = false;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "sw-resize";
        }
        //down-right
        else if(pointerInside(x, y, (w/2)-s, (h/2)-s, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "se-resize";
        }
        //up-center
        else if(pointerInside(x, y, -s, (-h/2)-s, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = false;
            originAnchor.width = false;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "n-resize";
        }
        //down-center
        else if(pointerInside(x, y, -s, (h/2)-s, s*2, s*2)) {
            originAnchor.x = true;
            originAnchor.y = true;
            originAnchor.width = false;
            originAnchor.height = true;
            resizing = true;
            that.ctx.canvas.style.cursor = "s-resize";
        }
        //center-left
        else if(pointerInside(x, y, (-w/2)-s, -s, s*2, s*2)) {
            originAnchor.x = false;
            originAnchor.y = true;
            originAnchor.width = true;
            originAnchor.height = false;
            resizing = true;
            that.ctx.canvas.style.cursor = "e-resize";
        }
        //center-right
        else if(pointerInside(x, y, (w/2)-s, -s, s*2, s*2)) {
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
        mat3.identity(mat);
        vec2.set(mouse, event.deltaX, event.deltaY);
        mat3.rotate(mat, mat, that.selectedEntity.angle);
        mat3.invert(inv, mat);
        vec2.transformMat3(mouse, mouse, inv);
        event.deltaX = mouse[0];
        event.deltaY = mouse[1];

        //var ox = 0;
        //var oy = 0;
        var a = 1;
        var b = 1;
        if(!originAnchor.x) a = -1;
        if(!originAnchor.y) b = -1;

        var width = 0;
        var height = 0;
        var aspect = that.selectedEntity.width/that.selectedEntity.height;

        if(originAnchor.width) {
            width = event.deltaX*a;
            that.selectedEntity.width += width;
            width = width/2*a;
        }

        if(originAnchor.height) {
            if(!that.keepProportions || !originAnchor.width) {
                height = event.deltaY*b;
                that.selectedEntity.height += height;
                height = height/2*b;
            }
            else {
                height = that.selectedEntity.width/aspect;
                that.selectedEntity.height = height;
                height = width/aspect*a*b;
            }
        }

        vec2.set(mouse, width, height);
        vec2.transformMat3(mouse, mouse, inv);
        width = mouse[0];
        height = mouse[1];

        that.selectedEntity.x += width;
        that.selectedEntity.y += height;
        that.draw();
    }

    function selectEntity(event) {
        //Check if is resizing
        if(that.selectedEntity) {
            if(checkCorners(event)) {
                window.addEventListener("mousemove", handle_mousemove_resize, false);
                window.addEventListener("mouseup", handle_mouseup, false);
                that.draw();
                return true;
            }
        }

        //if not resizing, check if selecting
        that.selectedEntity = null;
        for (var i = that.entities.length - 1; i >= 0; i--) {
            var entity = that.entities[i];
            if (!entity) continue;

            offsetX = event.x - entity.x;
            offsetY = event.y - entity.y;

            var w = entity.width;
            var h = entity.height;
            vec2.set(pos, entity.x, entity.y);
            vec2.set(mouse, event.offsetX, event.offsetY);
            transform(mat, inv, pos, mouse, entity.angle);
            var x = mouse[0];
            var y = mouse[1];

            if(pointerInside(x, y, -w/2, -h/2, w, h)) {
                window.addEventListener("mousemove", handle_mousemove_move_clicked, false);
                window.addEventListener("mouseup", handle_mouseup, false);
                that.selectedEntity = entity;
                break;
            }
        }
        that.draw();
    }


    function pointerInside(x, y, originX, originY, width, height) {
        return (x >= originX && y >= originY && x <= (originX + width) && y <= (originY + height));
    }

    function setNewPosition(event) {
        that.translate(event.x - offsetX, event.y - offsetY);
    }

    var shiftPressed = false;
    function keyDown(event) {
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
        //// TEST ////
        else if (that.selectedEntity && (event.keyCode === 190)) { //.
            that.rotateDEG(1);
            that.draw();
        }
        else if(event.keyCode === 16 && !shiftPressed) {
            shiftPressed = true;
            that.keepProportions = !that.keepProportions;
        }
    }

    function keyUp(event) {
        if (event.keyCode === 16) { //DEL == 46
            that.keepProportions = !that.keepProportions;
            shiftPressed = false;
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

    function handle_mousemove_move_clicked(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        setNewPosition(event);
    }

    function handle_mousemove_move_notClicked(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        if(that.selectedEntity) checkCorners(event);
    }

    function handle_mousemove_resize(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        resizeEntity(event);
    }

    function handle_mousedown(event) {
        event.stopPropagation();
        event.preventDefault();
        augmentEvent(event);
        that.ctx.canvas.removeEventListener("mousemove", handle_mousemove_move_notClicked, false);
        selectEntity(event);
    }

    function handle_mouseup(event) {
        event.stopPropagation();
        event.preventDefault();
        window.removeEventListener("mousemove", handle_mousemove_move_clicked, false);
        that.ctx.canvas.addEventListener("mousemove", handle_mousemove_move_notClicked, false);
        window.removeEventListener("mousemove", handle_mousemove_resize, false);
    }

    function handle_keydown(event) {
        keyDown(event);
    }

    function handle_keyup(event) {
        keyUp(event);
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    window.addEventListener("keydown", handle_keydown, false);
    window.addEventListener("keyup", handle_keyup, false);
    document.body.addEventListener("dragover", stop_default_drop, false);
    document.body.addEventListener("drop", stop_default_drop, false);
    that.drop_zone.addEventListener("dragover", handle_dragover, false);
    that.drop_zone.addEventListener("drop", handle_drop, false);
    that.ctx.canvas.addEventListener("mousedown", handle_mousedown, false);
    that.ctx.canvas.addEventListener("mousemove", handle_mousemove_move_notClicked, false);

    var lastX = 0;
    var lastY = 0;

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
    var l = this.entities.length;
    for(var i = 0; i < l; ++i) {
        if (this.entities[i]) {
            this.ctx.save();
            var entity = this.entities[i];
            this.ctx.translate(entity.x, entity.y);
            this.ctx.rotate(entity.angle);
            this.ctx.drawImage(entity.image, -entity.width/2, -entity.height/2, entity.width, entity.height);
            this.ctx.restore();
        }
    }
    if (this.selectedEntity) this.drawSelectedStroke();
}

CanvasEditor.prototype.drawSelectedStroke = function() {
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
    this.ctx.rotate(entity.angle);

    this.ctx.strokeRect(-w/2,-h/2,w,h);

    this.fillSquare(-w/2,-h/2,size);
    this.fillSquare(w/2,-h/2,size);
    this.fillSquare(-w/2,h/2,size);
    this.fillSquare(w/2,h/2,size);

    this.fillSquare(0,-h/2,size);
    this.fillSquare(-w/2,0,size);
    this.fillSquare(0,h/2,size);
    this.fillSquare(w/2,0,size);

    this.ctx.beginPath();
    this.ctx.moveTo(0, -h/2);
    this.ctx.lineTo(0, -this.sizeLine-h/2);
    this.ctx.stroke();
    this.ctx.closePath();

    this.ctx.beginPath();
    this.ctx.arc(0, -this.sizeLine-h/2, size, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();


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

CanvasEditor.prototype.rotateDEG = function(angle) {
    if(this.selectedEntity) {
        angle = angle * Math.PI / 180;
        this.selectedEntity.angle += angle;
        this.selectedEntity.angle = this.selectedEntity.angle % (Math.PI*2);
    }
}

CanvasEditor.prototype.rotateRAD = function(angle) {
    if(this.selectedEntity) {
        this.selectedEntity.angle += angle;
        this.selectedEntity.angle = this.selectedEntity.angle % (Math.PI*2);

    }
}

CanvasEditor.prototype.resetRotation = function() {
    if(this.selectedEntity) {
        this.selectedEntity.angle = 0;
    }
}