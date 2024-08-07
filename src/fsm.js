let app = () => {
    var filename  = "av"; 
    var self      = this;
    var fs        = require("fs");
    var path      = require("path");
    var multiline = require("multiline");
    var jsdom     = require('jsdom');
    var $         = require('jquery')(new jsdom.JSDOM().window);
    var LOG       = false;
    var processtag = require("../config/tags");

    self.init = () => {

        /*
            Convert the AV shortcodes to HTML and jQuery object.
        */

        // Construct AV DOM
        self.avdocument = $(multiline (function () {/* 
                <div class="av-universe"> {{avcode}} </div> 
            */}, { 
                "avcode" : fs.readFileSync(path.join(process.cwd(), "avcodes", filename), "utf-8")
                            .replace(/\[av/g, "<av") 
                            .replace(/\[\/av/g, "</av")
                            .replace(/\]/g, ">")
            })).get(0); 

        /*
            Create a blank jQuery document for the converted ET 
            shortcode HTML.
        */

        // Construct ET DOM
        self.etdocument = $(multiline (function () {/* 
            <div class="et-universe"></div> 
        */})).get(0);
            
        /*
            For every child in the AV document,  
        */
        
        var firstchildflag = true;
        var rowcount = 0;
        var columnsum = 0;
        var columnsdata = [];
        var wrappersection;
        var previoussiblingwassection = false;
        $(self.avdocument).children().each(function (ci, avdocumentchild) {

            if (avdocumentchild.nodeName == "AV_SECTION") {
                previoussiblingwassection = true;
                
                console.log("\n📦  Section found.");
                // Do nothing
            }
            else {
                console.log("\n🦙  Orphan found: " + avdocumentchild.nodeName);
                var lastchild = $(avdocumentchild).next().length == 0;
                var nextsiblingissection = !lastchild && $(avdocumentchild).next().get(0).nodeName == "AV_SECTION";

                if (previoussiblingwassection || !wrappersection) {
                    console.log("🍬  New wrapper");

                    // Wrap the orphan in a section
                    wrappersection = $("<av_section>");

                    var childhtml = $(avdocumentchild).prop("outerHTML");
                    wrappersection.append(childhtml);
                    $(avdocumentchild).replaceWith(wrappersection);
                }
                else {
                    console.log("🧻  Reusing wrapper");

                    // Wrap the orphan in previosuly used section
                    $(wrappersection).append(avdocumentchild).prop("outerHTML");
                }

                previoussiblingwassection = false;
            }
        });

        // return;

        $(self.avdocument).children().each(function (ci, avdocumentchild) {
            var etsection;

            // Check if the child is an AV section element
            if (avdocumentchild.nodeName == "AV_SECTION") {
                console.log("\n\n🌈 Processing section: " + ci);

                var sectionid = $(self.etdocument).find("et_pb_section").length;
                etsection = self.createsection({
                    "section-id": sectionid
                })

                firstchildflag = true;
            }
            else {
                
                console.log("❓ What is this?");

                /*
                    Is this the first column encountered after a section?
                    Or if is this the first child encountered?
                */
                var sectionid = $(self.etdocument).find("et_pb_section").length + (firstchildflag ? 0 : -1);
                etsection = firstchildflag ? self.createsection({
                    "section-id": sectionid
                }) : self.getsection({
                    "section-id": sectionid
                });
                
                firstchildflag = false;
            }


            /*
                Convert the AV section's children to ET shortcode and append it to the etsection
            */

            if (avdocumentchild.nodeName == "AV_SECTION") {

                $(avdocumentchild).children().each(function (avci, avcolumn) {
                    var result = self.generatecolumnsdata({
                        "etsection": etsection,
                        "avcolumn": avcolumn,
                        "columnsum": columnsum,
                        "columnsdata": columnsdata,
                    });

                    columnsum = result["columnsum"];
                    var row = result["row"];
                    columnsdata = result["columnsdata"];
                    var columnstructure = result["columnstructure"];

                    // If the column sum amounts to 1, create a row
                    if (columnsum == 1) {
                        console.log("Number of columns in the row ID (" + rowcount + "): " + columnsdata.length);

                        // Add a row to the ET section
                        etsection.append(multiline(() => {/* 
                            <et_pb_row row_id="{{row_id}}" _builder_version="4.16" background_size="initial" background_position="top_left" background_repeat="repeat" global_colors_info="{}" column_structure="{{column_structure}}"$></et_pb_row$>
                        */}, {
                            "row_id": rowcount,
                            "column_structure": columnstructure
                        }));

                        var colcount = 0;
                        columnsdata.forEach(function (coldata, cdi) {

                            // Add the columns to the row
                            etsection.find("et_pb_row[row_id='" + rowcount + "']").append(multiline(() => {/* 
                                <et_pb_column col_id="{{col_id}}" type="{{col_type}}" _builder_version="4.16" custom_padding="|||" global_colors_info="{}" custom_padding__hover="|||"$>
                                    {{col_html}}
                                </et_pb_column$>
                            */}, {
                                "col_id": colcount,
                                "col_type": coldata["col_type"],
                                "col_html": coldata["html"]
                            }));

                            colcount++;
                        })

                        // Reset/set variables/states
                        columnsum = 0;
                        columnsdata = [];
                        rowcount++;
                    }
                });

                /*
                    Convert AV tags to ET
                */
                
                // Replace textblocks
                self.replacetag(etsection, "av_textblock");

                // Replace imageblocks
                self.replacetag(etsection, "av_image");

                // Replace testimonials
                self.replacetag(etsection, "av_testimonials");

                // Replace heading
                self.replacetag(etsection, "av_heading");
                
                // Replace video
                self.replacetag(etsection, "av_video");
                
                // Replace codeblock
                self.replacetag(etsection, "av_codeblock");

            }

            else {
                console.log("❓❓ Unhandled exception.");

            }
        });
        

        var finalshortcode = $(self.etdocument).html();
        var finalhtmlcode = self.sanitize(finalshortcode);

        fs.writeFileSync("./outputs/outputsc.html", finalshortcode, "utf8");
        fs.writeFileSync("./outputs/output.html", finalhtmlcode, "utf8");
        console.log("\n✍️  Output written to: output.html");

        if (finalhtmlcode.indexOf("<av_") > -1) {
            console.log("⚠️  Unknown tag found: " + finalhtmlcode.substring(finalhtmlcode.indexOf("<av_") - 5, finalhtmlcode.indexOf("<av_") + 30).replace(/\\r\\n/g, "").replace(/\\r/g, "").replace(/\\n/g, ""));
        }

        return;

    }

    /*
        Creates a new section in the ET document.
        You can provide a section-id. If you don't, it will be generated automatically.
    */
    self.createsection = function (args) {

        var si = args?.["section-id"] ?? $(self.etdocument).find("et_pb_section").length;

        // Add a section in the ET document if it doesn't already exist
        if ($(self.etdocument).find("et_pb_section[section_id='" + si + "']").length == 0) {

            $(self.etdocument).append(multiline(() => {/*
                <et_pb_section section_id="{{section-id}}" fb_built="1" _builder_version="4.16" global_colors_info="{}" custom_margin="||0px||false|false" $></et_pb_section$>
            */}, {
                "section-id": si
            }));
        }

        // Return the section
        return $(self.etdocument).find("et_pb_section[section_id='" + si + "']");
    }

    /*
        Gets a section by section-id from the ET document
    */
    self.getsection = function (args) {

        var si = args["section-id"];
        if (!si) return;

        // Return the section
        return $(self.etdocument).find("et_pb_section[section_id='" + si + "']");
    }

    self.generatecolumnsdata = function (args) {
        
        var avcolumn = args["avcolumn"];
        var etsection = args["etsection"];
        var column_sum = args["columnsum"];
        var columnsdata = args["columnsdata"];

        /*
            For diagnostics. If the AV shortcode has a 'marker' attribute, the value will be printed here.
            e.g., <av_column marker="pizza">....</av_column>
        */
        if ($(avcolumn).attr("marker")) {
            console.log("Column marker: " + $(avcolumn).attr("marker"));
        }

        /*
            Figure out the column structure, this is where some magic happens 🪄
            Based on AV tags, it determines the column structure in a format that Divi understands.
        */
        var column_structure = "", col_type;
        if ($(avcolumn).get(0).tagName.toLowerCase() == "av_one_full") { column_structure = "1"; col_type = "1"; column_sum += 1; }
        else if ($(avcolumn).get(0).tagName.toLowerCase() == "av_one_half") { column_structure = "1_2,1_2"; col_type = "1_2"; column_sum += 0.5; }
        else if ($(avcolumn).get(0).tagName.toLowerCase() == "av_one_third") { column_structure = column_sum == 0.66 ? "2_3,1_3" : "1_3,2_3"; col_type = "1_3"; column_sum += 0.34; }
        else if ($(avcolumn).get(0).tagName.toLowerCase() == "av_two_third") { column_structure = column_sum == 0.34 ? "1_3,2_3" : "2_3,1_3"; col_type = "2_3"; column_sum += 0.66; }
        else if ($(avcolumn).get(0).tagName.toLowerCase() == "av_one_fourth") { column_structure = column_sum == 0.75 ? "3_4,1_4" : "1_4,3_4"; col_type = "1_4"; column_sum += 0.25; }
        else if ($(avcolumn).get(0).tagName.toLowerCase() == "av_three_fourth") { column_structure = column_sum == .25 ? "1_4,3_4" : "3_4,1_4"; col_type = "3_4"; column_sum += 0.75; }

        // The col_type is undefined for anything other than an AV column
        if (col_type) {
            if (LOG) console.log("Column " + col_type + " found"); 
            columnsdata.push({
                "html": $(avcolumn).html(),
                "col_type": col_type,
                "tag": $(avcolumn).get(0).tagName.toLowerCase()
            });
        }

        // If something other than a column is encountered
        else {
            console.log("🤖  Does not compute");
        }

        return {
            "columnsum": column_sum,
            "columnsdata": columnsdata,
            "columnstructure": column_structure
        }

    }

    self.writedata = function (file, data) {
        fs.writeFileSync("./" + file, data, "utf8");
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
                return processtag($, multiline, tag, etattributes, this);
            });
        });
    }

    self.sanitize = function (string) {
        return string
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
            .replace(/\\r/g, "")
            .replace(/\\n/g, "")
            .replace(/ \$="">/g, "]")
    }

    self.adaptattributes = function (attributes) {

        /*
            Define replacements and attributes to keep
        */
        let replacements = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config", "attributes.json"), 'utf8'));

        /*
            Make replacements
        */
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
