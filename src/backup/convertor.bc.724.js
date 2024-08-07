let app = () => {
    var self = this;
    var fs = require("fs");
    var multiline = require("multiline");
    var jsdom = require('jsdom');
    $ = require('jquery')(new jsdom.JSDOM().window);
    var LOG = false;

    self.init = () => {

        // Construct AV DOM
        var avdocument = $(multiline (function () {/* 
                <div class="av-universe"> {{avcode}} </div> 
            */}, { 
                "avcode": fs.readFileSync("./avcodes/av", "utf-8")
                            .replace(/\[av/g, "<av")
                            .replace(/\[\/av/g, "</av")
                            .replace(/\]/g, ">")
            })).get(0);

        // Construct ET DOM
        var etdocument = $(multiline (function () {/* 
            <div class="et-universe"></div> 
        */})).get(0);

        // Iterate over all av_sections in AV document
        var column_sum = 0;

        // If AV shortcodes has only sections at top level
        if ($(avdocument).find("av_section").length > 0 && $(avdocument).html().indexOf("[av_section") == 0) { 
            
            console.log($(avdocument).find("av_section").length + " sections found.");

            $(avdocument).find("av_section").each((si, sl) => {

                self.add_section({
                    "section-index": si,
                    "section-element": sl,
                    "et-document": etdocument,
                    "column-sum": column_sum
                });

            });
        }

        else {
            console.log("🌈 Mixed content found.");

            self.add_section({
                "section-index": 0,
                "section-element": $(avdocument),
                "et-document": etdocument,
                "column-sum": column_sum
            });

        }

        var finalcode = $(etdocument).html();
        finalcode = finalcode
            .replace(/<et_pb_section/g, "[et_pb_section")
            .replace(/<\/et_pb_section>/g, "[/et_pb_section]")
            
            .replace(/<et_pb_row/g, "[et_pb_row")
            .replace(/<\/et_pb_row>/g, "[/et_pb_row]")
            
            .replace(/<et_pb_column/g, "[et_pb_column")
            .replace(/<\/et_pb_column>/g, "[/et_pb_column]")
            
            .replace(/<et_pb_text/g, "[et_pb_text")
            .replace(/<\/et_pb_text>/g, "[/et_pb_text]")
            
            .replace(/<et_pb_image/g, "[et_pb_image")
            .replace(/<\/et_pb_image>/g, "[/et_pb_image]")
            
            .replace(/<et_pb_testimonial/g, "[et_pb_testimonial")
            .replace(/<\/et_pb_testimonial>/g, "[/et_pb_testimonial]")
            
            .replace(/<et_pb_heading/g, "[et_pb_heading")
            .replace(/<\/et_pb_heading>/g, "[/et_pb_heading]")
            
            .replace(/<et_pb_video/g, "[et_pb_video")
            .replace(/<\/et_pb_video>/g, "[/et_pb_video]")
            
            .replace(/<av_hr/g, "<hr style='margin: 2px 0;'")
            .replace(/<\/av_hr>/g, "")
            
            .replace(/’/g, "")
            .replace(/′/g, "")
            // .replace(/“/g, "")
            // .replace(/”/g, "")
            .replace(/\\r\\n/g, "")
            .replace(/\\n/g, "")
            .replace(/ \$="">/g, "]")



        // console.log(finalcode);
        fs.writeFileSync("./output.html", finalcode, "utf8");
        console.log("Output written to: output.html");

        if (finalcode.indexOf("<av_") > -1) {
            console.log("⚠️  Unknown tag found: " + finalcode.substring(finalcode.indexOf("<av_") - 5, finalcode.indexOf("<av_") + 30).replace(/\\r\\n/g, "").replace(/\\r/g, "").replace(/\\n/g, ""));
        }

    }

    self.add_section = function (args) {

        var si = args["section-index"];

        // AV document section
        var sl = args["section-element"];
        
        var etdocument = args["et-document"];
        var column_sum = args["column-sum"];

        if (LOG) console.log("Section: " + si);
        var row_count = 0, row_id;

        // Add a section in the ET document
        $(etdocument).append(multiline(() => {/*
            <et_pb_section section_id="{{section-id}}" fb_built="1" _builder_version="4.16" global_colors_info="{}" custom_margin="||0px||false|false" $></et_pb_section$>
        */}, {
            "section-id": si
        }));

        var section = $(etdocument).find("et_pb_section[section_id='" + si + "']");

        // For each column in the section
        var rowcolarray = [];
        var columnsdata = [];

        $(sl).children().each(function (sci, scol) {

            var sectionflag = false;

            // Figure out the column structure
            var column_structure = "", col_type;
            if ($(scol).get(0).tagName.toLowerCase() == "av_one_full") { column_structure = "1"; col_type = "1"; column_sum += 1; }
            else if ($(scol).get(0).tagName.toLowerCase() == "av_one_half") { column_structure = "1_2,1_2"; col_type = "1_2"; column_sum += 0.5; }
            else if ($(scol).get(0).tagName.toLowerCase() == "av_one_third") { column_structure = column_sum == 0.66 ? "2_3,1_3" : "1_3,2_3"; col_type = "1_3"; column_sum += 0.34; }
            else if ($(scol).get(0).tagName.toLowerCase() == "av_two_third") { column_structure = column_sum == 0.34 ? "1_3,2_3" : "2_3,1_3"; col_type = "2_3"; column_sum += 0.66; }
            else if ($(scol).get(0).tagName.toLowerCase() == "av_one_fourth") { column_structure = column_sum == 0.75 ? "3_4,1_4" : "1_4,3_4"; col_type = "1_4"; column_sum += 0.25; }
            else if ($(scol).get(0).tagName.toLowerCase() == "av_three_fourth") { column_structure = column_sum == .25 ? "1_4,3_4" : "3_4,1_4"; col_type = "3_4"; column_sum += 0.75; }

            else if ($(scol).get(0).tagName.toLowerCase() == "av_section") {

                console.log("Section found");

                self.add_section({
                    "section-index": si,
                    "section-element": $(scol),
                    "et-document": etdocument,
                    "column-sum": column_sum
                });
                sectionflag = true;
            }

            if (sectionflag) return;

            if (LOG) console.log("Column: " + sci + ", " + col_type + ", " + column_sum);

            columnsdata.push({
                "html": $(scol).html(),
                "col_type": col_type,
                "tag": $(scol).get(0).tagName.toLowerCase()
            });

            if (column_sum == 1) {

                // Reset sum
                column_sum = 0;

                // Increment total row count
                row_count++;

                rowcolarray.push({
                    column_structure: column_structure,
                    columns: columnsdata
                });

                // Reset columnsdata array
                columnsdata = [];
            }
        });

        if (LOG) console.log("Total rows in this section: " + row_count);
        
        rowcolarray.forEach(function (rowdata, rci) {

            var row_count = rci;
            var column_structure = rowdata["column_structure"];

            // Add row
            section.append(multiline(() => {/* 
                <et_pb_row row_id="{{row_id}}" _builder_version="4.16" background_size="initial" background_position="top_left" background_repeat="repeat" global_colors_info="{}" column_structure="{{column_structure}}"$></et_pb_row$>
            */}, {
                "row_id": row_count,
                "column_structure": column_structure
            }));

            // Add the columns
            rowdata.columns.forEach(function (coldata, ci) {
                section.find("et_pb_row[row_id='" + row_count + "']").append(multiline(() => {/* 
                    <et_pb_column type="{{col_type}}" _builder_version="4.16" custom_padding="|||" global_colors_info="{}" custom_padding__hover="|||"$>
                        {{col_html}}
                    </et_pb_column$>
                */}, {
                    "col_type": coldata["col_type"],
                    "col_html": coldata["html"]
                }));
            });

            if (LOG) console.log("Structure: " + column_structure);
        
        });
        
        // Replace textblocks
        self.replacetag(section, "av_textblock");

        // Replace imageblocks
        self.replacetag(section, "av_image");

        // Replace testimonials
        self.replacetag(section, "av_testimonials");

        // Replace heading
        self.replacetag(section, "av_heading");
        
        // Replace video
        self.replacetag(section, "av_video");
        
        // Replace cdoeblock
        self.replacetag(section, "av_codeblock");
    }

    /*
        Replace AV tags with ET tags
    */
    self.replacetag = function (section, tag) {

        // For each 'tag' encountered 
        section.find(tag).each(function() {
            
            // Adapt the attributes
            var avattributes = {};
            $.each(this.attributes, function(i, attr) {
                avattributes[attr.name] = attr.value
                    .replace(/”/g, "")
                    .replace(/’/g, "")
                    .replace(/′/g, "")
            });
            var etattributes = self.adaptattributes(avattributes);
        
            // Replace  the tag
            $(this).replaceWith(function() {
                switch (tag) {
                    case "av_textblock":
                        return multiline (() => {/* 
                            <et_pb_text _builder_version="4.25.1" _module_preset="default" {{attributes}}$>
                                {{html}}  
                            </et_pb_text$>  
                        */}, {
                            html: $(this).html().trim() || "",
                            attributes: etattributes
                        });
                    
                    case "av_image":
                        return multiline (() => {/* 
                            <et_pb_image _builder_version="4.25.1" _module_preset="default" custom_margin="||4px||false|false" {{attributes}} $></et_pb_image$>
                        */}, {
                            src: $(this).attr("src"),
                            attributes: etattributes
                        });
                    
                    case "av_video":
                        return multiline (() => {/* 
                            <et_pb_video _builder_version="4.25.1" _module_preset="default" title_text="" src="{{video_url}}" {{attributes}} $></et_pb_video$>
                        */}, {
                            video_url: $(this).attr("src"),
                            attributes: etattributes
                        });
                    
                    case "av_heading":
                        return multiline (() => {/* 
                            <et_pb_heading _builder_version="4.25.1" _module_preset="default" {{attributes}} $></et_pb_heading$>
                        */}, {
                            heading: $(this).attr("heading"),
                            attributes: etattributes
                        });
                    
                    case "av_testimonials":
                        return multiline (() => {/* 
                            <et_pb_testimonial _builder_version="4.25.1" _module_preset="default" {{attributes}} $>
                                {{html}}  
                            </et_pb_testimonial>
                        */}, {
                            html: $(this).find("av_testimonial_single").html(),
                            attributes: etattributes
                        });
                    
                    case "av_codeblock":
                        return multiline (() => {/* 
                            <et_pb_testimonial _builder_version="4.25.1" _module_preset="default" {{attributes}} $>
                                {{html}}  
                            </et_pb_testimonial>
                        */}, {
                            html: $(this).html(),
                            attributes: etattributes
                        });
                }
            });
        });
    }

    self.adaptattributes = function (attributes) {

        /*
            Define replacements and attributes to keep
        */
        let replacements = {
            "caption": "alt",
            "heading": "title",
            "src": "src"
        }

        /*
            Make replacements
        */
        // console.log(attributes);
        var newattributes = {};
        Object.keys(attributes).forEach(function (attribute) {
            if (!replacements[attribute]) return;
            newattributes[replacements[attribute]] = attributes[attribute];
        });

        /*
            Convert the 'attributes' JSON object to HTML string
        */
        var attributeshtml = '';
        for (const key in newattributes) {
            if (newattributes.hasOwnProperty(key)) {
                attributeshtml += `${key}="${newattributes[key]}" `;
            }
        }
        attributeshtml = attributeshtml.trim();
        return attributeshtml;
    }

    return self;
}

(app()).init();