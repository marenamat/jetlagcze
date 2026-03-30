Update the map so that all places in the visible view are marked with red hue
if they are farther than 1 km from any stop displayed. Specifically, ignore
hidden stops for calculating where red goes, use only the displayed stops.

If a stop would be displayed but is off the view, consider it displayed.

Make this hue optional by a toggle; default on.
