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
var magic = [ 'S', 'T', '-', 'E', 'X', 'P', '\0', '\0' ];

class ProtoBufLoader {
    constructor() {
        this.builder = new Promise(function(resolve, reject) {
            var ProtoBuf = dcodeIO.ProtoBuf;       
            ProtoBuf.loadProtoFile("st_exp.proto", function(err, builder) {
                resolve(builder.build());
            });
        });      
    }
}

var protobuf_loader_global = new ProtoBufLoader();

function num_levels(width, height) {
    return Math.ceil(Math.log2(Math.max(width, height))) + 1;
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

function calculate_tile_id(x_coord, y_coord, level, width, height, tile_size) {
    var result = 0;
    for (var i = 0; i < level; i++) {
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
    var fields = obj_this.src.split("/");
    var args = {};
    args.filename = fields[0];
    args.image_index = parseInt(fields[1]);
    args.tile_conversion_index = parseInt(fields[2]);
    args.osd_layout_image_colors_index = parseInt(fields[3]);           
    args.level = parseInt(fields[4]);
    args.xcoord = parseInt(fields[5]);
    args.ycoord = parseInt(fields[6]);
    
    var local_st_file = window.local_files[args.filename];
    // local_st_file.header should already be fullfilled by now. But nonetheless then() is used. Maybe change this somehow in the future ...

    local_st_file.header.then(
        function (args, local_st_file, header_decoded) {          
            var full_image = header_decoded.images[args.image_index];
            var full_image_width = full_image.imageWidth;
            var full_image_height = full_image.imageHeight;
            var tile_conversion = header_decoded.tileConversions[args.tile_conversion_index];
            var tile_size = tile_conversion.tileSize;
            var tile_id = calculate_tile_id(args.xcoord, args.ycoord, args.level, full_image_width, full_image_height, tile_size);

            var file_region = tile_conversion.tiledImages[args.image_index].tiles[tile_id];
            var tile = get_tile(tile_id, args.image_index, args.tile_conversion_index, local_st_file.headersize, local_st_file.header, local_st_file.protobuf_loader, local_st_file.slice_loader);
            var color_array = window.osd_layout_image_colors[args.osd_layout_image_colors_index];
            Promise.all([local_st_file.spots, tile]).then(
                function(color_array,  x_coord, y_coord, level, tile_size, tile_overlap, full_image_width, full_image_height, values) {
                    var spots_decoded = values[0];
                    var tile_buff = values[1];
                    var tile_img = document.createElement("img");
                    var uint8_array = new Uint8Array(tile_buff);            
                    var tile_base64 = btoa(String.fromCharCode.apply(null, uint8_array));
	            tile_img.onload = function(tile_img, color_array, x_coord, y_coord, level, tile_size, tile_overlap, full_image_width, full_image_height, spots_decoded) {
                        var canvas = document.createElement("canvas");
                        var ctx = canvas.getContext("2d");
                        ctx.canvas.width = tile_img.width;
                        ctx.canvas.height = tile_img.height;
                        ctx.drawImage(tile_img, 0, 0, tile_img.width, tile_img.height);
                        var level_factor = Math.pow(2, num_levels(full_image_width, full_image_height) - level - 1);
                        var circle_radius = 95 / level_factor;
                        for (var i = 0; i < 900; i++) {
                            var spot = spots_decoded.spots[i];
                            ctx.beginPath();
                            var x_circle = coord_relative_tile(x_coord, spot.xCoordPhyscial, tile_size, tile_overlap, level_factor);
                            var y_circle = coord_relative_tile(y_coord, spot.yCoordPhyscial,  tile_size, tile_overlap, level_factor);                    
                            ctx.arc(x_circle, y_circle, circle_radius, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            var col = color_array[i];
                            ctx.fillStyle = "rgba(" + col[0] + ", " + col[1] + "," + col[2] + "," +  col[3] + ")";
                            ctx.fill();
                        }
                        var data_url = canvas.toDataURL();
	                this.image = new Image();
                        setupImageCallbacks(this);
                        this.image.src = data_url;
                    }.bind(this, tile_img, color_array, x_coord, y_coord, level, tile_size, tile_overlap, full_image_width, full_image_height, spots_decoded)
                    tile_img.src =  "data:image/jpeg;base64," + tile_base64;                  
                }.bind(this, color_array, args.xcoord, args.ycoord, args.level, tile_size, tile_conversion.tileOverlap, full_image_width, full_image_height)
            );
        }.bind(obj_this, args, local_st_file)
    );
} 

function estimate_cutoff(genehit_array) {
    // TODO: write this function.
    // Right now it just returns an arbitrary value.
    return 4;
}

class LocalSliceLoader {
    constructor(file_api_file) {
        this.file = file_api_file;
    }
    get_slice(start_pos, size) {
        var promise = new Promise(function(file, resolve, reject) {
            var file_reader = new FileReader();
            var blob = file.slice(start_pos, start_pos + size); 
            file_reader.onloadend = function(evt) {
                if (evt.target.readyState == FileReader.DONE) {
                    resolve(evt.target.result);
                } else {
                    reject(Error("could not read local file"));
                }
            }    
            file_reader.onerror = function(evt) {
                reject(Error("could not read local file (onerror)"));
            }
            file_reader.onabort = function(evt) {
                reject(Error("could not read local file (onabort)"));
            }
            file_reader.readAsArrayBuffer(blob);
        }.bind(null, this.file));
        return promise;
    }
}

function get_headersize(protobuf_loader, slice_loader) {
    return Promise.all([protobuf_loader.builder, slice_loader.get_slice(magic.length, 5)]).then(function (values) {
        var headersize_builder = values[0].fileformat_common_proto.HeaderSize;
        var msg = headersize_builder.decode(values[1]);
        return msg.headerSize;
    });
}

function get_header(headersize, protobuf_loader, slice_loader) {   
    var slice = headersize.then(function(val) {
        var startpos = header_start_pos(magic);
        return slice_loader.get_slice(startpos, val);
    });
    return Promise.all([protobuf_loader.builder, slice]).then(function (values) {
        var header_builder = values[0].st_exp_proto.Header;
        var msg = header_builder.decode(values[1]);
        return msg;
    });
}

function get_fileregionslice(get_fileregion_func, headersize, header, slice_loader) {
    return Promise.all([headersize, header]).then(
        function (values) {
            var headersize_decoded = values[0];
            var header_decoded = values[1];
            var file_region = get_fileregion_func(header_decoded);
            var startpos = file_regions_start_pos(magic, headersize_decoded) + file_region.regionOffset.low;
            var size = file_region.regionSize.low;
            // assert ( file_region.regionOffset.high == 0 &&  file_region.regionSize.high == 0 ) TODO. fix this later. Now we assume the *.high values are 0. We should not do that.
            return slice_loader.get_slice(startpos, size);
        }
    );
}

function get_decoded_fileregion(get_fileregion_func, get_builder_func, headersize, header, protobuf_loader, slice_loader) {
    var slice = get_fileregionslice(get_fileregion_func, headersize, header, slice_loader);
    return Promise.all([protobuf_loader.builder, slice]).then(function (values) {
        var builder = get_builder_func(values[0]);
        var msg = builder.decode(values[1]);
        return msg;
    });
}

function get_genenames(headersize, header, protobuf_loader, slice_loader) {
    return get_decoded_fileregion(
        function (header_decoded) {
            return header_decoded.commonData.geneNames;
        },
        function (protobuf_loader_builder) {
            return protobuf_loader_builder.st_exp_proto.GeneNames;
        }, headersize, header, protobuf_loader, slice_loader);
}

function get_tile(tile_id, image_index, tile_conversion_index, headersize, header, protobuf_loader, slice_loader) {
    return get_fileregionslice(
        function (header_decoded) {
            return header_decoded.tileConversions[tile_conversion_index].tiledImages[image_index].tiles[tile_id];          
        }, headersize, header, slice_loader);
}

function get_genehit(gene_id, headersize, header, protobuf_loader, slice_loader) {
    return get_decoded_fileregion(
        function (header_decoded) {
            return header_decoded.commonData.geneHits[gene_id];
        },
        function (protobuf_loader_builder) {
            return protobuf_loader_builder.st_exp_proto.GeneHit;
        }, headersize, header, protobuf_loader, slice_loader);
}

function get_genehit_from_genename(gene_name, genenames_dict, headersize, header, protobuf_loader, slice_loader) {
    return genenames_dict.then(function(headersize, header, protobuf_loader, slice_loader, genenames_dict_decoded) {
        var gene_id = genenames_dict_decoded[gene_name];
        return get_genehit(gene_id, headersize, header, protobuf_loader, slice_loader);
    }.bind(null, headersize, header, protobuf_loader, slice_loader));
}

function get_spots(headersize, header, protobuf_loader, slice_loader) {
    return get_decoded_fileregion(
        function (header_decoded) {
            return header_decoded.commonData.spots;
        },
        function (protobuf_loader_builder) {
            return protobuf_loader_builder.st_exp_proto.Spots;
        }, headersize, header, protobuf_loader, slice_loader);
}

function calculate_spot_colors_from_genehit_array(gene_hit_array) {
    var es_cutoff = estimate_cutoff(gene_hit_array);
    var colors = [];
    for (var i = 0; i < gene_hit_array.length; i++) {
        if (gene_hit_array[i] <= es_cutoff) {
            colors.push([0, 0, 0, 0]);
        }
        else {          
            var alpha = gene_hit_array[i] / 30;
            if (alpha > 1) {
                alpha = 1;
            }                 
            colors.push([255, 0, 0, alpha]);
        }
    }
    return colors;
}

function dictionary_from_string_array(string_array) {
    var result = {};
    
    console.log("string_array.length=" +       string_array.length);
    for (var i = 0; i < string_array.length; i++) {
        result[ string_array[i] ] = i;
    }
   
    // adding 15000 gene names to the dictionary took about 10 milliseconds on a desktop computer (intel core i7) from 2014
    // If we require that the gene names should be alphabetically ordered, I guess we use a btree instead of a hash.
    // Maybe something to look at in the future.

    return result;
}

class StExpProtobufFile {
    constructor(slice_loader, protobuf_loader) {
        this.slice_loader = slice_loader;
        this.protobuf_loader = protobuf_loader;
        this.headersize = get_headersize(this.protobuf_loader, slice_loader);
        this.header = get_header(this.headersize,this.protobuf_loader, slice_loader);
        this.genenames = get_genenames(this.headersize, this.header, protobuf_loader, slice_loader);
        this.genenames_dict = this.genenames.then(function(value) { return dictionary_from_string_array(value.geneNames) });
        this.spots = get_spots(this.headersize, this.header, protobuf_loader, slice_loader);
    }
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

function header_start_pos(magic) {
    var HeaderSize_message_length = 5;
    var padding = 3; // To have it 8-byte aligned
    return magic.length + 5 + padding; 
}

function align_to_8_bytes(pos) {
    var tmp_pos = pos;
    if (tmp_pos % 8 != 0) {
        tmp_pos = tmp_pos + 8 - (tmp_pos % 8);
    }
    return tmp_pos;
}

function file_regions_start_pos(magic, header_size) {
    var header_start = header_start_pos(magic);
    return align_to_8_bytes(header_start + header_size);
}

var  handleExperimentFiles = function(protobuf_loader, files) {
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var slice_loader = new LocalSliceLoader(file);
        window.local_files[ file.name ] = new StExpProtobufFile(slice_loader, protobuf_loader);
    }
}.bind(null, protobuf_loader_global);

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

function add_layout_image(osd_viewer, overlay, layoutimage_datafile, title, x_coord, y_coord, images, tile_conversions, color_array) {
    console.log("in add_layout_image ",  x_coord, y_coord);
    var osd_layout_image_colors_index = window.osd_layout_image_colors.length;
    window.osd_layout_image_colors.push(color_array);

    var tile_conversion_index = 0; // TODO: this should be configurable somehow. The exeperiment might include more than one tile_conversion
    var tile_conversion = tile_conversions[tile_conversion_index];
    
    var image_index = 1;
    var im = images[image_index];              
    osd_viewer.addTiledImage(
        {
            tileSource: {
                height: im.imageHeight,
                width: im.imageHeight,
                tileSize: tile_conversion.tileSize,
                tileOverlap: tile_conversion.tileOverlap,
                getTileUrl: function (datafile, level, x, y) {
                    return [datafile, image_index, tile_conversion_index, osd_layout_image_colors_index, level, x, y].join("/");
                }.bind(null, layoutimage_datafile)
            },
            x: x_coord,
            y: y_coord,
            width: 1.1,
            index: 0
        }
    );
    var d3Rect = d3.select(overlay.node()).
        append("text")
        .attr("height", 0.1)
        .attr("x", x_coord + 0.55)
        .attr("y", y_coord + 1)

        .style("font-size","0.05px")
        .style("text-anchor", "middle")
        .text(title);

    osd_viewer.viewport.goHome();               
    osd_viewer.viewport.fitHorizontally(true);
    osd_viewer.viewport.applyConstraints();
    osd_viewer.viewport.update();                
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

        if (layoutimage.rendering.type == "fromgene") {
            var genehit = get_genehit_from_genename(layoutimage.rendering.gene_name, local_st_file.genenames_dict, local_st_file.headersize, local_st_file.header, local_st_file.protobuf_loader, local_st_file.slice_loader);
            Promise.all([genehit, local_st_file.header, local_st_file.spots]).then(
                function(layoutimage, values) {
                    var genehit_decoded = values[0];
                    var header_decoded = values[1];
                    var spots_decoded = values[2];
                    var genehit_array = genehits_as_array(genehit_decoded, spots_decoded.spots.length);
                    var color_array = calculate_spot_colors_from_genehit_array(genehit_array);
                    add_layout_image(viewer, overlay, layoutimage.datafile, layoutimage.rendering.gene_name, layoutimage.x, layoutimage.y, header_decoded.images, header_decoded.tileConversions, color_array);
                }.bind(null, layoutimage)
            );
        }
    }
}
