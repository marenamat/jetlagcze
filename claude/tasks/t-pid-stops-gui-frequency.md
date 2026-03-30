For all PID stops (`t-pid-stops`), calculate the immediate frequency of trips
from that stop, for a given floating time interval. That means, for time T and
interval I, the value is "how many trips happen between T and T+I".

Granularity: 1 minute.

Allow setting how long the time interval (I) is, by UI. Default: 60 minutes.

Calculate statistics in given relevant times, i.e. if relevant times are
between 8:00 and 22:00, the frequency values are for T between 8:00 and 22:00,
and from these values get the statistics.

Also allow setting relevant times (e.g. by a slider); by default the time
intervals should be calculated between 9:00 and 21:00.

For each stop display (in a detail window): minimum, maximum, average, median, 5-percentile and 95-percentile, and standard deviation.

Something similar but different has been implemented in the `hacks/freq.pl` file,
you may check the data in `hacks/freq-full.txt` whether your results are similar.

Also add another slider, to set a lower cutoff for the average, by default on 2,
and display only stops where the average is at least that cutoff.
Range: 0–5, step 0.1. Also show an explicit number input that stays in sync
with the slider and allows typing a precise value directly. That value may be higher than the top range limit, should not be clamped.

For all show/hide purposes, the frequency is a sum over all stops of the same name.
