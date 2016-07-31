// The MIT License (MIT)
//
// Copyright (C) 2015 osd-spot-viewer contributors
// Copyright (C) 2016 Karolinska institutet
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
import { calculate_tile_id, coord_relative_tile, num_levels } from './dzi_helper';

import { get_tile } from './st_exp_protobuf_file.js';

export default class {
    constructor(color_array, st_exp_protobuf_file) {
	this.st_exp_protobuf_file = st_exp_protobuf_file;
	this.color_array = color_array;
    }
    getSlice(obj_this, args) {
    this.st_exp_protobuf_file.header.then(
        function (color_array, args, experiment_file, header_decoded) {
            const full_image = header_decoded.images[args.image_index];
            const full_image_width = full_image.imageWidth;
            const full_image_height = full_image.imageHeight;
            const tile_conversion = header_decoded.tileConversions[args.tile_conversion_index];
            const tile_size = tile_conversion.tileSize;
            const tile_id = calculate_tile_id(args.xcoord, args.ycoord, args.level,
					      full_image_width, full_image_height, tile_size);
            const file_region = tile_conversion.tiledImages[args.image_index].tiles[tile_id];
            const tile = get_tile(tile_id, args.image_index, args.tile_conversion_index,
				  experiment_file.headersize, experiment_file.header,
				  experiment_file.protobuf_loader, experiment_file.slice_loader);
            Promise.all([experiment_file.spots, tile]).then(
                function(color_array,  x_coord, y_coord, level, tile_size, tile_overlap,
			 full_image_width, full_image_height, values) {
                    const spots_decoded = values[0];
	            const unscaled_radius = spots_decoded.spotCircleRadius ;

                    const tile_buff = values[1];
                    const tile_img = document.createElement("img");
                    const uint8_array = new Uint8Array(tile_buff);
                    const tile_base64 = btoa(String.fromCharCode.apply(null, uint8_array));
	            tile_img.onload = function(tile_img, color_array, x_coord, y_coord, level,
					       tile_size, tile_overlap, full_image_width,
					       full_image_height, spots_decoded) {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        ctx.canvas.width = tile_img.width;
                        ctx.canvas.height = tile_img.height;
                        ctx.drawImage(tile_img, 0, 0, tile_img.width, tile_img.height);
			const levels_count = num_levels(full_image_width, full_image_height);
                        const level_factor = Math.pow(2, levels_count - level - 1);
                        const scaled_radius = unscaled_radius / level_factor;
                        for (let i = 0; i < spots_decoded.spots.length; i++) {
                            const spot = spots_decoded.spots[i];
                            ctx.beginPath();
                            const x_circle = coord_relative_tile(x_coord, spot.xCoordPhyscial,
								 tile_size, tile_overlap, level_factor);
                            const y_circle = coord_relative_tile(y_coord, spot.yCoordPhyscial,
								 tile_size, tile_overlap, level_factor);
                            ctx.arc(x_circle, y_circle, scaled_radius, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            const col = color_array[i];
                            ctx.fillStyle = "rgba(" + col[0] + ", " + col[1] + "," +
				col[2] + "," +  col[3] + ")";
                            ctx.fill();
                        }
                        const data_url = canvas.toDataURL("image/png");
	                this.image = new Image();
                        setupImageCallbacks(this);
                        this.image.src = data_url;
                    }.bind(this, tile_img, color_array, x_coord, y_coord, level, tile_size, tile_overlap,
			   full_image_width, full_image_height, spots_decoded)
                    tile_img.src =  "data:image/jpeg;base64," + tile_base64;
                }.bind(this, color_array, args.xcoord, args.ycoord, args.level, tile_size,
		       tile_conversion.tileOverlap, full_image_width, full_image_height)
            );
        }.bind(obj_this, this.color_array, args, this.st_exp_protobuf_file)
    );
    }
}
