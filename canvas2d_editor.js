/**
 * Created by Ricardo Navarro (rcnavarro7@gmail.com)
 */

(function(_global) {
    "use strict";

    //variables used during the execution
    //Temporal matrices and vectors
    var identity = mat3.create();
    var mat_tmp = mat3.create();
    var vec_tmp1 = vec2.create();
    var vec_tmp2 = vec2.create();

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
    //TODO: Bitmask
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
        this.minimumSize = 2; //minimum (width/height) of an entityh
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

    _global.CanvasEditor = CanvasEditor;


    function sign(num) {
        return num > 0 ? 1 : num < 0 ? -1 : 1;
    }

    function pointerInside(x, y, originX, originY, width, height) {
        return (x >= originX && y >= originY && x <= (originX + width) && y <= (originY + height));
    }

    function _augmentEvent(event) {
        if (event.offsetX === undefined) {
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

    function _createCanvas(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

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
        that.ctx = canvas.getContext("2d");
        that.type = type.IMAGE;
        that.current_img_id = 0;
        that.entities[that.current_img_id] = [];

        this._handle_mouseup = handle_mouseup.bind(this);
        this._handle_mousemove_resize = handle_mousemove_resize.bind(this);
        this._handle_mousemove_rotate = handle_mousemove_rotate.bind(this);
        this._handle_mousemove_move_notClicked = handle_mousemove_move_notClicked.bind(this);
        this._handle_mousemove_move_clicked = handle_mousemove_move_clicked.bind(this);

        _global.addEventListener("keydown", handle_keydown.bind(this), false);
        _global.addEventListener("keyup", handle_keyup.bind(this), false);
        document.body.addEventListener("dragover", stop_default_drop.bind(this), false);
        document.body.addEventListener("drop", stop_default_drop.bind(this), false);
        this.drop_zone.addEventListener("dragover", handle_dragover.bind(this), false);
        this.drop_zone.addEventListener("drop", handle_drop.bind(this), false);
        this.ctx.canvas.addEventListener("mousedown", handle_mousedown.bind(this), false);
        this.ctx.canvas.addEventListener("mousemove", this._handle_mousemove_move_notClicked, false);

    };


    //TODO: al apretar un boton llamar setInterval
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
        that.product_images = [];


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
            if(that.current_img_id === null) {
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
                if (that.selectedEntity) {
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
        }

        //button handlers
        function handle_button_click_addZone() {
            that.selectedEntity = that.addZone();
            that.manageDivs();
            that.draw();
        }

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

        function handle_button_click_deleteZone() {
            that._deleteSelectedEntity();
            that.manageDivs();
        }

        function handle_button_click_move_left() {
            if (that.selectedEntity) that.translate(-that.pixels_move,0);
        }

        function handle_button_click_move_right() {
            if (that.selectedEntity) that.translate(that.pixels_move,0);
        }

        function handle_button_click_move_up() {
            if (that.selectedEntity) that.translate(0,-that.pixels_move);
        }

        function handle_button_click_move_down() {
            if (that.selectedEntity) that.translate(0,that.pixels_move);
        }

        function handle_button_click_scale_v_shrink() {
            if (that.selectedEntity) that.resizeStep(0,-that.pixels_scale);
        }

        function handle_button_click_scale_v_expand() {
            if (that.selectedEntity) that.resizeStep(0,that.pixels_scale);
        }

        function handle_button_click_scale_h_shrink() {
            if (that.selectedEntity) that.resizeStep(-that.pixels_scale,0);
        }

        function handle_button_click_scale_h_expand() {
            if (that.selectedEntity) that.resizeStep(that.pixels_scale,0);
        }

        function handle_button_click_rotate_left() {
            if (that.selectedEntity) that.rotateDEG(-that.degrees_rotate);
        }

        function handle_button_click_rotate_right() {
            if (that.selectedEntity) that.rotateDEG(that.degrees_rotate);
        }

        function handle_button_click_save() {
            serializeJSON();
        }

        button_addZone.addEventListener("mousedown", handle_button_click_addZone, false);
        button_move.addEventListener("mousedown", handle_button_click_move, false);
        button_scale.addEventListener("mousedown", handle_button_click_scale, false);
        button_rotate.addEventListener("mousedown", handle_button_click_rotate, false);
        button_move_left.addEventListener("mousedown", handle_button_click_move_left, false);
        button_move_right.addEventListener("mousedown", handle_button_click_move_right, false);
        button_move_up.addEventListener("mousedown", handle_button_click_move_up, false);
        button_move_down.addEventListener("mousedown", handle_button_click_move_down, false);
        button_scale_v_shrink.addEventListener("mousedown", handle_button_click_scale_v_shrink, false);
        button_scale_v_expand.addEventListener("mousedown", handle_button_click_scale_v_expand, false);
        button_scale_h_shrink.addEventListener("mousedown", handle_button_click_scale_h_shrink, false);
        button_scale_h_expand.addEventListener("mousedown", handle_button_click_scale_h_expand, false);
        button_rotate_left.addEventListener("mousedown", handle_button_click_rotate_left, false);
        button_rotate_right.addEventListener("mousedown", handle_button_click_rotate_right, false);
        button_deleteZone.addEventListener("mousedown", handle_button_click_deleteZone, false);
        button_save.addEventListener("mousedown", handle_button_click_save, false);

        function switchImage(id_image) {
            if(that.current_img_id !== id_image) {
                if(that.current_img_id !== null) that._updateNormals();
                that.current_img_id = id_image;
                that.selectedEntity = null;
                that.manageDivs();
                that.resizeCanvas(that.canvas_zone.offsetWidth, that.canvas_zone.offsetHeight);
                that.draw();
            }
        }

        //JSON
        //json-->javascript
        function configureJSON(json) {
            console.log(json);
            that.json_content = json;
            for(var i = 0; i < json.length; ++i) {
                var div = document.createElement("div");
                var html_image = document.createElement("input");
                var id = json[i].id;
                html_image.setAttribute("type", "image");
                html_image.setAttribute("src", json[i].url);
                html_image.setAttribute("class", "thumb");
                html_image.img_id = id;

                html_image.addEventListener("click", function(event) {
                    switchImage(event.target.img_id);
                },false);

                div.appendChild(html_image);
                that.img_zone.appendChild(div);

                var img = new Image();
                img.dataset["id"] = id;
                img.dataset["url"] = json[i].url;
                img.src = json[i].url;

                img.addEventListener("load", (function(event) {
                    //TODO: call this._updateEntity(entity);
                    var _id = event.target.dataset.id;
                    that.product_images[_id] = createEntity(true, event.target, 0.5, 0.5, 1, 1, event.target.width, event.target.height, 0, that.strokeColor);
                    that.entities[_id] = [];
                    //load existent zones
                    for(var j = 0; j < this.zone.length; ++j) {
                        var o = this.zone[j].config;

                        var entity = createEntity(false, null, o.x, o.y, o.width, o.height, event.target.width, event.target.height, DEGtoRAD(o.angle), that.getRandomColor());
                        entity.id = this.zone[j].id;
                        that.entities[_id].push(entity);
                    }
                }).bind(json[i]), false);
            }
        }

        //javascript-->json
        function serializeJSON() {
            var json = [];
            for (var i = 0; i < that.entities.length; ++i) {
            //for(var i in that.entities) {
                if(!that.entities[i]) continue;
                var img = that.product_images[i].image;
                json[i] = {"id": i, "url": img.dataset.url, "zone": []};
                for(var j = 0; j < that.entities[i].length; ++j) {
                //for(var j in that.entities[i]) {
                    if(!that.entities[i][j]) continue;
                    var entity = that.entities[i][j];
                    var obj = {};
                    if(entity.id !== undefined) obj["id"] = entity.id;
                    var config = {};
                    config.x = entity.normal_x * img.width;
                    config.y = entity.normal_y * img.height;
                    config.width = entity.normal_width * img.width;
                    config.height = entity.normal_height * img.height;
                    config.angle = RADtoDEG(entity.angle);
                    obj["config"] = config;
                    json[i].zone.push(obj);
                }
            }
            console.log(json);
            console.log(JSON.stringify(json));
        }

        function loadProduct(id) {
            var xmlhttp = new XMLHttpRequest();
            var url = "assets/test.json";

            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    var json = JSON.parse(xmlhttp.responseText);
                    configureJSON(json);
                }
            };
            xmlhttp.open("GET", url, true);
            xmlhttp.send();
        }


        //Other handlers
        function handle_mousedown(event) {
            event.stopPropagation();
            event.preventDefault();
            _augmentEvent(event);
            that.ctx.canvas.removeEventListener("mousemove", that._handle_mousemove_move_notClicked, false);
            that._mouseDown(event);
            that.manageDivs();
        }

        this._handle_mouseup = handle_mouseup.bind(this);
        this._handle_mousemove_resize = handle_mousemove_resize.bind(this);
        this._handle_mousemove_rotate = handle_mousemove_rotate.bind(this);
        this._handle_mousemove_move_notClicked = handle_mousemove_move_notClicked.bind(this);
        this._handle_mousemove_move_clicked = handle_mousemove_move_clicked.bind(this);



        _global.addEventListener("keydown", handle_keydown.bind(this), false);
        _global.addEventListener("keyup", handle_keyup.bind(this), false);
        document.body.addEventListener("dragover", stop_default_drop.bind(this), false); //TODO: remove?
        document.body.addEventListener("drop", stop_default_drop.bind(this), false); //TODO: remove?
        this.ctx.canvas.addEventListener("mousedown", handle_mousedown, false);
        this.ctx.canvas.addEventListener("mousemove", this._handle_mousemove_move_notClicked, false);

        loadProduct(1);
    };

    function adjustCanvasTo(canvas, entity, width, height, minimumSize) {
        var aspect = entity.image.width/entity.image.height;
        canvas.height = height || minimumSize;
        canvas.width = (height * aspect) || minimumSize*aspect;
        if(canvas.width > width) {
            canvas.width = width || minimumSize;
            canvas.height = (width / aspect) || minimumSize/aspect;
        }
    }

    CanvasEditor.prototype.resizeCanvas = function(width, height) {
        //zone_editor
        if(this.type === type.ZONE) {
            //this._updateNormals();
            if(this.current_img_id !== null) {
                this._updateEntity(this.product_images[this.current_img_id]);
                adjustCanvasTo(this.ctx.canvas, this.product_images[this.current_img_id], width, height, this.minimumSize);
            }
        }
        //image_editor
        else if(this.type === type.IMAGE) {
            this.ctx.canvas.width = width || this.minimumSize;
            this.ctx.canvas.height = height || this.minimumSize;
        }
        this.update();
        this.draw();
    };

    CanvasEditor.prototype.draw = function () {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        var entity;
        if(this.product_images) {
            if(this.product_images[this.current_img_id]) {
                entity = this.product_images[this.current_img_id];
                this.ctx.save();
                this.ctx.translate(entity.x, entity.y);
                this.ctx.drawImage(entity.image, -Math.abs(entity.width) / 2, -Math.abs(entity.height) / 2, Math.abs(entity.width), Math.abs(entity.height));
                this.ctx.restore();
            }
        }

        if(this.current_img_id !== null) {
            var l = this.entities[this.current_img_id].length;
            for (var i = 0; i < l; ++i) {
                if (this.entities[this.current_img_id][i]) {
                    this.ctx.save();
                    entity = this.entities[this.current_img_id][i];
                    this.ctx.translate(entity.x, entity.y);
                    this.ctx.rotate(entity.angle);
                    if (entity.image) {
                        this.ctx.drawImage(entity.image, -Math.abs(entity.width) / 2, -Math.abs(entity.height) / 2, Math.abs(entity.width), Math.abs(entity.height));
                        if (this.entityMouseOver === entity && this.selectedEntity !== entity) {
                            this.ctx.lineWidth = this.lineWidth * 1.5;
                            this.ctx.strokeStyle = entity.strokeColor;
                            this.ctx.strokeRect(-Math.abs(entity.width) / 2, -Math.abs(entity.height) / 2, Math.abs(entity.width), Math.abs(entity.height));
                        }
                    }
                    else {
                        if(this.selectedEntity !== entity) {
                            if (this.entityMouseOver === entity) this.ctx.lineWidth = this.lineWidth * 1.5;
                            else this.ctx.lineWidth = this.lineWidth;
                            this.ctx.strokeStyle = entity.strokeColor;
                            this.ctx.strokeRect(-Math.abs(entity.width) / 2, -Math.abs(entity.height) / 2, Math.abs(entity.width), Math.abs(entity.height));
                        }

                    }

                    this.ctx.restore();
                }
            }
            if (this.selectedEntity) this._drawSelection();
        }
    };

    CanvasEditor.prototype._drawSelection = function () {
        this.ctx.save();
        var entity = this.selectedEntity;
        this.ctx.strokeStyle = entity.strokeColor;
        this.ctx.fillStyle = entity.strokeColor;
        this.ctx.lineWidth = this.lineWidth*1.5;
        var x = entity.x;
        var y = entity.y;
        var w = entity.width;
        var h = entity.height;
        var size = this.squaresSize;

        this.ctx.translate(x, y);
        this.ctx.rotate(entity.angle);

        this.ctx.strokeRect(-w / 2, -h / 2, w, h);

        this._fillSquare(-w / 2, -h / 2, size);
        this._fillSquare(w / 2, -h / 2, size);
        this._fillSquare(-w / 2, h / 2, size);
        this._fillSquare(w / 2, h / 2, size);

        this._fillSquare(0, -h / 2, size);
        this._fillSquare(-w / 2, 0, size);
        this._fillSquare(0, h / 2, size);
        this._fillSquare(w / 2, 0, size);

        this.ctx.beginPath();
        this.ctx.moveTo(0, -h / 2);
        this.ctx.lineTo(0, -this.sizeLine - h / 2);
        this.ctx.stroke();
        this.ctx.closePath();

        this.ctx.beginPath();
        this.ctx.arc(0, -this.sizeLine - h / 2, size, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    };

    CanvasEditor.prototype._fillSquare = function (x, y, halfsize) {
        this.ctx.fillRect(x - halfsize, y - halfsize, halfsize * 2, halfsize * 2);
    };

    CanvasEditor.prototype.resize = function (width, height) {
        if (this.selectedEntity) {
            this.selectedEntity.width = width;
            this.selectedEntity.height = height;
            this.draw();
        }
    };

    CanvasEditor.prototype.resizeStep = function(width, height) {
        if (this.selectedEntity) {
            this.selectedEntity.width += width;
            this.selectedEntity.height += height;
            if (this.selectedEntity.width < this.minimumSize) this.selectedEntity.width = this.minimumSize;
            if (this.selectedEntity.height < this.minimumSize) this.selectedEntity.height = this.minimumSize;
            this.draw();
        }
    };

    CanvasEditor.prototype.moveTo = function (x, y) {
        if (this.selectedEntity) {
            this.selectedEntity.x = x;
            this.selectedEntity.y = y;
            this._updateMatrices(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype.translate = function (x, y) {
        if(this.selectedEntity) {
            this.selectedEntity.x += x;
            this.selectedEntity.y += y;
            this._updateMatrices(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype.rotateDEG = function (angle) {
        if (this.selectedEntity) {
            angle = DEGtoRAD(angle);
            this.selectedEntity.angle += angle;
            this.selectedEntity.angle = this.selectedEntity.angle % (Math.PI * 2);
            this._updateMatrices(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype.rotateRAD = function (angle) {
        if (this.selectedEntity) {
            this.selectedEntity.angle += angle;
            this.selectedEntity.angle = this.selectedEntity.angle % (Math.PI * 2);
            this._updateMatrices(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype.resetRotation = function () {
        if (this.selectedEntity) {
            this.selectedEntity.angle = 0;
            this._updateMatrices(this.selectedEntity);
            this.draw();
        }
    };

    CanvasEditor.prototype.addZone = function() {
        var aspect = this.ctx.canvas.width /this.ctx.canvas.height;
        var container_width = this.product_images[this.current_img_id].width;
        var container_height = this.product_images[this.current_img_id].height;
        var entity = createEntity(true, null, 0.5, 0.5, 0.2, 0.2*aspect, container_width, container_height, 0, this.getRandomColor());
        this._updateEntity(entity);
        this.entities[this.current_img_id].push(entity);
        this.draw();
        return entity;
    };

    CanvasEditor.prototype.getRandomColor = function() {
        return this.color_list[Math.floor(Math.random()*this.color_list.length)];
    };

    //*** START INTERNAL FUNCTIONS ***
    CanvasEditor.prototype._mouseDown = function(event) {
        //Check if is resizing
        if (this.selectedEntity) {
            this._checkCorners(event);
            if (anchor.resizing) {
                _global.addEventListener("mousemove", this._handle_mousemove_resize, false);
                _global.addEventListener("mouseup", this._handle_mouseup, false);
                this.draw();
                return true;
            }
            else if (anchor.rotating) {
                tempAngle = this.selectedEntity.angle;
                offsetX = event.x - event.offsetX;
                offsetY = event.y - event.offsetY;
                vec2.set(vec_tmp2, event.x - offsetX, event.y - offsetY);
                vec2.subtract(vec_tmp2, vec_tmp2, this.selectedEntity.position);
                vec2.normalize(vec_tmp2, vec_tmp2);
                _global.addEventListener("mousemove", this._handle_mousemove_rotate, false);
                _global.addEventListener("mouseup", this._handle_mouseup, false);
                this.draw();
                return true;
            }
        }

        //if not resizing, check if selecting
        this.selectedEntity = this._mouseInsideEntity(event.offsetX, event.offsetY);
        if(this.selectedEntity) {
            offsetX = event.x - this.selectedEntity.x;
            offsetY = event.y - this.selectedEntity.y;
            _global.addEventListener("mousemove", this._handle_mousemove_move_clicked, false);
            _global.addEventListener("mouseup", this._handle_mouseup, false);
            this.draw();
        }
    };

    CanvasEditor.prototype._mouseInsideEntity = function(x, y) {
        for (var i = this.entities[this.current_img_id].length - 1; i >= 0; i--) {
            var entity = this.entities[this.current_img_id][i];
            if (!entity) continue;

            var w = entity.width;
            var h = entity.height;
            mat3.invert(mat_tmp, entity.model);
            vec2.set(vec_tmp1, x, y);
            vec2.transformMat3(vec_tmp1, vec_tmp1, mat_tmp);
            var xx = vec_tmp1[0];
            var yy = vec_tmp1[1];

            if (pointerInside(xx, yy, -w / 2, -h / 2, w, h)) return entity;
        }
        return null;
    };

    CanvasEditor.prototype.update = function() {
        var length;
        var i;
        if(this.product_images) {
            length = this.product_images.length;
            for(i = 0; i < length; ++i) {
                this._updateEntity(this.product_images[i]);
            }
        }

        if(this.current_img_id !== null) {
            length = this.entities[this.current_img_id].length;
            for (i = 0; i < length; ++i) {
                this._updateEntity(this.entities[this.current_img_id][i]);
            }
        }
    };

    CanvasEditor.prototype._updateEntity = function(entity) {
        entity.width = entity.normal_width * this.ctx.canvas.width;
        entity.height = entity.normal_height * this.ctx.canvas.height;
        entity.x = entity.normal_x * this.ctx.canvas.width;
        entity.y = entity.normal_y * this.ctx.canvas.height;
        this._updateMatrices(entity);
    };

     CanvasEditor.prototype._updateNormals = function() {
        var length = this.entities[this.current_img_id].length;
        for(var i = 0; i < length; ++i) {
            this._updateEntityNormals(this.entities[this.current_img_id][i], this.ctx.canvas.width, this.ctx.canvas.height);
        }
    };

    CanvasEditor.prototype._updateEntityNormals = function(entity, container_width, container_height) {
        entity.normal_width = entity.width/container_width;
        entity.normal_height = entity.height/container_height;
        entity.normal_x = entity.x/container_width;
        entity.normal_y= entity.y/container_height;
    };

    CanvasEditor.prototype._updateMatrices = function (entity) {
        vec2.set(entity.position, entity.x, entity.y);
        mat3.translate(entity.translation, identity, entity.position);
        mat3.rotate(entity.rotation, identity, entity.angle);
        mat3.multiply(entity.model, entity.translation, entity.rotation);
    };

    CanvasEditor.prototype._deleteSelectedEntity = function() {
        var l = this.entities[this.current_img_id].length;
        for (var i = 0; i < l; ++i) {
            if (this.entities[this.current_img_id][i] === this.selectedEntity) {
                this.selectedEntity = null;
                this.entities[this.current_img_id][i] = null;
                this.entities[this.current_img_id] = this.entities[this.current_img_id].filter(function (n) {
                    return n != undefined
                });
                this.draw();
                break;
            }
        }
    };

    CanvasEditor.prototype._promoteSelectedEntity = function() {
        var l = this.entities[this.current_img_id].length;
        for (var i = 0; i < l; ++i) {
            if (this.entities[this.current_img_id][i] === this.selectedEntity) {
                if (i < l - 1) {
                    var temp = this.entities[this.current_img_id][i + 1];
                    this.entities[this.current_img_id][i + 1] = this.entities[this.current_img_id][i];
                    this.entities[this.current_img_id][i] = temp;
                    this.draw();
                    break;
                }
            }
        }
    };

    CanvasEditor.prototype._demoteSelectedEntity = function() {
        var l = this.entities[this.current_img_id].length;
        for (var i = 0; i < l; ++i) {
            if (this.entities[this.current_img_id][i] === this.selectedEntity) {
                if (i > 0) {
                    var temp = this.entities[this.current_img_id][i - 1];
                    this.entities[this.current_img_id][i - 1] = this.entities[this.current_img_id][i];
                    this.entities[this.current_img_id][i] = temp;
                    this.draw();
                    break;
                }
            }
        }
    };

    CanvasEditor.prototype._createNewImages = function(event) {
        var files = event.dataTransfer.files;
        var that = this;
        for (var i in files) {
            if (!(files[i] instanceof File)) continue;
            var file = files[i];
            if (file.type.substring(0, 6) !== "image/") {
                console.log("File is not an image: " + file.type);
                continue;
            }
            var reader = new FileReader();
            reader.onloadend = function () {
                var img = new Image();
                img.src = this.result;

                img.addEventListener("load", function () {
                    //TODO: drop in center (drop_zone != canvas)
                    var entity = createEntity(false, img, event.offsetX, event.offsetY, img.width, img.height, that.ctx.canvas.width, that.ctx.canvas.height, 0, that.strokeColor);
                    that.entities[that.current_img_id].push(entity);
                    that.draw();
                }, false);
            };
            reader.readAsDataURL(file);
        }
        this.draw();
    };

    //if normalized === true : x, y , width, height are normalized
    //else: x, y, width, height are not normalized
    function createEntity(normalized, img, _x, _y, _width, _height, container_width, container_height, angle_rad, strokeColor) {
        var x, y, width, height, normal_x, normal_y, normal_width, normal_height;

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
        return {
            image: img,
            x: x, //TODO: drop in center (drop_zone != canvas)
            y: y,
            width: width,
            height: height,
            normal_x: normal_x,
            normal_y: normal_y,
            normal_width: normal_width,
            normal_height: normal_height,
            container_width: container_width,
            container_height: container_height,
            angle: angle_rad,
            strokeColor: strokeColor,
            position: pos,
            translation: mat_trans,
            rotation: mat_rot,
            model: model
        };
    }

    //TODO: Change cursors according to the angle
    CanvasEditor.prototype._checkCorners = function(event) {
        var w = this.selectedEntity.width;
        var h = this.selectedEntity.height;
        mat3.invert(mat_tmp, this.selectedEntity.model);
        vec2.set(vec_tmp1, event.offsetX, event.offsetY);
        vec2.transformMat3(vec_tmp1, vec_tmp1, mat_tmp);
        var x = vec_tmp1[0];
        var y = vec_tmp1[1];

        var s = this.squaresSize + 1;

        //up-left
        if (pointerInside(x, y, (-w / 2) - s, (-h / 2) - s, s * 2, s * 2)) {
            anchor.x = false;
            anchor.y = false;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "nw-resize";
        }
        //up-right
        else if (pointerInside(x, y, (w / 2) - s, (-h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = false;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "ne-resize";
        }
        //down-left
        else if (pointerInside(x, y, (-w / 2) - s, (h / 2) - s, s * 2, s * 2)) {
            anchor.x = false;
            anchor.y = true;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "sw-resize";
        }
        //down-right
        else if (pointerInside(x, y, (w / 2) - s, (h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = true;
            anchor.width = true;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "se-resize";
        }
        //up-center
        else if (pointerInside(x, y, -s, (-h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = false;
            anchor.width = false;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "n-resize";
        }
        //down-center
        else if (pointerInside(x, y, -s, (h / 2) - s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = true;
            anchor.width = false;
            anchor.height = true;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "s-resize";
        }
        //center-left
        else if (pointerInside(x, y, (-w / 2) - s, -s, s * 2, s * 2)) {
            anchor.x = false;
            anchor.y = true;
            anchor.width = true;
            anchor.height = false;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "e-resize";
        }
        //center-right
        else if (pointerInside(x, y, (w / 2) - s, -s, s * 2, s * 2)) {
            anchor.x = true;
            anchor.y = true;
            anchor.width = true;
            anchor.height = false;
            anchor.resizing = true;
            anchor.rotating = false;
            this.ctx.canvas.style.cursor = "w-resize";
        }
        else if (pointerInside(x, y, -s, (-h / 2) - s - this.sizeLine, s * 2, s * 2)) {
            anchor.resizing = false;
            anchor.rotating = true;
        }
        else {
            this.ctx.canvas.style.cursor = "default";
            anchor.resizing = false;
            anchor.rotating = false;
        }
    };

    CanvasEditor.prototype._resizeEntity = function(event) {
        mat3.invert(mat_tmp, this.selectedEntity.rotation);
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
        this._updateMatrices(this.selectedEntity);
        this.draw();
    };

    CanvasEditor.prototype._fixResize = function(entity) {
        if (entity) {
            if (entity.width < 0) entity.width = -entity.width;
            if (entity.height < 0) entity.height = -entity.height;
            this.draw();
        }
    };

    CanvasEditor.prototype._rotateEntity = function(event) {
        vec2.set(vec_tmp1, event.x - offsetX, event.y - offsetY);
        vec2.subtract(vec_tmp1, vec_tmp1, this.selectedEntity.position);
        vec2.normalize(vec_tmp1, vec_tmp1);
        var angle = vec2.computeSignedAngle(vec_tmp1, vec_tmp2);
        vec2.copy(vec_tmp2, vec_tmp1);
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
        this.moveTo(event.x - offsetX, event.y - offsetY);
    };

    CanvasEditor.prototype._check_mouseOverEntity = function(event) {
        var entity = this._mouseInsideEntity(event.offsetX, event.offsetY);
        if (entity) {
            this.entityMouseOver = entity;
            this.ctx.save();
            this.ctx.strokeStyle = entity.strokeColor;
            this.ctx.lineWidth = this.lineWidth;
            var x = entity.x;
            var y = entity.y;
            var w = entity.width;
            var h = entity.height;

            this.ctx.translate(x, y);
            this.ctx.rotate(entity.angle);

            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
            this.ctx.restore();

            this.draw();
        }
        else {
            this.entityMouseOver = null;
            this.draw();
        }
    };

    CanvasEditor.prototype._keyDown = function(event) {
        //console.log(event.keyCode);
        switch(event.keyCode) {
            case 46: //DEL
                if (this.selectedEntity) {
                    this._deleteSelectedEntity();
                    if(this.manageDivs) this.manageDivs();
                }
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
            //case 13: //ENTER
            //    this.loadProduct(1);
            //    break;
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
    function handle_dragover(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
    }

    function handle_drop(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._createNewImages(event);
    }

    function handle_mousemove_move_clicked(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._setNewPosition(event);
    }

    function handle_mousemove_move_notClicked(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        if (this.selectedEntity) this._checkCorners(event);
        if(this.current_img_id !== null) this._check_mouseOverEntity(event);
    }

    function handle_mousemove_resize(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._resizeEntity(event);
    }

    function handle_mousemove_rotate(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._rotateEntity(event);
    }

    function handle_mouseup(event) {
        event.stopPropagation();
        event.preventDefault();
        _augmentEvent(event);
        this._fixResize(this.selectedEntity);
        //this._updateNormals();
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

    //*** END HANDLERS ***

    //*** OTHER FUNCTIONS ***
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