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
function update_type_ahead_values(unique_gene_names, genenames_typeahead_elem) {
    const genes_bloodhound = new Bloodhound({
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

export default class {
    constructor(st_data_files_container, add_layout_func) {
	this.st_data_files_container = st_data_files_container;
        this.add_layout_func = add_layout_func;
	this.div_elem = $('<div />')	;
	const content =  `
              <div class="col-sm-6">
	      <label class="btn btn-default btn-file">Gene hit cutoff 
	      <input id="genehit_cutoff"  type="text" data-slider-min="1" data-slider-max="1000" data-slider-scale="logarithmic" data-slider-step="1" data-slider-value="3" />
	      </label>
            </div>
	    <div class="row" style=" margin-top: 10px;">
            <div class="col-sm-6">
            <label class="btn btn-default btn-file">
            Add gene
            <input type="text" id="add_gene_input" class="typeahead" />
            </label>
            <textarea id="genes_textarea" cols="20" rows="5"></textarea>
            </div>
	    <div class="col-sm-6">
	    <button class="btn btn-default" type="button"
        id="createLayoutFromGeneListButton">Create layout from gene list</button>
            </div>
	    </div>
	    `;
	this.div_elem.append(content);
	this.genenames_typeahead_elem = $(".typeahead", this.div_elem);
	this.genes_textarea = $('#genes_textarea', this.div_elem);
	this.genenames_typeahead_elem.bind('typeahead:selected',
					   function(ev, suggestion) {
  					       this.add_gene_to_list(suggestion);
					   }.bind(this));
        // Pressing enter adds a gene directly to the gene list.
	this.genenames_typeahead_elem.bind("keypress", {}, function (ev) { 
	    if (ev.keyCode == 13) {
		ev.preventDefault();
		var gene_input_value = this.genenames_typeahead_elem.val();
		this.add_gene_to_list(gene_input_value );
	    }
	}.bind(this));
	this.slider = $("#genehit_cutoff", this.div_elem).bootstrapSlider();
	$('#createLayoutFromGeneListButton', this.div_elem).click(function () {
	    this.handleCreateLayoutFromGeneList();
	}.bind(this));
    }
    add_gene_to_list( gene_name ) {
	var genes =  this.genes_textarea  ;
	genes.val(genes.val() + this.genenames_typeahead_elem.val() + '\n');
	// Reset gene name field
	this.genenames_typeahead_elem.typeahead('val','');
    }
    name() { return "from gene"; }
    id_string() { return "fromgene_createlayout_js"; }
    update_after_data_change() {
	console.log("In fromgene_createlayout.js update_after_data_change()");
	update_type_ahead_values(
	    this.st_data_files_container.gene_names(),
	    this.genenames_typeahead_elem);
    }
    html_content() {
	return this.div_elem;	
    }
    handleCreateLayoutFromGeneList() {
        const genes = 	this.genes_textarea.val().split('\n');
        const genehit_cutoff = this.slider.bootstrapSlider('getValue');
        const layoutimages = [];
        for (const [file_index, experiment_name] of Object.keys(this.st_data_files_container.data_files).entries()) {
            for (const [gene_index, gene] of genes.entries()) {
                console.log(JSON.stringify(gene));
                if (gene.length > 0) {
                    layoutimages.push(
                        {
                            rendering_type : 'fromgene',		    
                            rendering_data : {
				data_filename : experiment_name,
				gene_name : gene,
				genehit_cutoff : genehit_cutoff },
                            x : gene_index,
                            y : file_index
                        }
                    );
                }
            }
        }
        const layout_json = {};
        layout_json.layoutimages = layoutimages;
	console.log("layout json =", JSON.stringify(layout_json));
        this.add_layout_func(layout_json);
    }
}
