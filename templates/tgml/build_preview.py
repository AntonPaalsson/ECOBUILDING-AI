from __future__ import annotations

import xml.etree.ElementTree as ET
import json
import math
from pathlib import Path

SOURCE = Path(__file__).with_name("LB11_BILD.xml")
OUTPUT = Path(__file__).with_name("LB11_BILD-preview.svg")
JS_OUTPUT = Path(__file__).parents[2] / "data" / "lb11-svg-template.js"
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


def local_name(element: ET.Element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def number(value: str | None, fallback: str = "0") -> str:
    return value if value not in (None, "") else fallback


def svg(tag: str, attributes: dict[str, str] | None = None) -> ET.Element:
    return ET.Element(f"{{{SVG_NS}}}{tag}", attributes or {})


def build_preview(source: Path, output: Path) -> None:
    tgml = ET.parse(source).getroot()
    width = tgml.get("Width", "1345")
    height = tgml.get("Height", "720")
    root = svg(
        "svg",
        {
            "width": width,
            "height": height,
            "viewBox": f"0 0 {width} {height}",
            "role": "img",
            "aria-label": "Statisk grafisk förhandsvisning av LB11 BILD TGML",
        },
    )
    defs = svg("defs")
    root.append(defs)
    root.append(svg("rect", {"x": "0", "y": "0", "width": width, "height": height, "fill": tgml.get("Background", "#FFFFFF")}))
    gradient_number = 0
    clip_number = 0

    def gradient_fill(element: ET.Element) -> str | None:
        nonlocal gradient_number
        definition = next((child for child in element if local_name(child) == "LinearGradient"), None)
        if definition is None:
            return None
        gradient_number += 1
        gradient_id = f"tgml-gradient-{gradient_number}"
        gradient = svg(
            "linearGradient",
            {
                "id": gradient_id,
                "x1": definition.get("StartPoint", "0,0").split(",")[0],
                "y1": definition.get("StartPoint", "0,0").split(",")[-1],
                "x2": definition.get("EndPoint", "0,1").split(",")[0],
                "y2": definition.get("EndPoint", "0,1").split(",")[-1],
            },
        )
        for stop in definition:
            if local_name(stop) != "GradientStop":
                continue
            offset = stop.get("Offset", "0")
            if offset.replace(".", "", 1).isdigit() and float(offset) <= 1:
                offset = f"{float(offset) * 100:g}%"
            gradient.append(svg("stop", {"offset": offset, "stop-color": stop.get("Color", "#FFFFFF")}))
        defs.append(gradient)
        return f"url(#{gradient_id})"

    def common(element: ET.Element) -> dict[str, str]:
        attrs: dict[str, str] = {}
        fill = element.get("Fill")
        stroke = element.get("Stroke")
        if fill:
            attrs["fill"] = "none" if fill.lower() == "none" else fill
        if stroke:
            attrs["stroke"] = "none" if stroke.lower() == "none" else stroke
        if element.get("StrokeWidth"):
            attrs["stroke-width"] = element.get("StrokeWidth", "1")
        if element.get("StrokeDashArray") not in (None, "", "0", "0.0"):
            attrs["stroke-dasharray"] = element.get("StrokeDashArray", "")
        if element.get("Opacity") not in (None, "", "1", "1.0"):
            attrs["opacity"] = element.get("Opacity", "1")
        return attrs

    def visual_transform(element: ET.Element, component_space: bool = False) -> str:
        """Translate the TGML transform instructions that affect the static view."""
        left = float(number(element.get("Left")))
        top = float(number(element.get("Top")))
        origin_x, origin_y = (0.0, 0.0) if component_space else (left, top)
        width = float(number(element.get("Width"), element.get("ContentWidth", "0")))
        height = float(number(element.get("Height"), element.get("ContentHeight", "0")))
        parts: list[str] = []
        if component_space and (left or top):
            parts.append(f"translate({left:g} {top:g})")
        for child in element:
            instruction = local_name(child)
            if instruction not in {"Rotate", "Scale"}:
                continue
            center = child.get("Center") or (element.get("Center") if instruction == "Rotate" else None)
            if center:
                try:
                    cx, cy = (float(value.strip()) for value in center.split(",", 1))
                    if abs(cx) <= 1 and abs(cy) <= 1:
                        cx, cy = origin_x + cx * width, origin_y + cy * height
                except (ValueError, TypeError):
                    cx, cy = origin_x + width / 2, origin_y + height / 2
            else:
                cx, cy = origin_x + width / 2, origin_y + height / 2
            if instruction == "Rotate":
                angle = float(child.get("Angle", "0"))
                parts.append(f"rotate({angle:g} {cx:g} {cy:g})")
            else:
                sx = float(child.get("ScaleX", "1"))
                sy = float(child.get("ScaleY", "1"))
                parts.append(f"translate({cx:g} {cy:g}) scale({sx:g} {sy:g}) translate({-cx:g} {-cy:g})")
        return " ".join(parts)

    def append_visual(parent: ET.Element, element: ET.Element, shape: ET.Element) -> None:
        transform = visual_transform(element)
        if transform:
            wrapper = svg("g", {"transform": transform})
            wrapper.append(shape)
            parent.append(wrapper)
        else:
            parent.append(shape)

    def render(element: ET.Element, parent: ET.Element, mark_component: bool = False) -> None:
        nonlocal clip_number
        tag = local_name(element)
        if tag in {"Script", "Bind", "Expose", "Metadata", "Parameter", "InitValue", "InitReference", "ObjectReference", "ObjectType", "TargetArea", "LinearGradient", "GradientStop", "Rotate", "Translate", "Animate", "ConvertValue"}:
            return
        if element.get("Visibility", "Visible").lower() == "hidden":
            return

        left = element.get("Left")
        top = element.get("Top")
        opacity = element.get("Opacity")

        if tag in {"Tgml", "Group", "Component", "Layer"}:
            attrs: dict[str, str] = {}
            if mark_component and element.get("Name"):
                attrs["data-tgml-component"] = element.get("Name", "")
            transform = visual_transform(element, component_space=True)
            if transform:
                attrs["transform"] = transform
            if opacity not in (None, "", "1", "1.0"):
                attrs["opacity"] = opacity
            if tag == "Component" and element.get("Clip", "False").lower() == "true":
                clip_number += 1
                clip_id = f"tgml-clip-{clip_number}"
                clip = svg("clipPath", {"id": clip_id})
                clip.append(svg("rect", {
                    "x": "0", "y": "0",
                    "width": number(element.get("ContentWidth"), element.get("Width", "0")),
                    "height": number(element.get("ContentHeight"), element.get("Height", "0")),
                }))
                defs.append(clip)
                attrs["clip-path"] = f"url(#{clip_id})"
            group = svg("g", attrs)
            parent.append(group)
            for child in element:
                render(child, group)
            return

        attrs = common(element)
        child_gradient = gradient_fill(element)
        if child_gradient:
            attrs["fill"] = child_gradient

        if tag == "Rectangle":
            shape = svg("rect", {
                **attrs,
                "x": number(left), "y": number(top),
                "width": number(element.get("Width")), "height": number(element.get("Height")),
            })
            if element.get("RadiusX") not in (None, "0", "0.0"):
                shape.set("rx", element.get("RadiusX", "0"))
            if element.get("RadiusY") not in (None, "0", "0.0"):
                shape.set("ry", element.get("RadiusY", "0"))
            append_visual(parent, element, shape)
        elif tag == "Ellipse":
            x, y = float(number(left)), float(number(top))
            w, h = float(number(element.get("Width"))), float(number(element.get("Height")))
            append_visual(parent, element, svg("ellipse", {**attrs, "cx": str(x + w / 2), "cy": str(y + h / 2), "rx": str(w / 2), "ry": str(h / 2)}))
        elif tag == "Line":
            append_visual(parent, element, svg("line", {**attrs, "x1": number(element.get("X1")), "y1": number(element.get("Y1")), "x2": number(element.get("X2")), "y2": number(element.get("Y2"))}))
        elif tag == "Path":
            append_visual(parent, element, svg("path", {**attrs, "d": element.get("PathData", "")}))
        elif tag in {"Polygon", "Polyline"}:
            append_visual(parent, element, svg(tag.lower(), {**attrs, "points": element.get("Points", "")}))
        elif tag == "Arc":
            center = element.get("Center", "0,0").split(",")
            cx, cy = float(center[0]), float(center[1])
            rx, ry = float(number(element.get("RadiusX"))), float(number(element.get("RadiusY")))
            start = math.radians(float(element.get("StartAngle", "0")))
            sweep = float(element.get("SweepAngle", "0"))
            end = start + math.radians(sweep)
            x1, y1 = cx + rx * math.cos(start), cy - ry * math.sin(start)
            x2, y2 = cx + rx * math.cos(end), cy - ry * math.sin(end)
            large_arc = 1 if abs(sweep) > 180 else 0
            sweep_flag = 0 if sweep < 0 else 1
            arc = svg("path", {**attrs, "fill": "none", "d": f"M {x1:g} {y1:g} A {rx:g} {ry:g} 0 {large_arc} {sweep_flag} {x2:g} {y2:g}"})
            append_visual(parent, element, arc)
        elif tag in {"Text", "TextBox"}:
            font_size = float(number(element.get("FontSize"), "12"))
            text_value = element.text or ""
            x = float(number(left))
            y = float(number(top))
            text_anchor = "start"
            dominant_baseline = "auto"
            if tag == "TextBox":
                width_box = float(number(element.get("Width")))
                height_box = float(number(element.get("Height")))
                align = element.get("HorizontalAlign", "Left").lower()
                if align == "center":
                    x += width_box / 2
                    text_anchor = "middle"
                elif align == "right":
                    x += width_box
                    text_anchor = "end"
                line_height = font_size * 1.15
                max_chars = max(1, int(width_box / max(font_size * 0.56, 1)))
                lines: list[str] = []
                for paragraph in text_value.splitlines() or [text_value]:
                    words = paragraph.split()
                    line = ""
                    for word in words:
                        candidate = f"{line} {word}".strip()
                        if line and len(candidate) > max_chars:
                            lines.append(line)
                            line = word
                        else:
                            line = candidate
                    if line:
                        lines.append(line)
                visible_lines = max(1, int(height_box / line_height))
                lines = lines[:visible_lines]
                valign = element.get("VerticalAlign", "Top").lower()
                if valign in {"middle", "center"}:
                    y += max(font_size, (height_box - len(lines) * line_height) / 2 + font_size * 0.85)
                elif valign == "bottom":
                    y += max(font_size, height_box - (len(lines) - 1) * line_height)
                else:
                    y += font_size
                dominant_baseline = "auto"
            else:
                align = element.get("HorizontalAlign", "Left").lower()
                text_anchor = {"center": "middle", "right": "end"}.get(align, "start")
                valign = element.get("VerticalAlign", "Baseline").lower()
                dominant_baseline = {"middle": "middle", "center": "middle", "top": "hanging", "bottom": "text-after-edge"}.get(valign, "auto")
            text_attrs = {
                "x": str(x), "y": str(y),
                "fill": element.get("Stroke", element.get("Fill", "#404040")),
                "font-family": element.get("FontFamily", "Arial"),
                "font-size": str(font_size),
                "text-anchor": text_anchor,
                "dominant-baseline": dominant_baseline,
            }
            weight = element.get("FontWeight")
            if weight and weight.lower() != "normal":
                text_attrs["font-weight"] = weight.lower()
            if element.get("FontStyle", "Normal").lower() != "normal":
                text_attrs["font-style"] = element.get("FontStyle", "normal").lower()
            if opacity not in (None, "", "1", "1.0"):
                text_attrs["opacity"] = opacity
            text_element = svg("text", text_attrs)
            if tag == "TextBox":
                for index, line in enumerate(lines):
                    span = svg("tspan", {"x": str(x), **({"dy": str(line_height)} if index else {})})
                    span.text = line
                    text_element.append(span)
            else:
                text_element.text = text_value
            append_visual(parent, element, text_element)
        elif tag == "Image":
            data = "".join((element.text or "").split())
            if not data:
                return
            if data.startswith("iVBOR"):
                mime = "image/png"
            elif data.startswith("R0lGOD"):
                mime = "image/gif"
            elif data.startswith("/9j/"):
                mime = "image/jpeg"
            else:
                mime = "image/png"
            append_visual(parent, element, svg("image", {"x": number(left), "y": number(top), "width": number(element.get("Width")), "height": number(element.get("Height")), "href": f"data:{mime};base64,{data}", **({"opacity": opacity} if opacity not in (None, "", "1", "1.0") else {})}))
        else:
            # Preserve nested visual primitives when an element is not directly mapped.
            for child in element:
                render(child, parent)

    for child in tgml:
        render(child, root, mark_component=local_name(child) == "Component")
    ET.indent(root, space="  ")
    svg_text = ET.tostring(root, encoding="unicode", xml_declaration=False)
    output.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + svg_text, encoding="utf-8")
    JS_OUTPUT.write_text(
        "window.ECO_LB11_SVG_TEMPLATE = " + json.dumps(svg_text, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build_preview(SOURCE, OUTPUT)
    print(f"Wrote {OUTPUT} and {JS_OUTPUT}")
