Display openstreetmap with an overlay of all the PID stops gathered
in `t-pid-stops`.

There should be a filtering UI for multiple features, added in later
steps. Extensible.

One of these filters must be a calendar, allowing to choose a single day
or multiple consecutive days, and displaying only stops which are served
by some  regular trip in all these days.

If the data from backend is not available, display an error message.

Default: choose all available days, show all stops served.
