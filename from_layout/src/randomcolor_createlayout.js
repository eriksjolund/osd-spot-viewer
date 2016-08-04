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
export default class {
    constructor(st_data_files_container, add_layout_func) {
	this.st_data_files_container = st_data_files_container;
        this.add_layout_func = add_layout_func;
	this.div_elem = $('<div />');
	const content = `
	      <div class="row" style=" margin-top: 10px;">
	      <div class="col-sm-6">
	      <p>To visualize the spots with your own choice of colors,
	      take a look at the JSON representation of one of these
	layouts. Create a text file in the same format but with your own colors
	and then load it with <b>open layout</b>. The colors are listed as
	[ red, green, blue, alpha ] so it is possible to have semi-transparent
	spots by adjusting the alpha values.
	    </p>  
	    <button class="btn btn-default" type="button" id="createLayoutWithRandomColorsButton">
	    Create layout with spots having a random color</button>
	    </div></div> `;
	this.div_elem.append(content);
	$('#createLayoutWithRandomColorsButton', this.div_elem).click(
	    function () {
	    this.handleCreateLayoutWithRandomColors();
	}.bind(this));
    }
    
    handleCreateLayoutWithRandomColors() {
	const data_files = this.st_data_files_container.data_files;
	// The number of spots are needed so we have
	// to use Promise.all() and wait for them to be
	// ready.
	Promise.all(Object.keys(data_files).map(s => data_files[s].spots)).then(
	    function (data_files, values) {
		const layoutimages = [];
		let file_index = 0;
		for (const [data_filename, st_exp_protobuf_file] of
		     Object.entries(this.st_data_files_container.data_files)) {
		    console.log("a1");
		    const spot_colors = [];
		    const num_spots = values[file_index].spots.length;
		    const random_value = function() {
			return Math.floor(Math.random()*255);
		    }
		    const randomcolor =  [ random_value(),
					   random_value(),
					   random_value(),
					   1.0 ];
		    for (let i=0; i< num_spots; i++) {
			spot_colors.push( randomcolor );
		    }
		    const layout_image = {
			rendering_type : 'fromcolor',
			rendering_data : {
			    data_filename : data_filename,
			    title : "",
			    spot_colors : spot_colors
			},
			x : 0,
			y : file_index
		    };
		    layoutimages.push(layout_image);
		    ++file_index;
		}
		const layout_json = {};
		layout_json.layoutimages = layoutimages;
		this.add_layout_func(layout_json);
	    }.bind(this, data_files)
	);
    }
    layout_creator_name() { return "random color"; }
    id_string() { return "randomcolor_createlayout_js"; }
    update_after_data_change() {}
    html_content() {
	return this.div_elem;	
    }
}


