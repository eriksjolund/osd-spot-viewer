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

export function num_levels(width, height) {
    return Math.ceil(Math.log2(Math.max(width, height))) + 1;
}

function scaled_tile_size(num_levels_, level, tile_size) {
    const count = num_levels_ - level - 1;
    return tile_size * Math.pow(2, count);
}

function num_tiles_level(width, height, level, tile_size) {
    const num_l = num_levels(width, height);
    const scaled = scaled_tile_size(num_l, level, tile_size);
    const num_tiles = Math.ceil(width / scaled) * Math.ceil(height / scaled) ;
    return num_tiles;
}

export function calculate_tile_id(x_coord, y_coord, level, width, height, tile_size) {
    let result = 0;
    for (let i = 0; i < level; i++) {
        result += num_tiles_level(width, height, i, tile_size);
    }
    const num_l = num_levels(width, height);
    const scaled_tile_s = scaled_tile_size(num_l, level, tile_size);
    const num_columns = Math.ceil(width / scaled_tile_s);
    result += (num_columns * y_coord) + x_coord;
    return result;
}

export function coord_relative_tile(coord_dzi, coord_spot, tile_size,
				    tile_overlap, level_factor) {
    let overlap_adjust = tile_overlap;
    // At the lower border of the grid of image tiles, the images are
    // expected to not have a overlap on the side facing the border. This
    // is conforming to how OpenSeadragon and the DZI file format works.
    if (coord_dzi == 0) {
        overlap_adjust = 0;
    }
    const result_coord = coord_spot / level_factor - coord_dzi * tile_size + overlap_adjust;
    return result_coord;
}
