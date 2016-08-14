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

import LocalSliceLoader from './local_slice_loader';
import RemoteSliceLoader from './remote_slice_loader';

import Layout from './layout';

function check_for_filename_collision(datafiles_container, slice_loaders) {
		for (const slice_loader of slice_loaders) {
	if (slice_loader.filename() in datafiles_container.data_files) {
            throw Error("The data file name \"" + slice_loader.filename() + "\" has already been loaded");
	}
    }
}

export class App {
    constructor(datafiles_container,  parsers, layout_creator_classes) {
        this.datafiles_container = datafiles_container;
	this.layout_renderers = {};
	for (const parser of parsers) {
   	  this.layout_renderers[parser.parser_name()] = parser.parser_func();
	}
	
	for (const layout_creator_class of layout_creator_classes) {
            const layout_creator = new layout_creator_class(datafiles_container,   function(layout_json) {   this.addLayout(layout_json); }.bind(this) );
            this.datafiles_container.add_change_listener(function () { this.update_after_data_change();}.bind(layout_creator) );
	    const name = layout_creator.layout_creator_name();
	    const id_string = layout_creator.id_string();
	    const nav_tab_entry = `<li><a data-toggle="tab" href="#${id_string}">${name}</a></li>`;
            $("#create_layouts_nav_tabs").append(nav_tab_entry);
	    const content_div = `<div id="${id_string}" class="tab-pane fade" />`;
	    $("#create_layouts_tab_content").append(content_div);
   	    $("#create_layouts_tab_content div").last().append(layout_creator.html_content());
	}
	$("#create_layouts_nav_tabs li").first().addClass("active");
		$("#create_layouts_tab_content div").first().addClass("in active");
	this.layouts = [];
    }
    addLayout(layout_json) { 
	this.layouts.push(new Layout(layout_json, this.datafiles_container.data_files, this.layouts.length, this.layout_renderers));
    }
    handleAddDataFileURL() {
	const remote_url = document.getElementById('input_remote_url_to_add').value;
        this.addDataFileURL(remote_url);

    }

    addDataFileURL(url) {
        const slice_loaders = [new RemoteSliceLoader(url)];
	check_for_filename_collision(this.datafiles_container, slice_loaders);
	this.datafiles_container.push_sliceloaders(slice_loaders);
    }
    handleOpenLocalLayoutFiles(files) {
	for (const file of files) {
            const file_reader = new FileReader();
            file_reader.onloadend = function(evt) {
		if (evt.target.readyState == FileReader.DONE) {
		    const layout_json = JSON.parse(evt.target.result);
		    this.addLayout(layout_json);
		}
            }.bind(this);
            file_reader.readAsText(file);
	}
    }
    handleOpenLocalDataFiles(files) {
        const slice_loaders = [];
	for (const file of files) {
            slice_loaders.push(new LocalSliceLoader(file));
	}
        check_for_filename_collision(this.datafiles_container, slice_loaders);	
        this.datafiles_container.push_sliceloaders(slice_loaders);
    }
}

export function get_tile_function(layouts, obj_this) {
    const fields = obj_this.src.split("/");
    const args = {};
    args.image_index = parseInt(fields[0]);
    args.tile_conversion_index = parseInt(fields[1]);
    args.layout_index = parseInt(fields[2]);
    args.tiled_images_index = parseInt(fields[3]);
    args.level = parseInt(fields[4]);
    args.xcoord = parseInt(fields[5]);
    args.ycoord = parseInt(fields[6]);
    layouts[args.layout_index].tiled_images[args.tiled_images_index].GetSlicePromise().then(
        function (obj_this,args, slice) {
	    slice.getSlice(obj_this, args);
	}.bind(null, obj_this, args)
    );
    return;    
}
