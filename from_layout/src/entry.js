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

function addExperimentURL(remote_url, protobuf_loader, experiment_files) {
    var slice_loader = new RemoteSliceLoader(remote_url);
    var url_parser = document.createElement('a');
    url_parser.href = remote_url;
    // Retrieving the experiment filename out of an URL will not work if the URL is something like:
    //
    // http://example.com
    // http://example.com/
    // http://example.com/mega/
    //
    // But it will work for
    // http://example.com/files/file.st_exp_protobuf?extraparam=value
    // http://example.com/files/file.st_exp_protobuf
    // http://example.com/file.st_exp_protobuf
    //
    // TODO: Maybe the experiment name should be stored inside the experiment file itself instead?
    var experiment_name = url_parser.pathname.substr(url_parser.pathname.lastIndexOf("/")+1);
    console.log("experiment_name = " + experiment_name);
    var experiment_file = new StExpProtobufFile(slice_loader, protobuf_loader);
    experiment_files[ experiment_name ] = experiment_file;
    return experiment_file.genenames;
}

function update_unique_genenames(set_of_genenames, genenames_typeahead_elem, genenames_decoded) {
    for (var i = 0; i < genenames_decoded.length; i++) {
        var gene_names = genenames_decoded[i].geneNames;
        for (var j = 0; j < gene_names.length; j++) {
            set_of_genenames.add(gene_names[j]);
        }
    }
    var unique_gene_names = [];
    for (let item of set_of_genenames) {
        unique_gene_names.push(item);
    }
    var genes_bloodhound = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: unique_gene_names
    });
    genenames_typeahead_elem.typeahead(
        {
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            name: 'genes_bloodhound',
            limit: 20,
            source: genes_bloodhound });
}

class Global {
    constructor(genenames_typeahead_elem) {
	this.layouts = [];
        this.experiment_files = {};
	this.protobuf_loader = new ProtoBufLoader();
        this.set_of_genenames = new Set();
        this.genenames_typeahead_elem = genenames_typeahead_elem;
    }
    handleAddExperimentURL() {
	var remote_url = document.getElementById('input_remote_url_to_add').value;
	var genenames_promises = addExperimentURL(remote_url, this.protobuf_loader, this.experiment_files);
        Promise.all([genenames_promises]).then(update_unique_genenames.bind(null, this.set_of_genenames, this.genenames_typeahead_elem));
    }
    handleLayoutFiles(files) {
	for (var i = 0; i < files.length; i++) {
            var file_reader = new FileReader();
            file_reader.onloadend = function(layouts, experiment_files, evt) {
		if (evt.target.readyState == FileReader.DONE) {
		    var layout_json = JSON.parse(evt.target.result);
		    layouts.push(new Layout(layout_json, experiment_files));
		}
            }.bind(null, this.layouts, this.experiment_files);
            file_reader.readAsText(files[i]);
	}
    }
    handleExperimentFiles(files) {
        var gene_names_promises = [];
	for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var slice_loader = new LocalSliceLoader(file);
            var experiment_file =  new StExpProtobufFile(slice_loader, this.protobuf_loader);
            gene_names_promises.push(experiment_file.genenames);
            this.experiment_files[ file.name ] = experiment_file;
        }
        Promise.all(gene_names_promises).then(update_unique_genenames.bind(null, this.set_of_genenames, this.genenames_typeahead_elem));
    }
    handleCreateLayoutFromGeneList() {
        var genes = $('#genes_textarea').val().split('\n');
        var layoutimages = [];
        var i = 0;
        for (var experiment_name in this.experiment_files) {
            for (var j = 0; j < genes.length; ++j) {
                var gene = genes[j];
                if (gene.length > 0) {
                    layoutimages.push(
                        { 'datafile' : experiment_name,
                          'rendering' : {
                              'type' : 'fromgene',
                              "gene_name" : gene },
                          'x' : j,
                          'y' : i
                        }
                    );
                }
            }
            ++i;
        }
        var layout_json = {};
        layout_json.layoutimages = layoutimages;
        this.layouts.push(new Layout(layout_json, this.experiment_files));
    }
}

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

function start_function_experiment(experiment_files, obj_this) {
    var fields = obj_this.src.split("/");
    var args = {};
    args.filename = fields[0];
    args.image_index = parseInt(fields[1]);
    args.tile_conversion_index = parseInt(fields[2]);
    args.osd_layout_image_colors_index = parseInt(fields[3]);           
    args.level = parseInt(fields[4]);
    args.xcoord = parseInt(fields[5]);
    args.ycoord = parseInt(fields[6]);
    
    var experiment_file = experiment_files[args.filename];
    // experiment_file.header should already be fullfilled by now. But nonetheless then() is used. Maybe change this somehow in the future ...
    experiment_file.header.then(
        function (args, experiment_file, header_decoded) {
            var full_image = header_decoded.images[args.image_index];
            var full_image_width = full_image.imageWidth;
            var full_image_height = full_image.imageHeight;
            var tile_conversion = header_decoded.tileConversions[args.tile_conversion_index];
            var tile_size = tile_conversion.tileSize;
            var tile_id = calculate_tile_id(args.xcoord, args.ycoord, args.level, full_image_width, full_image_height, tile_size);

            var file_region = tile_conversion.tiledImages[args.image_index].tiles[tile_id];
            var tile = get_tile(tile_id, args.image_index, args.tile_conversion_index, experiment_file.headersize, experiment_file.header, experiment_file.protobuf_loader, experiment_file.slice_loader);
            var color_array = window.osd_layout_image_colors[args.osd_layout_image_colors_index];
            Promise.all([experiment_file.spots, tile]).then(
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
                        var data_url = canvas.toDataURL("image/png");
	                this.image = new Image();
                        setupImageCallbacks(this);
                        this.image.src = data_url;
                    }.bind(this, tile_img, color_array, x_coord, y_coord, level, tile_size, tile_overlap, full_image_width, full_image_height, spots_decoded)
                    tile_img.src =  "data:image/jpeg;base64," + tile_base64;                  
                }.bind(this, color_array, args.xcoord, args.ycoord, args.level, tile_size, tile_conversion.tileOverlap, full_image_width, full_image_height)
            );
        }.bind(obj_this, args, experiment_file)
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

// It might be possible to implement the RemoteSliceLoader with the new Fetch API instead of XMLHttpRequest.
// Maybe something for the future?

class RemoteSliceLoader {
    constructor(url) {
        this.url = url;
    }
    get_slice(start_pos, size) {
        return new Promise(function(url, resolve, reject) {
        var range_string = 'bytes=' +  start_pos + "-" + (start_pos + size - 1);
        var xhr = new XMLHttpRequest();
        xhr.open( "GET", url, true );
        xhr.responseType = "arraybuffer";
        xhr.setRequestHeader(
            'Range', range_string);
        xhr.onload = function( e ) {
            console.log("this.status=" + this.status);
            resolve(this.response);
        };
        xhr.send();
        }.bind(this, this.url) ) }
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
                width: im.imageWidth,
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
}

class Layout {
    constructor(layout_json, experiment_files) {
        this.layout_json = layout_json;
	this.experiment_files = experiment_files;
        var osd_windows = document.getElementById('osd_windows');
        var layout_tab_div = document.createElement("div");
        osd_windows.appendChild(layout_tab_div);
        var number_string = osd_windows.children.length.toString();
        var osd_id_string = "osd-" + number_string;
        var json_id_string = "json-" + number_string;
        var osd_alink_id_string = "osd-alink-" + number_string;
        var json_text = JSON.stringify(this.layout_json,null, 2);
        layout_tab_div.innerHTML = `
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title">Layout</h3>
                </div>
                <div class="panel-body">
                    <div class="container">
                        <ul class="nav nav-tabs">
                            <li class="active"><a data-toggle="tab" href="#${osd_id_string}"  id="${osd_alink_id_string}">Graphical view</a></li>
                            <li><a data-toggle="tab" href="#${json_id_string}">JSON</a></li>
                        </ul>
                        <div class="tab-content">
                            <div id="${osd_id_string}" class="tab-pane fade in active">
                            </div>
                            <pre id="${json_id_string}"   contenteditable="true" class="tab-pane fade" style="text-align: left;">
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.json_container_div = document.getElementById(json_id_string);
        $(document).on( 'shown.bs.tab', 'a[data-toggle="tab"][id="' + osd_alink_id_string + '"]', function (e) {
            var parsed_json = JSON.parse(this.json_container_div.innerText);

            // http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
            // Note as stated in the Stackoverflow answer, this is in most cases a correct comparison of JSON objects,
            // but for the cases it is wrong we are mistakingly replacing the OSD window with a new
            // one. Not such a big deal.
            if (!(JSON.stringify(parsed_json) === JSON.stringify(this.layout_json))) {
                this.layout_json = parsed_json;
                this.viewer.destroy();
                this.viewer = null;
                this.setViewerFromLayoutJson();
            }
        }.bind(this))
        this.json_container_div.textContent = json_text;
        this.osd_container_div = document.getElementById(osd_id_string);
        this.osd_container_div.style.width = "1200px";
        this.osd_container_div.style.height = "1200px";
        this.setViewerFromLayoutJson();
    }
    setViewerFromLayoutJson() {
        this.viewer = new OpenSeadragon({
            id: this.osd_container_div.id,
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            debugMode:  false,
            showNavigator:  true,
            zoomPerScroll: 1.8,
            maxImageCacheCount: 400  // 200 is the default
        });
	var overlay = this.viewer.svgOverlay();
        // This seems to be a bug in 
	// https://github.com/openseadragon/svg-overlay
	//
	// At least the "update-viewport" handler is used in a similar plugin
	// https://github.com/altert/OpenseadragonFabricjsOverlay/blob/master/openseadragon-fabricjs-overlay.js
	// but it is missing from
	// https://github.com/openseadragon/svg-overlay
	//
	// If this code is not added here the gene name text is sometimes not updated and therefore
	// located at the wrong place.
        this.viewer.addHandler('update-viewport', function() {
	    overlay.resize();
        });

	var layoutimages = this.layout_json['layoutimages'];
        var layout_image_promises = [];
	for (var i = 0; i < layoutimages.length; i++) {
            var layoutimage = layoutimages[i];
            var experiment_file = this.experiment_files[ layoutimage.datafile ];
            if (layoutimage.rendering.type == "fromgene") {
                var genehit = get_genehit_from_genename(layoutimage.rendering.gene_name, experiment_file.genenames_dict, experiment_file.headersize, experiment_file.header, experiment_file.protobuf_loader, experiment_file.slice_loader);
                layout_image_promises.push(Promise.all([genehit, experiment_file.header, experiment_file.spots]).then(
                    function(layoutimage, values) {
                        var genehit_decoded = values[0];
                        var header_decoded = values[1];
                        var spots_decoded = values[2];
                        var genehit_array = genehits_as_array(genehit_decoded, spots_decoded.spots.length);
                        var color_array = calculate_spot_colors_from_genehit_array(genehit_array);
                        add_layout_image(this.viewer, overlay, layoutimage.datafile, layoutimage.rendering.gene_name, layoutimage.x, layoutimage.y, header_decoded.images, header_decoded.tileConversions, color_array);
		    }.bind(this, layoutimage)));
	    }
        }
        Promise.all(layout_image_promises).then(
	    // If we don't run goHome(true), the zoom and pan is set so that only one experiment image is shown.
	    // But it is better if all layout images are shown by default.
	    // Therefore this callback is run once after all layoutimages have been added.
            function(viewer) {
		setTimeout(function(osd_viewer) {
		    osd_viewer.viewport.goHome(true);
		    osd_viewer.viewport.update();
		}.bind(null,viewer),0); }.bind(null, this.viewer)
	);
    }
}



