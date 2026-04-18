all: pid-coords-full.md
.PHONY: all

pid.zip: SOURCE := https://data.pid.cz/PID_GTFS.zip

%.zip:
	wget $(SOURCE) -O $@

%: %.zip
	unzip -d $@ $<

%.sqlite: % import.pl
	perl import.pl $< $@

%.gpx %-coords-full.md %-coords-short.md: %.sqlite coords.pl
	perl coords.pl $< $*
