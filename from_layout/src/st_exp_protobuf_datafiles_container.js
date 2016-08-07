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

import { ProtoBufLoader, StExpProtobufFile,
	 get_genehit_from_genename, genehits_as_array,
	 get_tile } from './st_exp_protobuf_file.js';

export default class {
    constructor() {
        this.data_files = {};
	this.protobuf_loader = new ProtoBufLoader();
        this.set_of_genenames = new Set();
	this.change_listener_callbacks = [];
    }
    add_change_listener(callback) {
	this.change_listener_callbacks.push(callback);
    }
    notify_change_listeners() {
	for (const callback of this.change_listener_callbacks) {
	    callback();
	}
    }
    gene_names() {
        const unique_gene_names = [];
        for (const item of this.set_of_genenames) {
            unique_gene_names.push(item);
        }
	return unique_gene_names;
    }
    push_sliceloaders(slice_loaders) {
	const gene_names_promises = [];
        const filenames = [];
	for (const slice_loader of slice_loaders) {
	    const experiment_file = new StExpProtobufFile(slice_loader, this.protobuf_loader);	    
            gene_names_promises.push(experiment_file.genenames);
	    this.data_files[ slice_loader.filename() ] = experiment_file;
	    filenames.push(slice_loader.filename());
	}
        Promise.all(gene_names_promises).then(
	    function(filenames, genenames_decoded_array) {
		let i = 0;
		for (const genenames_decoded of genenames_decoded_array) {
		    for (const gene_name of genenames_decoded.geneNames) {
			this.set_of_genenames.add(gene_name);
		    }
		    const gene_name_count = genenames_decoded.geneNames.length;
		    const filename = filenames[i];
		    $("#opened_data_files").append(`<tr><td>${filename}</td><td>${gene_name_count}</td></tr>`);
		    i += 1;
		}
		this.notify_change_listeners();
	    }.bind(this, filenames));
    }
    static file_format_name() { return "st_exp_protobuf"; }
}
