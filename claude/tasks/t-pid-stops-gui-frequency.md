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
