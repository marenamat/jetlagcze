Display openstreetmap with an overlay of all the PID stops gathered
in `t-pid-stops`.

There should be a filtering UI for multiple features, added in later
steps. Extensible.

One of these filters must be a calendar, allowing to choose a single day
or multiple consecutive days, and displaying only stops which are served
by some  regular trip in all these days.

If the data from backend is not available, display an error message.

Default: choose all available days, show all stops served.

Also! Add a link to that GUI to README.md, so that one doesn't have to look for
it.

Stops beginning with T should be marked as pseudo-stops and hidden by default.

By default, display multiple stops with the same name as one, in the average
location. Add a button to the detail popup to show all instances (and to hide
them back, of course).
