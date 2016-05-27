// The MIT License (MIT)
//
// Copyright (C) 2016 Karolinska institutet
// Copyright (C) 2016 osd-spot-viewer contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// Author: Erik Sjolund


function num_levels(width, height) {
    return  Math.ceil(Math.log2(Math.max(width, height))) + 1;
}

function scaled_tile_size(num_levels_, level, tile_size) {
    var   count = num_levels_ - level - 1;
    var factor = 1;
    for (var i = 0; i < count; i++) {
        factor = factor * 2;
    }
    var result =  tile_size * factor;
    return result; 
}

function num_tiles_level(width, height, level, tile_size) {
    var num_l = num_levels(width, height);
    var scaled = scaled_tile_size(num_l, level, tile_size);       
    var num_tiles = Math.ceil(width / scaled) * Math.ceil(height / scaled) ;
    return num_tiles;
}

function tile_id(x_coord, y_coord, level, width, height, tile_size) {
    var result = 0;
    for (var i=0; i< level; i++) {
        result = result + num_tiles_level(width, height, i, tile_size);
    }
    var num_l = num_levels(width, height);
    var scaled_tile_s = scaled_tile_size(num_l, level, tile_size);
    var num_rows = Math.ceil(height / scaled_tile_s);
    result = result + (num_rows * y_coord) + x_coord;
    return result;
}

function coord_relative_tile(coord_dzi, coord_spot, tile_size, tile_overlap, level_factor) {
    var overlap_adjust = tile_overlap;
    if (coord_dzi == 0) {
        overlap_adjust = 0;
    }
    var result_coord = coord_spot / level_factor - coord_dzi * tile_size + overlap_adjust;
    return result_coord;
}


function startFunction(obj_this) {
    var _this = obj_this;
    var numbers = obj_this.src.split("/");
    var filename = numbers[0];
    var image_index = parseInt(numbers[1]);
    var tile_conversion_index = parseInt(numbers[2]);
    var color_index = parseInt(numbers[3]);           
    var level = parseInt(numbers[4]);
    var xcoord = parseInt(numbers[5]);
    var ycoord = parseInt(numbers[6]);
    
    var file_reader = new FileReader();
    var local_st_file = window.local_files[filename];
    var full_image = local_st_file.parsed_header.images[image_index];
    var full_image_width = full_image.imageWidth;
    var full_image_height = full_image.imageHeight;
    var tile_conversion = local_st_file.parsed_header.tileConversions[tile_conversion_index];
    var tile_size = tile_conversion.tileSize;
    var tile_id_ = tile_id(xcoord, ycoord, level, full_image_width, full_image_height, tile_size);
    var file_region = tile_conversion.tiledImages[image_index].tiles[tile_id_];

    read_fileregion(function (color_index, buffer) {

        var tile_img = document.createElement("img");
        var uint8_array = new Uint8Array( buffer);            
        var colors = window.colors[color_index];

        
        var tile_base64 = btoa(String.fromCharCode.apply(null, uint8_array));

	tile_img.onload = function(tile_img, colors) {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            ctx.canvas.width = tile_img.width;
            ctx.canvas.height = tile_img.height;
            ctx.drawImage(tile_img, 0, 0, tile_img.width, tile_img.height);
            var level_factor = Math.pow(2, num_levels(full_image_width, full_image_height) - level - 1);
            var circle_radius = 95 / level_factor;
            for (var i = 0; i < 900; i++) {
                var spot = local_st_file.spots.spots[i];
                ctx.beginPath();
                var x_circle = coord_relative_tile(xcoord, spot.xCoordPhyscial, tile_conversion.tileSize, tile_conversion.tileOverlap, level_factor);
                var y_circle = coord_relative_tile(ycoord, spot.yCoordPhyscial, tile_conversion.tileSize, tile_conversion.tileOverlap, level_factor);                    
                ctx.arc(x_circle, y_circle, circle_radius, 0, 2 * Math.PI, false);
                ctx.closePath();
                var col = colors[i];
                ctx.fillStyle = "rgba(" + col[0] + ", " + col[1] + "," + col[2] + "," +  col[3] + ")";
                ctx.fill();
            }
            var data_url = canvas.toDataURL();
            var _this = this;
	    this.image = new Image();

            setupImageCallbacks(this);

            this.image.src =  data_url;
            
        }.bind(this, tile_img, colors)
        tile_img.src =  "data:image/jpeg;base64," + tile_base64;
    }.bind(obj_this, color_index), file_region, local_st_file);
}

function estimate_cutoff(genehit_array) {
    // TODO: write this function.
    // Right now it just returns an arbitrary value.
    return 4;
}

function read_fileregion(callback, file_region, local_st_file) {
    var start_pos = local_st_file.file_regions_start_pos + file_region.regionOffset.low;
    var blob = local_st_file.file.slice(start_pos, start_pos + file_region.regionSize.low); 
    var file_reader = new FileReader();
    file_reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            callback(evt.target.result);
        }
    }
    file_reader.readAsArrayBuffer(blob);
}

// maybe remove this function:
function read_fileregion_as_url(callback, file_region, local_st_file) {
    var start_pos = local_st_file.file_regions_start_pos + file_region.regionOffset.low;
    var blob = local_st_file.file.slice(start_pos, start_pos + file_region.regionSize.low); 
    var file_reader = new FileReader();
    file_reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) {
            callback(evt.target.result);
        }
    }
    file_reader.readAsDataURL(blob);
}

function LocalStFile(file){
    this.file = file; // File object
    this.parsed_header = undefined;
}

function genehits_as_array(gene_hit_message, number_of_spots) {
    // TODO: Investigate this. Not so important but,
    // maybe it is faster to first create an array of only zeroes and then overwrite the values
    // not equal to zero..
    var gene_hit_array = [];
    for (var i = 0; i < gene_hit_message.hits.length; i++) {
        var zeroes_skipped = gene_hit_message.zeroHitsSkipped[i];
        for (var j = 0; j < zeroes_skipped; j++) {
            gene_hit_array.push(0);
        }
        gene_hit_array.push(gene_hit_message.hits[i]);
    }
    var number_of_zeroes_in_the_end = number_of_spots - gene_hit_array.length;
    for (var i = 0; i < number_of_zeroes_in_the_end; i++) {
        gene_hit_array.push(0);        
    }
    return gene_hit_array;
}

function filter_out_spots(callback, local_st_file, number_of_spots, filter_configuration) {
}                     

function calculate_spot_colors(callback, gene_id, local_st_file, number_of_spots) {
    var file_region = local_st_file.parsed_header.commonData.geneHits[gene_id];

    read_fileregion(function (callback, buffer) {
        var gene_hit_message = window.protobuf_message_parsers.gene_hit.decode(buffer);
        var gene_hits = genehits_as_array(gene_hit_message, number_of_spots);
        var es_cutoff = estimate_cutoff(gene_hits);
        var colors = [];
        for (var i = 0; i < gene_hits.length; i++) {
            if (gene_hits[i] <= es_cutoff) {
                colors.push([ 0, 0, 0, 0 ]);
            }
            else {
               
                var alpha =  gene_hits[i] / 30;
                if (alpha > 1) {
                    alpha = 1;
                }                 
                colors.push([ 255, 0, 0, alpha ]);
            }
        }
        callback(colors);
    }.bind(null, callback), file_region, local_st_file);
}

function parse_file(local_st_file) {
    var file_reader = new FileReader();
    var magic = [ 'S', 'T', '-', 'E', 'X', 'P', '\0', '\0' ];
    
    file_reader.onloadend = function(local_st_file, evt) {
        if (evt.target.readyState == FileReader.DONE) {
            var len = magic.length;
            for (var i = 0; i < len; i++) {
                if (magic[i] != evt.target.result[i]) {
                    console.log(" magic mismatch " + i );
                }
            }
            var endslice = evt.target.result.slice(magic.length, magic.length + 5); // 5 is the serialized byte length of the HeaderSize message
            var msg = window.protobuf_message_parsers.header_size_message.decode(endslice);
            var startpos =  magic.length + 5 + 3;  // 3 is just padding
            var header_blob = local_st_file.file.slice(startpos, startpos + msg.headerSize);
            var tmp_pos = startpos + msg.headerSize;
            if ( tmp_pos % 8 != 0) {
                tmp_pos = tmp_pos + 8 - (tmp_pos % 8);
            }
            // align
            local_st_file.file_regions_start_pos = tmp_pos;
            file_reader.onloadend = function(local_st_file, evt) {
                if (evt.target.readyState == FileReader.DONE) {
                    local_st_file.parsed_header = window.protobuf_message_parsers.header_message.decode(evt.target.result);
                    console.log("a1");
                    read_fileregion(function (local_st_file, buffer) {
                        local_st_file.spots = window.protobuf_message_parsers.spots.decode(buffer);
                    }.bind(null, local_st_file), local_st_file.parsed_header.commonData.spots, local_st_file);
                    console.log("a2");
                    read_fileregion(function (local_st_file2, buffer) {
                        local_st_file2.gene_names_array = window.protobuf_message_parsers.gene_names.decode(buffer).geneNames;
                        local_st_file2.gene_names_dictionary = {};
                        for (var i = 0; i < local_st_file2.gene_names_array.length; i++) {
                            local_st_file2.gene_names_dictionary[ local_st_file2.gene_names_array[i] ] = i;
                        }
                    }.bind(null, local_st_file), local_st_file.parsed_header.commonData.geneNames, local_st_file);
                }
            }.bind(null, local_st_file);
            file_reader.readAsArrayBuffer(header_blob);
        }
    }.bind(null, local_st_file);
    var preheader_blob = local_st_file.file.slice(0, magic.length + 8);
    file_reader.readAsArrayBuffer(preheader_blob);
}

var  handleSelectedFiles = function(files) {
    for (var i = 0; i < files.length; i++) {
        var local_file = new LocalStFile(files[i]);
        // TODO add assert
        window.local_files[ local_file.file.name ] = local_file;
        parse_file(local_file);
    }
}

function handleLayoutFiles(files) {
    for (var i = 0; i < files.length; i++) {
        var file_reader = new FileReader();
        file_reader.onloadend = function(evt) {
            if (evt.target.readyState == FileReader.DONE) {
                add_osd_window_from_layout(JSON.parse(evt.target.result));
            }
        }
        file_reader.readAsText(files[i]);
    }
}

function add_osd_window() {
    add_osd_window_from_layout({'layoutimages' : [
        { 'datafile' : 'out.bin',
          'rendering' : { 'type' : 'fromgene',  'geneid' : 1 },
          'x' : 0,
          'y' : 0
        }
    ]}) 
}

function add_osd_window_from_layout(layout) {
    var osd_windows = document.getElementById('osd_windows');
    var osd_window_div = document.createElement("div");
    var local_files_div = document.createElement("div");
    osd_window_div.appendChild(local_files_div);
    osd_windows.appendChild(osd_window_div);
    var layoutimages = layout[ 'layoutimages' ];
    var osd_container_div = document.createElement("div");
    osd_container_div.style.width = "1200px";
    osd_container_div.style.height = "1200px";
    osd_container_div.id = "osd-"  +    osd_windows.children.length.toString();
    osd_window_div.appendChild( osd_container_div);   
    var viewer = OpenSeadragon({
        id: osd_container_div.id,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        debugMode:  false,
        showNavigator:  true,
        zoomPerScroll: 1.8,
        maxImageCacheCount: 400  // 200 is the default
    });
    var overlay = viewer.svgOverlay();    
    for (var i = 0; i < layoutimages.length; i++) {
        var layoutimage = layoutimages[i];
        var local_st_file = window.local_files[ layoutimage.datafile ];
        var header = local_st_file.parsed_header;
        var tile_conversion_index = 0;
        var tile_conversion = header.tileConversions[tile_conversion_index];
        if (layoutimage.rendering.type == "fromgene") {
            var gene_id =         local_st_file.gene_names_dictionary[layoutimage.rendering.gene_name];
            var gene_name = layoutimage.rendering.gene_name;
            calculate_spot_colors(function (header, viewer, tile_conversion, layoutimage, overlay, title, colors) {
                var color_index = window.colors.length;
                window.colors.push(colors);

                var image_index = 1;
                var im = header.images[image_index];
               
                viewer.addTiledImage(
                    {
                        tileSource: {
                            height: im.imageHeight,
                            width: im.imageHeight,
                            tileSize: tile_conversion.tileSize,
                            tileOverlap: tile_conversion.tileOverlap,
                            getTileUrl: function (datafile, level, x, y) {
                                return  datafile + "/" + image_index + "/" + tile_conversion_index + "/"   +  color_index +  "/"  + level+ "/" + x + "/" + y;
                            }.bind(null, layoutimage.datafile)
                        },
                        x: layoutimage.x,
                        y: layoutimage.y,
                        width: 1.1,
                        index: i
                    }
                );
                var d3Rect = d3.select(overlay.node()).
                    append("text")
                    .attr("height", 0.1)
                    .attr("x", layoutimage.x + 0.55)
                    .attr("y", layoutimage.y + 1)

                    .style("font-size","0.05px")
                    .style("text-anchor", "middle")
                    .text(title);

                viewer.viewport.goHome();               
                viewer.viewport.fitHorizontally(true);
                viewer.viewport.applyConstraints();
                viewer.viewport.update();
                
            }.bind(null, header, viewer, tile_conversion,  layoutimage, overlay, gene_name), gene_id,  local_st_file, 1200);
        }
    }
}
