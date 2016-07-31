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
import { ProtoBufLoader, StExpProtobufFile,
	 get_genehit_from_genename, genehits_as_array } from './st_exp_protobuf_file.js';
import st_image_slicer from './st_image_slicer.js';

function calculate_spot_colors_from_genehit_cutoff(genehit_cutoff, gene_hit_array) {
    //    const es_cutoff = estimate_cutoff(gene_hit_array);    
    const colors = gene_hit_array.map(
	function(gene_hit) {
            if (gene_hit <= genehit_cutoff) {
                return([0, 0, 0, 0]);
            }
            else {
		//                let alpha = gene_hit / 30;
		//              if (alpha > 1) {
		//                alpha = 1;
		//          }
		const alpha = 0.9;
                return([255, 0, 0, alpha]);
            }
        }
    );
    return colors;
}

function getSlicePromise(gene_name, genehit_cutoff, st_exp_protobuf_file) {
    const genehit = get_genehit_from_genename(gene_name,
					      st_exp_protobuf_file.genenames_dict,
					      st_exp_protobuf_file.headersize,
					      st_exp_protobuf_file.header,
					      st_exp_protobuf_file.protobuf_loader,
					      st_exp_protobuf_file.slice_loader);
    return Promise.all([genehit,
			st_exp_protobuf_file.header,
			st_exp_protobuf_file.spots]).then(
        function(genehit_cutoff, values) {
            const genehit_decoded = values[0];
            const header_decoded = values[1];
            const spots_decoded = values[2];
            const genehit_array = genehits_as_array(genehit_decoded,
						    spots_decoded.spots.length);
  	    const color_array = calculate_spot_colors_from_genehit_cutoff(genehit_cutoff,
									  genehit_array);
            return new st_image_slicer(color_array, st_exp_protobuf_file);
	}.bind(null, genehit_cutoff) );
}

/*
  TODO:
  function getTitleOverlayPromise(title) {
  return title.then(
  function(title) {
  return 

  }
  );
  }
*/

export default class {
    constructor() {}
    static name() { return "fromgene"; }
    static parser_func() {
	return function(rendering_data, data_files) {
            const data_file = data_files[ rendering_data.data_filename ];                
            const slice_promise = getSlicePromise(rendering_data.gene_name,
						  rendering_data.genehit_cutoff,
						  data_file);
	    const title_promise = Promise.resolve(rendering_data.gene_name);
	    return new StImage(slice_promise, title_promise, data_file);
	}
    }
}
