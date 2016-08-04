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
import StImage from './st_image';
import { ProtoBufLoader, StExpProtobufFile} from './st_exp_protobuf_file.js';
import st_image_slicer from './st_image_slicer.js';

export default class {
    constructor() {}
    static parser_name() { return "fromcolor"; }
    static parser_func() {
	return function(rendering_data, data_files) {
            const data_file = data_files[ rendering_data.data_filename ];                
            const slice_promise =  Promise.all([data_file.spots]).then(
		function(color_array, data_file, values) {
                    const spots_decoded = values[0];
		    // hm, having a promise does not make much sense here.
		    // But it might be good that the call to
		    // openseadragon.github.io/docs/OpenSeadragon.Viewer.html#addTiledImage
		    // is done after the spots have been decoded.
                    return new st_image_slicer(color_array, data_file);
		}.bind(null, rendering_data.spot_colors, data_file) );
	    const title = "";
	    return new StImage(slice_promise, Promise.resolve(rendering_data.title), data_file);
	}
    }
}
