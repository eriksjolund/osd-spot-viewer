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
import { SlicedImage } from './sliced_image';

export default class extends SlicedImage {
        constructor(slice_promise, title_promise, st_exp_protobuf_file) {
	super();
        this.image_info_promise = Promise.all([st_exp_protobuf_file.header]).then(
            function(values) {
                const header_decoded = values[0];			
		const image_index = 0;
                const im = header_decoded.images[image_index];
		const tile_conversion_index = 0; // TODO: this should be
		// configurable somehow.
		// The exeperiment might include more than one tile_conversion
                const tile_conversion = header_decoded.tileConversions[tile_conversion_index];
                return { height: im.imageHeight,
			 width: im.imageWidth,
			 tileSize: tile_conversion.tileSize,
			 tileOverlap: tile_conversion.tileOverlap };
	    });
	    this.slice_promise = slice_promise;
 	this.title_promise = title_promise;
// TODO: this.overlay_promise = overlay_promise;	
    }
    ImageInfoPromise() {
        return this.image_info_promise;
    }
    GetSlicePromise() {return this.slice_promise; }
    // Having a GetTitlePromise() might be superfluous when we implement GetOverlayPromise() 
    GetTitlePromise() {return this.title_promise; } 
// TODO:  GetOverlayPromise() {return this.overlay_promise; } 
}
