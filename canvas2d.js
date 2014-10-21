'use strict';
function init() {
    var ctx = document.getElementById("canvas_test").getContext("2d");
    var drop_zone = document.getElementById("drop_zone");
    ctx.canvas.width = drop_zone.offsetWidth;
    ctx.canvas.height = drop_zone.offsetHeight;
    console.log(drop_zone.offsetWidth);
    console.log(drop_zone.offsetHeight);
    
    function handle_dragover(event) {
        console.log("dragover");
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
                console.log(this.result);
                var img = new Image();
                img.src = this.result;
                img.onload = function() {
                    ctx.drawImage(this, 0, 0);
                }
            };
            reader.readAsDataURL(file);
            console.log(reader.result);
        }
        console.log("drop");
    }
    
    drop_zone.addEventListener("dragover", handle_dragover, false);
    drop_zone.addEventListener("drop", handle_drop, false);
    

};