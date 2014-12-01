/**
 * Created by Ricardo Navarro (rcnavarro7@gmail.com)
 */

(function(_global) {
    "use strict";

    //variables used during the execution
    //Temporal matrices and vectors
    var identity = mat3.create();
    var mat_tmp = mat3.create();
    var mat_tmp2 = mat3.create();
    var vec_tmp1 = vec2.create();
    var vec_tmp2 = vec2.create();
    var vec_tmp_angles = vec2.create();

    //offsets from window to canvas
    var offsetX = 0;
    var offsetY = 0;

    //last position of the mouse
    var lastX = 0;
    var lastY = 0;

    //if shift key is pressed or not
    var shiftPressed = false;

    //used to calculate sticky angle rotations
    var tempAngle = 0;

    //tells you what corner is anchored while resizing. Also if its resizing width, height or both

    var anchor = {
        x: true,
        y: true,
        width: false,
        height: false,
        resizing: false,
        rotating: false
    };

    var type = {
        IMAGE: 0,
        ZONE: 1
    };

    //Class CanvasEditor
    function CanvasEditor() {
        this.ctx = undefined;
        this.type = undefined; //image or zone?
        //this.drop_zone = undefined;
        this.entities = [];
        this.selectedEntity = null;
        this.entityMouseOver = null;

        this.keepProportions = true;
        this.stickyAngles = false;
        this.StickyAnglesSteps = 15;

        //how many pixels/degrees you move with buttons
        this.pixels_move = 3;
        this.pixels_scale = 4;
        this.degrees_rotate = 5;

        //selection stroke properties
        this.strokeColor = "#FF0000";
        this.squaresSize = 4;
        this.sizeLine = 16; //line to rotation circle
        this.minimumSize = 2; //minimum (width/height) of an entity
        this.lineWidth = 2;
        this.color_list = [
            'aqua',
            'black',
            'blue',
            'fuchsia',
            //'gray',
            //'green',
            //'lime',
            'maroon',
            'navy',
            'olive',
            //'orange',
            'purple',
            'red',
            //'silver',
            'teal',
            //'yellow',
            'white'
        ];
    }

    function cloneProto(A, B) {
        for(var i in A.prototype) {
            B.prototype[i] = A.prototype[i];
        }
    }

    /** Entity **/
    function Entity() {
        //this.x = undefined;
        //this.y = undefined;
        //this.width = undefined;
        //this.height = undefined;
        //this.normal_x = undefined;
        //this.normal_y = undefined;
        //this.normal_width = undefined;
        //this.normal_height = undefined;
        ////this.container_width = undefined;
        ////this.container_height = undefined;
        //this.angle = undefined;
        //this.strokeColor = undefined;
        //this.position = undefined;
        //this.translation = undefined;
        //this.rotation = undefined;
        //this.model = undefined;
        //this.parent = null;
    }

    Entity.prototype.update = function(containerWidth, containerHeight) {
        this.width = this.normal_width * containerWidth;
        this.height = this.normal_height * containerHeight;
        this.x = this.normal_x * containerWidth;
        this.y = this.normal_y * containerHeight;
        this.container_width = containerWidth;
        this.container_height = containerHeight;

        this.updateMatrices();

        if(this.children) {
            var length = this.children.length;
            for(var i = 0; i < length; ++i) {
                this.children[i].update(containerWidth, containerHeight);
            }
        }
    };

    Entity.prototype.updateNormals = function(containerWidth, containerHeight) {
        this.normal_width = this.width/containerWidth;
        this.normal_height = this.height/containerHeight;
        this.normal_x = this.x/containerWidth;
        this.normal_y = this.y/containerHeight;

        if(this.children) {
            var length = this.children.length;
            for(var i = 0; i < length; ++i) {
                this.children[i].updateNormals(containerWidth, containerHeight);
            }
        }
    };

    Entity.prototype.updateMatrices = function() {
        vec2.set(this.position, this.x, this.y);
        mat3.translate(this.translation, identity, this.position);
        mat3.rotate(this.rotation, identity, this.angle);
        mat3.multiply(this.model, this.translation, this.rotation);
    };

    Entity.prototype.draw = function(obj) {

    };

    Entity.prototype.drawBorder = function(obj) {
        obj.ctx.save();
        obj.ctx.translate(this.x, this.y);
        obj.ctx.rotate(this.angle);
        obj.ctx.lineWidth = obj.lineWidth;
        obj.ctx.strokeStyle = this.strokeColor;
        obj.ctx.strokeRect(-Math.abs(this.width) / 2, -Math.abs(this.height) / 2, Math.abs(this.width), Math.abs(this.height));
        obj.ctx.restore();
    };

    Entity.prototype.drawModifiers = function(obj) {
        var ctx = obj.ctx;
        ctx.save();
        ctx.strokeStyle = this.strokeColor;
        ctx.fillStyle = this.strokeColor;
        ctx.lineWidth = obj.lineWidth;
        var x = this.x;
        var y = this.y;
        var w = this.width;
        var h = this.height;
        var size = obj.squaresSize;

        ctx.translate(x, y);
        ctx.rotate(this.angle);

        ctx.strokeRect(-w / 2, -h / 2, w, h);

        this.fillSquare(ctx, -w / 2, -h / 2, size);
        this.fillSquare(ctx, w / 2, -h / 2, size);
        this.fillSquare(ctx, -w / 2, h / 2, size);
        this.fillSquare(ctx, w / 2, h / 2, size);

        this.fillSquare(ctx, 0, -h / 2, size);
        this.fillSquare(ctx, -w / 2, 0, size);
        this.fillSquare(ctx, 0, h / 2, size);
        this.fillSquare(ctx, w / 2, 0, size);

        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(0, -obj.sizeLine - h / 2);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(0, -obj.sizeLine - h / 2, size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    };

    Entity.prototype.fillSquare = function (ctx, x, y, halfsize) {
        ctx.fillRect(x - halfsize, y - halfsize, halfsize * 2, halfsize * 2);
    };

    Entity.prototype.computeHalfSize = function() {
        var v = [];
        var w = this.width/2;
        var h = this.height/2;
        var halfsize = {};
        halfsize.x = 0;
        halfsize.y = 0;
        var t;
        v[0] = vec2.fromValues(-w,-h);
        v[1] = vec2.fromValues( w,-h);
        v[2] = vec2.fromValues( w, h);
        v[3] = vec2.fromValues(-w, h);
        mat3.invert(mat_tmp, this.rotation);
        for(var i = 0; i < v.length; ++i) {
            vec2.transformMat3(v[i], v[i], mat_tmp);
            t = Math.abs(v[i][0]);
            if(t > halfsize.x) halfsize.x = t;
            t = Math.abs(v[i][1]);
            if(t > halfsize.y) halfsize.y = t;
        }
        return halfsize;
    };

    //TODO: Change cursors according to the angle
    /**
     * obj.squaresSize
     * obj.ctx
     * obj.x
     * obj.y
     */
    Entity.prototype.checkCorners = function(obj) {
        var w = this.width;
        var h = this.height;
        mat3.invert(mat_tmp, this.getGlobalMatrix());
        vec2.set(vec_tmp1, obj.x, obj.y);
        vec2.transformMat3(vec_tmp1, vec_tmp1, mat_tmp);
        var x = vec_tmp1[0];
        var y = vec_tmp1[1];

        var s = obj.squaresSize + 1;

        //up-left
        if (pointerInside(x, y, (-w / 2) - s, (-h / 2) - s, s * 2, s * 2)) {
            anchor.x = false;
            anchor.y = false;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "nw-resize";
        }
        //up-right
        else if (pointerInside(x, y, (w / 2) - s, (-h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = false;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "ne-resize";
        }
        //down-left
        else if (pointerInside(x, y, (-w / 2) - s, (h / 2) - s, s * 2, s * 2)) {
            anchor.x = false;
            anchor.y = true;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "sw-resize";
        }
        //down-right
        else if (pointerInside(x, y, (w / 2) - s, (h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = true;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "se-resize";
        }
        //up-center
        else if (pointerInside(x, y, -s, (-h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = false;
            anchor.width = false;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "n-resize";
        }
        //down-center
        else if (pointerInside(x, y, -s, (h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = true;
            anchor.width = false;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "s-resize";
        }
        //center-left
        else if (pointerInside(x, y, (-w / 2) - s, -s, s * 2, s * 2)) {
            anchor.x = false;
            anchor.y = true;
            anchor.width = true;
            anchor.height = false;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "e-resize";
        }
        //center-right
        else if (pointerInside(x, y, (w / 2) - s, -s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = true;
            anchor.width = true;
            anchor.height = false;
            anchor.resizing = true;
            anchor.rotating = false;
            obj.ctx.canvas.style.cursor = "w-resize";
        }
        else if (pointerInside(x, y, -s, (-h / 2) - s - obj.sizeLine, s * 2, s * 2)) {
            anchor.resizing = false;
            anchor.rotating = true;
        }
        else {
            obj.ctx.canvas.style.cursor = "default";
            anchor.resizing = false;
            anchor.rotating = false;
        }
    };

    Entity.prototype._checkBoundingBox = function() {
        this.updateMatrices();
        var halfsize = this.computeHalfSize();
        if (this.x + halfsize.x > this.container_width) this.x = this.container_width - halfsize.x;
        else if (this.x - halfsize.x < 0) this.x = halfsize.x;
        if (this.y + halfsize.y > this.container_height) this.y = this.container_height - halfsize.y;
        else if (this.y - halfsize.y < 0) this.y = halfsize.y;
        this.updateMatrices();
    };

    Entity.prototype.resetRotation = function() {
        this.angle = 0;
        this.updateMatrices();
    };

    Entity.prototype.rotate = function(angle_rad) {
        this.angle += angle_rad;
        this.angle = this.angle % (Math.PI * 2);
        this.updateMatrices();
    };

    Entity.prototype.setPosition = function(x,y) {
        this.x = x;
        this.y = y;
        this._checkBoundingBox();
        this.updateNormals(this.container_width, this.container_height);
    };

    Entity.prototype.translate = function (x, y) {
        this.setPosition(this.x + x, this.y + y);
    };

    Entity.prototype.resize = function (width, height, minimumSize) {
        this.width = width;
        this.height = height;

        //check minimum size
        if (this.width < minimumSize) this.width = minimumSize;
        if (this.height < minimumSize) this.height = minimumSize;

        this.updateNormals(this.container_width, this.container_height);
    };

    Entity.prototype.getGlobalMatrix = function() {
        var m;
        if(!this.parent) {
                return this.model;
        }
        else {
            if(this.parent instanceof EntityCanvas) {
                m = mat3.translate(mat3.create(), identity, vec2.fromValues(-this.parent.width/2, -this.parent.height/2));
                mat3.multiply(m, this.parent.model, m);
                mat3.multiply(m, m, this.model);
            }
            else {
                m = mat3.multiply(mat3.create(), this.model, this.parent.getGlobalMatrix());
            }
            return m;
        }
    };

    /** EntityZone **/
    function EntityZone() {

    }

    cloneProto(Entity, EntityZone);

    EntityZone.prototype.draw = function(obj) {
        if(this !== obj.selectedEntity && this !== obj.entityMouseOver) this.drawBorder(obj);
    };

    EntityZone.prototype.serializeJSON = function() {
        var json = {};
        if(this.id !== undefined) json.id = this.id;
        var  config = {};
        config.x = this.normal_x * this.naturalContainer_width;
        config.y = this.normal_y * this.naturalContainer_height;
        config.width = this.normal_width * this.naturalContainer_width;
        config.height = this.normal_height * this.naturalContainer_height;
        config.angle = RADtoDEG(this.angle);
        json.config = config;
        return json;
    };

    /** EntityImage **/
    function EntityImage() {
        this.image = undefined;
    }

    cloneProto(Entity, EntityImage);

    EntityImage.prototype.draw = function(obj) {
        if(this.image) {
            var ctx = obj.ctx;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.drawImage(this.image, -Math.abs(this.width) / 2, -Math.abs(this.height) / 2, Math.abs(this.width), Math.abs(this.height));
            ctx.restore();
        }
    };

    function EntityText() {
        this.text = "Test!";
        this.ctx = document.createElement("canvas").getContext("2d");

        //Default options
        this.textAlign = "center";
        this.textBaseline = "middle";

        this.fontStyle = "normal";
        this.fontSize = "20px";
        this.font = "Arial";
    }

    cloneProto(Entity, EntityText);

    EntityText.prototype.draw = function(obj) {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        if (this.text) {
            this.ctx.save();

            this.ctx.textAlign = this.textAlign;
            this.ctx.textBaseline = this.textBaseline;
            this.ctx.font = this.fontStyle + " " + this.fontSize + " " + this.font;
            //this.ctx.lineWidth = 1;
            //this.ctx.strokeStyle = "black";
            //this.ctx.fillStyle = "black";
            this.ctx.fillText(this.text, this.width / 2, this.height / 2);
            this.ctx.restore();
        }
        if (this.ctx) {
            obj.ctx.save();
            obj.ctx.translate(this.x, this.y);
            obj.ctx.rotate(this.angle);
            //obj.ctx.lineWidth = 1;
            //obj.ctx.strokeStyle = "black";
            //obj.ctx.fillStyle = "black";
            obj.ctx.drawImage(this.ctx.canvas, -Math.abs(this.width) / 2, -Math.abs(this.height) / 2, Math.abs(this.width), Math.abs(this.height));
            obj.ctx.restore();
        }
    };

    EntityText.prototype.update = function(containerWidth, containerHeight) {
        this.width = this.normal_width * containerWidth;
        this.height = this.normal_height * containerHeight;
        this.x = this.normal_x * containerWidth;
        this.y = this.normal_y * containerHeight;
        this.ctx.canvas.width = this.width;
        this.ctx.canvas.height = this.height;

        this.updateMatrices();
    };

    EntityText.prototype.updateNormals = function(containerWidth, containerHeight) {
        this.normal_width = this.width/containerWidth;
        this.normal_height = this.height/containerHeight;
        this.normal_x = this.x/containerWidth;
        this.normal_y = this.y/containerHeight;
        this.ctx.canvas.width = this.width;
        this.ctx.canvas.height = this.height;

        if(this.children) {
            var length = this.children.length;
            for(var i = 0; i < length; ++i) {
                this.children[i].updateNormals(containerWidth, containerHeight);
            }
        }
    };

    /** EntityProduct **/
    function EntityProduct() {
        this.image = undefined;
        this.children = [];
    }

    //EntityProduct.prototype = new Entity;
    cloneProto(Entity, EntityProduct);

    EntityProduct.prototype.draw = function(obj) {
        var ctx = obj.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if(this.image) ctx.drawImage(this.image, -Math.abs(this.width) / 2, -Math.abs(this.height) / 2, Math.abs(this.width), Math.abs(this.height));
        ctx.restore();
        var length = this.children.length;
        var i;
        for(i = 0; i < length; ++i) {
            this.children[i].draw(obj);
        }

        var lineWidth = obj.lineWidth;
        var selectedEntity = null;
        var entityMouseOver = null;
        for(i = 0; i < length; ++i) {
            this.children[i].draw(obj);
            if(obj.selectedEntity === this.children[i]) {
                selectedEntity = this.children[i];
            }
            if(obj.entityMouseOver === this.children[i]) {
                entityMouseOver = this.children[i];
            }
        }

        if(selectedEntity) {
            obj.lineWidth = lineWidth*1.7;
            selectedEntity.drawModifiers(obj);
        }
        if( entityMouseOver && (entityMouseOver !== selectedEntity) ) {
            obj.lineWidth = lineWidth*1.5;
            entityMouseOver.drawBorder(obj);
        }
    };

    EntityProduct.prototype.push = function(entity) {
        entity.parent = null;
        this.children.push(entity);
    };

    EntityProduct.prototype.mouseInsideChildren = function(x, y, noRecursive) {
        for (var i = this.children.length - 1; i >= 0; i--) {
            var entity = this.children[i];
            if (!entity) continue;

            var w = entity.width;
            var h = entity.height;

            mat3.invert(mat_tmp, entity.getGlobalMatrix());
            vec2.set(vec_tmp1, x, y);
            vec2.transformMat3(vec_tmp1, vec_tmp1, mat_tmp);

            var xx = vec_tmp1[0];
            var yy = vec_tmp1[1];

            if (pointerInside(xx, yy, -w / 2, -h / 2, w, h)) {
                if(entity instanceof EntityCanvas && !noRecursive) {
                    var e = entity.mouseInsideChildren(x, y);
                    if(e) return e;
                }
                else {
                    return entity;
                }
            }
        }
        return null;
    };

    EntityProduct.prototype.deleteChild = function(entity) {
        var l = this.children.length;
        for (var i = 0; i < l; ++i) {
            if(this.children[i] instanceof EntityCanvas) {
                if(this.children[i].deleteChild(entity)) return true;
            }
            else if (this.children[i] === entity) {
                this.children[i] = null;
                this.children = this.children.filter(function (n) {
                    return n != undefined;
                });
                return true;
            }
        }
        return false;
    };

    EntityProduct.prototype.deleteAllChildren = function() {
        var l = this.children.length;
        var aux = false;
        for (var i = 0; i < l; ++i) {
            if(this.children[i] instanceof EntityCanvas) {
                this.children[i].deleteAllChildren();
            }
            else if (this.children[i]) {
                this.children[i] = null;
                aux = true;
            }
        }
        if(aux) {
            this.children = this.children.filter(function (n) {
                return n != undefined;
            });
        }
    };

    EntityProduct.prototype.promoteChild = function(entity) {
        var l = this.children.length;
        for (var i = 0; i < l; ++i) {
            if(this.children[i] instanceof EntityCanvas) {
                if(this.children[i].promoteChild(entity)) return true;
            }
            else if (this.children[i] === entity) {
                if (i < l - 1) {
                    var temp = this.children[i + 1];
                    this.children[i + 1] = this.children[i];
                    this.children[i] = temp;
                    break;
                }
            }
        }
    };

    EntityProduct.prototype.demoteChild = function(entity) {
        var l = this.children.length;
        for (var i = 0; i < l; ++i) {
            if(this.children[i] instanceof EntityCanvas) {
                if(this.children[i].demoteChild(entity)) return true;
            }
            else if (this.children[i] === entity) {
                if (i > 0) {
                    var temp = this.children[i - 1];
                    this.children[i - 1] = this.children[i];
                    this.children[i] = temp;
                    break;
                }
            }
        }
    };

    EntityProduct.prototype.createChild = function (type, normalized, img, _x, _y, _width, _height, angle_rad, strokeColor) {
        var entity = createEntity(type, normalized, img, _x, _y, _width, _height, this.width, this.height, this.naturalContainer_width, this.naturalContainer_height, angle_rad, strokeColor);
        if(entity instanceof EntityCanvas || entity instanceof EntityText) {
            entity.ctx.canvas.width = entity.width;
            entity.ctx.canvas.height = entity.height;
        }
        this.push(entity);
        return entity;
    };

    EntityProduct.prototype.serializeJSON = function() {
        var json = {"id": this.image.dataset.id, "url": this.image.dataset.url, "zone": []};
        for(var i = 0; i < this.children.length; ++i) {
            if(this.children[i] instanceof EntityZone) json.zone[i] = this.children[i].serializeJSON();
        }
        return json;
    };

    /** EntityCanvas **/
    function EntityCanvas() {
        this.children = [];
        this.ctx = document.createElement("canvas").getContext("2d");
    }

    cloneProto(EntityProduct, EntityCanvas);
    //EntityCanvas.prototype.deleteChild = EntityProduct.prototype.deleteChild;
    //EntityCanvas.prototype.createChild = EntityProduct.prototype.createChild;
    //EntityCanvas.prototype.mouseInsideChildren = EntityProduct.prototype.mouseInsideChildren;
    //EntityCanvas.prototype.deleteAllChildren = EntityProduct.prototype.deleteAllChildren;

    EntityCanvas.prototype.draw = function(obj) {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.drawBorder(obj);

        var ctx = obj.ctx;
        var lineWidth = obj.lineWidth;

        var length = this.children.length;
        obj.ctx = this.ctx;


        var selectedEntity = null;
        var entityMouseOver = null;
        for(var i = 0; i < length; ++i) {
            this.children[i].draw(obj);
            if(obj.selectedEntity === this.children[i]) {
                selectedEntity = this.children[i];
            }
            if(obj.entityMouseOver === this.children[i]) {
                entityMouseOver = this.children[i];
            }
        }

        if(selectedEntity) {
            obj.lineWidth = lineWidth*1.5;
            selectedEntity.drawModifiers(obj);
        }
        if( entityMouseOver && (entityMouseOver !== selectedEntity) ) {
            obj.lineWidth = lineWidth*1.3;
            entityMouseOver.drawBorder(obj);
        }

        obj.ctx = ctx;
        obj.lineWidth = lineWidth;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if(this.ctx) ctx.drawImage(this.ctx.canvas, -Math.abs(this.width) / 2, -Math.abs(this.height) / 2, Math.abs(this.width), Math.abs(this.height));
        ctx.restore();
    };

    EntityCanvas.prototype.update = function(containerWidth, containerHeight) {
        this.width = this.normal_width * containerWidth;
        this.height = this.normal_height * containerHeight;
        this.x = this.normal_x * containerWidth;
        this.y = this.normal_y * containerHeight;
        this.ctx.canvas.width = this.width;
        this.ctx.canvas.height = this.height;

        this.updateMatrices();

        if(this.children) {
            var length = this.children.length;
            for(var i = 0; i < length; ++i) {
                this.children[i].update(this.width, this.height);
            }
        }
    };

    EntityCanvas.prototype.updateNormals = function(containerWidth, containerHeight) {
        this.normal_width = this.width/containerWidth;
        this.normal_height = this.height/containerHeight;
        this.normal_x = this.x/containerWidth;
        this.normal_y= this.y/containerHeight;
        this.ctx.canvas.width = this.width;
        this.ctx.canvas.height = this.height;

        if(this.children) {
            var length = this.children.length;
            for(var i = 0; i < length; ++i) {
                this.children[i].updateNormals(this.width, this.height);
            }
        }
    };


    EntityCanvas.prototype.push = function(entity) {
        entity.parent = this;
        this.children.push(entity);
    };

    /** ************************************* **/

    _global.CanvasEditor = CanvasEditor;
    _global.Entity = Entity;
    _global.EntityZone = EntityZone;
    _global.EntityImage = EntityImage;
    _global.EntityProduct = EntityProduct;
    _global.EntityCanvas = EntityCanvas;

    //TODO: if drop_zone != canvas ---> canvas->drag->preventdefault
    //TODO: if click outside canvas ---> unselect

    CanvasEditor.prototype.createEditor = function (options) {
        if(this.type) {
            return false;
        }

        var that = this;
        options = options || {};
        var canvas = null;

        //Drop zone
        if (options.drop_zone) {
            if (typeof(options.drop_zone) == "string") {
                that.drop_zone = document.getElementById(options.drop_zone);
                if (!that.drop_zone) throw("Drop zone element not found: " + options.drop_zone );
            }
            else {
                that.drop_zone = options.drop_zone;
            }
        }
        else {
            throw("drop_zone element not found: " + options.drop_zone);
        }

        //Canvas Zone
        if (options.canvas_zone) {
            if (typeof(options.canvas_zone) == "string") {
                that.canvas_zone = document.getElementById(options.canvas_zone);
                if (!that.canvas_zone) throw("canvas_zone element not found: " + options.canvas_zone );
            }
            else {
                that.canvas_zone = options.canvas_zone;
            }
        }
        else {
            throw("canvas_zone element not found: " + options.canvas_zone);
        }

        //Image Zone
        if (options.img_zone) {
            if (typeof(options.img_zone) == "string") {
                that.img_zone = document.getElementById(options.img_zone);
                if (!that.img_zone) throw("img_zone element not found: " + options.img_zone );
            }
            else {
                that.img_zone = options.img_zone;
            }
        }
        else {
            throw("img_zone element not found: " + options.img_zone);
        }

        //Canvas
        if (options.canvas) {
            if (typeof(options.canvas) == "string") {
                canvas = document.getElementById(options.canvas);
                canvas.width = options.width || 800;
                canvas.height = options.height || 600;
                if (!canvas) throw("Canvas element not found: " + options.canvas );
            }
            else {
                canvas = options.canvas;
            }
        }
        else {
            canvas = _createCanvas(options.width || 800, options.height || 600);
        }

        canvas.style.position = "relative";
        this.ctx = canvas.getContext("2d");
        this.type = type.IMAGE;

        this.current_img_id = null;
        this.logos_images = []; //html images
        this.images = []; //images
        //that.entities[that.current_img_id] = [];

        //Get all buttons
        var button_removeSelection = document.getElementById("editor_removeSelection");
        var button_cleanAll = document.getElementById("editor_cleanAll");
        var button_addText = document.getElementById("editor_addText");
        var button_move = document.getElementById("editor_move");
        var button_scale = document.getElementById("editor_scale");
        var button_rotate = document.getElementById("editor_rotate");
        var button_move_left = document.getElementById("editor_move_left");
        var button_move_right = document.getElementById("editor_move_right");
        var button_move_up = document.getElementById("editor_move_up");
        var button_move_down = document.getElementById("editor_move_down");
        var button_scale_v_shrink = document.getElementById("editor_scale_v_shrink");
        var button_scale_v_expand = document.getElementById("editor_scale_v_expand");
        var button_scale_h_shrink = document.getElementById("editor_scale_h_shrink");
        var button_scale_h_expand = document.getElementById("editor_scale_h_expand");
        var button_rotate_left = document.getElementById("editor_rotate_left");
        var button_rotate_right = document.getElementById("editor_rotate_right");

        //Get textArea
        var textArea = document.getElementById("editor_textArea");

        //Get divs
        var div_canvas_tools_zone_content = document.getElementById("canvas_tools_zone_content");
        var div_editor_mainButtons =  document.getElementById("div_editor_mainButtons");
        var div_editor_moveButtons =  document.getElementById("div_editor_moveButtons");
        var div_editor_scaleButtons =  document.getElementById("div_editor_scaleButtons");
        var div_editor_rotateButtons =  document.getElementById("div_editor_rotateButtons");
        var div_editor_textArea = document.getElementById("div_editor_textArea");

        div_editor_mainButtons.style.display = "none";
        div_editor_moveButtons.style.display = "none";
        div_editor_scaleButtons.style.display = "none";
        div_editor_rotateButtons.style.display = "none";
        div_editor_textArea.style.display = "none";
        //div_canvas_tools_zone_content.style.display = "none";

        this.manageDivs = function() {
            if(that.current_img_id === null) {
                div_editor_mainButtons.style.display = "none";
                div_editor_moveButtons.style.display = "none";
                div_editor_scaleButtons.style.display = "none";
                div_editor_rotateButtons.style.display = "none";
            }
            else {
                if (that.selectedEntity) {
                    div_editor_mainButtons.style.display = "block";
                }
                else {
                    div_editor_mainButtons.style.display = "none";
                    div_editor_moveButtons.style.display = "none";
                    div_editor_scaleButtons.style.display = "none";
                    div_editor_rotateButtons.style.display = "none";
                }
            }
        };


        //button handlers
        function handle_button_click_move() {
            div_editor_moveButtons.style.display = "block";
            div_editor_scaleButtons.style.display = "none";
            div_editor_rotateButtons.style.display = "none";
        }

        function handle_button_click_scale() {
            div_editor_moveButtons.style.display = "none";
            div_editor_scaleButtons.style.display = "block";
            div_editor_rotateButtons.style.display = "none";
        }

        function handle_button_click_rotate() {
            div_editor_moveButtons.style.display = "none";
            div_editor_scaleButtons.style.display = "none";
            div_editor_rotateButtons.style.display = "block";
        }

        button_move.addEventListener("mousedown", handle_button_click_move.bind(this), false);
        button_scale.addEventListener("mousedown", handle_button_click_scale.bind(this), false);
        button_rotate.addEventListener("mousedown", handle_button_click_rotate.bind(this), false);
        button_move_left.addEventListener("mousedown", handle_button_click_move_left.bind(this), false);
        button_move_right.addEventListener("mousedown", handle_button_click_move_right.bind(this), false);
        button_move_up.addEventListener("mousedown", handle_button_click_move_up.bind(this), false);
        button_move_down.addEventListener("mousedown", handle_button_click_move_down.bind(this), false);
        button_scale_v_shrink.addEventListener("mousedown", handle_button_click_scale_v_shrink.bind(this), false);
        button_scale_v_expand.addEventListener("mousedown", handle_button_click_scale_v_expand.bind(this), false);
        button_scale_h_shrink.addEventListener("mousedown", handle_button_click_scale_h_shrink.bind(this), false);
        button_scale_h_expand.addEventListener("mousedown", handle_button_click_scale_h_expand.bind(this), false);
        button_rotate_left.addEventListener("mousedown", handle_button_click_rotate_left.bind(this), false);
        button_rotate_right.addEventListener("mousedown", handle_button_click_rotate_right.bind(this), false);
        button_removeSelection.addEventListener("mousedown", handle_button_click_deleteEntity.bind(this), false);
        button_cleanAll.addEventListener("mousedown", handle_button_deleteAll.bind(this), false);
        button_addText.addEventListener("mousedown", handle_button_addText.bind(this), false);

        //JSON
        //json-->javascript
        function configureJSON(json) {
            console.log(json);
            that.json_content = json;
            for(var i = 0; i < json.length; ++i) {
                var html_image = document.createElement("input");
                html_image.setAttribute("type", "image");
                html_image.setAttribute("src", json[i].url);
                html_image.setAttribute("class", "thumb");
                html_image.dataset.id = json[i].id;

                html_image.addEventListener("click", function(event) {
                    that._switchImage(event.target.dataset.id);
                },false);

                var img = new Image();
                img.addEventListener("load", (function(event) {
                    var _id = event.target.dataset.id;
                    that.entities[_id] = createEntity("product", true, event.target, 0.5, 0.5, 1, 1, event.target.naturalWidth, event.target.naturalHeight, event.target.naturalWidth, event.target.naturalHeight, 0, that.strokeColor);
                    that.entities[_id].ctx = this.ctx;
                    //load existent zones
                    for(var j = 0; j < this.zone.length; ++j) {
                        var o = this.zone[j].config;
                        var entity = that.entities[_id].createChild("canvas", false, null, o.x, o.y, o.width, o.height, DEGtoRAD(o.angle), that.getRandomColor());
                        entity.id = this.zone[j].id;
                    }
                }).bind(json[i]), false);

                img.addEventListener("click", function(event) {
                    that._switchImage(event.target.dataset.id);
                },false);

                img.dataset.id = json[i].id;
                img.dataset.url = json[i].url;
                img.setAttribute("class", "thumb");
                img.src = json[i].url;
                that.img_zone.appendChild(html_image);
            }
        }

        function loadProduct(id) {
            if(!_global.localStorage.json) {
                var xmlhttp = new XMLHttpRequest();
                var url = "assets/test.json";

                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                        var json = JSON.parse(xmlhttp.responseText);
                        configureJSON(json);
                    }
                };
                xmlhttp.open("GET", url, true);
                xmlhttp.send();
            }
            else {
                configureJSON(JSON.parse(_global.localStorage.json));
            }
        }

        //Other handlers
        this._handle_mouseup = handle_mouseup.bind(this);
        this._handle_mousemove_resize = handle_mousemove_resize.bind(this);
        this._handle_mousemove_rotate = handle_mousemove_rotate.bind(this);
        this._handle_mousemove_move_notClicked = handle_mousemove_move_notClicked.bind(this);
        this._handle_mousemove_move_clicked = handle_mousemove_move_clicked.bind(this);
        this._handle_mousedown = handle_mousedown.bind(this);
        this._handle_mousedown_addText = handle_mousedown_addText.bind(this);

        _global.addEventListener("keydown", handle_keydown.bind(this), false);
        _global.addEventListener("keyup", handle_keyup.bind(this), false);
        document.body.addEventListener("dragover", stop_default_drop.bind(this), false);
        document.body.addEventListener("drop", stop_default_drop.bind(this), false);
        this.drop_zone.addEventListener("dragover", handle_dragover.bind(this), false);
        this.drop_zone.addEventListener("drop", handle_drop_inLogoZone.bind(this), false);
        this.ctx.canvas.addEventListener("mousedown", this._handle_mousedown, false);
        this.ctx.canvas.addEventListener("mousemove", this._handle_mousemove_move_notClicked, false);
        this.ctx.canvas.addEventListener("drop", handle_drop_inCanvas.bind(this), false);



        loadProduct(1);
    };

    CanvasEditor.prototype.createZoneEditor = function (options) {
        if(this.type) {
            return false;
        }

        var that = this;
        options = options || {};
        var canvas = null;

        //Canvas Zone
        if (options.canvas_zone) {
            if (typeof(options.canvas_zone) == "string") {
                that.canvas_zone = document.getElementById(options.canvas_zone);
                if (!that.canvas_zone) throw("canvas_zone element not found: " + options.canvas_zone );
            }
            else {
                that.canvas_zone = options.canvas_zone;
            }
        }
        else {
            throw("canvas_zone element not found: " + options.canvas_zone);
        }

        //Image Zone
        if (options.img_zone) {
            if (typeof(options.img_zone) == "string") {
                that.img_zone = document.getElementById(options.img_zone);
                if (!that.img_zone) throw("img_zone element not found: " + options.img_zone );
            }
            else {
                that.img_zone = options.img_zone;
            }
        }
        else {
            throw("img_zone element not found: " + options.img_zone);
        }

        //Canvas
        if (options.canvas) {
            if (typeof(options.canvas) == "string") {
                canvas = document.getElementById(options.canvas);
                canvas.width = options.width || 600;
                canvas.height = options.height || 600;
                if (!canvas) throw("Canvas element not found: " + options.canvas );
            }
            else {
                canvas = options.canvas;
            }
        }
        else {
            canvas = _createCanvas(options.width || 800, options.height || 600);
        }

        canvas.style.position = "relative";
        that.ctx = canvas.getContext("2d");
        that.type = type.ZONE;

        that.current_img_id = null;

        //Get all buttons
        var button_addZone = document.getElementById("editor_addZone");
        var button_move = document.getElementById("editor_move");
        var button_scale = document.getElementById("editor_scale");
        var button_rotate = document.getElementById("editor_rotate");
        var button_move_left = document.getElementById("editor_move_left");
        var button_move_right = document.getElementById("editor_move_right");
        var button_move_up = document.getElementById("editor_move_up");
        var button_move_down = document.getElementById("editor_move_down");
        var button_scale_v_shrink = document.getElementById("editor_scale_v_shrink");
        var button_scale_v_expand = document.getElementById("editor_scale_v_expand");
        var button_scale_h_shrink = document.getElementById("editor_scale_h_shrink");
        var button_scale_h_expand = document.getElementById("editor_scale_h_expand");
        var button_rotate_left = document.getElementById("editor_rotate_left");
        var button_rotate_right = document.getElementById("editor_rotate_right");
        var button_deleteZone = document.getElementById("editor_remove_zone");
        var button_save = document.getElementById("editor_save");

        //Get divs
        var div_editor_addzone = document.getElementById("div_editor_addzone");
        var div_editor_mainButtons =  document.getElementById("div_editor_mainButtons");
        var div_editor_moveButtons =  document.getElementById("div_editor_moveButtons");
        var div_editor_scaleButtons =  document.getElementById("div_editor_scaleButtons");
        var div_editor_rotateButtons =  document.getElementById("div_editor_rotateButtons");
        var div_editor_removeButton =  document.getElementById("div_editor_removeButton");
        var div_editor_saveButton =  document.getElementById("div_editor_saveButton");

        div_editor_addzone.style.display = "none";
        div_editor_mainButtons.style.display = "none";
        div_editor_moveButtons.style.display = "none";
        div_editor_scaleButtons.style.display = "none";
        div_editor_rotateButtons.style.display = "none";
        div_editor_removeButton.style.display = "none";
        div_editor_saveButton.style.display = "none";

        //START

        this.manageDivs = function() {
            if(this.current_img_id === null) {
                div_editor_addzone.style.display = "none";
                div_editor_mainButtons.style.display = "none";
                div_editor_moveButtons.style.display = "none";
                div_editor_scaleButtons.style.display = "none";
                div_editor_rotateButtons.style.display = "none";
                div_editor_removeButton.style.display = "none";
                div_editor_saveButton.style.display = "none";
            }
            else {
                div_editor_addzone.style.display = "block";
                div_editor_saveButton.style.display = "block";
                if (this.selectedEntity) {
                    div_editor_mainButtons.style.display = "block";
                    div_editor_removeButton.style.display = "block";
                }
                else {
                    div_editor_mainButtons.style.display = "none";
                    div_editor_moveButtons.style.display = "none";
                    div_editor_scaleButtons.style.display = "none";
                    div_editor_rotateButtons.style.display = "none";
                    div_editor_removeButton.style.display = "none";
                }
            }
        };

        //button handlers
        function handle_button_click_move() {
            div_editor_moveButtons.style.display = "block";
            div_editor_scaleButtons.style.display = "none";
            div_editor_rotateButtons.style.display = "none";
        }

        function handle_button_click_scale() {
            div_editor_moveButtons.style.display = "none";
            div_editor_scaleButtons.style.display = "block";
            div_editor_rotateButtons.style.display = "none";
        }

        function handle_button_click_rotate() {
            div_editor_moveButtons.style.display = "none";
            div_editor_scaleButtons.style.display = "none";
            div_editor_rotateButtons.style.display = "block";
        }

        function handle_button_click_save() {
            this._updateNormals();
            saveZones(0);
        }

        button_addZone.addEventListener("mousedown", handle_button_click_addZone.bind(this), false);
        button_move.addEventListener("mousedown", handle_button_click_move.bind(this), false);
        button_scale.addEventListener("mousedown", handle_button_click_scale.bind(this), false);
        button_rotate.addEventListener("mousedown", handle_button_click_rotate.bind(this), false);
        button_move_left.addEventListener("mousedown", handle_button_click_move_left.bind(this), false);
        button_move_right.addEventListener("mousedown", handle_button_click_move_right.bind(this), false);
        button_move_up.addEventListener("mousedown", handle_button_click_move_up.bind(this), false);
        button_move_down.addEventListener("mousedown", handle_button_click_move_down.bind(this), false);
        button_scale_v_shrink.addEventListener("mousedown", handle_button_click_scale_v_shrink.bind(this), false);
        button_scale_v_expand.addEventListener("mousedown", handle_button_click_scale_v_expand.bind(this), false);
        button_scale_h_shrink.addEventListener("mousedown", handle_button_click_scale_h_shrink.bind(this), false);
        button_scale_h_expand.addEventListener("mousedown", handle_button_click_scale_h_expand.bind(this), false);
        button_rotate_left.addEventListener("mousedown", handle_button_click_rotate_left.bind(this), false);
        button_rotate_right.addEventListener("mousedown", handle_button_click_rotate_right.bind(this), false);
        button_deleteZone.addEventListener("mousedown", handle_button_click_deleteEntity.bind(this), false);
        button_save.addEventListener("mousedown", handle_button_click_save.bind(this), false);


        //JSON
        //json-->javascript
        function configureJSON(json) {
            console.log(json);
            that.json_content = json;
            for(var i = 0; i < json.length; ++i) {
                var html_image = document.createElement("img");
                //html_image.setAttribute("type", "image");
                html_image.setAttribute("src", json[i].url);
                html_image.setAttribute("class", "thumb");
                html_image.dataset.id = json[i].id;

                html_image.addEventListener("click", function(event) {
                    that._switchImage(event.target.dataset.id);
                },false);

                var img = new Image();
                img.addEventListener("load", (function(event) {
                    var _id = event.target.dataset.id;
                    that.entities[_id] = createEntity("product", true, event.target, 0.5, 0.5, 1, 1, event.target.naturalWidth, event.target.naturalHeight, event.target.naturalWidth, event.target.naturalHeight, 0, that.strokeColor);
                    that.entities[_id].ctx = this.ctx;

                    //load existent zones
                    for(var j = 0; j < this.zone.length; ++j) {
                        var o = this.zone[j].config;

                        var entity = that.entities[_id].createChild("zone", false, null, o.x, o.y, o.width, o.height, DEGtoRAD(o.angle), that.getRandomColor());
                        entity.id = this.zone[j].id;
                    }
                }).bind(json[i]), false);

                img.addEventListener("click", function(event) {
                    that._switchImage(event.target.dataset.id);
                },false);

                img.dataset.id = json[i].id;
                img.dataset.url = json[i].url;
                img.setAttribute("class", "thumb");
                img.src = json[i].url;
                //var div = document.createElement("div");
                //that.img_zone.appendChild(div);
                //div.appendChild(html_image);
                that.img_zone.appendChild(html_image);
            }
        }

        //javascript-->json
        function serializeJSON() {
            var json = [];
            for (var i = 0; i < that.entities.length; ++i) {
                if (!that.entities[i]) continue;
                json[i] = that.entities[i].serializeJSON();
            }
            console.log(json);
            console.log(JSON.stringify(json));
            return json;
        }

        function loadProduct(id) {
            //delete _global.localStorage.json;
            if(!_global.localStorage.json) {
                var xmlhttp = new XMLHttpRequest();
                var url = "assets/test.json";

                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                        var json = JSON.parse(xmlhttp.responseText);
                        configureJSON(json);
                    }
                };
                xmlhttp.open("GET", url, true);
                xmlhttp.send();
            }
            else {
                configureJSON(JSON.parse(_global.localStorage.json));
            }
        }

        function saveZones(id) {
            _global.localStorage.json = JSON.stringify(serializeJSON());
        }

        //Other handlers
        this._handle_mouseup = handle_mouseup.bind(this);
        this._handle_mousemove_resize = handle_mousemove_resize.bind(this);
        this._handle_mousemove_rotate = handle_mousemove_rotate.bind(this);
        this._handle_mousemove_move_notClicked = handle_mousemove_move_notClicked.bind(this);
        this._handle_mousemove_move_clicked = handle_mousemove_move_clicked.bind(this);
        this._handle_mousedown = handle_mousedown.bind(this);



        _global.addEventListener("keydown", handle_keydown.bind(this), false);
        _global.addEventListener("keyup", handle_keyup.bind(this), false);
        document.body.addEventListener("dragover", stop_default_drop.bind(this), false); //TODO: remove?
        document.body.addEventListener("drop", stop_default_drop.bind(this), false); //TODO: remove?
        this.ctx.canvas.addEventListener("mousedown", this._handle_mousedown, false);
        this.ctx.canvas.addEventListener("mousemove", this._handle_mousemove_move_notClicked, false);

        loadProduct(1);
    };

    function adjustCanvasTo(canvas, entity, width, height, minimumSize) {
        var aspect = entity.image.naturalWidth/entity.image.naturalHeight;
        canvas.height = height || minimumSize;
        canvas.width = (height * aspect) || minimumSize*aspect;
        if(canvas.width > width) {
            canvas.width = width || minimumSize;
            canvas.height = (width / aspect) || minimumSize/aspect;
        }
    }

    CanvasEditor.prototype.resizeCanvas = function(width, height) {
        if(this.current_img_id !== null) {
            //this.entities[this.current_img_id].update(width, height);
            //this._updateNormals();
            adjustCanvasTo(this.ctx.canvas, this.entities[this.current_img_id], width, height, this.minimumSize);
        }
        this.update();
        this.draw();
    };

    CanvasEditor.prototype.draw = function() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        if(this.current_img_id !== null) {
            var obj = {
                ctx: this.ctx,
                selectedEntity: this.selectedEntity,
                entityMouseOver: this.entityMouseOver,
                lineWidth: this.lineWidth,
                squaresSize: this.squaresSize,
                sizeLine: this.sizeLine
            };
            this.entities[this.current_img_id].draw(obj);
        }
    };

    CanvasEditor.prototype.moveTo = function (x, y) {
        if (this.selectedEntity) {
            this.selectedEntity.setPosition(x,y);
            this.draw();
        }
    };
    CanvasEditor.prototype.translate = function (x, y) {
            this.moveTo(this.selectedEntity.x + x, this.selectedEntity.y + y);
    };

    CanvasEditor.prototype.rotateRAD = function (angle_rad) {
        if (this.selectedEntity) {
            this.selectedEntity.rotate(angle_rad);
            this.draw();
        }
    };

    CanvasEditor.prototype.rotateDEG = function (angle_deg) {
        this.rotateRAD(DEGtoRAD(angle_deg));
    };

    CanvasEditor.prototype.resetRotation = function () {
        if (this.selectedEntity) {
            this.selectedEntity.resetRotation();
            this.draw();
        }
    };

    CanvasEditor.prototype.resize = function (width, height) {
        if (this.selectedEntity) {
            this.selectedEntity.resize(width, height, this.minimumSize);
            this.draw();
        }
    };

    CanvasEditor.prototype.resizeStep = function(width, height) {
        this.resize(this.selectedEntity.width + width, this.selectedEntity.height + height);
    };

    CanvasEditor.prototype.addZone = function() {
        if(this.current_img_id !== null) {
            var aspect = this.ctx.canvas.width / this.ctx.canvas.height;
            return this.entities[this.current_img_id].createChild("zone", true, null, 0.5, 0.5, 0.2, 0.2 * aspect, 0, this.getRandomColor());
        }
    };

    CanvasEditor.prototype.addText = function() {
        if(this.current_img_id !== null) {
            var aspect = this.ctx.canvas.width / this.ctx.canvas.height;
            return this.entities[this.current_img_id].createChild("text", true, null, 0.5, 0.5, 0.3, 0.1 * aspect, 0, this.getRandomColor());
        }
    };

    CanvasEditor.prototype.getRandomColor = function() {
        return this.color_list[Math.floor(Math.random()*this.color_list.length)];
    };

    //*** START INTERNAL FUNCTIONS ***
    CanvasEditor.prototype._switchImage = function(id_image) {
        if(this.current_img_id !== id_image) {
            if(this.current_img_id !== null) this._updateNormals();
            this.current_img_id = id_image;
            this.selectedEntity = null;
            this.entityMouseOver = null;
            this.manageDivs();
            this.resizeCanvas(this.canvas_zone.offsetWidth, this.canvas_zone.offsetHeight);
        }
    };

    CanvasEditor.prototype._mouseDown = function(event) {
        //Check if is resizing
        if (this.selectedEntity) {
            //this._checkCorners(event);
            this.selectedEntity.checkCorners({x:event.localX, y:event.localY, squaresSize: this.squaresSize, sizeLine: this.sizeLine, ctx: this.ctx});
            if (anchor.resizing) {
                offsetX = event.globalX - event.localX;
                offsetY = event.globalY - event.localY;
                _global.addEventListener("mousemove", this._handle_mousemove_resize, false);
                _global.addEventListener("mouseup", this._handle_mouseup, false);
                this.draw();
                return true;
            }
            else if (anchor.rotating) {
                tempAngle = this.selectedEntity.angle;
                offsetX = event.globalX - event.localX;
                offsetY = event.globalY - event.localY;

                this._setPositionToRotate(vec_tmp_angles, event.globalX - offsetX, event.globalY - offsetY);

                _global.addEventListener("mousemove", this._handle_mousemove_rotate, false);
                _global.addEventListener("mouseup", this._handle_mouseup, false);
                this.draw();
                return true;
            }
        }

        //if not resizing, check if selecting
        if(this.current_img_id !== null) {
            this.selectedEntity = this.entities[this.current_img_id].mouseInsideChildren(event.localX, event.localY);
            if (this.selectedEntity) {
                vec2.transformMat3(vec_tmp1, vec2.set(vec_tmp1,0,0), this.selectedEntity.getGlobalMatrix());
                offsetX = event.globalX - vec_tmp1[0];
                offsetY = event.globalY - vec_tmp1[1];
                //console.log(vec_tmp1, event.localX, event.localY);

                _global.addEventListener("mousemove", this._handle_mousemove_move_clicked, false);
                _global.addEventListener("mouseup", this._handle_mouseup, false);
            }
            this.draw();
        }

        //if(this.selectedEntity instanceof EntityText) {
        //    this.ctx.canvas.addEventListener
        //}
        //else {
        //
        //}
    };

    CanvasEditor.prototype.updateAll = function() {
        var length = this.entities.length;
        for(var i = 0; i < length; ++i) {
            this.entities[i].update(this.ctx.canvas.width, this.ctx.canvas.height);
        }
    };

    CanvasEditor.prototype.update = function() {
        if(this.current_img_id !== null) this.entities[this.current_img_id].update(this.ctx.canvas.width, this.ctx.canvas.height);
    };

    CanvasEditor.prototype._updateNormalsAll = function() {
        var length = this.entities.length;
        for(var i = 0; i < length; ++i) {
            this.entities[i].updateNormals(this.ctx.canvas.width, this.ctx.canvas.height);
        }
    };

    CanvasEditor.prototype._updateNormals = function() {
        if(this.current_img_id !== null) this.entities[this.current_img_id].updateNormals(this.ctx.canvas.width, this.ctx.canvas.height);
    };

    CanvasEditor.prototype.searchImage = function(name) {
        var length = this.images.length;
        for(var i = 0; i < length; ++i) {
            if(this.images[i].dataset.filename === name) return this.images[i];
        }
        return null;
    };

    CanvasEditor.prototype.getDropData = function(event) {
        var data = {};
        console.log(event.hasOwnProperty("dataTransfer"));
        console.log(event.dataTransfer);
        //if( event.hasOwnProperty("dataTransfer") ) {
        if(event.dataTransfer) {
            data.text = event.dataTransfer.getData("text");
            data.files = event.dataTransfer.files;
            return data;
        }
        else return null;
    };

    function imageLoadedEvent (event) {
        var that = this.that;
        var parent = this.parent;
        parent.createChild("image", false, event.target, parent.width/2, parent.height/2, event.target.naturalWidth, event.target.naturalHeight, 0, that.strokeColor);
        if(that.current_img_id) that.draw();
    }

    CanvasEditor.prototype._drop_inLogoZone = function(event) {
        var data = this.getDropData(event);
        if(data === null) return false;

        for(var i = 0; i < data.files.length; ++i) {
            this._createNewLogo(data.files[i]);
        }
    };

    CanvasEditor.prototype._drop_inCanvas = function(event) {
        var data = this.getDropData(event);
        if(data === null) return false;

        var image, parent, i;

        for(i = 0; i < data.files.length; ++i) {
            image = this.searchImage(data.files[i].name);
            if(image) {
                if(this.current_img_id !== null) {
                    parent = this.entities[this.current_img_id].mouseInsideChildren(event.localX, event.localY, true);
                    if(parent) {
                        parent.createChild("image", false, image, parent.width/2, parent.height/2, image.naturalWidth, image.naturalHeight, 0, this.strokeColor);
                        this.draw();
                    }
                }
            }
            else {
                if(this.current_img_id !== null) {
                    parent = this.entities[this.current_img_id].mouseInsideChildren(event.localX, event.localY, true);
                    if(parent) image = this._createNewLogo(data.files[i], imageLoadedEvent.bind( {that:this, parent:parent} ));
                }
            }
        }

        if(data.text) {
            image = this.searchImage(data.text);
            if(image) {
                if(this.current_img_id !== null) {
                    parent = this.entities[this.current_img_id].mouseInsideChildren(event.localX, event.localY, true);
                    if(parent) {
                        parent.createChild("image", false, image, parent.width/2, parent.height/2, image.naturalWidth, image.naturalHeight, 0, this.strokeColor);
                        this.draw();
                    }
                }
            }
        }
    };

    CanvasEditor.prototype._createNewLogo = function(file, onloadImage) {
        var that = this;
        if (!(file instanceof File)) return null;
        if (file.type.substring(0, 6) !== "image/") {
            console.log("File is not an image: " + file.type);
            return null;
        }

        var img = this.searchImage(file.name);
        if(img) {
            //console.log("Image already exists: " + file.name);
            return img;
        }

        img = new Image();
        var html_img = document.createElement("img");
        if(onloadImage) {
            img.addEventListener("load", onloadImage, false);
        }

        var reader = new FileReader();
        reader._filename = file.name;
        reader.addEventListener("loadend", (function() {
            html_img.addEventListener("dragstart", function(e) {
                e.dataTransfer.setData("text", e.target.dataset.filename);
            }, false);

            html_img.src = this.result;
            img.src = this.result;
            html_img.dataset.filename = this._filename;
            img.dataset.filename = this._filename;
            html_img.setAttribute("class", "thumb");
        }),false);
        reader.readAsDataURL(file);

        that.logos_images.push(html_img);
        that.drop_zone.appendChild(html_img);
        that.images.push(img);

        return img;
    };

    //if normalized === true : x, y , width, height are normalized
    //else: x, y, width, height are not normalized
    function createEntity(type, normalized, img, _x, _y, _width, _height, container_width, container_height, naturalContainer_width, naturalContainer_height, angle_rad, strokeColor) {
        var x, y, width, height, normal_x, normal_y, normal_width, normal_height;

        var entity;
        switch(type) {
            case "zone":
                entity = new EntityZone();
                break;
            case "image":
                entity = new EntityImage();
                entity.image = img;
                break;
            case "product":
                entity = new EntityProduct();
                entity.image = img;
                break;
            case "canvas":
                entity = new EntityCanvas();
                break;
            case "text":
                entity = new EntityText();
                break;
            default:
                return false;
        }
        if(normalized) {
            normal_x = _x;
            normal_y = _y;
            normal_width = _width;
            normal_height = _height;
            x = normal_x * container_width;
            y = normal_y * container_height;
            width = normal_width * container_width;
            height = normal_height * container_height;
        }
        else {

            x = _x;
            y = _y;
            width = _width;
            height = _height;

            var aspect = width/height;
            if(width > container_width) {
                width = container_width;
                height = width/aspect;
            }
            if(height > container_height) {
                height = container_height;
                width = height*aspect;
            }
            normal_x = x / container_width;
            normal_y = y / container_height;
            normal_width = width / container_width;
            normal_height = height / container_height;
        }

        var pos = vec2.fromValues(x, y);
        var mat_trans = mat3.create();
        mat3.translate(mat_trans, mat_trans, pos);
        var mat_rot = mat3.create();
        var model;
        if(!angle_rad) {
            model = mat3.clone(mat_trans);
        }
        else {
            mat3.rotate(mat_rot, mat_rot, angle_rad);
            model = mat3.multiply(mat3.create(), mat_trans, mat_rot);
        }

        entity.x = x;
        entity.y = y;
        entity.width = width;
        entity.width = width;
        entity.height = height;
        entity.normal_x = normal_x;
        entity.normal_y = normal_y;
        entity.normal_width = normal_width;
        entity.normal_height = normal_height;
        entity.container_width = container_width;
        entity.container_height = container_height;
        entity.naturalContainer_width = naturalContainer_width;
        entity.naturalContainer_height = naturalContainer_height;
        entity.angle = angle_rad;
        entity.strokeColor = strokeColor;
        entity.position = pos;
        entity.translation = mat_trans;
        entity.rotation = mat_rot;
        entity.model = model;

        return entity;
    }

    /*CanvasEditor.prototype.__resizeEntity = function(event) {
        var entity = this.selectedEntity;
        var min = this.minimumSize;
        var aspect = this.selectedEntity.width / this.selectedEntity.height;

        var a;
        var b;
        if (anchor.x) a = 1;
        else a = -1;
        if (anchor.y) b = 1;
        else b = -1;

        //get origin
        if(!anchor.x && !anchor.y) {
            vec2.set(vec_tmp1, entity.width/2, entity.height/2);
            //vec2.copy(vec_tmp1, v[2]);
        }
        if( anchor.x && !anchor.y) {
            vec2.set(vec_tmp1,-entity.width/2, entity.height/2);
            //vec2.copy(vec_tmp1, v[3]);
        }
        if( anchor.x &&  anchor.y) {
            vec2.set(vec_tmp1,-entity.width/2,-entity.height/2);
            //vec2.copy(vec_tmp1, v[0]);
        }
        if(!anchor.x &&  anchor.y) {
            vec2.set(vec_tmp1, entity.width/2,-entity.height/2);
            //vec2.copy(vec_tmp1, v[1]);
        }

        //translate mouse to local
        mat3.invert(mat_tmp, entity.model);
        vec2.set(vec_tmp2, event.globalX - offsetX, event.globalY - offsetY);
        vec2.transformMat3(vec_tmp2, vec_tmp2, mat_tmp);

        //get width and height
        var width =  (vec_tmp2[0] - vec_tmp1[0])*a;
        var height = (vec_tmp2[1] - vec_tmp1[1])*b;

        //check negative width/height
        if(width < 0) {
            anchor.x = !anchor.x;
            width = -width;
            a = -a;
            if(this.keepProportions) {
                anchor.y = !anchor.y;
                height = -height;
                b = -b;
            }
        }
        if(height < 0 && (!this.keepProportions || !anchor.width) ) {
            anchor.y = !anchor.y;
            height = -height;
            b = -b;
        }
        var oldWidth = width;
        var oldHeight = height;

        //check minimum size
        if(width < min) width = min;
        if(height < min) height = min;

        //check if keepProportions is true
        if(this.keepProportions && anchor.width && anchor.height) {
            if(aspect <= 1) height = width / aspect;
            else width = height * aspect;
        }

        //get new entity local center
        var x = 0;
        var y = 0;
        if(anchor.width) x = (vec_tmp2[0] + vec_tmp1[0])/2 + (width-oldWidth)/2*a;
        if(anchor.height) y = (vec_tmp2[1] + vec_tmp1[1])/2 + (height-oldHeight)/2*b;
        vec2.set(vec_tmp1, x, y);

        //get global center
        vec2.transformMat3(vec_tmp1, vec_tmp1, entity.model);

        entity.x = vec_tmp1[0];
        entity.y = vec_tmp1[1];
        if(anchor.width) entity.width = width;
        if(anchor.height) entity.height = height;

        //update matrices
        this._updateMatrices(entity);
        this._updateEntityNormals(entity, this.ctx.canvas.width, this.ctx.canvas.height);


        this.draw();
        this._resizeInCanvas(entity);


        this._updateEntityNormals(entity, this.ctx.canvas.width, this.ctx.canvas.height);
        this.draw();
    };

    CanvasEditor.prototype._resizeInCanvas = function(entity) {
        //get all new vertices
        var oldWidth = entity.width;
        var oldHeight = entity.height;

        var a;
        var b;
        if (anchor.x) a = 1;
        else a = -1;
        if (anchor.y) b = 1;
        else b = -1;

        var v = [];
        v[0] = vec2.fromValues(-entity.width/2,-entity.height/2);
        v[1] = vec2.fromValues( entity.width/2,-entity.height/2);
        v[2] = vec2.fromValues( entity.width/2, entity.height/2);
        v[3] = vec2.fromValues(-entity.width/2, entity.height/2);
        var aux, _vec;
        for(var i = 0; i < 4; ++i) {
            _vec = v[i];
            vec2.transformMat3(_vec, _vec, entity.model);
            if( _vec[0] < 0 ) { //width

            }
            else if( _vec[0] > this.ctx.canvas.width) {
            }
        }
        this._updateMatrices(entity);
        this._updateEntityNormals(entity, this.ctx.canvas.width, this.ctx.canvas.height);
    };*/

    CanvasEditor.prototype._resizeEntity = function(event) {

        if(this.selectedEntity.parent) {
            mat3.multiply(mat_tmp, this.selectedEntity.rotation, this.selectedEntity.parent.rotation);
            mat3.invert(mat_tmp, mat_tmp);
        }
        else {
            mat3.invert(mat_tmp, this.selectedEntity.rotation);
        }

        vec2.set(vec_tmp1, event.deltaX, event.deltaY);
        vec2.transformMat3(vec_tmp1, vec_tmp1, mat_tmp);

        event.deltaX = vec_tmp1[0];
        event.deltaY = vec_tmp1[1];

        var a;
        var b;
        if (anchor.x) a = 1;
        else a = -1;
        if (anchor.y) b = 1;
        else b = -1;

        var width = 0;
        var height = 0;
        var aspect = this.selectedEntity.width / this.selectedEntity.height;

        var min = this.minimumSize;
        var oldWidth = this.selectedEntity.width;
        var oldHeight = this.selectedEntity.height;

        if (anchor.width) {
            width = event.deltaX * a;
            this.selectedEntity.width += width;
            width = width / 2 * a;
            if (Math.abs(this.selectedEntity.width) < min) {
                this.selectedEntity.width = -min * sign(this.selectedEntity.width);
                width = (this.selectedEntity.width - oldWidth) / 2 * a;
            }
        }

        if (anchor.height) {
            if (!this.keepProportions || !anchor.width) {
                height = event.deltaY * b;
                this.selectedEntity.height += height;
                height = height / 2 * b;
                if (Math.abs(this.selectedEntity.height) < min) {
                    this.selectedEntity.height = -min * sign(this.selectedEntity.height);
                    height = (this.selectedEntity.height - oldHeight) / 2 * b;
                }
            }
            else {
                height = this.selectedEntity.width / aspect;
                this.selectedEntity.height = height;
                height = (width / aspect) * a * b;
                if (Math.abs(this.selectedEntity.height) < min) {
                    this.selectedEntity.height = -min * sign(this.selectedEntity.height);
                    height = (this.selectedEntity.height - oldHeight) / 2 * b;
                    width = this.selectedEntity.height * aspect;
                    this.selectedEntity.width = width;
                    width = (height * aspect) * a * b;
                }
            }
        }

        vec2.set(vec_tmp1, width, height);
        vec2.transformMat3(vec_tmp1, vec_tmp1, this.selectedEntity.rotation);
        width = vec_tmp1[0];
        height = vec_tmp1[1];

        this.selectedEntity.x += width;
        this.selectedEntity.y += height;
        this.selectedEntity.updateMatrices();

        if(this.selectedEntity.parent) {
            this.selectedEntity.updateNormals(this.selectedEntity.parent.width, this.selectedEntity.parent.height);
        }
        else {
            this.selectedEntity.updateNormals(this.ctx.canvas.width, this.ctx.canvas.height);
        }

        this.draw();
    };

    CanvasEditor.prototype._fixResize = function(entity) {
        if (entity) {
            if (entity.width < 0) entity.width = -entity.width;
            if (entity.height < 0) entity.height = -entity.height;
            this.draw();
        }
    };

    CanvasEditor.prototype._setPositionToRotate = function(out, x, y) {
        vec2.set(vec_tmp2, 0, 0);
        vec2.set(out, x, y);
        vec2.transformMat3(vec_tmp2, vec_tmp2, this.selectedEntity.getGlobalMatrix());
        vec2.subtract(out, out, vec_tmp2);
        vec2.normalize(out, out);
    };

    CanvasEditor.prototype._rotateEntity = function(event) {
        this._setPositionToRotate(vec_tmp1, event.globalX - offsetX, event.globalY - offsetY);

        vec2.normalize(vec_tmp1, vec_tmp1);
        var angle = vec2.computeSignedAngle(vec_tmp1, vec_tmp_angles);
        vec2.copy(vec_tmp_angles, vec_tmp1);
        tempAngle += angle;

        if(this.stickyAngles) {
            if(!tempAngle) angle = 0;
            else angle = parseInt(RADtoDEG(tempAngle)/this.StickyAnglesSteps) * this.StickyAnglesSteps;
            this.resetRotation();
            this.rotateDEG(angle);
        }
        else {
            this.rotateRAD(angle);
            this.draw();
        }
    };

    CanvasEditor.prototype._setNewPosition = function(event) {
        vec2.set(vec_tmp1, event.globalX - offsetX, event.globalY - offsetY);
        if(this.selectedEntity.parent) {
            mat3.translate(mat_tmp, identity, vec2.fromValues(-this.selectedEntity.parent.width/2, -this.selectedEntity.parent.height/2));
            mat3.multiply(mat_tmp, this.selectedEntity.parent.getGlobalMatrix(), mat_tmp);
            mat3.invert(mat_tmp, mat_tmp);

            vec2.transformMat3(vec_tmp1, vec_tmp1, mat_tmp);
            console.log(vec_tmp1);
            this.moveTo(vec_tmp1[0], vec_tmp1[1]);
            console.log(this.selectedEntity.x, this.selectedEntity.y);
        }
        else this.moveTo(event.globalX - offsetX, event.globalY - offsetY);
    };

    CanvasEditor.prototype._check_mouseOverEntity = function(event) {
        if(this.current_img_id !== null) {
            var entity = this.entities[this.current_img_id].mouseInsideChildren(event.localX, event.localY);
            if (entity) {
                this.entityMouseOver = entity;
                this.draw();
            }
             else {
                if (this.entityMouseOver) {
                    this.entityMouseOver = null;
                    this.draw();
                }
            }
        }
    };

    CanvasEditor.prototype._deleteSelectedEntity = function() {
        if (this.selectedEntity && this.current_img_id !== null) {
            this.entities[this.current_img_id].deleteChild(this.selectedEntity);
            if(this.entityMouseOver === this.selectedEntity) this.entityMouseOver = null;
            this.selectedEntity = null;
            this.draw();
            if(this.manageDivs) this.manageDivs();
        }
    };

    CanvasEditor.prototype._promoteSelectedEntity = function() {
        if (this.selectedEntity && this.current_img_id !== null) {
            this.entities[this.current_img_id].promoteChild(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype._demoteSelectedEntity = function() {
        if (this.selectedEntity && this.current_img_id !== null) {
            this.entities[this.current_img_id].demoteChild(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype._deleteAllEntities = function() {
        if(this.current_img_id !== null) {
            this.entities[this.current_img_id].deleteAllChildren();
            this.draw();
            if(this.manageDivs) this.manageDivs();
        }
    };

    CanvasEditor.prototype._keyDown = function(event) {
        //console.log(event.keyCode);
        switch(event.keyCode) {
            case 46: //DEL
                if (this.selectedEntity) this._deleteSelectedEntity();
                break;
            case 107: //+
            case 187:
                if (this.selectedEntity) this._promoteSelectedEntity();
                break;
            case 109: //-
            case 189:
                if (this.selectedEntity) this._demoteSelectedEntity();
                break;
            case 16: //shift
                if (!shiftPressed) { //shift
                    shiftPressed = true;
                    this.keepProportions = !this.keepProportions;
                    this.stickyAngles = !this.stickyAngles;
                }
                break;
            //// TEST ////
            case 190: //.
                if (this.selectedEntity) this.rotateDEG(1);
                break;
            case 188:
                if (this.selectedEntity) this.rotateDEG(-1);
                break;
            case 37: //
                if (this.selectedEntity) this.translate(-1,0);
                break;
            case 39:
                if (this.selectedEntity) this.translate(1,0);
                break;
            case 38:
                if (this.selectedEntity) this.translate(0,-1);
                break;
            case 40:
                if (this.selectedEntity) this.translate(0,1);
                break;
            /*case 13: //ENTER
                this._resizeInCanvas(this.selectedEntity);
                this.draw();
                break;*/
        }
    };

    CanvasEditor.prototype._keyUp = function(event) {
        //// TEST ////
        switch(event.keyCode) {
            case 16:
                this.keepProportions = !this.keepProportions;
                this.stickyAngles = !this.stickyAngles;
                shiftPressed = false;
                break;
        }
    };

    //*** END INTERNAL FUNCTIONS ***

    //*** START HANDLERS ***

    //*** INTERACTION HANDLERS ***
    function handle_dragover(event) {
        console.log("dragover");
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
    }

    function handle_drop_inLogoZone(event) {
        console.log("drop_inLogoZone");
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._drop_inLogoZone(event);
    }

    function handle_drop_inCanvas(event) {
        console.log("drop_inCanvas");
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._drop_inCanvas(event);
    }

    function handle_mousemove_move_clicked(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        if (this.selectedEntity) this._setNewPosition(event);
    }

    function handle_mousemove_move_notClicked(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        if (this.selectedEntity) {
            //this._checkCorners(event);
            this.selectedEntity.checkCorners({x:event.localX, y:event.localY, squaresSize: this.squaresSize, ctx: this.ctx});
        }
        if(this.current_img_id !== null) this._check_mouseOverEntity(event);
    }

    function handle_mousemove_resize(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        if (this.selectedEntity) this._resizeEntity(event);
    }

    function handle_mousemove_rotate(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        if (this.selectedEntity) this._rotateEntity(event);
    }

    function handle_mouseup(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._fixResize(this.selectedEntity);
        _global.removeEventListener("mousemove", this._handle_mousemove_move_clicked, false);
        this.ctx.canvas.addEventListener("mousemove", this._handle_mousemove_move_notClicked, false);
        _global.removeEventListener("mousemove", this._handle_mousemove_resize, false);
        _global.removeEventListener("mousemove", this._handle_mousemove_rotate, false);
    }

    function handle_mousedown(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this.ctx.canvas.removeEventListener("mousemove", this._handle_mousemove_move_notClicked, false);
        this._mouseDown(event);
        this.manageDivs();
    }

    function handle_mousedown_addText(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        if(this.current_img_id !== null) {
            var entity = this.entities[this.current_img_id].mouseInsideChildren(event.localX, event.localY, true);
            console.log(entity);
            if(entity && entity instanceof EntityCanvas) {
                var aspect = entity.width / entity.height;
                this.selectedEntity = entity.createChild("text", true, null, 0.5, 0.5, 0.45, 0.2 * aspect, 0, this.getRandomColor());;
                this.manageDivs();
                this.draw();
            }
        }
        this.ctx.canvas.style.cursor = "auto";
        this.ctx.canvas.removeEventListener("mousedown", this._handle_mousedown_addText, false);
        this.ctx.canvas.addEventListener("mousedown", this._handle_mousedown, false);
    }

    function handle_keydown(event) {
        this._keyDown(event);
    }

    function handle_keyup(event) {
        this._keyUp(event);
    }

    function stop_default_drop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    //*** BUTTON HANDLERS ***
    function handle_button_click_move_left() {
        if (this.selectedEntity) this.translate(-this.pixels_move,0);
    }

    function handle_button_click_move_right() {
        if (this.selectedEntity) this.translate(this.pixels_move,0);
    }

    function handle_button_click_move_up() {
        if (this.selectedEntity) this.translate(0,-this.pixels_move);
    }

    function handle_button_click_move_down() {
        if (this.selectedEntity) this.translate(0,this.pixels_move);
    }

    function handle_button_click_scale_v_shrink() {
        if (this.selectedEntity) this.resizeStep(0,-this.pixels_scale);
    }

    function handle_button_click_scale_v_expand() {
        if (this.selectedEntity) this.resizeStep(0,this.pixels_scale);
    }

    function handle_button_click_scale_h_shrink() {
        if (this.selectedEntity) this.resizeStep(-this.pixels_scale,0);
    }

    function handle_button_click_scale_h_expand() {
        if (this.selectedEntity) this.resizeStep(this.pixels_scale,0);
    }

    function handle_button_click_rotate_left() {
        if (this.selectedEntity) this.rotateDEG(-this.degrees_rotate);
    }

    function handle_button_click_rotate_right() {
        if (this.selectedEntity) this.rotateDEG(this.degrees_rotate);
    }

    function handle_button_click_deleteEntity() {
        if(this.selectedEntity) this._deleteSelectedEntity();
    }

    function handle_button_click_addZone() {
        if(this.current_img_id !== null) {
            this.selectedEntity = this.addZone();
            this.manageDivs();
            this.draw();
        }
    }

    function handle_button_deleteAll() {
        this._deleteAllEntities();
    }

    function handle_button_addText() {
        this.ctx.canvas.removeEventListener("mousedown", this._handle_mousedown, false);
        this.ctx.canvas.addEventListener("mousedown", this._handle_mousedown_addText, false);
        this.ctx.canvas.style.cursor = "crosshair";
    }

    //*** END HANDLERS ***

    //*** OTHER FUNCTIONS ***
    function pointerInside(x, y, originX, originY, width, height) {
        return (x >= originX && y >= originY && x <= (originX + width) && y <= (originY + height));
    }

    function _augmentEvent(event) {
        event.globalX = event.clientX;
        event.globalY = event.clientY;

        if(event.offsetX && (event.offsetX != event.layerX || event.offsetY != event.layerY)) {
            event.localX = event.offsetX;
            event.localY = event.offsetY;
        }
        else {
            event.localX = event.layerX;
            event.localY = event.layerY;
        }

        event.deltaX = event.globalX - lastX;
        event.deltaY = event.globalY - lastY;
        lastX = event.globalX;
        lastY = event.globalY;
    }

    function _createCanvas(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    function sign(num) {
        return num > 0 ? 1 : num < 0 ? -1 : 1;
    }

    vec2.perpdot = function (a, b) {
        return a[1] * b[0] + -a[0] * b[1];
    };

    vec2.computeSignedAngle = function (a, b) {
        return Math.atan2(vec2.perpdot(a, b), vec2.dot(a, b));
    };

    /**
     *
     * @param angle
     * @returns {number}
     */
    function DEGtoRAD(angle) {
        return angle * (Math.PI/180);
    }

    /**
     *
     * @param angle
     * @returns {number}
     */
    function RADtoDEG(angle) {
        return angle * (180/Math.PI);
    }
}(window));