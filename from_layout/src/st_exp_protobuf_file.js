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
export class ProtoBufLoader {
    constructor() {
        this.builder = new Promise(function(resolve, reject) {
            const ProtoBuf = dcodeIO.ProtoBuf;
            ProtoBuf.loadProtoFile("st_exp.proto", function(err, builder) {
                resolve(builder.build());
            });
        });
    }
}

export class StExpProtobufFile {
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

const magic = [ 'S', 'T', '-', 'E', 'X', 'P', '\0', '\0' ];

function dictionary_from_string_array(string_array) {
    const result = {};
    console.log("string_array.length=" + string_array.length);
    for (let i = 0; i < string_array.length; i++) {
        result[ string_array[i] ] = i;
    }

    // adding 15000 gene names to the dictionary took about 10 milliseconds on a desktop computer (intel core i7) from 2014
    // If we require that the gene names should be alphabetically ordered, I guess we use a btree instead of a hash.
    // Maybe something to look at in the future.

    return result;
}


// We could also retrieve the genehit values from a generator.
// ( http://exploringjs.com/es6/ch_generators.html#ch_generators )
//
// It would make the code more elegant, but on the same time
// make it slower, I guess. It could look like this:
//
// function* genehits_from_message(gene_hit_message, number_of_spots) {
//     let gene_hit_count = 0;
//     for (let i = 0; i < gene_hit_message.hits.length; i++) {
//         const zeroes_skipped = gene_hit_message.zeroHitsSkipped[i];
// 	gene_hit_count += zeroes_skipped;
//         for (let j = 0; j < zeroes_skipped; j++) {
//             yield(0);
//         }
// 	gene_hit_count++;
//         yield(gene_hit_message.hits[i]);
//     }
//     const number_of_zeroes_in_the_end = number_of_spots - gene_hit_count;
// ;
//     for (let i = 0; i < number_of_zeroes_in_the_end; i++) {
//         yield(0);
//     }
// }
//
// function genehits_as_array(gene_hit_message, number_of_spots) {
//     return Array.from(genehits_from_message(gene_hit_message, number_of_spots));
// }
//
// The real advantage of a generator would be if one would like to avoid keeping an array
// of the genehits but instead just iterate through the values.
//


export function genehits_as_array(gene_hit_message, number_of_spots) {
    // TODO: Investigate this. Not so important but,
    // maybe it is faster to first create an array of only zeroes and then overwrite the values
    // not equal to zero..
    let gene_hit_array = [];
    for (let i = 0; i < gene_hit_message.hits.length; i++) {
        const zeroes_skipped = gene_hit_message.zeroHitsSkipped[i];
        for (let j = 0; j < zeroes_skipped; j++) {
            gene_hit_array.push(0);
        }
        gene_hit_array.push(gene_hit_message.hits[i]);
    }
    const number_of_zeroes_in_the_end = number_of_spots - gene_hit_array.length;
    for (let i = 0; i < number_of_zeroes_in_the_end; i++) {
        gene_hit_array.push(0);
    }
    return gene_hit_array;
}

function header_start_pos(magic) {
    const HeaderSize_message_length = 5;
    const padding = 3; // To have it 8-byte aligned
    return magic.length + 5 + padding;
}

function align_to_8_bytes(pos) {
    let tmp_pos = pos;
    if (tmp_pos % 8 != 0) {
        tmp_pos = tmp_pos + 8 - (tmp_pos % 8);
    }
    return tmp_pos;
}

function file_regions_start_pos(magic, header_size) {
    const header_start = header_start_pos(magic);
    return align_to_8_bytes(header_start + header_size);
}

function get_headersize(protobuf_loader, slice_loader) {
    return Promise.all([protobuf_loader.builder, slice_loader.get_slice(magic.length, 5)]).then(function (values) {
        const headersize_builder = values[0].fileformat_common_proto.HeaderSize;
        const msg = headersize_builder.decode(values[1]);
        return msg.headerSize;
    });
}

function get_header(headersize, protobuf_loader, slice_loader) {
    const slice = headersize.then(function(val) {
        const startpos = header_start_pos(magic);
        return slice_loader.get_slice(startpos, val);
    });
    return Promise.all([protobuf_loader.builder, slice]).then(function (values) {
        const header_builder = values[0].st_exp_proto.Header;
        const msg = header_builder.decode(values[1]);
        return msg;
    });
}

function get_fileregionslice(get_fileregion_func, headersize, header, slice_loader) {
    return Promise.all([headersize, header]).then(
        function (values) {
            const headersize_decoded = values[0];
            const header_decoded = values[1];
            const file_region = get_fileregion_func(header_decoded);
            const startpos = file_regions_start_pos(magic, headersize_decoded) + file_region.regionOffset.low;
            const size = file_region.regionSize.low;
            // assert ( file_region.regionOffset.high == 0 &&  file_region.regionSize.high == 0 ) TODO. fix this later. Now we assume the *.high values are 0. We should not do that.
            return slice_loader.get_slice(startpos, size);
        }
    );
}

function get_decoded_fileregion(get_fileregion_func, get_builder_func, headersize, header, protobuf_loader, slice_loader) {
    const slice = get_fileregionslice(get_fileregion_func, headersize, header, slice_loader);
    return Promise.all([protobuf_loader.builder, slice]).then(function (values) {
        const builder = get_builder_func(values[0]);
        const msg = builder.decode(values[1]);
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

export function get_tile(tile_id, image_index, tile_conversion_index, headersize, header, protobuf_loader, slice_loader) {
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

export function get_genehit_from_genename(gene_name, genenames_dict, headersize, header, protobuf_loader, slice_loader) {
    return genenames_dict.then(function(headersize, header, protobuf_loader, slice_loader, genenames_dict_decoded) {
        const gene_id = genenames_dict_decoded[gene_name];
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
