const tagmodule = {
     supported: [
        "av_textblock",
        "av_image",
        "av_video",
        "av_heading",
        "av_testimonials",
        "av_codeblock",
    ],
    process: ($, ml, tag, etattributes, that) => {
        var multiline = ml;
        switch (tag) {

            case "av_textblock":
                return multiline(() => {/* 
                    <et_pb_text _builder_version="4.25.1" _module_preset="default" {{attributes}}$>
                        {{html}}  
                    </et_pb_text>  
                */}, {
                    html: $(that).html().trim() || "",
                    attributes: etattributes
                });

            case "av_image":
                return multiline(() => {/* 
                    <et_pb_image _builder_version="4.25.1" _module_preset="default" custom_margin="||4px||false|false" {{attributes}} $></et_pb_image>
                */}, {
                    src: $(that).attr("src"),
                    attributes: etattributes
                });

            case "av_video":
                return multiline(() => {/* 
                    <et_pb_video _builder_version="4.25.1" _module_preset="default" title_text="" src="{{video_url}}" {{attributes}} $></et_pb_video>
                */}, {
                    video_url: $(that).attr("src"),
                    attributes: etattributes
                });

            case "av_heading":
                return multiline(() => {/* 
                    <et_pb_heading _builder_version="4.25.1" _module_preset="default" {{attributes}} $></et_pb_heading>
                */}, {
                    heading: $(that).attr("heading"),
                    attributes: etattributes
                });

            case "av_testimonials":
                return multiline(() => {/* 
                    <et_pb_testimonial _builder_version="4.25.1" _module_preset="default" {{attributes}} $>
                        {{html}}  
                    </et_pb_testimonial>
                */}, {
                    html: $(that).find("av_testimonial_single").html(),
                    attributes: etattributes
                });

            case "av_codeblock":
                return multiline(() => {/* 
                    <et_pb_testimonial _builder_version="4.25.1" _module_preset="default" {{attributes}} $>
                        {{html}}  
                    </et_pb_testimonial>
                */}, {
                    html: $(that).html(),
                    attributes: etattributes
                });
        }
    },
}

module.exports = tagmodule;